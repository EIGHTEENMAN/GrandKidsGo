---
name: session-2026-06-16-poem-illustration-agnes
description: 诗配画Agnes AI批量生成今日进度，完成53.6%，下次继续
metadata: 
  node_type: memory
  type: reference
  originSessionId: 22123b96-98d9-4d8f-b830-20d7bf662fbf
---

# Session 2026-06-16 诗配画 Agnes AI 生成

## 今日成果
- **新增 181 张真实配图**（Agnes AI `agnes-image-2.1-flash`）
- 原有 MiniMax 905 张 👍，总完成 **1086/2028（53.6%）**
- jpg 文件总量：322 张（原有 141 + 新增 181）
- 失败 6 张（临时网络波动，下次 `--retry` 重试）

## 配置变更
- `config.mjs` 新增 `agnes` provider（API Hub 兼容 OpenAI 格式）
- `generate.mjs` 新增 `generateAgnesImage()` 函数（中文 prompt，return URL 格式）
- 扩展名：`.jpg`（与 MiniMax 一致）
- 并发：5 路

## 下次继续
```bash
cd /Users/eighteenman/工作/好大儿/scripts/generate-poem-images
AGNES_API_KEY=sk-IqVdWLfEwAKfBFRQSHVG9USMN8oOn92DERL34sho15DJcVzM AI_PROVIDER=agnes node generate.mjs --retry
```

**待生成：** 928 首（ID 范围主要覆盖新增 1000+ 和部分中间缺失）
**失败需重试：** 6 首（ID 42/59/60/69/240/641 — `--retry` 自动重试）

## 部署提醒
全部生成完后需要：
1. 重新 build（`npx vite build`）
2. rsync 到服务器
3. 图片优先走 `.jpg`（前端回退链：mp4 → jpg → svg → 占位）
