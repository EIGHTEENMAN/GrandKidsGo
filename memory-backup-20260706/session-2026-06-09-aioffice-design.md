---
name: session-2026-06-09-aioffice-design
description: AI CEO Office产品设计方案讨论与独立产品剥离决策
metadata: 
  node_type: memory
  type: reference
  originSessionId: 74679229-69d9-4e25-8fce-205990bebf8f
---

# Session 2026-06-09 AI Office 设计方案全记录

## 产品定位
- 产品名：**AI CEO Office**（简称AICO）
- 域名：`aiceooffice.com`
- 仓库：`github.com/EIGHTEENMAN/aiceooffice`
- 定位：剥离为独立SaaS产品，潮玩换作为第一个租户

## 核心决策记录

### 设计哲学
- CEO只审不操——AI总监分析→出方案→CEO审批→AI执行
- 三源数据驱动（行业大盘+竞品+平台自身数据）
- 所有结论必须标注数据来源，无来源不予采信

### 交互模式
- 总监→CEO：自动分析推送方案
- CEO→总监：异步议题制（非同步会议）
- 移动端审批H5+可选微信小程序
- CEO决策看板首页（3.7）
- IM即时对话CEO↔总监（3.9）

### 定价体系（v1.5重构）
- 高级版（¥3,000/月）：情报+决策，用户自执行
- 旗舰版（¥8,000/月）：含自动执行层
- 高级版用户可预览旗舰版结果+7天试用升级

### 数据架构
- 三层视角：SaaS租户层→品牌全域层→单店铺层
- 多租户隔离（tenant_id分区，凭证加密AES-256存储）
- 适配器模式连接客户数据源（不直存客户业务数据）

### 对外执行（跨平台）
- 淘宝/抖音：全自动API操作（平台正规服务商通道）
- 京东：部分自动（限制较多）
- 拼多多：仅数据分析（不开放写API）
- 所有操作走正规OAuth2商家授权，不走爬虫

### 待决策
- 后端语言（建议Node.js/TypeScript）
- AI模型供应商
- 服务器/部署方式

## 文件产出
- `/Users/eighteenman/工作/潮玩换/文档/智能管理后台设计方案.md` — v1.5完整版（6000+行）
- `/Users/eighteenman/工作/aiceooffice/智能管理后台设计方案.md` — 同步副本
- `/Users/eighteenman/工作/潮玩换/文档/AI Office独立产品剥离方案.md` — 剥离方案

## 后续
- 切换到aiceooffice仓库继续开发
- 技术栈确定后开始搭架子
- 先做chaowanhuan适配器
- 4个待决策项：后端语言/AI模型/服务器/部署
