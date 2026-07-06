---
name: session-2026-06-22-chaohuan
description: 潮玩换 2026-06-22 工作日记录 — 暗调泡泡玛特风格 UI 升级（5 个 commit）+ login.vue handleTestLogin Vue3 ref/computed 异步坑修复 + server dotenv 路径 bug 修复
metadata:
  node_type: memory
  type: session
  originSessionId: b31d87bd-ceba-4efa-ad74-4ddd67de7388
---

# 2026-06-22 潮玩换 — 暗调泡泡玛特风格 UI 升级

## 升级目标
从原"亮色 + 橙色调"切换为暗调泡泡玛特风格：**紫粉渐变 + 深色基底**。

## 设计 Token 体系（uni.scss）
主色：紫 `#7C3AED` / 浅紫 `#8B5CF6` / 深紫 `#4C1D95`
辅色：粉红 `#EC4899` / 浅粉 `#FBCFE8`（替代原琥珀橙）
文字：主 `#F5F0EB`（暗卡）/ 深紫 `#4C1D95`（白卡标题）
背景：页面 `#0C0A09` / 抬升面 `#1C1917`
阴影：紫调 `rgba(124,58,237,*)` 替换原黑灰阴影
所有 token 以 `--cwh-*` 前缀命名空间。

## 两阶段 commit

### commit 1: `6523305` — 核心页面 + 组件
范围：App.vue、11 个 cwh-* 组件、index/matches/messages/profile/shop 核心页、swap-center、uni.scss
影响：15 文件，+336/-348

### commit 2: `9f5492b` — fix 补 SCSS 变量
范围：补充 6523305 中遗漏的 `cwh-bg-card` 等变量引用

### commit 3: `771c8a0` — 子页面（本次提交）
范围：pages/sub/** 全量（聊天/商城/橱窗/求换/订单/管理后台/选品/工具…）+ swap-center 二次打磨 + uni.scss
影响：74 文件，+2503/-1893

### commit 4: `d623082` — login.vue 漏改修复
范围：`miniprogram/src/pages/sub/login/login.vue`
- 修复 handleTestLogin 点击无反应 bug（详见下方踩坑）
- 补全 5 处漏改的亮色调硬编码（背景渐变 / 登录按钮 / 微信手机号按钮 / 阴影 / 分割线）
影响：1 文件，+24/-13

**合计覆盖**：70+ 文件，全站页面 + 组件 + 全局样式统一改完。

## ⚠️ 改色漏网检查清单

`git add -A` 后，commit 前应该 grep 一遍 `#(FFF|FF[0-9A-F]{4}|[0-9A-F]{6})|rgb` 找硬编码色值。
本次踩坑——login.vue 漏了 5 处：
- `.login-page` 背景 `#FFF5ED → #FFFFFF` 米黄渐变
- `.btn-login` 背景 `#FF7818 → #FFA84D` 橙渐变 + `rgba(255,120,24,0.2)` 阴影
- `.btn-wechat-phone` 背景 `#FF7818 → #E06600` 橙渐变 + `rgba(255,120,24,0.2)` 阴影
- `.phone-prefix` 分割线 `#E0E0E0` 浅灰
- `text-decoration: underline` 颜色可能也漏

**Why**: 自动化脚本（`convert_colors_pass{1,2,3}.py` + `replace-colors.cjs`）只能按字符串匹配，遇到有上下文差异（如多个相似变量、嵌套 SCSS、注释里色值）会漏。下次大规模改色必须人肉 grep 兜底。

## ⚠️ Vue 3 ref + computed 异步坑（handleTestLogin）

**Bug**：`login.vue` 测试登录按钮点击无反应、不报错、不 loading。

**根因**：
```js
const handleTestLogin = async () => {
  phone.value = '13800138000'    // ref 同步赋值
  smsCode.value = '888888'       // ref 同步赋值
  agreed.value = true            // ref 同步赋值
  await handlePhoneLogin()       // 立即调用
}
// handlePhoneLogin 首行：if (!canLogin.value || loggingIn.value) return
// canLogin 是 computed —— 同一帧内连续赋值后，computed 不会立即重算
// canLogin.value 仍是旧值 false → 直接 return
```

**修复**：测试登录逻辑绕开 canLogin，直接调 phoneLogin API 写自己的 try/catch/finally。
- 提交：`d623082`

**How to apply**:
- 写"快速登录/快捷登录/一键 X"类功能时，**不要依赖"先 set ref 再调函数"的模式**——Vue 3 computed 是惰性的，同步帧内不会重算
- 正确做法是：要么 `await nextTick()`，要么把校验逻辑内联到函数体里，要么直接绕开 computed 用普通变量
- `loggingIn` 状态门控要保留（防止用户连点）

## ⚠️ dotenv 路径 bug（CRAWL_CRON 没生效）

**Bug**：`.env` 写 `CRAWL_CRON=0 */6 * * *`，但启动日志一直打印 `Cron: 0 3 * * *`（rssCrawler.js 的硬编码 DEFAULT_CRON）。`CRAWL_ON_STARTUP` 同样从未生效过。

**根因**：`server/app.js:1` 写的是 `require('dotenv').config()` —— **没指定 path**。dotenv 默认从 `process.cwd()` 找 `.env`，但**项目根没有 `.env`，只有 `server/.env`**。
所以 `dotenv.config()` 实际上**没找到任何文件**，`process.env` 里完全没有 `CRAWL_CRON`，rssCrawler.js 退回到 `DEFAULT_CRON = '0 3 * * *'`。

**为什么数据库"看起来"没事**：`server/db.js:3-9` 给所有 DB 变量都写了**和 `.env` 一字不差的硬编码 fallback**（`|| '127.0.0.1'`、`|| 'cwh_app'`、`|| 'CwhMysql@2026!'`）——只是巧合兜住了。**`db.js` 的硬编码不能兜住真正生产环境配置**（如 `WX_*` 微信支付密钥、`BASE_URL` 回调地址），这些失效不会有任何报错。

**修复**：1 行改动 `server/app.js:1`
```js
// 改前
require('dotenv').config();
// 改后
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
```
- 提交：`55ecae1`
- 验证：重启后启动日志 `Cron: 0 */6 * * *` ✓

**Why**: cwd-dependent dotenv 加载在 monorepo / 子目录布局项目里是经典坑。本地 `npm start`（cwd=项目根）能跑只是因为某些值有硬编码兜底，但**任何新加的无 fallback 的 env 变量会静默失效**——这类问题不会有运行时错误，只是"配置改了没生效"。

**How to apply**:
- 任何 `require('dotenv').config()` **必须显式传 path**，用 `path.join(__dirname, '.env')` 锁定到当前文件目录
- 给关键配置加启动日志（"哪些 env 实际生效了"），让静默失败变显式
- 排查"配置改了没生效"问题时，**先怀疑 cwd**，再怀疑代码逻辑
- CI/Docker 部署时尤其要小心——容器内 cwd 经常和 dev 不一样

## 辅助工具（已入库）
- `miniprogram/scripts/convert_colors.py` / `pass2.py` / `pass3.py`
- `miniprogram/.workbuddy/replace-colors.cjs`
- `.workbuddy/memory/2026-06-16.md`

## 改色原则（已沉淀）
- 硬编码色值（`#666` / `#FFFFFF` / `#FF7818` 等）→ SCSS 变量
- 白卡（首页展柜/潮玩）保留浅色 + 深紫标题字
- 暗卡（菜单/商城/聊天/管理）使用深色基底 + 浅色文字

## Why
6-11 起开始换主题，6523305 + 9f5492b + 771c8a0 三次 commit 收尾。补完以后"全站统一暗调泡泡玛特风"这一轮迭代结束。下次需要继续 UI 改版时，从这里起步看现状。

## How to apply
- 新页面/组件**禁止用硬编码色值**，一律走 `--cwh-*` 或 `$cwh-*` 变量
- 紫色渐变 `#7C3AED → #EC4899` 是品牌主轴，**不要改回橙色**
- 白卡是"潮玩/展柜"专用语义（点缀用），不要大面积铺
- 想加新 token 时，先在 uni.scss 集中加，命名沿用 `--cwh-{用途}` 格式

## 相关 memory
- [[session-2026-06-11-ui-optimization]] — UI 升级起点（TabBar 纯文字+聊天仿闲鱼）
- [[session-2026-06-08-ui-redesign-and-seed-data]] — 上一轮集市化重设计
- [[chaohuan-no-ai-features]] — AI 槽位预留原则
