---
name: session-2026-07-04-eod
description: 2026-07-04 EOD — 紧急救援 syslog 15G + 磁盘监控告警 + TTS 字面 \n 修复 + 学英语 AI 对话隐藏
metadata:
  node_type: memory
  type: project
  originSessionId: 992e940a-c2c3-4f71-8385-83590897d545
---

# 2026-07-04 紧急救援 + 全面修复

## 1. 服务器 syslog 15G 救援
- 7/3 凌晨 4 点阿里云 EcsBaseBPS 限流，SSH 死锁
- 根因：auth-service setTimeout 月底定时器超 32 位 int 上限（24.8 天）
- Node 强制把 delay 设为 1ms 并持续刷 TimeoutOverflowWarning
- /var/log/syslog 涨到 15GB，磁盘 100% 满
- 修复：commit `ff3ab67a`（setTimeout → setInterval）
- truncate syslog 释放 14G

## 2. 日志轮转 + 磁盘监控告警
- rsyslog logrotate: daily + size 100M + rotate 7 + su syslog adm
- journald cap: SystemMaxUse=500M + MaxRetentionSec=7day
- PM2 日志 logrotate: copytruncate + size 200M + rotate 7
- auth-service systemd 清理（PM2 接管）
- 脚本: /grandkidsgo/scripts/disk-usage-monitor.sh
  - 钉钉 webhook 占位 (待用户填)
  - 90% 警告 + 95% 自动 truncate ≥2GB Top 5
  - 30 分钟 cron 一次

## 3. TTS 字面 \n 修复
- classics.ts: 483 个字面 \n → 中文逗号（学国学）
- poems.ts: 8211 个字面 \n → 中文逗号（学诗词）
- commit `4efb961f`
- 删除服务器 910 个问题音频
- TTS 重生成:
  - 学国学蒙学 42 个 ✅（tts-mengxue.mjs）
  - 学诗词 868 个 ✅（分 3 批，tts.mjs --ids）
- rsync 部署到 /grandkidsgo/nginx/html/

## 4. 学英语 AI 对话隐藏
- StudyHome.vue: 注释 AI 对话 entry 卡片
- StudyHub.vue: 注释续聊大卡
- commit `4102d1c7`
- npm run build + rsync 部署

## 已知遗留
- 学英语 ChatHome/ChatPanel/ProfileScreen 页面文件保留（路由可访问但不显示在入口）
- 钉钉 webhook URL 待用户填写（脚本是占位符）
- 6 个 grandkidsgo-*.service 还 disabled 在 systemd（auth/forum/main/store/tiaozhan/travel）
