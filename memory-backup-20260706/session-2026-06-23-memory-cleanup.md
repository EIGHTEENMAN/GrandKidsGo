---
name: session-2026-06-23-memory-cleanup
description: 2026-06-23 服务器内存+磁盘清理+Swap 2G 上线
metadata: 
  node_type: memory
  type: project
  originSessionId: af46b21e-c291-46cd-ba47-daa70ae0b838
---

# 2026-06-23 服务器清理（早间 session）

## 早间：磁盘+内存清理
- Docker prune 释放 ~21MB
- 删 xuetongshi.bak.20260622 备份 121MB
- 删 apps/xueshici/dist 老 build 494MB（关键教训：build 完直接 dist→nginx 同步，**dist 是过期 build**）
- 停 aiceooffice PM2 释放 123MB（OpenAI Token Plan 耗尽，30 次/17h 重试空转）
- **0 Swap 隐患**（TODO 立了，下午做掉）

## 下午：Swap 2G 上线 ✅
- 之前：3.4G 内存 0 Swap，1.5G available，**OOM 风险高**
- 现在：fallocate 2G swapfile，UUID=3f503c6a-...
- 写入 /etc/fstab（开机自动启用）
- 总可用 1.5G → 3.5G（**2.3 倍**）
- 磁盘 16G → 14G
- 5 分钟搞定

## aiceooffice 根因（重要）
- **不是崩溃，是 OpenAI Token Plan 用完**，429 限速
- Circuit Breaker 触发 30 次重启
- 解决：充 Token → pm2 restart aiceooffice
- 状态：PM2 stopped，节点保留可一键恢复


# 2026-06-23 服务器清理与隐患登记

## 磁盘清理（释放 ~636MB）
- Docker system/image/builder prune：~21MB
- 删 `/haodaer/nginx/html/xuetongshi.bak.20260622/`：121MB（6/22 改版备份）
- 删 `/haodaer/apps/xueshici/dist/`：**494MB**（6/19 老 build，nginx/html 才是 6/20 真正的服务目录，**dist 早就过期**）
- 磁盘从 23G/40G(61%) → 22G/40G(59%)

## 内存清理（释放 ~124MB）
- `pm2 stop aiceooffice` → 释放 123MB（进程彻底消失）
- 截断 `/aiceooffice/server/logs/{error,out}.log`（已备份为 .bak.20260623）
- 可用内存 1.4G → 1.5G

## aiceooffice 30 次重启/17h 根因
- **不是崩溃，是 OpenAI Token Plan 用完**（429 限速）
- `error.log` 充斥 `[CircuitBreaker] llm.openai: 429 已达到 Token Plan 用量上限`
- 解决路径：充 Token → `pm2 restart aiceooffice`
- 进程目前 `stopped` 状态，PM2 仍保留条目可一键恢复

## 0 Swap 隐患（**重要 TODO**）
- 服务器 3.4G 总内存、Swap=0，是 OOM 最大风险
- TODO #12：加 2-4G swapfile
  - 模板：`fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab`
  - 预计 5 分钟，维护窗口做

## 业务进程清单（端口 → 进程 → 内存）
- 3001 tiaozhan node server/index.js → 91MB
- 3010 travel-guide next-server → 108MB + npm wrapper 85MB
- 3080 ~~aiceooffice~~ → 已停
- 3306 MySQL → **567MB**（业务大头）
- 5432 PostgreSQL → 闲置（travel-guide 没用上）
- 5432-33060 MySQL 内部
- MySQL 调优方向：`innodb_buffer_pool_size` 调小可降 100-200MB

## 学诗词部署路径提醒（重复确认）
- 服务器真实路径是 `/haodaer/nginx/html/xueshici/`
- 每次 build 后**必须 rsync 到 nginx 路径才生效**（不是 apps/xueshici/dist）
- build 后可加 `rm -rf dist` 步骤，省 494M 重复

**Why:** 服务器 65% 阶段运维要点，避免每次都要重新发现 aiceooffice 根因和 dist 重复
**How to apply:** 接手时先 `free -h` + `df -h` + `pm2 list` 三件套，aiceooffice 是 PM2 里唯一的服务
