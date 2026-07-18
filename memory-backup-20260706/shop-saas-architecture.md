---
name: shop-saas-architecture
description: 潮玩换商城是SaaS架构，平台内各品牌/商家独立运营店铺
metadata: 
  node_type: memory
  type: reference
  originSessionId: 3d7892a9-10da-4cb9-94ae-830cc42aad77
---

# 商城SaaS架构决策

2026-06-08 用户明确：商城是 **SaaS 平台**，不是单店铺系统。

## 核心含义

- 每个品牌/商家是一个 **tenant（租户）**
- 商品、订单、优惠券、促销活动等数据需按 tenant 隔离
- 每个 tenant 有自己的管理后台（`shop-admin`），仅管理自己的数据

## 当前状态

数据库模型和 API 路由中**尚未实现** tenant 隔离字段（如 `shop_id` / `merchant_id` / `tenant_id`），当前所有数据在单租户模式下工作。

## 后续需要

当进入 SaaS 多租户阶段时需补充：
1. 用户-店铺关联表（`user_merchant` 或 `shop_admins`）
2. 所有业务表加 `shop_id` 外键
3. API 路由层 tenant 上下文解析中间件
4. 管理后台登录态绑定 tenant

参见：[[app-business-architecture]]
