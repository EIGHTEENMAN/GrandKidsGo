# 童慧行项目记忆索引

## Session 记录
- [Session 2026-08-05 PR2-A](session-2026-08-05-pr2-a.md) — 多城天数 heuristic 升级 — 孩子画像驱动（likes/fearsAnimals/isShy）+ 缓冲日（v1.5 §5 规则五）；commit 65ea53b
- [Session 2026-08-05 Hotel pipeline](session-2026-08-05-hotel-pipeline.md) — PR2-C 关键词+Mock+种子脚本+Hotels API+wizard chip + 修 assembler hasKidsBreakfast 漏选 bug；DB Hotel 0→16；commit e5f21a2
- [Session 2026-07-31](session-2026-07-31-recap.md) — Phase D 搜相似增强 + 攻略图片自动提取 + 孩子最怕预警系统
- [Session 2026-07-07~08](../memory-backup-20260711/session-2026-07-07-recap.md) — 2028首原文标点修复、朝代修复、翻译替换、返回键停止、上线前测试、GEO

## 当前项目状态（2026-08-05）

### 已完成模块
- 攻略体系 v1.0 (PR1-4)
- 亲子宝典数据闭环 Phase A/B/C/D
- 儿童画廊（含攻略图片自动提取）
- "孩子最怕"预警系统
- 孩子说（含录音 + 提取）
- 个人中心 + Header
- 学诗词 ↔ 走天下联动
- Hotel pipeline PR2-C（关键词+Mock+种子+Hotels API+wizard chip）commit e5f21a2
- PR2-A 多城天数 heuristic 升级（孩子画像驱动 + 缓冲日）commit 65ea53b

### 阻塞项
- AMAP_API_KEY → 足迹地图全栈 + Wizard PR2-B 真交通数据 + 09-seed-hotels AMAP_LIVE=true
- OSS STS 凭证 → 图片上传

### P2 待数据成熟
- 知识图谱护城河（需 ratings ≥ 200）
- 搜相似优化（需攻略 ≥ 100）
- Plan 预算建议（需 spots 价格数据）

## 开发约定
- commit 风格：`feat(travel): 中文描述`
- DB migration drift 时用手动 SQL `npx prisma db execute --stdin`
- 种子数据脚本放 `prisma/seed-*.ts` 或 `src/lib/data-pipeline/0N-*.ts`
- 提取类工具函数放 `src/lib/extract-*.ts`
- 自动提取逻辑在 POST /api/guides 中紧跟 extractChildSayingsFromHtml 之后
- Hotel 选种子用 `SEED-<city>-<idx>` 合成 amapPoiId，与真实高德 ID 区分
- Hotel pipeline 切换真数据源：`AMAP_LIVE=true npx tsx src/lib/data-pipeline/09-seed-hotels.ts`
- 多城算法：spots 权重压缩到 [1, 4] 让 child bias 浮出水面（PR2-A commit 65ea53b 验证后落地）
- buffer day：v1.5 §5 规则五 —— 超过 5 天行程 +1 天缓冲
