---
name: session-2026-07-06-xueshici-chunk-lazy-load
description: xueshici 1.5MB 单包按 id 拆 21 chunk + import.meta.glob 让 vite 静态分析 + tiaozhan 切到 poems-full.ts
metadata:
  node_type: memory
  type: project
  originSessionId: 8913c251-9b42-46d9-8e75-702f667d7729
---

# Session 2026-07-06 xueshici 诗词分块 lazy load

## 背景
用户反馈："点诗词详情页要等很久"。测量：首次点详情 9.3s 下载 1.4MB gzip poems-o4jNv--4.js。

## 解决方案
- poems.ts 1.5MB / 2026 首诗按 id 100/块拆为 21 个 chunk 文件
- 新增 lib/poem-loader.ts 用 import.meta.glob 让 vite 静态分析，build 时每个 chunk 生成独立 js
- App.vue 5 处 ensureFullData + find() → loadPoem(id) / loadAllPoems()
- tiaozhan 脚本从 poems.ts 切到 poems-full.ts

## 关键实现

### build-poem-chunks.cjs（拆数据脚本）
- 复用 scripts/extract-meta.cjs 的字符串解析骨架
- parsePoems(src) → 字符串层 brace 匹配，跳过 template/single/double 字符串
- extractSectionsArr(objStr) → 必须含外层 [ ]
- 写 chunk-N.ts 格式：`import type { Poem } from '../poems'; export const chunkN: Poem[] = [...]`

### poem-loader.ts（关键 API）
```ts
// import.meta.glob 让 vite 在 build 时把每个 chunk 生成独立 js 文件
const chunkModules = import.meta.glob<{ [k: string]: Poem[] }>(
  '../data/poem-chunks/chunk-*.ts',
  { eager: false }   // 关键：false = 按需 import，否则会全打 bundle
)
```

**踩坑**：用模板字符串 `import(\`chunk-${idx}.ts\`)` + `/* @vite-ignore */` 不工作：
- `/* @vite-ignore */` 让 vite 跳过静态分析 → build 时整个 chunks 内联进 index
- 必须用 `import.meta.glob('chunk-*.ts', { eager: false })` 才能生成独立 chunk 文件

### App.vue 改造
- 删 fullData / loadingData / fullDataPromise / ensureFullData 状态机
- sameAuthorPoems 改 ref+watch+loadPoemsByAuthor
- 5 处 await ensureFullData() + find() → loadPoem(Number(id)) / loadAllPoems()
- onMounted 预加载改 loadAllPoems().catch(noop)

## 收益
| 指标 | 改前 | 改后 |
|---|---|---|
| 首屏 JS（gzip） | ~900KB | ~324KB (-64%) |
| 首次点详情 | 9.3s 拉 1.4MB | <1s 拉 70KB |
| dist 文件 | poems-*.js 3.8MB 单文件 | 21 个 chunk-*.js 各 50-100KB |

## 部署踩坑
- 第一次 deploy.sh rsync 报 EOF 警告 → 22 个 chunk 把流撑断了
- index-CWbmpfaY.js 没上传，但 deploy.sh exit 0（脚本没检查文件完整性）
- 手动 scp 补传 index js 即可
- 教训：**deploy.sh 应该校验 index html 引用的所有 js 都在服务器**

## 22 首诗换行修复未坏
- chunk-0 验证：关雎 5 章真换行（commit 334f30c4/6a8a7688 保留）

## Commits
- `commit` (Phase 1 拆分脚本 + chunk 文件 + loader API)
- `0c05ba0d` perf(xueshici): 切到 chunk lazy load + poems.ts 瘦身 4MB → 37 行

## 关键文件
- 改：apps/xueshici/src/App.vue (5 处改造)
- 改：apps/xueshici/src/data/poems.ts (37 行骨架)
- 改：apps/xueshici/src/lib/poem-loader.ts (新 lazy API)
- 改：apps/tiaozhan/scripts/generate-questions.ts (import 路径)
- 新：apps/xueshici/scripts/build-poem-chunks.cjs (拆分脚本)
- 新：apps/xueshici/src/data/poem-chunks/ (21 个 chunk)
- 新：apps/xueshici/src/data/poems-full.ts (git mv 自 poems.ts，3.9MB)

## 部署
- `bash scripts/deploy.sh xueshici text` + 手动 scp index js
- 备份：/grandkidsgo/.backup/xueshici/<timestamp>/