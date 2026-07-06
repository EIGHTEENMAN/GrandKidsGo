---
name: session-2026-07-02-deploy-pwa-architecture
description: 童慧行上线日：部署脚本重构 + PWA 关闭 + 儿童合规漏洞修复 + 信息安全保护方案 + ICP 备案准备
metadata: 
  node_type: memory
  type: project
  originSessionId: 0353c50f-a104-4806-add7-fd91586bd58c
---

# Session 2026-07-02 上线准备

## 部署架构

**nginx 路径真相**（重要：踩坑后确认）：
- 服务器容器 `grandkidsgo-nginx` 内的 `/usr/share/nginx/html/` 是**只读 bind mount**
- 宿主机源：`/grandkidsgo/nginx/html/`
- 宿主机 `/grandkidsgo/nginx/html/main/` ←→ 容器 `/usr/share/nginx/html/main/`
- **app 名和 nginx root 目录名可能不同**：`apps/main-site` 对应 nginx `main`（不是 main-site）

**已建立**：
- `scripts/deploy.sh` 通用部署脚本（rsync + 备份到 `/grandkidsgo/.backup/<app>/<时间戳>/` + 部署后 grep 验证 + 失败自动回滚）
- `apps/main-site/package.json` 加 `npm run deploy`
- `nginx_dir_for()` 函数处理 app 名映射（main-site → main）

**Why:** 上线前多个"看似部署了但没生效"的根因都是路径错位
**How to apply:** 任何 app 部署前先 `nginx_dir_for` 确认目标名；新加 app 时更新映射表

## PWA 关闭

**关闭原因**：
- 用户首次反馈"右上角'在应用中打开'按钮"是 Chrome 自动加的（vite-plugin-pwa 触发）
- 进一步发现：SW 缓存导致改文字不生效
- 移动端对 PWA 价值低，反而有副作用

**关闭方法**：
- `vite.config.ts` 删 VitePWA 插件
- `index.html` 删 theme-color / mobile-web-app-capable / apple-touch-icon
- 部署后**用户必须手动清 SW**（chrome://settings/clearBrowserData）

**How to apply:** 上线静态站默认不开 PWA。要用再说。

## 儿童保护合规漏洞修复

**漏洞 1**：生日可选 → 14 岁检查可绕过
- 前端 `isUnder14(birthYear.value)` 空生日返回 false
- 修法：后端 `requiresParentConsent(userId)` 统一裁决
- 缺失生日**从严按儿童处理**
- 4 个端点（`/register` `/phone-login` `/me` `/oauth/wechat`）全部返回 `requiresParentConsent` 字段
- 前端 3 处登录流程统一改用后端裁决

**漏洞 2**：微信登录无 parent-consent
- `/api/oauth/wechat` 也加 `requiresParentConsent`
- 前端按钮暂禁用（"微信登录暂未开放"）—— H5 OAuth 实际未接入

**新增全局门卫**：
- `App.vue:checkParentConsent()` 登录后自动检查
- 弹 `forceConsent` 模式下的 AuthModal
- 未完成时弹窗无法关闭（`forceConsent ? null : ...`）

**代码位置**：
- `apps/auth-service/src/utils/consent.js`（新增）
- `apps/auth-service/src/routes/auth.js` / `oauth.js`（加 require + 返回字段）
- `apps/main-site/src/components/AuthModal.vue`（加 forceConsent / forceConsentUserId props）
- `apps/main-site/src/App.vue`（加全局门卫）

## 信息安全保护目录

`信息安全保护/` 目录结构：
- 主方案（12 章 + 8 附件，全 Word 格式）
- `文档/`：服务条款/侵权投诉/应急预案/内部制度/儿童保护 SOP/第三方共享清单（双格式 .md + .docx）
- `流程/` `制度/` `备案/`（待办索引）

**转换工具**：`scripts/md_to_docx.py`（python-docx 实现，支持标题/列表/代码/表格/粗体/链接）

**Why:** 上线备案需要正式 Word 文档，不能只交付 Markdown
**How to apply:** 后续要写新政策/制度文档，统一双格式

## ICP 备案准备

`ICP备案/` 目录，4 份双格式文档：
- 01 材料清单（个人/企业/通用）
- 02 真实性核验单模板
- 03 操作步骤（10 步）
- 04 FAQ（30 题）

**关键发现**：
- 童慧行当前**只需要 ICP + 公安备案**（诗配动画已下线，AI 对话已隐藏）
- 不要办经营性 ICP（无收费/广告/电商）
- 不要办视听节目许可
- admin.grandand.com / auth.grandand.com 建议**用 IP+basic auth 避免单独备案**

## 隐私政策/监护人须知

`品牌/` 目录下两份文档：
- `童慧行隐私政策（法务版）.md`：15 章 + 法规附录
- `童慧行监护人须知.md`：C 端友好版

**待填占位符**：公司名、邮箱、地址、负责人姓名 —— 上线前必填

## 关联

- [[deploy-pwa-architecture]] 关联部署架构
- [[launch-readiness-2026-06-26]] 上线前体检（5 P0 待修）
