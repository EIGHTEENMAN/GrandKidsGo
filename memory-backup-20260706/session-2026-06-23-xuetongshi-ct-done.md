---
name: session-2026-06-23-xuetongshi-ct-done
description: 学通识 42 个中国传统文化 topic 扩到 10 节 + 难度筛选 UI 上线
metadata:
  node_type: memory
  type: project
  status: completed
  originSessionId: 2026-06-23
---

# Session 2026-06-23 学通识 42 个 ct-* topic 扩充上线

## 结果

| 维度 | 数据 |
|---|---|
| 扩充 topic | 42 个 ct-* 中国传统文化 |
| 新增 sections | 244 节（每 topic 2-5 → 10 节） |
| 难度分级 | P1 入门 15 / P2 进阶 19 / P3 深度 8 |
| 新增 UI | 难度筛选 Tab + 卡片难度角标 + 节数显示 |
| 总节数 | 2393 节（243 topic 全部更新元数据） |

## 工具与流程
- `scripts/expand-ct-topics.py`：定位 topic 位置 → 追加 sections 到原数组
- `scripts/update-meta-counts.py`：解析 knowledge.ts 实际 sections → 更新 knowledge-meta.ts sectionCount
- 内容生成：用 daxueshi 子代理一次性产出 42 个文件到 `/tmp/ct-expansion/`

## 难度等级定义

```ts
// 静态映射（基于 topic id 前缀）
const p3Ids = new Set(['ct-chinese-medicine', 'ct-chinese-martial-arts', 'ct-four-great', 
                       'ct-chinese-architecture', 'ct-chinese-porcelain', 'ct-silk-road', 
                       'ct-four-classics', 'ct-mythology'])
const p1Ids = new Set(['ct-water-safety', 'ct-electricity-safety', 'ct-food-safety',
                       'ct-fire-safety', 'ct-traffic-safety', 'ct-first-aid',
                       'ct-zodiac', 'ct-solar-terms-*', 'ct-lantern-festival', 
                       'ct-qixi', 'ct-papermaking', 'ct-chinese-chess'])
// 其余 ct-* = P2；非 ct-* 按 sectionCount 判断
```

## UI 关键改动
- App.vue 顶部新增"难度"Tab：📋全部 / 🌱入门 / 📚进阶 / 🏆深度
- 卡片右上角彩色角标：🌱入门(绿) / 📚进阶(橙) / 🏆深度(红)
- 卡片底部显示节数："10 节"

## 部署
- 本地：apps/xuetongshi/dist/ 已 build
- 服务器：/haodaer/nginx/html/xuetongshi/ 已 rsync --delete
- 验证：curl xuetongshi.grandand.com 返回 title="学通识 - 好大儿"

## 提交
- `0d5dccb` feat(xuetongshi): 42个中国传统文化topic扩到10节+难度筛选UI
- 5 files changed, 1693 insertions(+), 92 deletions(-)

## 关联
- [[session-2026-06-22-xuetongshi-survey]] - 调研报告
- [[session-2026-06-22-xuetongshi-todo]] - 扩充待办
