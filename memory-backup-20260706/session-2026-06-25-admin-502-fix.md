---
name: session-2026-06-25-admin-502-fix
description: admin.grandand.com 502 临时修复 + OOM 根因 — 启动 node api/server.js 后恢复，被 dmesg 记录 OOM kill 过（13GB VSZ）
metadata: 
  node_type: memory
  type: project
  originSessionId: 92473e97-3bf7-4244-9692-bfc1379575a6
---

# Session 2026-06-25 admin 502 修复

## 现象
- 用户访问 https://admin.grandand.com/ 提示 502
- 服务器 3099 端口无监听，admin 进程不存在

## 临时修复
```bash
ssh root@47.114.77.124
cd /haodaer/apps/admin
nohup node api/server.js > /tmp/admin.log 2>&1 &
# Admin API running on port 3099
```

## 验证
- 3099 端口已 LISTEN（PID 1397307）
- https://admin.grandand.com/ HTTP 200
- https://admin.grandand.com/api/health HTTP 200

## 根因（dmesg OOM 记录）
```
oom-kill: Killed process 865721 (node) total-vm:13434524kB (≈13GB), anon-rss:614876kB (≈600MB)
task=node,pid=865721  ← 这是 admin 进程（之前被杀）
```

admin 进程曾涨到 **13GB 虚拟内存**（VSZ）/ **600MB 物理**（RSS），被 Linux OOM killer 干掉。系统内存 3.5GB 较紧。

## 根因分析（api/server.js 头部）
admin 服务连接 4 个 SQLite 数据库：
- `tiaozhan/data/game.db`（只读）
- `auth-service/data/auth.db`（读写）
- `analytics.db`（analytics 自建）
- 历史还有 forum/store（已注释掉）

Express + SQLite 高并发下：
- SQLite `better-sqlite3` 是同步库，连接本身不泄漏
- 但 `execSync` / `readFileSync` / `analyticsDb.exec(CREATE TABLE...)` 等可能阻塞 + 缓存
- 监控/统计查询如果返回大结果集会撑爆内存

## 建议永久方案（待办）
1. **加 systemd 守护**：`pm2` 或 systemd 拉起，挂掉自动重启
2. **内存限制**：`node --max-old-space-size=256` 防止涨到 600MB
3. **查询分页**：admin 监控页的 SQL 查询加 LIMIT，避免大结果集
4. **清理 analytics**：定期 truncate `usage_events` 旧数据

## 当前状态
- admin 已恢复，进程稳定运行
- 系统内存 available 2006MB / total 3494MB
- 无需立即行动，**监控即可**

## 关联
- [[Session 2026-06-23 服务器清理]] — 之前 aiceooffice 同样 OOM 问题已停