---
name: session-2026-06-26-english-debug-banner
description: 学英语 v3 收尾 — 移除 P2 遗留的红色 debug banner (commit 9f8d0103)
metadata:
  node_type: memory
  type: project
  originSessionId: 92473e97-3bf7-4244-9692-bfc1379575a6
---

# Session 2026-06-26 学英语 v3 收尾

## 任务
用户反馈首页顶部红色 banner："路由: study | study: {"themeId":null,"stage":null} | chat: #/study | profile: #/study"

## 根因
`apps/english/src/App.vue:87-89` P2 commit `efaf0ac3` 留下开发期调试 UI:
- 红色背景显示 `router.current` / `studyPath` / `chatPath` / `profilePath`
- 黄色 `⚠️ router 对象未初始化` 兜底（已通过 `v-if="!router"` 永久 false，因为 router 必存在）

## 修复
- 删 debug banner（3 行）+ 删 router 兜底（1 行）+ 删未使用 `showContent` ref 周边 1 行
- 文件净减 6 行
- build 输出 `index-RpU2r70I.js` 1.17MB，rsync 到 `/haodaer/nginx/html/english/`
- 服务器验证 js bundle 中 `debug-banner` / `路由:` / `router 对象未初始化` 全部为 0 匹配

## Commit
`9f8d0103` fix(english): 移除 App.vue 残留的红色 debug banner
- push 到 origin/main
- 4f3411de → 9f8d0103

## 教训
**P2 集成完后必须自检一遍 dev 工具残留**：debug banner、console.log、v-if 兜底、注释掉的旧代码。
之前的 P2 commit 只验证了功能上线，漏了清理调试 UI。

## 关联
- [[session-2026-06-25-english-v3-p2-done]] — 引入 debug banner 的 commit
- [[todo-english-v3-refactor]] — v3 重构总览（已全部完成）
