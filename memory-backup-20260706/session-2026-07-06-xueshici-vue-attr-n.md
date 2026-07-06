---
name: session-2026-07-06-xueshici-vue-attr-n
description: xueshici 22 首诗换行第三次踩坑 — Vue attribute 上下文里 \\n 不等于 mustache 表达式里的 \n
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8913c251-9b42-46d9-8e75-702f667d7729
---

# Session 2026-07-06 xueshici Vue attribute \\n 第三次修复

## 背景
commit 334f30c4 改了 22 首诗 original 为反引号 + 真换行，build/deploy 成功，
但用户截图显示还是 1 行 → 我以为修好了实际没修。

## 真正根因（Vue attribute vs mustache 表达式的转义差）

**Vue 模板有 2 种 JS 表达式上下文**：

1. **Mustache `{{ }}`（普通 JS 表达式上下文）**：
   ```vue
   {{ section.original.split('\n')[0] }}
   ```
   这里的 `\n` 是 JS 字符串字面 → JS 引擎解析为真换行（1字符）

2. **HTML attribute（如 `v-for="..."` 或 `:prop="..."`）**：
   ```vue
   <p v-for="(line, i) in currentSection.original.split('\\n').map(...)">
   ```
   这里 HTML attribute 内的 `\\n` 经过 **HTML escape → JS parse**：
   - `\\` → 转义反斜杠 → `\`
   - `n` → 字面字符
   - 最终 JS 字符串是字面 `\n`（2字符：反斜杠 + n）

**所以同一个文件里**：
- 628 行 `split('\n')` → 真换行 → 切真换行数据 ✅
- 725 行 `split('\\n')` → 字面 `\n` → 切真换行数据 ❌

## 教训（写进肌肉记忆）

**Vue 模板里字符串字面量规则**：
- 想要真换行（1字符）：mustache 用 `\n`，attribute 也用 `\n`（**不是 `\\n`**）
- 想要字面 `\n`（2字符）：mustache 用 `\\n`，attribute 用 `\\n`

**判断方法**：
- 看 dist 编译产物里 `split(...)` 里的参数是字面字符还是真换行
- `grep -oE "split\\([^)]+\\)" dist/...js` 直接看编译后的代码

## 验证清单（再补充）
1. **看 dist 实际字节**：`grep -oE "split\\([^)]+\\)" dist/...js` 看 split 后的参数
2. **下拉线上 js**：`node https.get(...)` 拉线上版本检查实际参数
3. **跨上下文对比**：同一文件里的 mustache `\n` 和 attribute `\n` 不等价

## 这次 commit
- `6a8a7688` fix(xueshici): App.vue:725 split('\\\\n') 改 split('\\n')
- 1 行改动（725 行的 split 字符串）

## 部署
- `bash scripts/deploy.sh xueshici text`
- 备份: `/grandkidsgo/.backup/xueshici/20260706-104803`

## 串入 7-6 完整日志
1. [Session 2026-07-06 反引号+真换行](session-2026-07-06-xueshici-backtick-n.md) — 334f30c4
2. **本段** — 6a8a7688（修正 Vue attribute 转义）

## 反思
三次踩坑（双引号+\\n/esbuild 双引号拒真换行/Vue attribute 转义）= 修一个"换行"
花了 2 小时 3 个 commit。**根因是 TS 字符串换行 + Vue 模板转义叠加 bug**，
下次遇到类似问题先在 dist 里 grep `split(` 验证编译后参数，而不是相信 git diff。