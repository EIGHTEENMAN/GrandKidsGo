---
name: session-2026-06-03-logo-ui-fix
description: 品牌色替换橙色 + 导航栏自定义模式适配 + 首页区块缺失 + 刘海胶囊遮挡未完全解决
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7ed0e9f3-06d6-4c98-a281-607c3853dd95
---

# 2026-06-03 会话记录：LOGO替换+UI配色+导航栏修复

## 已完成工作

### 1. 品牌色替换（紫色→橙色）
- uni.scss 变量替换：`#4B1A7A`→`#FF7818`, `#8E6BB8`→`#FFA84D`, `#3A1265`→`#E06600`
- 33个文件硬编码颜色替换
- utils/condition.js 中 N/S 品相标改为橙色系
- TabBar 16个 PNG 图标用 sharp 重新生成为橙色
- 生成脚本路径修复：从 `miniprogram/static/tabbar/` 指向 `miniprogram/src/static/tabbar/`

### 2. LOGO 图片
- 品牌标准 logo 复制到 `static/logo/`
- 登录页使用实际 logo 图片替换占位图标

### 3. 导航栏自定义模式
- 6个 tab 页 + 多个子页面设置 `navigationStyle: custom`
- 页面顶部 padding 统一公式：
  ```css
  padding: 140rpx ...;
  padding: calc(100rpx + constant(safe-area-inset-top)) ...;
  padding: calc(100rpx + env(safe-area-inset-top)) ...;
  ```
- 我的展柜页面添加返回按钮

## 未解决问题

### 1. 首页三个区块缺失（热门展柜/热门藏品/周边交换）
- 后端服务器必须用 `node app.js` 启动（非 `node index.js`）
- `node app.js` 包含全部 API 路由
- 当前已启动，API 正常返回数据

### 2. 刘海/胶囊遮挡未完全解决
- 当前 140rpx ≈ 70px 的 padding 在大多数设备不够
- 方案无效，需要重新评估

**Why:** 用户不满意修复效果，胶囊按钮遮挡问题未解决，首页区块因后端启动方式错误导致空白。需要更彻底的方案。

**How to apply:** 
- 重新评估刘海适配方案，考虑使用 `uni.getSystemInfoSync()` 动态获取状态栏高度
- 后端需用 `node app.js` 启动
