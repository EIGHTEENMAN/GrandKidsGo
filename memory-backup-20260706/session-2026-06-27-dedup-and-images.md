---
name: session-2026-06-27-dedup-and-images
description: 学国学去重 + 学通识补图部署，commit 291d220d
metadata:
  type: session
  status: done
  originSessionId: 2026-06-27
---

# 2026-06-27 学国学去重 + 学通识补图

## 学国学去重
- commit `291d220d` fix(xueguoxue): 删 90 个错位子项重复 (zi-18/19/25/26/27)
- 根因：6-21 整本化时复制粘贴 sections 数组，子项 id 前缀没改
- 删的 4 块污染：
  - zi-19 法言父项内 15 个 zi-18-sN
  - zi-25 忍经父项内 17 个 zi-24-sN
  - zi-26 郁离子父项内 25 个 zi-24/25-sN
  - zi-27 省心录父项内 33 个 zi-24/25/26-sN
- 验证：线上 classics chunk 533 zi 子项 / 0 重复

## 学通识补图
- 起点：243 topic 100% 覆盖；sections 2024/2417 = 84%（缺 383）
- 新脚本：`scripts/generate-xuetongshi-images/fill-missing-sections.mjs`
  - 直接 AI 生成（跳 wiki），写实摄影风格
  - 输出到 `apps/xuetongshi/public/images/sections/{parent}-{section}.jpg`
  - 25s/张，约 2.5 小时
- 跑完 380 张：361 ok / 19 fail（API 偶发）
- 部署：rsync 到 host `/haodaer/nginx/html/xuetongshi/images/sections/`（容器 ro 挂载源）
- 现状：2394 张 sections jpg 全部就位
- 剩余 13 张 fail 重试时 API 限流严重（13/13 fail），暂放

## 部署踩坑
- 容器 `/usr/share/nginx/html` 是 ro bind mount，源在 host `/haodaer/nginx/html/`
- 部署步骤：本地 dist → rsync 到 host 挂载源 → 容器自动可见
- 不要用 `docker cp`，会报 "marked read-only"

## 学诗词
- 4054 行，但只 2026 条诗，重复 0，本来就 OK

## 后续 TODO
- 18 张 fail 学通识 sections：等 MiniMax API 限流恢复后补
- 6-26 launch-readiness 里的 5 个 P0（forum/store 瘫、/faq /legal 404、JWT dev、systemd disabled）还没修

**Why:** 距 7 月上线还有几天，先把数据质量清干净
**How to apply:** 下次再有复制粘贴的 sections 数组，记住子项 id 前缀要跟父项对齐