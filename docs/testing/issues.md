# 测试 Bug 跟踪

> 创建：2026-08-13
> 测试运行：`npx playwright test tests/<app>.spec.js`

## P0（致命 — 阻塞主流程）

（暂无）

## P0（致命 — 阻塞主流程）

### Bug #2: tiaozhan 前端 React 容器 ID 不匹配
- **文件**：`apps/tiaozhan/index.html:19`
- **症状**：dev 模式下 tiaozhan 前端完全空白，console 报 `createRoot(...): Target container is not a DOM element`
- **根因**：index.html 容器 `<div id="app">` 但 main.tsx 找 `document.getElementById('root')`，React 永远挂不上
- **修复**：将 index.html `<div id="app">` 改为 `<div id="root">`（已 commit）
- **附加修复**：apps/tiaozhan/data/ 目录不存在导致 server 启动崩；apps/tiaozhan/node_modules/better-sqlite3 v11 没装 native 二进制（从 auth-service 复制 v12 arm64）
- **影响**：tiaozhan.grandand.com 生产构建（`dist/index.html`）可能也用了 `id="app"` — 需要查证；如果生产 dist 也用 app id，dev 修完不等于生产修完
- **状态**：✅ dev 已修；⚠️ 生产 dist 待确认

## P1（重大 — 核心功能不可用）

### Bug #1: /api/auth/logout 返回 500
- **文件**：`apps/auth-service/src/routes/auth.js:139`
- **症状**：当请求无 body 或 Content-Type 非 JSON（如 fetch 调 logout 没设 `Content-Type: application/json`）时返回 500
- **根因**：`req.body` undefined 时访问 `req.body.refreshToken` 抛 TypeError
- **修复**：`const refreshToken = req.body?.refreshToken;`（已 commit）
- **发现方式**：02.auth.spec.js logout 测试用例
- **状态**：✅ 已修

### Bug #3: forum /api/auth 缺字段 500
- **文件**：`apps/forum/server/index.js:55`
- **症状**：POST `/api/auth` 缺 userId 或 username 时返回 500（SqliteError NOT NULL）
- **根因**：handler 没防御 undefined 就直接 INSERT
- **修复**：加 `if (!userId || !username) return 400` 防御（已 commit）
- **发现方式**：06.forum.spec.js auth POST 测试用例
- **状态**：✅ 已修

## P2（一般 — 影响体验但有 workaround）

### Bug #4: moderation /api/moderation/check 未授权访问
- **文件**：`apps/moderation/server/index.js:52`
- **症状**：任何人 POST `/api/moderation/check` 都返回 200（没有 service token 校验或 serviceAuth 未生效）
- **根因**：`serviceAuth` middleware 没生效 / 检查通过；任何调用方都能扫文本
- **影响**：恶意用户可扫描敏感词库、绕过审核（DFA 词库暴露）；可滥用于 DoS
- **建议修复**：核实 `serviceAuth` 中间件是否在校验 `x-service-token`，未通过必须 401
- **状态**：⚠️ 已记录未修（P2）

## P3（轻微 — 视觉/文案/边界条件）

（暂无）
