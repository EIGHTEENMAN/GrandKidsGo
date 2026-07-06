---
name: session-2026-06-25-english-v3-architecture
description: 学英语 apps/english 新版架构 v3 — 3 Tab 平等（学习 / AI对话 / 我的），6-20 单词学习方案 + 新增 AI 自由聊天子首页
metadata: 
  node_type: memory
  type: project
  status: designed
  originSessionId: 92473e97-3bf7-4244-9692-bfc1379575a6
---

# 学英语新版架构 v3（2026-06-25）

## 用户决策（区别于 6-20 v2）
- **3 Tab 平等**：学习 / AI 对话 / 我的（个人中心独立 Tab，不藏子入口里）
- **AI 对话形态**：自由聊天 + 选 AI 角色（动画人物/老师/动物朋友）
- **代码组织**：AI 对话合并在 apps/english，独立 route

## 总架构（Mermaid）

```
┌──────────────────────────────────────────────────────────────┐
│                        App.vue (Router)                        │
│   - YouthModeGate                                               │
│   - 顶部 HeaderBar（来自 @shared）                              │
│   - 底部 TabBar（3 tab）                                        │
└──────────┬───────────────────────────────────┬──────────────┘
           │                                   │
   ┌───────┴─────────┐                  ┌──────┴──────┐
   ▼                 ▼                  ▼             ▼
┌──────────┐  ┌──────────┐         ┌──────────┐  ┌──────────┐
│ 学习 Tab │  │ 对话 Tab │         │ 我的 Tab │  │ (其他)    │
│ Study    │  │ Chat     │         │ Profile  │  │          │
└─────┬────┘  └─────┬────┘         └─────┬────┘  └──────────┘
      │             │                   │
      ▼             ▼                   ▼
 StudyHome       ChatHome           ProfileScreen
  (今日学习)     (AI 角色选择)       (统计 + 设置入口)
      │             │                   │
      ▼             ▼                   ▼
 DailyStudy    ChatRoom             SettingsPanel
  (4 步流程)    (对话流)              (每日新词/语音等)
```

## 路由结构

```
/                       → StudyHome      (学习 Tab 默认页)
/study/today            → DailyStudy
/study/theme            → ThemeBrowse
/study/theme/:id        → ThemeDetail
/study/review           → ReviewMode     (保留旧 ReviewPage)

/chat                   → ChatHome       (对话 Tab 默认页 — 角色选择)
/chat/:characterId      → ChatRoom       (与选定角色对话)

/profile                → ProfileScreen  (我的 Tab — 累计统计 + 设置入口)
/profile/settings       → SettingsPanel
```

## 3 个 Tab 主导航

| Tab | 图标 | 路由 | 子首页 | 说明 |
|-----|------|------|--------|------|
| 1. 学习 | 🏠 | / | StudyHome | 今日学习 + 4 步流程 + 主题浏览 + 复习 |
| 2. 对话 | 💬 | /chat | ChatHome | AI 角色选择（动画/老师/动物朋友） |
| 3. 我的 | 👤 | /profile | ProfileScreen | 累计统计 + 设置入口 |

## 单词学习子首页（保留 6-20 v2 设计）

### StudyHome（学习 Tab 主页）
- 顶部：今日进度卡片（X/15 词 + streak）
- 中部：开始今日学习按钮（大）
- 底部：主题快速入口网格 + 复习入口

### DailyStudy 4 步流程（不变）
1. **Flashcard** 看卡片（3 秒）
2. **ReadAlong** 跟读（录音评分）
3. **Choice** 4 选 1（选中文）
4. **Dictation** 听写（拼单词）

### ThemeBrowse + ThemeDetail（不变）
- 20 主题网格 + 主题内单词列表

### ReviewMode（保留旧 ReviewPage.vue 170 行）

## AI 对话子首页（新设计）

### ChatHome（对话 Tab 主页 — 角色选择）

**核心机制（2026-06-25 决策）**：
1. **每个孩子可以给每个 AI 朋友取专属名字**（建立情感连接）
2. 默认进入"最近学习单词"的引导对话（不是空白起点）

#### 命名机制（关键设计）

**数据模型**：每个 `userId + characterId` 组合可有独立名字

```typescript
// characterStore
{
  userId: 'tom-uuid',
  characterId: 'foxie',
  customName: '狐狐',           // 用户取的名字
  originalName: '小狐',         // 角色默认名
  namedAt: '2026-06-25',        // 命名时间
  conversationCount: 7          // 已聊天次数
}
```

**首次命名流程**（孩子第一次选某角色时）：

```
┌─────────────────────────────────────────┐
│ 🦊 选好了！让 ta 成为你的 AI 朋友吧！       │
│                                          │
│  ┌────────────────────────────────┐     │
│  │  🦊                             │     │
│  │  这只小狐狸叫 "Foxie"            │     │
│  │  你想给它起个什么名字呢？          │     │
│  │                                 │     │
│  │  ┌─────────────────────────┐   │     │
│  │  │  狐狐                   │   │     │
│  │  └─────────────────────────┘   │     │
│  │  (2-10 个字)                    │     │
│  │                                 │     │
│  │  性格：活泼好奇、爱用 emoji        │     │
│  │  口头禅：嗷呜~ 咦~ 嘿嘿           │     │
│  │                                 │     │
│  │      [用默认名 "小狐"]            │     │
│  │      [叫 ta "狐狐" →]            │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**后续使用**（已命名过）：

- 角色卡显示 `🦊 狐狐`（用户取的名字）而不是 `🦊 小狐`
- 角色网格下方加 "管理我的 AI 朋友" 入口（查看/重命名）

#### 进入 ChatHome 时的逻辑

```
1. 读取 studyStore.lastSession：
   - lastWord: 最近学的单词（如 "alligator"）
   - lastTheme: 最近学的主题（如 "动物"）
   - todayWords: 今天学过的所有单词列表

2. 读取 characterStore：
   - 最近用的角色 characterId
   - 该角色的 customName

3. 判断是否有最近学习：
   - 有 → 显示 "继续和 [customName] 聊聊 [lastWord]" 主入口
   - 无 → 显示 "选一个 AI 朋友" 主入口

4. 角色网格始终在下方显示（次级入口），用户可切换角色
   - 已命名 → 显示 customName
   - 未命名 → 显示 originalName + "未取名" 角标
```

**ChatHome 布局（默认状态：今天学过了）**：

```
┌─────────────────────────────────────────┐
│ ChatHome.vue                             │
│ ─────────────────────────────────────── │
│  [顶部标题：和 AI 朋友聊天]                │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │ 🚀 继续上次的话题                  │    │
│  │                                  │    │
│  │ 🦊 狐狐想和你聊聊                  │    │
│  │ "alligator"（短吻鳄）🐊            │    │
│  │                                  │    │
│  │ 你还记得 short 是什么意思吗？       │    │
│  │ 我们一起来聊聊吧！                 │    │
│  │                                  │    │
│  │       [继续聊天 →]                │    │
│  └─────────────────────────────────┘    │
│                                          │
│  ─── 我的 AI 朋友 ───                    │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 🦊   │ │ 👩‍🏫 │ │ 🐼   │ │ 🦁   │   │
│  │ 狐狐  │ │ 王老师│ │ 团团  │ │ Leo  │   │
│  │ (★常用)│ │       │ │       │ │      │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                          │
│  [+ 添加新朋友]                            │
│                                          │
│  今天学过的词：alligator, giraffe, hippo │
└─────────────────────────────────────────┘
```

**ChatHome 布局（首次/无最近学习）**：

```
┌─────────────────────────────────────────┐
│ ChatHome.vue                             │
│ ─────────────────────────────────────── │
│  [顶部标题：选一个 AI 朋友开始聊天]        │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 🦊   │ │ 👩‍🏫 │ │ 🐼   │ │ 🦁   │   │
│  │ 小狐  │ │ Miss │ │ 团团  │ │ Leo  │   │
│  │ (未取名)│ │ Wang │ │ (未取名)│ │      │   │
│  │  ★推荐│ │      │ │      │ │      │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                          │
│  💡 提示：先学几个单词，AI 朋友能跟你     │
│     聊得更有趣哦！[去学习 →]              │
└─────────────────────────────────────────┘
```

**ChatRoom 默认开场白（基于最近单词）**：

孩子点"继续聊天"后，ChatRoom 自动加载：
- 角色 system prompt + 用户取的 customName + **最近单词上下文**
- 第一句 AI 回复用预生成的"开场白模板"

**狐狐开场白模板（含最近单词 alligator）**：

```
嗷呜~ 我是狐狐 🦊
我们昨天聊到 alligator（短吻鳄）🐊
你还记得 alligator 住在哪里吗？
提示：它喜欢 swamp（沼泽）里泡澡～
```

**System prompt 注入（自定义名字 + 上下文）**：

```
你是活泼的小狐狸，用户给你起名叫 "狐狐"。
你称呼自己为 "狐狐"，而不是 "Foxie" 或 "小狐"。

【最近的对话上下文】
- 用户上次学到的单词: alligator, giraffe, hippo
- 用户最近学的主题: 动物 Animals
- 距离上次学习: 2 小时
【开场规则】第一句话必须自报名字 + 提到最近单词
```

**前端实现要点**：

1. **characterStore 暴露 `getName(characterId)`**：
```typescript
getName(characterId: string): string {
  const record = this.names.find(n => n.characterId === characterId)
  return record?.customName || this.characters[characterId].originalName
}
```

2. **chatStore 保存对话时同时记录 characterId**，下次进入自动取上次角色
3. **后端 system prompt 注入**：调用 `/api/chat/start` 时携带 `customName` + `studyContext` → 后端拼到 prompt
4. **管理入口**：`/chat/manage` 查看所有 AI 朋友，支持重命名/删除

**ChatHome 路由**：`/chat` → 默认进入 ChatHome（带上下文）
**ChatRoom 路由**：`/chat/:characterId` → context 自动注入（无需 query）

## 视觉设计 — Scratch 风格（2026-06-25 决策，6-25 末修订）

**参考**：Scratch、Khan Academy Kids、Duolingo Kids、ABCmouse

### 设计铁律（2026-06-25 末修订）
1. **无表情符号**（emoji）：所有内容、按钮、角色名都不要 emoji，纯文字 + 配色 + 图形
2. **配色 ≤ 3 种**：1 主色 + 2 辅色（不允许紫罗兰、桃粉等多色并存）

### 配色方案（严格 1+2 = 3 色）

**主色**：Scratch 蓝 `#4C97FF`（占 60%，所有按钮/Tab/链接）
**辅色 1**：阳光橙 `#FF8C1A`（占 25%，进度条/强调/新词）
**辅色 2**：草绿 `#0FBD8C`（占 15%，成功/答对/streak）

**中性色（不算 3 色内）**：
- 背景：米白 `#FFF8E7`
- 文字主色：深夜蓝 `#0F1B3D`
- 文字次色：浅灰 `#5A6478`
- 边框/分割线：`#E8E2D0`
- 卡片底色：纯白 `#FFFFFF`

**禁用色**（不要在 UI 出现）：
- 桃粉 #FF6680、紫罗兰 #9966FF、柠檬黄 #FFD500（除特殊点缀）
- 任何额外主题色

**3 色使用规范**：
- 主色（蓝）= 行动（按钮、Tab 选中、链接）
- 辅色 1（橙）= 信息（进度、新词、当前状态）
- 辅色 2（绿）= 成就（答对、完成、streak）
- 答错：仅文字"再试一次"提示，不出现红色（保持视觉克制）

### 形状与圆角（Scratch 招牌）
- 卡片/按钮 `border-radius: 16-24px`（Scratch 角色块感）
- 大按钮 ≥ 80×80px（手指友好）
- 卡片 `box-shadow: 0 4px 0 rgba(15, 27, 61, 0.12)`（凸起感，深夜蓝阴影而非黑色）

### 字体系统

| 场景 | 字号 | 字重 | 字体 |
|------|------|------|------|
| 单词主显示 | 96-128px | Bold | Fredoka / Baloo |
| 单词释义 | 32-40px | Medium | Fredoka |
| 按钮文字 | 24-28px | Bold | Fredoka |
| 大标题 | 48-64px | Bold | Fredoka |
| 例句/正文 | 20-24px | Regular | Noto Sans SC |
| 注释/小字 | 16-18px | Regular | Noto Sans SC |

### 装饰元素（无 emoji 版）
- 答对撒花动画（CSS confetti，无 emoji）
- 答对文字反馈：**"Bravo!"** 或 **"太棒了"**（纯文字）
- 学习进度：积木拼接图标（CSS 几何块，无 emoji）
- 角色头像：圆形 + 4px 蓝色描边（统一主色描边，不区分角色色）
- 角落装饰：纯几何图形（圆点、三角、波浪线）

### 交互反馈（Scratch 风格）
- 按钮按下 `transform: translateY(4px)` + 阴影缩小（被按下的感觉）
- 卡片悬停 `translateY(-4px)` + 阴影变大
- 答错：单词闪一下边框橙→恢复，文字提示"再试一次~"（不扣分）
- 加载中：旋转圆环（无 Scratch 猫）

### 各页面视觉规范

**StudyHome（学习 Tab）**：
- 顶部：超大圆形进度环 240px + 数字 "5 / 15"（环用蓝色）
- 开始按钮：大色块 320×120px，蓝色，按下下沉
- 主题卡片：圆角矩形 160×120px，白底 + 蓝色 4px 边框（不区分主题色）

**DailyStudy**：
- 进度条：顶部 8px 高，**橙色**填充
- 单词主显示：居中 128px，深夜蓝文字（不加柠檬黄底，保持克制）
- 选项按钮：4 个 2×2 网格，每 280×120px，白底 + 蓝色 2px 边框
- 麦克风：圆形 96×96px，**绿色**背景

**ChatHome（对话 Tab）**：
- 角色卡片：200×240px，白底 + 蓝色 4px 边框
- 头像圆形 120px，蓝色 4px 描边（统一）
- 续聊大卡片：白底 + 蓝色边框 + 凸起阴影，按下下沉
- 角色名旁的小红点"未命名"标识 → 改为橙色小圆点

**ChatRoom**：
- AI 气泡：白底 + 蓝色 2px 边框 + 圆角 24px
- 用户气泡：蓝色背景 + 白字 + 圆角 24px
- 英文单词：蓝色下划线（不用黄底），点击查释义
- 输入框：底部固定，圆形 80px 麦克风（**绿色**）

**ProfileScreen**：
- 用户头像圆形 160px，蓝色 4px 描边
- 统计卡片：3 张大色块（蓝/橙/绿 各 1 张），每张数字 + 文字标签
- 设置入口：横向卡片，左侧蓝色图标圆形 + 文字右对齐箭头

### 字体引入

```typescript
// main.ts
import '@fontsource/fredoka/400.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import '@fontsource/noto-sans-sc/400.css'
import '@fontsource/noto-sans-sc/500.css'

// 全局 CSS 变量
:root {
  --color-primary: #4C97FF;       /* 主色 蓝 */
  --color-secondary: #FF8C1A;     /* 辅色1 橙 */
  --color-tertiary: #0FBD8C;      /* 辅色2 绿 */
  --color-bg: #FFF8E7;            /* 背景 米白 */
  --color-card: #FFFFFF;          /* 卡片 白 */
  --color-text: #0F1B3D;          /* 文字主 深夜蓝 */
  --color-text-sub: #5A6478;      /* 文字次 浅灰 */
  --color-border: #E8E2D0;        /* 边框 米灰 */
  --shadow-card: 0 4px 0 rgba(15, 27, 61, 0.12);
  --font-display: 'Fredoka', 'Baloo', 'PingFang SC', sans-serif;
  --font-cn: 'Noto Sans SC', 'PingFang SC', sans-serif;
}
```

## 清理清单（删 Phaser + 游戏）

**预设角色（4-6 个）**：
| 角色 | 风格 | 系统 prompt |
|------|------|-------------|
| 🦊 小狐 | 活泼好奇的小狐狸 | "你是活泼的小狐狸，喜欢用 emoji 和拟声词..." |
| 👩‍🏫 Miss Wang | 英语启蒙老师 | "你是和蔼的英语老师，每次回复给 1 个新单词 + 例句..." |
| 🐼 团团 | 慢条斯理的熊猫 | "你是温和的熊猫团团，说话慢条斯理，喜欢讲笑话..." |
| 🦁 Leo | 严肃的图书馆长 | "你是 Leo 老师，知识渊博，回答严谨但易懂..." |
| 🐰 Bunny | 多愁善感的兔子 | "你是 Bunny，喜欢聊天气、节日和食物..." |
| 🐸 Frog | 幽默的青蛙 | "你是 Frog，爱开玩笑，每句话结尾带 'ribbit'..." |

### ChatRoom（与选定角色对话）

```
┌─────────────────────────────────────────┐
│ ChatRoom.vue                             │
│ ─────────────────────────────────────── │
│ ← 返回   🦊 小狐   ⚙ 角色设置            │
│ ─────────────────────────────────────── │
│                                          │
│  [小狐头像]                              │
│  Hi! I'm Foxie! What's your name? 🦊    │
│                                          │
│              [用户气泡]                  │
│              I'm Tom!                   │
│                                          │
│  [小狐头像]                              │
│  Nice to meet you, Tom! 🎉              │
│  Do you like animals?                   │
│                                          │
│ ─────────────────────────────────────── │
│  [📷] [🎤] [💡 提示] [输入框...   ] [➤] │
└─────────────────────────────────────────┘
```

**交互特性**：
- 流式响应（打字机效果）
- 语音输入（复用现有录音组件）
- 单词高亮（AI 回复中的英文单词可点击查释义）
- 历史会话（chatStore 保存）
- 单词本：对话中遇到的新英文单词自动加入生词本（关联 studyStore）

### 语言策略：AI 母语级中文 + 偷偷夹英文（2026-06-25 决策）

**核心原则**：AI 是母语级中文，但每条回复中**自然嵌入 1-2 个英文单词**（不用解释，直接用），孩子从语境中学。

**示例对话**：

| 孩子输入 | AI 回复 |
|---------|---------|
| 你叫什么名字？ | 我叫 Foxie！是一只小狐狸 🦊 你也可以叫我小狐。你呢？你的 name 是什么？ |
| 我喜欢吃苹果 | 苹果超好吃！apple 又脆又甜 🍎 你还喜欢吃什么 fruit？ |
| 今天好热 | 是呀，今天好 hot！我想吃 ice cream 降降温。 |
| 我会游泳！ | 太棒了！swimming 超好玩 🏊 你能游多远？ |
| 我不想学习 | 学习有时候是 boring 呀，但你学会一个新单词会很 proud！今天想学哪个 word？ |

**关键机制**：
1. **夹词密度**：每条回复 1-3 个英文单词（太多孩子烦，太少没效果）
2. **不翻译**：英文单词直接用，让孩子从上下文猜含义 → 主动点单词查 → 加单词本
3. **上下文相关**：夹的英文单词必须是话题相关的（孩子说苹果就夹 apple，不夹 elephant）
4. **孩子纯英文时**：AI 也用英文 + 1 个中文鼓励语（不让孩子有压力）
5. **孩子完全没反应**：AI 给开放式引导（"今天想聊什么？"）不施压

**6 个角色的 system prompt 模板**：

```
你是 [角色名]，[性格描述]，[说话风格]。

【核心规则 — 必须遵守】
1. 默认用中文回复，每条回复自然嵌入 1-3 个英文单词（不要用括号翻译，直接用）
2. 嵌入的英文单词必须与当前话题相关，孩子能从上下文理解
3. 永远不要问"你想不想学英语？"——你不是英语老师，是 [角色身份]
4. 孩子说纯英文时你也用英文 + 偶尔 1 个中文鼓励词
5. 回复不超过 80 字，儿童友好，简单句
6. 适合 6-12 岁，绝对不要出现暴力/恐怖/成人内容
```

**例：小狐 🦊 的 system prompt**
```
你是活泼的小狐狸 Foxie，喜欢用 emoji 和拟声词。

【核心规则】
1. 默认用中文回复，每条回复自然嵌入 1-3 个英文单词（不翻译，直接用）
2. 嵌入英文要贴话题：聊苹果就 apple，聊天气就 hot/cold/rain
3. 永远不要问"想不想学英语"，你是 Foxie 不是老师
4. 孩子说英文时你也英文 + 偶尔中文 "加油!"
5. 不超过 80 字，简单句
6. 6-12 岁友好，无暴力无恐怖

【你的特点】
- 喜欢森林、星星、唱歌
- 说话带"嗷呜~" "咦~" "嘿嘿"
- 好奇心重，爱问"为什么"
- 朋友多（团团、Leo、Bunny 都是）
```

**前端配套设计**：
- **英文单词气泡高亮**：用正则 `/\b[a-zA-Z]{3,}\b/g` 提取英文单词，加下划线 + 悬浮气泡显示中文释义
- **生词本入口**：每个高亮单词旁 "+" 按钮，点击加入 studyStore.newWords
- **难度自适应**：studyStore.level 决定夹词密度（初学=1个/句，进阶=3个/句）

## 清理清单（删 Phaser + 游戏）

## 清理清单（删 Phaser + 游戏）

### 删除文件（~15 个）
- `src/game/entities/`、`src/game/events/`、`src/game/scenes/`、`src/game/skills/`、`src/game/ui/`、`src/game/world/`、`src/game/index.ts`
- `src/stores/gameStore.ts`、`src/stores/battleStore.ts`、`src/stores/pokedexStore.ts`、`src/stores/playerStore.ts`
- `src/data/stages.ts`、`src/data/stages.ts.bak`、`src/data/words.ts.backup`
- `src/components/StageMap.vue`、`src/components/StageHUD.vue`、`src/components/WorldSelect.vue`、`src/components/StartScreen.vue`、`src/components/GameHud.vue`、`src/components/SkillBar.vue`、`src/components/AchievementCard.vue`、`src/components/HowToPlay.vue`、`src/components/Pokedex.vue`、`src/components/WordSummary.vue`

### 保留文件
- `src/data/words.ts`（5018 词）
- `src/stores/wordStore.ts`（核心）
- `src/components/WordPreview.vue`（拆分复用为 Flashcard）
- `src/components/ReviewPage.vue`（保留为复习入口）
- `src/components/PersonalCenter.vue`（拆分为 ProfileScreen + SettingsPanel）
- `src/components/LoginModal.vue`（保留）
- `public/audio/`（2201 音频）

### 依赖清理
- `package.json` 删除 `phaser` 依赖

## 工作量拆分

| 模块 | 天数 | 备注 |
|------|------|------|
| **单词学习板块** | | |
| 路由 + TabBar 改造 | 0.5d | vue-router 3 tab |
| 清理 Phaser + 游戏代码 | 0.5d | 删除 game/ 目录 + 8 个组件 |
| StudyHome + DailyStart | 0.5d | |
| DailyStudy 流程 + 进度 | 1d | |
| Flashcard（拆 WordPreview） | 0.5d | |
| Choice + Dictation 子步骤 | 1d | |
| ReadAlong 子步骤 | 1d | |
| StudyComplete + 动画 | 0.5d | |
| ThemeBrowse + ThemeDetail | 1d | |
| ReviewMode（保留 ReviewPage） | 0.5d | |
| SRS 算法 + studyStore | 1d | |
| **AI 对话板块** | | |
| 后端 LLM 代理（auth-service 复用） | 1d | 加 chat route + 流式响应 + 上下文注入 |
| chatStore + characterStore（含命名） | 1d | 角色列表 + 自定义名字持久化 |
| ChatHome 首次命名 + 默认引导 | 1.5d | 命名弹窗 + 续聊大卡片 + 角色网格 |
| ChatRoom 对话流 + 打字机效果 | 1d | customName 注入 system prompt |
| 语音输入复用 | 0.5d | 复用 ReadAlong 录音逻辑 |
| 单词高亮 + 单词本联动 | 0.5d | |
| **集成 + 部署** | | |
| 集成测试 + bug 修复 | 1d | |
| vite build + rsync 部署 | 0.5d | |
| **合计** | **12-13d** | 单人开发 |

## 关键文件

```
src/
├── App.vue                          # 重写为 router + TabBar
├── main.ts
├── router.ts                        # 新建
├── components/
│   ├── TabBar.vue                   # 新建
│   ├── HeaderBar.vue                # 复用 @shared
│   ├── study/                       # 新建目录
│   │   ├── StudyHome.vue
│   │   ├── DailyStudy.vue
│   │   ├── Flashcard.vue
│   │   ├── Choice.vue
│   │   ├── Dictation.vue
│   │   ├── ReadAlong.vue
│   │   ├── StudyComplete.vue
│   │   ├── ThemeBrowse.vue
│   │   ├── ThemeDetail.vue
│   │   └── ReviewMode.vue
│   ├── chat/                        # 新建目录
│   │   ├── ChatHome.vue
│   │   ├── ChatRoom.vue
│   │   ├── MessageBubble.vue
│   │   └── CharacterCard.vue
│   ├── profile/                     # 新建目录
│   │   ├── ProfileScreen.vue
│   │   └── SettingsPanel.vue
│   ├── LoginModal.vue               # 保留
│   ├── WordPreview.vue              # 拆分为 Flashcard 子组件
│   └── ReviewPage.vue               # 改名为 ReviewMode 移入 study/
├── stores/
│   ├── wordStore.ts                 # 保留
│   ├── studyStore.ts                # 新建
│   ├── chatStore.ts                 # 新建
│   ├── settingsStore.ts             # 新建
│   └── characterStore.ts            # 新建（角色 + 用户自定义名字）
├── data/
│   ├── words.ts                     # 保留
│   └── characters.ts                # 新建（AI 角色定义）
└── utils/
    ├── audio.ts                     # 保留
    ├── storage.ts                   # 保留
    ├── srs.ts                       # 新建（间隔重复算法）
    └── llm.ts                       # 新建（调用 LLM 代理）
```

## 关联
- [[session-2026-06-20-english-architecture]] — 单词学习原方案
- [[english-app-refactor-plan]] — 初版方案