# 诗配画引擎 — AI 诗词配图批量生成

## 快速开始

```bash
# 1. 安装依赖
cd 童慧行/scripts/generate-poem-images
npm install

# 2. 导出诗词数据（首次运行）
npx tsx export-data.mjs

# 3. 测试 mock 模式（不消耗 API 额度）
MOCK=true node generate.mjs

# 4. 查看状态
node generate.mjs --status

# 5. 正式生成（需要先设置 API Key）
# 方式 A: DALL-E 3
export OPENAI_API_KEY=sk-xxx
AI_PROVIDER=dall-e node generate.mjs

# 方式 B: 通义万相（阿里云，更便宜）
export ALIBABA_ACCESS_KEY_ID=xxx
export ALIBABA_ACCESS_KEY_SECRET=xxx
AI_PROVIDER=tongyi node generate.mjs
```

## 工作流程

```
poems.ts (TS源数据)
    ↓ npx tsx export-data.mjs
poems-data.json (JSON导出, ~487KB)
    ↓ node generate.mjs (调用 AI API)
public/images/poems/{id}.webp (配图)
    ↓ vite build (自动复制 public/ 到 dist/)
dist/images/poems/{id}.webp (生产环境)
    ↓ 前端组件 PoemIllustration.vue
阅读器显示配图
```

## 文件结构

```
scripts/generate-poem-images/
├── config.mjs          # 配置（API Key、风格参数）
├── promptBuilder.mjs   # 提示词生成（诗句→英文场景描述）
├── tracker.mjs         # 生成状态追踪（断点续传）
├── generate.mjs        # 主生成脚本
├── export-data.mjs     # 诗词数据导出（TS → JSON）
└── README.md

apps/xueshici/public/images/poems/
├── poems-data.json     # 导出的诗词数据
├── .gitkeep
├── 1.webp              # 图片文件（id 命名）
├── 2.webp
└── ...
```

## 提示词策略

每个配图的 prompt 由以下部分拼接：
1. **默认风格**（水墨画风格描述，统一前缀）
2. **朝代风格**（唐→壮丽山水，宋→淡雅水墨，等）
3. **画面描述**（从原文提取最有画面感的 2-4 句，翻译成英文场景）
4. **关键词**（标签 + 季节线索）

## API 成本估算

| API | 单价 | 934 首成本 | 说明 |
|-----|------|-----------|------|
| DALL-E 3 (standard) | $0.04/张 | ~$37 | 质量最好，提示词需英文 |
| 通义万相 2.1 | ¥0.5/张 | ~¥467 | 中文支持好，需要阿里云 |
| Mock | 免费 | ¥0 | SVG 占位图，用于开发调试 |

## 维护

- **新增诗词**：重新运行 `npx tsx export-data.mjs` 更新 JSON
- **重新生成某首**：在 `generation-status.json` 中将该首 status 改为 "pending"
- **全部重来**：`node generate.mjs --clean` 后重新生成
- **重试失败**：`node generate.mjs --retry`
