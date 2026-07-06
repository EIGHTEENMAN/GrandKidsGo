---
name: session-2026-06-16-poem-supplement
description: 诗词补充从999首到2028首，达到2000+目标
metadata: 
  node_type: memory
  type: reference
  originSessionId: 22123b96-98d9-4d8f-b830-20d7bf662fbf
---

# Session 2026-06-16 诗词补充完成

## 成果
- **从 999 首 → 2028 首**，超额完成 2000 首目标
- 新增 1029 首经典名篇

## 新增分布
| 来源 | 数量 | 朝代 |
|------|------|------|
| chinese-poetry 翻译 | 805 | 唐280/宋280/元80/清80/魏晋55/诗经30 |
| LLM 明 | 63 | 明 |
| LLM 近现代 | 69 | 近现代 |
| LLM 汉 | 54 | 汉 |
| LLM 三国 | 21 | 三国 |
| LLM 南北朝 | 17 | 南北朝 |

## 工具链
- `fix-json.mjs` — 修复 LLM 生成 JSON 的尾部逗号/未转义引号
- `merge.mjs` — 合并翻译批次到 poems.ts
- `merge-llm.mjs` — 合并所有 LLM 生成批次
- `merge-supplement.mjs` — 补充批次合并

## 部署
- `xueshici.grandand.com` 已部署更新

## 未完成
- 诗配画/动画：还有约 200 幅图未生成（ID 1005-1200+ 的新诗）
- 需刷新 images/poems/ 目录
- 2000 首与英语单词5000+已达标，学习三站点（学诗词/学国学/学通识）数据接近完善
