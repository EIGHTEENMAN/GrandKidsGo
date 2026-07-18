---
name: session-2026-06-16-poem-illustration-rsync
description: 诗配画scp死锁→rsync替代+增量同步实战记录
metadata: 
  node_type: memory
  type: project
  originSessionId: 089a1cbe-1db4-48b7-a147-ba54bcc93c1a
---

# Session 2026-06-16 诗配画 scp 死锁替换为 rsync

## 关键决策

原 scp 进程 PID 78351 在 18:37 卡死（开了 490.jpg 但 0 字节，CPU 0% 持续 2:30，状态 SN），导致服务器 jpg 停在 ID 1004，但本地生成已到 1962。判断为 SSH 连接死锁但进程未死。

**Why**: scp 用 `ssh -C` 管道压缩，断开后不会自动重连也不退出，进程睡眠无动作。
**How to apply**: 长同步任务优先用 rsync（支持断点续传 --partial、增量同步、可见进度），不用 scp 直连。

## rsync 命令模板（macOS 适用）

```bash
nohup rsync -avz --partial --timeout=60 \
  --include='*.jpg' --include='*.mp4' --exclude='*' \
  /本地/路径/ \
  root@服务器:/远程/路径/ \
  > /tmp/rsync.log 2>&1 &
```

**注意**：
- macOS 自带 rsync 不支持 `--info=progress2`，用 `--progress`
- `--include` + `--exclude='*'` 实现白名单过滤
- 必须 `--timeout=60` 防无限挂起
- 后台跑用 nohup + & + 输出重定向

## 同步验证

两次同步效果：
- 第一次（1708 jpg 全部同步）：1.85GB，~5 分钟，6.7MB/s
- 第二次（增量 25 张最新）：48MB，~10 秒

最终服务器最新 jpg = 1961（追上本地 1962）。

## 任务 #6 已关闭

已用 rsync 替代 scp。原任务进程已被 kill -9 + 清理 490.jpg 0字节垃圾。
