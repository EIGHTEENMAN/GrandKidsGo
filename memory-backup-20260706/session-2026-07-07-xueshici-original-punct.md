---
name: xueshici-punct-73-poems
description: 学诗词 73 首诗 original 字段标点补全（修复编译后无标点问题）
metadata:
  node_type: memory
  type: project
  originSessionId: 2026-07-07
---

# Session 2026-07-07 xueshici 73 首诗标点修复

## 问题
73 首诗 original 字段编译后是双引号格式（"无插值反引号被 esbuild 转双引号"），导致：
- 浏览器 `split('\n')` 切不开 → 显示单行
- 标点缺失，需要手工补 `，` `。` `？` `！`

## 修复方案
按古诗规则（5/7 字 + 词牌）逐首加标点，MANUAL_FIX 映射表
