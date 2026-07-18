---
name: chaohuan-website-pending
description: 潮玩换官网 website/index.html 已跟踪到仓库但未部署，待启动部署流程
metadata: 
  node_type: memory
  type: project
  originSessionId: e61f837e-76e3-442f-bd44-01fe2974e7b3
---

# 潮玩换官网部署（待办）

**状态**：website/index.html（44K 单页站，POP MART 风格深色编辑风）已 commit 到 main（975ef24）但未部署

**部署目标**：chaowanhuan.com（同潮玩换 backend API 服务器）

**未做事项**：
1. 服务器部署路径未定（参考 [[xueshici-deploy-paths]] 经验，可能是 `/haodaer/nginx/html/chaowanhuan.com/`）
2. 域名证书/Caddy 配置状态未确认
3. CI 自动部署 vs 手动 deploy 脚本 未决定
4. 现状：用户决策"现在先不处理"，暂缓

**已知约束**：
- 本地 curl 无法访问 chaowanhuan.com（沙箱无网络/DNS），线上状态未验证
- 域名 SSL 状态未知（可能是 Let's Encrypt 自动续期）
- backend 同服务器跑，需避免 nginx 冲突（API 在 :3011）

**Why**: 用户明确"现在先不处理部署"，但要记住这个待办避免遗忘

**How to apply**:
- 用户下次问"部署官网"时，先检查服务器实际路径和 SSL
- 部署前必须确认不会覆盖现有 API 路由（/api/* 应该走 backend 3011）
- 参考 [[xueshici-deploy-paths]] 的路径经验
