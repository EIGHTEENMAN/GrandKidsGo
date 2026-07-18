---
name: session-2026-07-04-log-rotation-and-disk-monitor
description: 2026-07-04 日志轮转加固 + 磁盘监控告警 + systemd 冲突清理 - 防 7/3 syslog 15G 事故复发
metadata:
  node_type: memory
  type: project
  originSessionId: 992e940a-c2c3-4f71-8385-83590897d545
---

# 2026-07-04 日志轮转 + 磁盘监控告警 + systemd 冲突清理

## 部署内容

### 1. rsyslog logrotate 加固
- 备份：`/etc/logrotate.d/rsyslog.bak.20260704`
- 规则：`daily + size 100M + rotate 7 + su syslog adm`
- 文件：`/etc/logrotate.d/rsyslog`

### 2. journald cap
- 备份：`/etc/systemd/journald.conf.bak.20260704`
- 加 `SystemMaxUse=500M + MaxRetentionSec=7day`
- 文件：`/etc/systemd/journald.conf`
- `systemctl restart systemd-journald`
- 当前用量：**496.4M（正好压在 cap 下）**

### 3. PM2 日志 logrotate
- 新建：`/etc/logrotate.d/pm2`
- 规则：`copytruncate + size 200M + rotate 7 + dateext`
- **必须 copytruncate** —— PM2 持有 fd 写旧 inode
- 已强制切一次：原 4.3G auth-service-error.log → 0 字节 + .log-20260704 备份

### 4. auth-service systemd 清理
- 备份：`/grandkidsgo/scripts/systemd-unit-backup/grandkidsgo-auth.service.20260704`
- 删 `/etc/systemd/system/grandkidsgo-auth.service`
- `systemctl disable --now` + `daemon-reload`
- PM2 是事实管理者，systemd unit 删掉消除歧义
- 注意：还有 grandkidsgo-{admin,forum,main,store,tiaozhan,travel}.service 同样 disabled，目前没冲突但记录在案

### 5. 磁盘监控告警脚本
- 路径：`/grandkidsgo/scripts/disk-usage-monitor.sh`（**不入 git**）
- cron：`*/30 * * * *`
- 日志：`/var/log/disk-usage-monitor.log`
- 状态：`/var/tmp/disk-usage-monitor.state`（cooldown）

**阈值与行为**：
- < 90%：仅记日志
- ≥ 90%：发钉钉警告，附 Top 5 大日志
- ≥ 95%：发钉钉紧急 + 自动 truncate ≥2GB 的 Top 5 日志 + 再发结果
- cooldown 1 小时（同级别不重发）

**`WEBHOOK_URL`**：当前 `REPLACE_ME` 占位符，**用户尚未提供真实钉钉 webhook**
- 修法：`sed -i 's|REPLACE_ME|真实 token|' /grandkidsgo/scripts/disk-usage-monitor.sh`

## 验证（V1-V6 全过）

| 验证 | 结果 |
|---|---|
| V1 PM2 logrotate | 250M 假文件被切为 0 字节 + 250M 备份 |
| V2 journald cap | 496.4M 稳定在 500M 内 |
| V3 警告路径 | 改阈值 10% 触发，cooldown 正确抑制重复发 |
| V4 truncate | 3G 假日志 → 0 字节，磁盘 71% → 63% |
| V5 cooldown | 第二次跑正确"cooldown 未过" |
| V6 systemd 清理 | unit 文件已删，PM2 仍管 auth-service |

## 重要经验

1. **logrotate 需要 `su` 指令** —— Ubuntu 上 rsyslog 写日志用 `syslog` 用户，目录是 root:syslog 775，不加 su 会报 parent directory 权限不安全
2. **PM2 日志必须用 `copytruncate`** —— PM2 持 fd 不 reopen
3. **logrotate -d 也会真做 copytruncate** —— 干跑也会 truncate 当前文件
4. **V2V3 验证后清理 state** —— `/var/tmp/disk-usage-monitor.state` 测试后删掉，避免 cooldown 持续生效
5. **4.3G 文件轮转不会立即腾出空间** —— `copytruncate` 是"复制+截断"，副本留在磁盘。需要等 rotate 7 后才自动删。本例：副本 4.3G 当前是 63% 磁盘的负担之一，但日志已不再增长
