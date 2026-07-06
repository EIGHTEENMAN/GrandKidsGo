---
name: session-2026-07-03-disk-full-syslog
description: 2026-07-03 凌晨 4 点阿里云 EcsBaseBPS 限流 + 磁盘 100% 满，根因 auth-service setTimeout 月底定时器超 32 位 int 上限
metadata:
  node_type: memory
  type: project
  originSessionId: 992e940a-c2c3-4f71-8385-83590897d545
---

# 2026-07-03 凌晨服务器宕机救援

## 事件
- 03:58:28 阿里云触发 `Instance:StoragePerformanceReachLimit:Executed`（EcsBaseBPS 基础带宽超限）
- 白天 SSH 22/443/80 全部 Connection refused 或 banner exchange 超时
- 所有子站 https 访问 exit code 35（000）

## 根因
- `apps/auth-service/src/db.js` 里的 `scheduleNextPointExpiry()` 用 `setTimeout(..., delay)` 调度月底任务
- 7/2 → 8/1 间隔 28+ 天 = 2,419,200,000 ms
- Node.js setTimeout 最大 2^31-1 = 2,147,483,647 ms（24.8 天）
- 超限后 Node 强制把 delay 设为 1ms 并**每次都**打印 `TimeoutOverflowWarning`
- 月底任务跑完后递归调度下一个月，**死循环刷屏**
- /var/log/syslog 涨到 15GB，磁盘 100% 满
- 阿里云 EcsBaseBPS 因 IO 暴增触发限流
- SSH banner exchange 写日志失败 → 挂死

## 修复
- `apps/auth-service/src/db.js` 改为 setInterval 每小时检查一次（1 号 0 点执行清理）
- commit ff3ab67a 已推送
- 部署到服务器 `/grandkidsgo/apps/auth-service/src/db.js`
- truncate syslog 释放 14G
- 重启 grandkidsgo-nginx 容器 + PM2 全部进程

## 实际架构（容易误解）
- 主机 systemd nginx 是**冗余**的（端口被 docker-proxy 占着）
- 实际反代是 **Caddy 容器**（边缘 TLS）+ **grandkidsgo-nginx 容器**（容器内 nginx）
- PM2 启动通过 `pm2 start /grandkidsgo/ecosystem.config.cjs` 恢复
- Caddy 配置在 `/var/lib/docker/volumes/caddy-proxy_caddy_config/_data/caddy/autosave.json`

## 重要教训
- **任何 setTimeout > 24.8 天的代码都是定时炸弹** —— Node 不会报错，会转成 1ms 死循环
- **journald / syslog 必须配 logrotate** —— 之前没配，单文件 15G 是事故根本原因
- **磁盘监控应早做** —— 100% 满后 sshd 都卡住，无法远程修复，只能阿里云 VNC

## TODO（建议你做）
- 加 logrotate 防止 syslog/auth.log 单文件无界增长
- 加磁盘监控告警（>80% 报警）
- 阿里云升配磁盘（40G → 60G）留余量
- 复查整个仓库有没有其他长 setTimeout（不一定在 auth-service）
