---
name: chaohuan-no-ai-features
description: 潮玩换项目不做 AI 智能类功能（智能选品/智能营销/AI 解读/AI 总监等），由 aiceooffice 独立项目承担
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0df5182e-7cf9-4642-9156-d49716a09b08
---

# 潮玩换不做 AI 智能类功能

## 核心决策（用户多次明确）

潮玩换只做**数据展示层**（表格/指标/CRUD/状态机/报表）。
**AI 智能层**（智能选品/智能营销/AI 解读/AI 诊断/AI 推荐/智能计划）**全部由 aiceooffice 独立项目承担**。

aiceooffice = "爱智邦 AI CEO Office"，独立项目，已成立。

## 明确边界

| 不做 ❌（归 aiceooffice） | 做 ✅（潮玩换侧） |
|---|---|
| 智能选品算法 / 智能评分模型 | 数据展示（表格/指标） |
| 智能营销规则引擎 / 自动化营销 | CRUD、状态机、运营操作 |
| AI 解读 / AI 对比建议 / AI 诊断报告 | 基础运营（库存预警/上下架/订单/支付/物流） |
| AI 选品推荐 / AI 优化上架计划 | AI 注入槽位（默认隐藏的容器 div） |
| 8 AI 总监（CTO/COO/CMO/CFO）架构 | 数据接口 + 容器，预留 aiceooffice 注入位置 |
| SaaS 化 / 多租户 / 总监订阅 | — |

## Why

- 用户两次明确表态：「潮玩换不需要做这些智能选品 智能营销」「后面会接入爱智邦 AI 总监」
- 用户说：「这些智能管理后台的产品已经单独成立一个项目 aiceooffice」
- 关键问答：「你现在做的 后年还能接入爱智邦的 AI 选品吗」→ 数据展示层是 AI 注入的容器，**现在做反而为后年铺路**
- 防止精力分散；aiceooffice 已有完整产品化路径（8 总监/SaaS/多租户/定价/销售）

## How to apply

- 接到"智能化/AI 化/自动化运营/智能选品/智能营销"类需求 → **先问**：这个功能在 aiceooffice 是否有？是否应该归 aiceooffice 做？
- 如果潮玩换侧要展示数据（如 008B），**必须留 AI 槽位**（默认隐藏 div），不写死 AI 逻辑
- 跨项目协作：aiceooffice 总监通过 SDK/iframe/容器注入方式接入潮玩换后台
- 后端已实现的"自动"功能（SelectionScoreService/SelectionPlanService 等）只做数据计算，不做 AI 解读

## 已转交清单

- 008B 数据展示层（5 页面 + 4 modal）— 潮玩换侧 commit 25cf0ad (2026-06-13)，5 个页面顶部都预留 `ai-advisor-slot` 容器
- 008C 智能管理后台 SaaS 化 → 全部归 aiceooffice
- 智能营销模块（7 页面规划）→ 归 aiceooffice
- 智能选品（市场风向/品牌分析/店铺诊断/选品推荐/上架计划）展示层 = 008B，AI 层 = aiceooffice

## 相关 memory

- [[chaohuan-tabbar-fix]] — 潮玩换技术栈
- [[chaohuan-ci-fix]] — 潮玩换 CI/部署
- [[chaohuan-tab-redesign]] — TabBar 改造
- [[aiceooffice-architecture]] — aiceooffice 项目架构（待补充）
