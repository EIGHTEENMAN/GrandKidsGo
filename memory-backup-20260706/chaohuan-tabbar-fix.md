---
name: chaohuan-tabbar-fix
description: 潮玩换底部TabBar修复 + 编译错误(openBlock/vShow)排查记录
metadata:
  type: project
  originSessionId: current
---

最新修复记录见 [[chaohuan-ci-fix]]。

# 潮玩换项目 - TabBar修复 & 编译错误排查

## 2026-05-30 当前进度

### 1. TabBar修复（已完成）

**问题**: 5个TabBar页面中只有 index/index.vue 有自定义TabBar注释，其余4个页面都没有引用。

**修复内容**:
- `miniprogram/src/pages/index/index.vue` — 添加 `<custom-tab-bar :selected="0" />`
- `miniprogram/src/pages/my-showroom/my-showroom.vue` — 添加 `<custom-tab-bar :selected="1" />`
- `miniprogram/src/pages/matches/matches.vue` — 添加 `<custom-tab-bar :selected="2" />`
- `miniprogram/src/pages/messages/messages.vue` — 添加 `<custom-tab-bar :selected="3" />`
- `miniprogram/src/pages/profile/profile.vue` — 添加 `<custom-tab-bar :selected="4" />`

**组件位置**: `miniprogram/components/custom-tab-bar/custom-tab-bar.vue`
- 5个标签：首页/展柜/求换(紫色药丸高亮)/消息/我的
- 通过 `pages.json` 的 easycom `^cwh-(.*)` 规则全局解析
- 使用 `uni.switchTab` 跳转
- `highlight: true` 的标签（求换）显示紫色渐变药丸样式

### 2. 编译错误（排查中，未解决）

**错误信息**:
```
node_modules/@dcloudio/uni-h5/dist/uni-h5.es.js (7:79): "openBlock" is not exported by "node_modules/@dcloudio/uni-mp-vue/dist/vue.runtime.esm.js"
```

**根因分析**:
- `uni-h5` 导入了 `vue` 的 `openBlock`/`createElementBlock`/`vShow`/`withDirectives`
- `uni-mp-vue` 的 `vue.runtime.esm.js` 是定制版Vue运行时，**不导出**这些内部API
- `vite-plugin-uni` 的 `resolveId` 插件通过 `BUILT_IN_MODULES` 将 `vue` 别名到 `vue/dist/vue.esm-bundler.js`，但这个 bundler 版本(vue@3.4.31)不包含内部 API 的 re-export
- `uni-h5` 被 `uniPrePlugin` 排除（不在 COMMON_EXCLUDE 中，但实际编译时未生效）

**尝试过的修复方案**:
1. ✅ 修改 `resolveId.js` BUILT_IN_MODULES 添加 `'vue': 'dist/vue.esm-bundler.js'` — 无效
2. ✅ 修改 `resolveId.js` BUILT_IN_MODULES 添加 `'@dcloudio/uni-mp-vue': 'dist/vue.runtime.esm.js'` — 无效（vue.runtime.esm.js 本身不导出 openBlock）
3. ✅ 在 `vite.config.js` 添加 `alias: vue -> vue/dist/vue.esm-bundler.js` — 无效
4. ✅ 安装 `@vue/runtime-core@3.4.21` 与 uni-mp-vue 版本匹配 — 无效
5. 🔧 **正在尝试**: 直接修改 `uni-mp-vue/dist/vue.runtime.esm.js`，在头部 import 并 re-export `openBlock/createElementBlock/createBlock/vShow/withDirectives` from `@vue/runtime-core`

**当前修改状态** (`uni-mp-vue/dist/vue.runtime.esm.js` 第1-2行):
```js
import { openBlock, createElementBlock, createBlock, vShow, withDirectives } from '@vue/runtime-core';
import { isRootHook, ... } from '@dcloudio/uni-shared';
```
已添加 export `{ openBlock, createElementBlock, createBlock, vShow, withDirectives } from '@vue/runtime-core';`

**最新错误** (修复 openBlock 后出现):
```
node_modules/@dcloudio/uni-h5/dist/uni-h5.es.js (7:273): "vShow" is not exported
```
→ 正在继续在 uni-mp-vue 的 vue.runtime.esm.js 中添加 vShow 和 withDirectives 的 import/export

### 3. 项目结构

- `miniprogram/src/` — 前端源码（Vue 3 + uni-app）
- `miniprogram/components/` — 组件（含 custom-tab-bar）
- `miniprogram/static/tabbar/` — TabBar 图标（home/showroom/matches/messages/profile）
- `server/` — Express 后端
- `miniprogram/vite.config.js` — 当前 alias vue 已改为 vue/dist/vue.esm-bundler.js

### 4. 依赖版本

| 包 | 版本 |
|----|------|
| @dcloudio/uni-h5 | 3.0.0-alpha-5010220260529001 |
| @dcloudio/uni-mp-vue | 3.0.0-alpha-5010220260529001 |
| vue | 3.4.31 |
| @vue/runtime-core | 3.4.21 |
| @dcloudio/vite-plugin-uni | 3.0.0-alpha-5010220260529001 |
| @dcloudio/uni-cli-shared | 3.0.0-alpha-5010220260529001 |

### 5. 下一步

继续修改 `uni-mp-vue/dist/vue.runtime.esm.js`，直到 `openBlock`、`createElementBlock`、`vShow`、`withDirectives` 全部可以从 `uni-h5` 正常导入。不断迭代 build 直至编译通过。