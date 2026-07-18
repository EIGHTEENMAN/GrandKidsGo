---
name: session-2026-06-25-admin-pm2-hardening
description: admin 加固三件套 — pm2 守护 + max-old-space-size=256 + 30 天 analytics 清理 cron
metadata: 
  node_type: memory
  type: project
  originSessionId: 92473e97-3bf7-4244-9692-bfc1379575a6
---

# Session 2026-06-25 admin 加固三件套

## 起因
admin 进程历史 OOM 被杀（VSZ 13GB/RSS 600MB），502 无人守护自动恢复。本次三件套加固防再发。

## 1. pm2 守护（自动重启）
```bash
ssh root@47.114.77.124
cd /haodaer/apps/admin
pm2 start --name admin-api 'node --max-old-space-size=256 api/server.js' \
  --max-memory-restart 300M \
  --restart-delay 5000
pm2 save           # 持久化进程列表
pm2 startup systemd  # 开机自启
```

## 2. 内存限制
- `--max-old-space-size=256`：V8 堆内存硬限 256MB（触发 GC 更频繁但不会涨到 GB 级）
- `--max-memory-restart 300M`：RSS 超过 300MB 自动重启（双重保险）

## 3. analytics 清理 cron
脚本：`/tmp/cleanup-analytics.mjs`（/haodaer 是 NFS 只读，无法写入 app/scripts/）
- 保留最近 30 天 `usage_events` 数据
- 每周一凌晨 3 点执行
- DELETE + VACUUM 回收磁盘空间

**重要**：脚本必须用绝对路径 import better-sqlite3，因为 /tmp 不在 node_modules 解析路径：
```js
import Database from '/haodaer/apps/admin/node_modules/better-sqlite3/lib/index.js'
```

**cron 配置**：
```cron
0 3 * * 1 cd /haodaer/apps/auth-service && /usr/bin/node /tmp/cleanup-analytics.mjs >> /var/log/cleanup-analytics.log 2>&1
```

## 验证
- pm2 list 显示 admin-api online, 83.1MB
- https://admin.grandand.com/ HTTP 200
- 测试运行清理脚本：`[2026-06-25T09:06:49Z] 删除 0 行(>30天) 0->0 DB:0.02MB`

## 踩坑记录
1. **/haodaer 是 NFS 只读 mount**：所有者 UNKNOWN:staff，root 也写不进去
2. **better-sqlite3 路径问题**：脚本放 /tmp 时 import 必须用绝对路径
3. **pm2 重启**：`pm2 delete admin-api` 后再 start 才会应用新参数（update 不一定生效）

## 后续监控
- `pm2 monit` 实时查看 admin 内存
- `tail -f /var/log/cleanup-analytics.log` 看每周清理日志
- 若 admin 又 OOM，检查 `/var/log/syslog` OOM killer 记录

## 关联
- [[session-2026-06-25-admin-502-fix]] — 起因 + OOM 排查