---
name: session-2026-06-22-rss-crawler
description: 潮玩换 2026-06-22 RSS 抓取 4 阶段救援 — 修限速 bug / 换源 / 扩白名单 / cron 验证,从 8→168 条
metadata:
  node_type: memory
  type: session
  originSessionId: b31d87bd-ceba-4efa-ad74-4ddd67de7388
---

# 2026-06-22 潮玩换 RSS 抓取救援

## 起点症状
用户反馈"资讯没有实际数据"。数据库 `news` 表只有 8 条（2026-06-07 seed 数据），
之后再无新增。`/api/news/list` 一直返回这 8 条。

## 根因（4 个叠加）

| # | Bug | 性质 | 文件 |
|---|---|---|---|
| 1 | `parseAllFeeds` 串行 + 每源 sleep 10min | 代码 bug | `server/src/utils/rssParser.js:275` |
| 2 | 无 per-source 超时,单源挂死全任务 | 代码 bug | 同上 |
| 3 | `RSSHUB_BASE_URL` 没配 → 默认 `rsshub.app` 国内 10s timeout | 配置缺失 | `.env` + rssParser.js:29 |
| 4 | `ctoy.com.cn/feed.xml` 网站改版返回 HTML 首页 | 数据源失效 | `每日潮玩新闻/rss_sources.txt` |

外加 19 个原源里 14 个 `rsshub.app` 全 timeout、3 个海外源(reddit/toyark/toysrevil) 403 或 timeout。

**Why 1 是主因**: 串行 sleep 让"挂一个源=整个任务挂住"变成常态。即便配对源也跑不完。

## 4 阶段修复

### 阶段 1: 修代码 bug — `c4dd3d3`
- `parseAllFeeds` 改 `Promise.allSettled` 并行
- 加 per-source cooldown (`lastFetchedMap`)
- 加 per-source 60s 超时 (`Promise.race`)
- `rss_sources.txt` 注释 ctoy 失效源
- `.env.example` 加 `RSSHUB_BASE_URL` 提示

### 阶段 2: 换源 — `ccf0975`
**探源策略**: 扫了 80+ URL,按类别分组探测
- ❌ 国内 RSSHub 公共镜像（11 个）全 timeout
- ❌ Reddit/Toyark/ToysRevil 海外直连全 403/timeout
- ✅ 国内综合（36kr/少数派/IT之家/雷锋网/钛媒体/InfoQ）
- ✅ 玩具/潮流专业（Hypebeast × 2 / Vinyl Pulse / McFarlane）
- ✅ 设计媒体（toodaylab / designboom）

### 阶段 3: 扩白名单 — `ca22672`
**问题**: `WHITE_LIST = ['新品','预售','发售',...]` 全中文,英文源 0 通过
**修复**: 扩到 ~50 关键词,覆盖 release/launch/unveil/drop/limited edition/exclusive/figure/vinyl/sofubi/kaiju/blind box/kickstarter 等
**BLACK_LIST 同步扩**: 加上 for sale/wtb/wts/iso/second-hand/discount 等英文交易类

**对比效果(同源、只换白名单)**:
| 指标 | 扩前 | 扩后 |
|---|---|---|
| 解析条数 | 21 | 153 |
| 通过条数 | 21 | 126 |
| Hypebeast Toys | 0/20 | 13/20 |
| Vinyl Pulse | 0/25 | 13/25 |
| 开源中国 | 0/50 | 37/50 |

### 阶段 4: 验证 cron — 端点 `/api/news/status`
```json
{
  "running": true,                           ← cron 真的在跑
  "cron": "0 */6 * * *",                     ← dotenv 修复后真的生效
  "runOnStartup": true,                      ← CRAWL_ON_STARTUP 真的生效
  "total": 168,                              ← 6h 持续涨
  "byCategory": { "brand":15, "community":44, "domestic":72, "overseas":37 },
  "lastCrawl": "2026-06-22T07:19:45.673Z"
}
```

**Why 单独验证这一步**: dotenv 路径 bug 之前让 CRAWL_CRON 静默失效过(详见 [[session-2026-06-22-chaohuan]]),这次必须确认真的生效。

## 当前 18 源清单(在 `每日潮玩新闻/rss_sources.txt`)

**国内综合**: 36kr 综合/快讯、少数派、IT之家、雷锋网、钛媒体、InfoQ、开源中国、SegmentFault、知乎(解析报错)
**玩具/潮流**: Hypebeast Toys/综合、Vinyl Pulse、McFarlane、ActionFigureInsider(DNS 失败)
**设计/数据**: 东京设计、Designboom、199IT

**保留注释的失效源**:
- ctoy.com.cn 改版
- 12 个 rsshub.app 路径(需私有 RSSHub)
- 4 个海外直连(需翻墙)

## How to apply(下次 RSS 出问题的 checklist)

1. **跑通 `/api/news/status`** —— 看 running/cron/total/lastCrawl,一分钟定位问题
2. **如果 running=true 但 total 不涨**:
   - 源失效(看日志 `getaddrinfo ENOTFOUND` 或 403)
   - 白名单太严(看日志 `不包含白名单关键词` 数量)
3. **如果 running=false**:
   - dotenv 路径(`process.env.CRAWL_CRON` 是否真值)
   - `cron.schedule` 是否在 `start()` 里被调用
4. **加新源前先 curl 验**:
   ```bash
   curl -sS -L -o /dev/null -w "%{http_code}|ct=%{content_type}" \
     -H "User-Agent: Mozilla/5.0" --max-time 8 "https://..."
   # 期望: 200 + application/rss+xml 或 application/atom+xml
   ```
5. **扩白名单**: 中英文混排。`includes()` 匹配,大小写不敏感,但**中文不会匹配英文文本**,必须显式列英文关键词

## Why 这个 memory 重要
RSS 抓取是"看着简单实际脆弱"的功能,任一环节静默失效(网络/源/白名单/cron/dotenv)用户都只看到"没数据"。**端到端验证**(`/api/news/status`)是唯一能在 1 分钟内定位的工具,**必须用起来**。

## 相关 memory
- [[session-2026-06-22-chaohuan]] — 同日工作总览,含 dotenv bug 修复
- [[chaohuan-no-ai-features]] — 资讯模块是数据展示,不做 AI
