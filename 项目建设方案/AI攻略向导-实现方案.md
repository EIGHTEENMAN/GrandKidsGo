# AI 攻略向导 — 实现方案

> 方案制定时间：2026-06-05
> 目标服务：童慧行走天下（travel.grandand.com）

---

## 一、背景与目标

童慧行走天下是一个汇聚真实家庭亲子旅行经验的平台。目前用户**手动编写攻略**，门槛较高——需要想结构、排日程、写细节，很多有经验的家长想分享但不知道从何下笔。

AI 攻略向导的目标是：**让用户通过填写几个旅行参数，就能自动生成一份结构完整的亲子旅行攻略大纲，确认后再生成详细攻略**。降低创作门槛，提升攻略数量和质量。

### 核心价值

- **降低创作门槛**：填写 3 步参数，AI 自动生成草稿，用户编辑发布
- **保证攻略质量**：AI 生成的内容自带亲子视角（适合年龄、推车便利性、母婴设施等）
- **提升攻略量**：向导式的创作流程比空白编辑器更友好，鼓励更多用户参与

---

## 二、用户旅程

### 5 步向导流程

```
/guides/ai-wizard
├── 步骤 1: 目的地 ── 出发地 + 目的地
├── 步骤 2: 出行条件 ── 天数、人数、儿童年龄、季节
├── 步骤 3: 偏好设置 ── 景点类型、交通方式、预算、住宿
├── 步骤 4: 大纲确认 ── 生成行程大纲 → 用户编辑确认
└── 步骤 5: 生成攻略 ── 调用 AI 生成完整攻略 → 保存
```

### 详细说明

**步骤 1：目的地（StepDestination）**
- 出发城市（输入框，自动补全）
- 目的地城市/景区（输入框，自动补全）
- 同时显示常见热门目的地快捷选择

**步骤 2：出行条件（StepConditions）**
- 出行天数（数字输入，1-30 天）
- 出行人数（数字输入）
- 儿童年龄（多选/输入，如 "3岁"、"5岁"）
- 出行季节（春/夏/秋/冬 单选）

**步骤 3：偏好设置（StepPreferences）**
- 景点类型（多选：自然风光/主题乐园/文化历史/海滨度假/城市探索/乡村田园等）
- 交通方式（多选：自驾/高铁/飞机/公共交通）
- 预算范围（滑块或数字输入，元/天）
- 住宿要求（可选输入，如 "亲子酒店"、"民宿"）

**步骤 4：大纲确认（StepOutline）—— 关键设计点**
- 调用 AI 生成初步行程大纲（按天安排）
- 以结构化卡片展示每天行程：主题、活动列表、交通建议、住宿建议
- **用户可拖拽调整顺序、增删天、修改活动内容**
- 确认后进入下一步

**步骤 5：生成攻略（StepGenerate）**
- 调用 AI 基于确认的大纲生成完整攻略
- **流式输出**（打字机效果），用户可见生成过程
- 生成完成后可预览全文
- 点击"保存为草稿"或"直接发布"，进入攻略编辑页继续完善

---

## 三、技术架构

### 整体架构

```
travel-guide (Next.js 14, App Router)
│
├── lib/
│   ├── prisma.ts          # Prisma 客户端（已有）
│   ├── auth.ts            # 认证工具（已有）
│   └── ai.ts              # 【新增】AI 调用封装
│
├── app/api/ai-wizard/
│   ├── outline/route.ts   # 【新增】POST - 生成大纲
│   ├── generate/route.ts  # 【新增】POST - 生成完整攻略（流式）
│   └── drafts/route.ts    # 【新增】GET/POST - 草稿管理
│
├── app/guides/ai-wizard/
│   └── page.tsx           # 【新增】向导主页面
│
└── components/ai-wizard/
    ├── WizardSteps.tsx     # 【新增】步骤管理 + 进度指示
    ├── StepDestination.tsx # 【新增】
    ├── StepConditions.tsx  # 【新增】
    ├── StepPreferences.tsx # 【新增】
    ├── StepOutline.tsx     # 【新增】大纲展示 + 在线编辑
    └── StepGenerate.tsx    # 【新增】生成中 + 流式输出 + 预览
```

### AI 调用架构

```
┌─────────────┐     HTTPS POST     ┌──────────────────┐
│ travel-guide │ ─────────────────→ │  硅基流动 API     │
│ (Next.js)    │                    │ (SiliconFlow)     │
│              │ ←───────────────── │                   │
│  lib/ai.ts   │    JSON Response   │ DeepSeek-V2/Qwen │
└─────────────┘                    └──────────────────┘
```

### 数据模型（Prisma 新增）

```prisma
// apps/travel-guide/prisma/schema.prisma

model GuideDraft {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  // 向导输入参数
  departure   String
  destination String
  days        Int
  people      Int
  childAges   String   // JSON 数组字符串 "[3,5]"
  season      String
  spotTypes   String   // JSON 数组字符串
  transport   String   // JSON 数组字符串
  budget      Int
  hotelReq    String   // 住宿要求（可选）

  // 生成状态
  outline     Json?    // GuideOutline JSON
  content     String?  // 最终生成的攻略全文（富文本 HTML）
  status      String   @default("draft") // draft | outline | generating | completed

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("guide_drafts")
}
```

GuideOutline 类型定义：

```typescript
interface GuideOutline {
  sections: Array<{
    day: number
    theme: string
    activities: string[]
    transport: string
    accommodation: string
    tips: string[]
  }>
}
```

---

## 四、AI 模型配置

### 硅基流动（SiliconFlow）

| 项目 | 内容 |
|------|------|
| 接入方式 | REST API，HTTPS 标准调用 |
| 推荐模型 | DeepSeek-V2（`deepseek-ai/DeepSeek-V2`） |
| 备选模型 | Qwen2.5-14B（`Qwen/Qwen2.5-14B-Instruct`） |
| API 文档 | https://docs.siliconflow.cn |
| 计费 | ¥0.001/千tokens（DeepSeek-V2） |

### 环境变量

```env
# apps/travel-guide/.env
SILICONFLOW_API_KEY=sk-your-key-here
SILICONFLOW_ENDPOINT=https://api.siliconflow.cn/v1/chat/completions
SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V2
```

### AI 调用封装（lib/ai.ts）

```typescript
// apps/travel-guide/src/lib/ai.ts

interface TravelParams {
  departure: string
  destination: string
  days: number
  people: number
  childAges: string[]
  season: string
  spotTypes: string[]
  transport: string[]
  budget: number
  hotelReq: string
}

interface GuideOutline {
  sections: Array<{
    day: number
    theme: string
    activities: string[]
    transport: string
    accommodation: string
    tips: string[]
  }>
}

/**
 * 生成行程大纲（非流式，返回结构化 JSON）
 */
export async function generateOutline(params: TravelParams): Promise<GuideOutline> {
  const prompt = buildOutlinePrompt(params)
  const response = await callSiliconFlow(prompt, process.env.SILICONFLOW_MODEL!)
  return parseOutlineResponse(response)
}

/**
 * 生成完整攻略（流式返回，支持打字机效果）
 */
export async function* generateCompleteGuideStream(
  params: TravelParams,
  outline: GuideOutline
): AsyncGenerator<string, void, unknown> {
  const prompt = buildGuidePrompt(params, outline)
  yield* streamSiliconFlow(prompt, process.env.SILICONFLOW_MODEL!)
}
```

### Prompt 设计

**大纲生成提示词（buildOutlinePrompt）：**

```
你是一个专业的亲子旅行规划师。请根据以下信息生成一份详细的旅行大纲。

旅行信息：
- 出发地：{departure}
- 目的地：{destination}
- 出行人数：{people}人（含{childAges}岁儿童）
- 计划天数：{days}天
- 出行季节：{season}
- 景点偏好：{spotTypes}
- 交通方式：{transport}
- 预算范围：约{budget}元/天
- 住宿要求：{hotelReq}

请从亲子旅行的角度出发，考虑儿童的体力、兴趣和作息时间。
以 JSON 格式输出旅行大纲：
{
  "sections": [
    {
      "day": 1,
      "theme": "第1天主题（如：抵达与适应）",
      "activities": ["上午活动1", "下午活动1"],
      "transport": "交通建议",
      "accommodation": "住宿建议",
      "tips": ["注意事项1", "适合{childAges}岁儿童的原因"]
    }
  ]
}
注意：输出必须仅为有效的 JSON 对象，不要包含 markdown 代码块标记。
```

**完整攻略生成提示词（buildGuidePrompt）：**

```
你是一位有丰富亲子旅行经验的写作者。基于以下大纲，为{people}位出行者（含{childAges}岁儿童）生成一篇生动、详细的旅行攻略。

要求：
- 语言亲切自然，以第一人称叙述，适合家长阅读
- 每天行程包含具体时间节点（如 "9:00 出发去..."）
- 每个活动标注适合的儿童年龄
- 包含实用的亲子互动建议
- 穿插餐饮推荐（标注是否亲子友好）
- 结尾附上"亲子旅行小贴士"

旅行大纲（用户已确认）：
{outline_json}

攻略全文要求：
- 字数 800-1500 字
- 分天叙述，每天有清晰的时间线
- 包含防晒/安全/应急联系方式等实用信息
- 整体风格温暖、真实，符合童慧行走天下"孩子说好才是真的好"的品牌调性
```

---

## 五、前端组件设计

### WizardSteps.tsx — 步骤管理

```typescript
// 步骤状态
type WizardStep = 'destination' | 'conditions' | 'preferences' | 'outline' | 'generate'

// 全局状态（Context 或 Zustand）
interface WizardState {
  step: WizardStep
  params: TravelParams
  outline: GuideOutline | null
  generatedContent: string | null
  isGenerating: boolean
  draftId: string | null
}
```

- 顶部进度条显示 5 步（已完成/当前/未完成）
- 每步有 "上一步"/"下一步" 按钮
- 步骤 3→4 和 4→5 时触发 AI 调用

### StepOutline.tsx — 大纲编辑

大纲可视化编辑界面：

```
┌─────────────────────────────────┐
│  📋 行程大纲（请确认或修改）      │
├─────────────────────────────────┤
│  ┌─ 第1天: 抵达三亚 ──────────┐ │
│  │  🕐 上午: 到达机场→酒店入住  │ │
│  │  🕐 下午: 三亚湾沙滩玩耍     │ │
│  │  🚗 交通: 打车              │ │
│  │  🏨 住宿: 三亚湾亲子酒店     │ │
│  │  💡 提示: 带防晒霜、游泳圈   │ │
│  │  [编辑] [删除] [+添加活动]   │ │
│  └─────────────────────────────┘ │
│  [+ 添加一天]                    │
│                                  │
│  [← 上一步]         [确认并生成] │
└─────────────────────────────────┘
```

- 每天为一个卡片，可拖拽排序
- 每个卡片内可编辑主题、活动文本
- 支持增删天、增删活动
- 修改后大纲状态实时更新

### StepGenerate.tsx — 流式生成

- AI 生成过程中展示打字机效果（逐字显示）
- 同时显示一个简洁的进度动画
- 生成完成后显示完整预览
- 提供 "保存为草稿" 和 "直接发布" 两个操作
- "直接发布" 跳转到攻略编辑页，AI 生成内容已作为初始内容填入

---

## 六、攻略保存流程

```
生成完成
  │
  ├── 保存为草稿
  │     └── 保存到 GuideDraft 表，后续可在个人中心"我的草稿"继续编辑
  │
  └── 直接发布
        └── 跳转到 /guides/create
              - title、destination、summary、sections 等字段已自动填入
              - 用户可在 TipTap 编辑器中继续完善
              - 手动点击"发布"按钮
```

---

## 七、实施步骤

| 步骤 | 内容 | 预估工时 |
|------|------|----------|
| 1 | Prisma schema 新增 GuideDraft 模型 + 执行 migrate | 0.5h |
| 2 | 实现 `lib/ai.ts` — AI 调用封装（硅基流动 SDK 或 fetch） | 1h |
| 3 | 实现 API routes（outline + generate + drafts CRUD） | 2h |
| 4 | 实现 WizardSteps 基础框架（步骤管理 + 上下文状态） | 1h |
| 5 | 实现 Step 1-3 参数填写组件 | 1.5h |
| 6 | 实现 StepOutline 大纲可视化编辑 | 2h |
| 7 | 实现 StepGenerate 流式输出 + 打字机效果 | 1.5h |
| 8 | 集成攻略保存流程（草稿 + 直接发布跳转） | 1h |
| 9 | 部署验证（本地调试 + 服务器部署） | 0.5h |
| **合计** | | **~11h** |

---

## 八、与现有系统集成

### 导航入口
- 走天下首页增加 "AI 生成攻略" 入口按钮
- 攻略列表页增加 "AI 写攻略" 快捷入口
- 个人中心增加 "我的草稿" 列表（展示 GuideDraft 列表）

### 认证要求
- 步骤 1-3 可匿名填写
- 步骤 4（生成大纲）需要登录（若未登录，弹 AuthModal）

### 保存为正式攻略
- 调用现有 `POST /api/guides` 接口
- 自动填入 AI 生成内容到 Guide 模型
- 保留为草稿状态（`isPublish: false`），用户手动发布

---

## 九、UI/UX 规范

### 设计风格
- 延续走天下现有设计风格（TailwindCSS + shadcn/ui）
- 品牌色：#16a34a（绿色系，与走天下一致）
- 每个步骤用图标 + 标题 + 简短说明引导

### 加载状态
- 步骤 1-3：即时响应，无加载状态
- 步骤 4（生成大纲）：显示骨架屏或加载动画，预计等待 3-8 秒
- 步骤 5（生成攻略）：流式输出，打字机效果，无需额外加载指示

### 错误处理
- AI 调用超时（默认 30 秒）：显示"生成超时，请重试"，保留已填参数
- 网络错误：显示重试按钮
- 大纲解析失败：显示"AI 生成异常，请重试"，可返回上一步修改参数

---

## 十、后续扩展

### v1.1 可选增强
- **攻略美化**：AI 生成后自动匹配合适的封面图（Unsplash API）
- **多语言**：支持生成英文版攻略（面向海外亲子游）
- **攻略优化**：对用户手动编写的攻略提供 AI 润色建议

### v2.0 远景
- **AI 行程对比**：一次生成多个方案供用户对比选择
- **智能推荐目的地**：根据孩子年龄和兴趣推荐目的地
- **攻略问答**：用户对 AI 攻略提问（"那里推车方便吗？"），AI 基于攻略内容回答

---

## 附录：关键文件清单

| 文件 | 类型 | 作用 |
|------|------|------|
| `prisma/schema.prisma` | 模型 | 新增 GuideDraft 表 |
| `src/lib/ai.ts` | 工具 | AI 调用封装（硅基流动） |
| `src/app/api/ai-wizard/outline/route.ts` | API | 生成大纲 |
| `src/app/api/ai-wizard/generate/route.ts` | API | 生成攻略（流式） |
| `src/app/api/ai-wizard/drafts/route.ts` | API | 草稿 CRUD |
| `src/app/guides/ai-wizard/page.tsx` | 页面 | 向导主页面 |
| `src/components/ai-wizard/WizardSteps.tsx` | 组件 | 步骤管理 |
| `src/components/ai-wizard/StepDestination.tsx` | 组件 | 目的地输入 |
| `src/components/ai-wizard/StepConditions.tsx` | 组件 | 出行条件 |
| `src/components/ai-wizard/StepPreferences.tsx` | 组件 | 偏好设置 |
| `src/components/ai-wizard/StepOutline.tsx` | 组件 | 大纲编辑 |
| `src/components/ai-wizard/StepGenerate.tsx` | 组件 | 生成 + 预览 |
| `.env` | 配置 | SiliconFlow API 密钥 |
