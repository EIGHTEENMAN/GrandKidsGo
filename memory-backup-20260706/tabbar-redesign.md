---
name: tabbar-redesign
description: TabBar改造：自定义TabBar启用，求换变成突出发布按钮（咸鱼风格）
metadata: 
  node_type: memory
  type: reference
  originSessionId: 38a236fc-7780-41d0-9e73-7690d5786776
---

TabBar 已从原生切换为自定义（`pages.json` → `custom: true`）。

底部视觉结构：首页 | 交换 | **求换（突出药丸按钮）** | 消息 | 我的

- "求换"按钮为渐变紫色凸起药丸样式，点击跳到 `/pages/sub/swap-post/publish` 发布求换页
- 其余4项为正常 Tab，用 `uni.switchTab` 切换
- 自定义组件 `cwh-tab-bar` 放在 `src/components/cwh-tab-bar/`
- 各 Tab 页面包裹在 `page-wrapper`（flex column, 100vh）中，content 区域 `flex:1; height:0`
