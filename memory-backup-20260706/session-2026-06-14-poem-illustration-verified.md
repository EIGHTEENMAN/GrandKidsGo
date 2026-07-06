---
name: session-2026-06-14-poem-illustration-verified
description: 诗配画引擎 100% 完成验证 — 误判 bug 后纠正：905 真实图+21 占位图已全部就绪
metadata:
  type: project
  originSessionId: 2026-06-14-poem-illustration-verified
---

# Session 2026-06-14 — 诗配画引擎配图完成验证

## ✅ 任务状态：100% 完成（无 bug）

### 真实数据（最终）
- 服务器 `/haodaer/apps/xueshici/public/images/poems/*.jpg`：**905 张**真实 AI 图（200~550KB）
- SVG 占位图：**21 张**（毛泽东诗词等敏感词）
- generation-status.json：`done:905 + skipped:21 = 926` ✅
- 公网验证：`https://xueshici.grandand.com/images/poems/1004.jpg` → HTTP 200, 332KB, image/jpeg ✅

### 我之前的误判（教训）

**误判 1：本地只有 4 张 .jpg → 推断服务器也没生成**
- 真相：本地 4 张是早期测试遗留（1.jpg / 2.jpg / 3.jpg / test-minimax.jpg）
- 服务器一直在跑批量生成，**905 张早就齐了**
- 本地只是没 rsync 而已，不影响生产

**误判 2：生成日志 "成功:541 失败:381" → 推断任务失败**
- 真相：那是**中间批次**的统计，最终 381 个失败项在后续重试中全部成功
- 905 done = 初始 541 + 重试 364 个 + 早期几张 = 完整覆盖

**误判 3：nginx 系统服务 failed 5 天 → 推断网站挂了**
- 真相：系统 nginx (systemd) 端口冲突（被 Caddy 占了 80/443），但 **docker haodaer-nginx** 跑了 4 天正常服务
- 架构是 Caddy → docker haodaer-nginx → 后端，系统 nginx 是历史残留

**误判 4：curl 测试 .jpg 返回 HTML → 推断 nginx 配置 bug**
- 真相：`docker exec haodaer-nginx curl http://127.0.0.1/images/poems/1004.jpg` 没带 Host header
- Host=127.0.0.1 不匹配 `server_name xueshici.grandand.com`，nginx fall through 到 default server (main-site)
- 用 `curl -H 'Host: xueshici.grandand.com'` 测试 → 正常返回 332KB JPEG

## 📌 关键诊断方法

**任何"任务没完成"的怀疑都要经过三层验证：**
1. **磁盘文件** — `ls /path/*.jpg | wc -l`（最可靠）
2. **status.json** — 仅作辅助，可能与磁盘不同步
3. **HTTP 公网验证** — 必须带正确 Host header

**日志里的 success/fail 计数不可信** —— 中间批次的失败会被后续重试覆盖。

## 🛠️ 没有需要修复的代码

- `generate.mjs` 无 bug（attempts 累加逻辑正确）
- `generation-status.json` 无需重置（done:905 是真实状态）
- `PoemIllustration.vue` 的 .webp→.jpg→.svg 三级回退正常工作
- nginx `try_files $uri $uri/ /index.html` 配置正确（资源存在就返回资源）

## 📦 Git 改动待提交

- `apps/xueshici/src/components/PoemIllustration.vue` (M, +19)
- `scripts/generate-poem-images/generate.mjs` (M, +68)
- `scripts/generate-poem-images/generation-status.json` (M, +8284)
- `scripts/generate-poem-images/poems-data.json` (?? 新文件)