---
name: session-2026-06-27-eod
description: 7月上线前完整体检+合规修正+题库清理+品牌名统一 7f7353e3 / a504a39a
metadata:
  type: session
  status: done
  originSessionId: 2026-06-27
---

# 2026-06-27 上线前体检+题库清理+合规修正

## 完成项

### 品牌名统一
- grandand.com title: "好大儿 - 儿童益智乐园" → "好大儿 儿童免费学习乐园"
- 5 处同步：vite.config.ts ×2 / App.vue footer / LegalPage.vue / shared/FooterBar.vue / mobile vite.config.ts

### 来挑战题库
- 删 897 道"下列哪项是对《XXX》的正确理解？"模板题
- 保留填空+作者题 shici 5020 道，题库总数 13298
- 恢复过误删（备份在 /haodaer/backup/db/sqlite/tiaozhan/20260627-065244.db）

### 第二轮上线体检发现并修复
- PM2 admin-api 513 次重启（端口冲突）→ `pm2 delete`
- SPA 静态资源 fallback 到 index.html → 加 `location ~* \.(js|jpg|mp3)$ { try_files $uri =404 }`
  - 踩坑：每个 SPA 站点的 location ~* 块都要设自己的 root
- travel /api/guides 500（缺 Prisma client）→ `npx prisma generate` + 重启
- travel 加 systemd 守护（scripts/systemd-units/haodaer-travel.service）

### 合规检查
- 通识图片右下角加 ⚡ AI 生成 badge（commit `7f7353e3`）
- 学诗词/学国学译文+赏析旁加 AI badge（commit `a504a39a`）
- children 表移除 phone + wechat_openid（合规风险：儿童不应存储手机号和微信id）
- children/login 接口停用（返 410）
- 不活跃账户清理脚本 cleanup-inactive-users.py + cron 每月1号04:00

## 仍待办
- forum / store 按指示暂不起
- ICP 备案号占位符未动
- travel 仅 5 篇攻略（建议 seed.ts 到 20+）
- WeChat OAuth 空配置

## 上线日期
7 月 10 日

## commit 链（今日）
- a504a39a feat: 学诗词/学国学译文+赏析加 AI 标注
- 7f7353e3 chore: 全站合规检查修正
- 95cfbd60 feat(systemd): 加 haodaer-travel.service 守护
- 8ad24e94 chore(xueguoxue): 删 tmp/ 中转文件 + 加 .gitignore
- 02dfc4ce feat(xuetongshi): 6-26/27 补图脚本集
- 0cac04eb feat(xuetongshi): 加 383 张 sections 真图
- d975b388 feat(xueguoxue): 加 TTS 蒙学排除 + 类型过滤
- 54a3088b fix(xueguoxue): 朗读按钮单实例互斥
- bd8ca185 feat(main-site): 加 /faq FAQPage 组件 + SPA 路由
- 291d220d fix(xueguoxue): 删 90 个错位子项重复
