---
name: english-app-refactor-plan
description: 英语板块去游戏化 — 清理Phaser引擎+游戏逻辑，改造为纯Vue3学习工具
metadata: 
  node_type: memory
  type: project
  status: planned
  originSessionId: d57a3a48-94aa-48e5-8168-40a31639d3d8
---

# 英语板块去游戏化改造方案

## 现状

当前英语应用（apps/english）是 Vue 3 + Phaser 4 双引擎混合架构，有 Quest（宝可梦回合制）和 Arena（实时打斗）两种游戏模式。学习被包裹在复杂的游戏系统中，维护成本高，用户上手门槛高。

## 核心思路

**去掉**：Phaser 引擎 + 游戏世界 + 战斗 + 捕捉 + 进化 + 技能 + 关卡
**保留**：5018词 + 20主题 + 2201音频 + 发音评分 + 学习记录 + 跨域同步
**新建**：纯 Vue 3 SPA，DailyStudy + ReviewMode + Dictation + ReadAlong + ThemeBrowse 学习体系

## 实施步骤

1. **清理阶段** — 删除 Phaser 引擎、游戏组件、游戏 Store、stages 配置
2. **重构 storage** — 改造 wordStore + 新增 studyStore
3. **新建核心组件** — StudyHome + DailyStudy + ReviewMode + 学习流程
4. **新建辅助组件** — Dictation + ReadAlong + Challenge + ThemeBrowse + VocabularyBook
5. **统计+设置** — StudyStats + Settings
6. **构建部署** — vite build → rsync 到 nginx

## 详细方案

参见当前会话中的完整方案（2026-06-16）：含架构图、组件清单、清理清单、SRS算法、资产复用对照表。

## 关联

- [[session-2026-06-16-english-refactor]]
