---
name: engineering-experience
description: 跨项目通用工程经验库——调试方法论、架构分析模式、常见陷阱、根因追溯 checklist
metadata: 
  node_type: memory
  type: reference
  originSessionId: 17158ab7-c5e8-4a5e-8161-681f7e0b2eef
---

# 工程经验库

> 每次修完一个"反复出现"的 Bug，或踩了一个有代表性的坑，把根因和排查思路记到这里。
> 目标是：**同一个坑不踩第三次。**

---

## 1. 排查方法论

### 1.1 症状 vs 根因

症状是用户能看到的表象，根因是链路最上游的那个断裂点。

```
症状（用户看到）     →  登录状态丢失
中间环节            →  cookie 过期 → 各子站轮询到 UNAUTHORIZED → 清空本地状态
根因（源头）         →  签发端给的 token 就是短命的（15min），不是前端代码的问题
```

**判断标准：** 如果"修好了"但过一段时间（token 过期时间）症状复现，说明修的是中间环节不是根因。

**追问链：**
1. 这个数据从哪来的？（source of truth）
2. 经过哪些环节？（链路节点）
3. 哪个环节有"有效期"或"容量"或"权限"的限制？（常见瓶颈）
4. 这个限制能被消除或大幅放宽吗？
5. 如果不能，链路最下游有感知到这个限制的机制吗？（graceful degradation）

### 1.2 相似代码全局检索

修改任何共享逻辑前，先做：

```bash
# 1. 找同类组件
grep -r "LoginModal\|AuthModal" apps/*/src --include="*.tsx" --include="*.vue" --include="*.ts"

# 2. 找关键函数签名
grep -r "setToken\|setAuthCookie\|saveAuth" apps/*/src --include="*.ts" --include="*.tsx"

# 3. 找后端接口定义
grep -r "router.post\|app.post" apps/*/server --include="*.js" | grep -i "login\|register\|auth"

# 4. 找共享配置
grep -r "cookie.*domain\|haodaer_token\|jwt.*expires" apps/*/src apps/*/server --include="*.js" --include="*.ts"
```

**原则：** 如果正则搜索命中了 3 个以上文件，这就是一个"共享模式"，改动必须覆盖全部命中点。

### 1.3 数据流追踪

画数据流时，关注以下关键属性在各环节是否一致：

| 属性 | 常见陷阱 |
|------|----------|
| TTL/过期时间 | 签发端和消费端理解不一致（比如前端以为 7 天，后端签发 15 分钟） |
| 格式 | JSON vs string, snake_case vs camelCase |
| 编码 | UTF-8, Base64, URL encoding |
| 签名/验签 | 两端用的密钥不一致 |
| 作用域 | 跨域 cookie 的 domain/path, CORS origin |

---

## 2. 多服务/多应用架构的常见陷阱

### 2.1 单点登录（SSO）类问题

如果遇到"在 A 站登录后 B 站没登录"或"登录后过一会儿就掉了"：

1. **先检查 cookie 的 domain 和 TTL** — 这是 90% 的根因
   - cookie domain 必须是 `.shared-domain.com`（带前导点）才能跨子域共享
   - cookie 内容的 TTL 取决于写入时的值，不是 cookie 本身的 max-age
2. **再检查签发端返回了什么** — 前端只是传递者，写进 cookie 的是签发端给的 token
   - 签发端 `generateTokens()` 返回了哪些 token？
   - `setTokenCookie()` 把哪个 token 写进了共享 cookie？
   - 这个 token 的 JWT expiresIn 是多少？
3. **最后检查消费端怎么读** — 各子站的 sync 机制
   - 是轮询还是页面加载时读一次？
   - 轮询间隔多长？
   - 拿到 UNAUTHORIZED 是静默重试还是直接登出？（后者会造成闪烁）

### 2.2 "修好了又复发" 的模式识别

**模式 A — 只修了下游：** 每次在表现层打了个补丁，根因在 upstream 没动
- 特征：修复后短时间内正常，但周期性复现（周期 = 某个 TTL）
- 对策：找到那个 TTL 限制，问"这个 TTL 是谁设的？能改吗？"

**模式 B — 链路不全：** 改了 A 站忘了 B 站，过了段时间在 B 站发现症状
- 特征：单站测试通过，切站点就出问题
- 对策：改动前全局 grep 同类逻辑，全部对齐

**模式 C — 配置漂移：** 开发环境正常，生产环境有问题
- 特征：本地 dev 没问题，部署后出问题
- 对策：检查域名、端口、SSL、反向代理配置（Nginx 转发是否改了 header 或 cookie）

---

## 3. 修改前 checklist

### 3.1 通用

- [ ] 当前修改影响的数据流，起点和终点分别是什么？
- [ ] grep 过所有 app/目录下的同类组件了吗？
- [ ] 这个变更会破坏现有的 cookie/localStorage/sessionStorage 吗？
- [ ] 现有用户已有的数据（已登录、已有缓存）会受影响吗？需要迁移吗？

### 3.2 API 签名变更

- [ ] 函数参数变了，所有调用方都更新了吗？
- [ ] 可选参数还是必选参数？如果是新增参数但传递方没传，会有默认值兜底吗？
- [ ] 返回值的结构变了，所有消费方都兼容吗？

### 3.3 部署

- [ ] 改了后端（auth-service 等） → 需要 rsync 源码 + restart PM2
- [ ] 改了前端组件 → 需要 build + rsync dist + restart PM2（Vite/Next.js 静态文件）
- [ ] 改了 Next.js 的 sitemap 等预渲染路由 → 本地可能缺少数据库导致 build 失败，需要 try-catch 或服务器上 build
- [ ] 改了 cookie domain/path/Secure 设置 → 需要部署后才能验证，本地 localhost 不触发跨域 cookie

---

## 4. 经验清单

| 日期 | 问题 | 根因 | 教训 |
|------|------|------|------|
| 2026-05-19 | 跨应用登录同步失效（Bug 1） | haodaer_token cookie 写入了 15min 的 accessToken 而非 7day 的 syncToken | 全局检索所有 app 的 auth 代码，链路追踪从签发端到消费端完整走一遍 |
| - | - | - | 动共享组件（LoginModal/setToken）要检查所有前端实现签名是否对齐 |
| 2026-05-19 | 修完 Bug 1 后 forum/store 等子站仍不同步（Bug 2） | setTokenCookie 给 access_token 加了 domain=.grandand.com，中间件先查 cookie 再查 header，过期的 accessToken 遮蔽了 Authorization header 的 syncToken | **给 cookie 加 domain 要考虑所有消费端**；**中间件应优先检查显式传入的 header（Authorization）再 fallback 到被动携带的 cookie** |

---

## 5. 好大儿项目专属链接

- [[auth-cross-app-sync]] — 完整 auth 架构、各 app 文件分布、token 生命周期
- [[auth-middleware-priority]] — authenticate 中间件修复详情
- [[approach-feedback]] — 工作方式要求
