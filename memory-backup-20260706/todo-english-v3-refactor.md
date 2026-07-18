---
name: todo-english-v3-refactor
description: 学英语 apps/english 重构待办 — 方案 v3 已存 memory，等用户启动开发
metadata: 
  node_type: memory
  type: project
  originSessionId: 92473e97-3bf7-4244-9692-bfc1379575a6
---

# TODO: 学英语 apps/english 重构（v3）

## 状态
**方案设计完毕，2026-06-25 用户拍板"先保存后面再做"**

## 方案位置
memory: `session-2026-06-25-english-v3-architecture.md`

## 核心要点速览
- **3 Tab 平等**：学习 / AI 对话 / 我的
- **单词学习**：DailyStudy 4 步（Flashcard/ReadAlong/Choice/Dictation）+ ThemeBrowse + Review
- **AI 对话**：6 个角色（小狐/Miss Wang/团团/Leo/Bunny/Frog）+ 自定义命名 + 默认引导最近单词 + 母语级中文偷偷夹英文
- **视觉**：Scratch 风格克制版 — 1 主蓝 + 2 辅橙绿 + 无 emoji + Fredoka 字体
- **清理**：Phaser + 8 游戏组件 + 4 游戏 Store + game/ 目录

## 工作量
13.5-14.5 天单人开发

## 关键资产保留
- `src/data/words.ts`（5018 词）
- `src/stores/wordStore.ts`（核心）
- `src/components/WordPreview.vue`（拆为 Flashcard）
- `src/components/ReviewPage.vue`（复习入口）
- `src/components/PersonalCenter.vue`（拆为 ProfileScreen + SettingsPanel）
- `src/components/LoginModal.vue`（保留）
- `public/audio/`（2201 音频）

## 启动时第一步
进入 plan 模式，从清理 Phaser + 游戏代码开始（约 0.5 天）。

## 关联
- [[session-2026-06-25-english-v3-architecture]] — 完整方案
- [[session-2026-06-20-english-architecture]] — 6-20 初版
- [[english-app-refactor-plan]] — 6-16 初版