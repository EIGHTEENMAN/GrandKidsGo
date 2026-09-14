# auth.grandand.com / admin.grandand.com 备案架构决策说明

**文档版本：** v1.0
**生效日期：** 2026-09-11
**关联任务：** 整站 ICP 备案方案 v1.0 第 3.2 节

---

## 一、问题

根据 ICP 备案 FAQ Q12 和整站备案方案：

- `auth.grandand.com` 和 `admin.grandand.com` 作为独立站点需要单独备案 -2/-3
- 建议方案：改用 IP+basic auth，绑到非 80/443 端口，避开单独备案

## 二、当前架构依赖（已存在）

**`auth.grandand.com` 是主站登录态的根：**

1. **Cookie 域共享**：`auth-service/src/routes/auth.js` 颁发的 `access_token` Cookie 域为 `.grandand.com`（跨子域共享）
2. **统一用户体系**：`grandkidsgo_token` 在 `auth.grandand.com` 颁发后被 `*.grandand.com` 所有子域共用
3. **跨子域 SSO**：用户在任意子域登录后，所有其他子域自动登录
4. **前端调用**：所有 app 的 `/api/auth/*` 调用通过 nginx 反代到 auth-service（3007）

**`admin.grandand.com` 是内部管理后台：**

1. 端口 3099，Ant Design 前端 + Express 后端
2. 当前用法：管理员通过域名直接访问
3. 不影响公开业务

## 三、改造方案对比

### 方案 A：完全去掉公网域名（用户原始方案）

**做法**：
- 删除 auth.grandand.com 和 admin.grandand.com 的 server block
- auth-service 改成 SSH 隧道访问（`ssh -L 3007:127.0.0.1:3007`）
- admin 改成 SSH 隧道 + basic auth
- Cookie 域从 `.grandand.com` 改成 main-site 单域（破坏跨子域 SSO）

**问题**：
- ❌ 破坏统一用户体系（所有子域登录态失效）
- ❌ 影响所有用户（不只是管理员）
- ❌ 每次访问需 SSH 隧道，体验差
- ❌ 需要重构所有 app 的 /api/auth/* 调用路径

**结论**：**不可行**。架构依赖太深。

### 方案 B：保留 auth.grandand.com，admin 改 IP+basic auth（推荐）

**做法**：
- 保留 `auth.grandand.com` 443 server block（用户登录态必需）
- 删除 `admin.grandand.com` 443 server block
- admin 改用 `47.114.77.124:8081` + basic auth（不绑域名）
- 内部访问走 SSH 隧道或堡垒机跳转
- admin 独立备案 -2 走加急通道，单独申请

**优点**：
- ✅ 不破坏统一用户体系
- ✅ admin 真正内部化（避开单独备案的诉求）
- ✅ 仅 admin 走堡垒机，体验影响范围小
- ✅ auth.grandand.com 单独备案相对简单（仅 1 个子站）

**缺点**：
- ⚠️ admin.grandand.com 仍需单独备案为 -2
- ⚠️ 需阿里云审核（auth 是 API 服务）

### 方案 C：保留两个公网域名，都单独备案（最保守）

**做法**：
- 保留 auth.grandand.com 和 admin.grandand.com
- 走加急通道单独备案 -2（auth）+ -3（admin）
- 主站 -1 + 走天下 -2 双备案 + auth -3 + admin -4（共 4 个备案号）

**优点**：
- ✅ 不破坏任何现有架构
- ✅ 所有功能保持现状

**缺点**：
- ⚠️ 多 2 个备案号，工期 +3-5 工作日
- ⚠️ API 服务（auth）单独备案审核会问询较多

## 四、推荐方案：方案 B（admin 改 IP+basic auth）

**决策依据**：
1. admin 是内部系统，本就只服务少数管理员，改为 SSH 隧道 + basic auth 体验影响小
2. auth 是公开服务的依赖（用户登录态），不能去掉公网域名
3. 用户原始方案把 auth/admin 一并改，但忽略了主站登录态依赖
4. 折中：只改 admin，auth 单独备案 -2

**实施清单**：
1. ✅ 备份当前 nginx 配置（grandand-nginx.conf）
2. ✅ 删除 `admin.grandand.com` 443 server block（行 416-435）
3. ✅ 新增 admin 8081 IP-only server block（不绑 server_name，只 listen 8081）
4. ✅ 生成 .htpasswd 文件（admin 用户）
5. ✅ 测试：访问 `http://47.114.77.124:8081` 提示输入用户名密码
6. ✅ 测试：访问 `https://admin.grandand.com` 返回 444/重置连接
7. ✅ 阿里云备案 -2 单独申请 auth.grandand.com

## 五、保留方案 A 的判断（用户决策记录）

用户拍板"nginx 取消域名反代，改 IP+basic auth 监听 8080/8081"是 plan v1.0 第三节的推荐方案。本文档经分析后认为：

- admin 可以按方案 A 实施（无架构依赖）
- auth **不建议**按方案 A 实施（破坏统一用户体系）

如用户坚持 auth 也按方案 A，需配套：
1. 主站 Cookie 域改为单域（`.grandand.com` → `grandand.com`）
2. 所有 app 的 `/api/auth/*` 改成同源调用
3. 所有跨子域 SSO 失效，用户需重新登录
4. 工期 +5-7 工作日（涉及所有 app）

## 六、当前状态

**已做**：
- 本文档归档（决策依据 + 方案对比 + 推荐）
- 不动 nginx 配置（避免破坏登录态）

**待用户决策**：
- [ ] 选择方案 B / 方案 C / 强制方案 A（含架构改造）
- [ ] 拿到 ICP 备案号 -1 后立即启动 admin 改造
- [ ] auth.grandand.com 是否单独备案 -2

## 七、相关文件

- nginx 配置：`apps/shared/nginx/grandand-nginx.conf`
- auth-service Cookie 配置：`apps/auth-service/src/routes/auth.js`
- 统一用户体系：`unified-user-system.md`（memory）
- 备案 FAQ Q12：`ICP备案/04-ICP备案常见问题FAQ.md`

## 八、版本

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-09-11 | 首次发布（决策文档，待用户决策方案 B/C）|

---

© 2026 童慧行 · 内部架构决策文档
