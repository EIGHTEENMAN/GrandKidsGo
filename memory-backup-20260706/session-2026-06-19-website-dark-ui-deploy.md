---
name: session-2026-06-19-website-dark-ui-deploy
description: 2026-06-19 官网 deep dark+blue UI 改版：本地 7 个 modified 提交 + 强推废弃的国风科技 3 commit + 修复 vercel.json nuxt→nuxtjs
metadata: 
  node_type: memory
  type: project
  originSessionId: ab073bf8-53ec-4165-ab5f-0be6f93654d9
---

# 2026-06-19 官网深色 UI 改版 + 部署

## 做了什么
1. 接到"检查网页代码有没有更新"指令
2. 发现 website 仓库状态混乱：
   - 本地 c6f2987 (HEAD)，7 个 modified 未提交（深色 UI 大改版）
   - 远程 origin/main 比本地多 3 个 commit：98c7d97 国风科技 + 2 个 redeploy
3. MEMORY 已记录"国风科技被推翻不要了"，决定强推
4. 用户最初提到"今天早上 workbuddy 修复"——实际是腾讯的 /Applications/WorkBuddy.app 桌面工具（PID 49923），跟代码无关，用户后来 forget about it
5. 用户最终要求：本地 7 个 modified 提交并推送
6. commit `86c3b85`：feat: 官网 UI 全面升级为深色+蓝色 accent 风格
   - 7 files changed, 505 insertions(+), 316 deletions(-)
   - 浅色灰白 → bg-dark-bg(#0B0B10) + accent-500(#3B82F6)
   - Tailwind 新增 dark/accent 色板 + 6 个 keyframes（fadeInUp/pulseBlue/float/glowPulse/reveal）
   - CSS 新增 reveal-el scroll 渐入工具类
7. force-with-lease 强推 origin/main（覆盖 ce97601/c2b10b6/98c7d97）
8. vercel deploy 触发报 `Invalid request: framework should be equal to nuxtjs` —— **之前 3baa682 没修全 vercel.json**
9. 修复 vercel.json: `nuxt` → `nuxtjs`，commit `aa84935`
10. 重跑 vercel deploy --prod --yes，CLI 卡 Building 不刷新 stdout
11. 用 `vercel ls` 看到 27m 前那次部署已 Ready（webhook 自动触发），curl 验证十八侠官网已生效深色 UI

## 关键收获
- **vercel.json framework 值是 `nuxtjs` 不是 `nuxt`**（Vercel 白名单枚举）
- 每次接到"检查更新"必须先 pwd + git status + 远程比对三方（参 [[confirm-project-first]]）
- Vercel CLI 卡 Building 不代表失败，去 `vercel ls` 查最新部署状态更准
- 接到模糊词（"workbuddy/xxx 修复"）必须先全项目 grep 验证，搜不到就要追问路径

## 当前部署状态
- origin/main HEAD: `aa84935` (vercel.json fix)
- 上一提交: `86c3b85` (深色 UI 改版)
- 远程国风科技 3 commit 已彻底覆盖
- Vercel Production Ready, eighteenman.cn / eighteenman-website.vercel.app HTTP 200

**Why:** 下次看到 website 仓库时不用再扒 6 月 16 日国风科技废弃分支和 vercel.json 错误。
**How to apply:** 接到 website 仓库任务时先看本条；部署报 framework 错误直接改 vercel.json nuxt→nuxtjs。