---
name: session-2026-06-26-english-hub
description: 学英语首页改 3 大卡片入口枢纽页 (commit 2c11ebb1)
metadata:
  node_type: memory
  type: project
  originSessionId: 92473e97-3bf7-4244-9692-bfc1379575a6
---

# Session 2026-06-26 学英语首页改 3 大卡片

## 决策
**纯 3 大卡片枢纽页**，不保留原首页内容。原统计/续聊/复习/20 主题全部下沉到 `StudyHub` 二级页（`#/study/__hub__`），从「单词学习」卡进入。

## 3 卡内容
| 卡 | accent | 描述 | 行为 |
|----|--------|------|------|
| 单词学习 | blue | 5018 词精选主题宫格 · 看图拼写 · 跟读复习 | 进 StudyHub（不退到外层）|
| AI 对话 | orange | 6 位性格朋友陪你练口语 · 偷偷夹英语 | router.navigate('chat') |
| 我的 | green | 学习进度 · 连续打卡 · 声音设置 | router.navigate('profile') |

## 实现
- `StudyHome.vue` 重写：3 张大卡 + 主题色边线（左侧 6px 粗条）+ 大图标（48-56px Fredoka 字体 Aa/Hi/Me）+ 角标「主功能/新功能」+ slideUp 动画错峰 80ms
- 桌面端 (≥720px) 横排 3 列，移动端竖排 3 行
- 卡片点击 hover 上浮 3px + 边色变主题色 + 箭头右移 4px
- 新增 `StudyHub.vue`：原 StudyHome 内容（3 统计 + 续聊 + 复习 + 20 主题）+ 顶部「← 返回」按钮
- `App.vue` 注册 `studyPath.themeId === '__hub__'` 路由分支

## 路由
- `#/study` → StudyHome（3 卡枢纽）
- `#/study/__hub__` → StudyHub（统计+主题）
- `#/study/__review__` / `#/study/__read__` 不变
- `#/study/:themeId` / `#/study/:themeId/:stage` 不变

## Commit
`2c11ebb1` refactor(english): 首页改 3 大卡片入口枢纽页
- 3 files changed, 547 insertions, 262 deletions
- 9f8d0103 → 2c11ebb1，已 push

## 学英语 v3 至此完整状态
- P0 去游戏化（commit f8d22f11）
- P1.1 我的 + P1.2 AI 对话（commit 40205f66/...）
- P2 顶部导航 + 集成（commit efaf0ac3）
- 6-26 修 debug banner（commit 9f8d0103）
- 6-26 改 3 大卡首页（commit 2c11ebb1）

## 关联
- [[session-2026-06-25-english-v3-p2-done]] — P2 集成完
- [[session-2026-06-26-english-debug-banner]] — banner 清理
- [[todo-english-v3-refactor]] — v3 全部完成
