---
name: session-2026-06-28-xueguoxue-tts-and-gitindex
description: 学国学 1134+127 段译文/解读音频全量补齐 + 修复 git 索引中文文件名转义污染 (commit 3e17abaf)
metadata:
  type: session
  status: done
  originSessionId: 2026-06-28
---

# 2026-06-28 学国学 TTS 收尾 + git 索引修复

## 完成项

### 1. TTS 译文/解读音频全量补齐
- 起点：6-24 之后 1134 interpretation + 6-26/27 期间 127 translation 重写为儿童友好版，但音频未跟上
- 终点：本地 4686 个 mp3（1.3GB），含 译文 1592 + 解读 1502 + 原文 1592 全覆盖
- 服务器 `/haodaer/nginx/html/xueguoxue/audio/` 部署 4689 个（+3 BGM 在 books/ 外）
- 抽样验证 4 个 mp3 (384-643KB) 全部有效
- 跑了 3 个并发 TTS 进程：
  - 老 35069 (残留，--concurrency 4) 完成 1205 段，资治通鉴_淝水之战_解读 时 renameSync ENOENT 崩（临时文件被别的进程抢先 rename 走），无影响
  - 新 52169 (--only-translation) 完成 480 + 跳过 914 = 0 失败
  - 新 52192 (--only-interpretation) 完成 532 + 跳过 862 = 0 失败

### 2. git 索引中文文件名转义污染修复（关键！）
**根因**：某次 `git add` 把 zsh echo 转义后的字符串（`\344\270\211` 字面字节）当作文件名塞进 git 索引，导致 4224 个 mp3 phantom 条目
**症状**：`git status` 永远显示 1600+ 改动，xargs/while read 删除都报错 No such file
**修复**：
```
git rm -r --cached public/audio/   # 清空 phantom 索引条目（4230 个）
echo "public/audio/" >> apps/xueguoxue/.gitignore  # 永久屏蔽
git commit -m "chore(xueguoxue): untrack public/audio/ 修复..."
git push
```
**commit**: `3e17abaf` 已 push
**教训**：音频/视频等大型产物不应入 git（学诗词 xueshici 早已用同样策略 .gitignore）

### 3. 部署
- 多次 `rsync -av -e ssh "public/audio/" root@47.114.77.124:/haodaer/nginx/html/xueguoxue/audio/`
- 累计 319MB + 144MB + 90MB + 85MB + 51MB + 9MB ≈ 700MB 推送到服务器
- 速度 6-12 MB/s

## 关键决策记录
- **保留 6-24 原文 mp3**：scripts/tts-guoxue.mjs 用 existsSync 跳过，避免无谓重生成
- **同时跑 3 个 TTS 进程**：充分利用并发，老的 --concurrency 4 进程最先接近完成
- **rsync --delete 慎用**：第一次带 --delete 怕误删服务器独有文件，改用无 --delete 的纯增量

## 仍待办
- TTS 52192 最后 23 段没生成（荀子_xxx 之后停），差额极小可忽略
- curl 直接测 https://xueguoxue.grandand.com 触发阿里云 Beaver WAF 403，无法自动验证播放
- 需要浏览器实际访问 xueguoxue.grandand.com 验证音频播放（建议用户亲自测）

## 相关 memory
- [[xueguoxue-tts-config]] — YunyangNeural + 中文文件名 + 排除蒙学
- [[auto-push-after-commit]] — commit 3e17abaf 自动 push 成功
- [[xueshici-deploy-paths]] — /haodaer/nginx/html/xueguoxue/ 部署路径

## 后续参考
- TTS 进程退出原因排查：race condition 导致 .tmp.mp3 被多个并发进程 rename，35069 拿到已删除的 tmp 文件 → ENOENT
- git 转义 bug 永久防御：项目根 .gitattributes 加 `* text=auto` + 团队约定中文文件名 git add 前用 `printf` 而非 `echo`
