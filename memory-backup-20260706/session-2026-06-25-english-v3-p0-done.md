---
name: session-2026-06-25-english-v3-p0-done
description: 学英语 v3 重构 P0 完成 — 去游戏化 + hash 路由 + 学习 Tab (commit f8d22f11)
metadata: 
  node_type: memory
  type: project
  originSessionId: 92473e97-3bf7-4244-9692-bfc1379575a6
---

# Session 2026-06-25 学英语 v3 P0 完成

## 成果
**Commit**: `f8d22f11` feat(english): v3 重构 P0 — 去游戏化 + hash 路由 + 学习 Tab

## 数据
- **变更**：66 个文件，+2353/-46998 行（**净减 44645 行**）
- **部署**：rsync 到 `/haodaer/nginx/html/english/`，线上 https://english.grandand.com/ HTTP 200
- **main bundle**：1155 KB / gzip 202 KB（含 5018 词 words.ts）

## P0 包含内容

### 删除（~6000 行游戏化代码）
- `src/game/` 整目录（11 个文件：BootScene/OverworldScene/BattleScene/GameScene/EventBus + 7 entities/world/skills/ui）
- 5 个游戏 store：gameStore/battleStore/pokedexStore/playerStore + utils/achievement
- 8 个游戏组件：StageMap/StageHUD/WorldSelect/StartScreen/GameHud/SkillBar/WordPreview/WordSummary/Pokedex/HowToPlay/AchievementCard/PersonalCenter
- `data/stages.ts` + `words.ts.backup` + `App.vue.bak` + `backups/` 目录
- `package.json` 的 phaser 依赖

### 新增（v3 骨架）
- `src/styles/{theme,reset}.css` — CSS 变量体系（3 色 + 字体 + 阴影 + 圆角）
- `src/router/index.ts` — hash 路由（`#/study` / `#/chat` / `#/profile`）
- `src/components/BottomNav.vue` — 3 Tab 底部导航
- `src/stores/studyStore.ts` — 学习会话状态（lastSession 持久化）
- `src/utils/wordAudio.ts` — 修复版 audio 注册（正则允许 ' + 去重 + 取消 encodeURIComponent）
- `src/pages/study/{StudyHome,StageList,FlashCard,ReadAlong,ReviewPage}.vue` — 学习 Tab 完整流程
- `src/pages/{chat/ChatPlaceholder, profile/ProfilePlaceholder}.vue` — P1 占位

### 修改
- `src/App.vue` — 重写为 YouthModeGate + HeaderBar 准备位 + 路由组件 + BottomNav
- `src/main.ts` — 删 Phaser，改 initRouter + createApp
- `index.html` — 标题改"英语乐园" + Fredoka 字体 CDN + 删 #phaser-container
- `src/utils/sync.ts` — 参数化 subject，支持 study-data 同步
- `apps/shared/src/utils/authSync.ts` — 修复 pre-existing 缺右括号 bug

## Scratch 视觉规范
```css
--color-primary: #4C97FF;   /* 蓝 60% */
--color-secondary: #FF8C1A; /* 橙 25% */
--color-tertiary: #0FBD8C;  /* 绿 15% */
--color-bg: #FFF8E7;        /* 米白 */
--color-text: #0F1B3D;
--shadow-card: 0 4px 0 rgba(15, 27, 61, 0.12);
--font-display: 'Fredoka', 'Baloo';
--font-cn: 'Noto Sans SC';
```

## 学习 Tab 流程（已可玩）
1. StudyHome：今日 3 统计 + 续聊大卡片 + 复习入口 + 20 主题宫格
2. StageList：6 关卡列表 + 进度条
3. FlashCard：看卡片（点击翻面）+ 拼写输入 + 即时反馈（shake 动画 + 答案显示）
4. ReadAlong：跟读 6 词（speech.ts 复用）+ 完成态
5. ReviewPage：已学词列表 + 4 过滤器 + 详情弹窗 + 播放

## 踩坑
- pre-existing authSync.ts `setCookie` 缺右括号，english build 时暴露（已修）
- main.ts 重写时第一次 Write 没生效（也许 ESM 重名），第二次 Write 成功
- words.ts 60233 行 1.4MB 直接 import → main bundle 1.1MB / gzip 200KB（可接受）

## 后续阶段
- **P1.1（1.5d）**：ProfileScreen + SettingsPanel + useLearningData
- **P1.2（5-6d）**：后端 LLM 代理（auth-service）+ 客户端 AI 对话（characters.ts + ChatHome/ChatPanel）
- **P2（2-3d）**：HeaderBar/FooterBar 集成 + code-split 优化 + 部署验证

## 关联
- [[session-2026-06-25-english-v3-architecture]] — 完整方案
- plan: `/Users/eighteenman/.claude/plans/stateful-waddling-harbor.md`