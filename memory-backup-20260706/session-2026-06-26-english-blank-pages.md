---
name: ""
metadata: 
  node_type: memory
  originSessionId: 15007416-5656-436a-b527-a455e8fe3a0c
---

# Session 2026-06-26 修复"我的"和"单词学习"空白

## 现象
用户反馈：点首页「我的」/「单词学习」卡片后，main 区域空白（`<!---->`），但 TopHeader 和 BottomNav 正常显示。

## 根因（双 bug）

### Bug 1: wordStore 方法调用错
`useLearningData.ts` / `StudyHub.vue` / `ReviewPage.vue` 写的是 `wordStore.getMasteredCount()`，
但 wordStore.ts 里这几个方法是**模块级 export 函数**（不是对象方法）：
```ts
export function getMasteredCount(): number { ... }
export function getAccuracy(): number { ... }
export function getCorrectCount(): number { ... }
export function getWrongCount(): number { ... }
```

Vue render 抛 `TypeError: ce.getMasteredCount is not a function`，整个 ProfileScreen 子树退化为 `<!---->`。

### Bug 2: initRouter 时序
`router/index.ts` 里 `initRouter()` 原本只在 main.ts 显式调用一次。
但 `App.vue` setup 顶层 `const currentRoute = ref<Route>(router.current)` 时
**router.current 还是默认 'study'**（reactive 模块单例，import 时就初始化为 'study'），
initRouter 跑完后才更新成正确值。

所以直接访问 `https://english.grandand.com/#/profile` 刷新时，setup 阶段 currentRoute='study'，
App.vue template 走 `<template v-if="currentRoute === 'study'">` 分支，渲染 StudyHome（默认）——
但因为 hash 是 `/profile` 实际 router state 又匹配不上，最终 main 退化为空。

## 修复
1. `useLearningData.ts` / `StudyHub.vue` / `ReviewPage.vue`：模块级 import `getMasteredCount` 等函数，直接调用
2. `router/index.ts`：
   - initRouter 加幂等守卫 `(router as any)._initialized`
   - 模块顶层 `if (typeof window !== 'undefined') initRouter()` —— import 时就同步填好 router.current

## 验证（playwright 实地跑）
- `https://english.grandand.com/#/profile` → 218 字符，profile-screen 完整（用户卡+4统计+日历+设置/清除）
- `https://english.grandand.com/#/study/__hub__` → 691 字符，study-hub 完整（返回+3统计+续聊+复习+20主题）
- console 0 pageerror

## Commit
`65655f03` fix(english): '我的'和'单词学习'二级页空白 — wordStore 方法调用错
- 4 files changed, 20 insertions, 10 deletions
- 8a35ce8e → 65655f03，已 push origin/main

## 教训
1. **store 拆分风格要一致**：要么全用 `store.xxx()` 方法，要么全用模块级函数。学英语混用了，导致静态错误只在运行时抛。
2. **首屏路由**的初始化必须在 App.vue setup 之前完成（模块顶层副作用），不能依赖 main.ts 里的命令式调用——除非用 onBeforeMount 延后读 ref。
3. **空 main 排查套路**：`main.innerHTML === '<!---->'` = Vue 模板 v-if 链全不命中或子组件 render 抛错。先抓 pageerror，再看 router 状态。

## 关联
- [[session-2026-06-26-english-hub]] — StudyHub 引入导致 2 个新页面要修
- [[session-2026-06-25-english-v3-p2-done]] — ProfileScreen/ReviewPage 原始 v3 落地
- [[session-2026-06-26-english-debug-banner]] — 同日的 banner 清理
