---
name: session-2026-07-08-launch-test
description: 上线前系统测试 + SEO + 安全 headers 修复
metadata:
  type: project
  originSessionId: 2026-07-08
---

# Session 2026-07-08 上线前系统测试

## 测试覆盖
9 个 app 全部 200 OK（除 auth.grandand.com 根 404 正常）：
- main-site / xueshici / xueguoxue / xuetongshi / english / tiaozhan / admin / mobile / auth

## 安全 headers（nginx 改 /grandkidsgo/nginx/conf.d/haodaer.conf）
在每个 location block 加 4 个：
```
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

## SEO meta
7 个 SPA app 加了 meta（每个 app 自定义 description）：
- xueshici: 古诗 2026 首 + 原文/译文/赏析/朗诵
- xueguoxue: 国学经典 动画配朗诵
- xuetongshi: 趣味百科 DK/Usborne 风格
- english: 5000+ 单词 闯关
- tiaozhan: 答题对战
- admin: 管理后台
- mobile: 移动端

每个 app 加 description / og:title / og:description / og:type / og:site_name / twitter:card / twitter:title / twitter:description / keywords

## commit
- 2d2bd6f: 7 个 SPA app 加 SEO meta + nginx 加 4 个安全 headers

## 待办
- 3 个 app build 失败：tiaozhan, admin, mobile (uni-app + 旧依赖)
- auth-service 根路径 404（/health 200 正常）
- nginx conf 改动没 commit 到 git（服务器本地文件）
