---
name: session-2026-07-04-5-original-text-fix
description: 22 首诗原文手工逐首改 + deploy.sh text-full 模式 bug 修复 + audio 拆 3 子目录架构改造
metadata: 
  node_type: memory
  type: project
  originSessionId: 0d9a096e-46ec-4313-a4d2-af2d49ab5874
---

## 背景

7-4 一天工作两段：
1. 上午 grandand PWA + 14 岁家长门卫（详见 session-1-4 4 段记忆）
2. 下午 xueshici 全部 2000+ 首诗 original 改写 + 架构改造

## xueshici 架构改造（commit a972a483）

**问题**：deploy xueshici 一次备份 4.3G（cp -r 整个 nginx dir 含 audio/images）。
即使只改 1 首诗或 1 个 mp3，都被迫 4.3G 备份 + 100% 风险。

**架构**：
1. audio/poems/{id}_{type}.mp3 → 拆为 audio/original/{id}.mp3 + audio/translation + audio/interpretation
2. App.vue URL: /audio/poems/{id}_original.mp3?v=2 → /audio/original/{id}.mp3
3. deploy.sh 加 4 strategy: text-full / text / audio <type> / images
4. 备份按 deploy 目标分别（audio/original 备份 4KB vs 之前 4.3G）

**验证**：3 类 audio 2026 文件全到位 + 3 个 URL HTTP 200。

## 22 首诗原文手工改（commit e9c2c874）

**重要警告**：用户明确要求"不要用算法，全部手动写"。我踩坑一次 `git checkout --` 把今天下午手改全清掉，
之后**重做** id 1-22。

**id 1-22 一览**（按原诗原貌改）：
- 诗经：关雎 / 蒹葭 / 采薇 / 桃夭 / 静女 / 子衿 / 无衣 / 氓 / 击鼓 / 黍离
- 楚辞：离骚 / 湘夫人 / 橘颂 / 国殇 / 易水歌 / 越人歌 / 击壤歌 / 卿云歌 / 天问 / 河广 / 君子于役 / 木瓜

每首 original 从 `1 行用 , 隔` 改成 `N 章用 \n 分`。
**改法**：
- 4 句一章（诗经四言 + 国殇）：每 4 句 1 行 `\n` 分
- 4 联对仗（关雎 / 离骚节选 / 击鼓）：每联 `\n` 分
- 3 章（蒹葭 / 桃夭 / 击壤歌）：每章 `\n` 分
- 楚辞：每句 `\n` 分（兮是句中语气词，不做断点）
- 用 `\\n` 转义写入（**双引号字符串不允许字面 newline**，只能用 `\\n`）

## deploy.sh 修 bug

**text-full 模式** 原来 cp 服务端 dist/index.html 上层。但 rsync --delete 已把 dist/ 副本清掉 → cp 失败。
**修法**：从本地 `$LOCAL_DIST/index.html` rsync 上传，**不依赖服务端 dist/ 还在**。

## 5 个旧 hash 镜像

部署到 nginx root 后，**浏览器 cache 锁死旧 hash URL**。直接 mirror 旧 URL 路径到新内容
（`cp index-BM23q8Rt.js index-DhTICsbt.js` 等），5 个 URL 都 200。

## 留给下次启发的关键认知

1. **`git checkout -- <file>` 会清掉未提交的工作**——**永远不用**，用 `git stash` 暂存
2. **双引号字符串不允许字面 newline**——必须用 `\n` 转义
3. **deploy.sh text-full 模式** rsync 平铺 + --delete + cp 旧路径 → 修法是直接从本地 rsync
4. **浏览器 cache 锁死旧 hash URL** 是最稳的 cache-bust hack 是 mirror 旧路径到新内容
5. **任何 git 操作（reset/checkout/clean）**——如果 working tree 里有手改诗句，**先 commit 再操作**

## 串入 7-4 完整日志

1. [PWA + parent-guard](session-2026-07-04-grandand-pwa-and-parent-guard.md) — 7159e942 / 4b5926f0
2. [mask + ._* 清理](session-2026-07-04-mask-and-metadata-cleanup.md) — 76533018
3. [nginx main/ 路径同步](session-2026-07-04-nginx-main-deploy-path.md) — 诊断踩坑
4. [xueshici 双标点](session-2026-07-05-xueshici-double-punct.md) — 162870c2
5. [deploy.sh skip-media](session-2026-07-04-deploy-sh-skip-media.md) — 20fdf5c6
6. [架构改造 audio 3 目录](session-2026-07-04-5-original-text-fix.md) — a972a483 + e9c2c874（本段）

合计 7 个 commit：`4102d1c7..e9c2c874`
