---
name: feedback-confirm-project-first
description: "用户说\"继续\"时，必须先确认当前所在项目和上次进度，不能默认接到 MEMORY.md 最近最热的话题上"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 9b5478f1-529b-41f9-b3df-ffe31d0eeb94
---

# 接到简短指令（如"继续"）时先确认项目上下文

用户说"继续咯"/"接着干"这种简短话时，**第一步是确认当前所在项目目录 + 该项目上次会话进度**，不能默认接到 MEMORY.md 最近加载的最热话题上。

**Why:** 2026-06-16 用户从外面回来发"继续咯"，我在 `/Users/eighteenman/工作/十八侠` 目录下，却下意识跑去查 `/Users/eighteenman/工作/好大儿/` 的诗配画生成进度——因为 MEMORY.md 里最近多条记忆都是好大儿的诗配画、诗配动画、Agnes AI 批量生成。这种记忆-上下文错配会导致工具调用浪费、问非所答、让用户怀疑 agent 是否记得自己是谁。

**How to apply:**
1. 先 `pwd` 看当前目录，确认在哪个项目
2. 查该项目最近一份 `session-YYYY-MM-DD*.md` memory（或 git log），定位上次进度
3. 如果无法判断（多项目同主题记忆混在一起），用 AskUserQuestion 明确问"你现在想继续 X 项目的哪件事？"
4. 不要让 MEMORY.md 的"热度排序"替代项目目录的实际归属判断

相关：[[feedback-deploy-immediately]]
