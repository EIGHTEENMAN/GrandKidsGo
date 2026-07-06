---
name: chaohuan-shop-not-saas
description: "潮玩换商城已决定不做 SaaS 多租户 — 当作单店铺运营,以后有需要再做"
metadata: 
  node_type: memory
  type: decision
  originSessionId: b31d87bd-ceba-4efa-ad74-4ddd67de7388
---

# 潮玩换商城 ≠ SaaS 多租户

## 决策（2026-06-22）
商城目前就当**单店铺**运营，不做多租户隔离。以后真的有多店铺入驻需求再启动改造。

## 背景
- `server/src/routes/shop/` 19 个路由全部基于单一 admin 视角（全局可见/可改）
- 数据库表（shop_goods / shop_orders / shop_coupons / shop_promotions 等）无 `shop_id` / `owner_id` / `tenant_id` 字段
- 整个 `server/src/` grep 命中 0 个 `tenant_id` / `merchant_id`

## 用户原话
"目前商城就是一个独立的店铺而已，没有租户，不需要做，以后有需要再做。"

## Why 这个决策
- 商城代码全栈都是单店铺视角
- 数据库模型不支持多租户
- 当前阶段项目在打磨核心闭环，加 SaaS 复杂度性价比太低
- 多租户改造是不可逆的（数据迁移 + 19 路由重写 + 前后端权限模型重做）

## How to apply

### 不要做的事
- ❌ 看到"多店铺"字样就提议"是不是该加 shop_id 隔离"
- ❌ 给 shop_goods / shop_orders 加 tenant_id 字段"以备将来"
- ❌ 改 `shopAdminOnly` 中间件加"多店铺切换"逻辑

### 遇到冲突时的处理
- 文档/PRD 里如果出现"多店铺""租户""merchant"等字样 → **按单店铺理解**
- 数据库 schema 缺 `shop_id` 不是 bug，是设计选择
- 任何"店铺间数据隔离"问题都假定"无需要"

### 重新评估的触发条件
- 真的出现第二个店铺老板（不同 users 集合）申请入驻
- 业务侧明确要求"不同店铺数据完全独立"
- 出现"平台型商城"重新定位

## 关联 memory
- [[session-2026-06-22-chaohuan]] — 同期工作的总览
- [[商城SaaS架构]] — 之前对 SaaS 的早期设想(已废止,本文档取代)
