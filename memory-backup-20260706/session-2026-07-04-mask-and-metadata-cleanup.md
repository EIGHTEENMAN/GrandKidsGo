---
name: session-2026-07-04-mask-and-metadata-cleanup
description: 顺着 PWA 移除 / 家长门卫的尾巴，处理 7-2 提交的两个隐患：裸机 systemd nginx failed 误导 + 全机 6378 个 macOS AppleDouble 元数据堆积。
metadata: 
  node_type: memory
  type: project
  originSessionId: 0d9a096e-46ec-4313-a4d2-af2d49ab5874
---

## 触发

7-4 grandand PWA 修复时顺手发现的两个隐患，本场把它们处理掉。

## 1) `systemctl mask nginx`

- **问题**：裸机 systemd nginx 自 7-3 23:27 起 failed（端口 80/443 被 docker-proxy 占用），但 Caddy → haodaer-nginx Docker 容器路径不受影响。`systemctl status nginx` 显示 failed 会误导"系统挂了"
- **解决**：`systemctl stop nginx && systemctl mask nginx`
- **结果**：`Loaded: masked (Reason: Unit nginx.service is masked.)` —— 之后再 status 不会再误触发
- **不动的部分**：docker-proxy 仍占 80/443（必须，这是 haodaer-nginx 容器的入站口），保持原状

## 2) 全机 6378 个 `._*` AppleDouble 元数据清理

- **根因**：跨平台 rsync 部署没加 `--exclude='._*'`，每次从 macOS 同步 build 结果到 Linux，都会把 Finder 写的 AppleDouble 元数据（资源 fork / 扩展属性）一起带过去
- **数量审计**：
  - dist 内（dist 本身 + 子目录如 assets/）：107 个，全是构建产物
  - dist 外（源码、文档、worktrees）：6378 - 107 ≈ 6271 个，**全是多年积累的源头污染**（最初的 git 仓库/scp 同步从来不过滤）
  - 分布：apps/ 2738 + .claude/ (worktree) 2718 + 项目建设方案/ 8 + 备份/ 12 + 其他
- **安全判别**：抽样 `ls -la` 确认**全部 ≤ 163B**（AppleDouble 特征）。无任何文件 > 2KB，可放心全清
- **清理命令**：
  ```bash
  find /grandkidsgo -name '._*' -type f -print0 | xargs -0 rm -f
  ```
  - **必须 `-print0` + `xargs -0`** ：第一次我用 `xargs rm -f` 报 "unmatched single quote"（路径里有中文/全角字符），换成 null-delimited 一次性干净
- **结果**：6378 → 0 ✅

## 3) `scripts/deploy.sh` 加防御（commit 76533018）

- 改动：rsync 加 `--exclude='._*'`，从源头杜绝
- 顺手 commit：之前 deploy.sh 是 `??`（未跟踪），一并首次入库
- 推送：`4b5926f0..76533018 main -> main`

## 4) 本地 macOS 工作树顺手清 41 个 `._*`

- `find /Users/eighteenman/工作/童慧行 -name '._*' -type f | wc -l` = 41（apps/main-site/._dist 等）
- 一次 `xargs -0 rm -f` 清掉
- **目的**：避免下次 push 操作（git add / git commit）时不小心把它们 commit 进去（git 不会主动跟踪 `._*`，但 IDE 或 scp 复制粘贴仍会污染）

## 给下次启发的提醒

- **跨平台 rsync 永远加 `--exclude='._*'`**（带 macOS 源）
- **清理前先抽样确认特征**：`find -name '._*' | head | xargs ls -la` 都应是 120-163B 的 AppleDouble，绝不应出现业务文件同名（除非真有不规范命名）
- **`xargs` 引号坑**：路径含中文/空格/特殊字符必须 `-print0` + `xargs -0`
- **systemd 服务 failed 不代表服务挂了**，先查实际进程 + docker-proxy 端口占用

## 与之前 PWA / parent-guard 串成 7-4 完整工作日志

前段 [session-2026-07-04-grandand-pwa-and-parent-guard.md](session-2026-07-04-grandand-pwa-and-parent-guard.md)：
- 移 PWA → 7159e942
- 家长门卫 → 4b5926f0

本段（mask + 清理）：
- 76533018（deploy.sh exclude + 首次入库）

合计推送 3 个 commit：`4102d1c7..76533018 main -> main`
