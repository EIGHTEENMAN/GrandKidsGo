---
name: session-2026-08-05-hotel-pipeline
description: PR2-C Hotel pipeline 补全 + Hotels API 端点 + wizard chip 落地
metadata:
  type: project
  originSessionId: 2026-08-05
---

# Session 2026-08-05 · PR2-C Hotel pipeline 全栈落地

## 背景
走天下的 `pickHotel()` 函数 + Hotel TimelineBlock 占位早就写好，但实际跑计划时所有 wizard 输出都是「过夜：待订」占位。Session 7/30 已识别为 PR2-C backlog（关键词缺失导致 Hotel 0 行）。

## 根因
- `_meta.ts` 的 `CITY_META.keywords` 三城都没有"酒店/亲子酒店"关键词
- → 01-amap-pull 跑完 type=10（住宿）POI 几乎为零
- → `raw/<city>/hotel.json` 从未生成
- → 02-ai-enrich 没有 hotel.json 可读
- → 04-import-db 没 hotel 可 upsert
- → DB Hotel 0 行
- → assembler `pickHotel` 返回 null → 走「过夜：待订」占位

## 实施（commit e5f21a2）

### 改动
- `src/data/travel-assets/_meta.ts` —— 三城 keywords 各加 2 个酒店词（"酒店" / "亲子酒店"）
- `src/lib/data-pipeline/_amap-client.ts` —— MOCK_PRESETS 三城酒店从 2/1/1 扩到 6/5/5（14 条新增；带真实 business.cost）
- `src/lib/data-pipeline/09-seed-hotels.ts` —— 新建。16 条手工精选酒店（北京 6 / 上海 5 / 广州 5）
  - 字段：name/address/location/lat/lng/hasFamilyRoom/hasKidsPool/hasKidsBreakfast/avgPricePerNight/tags
  - 合成 amapPoiId 用 `SEED-<city>-<idx>` 前缀，与真实高德 ID 区分
  - 预留 `AMAP_LIVE=true` 环境变量切换：未来真 key 通了，跑 `npx tsx src/lib/data-pipeline/09-seed-hotels.ts` 自动从高德实时拉取覆盖手工 seeds
- `src/app/api/hotels/route.ts` —— 新建。GET 端点支持：
  - `?cityId=xxx` 按城市过滤
  - `?q=xxx` 名称模糊搜索
  - `?hasFamilyRoom=true` / `?hasKidsPool=true` 亲子设施筛选
  - `?maxPrice=1500` 价格上限
  - `?sort=kidScore | price | price_desc`（默认 kidScore 派生分 0-5 = 家庭房×2 + 泳池×2 + 早餐×1）
- `src/app/wizard/page.tsx` —— hotel block 渲染加 kidHook chip + notes 价格
- `src/lib/assembler/index.ts` —— 修 1 个隐藏 bug：`hasKidsBreakfast` 字段从 select 漏选（agent explore 发现），导致 `pickHotel()` 的 `(h as any).hasKidsBreakfast` cast 读 undefined。补 select + LoadedHotel 接口 + 移除类型逃逸

### 数据
- DB Hotel 行数：0 → **16**（北京 6 + 上海 5 + 广州 5）
- enriched/<city>/hotel.json：3 个真实 + 48 个空 `[]`（脚本当前为 50+ 城都写一次，未来加种子时无需改路径）
- 验证样本（hasKidsPool=true 按价格升序）：广州花园 980 / 北京诺金 1100 / 广州万豪 1100

### 验证
- `npx tsc --noEmit` 退出码 0
- 04-import-db 三城各跑一遍，console 输出 `北京/hotel：6 条` / `上海/hotel：5 条` / `广州/hotel：5 条`
- DB 行数 + 字段查询脚本（cp 进项目跑）确认亲子设施字段正确写入
- ❌ `npm run dev` + `curl /api/hotels` 端到端 smoke test 未跑（harness 暂停启动后台服务）—— 下次会话或本地手动验证

## 关键决策

| 决策 | 理由 |
|------|------|
| 手工 seeds 走 `09-seed-hotels.ts` 而非扩 `02-ai-enrich.ts` | AI 起草对酒店字段（hasFamilyRoom 等）无用，反而浪费 token；手工更准确 |
| 16 条精选只覆盖三城，其他城留空骨架 | 优先覆盖最常用三城，其他城 hotel 数据可等真 AMAP key 到位再补 |
| Hotels API 不复用 `/api/places` 的 `PlaceReview` 聚合 | list 端点字段更精炼；PlaceReview 聚合留给详情页按需查询 |
| `kidScore` 派生算法 0-5 | 沿用 `pickHotel` 的 hasFamilyRoom/hasKidsPool/hasKidsBreakfast 加权思路，但归一化到 5 分便于展示 |
| `AMAP_LIVE=true` 环境变量切换真数据源 | 不破坏现有 dev 流程；真 key 通了无需改代码 |

## 关联
- [[session-2026-07-30-complete]] — PR2-C backlog 起源（攻略体系 v1.0 文档第 142-146 行）
- [[session-2026-07-31-recap]] — 上一次会话记录
- [[session-2026-07-22-travel-v4-ui-and-plans]] — 待办清单中 PR2-C 标 ✅