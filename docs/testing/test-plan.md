# 童慧行整站测试计划

> 创建：2026-08-13
> 目标：13 个 app 全量端到端测试，确保所有用户路径都能闭环
> 工具：Playwright + 浏览器自动化
> 执行：`npx playwright test tests/<app>.spec.js`

## 端口映射（dev）

| App | 端口 | 类型 | 后端 |
|-----|------|------|------|
| main-site | 3000 | Vue+Vite | — |
| auth-service | 3007 | Express | — |
| travel-guide | 3010 | Next.js | — |
| admin | 3099 | Vue+Vite | api/server.js (3099) |
| xueshici | 3008 | Vue+Vite | — |
| xueguoxue | 3003 | Vue+Vite | — |
| xuetongshi | 3004 | Vue+Vite | — |
| english | 3002 | Vue+Vite | — |
| tiaozhan-web | 3011 | React+Vite | 3001 (Express+WS) |
| forum | 3005 | React+Vite | server/index.js (3005) |
| store | 3006 | React+Vite | server/index.js (3006) |
| moderation | 3020 | Express | — |

## 测试用例清单

### 1. main-site（Vue，主站 13 个页面）

- [ ] 首页加载（hero+卡片+导航）
- [ ] 搜索页（输入→结果→跳详情）
- [ ] 学诗词 tab → 跳 xueshici
- [ ] 学古文 tab → 跳 xueguoxue
- [ ] 学通识 tab → 跳 xuetongshi
- [ ] 学单词 tab → 跳 english
- [ ] 来挑战 tab → 跳 tiaozhan
- [ ] 论坛 tab → 跳 forum
- [ ] 商城 tab → 跳 store
- [ ] 走天下 tab → 跳 travel-guide
- [ ] 个人中心页（登录态/未登录态）
- [ ] FAQ 页
- [ ] 法律页（隐私/条款）
- [ ] 青少年模式
- [ ] 登录弹窗（手机号+微信+邮箱）
- [ ] 孩子档案弹窗

### 2. auth-service（认证）

- [ ] /health
- [ ] /api/auth/me 未登录 401
- [ ] /api/auth/register 注册流程
- [ ] /api/auth/login 登录流程
- [ ] /api/auth/logout
- [ ] /api/auth/refresh
- [ ] /api/auth/send-sms
- [ ] /api/auth/wechat 微信登录
- [ ] /api/auth/oauth 第三方
- [ ] Token 过期验证

### 3. xueshici（学诗词）

- [ ] 首页列表
- [ ] 诗词详情（TTS 播放/暂停/切换情绪）
- [ ] 译文/赏析
- [ ] 收藏
- [ ] 跟读（录音+评分）
- [ ] 学习进度
- [ ] 朝代筛选
- [ ] 主题筛选
- [ ] 个人学习报告

### 4. xueguoxue（学古文）

- [ ] 列表/详情
- [ ] 译文切换
- [ ] 注释展开
- [ ] 收藏/学习进度

### 5. xuetongshi（学通识）

- [ ] 列表/详情
- [ ] 动画播放
- [ ] 测验
- [ ] 收藏/进度

### 6. english（学单词）

- [ ] Study Hub
- [ ] Stage 列表
- [ ] 单词卡（点选/翻面）
- [ ] 跟读 ReadAlong
- [ ] 复习 ReviewPage
- [ ] AI 聊天 ChatPanel
- [ ] 个人中心 Profile

### 7. tiaozhan（来挑战）

- [ ] 首页（开始挑战/排行榜）
- [ ] 登录弹窗
- [ ] QuizBattle 出题+提交
- [ ] 排行榜
- [ ] 神兽方块
- [ ] WebSocket 实时对战（如果可测）

### 8. forum（论坛）

- [ ] 列表页
- [ ] 帖子详情
- [ ] 发帖（含 AI 审核弹窗）
- [ ] 回帖
- [ ] 点赞/举报
- [ ] 登录态切换

### 9. store（商城）

- [ ] 商品列表
- [ ] 商品详情
- [ ] 兑换（积分扣减）
- [ ] 订单列表
- [ ] 登录态

### 10. travel-guide（走天下，37 个路由）

- [ ] 首页
- [ ] /places 地点列表
- [ ] /places/[id] 地点详情
- [ ] /places/[id]/reviews
- [ ] /guides 攻略列表
- [ ] /guides/[id] 攻略详情
- [ ] /guides/ai-wizard AI 向导
- [ ] /guides/create 创建攻略
- [ ] /guides/[id]/edit 编辑
- [ ] /wizard 多城向导
- [ ] /plan/preview 行程预览
- [ ] /plan/[id] 行程详情
- [ ] /plan/[id]/edit 编辑
- [ ] /plan/[id]/feeling 真实感受
- [ ] /search
- [ ] /leaderboard 排行榜
- [ ] /badges 勋章
- [ ] /child-sayings 孩子说
- [ ] /gallery 儿童画廊
- [ ] /profile 个人中心
- [ ] /profile/children 孩子档案
- [ ] /profile/guides 我的攻略
- [ ] /profile/plans 我的行程
- [ ] /profile/sayings 孩子说列表
- [ ] /profile/badges 勋章
- [ ] /profile/footprints 足迹
- [ ] /profile/settings 设置
- [ ] /login /register
- [ ] /author/[id] 作者主页
- [ ] /admin 内部管理
- [ ] /faq /about
- [ ] /legal/privacy /legal/terms

### 11. admin（管理后台）

- [ ] 登录
- [ ] Dashboard
- [ ] Users 用户管理
- [ ] QuizBank 题库
- [ ] QuizRules 规则
- [ ] Forum 论坛审核
- [ ] TravelGuides 攻略审核
- [ ] GuideReports 举报
- [ ] ActivityReview 动态审核
- [ ] KolReview KOL 审核
- [ ] LeaderboardReview 排行榜审核
- [ ] Analytics 数据看板

### 12. moderation（审核服务）

- [ ] DFA 敏感词扫描
- [ ] AI 审核接口
- [ ] 申诉流程

## Bug 跟踪

测试中发现的所有 bug 记录到 issues.md，分类为 P0/P1/P2/P3。
