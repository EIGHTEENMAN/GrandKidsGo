---
name: session-2026-07-07-recap
description: 7月7日工作——2028首原文标点修复、translation替换、返回键音频停止、audio/images恢复
metadata:
  type: project
  originSessionId: 2026-07-07
---

# Session 2026-07-07 工作总结

## 学诗词原文标点修复（2028首）
- 73首诗逐首加标点（将进酒/念奴娇/水调歌头/声声慢/静夜思 等经典）
- 8首诗修复 esbuild minify 回退 → 加 \n 行首
- 2028首 original 字段全部反引号+真换行
- commit: ee12b02 / 10b911d / 3d1ff69 / ad5239c

## ESBuild minify bug 发现
esbuild 0.21.5 对"无插值反引号字符串"转成双引号，丢失 \n 换行
修复方式：在 original: \` 后立即加真换行 \n

## Translation 替换
用 poems-data.json 的 translation 替换 src chunks 的 translation 字段
981首诗有差异 → 全部替换
commit: 4d41fd8

## 返回键音频停止
- xueshici: popstate 加 stopSpeaking()
- xueguoxue: popstate 加 stopSpeaking()
- xuetongshi: popstate 加 stopSpeaking()
commit: 5cc918a / 57cc1e4

## 音频/配图缺失 & 恢复
问题根因：deploy.sh text 模式的 rsync --delete 会删除服务器上 audio/images 目录
恢复方案：从 public/ 本地 rsync 恢复
注意：每次 deploy 后需要手动恢复 audio/images

## 服务器清理
清理 23 个小 backup + 3 个大 backup（7.3G→0）
清理 journal 400M + syslog 80M + .DS_Store
磁盘 78%→61%

## 服务器卡顿重启
SSHD 和 Caddy 同时卡住（可能 OOM 或系统负载）
重启后恢复，docker 容器自动重启

## 关联
- [[session-2026-07-06-xueshici-manual-fix-batch3]]
- [[session-2026-07-06-xueshici-manual-fix-batch4]]
- [[session-2026-07-06-xueshici-manual-fix-batch5]]
