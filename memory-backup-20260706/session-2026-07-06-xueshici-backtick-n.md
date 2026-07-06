---
name: session-2026-07-06-xueshici-backtick-n
description: xueshici 22 首诗 original 字段 \\n bug 二次修复 — 双引号字符串 + 字面 \\n 编译后不切段，必须改反引号 + 真换行
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8913c251-9b42-46d9-8e75-702f667d7729
---

# Session 2026-07-06 xueshici \\n 二次修复

## 背景
commit e9c2c874（7-4）改 22 首诗 original：双引号字符串 + 字面 `\\n`（双反斜杠n）
但前端 `original.split('\n')` 切的是真换行（`\n`）→ 找不到字面 `\n` → 整首诗 1 行
用户反馈"标点对了但没换行"

## 真正根因（踩坑 2 次才明白）

**TypeScript 双引号字符串**：
- `"...\\n..."` → 编译后 JS 是 `"...\n..."`（**字面反斜杠n，2 字符**）
- `"...\n..."` → 编译报错（双引号不允许字面 newline）

**正确解法**：用反引号（模板字符串） + 真换行
- `` `...<换行>...` `` → 编译后 JS 是真换行，split('\n') 能切
- 22 个 original 字段 `"..."` 改成 `` `...` ``，把 `\\n` 替换成真换行

## 三次踩坑时间线
1. **7-4 commit e9c2c874**：写双引号 + `\\n`，**通过 git diff 看着是对的**（commit message 也写了），
   但前端 split 不工作
2. **7-6 第一次修**：把 64 处 `\\n` 改成真换行，但忘了改双引号 → **esbuild 编译失败**
   "双引号不允许字面 newline"
3. **7-6 第二次修**：先把双引号改反引号 → 真换行才合法 → build 通过 → dist 验证真换行
   6 个 `\n`（5 章 + 其他字段）→ split 7 行

## 教训（写进肌肉记忆）

**TypeScript 字符串换行 3 种写法对比**：
| 写法 | TS 是否合法 | 编译后 JS 内容 | 浏览器 split('\n') |
|---|---|---|---|
| `"...\n..."` | ✅ | `\n`（2字符：反斜杠+n） | ❌ 切不到 |
| `"...\\n..."` | ✅ | `\\n`（2字符：反斜杠+反斜杠+n） | ❌ 切不到 |
| `` `...<真换行>...` `` | ✅ | 真换行符 | ✅ 切到 |

**前端 split 写法对比**：
| 数据 | split 写法 | 切到？ |
|---|---|---|
| `"\n"`（字面反斜杠n） | `split('\n')` | ❌ |
| `"\n"`（字面反斜杠n） | `split(/\\n/)`（正则） | ✅ |
| `"<真换行>"` | `split('\n')` | ✅ |

## 验证清单（必做）
1. **看 dist 实际字节**：`grep 关键字符串 | od -c` 看真换行（`\n`）还是反斜杠n
2. **模拟前端 split**：写个 Node 脚本读 dist 文件，跑 `split('\n')` 看行数
3. **服务器端再验**：`scp` 一份 dist 到本地跑同样 split
4. **不要只信 git diff**——diff 里 `\n` 显示什么样子和编译后是不是真换行无关

## 这次 commit
- `334f30c4` fix(xueshici): 22 首诗 original 改反引号 + 真换行
- 86 insertions / 22 deletions（22 个字段改引号 + 64 处换行展开）

## 部署
- `bash scripts/deploy.sh xueshici text`
- 备份: `/grandkidsgo/.backup/xueshici/20260706-095641`

## 串入 7-4 完整日志
6. [Session 2026-07-04 audio 3 目录 + 22 首诗原文](session-2026-07-04-5-original-text-fix.md) — a972a483 / e9c2c874
7. **本段** — 334f30c4（修正）