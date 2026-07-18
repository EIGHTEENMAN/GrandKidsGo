---
name: session-2026-07-04-grandand-pwa-and-parent-guard
description: "用户反馈 grandand.com 浏览器右上角\"在应用中打开\"提示，清理 PWA 接入+部署；同时把 7-2 那次未入库的家长同意门卫 commit 入库。"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0d9a096e-46ec-4313-a4d2-af2d49ab5874
---

## 触发

用户 7-4 在 grandand.com 截图，反馈浏览器右上角"在应用中打开"蓝色 PWA 按钮。

## 调查路径（避免重做）

1. 7-2 `feedback-deploy-immediately` 决策已关 PWA，**但只做了业务决策没清理代码** — vite.config.ts 还在用 `vite-plugin-pwa`，index.html 还含 theme-color / apple-touch-icon
2. 服务器 dist `/grandkidsgo/apps/main-site/dist/` 仍是 5-26 旧 PWA 构建（含 `manifest.webmanifest` / `registerSW.js` / `sw.js` / `workbox-*.js`）
3. 浏览器看到 "在应用中打开" = Chrome 找到 manifest.webmanifest 触发的安装提示

## 修复（2 个 commit 已推送 `4102d1c7..4b5926f0`）

- **7159e942** `fix(main-site): 移除 PWA 接入去掉浏览器"在应用中打开"提示`
  - package.json -v vite-plugin-pwa
  - vite.config.ts 删 VitePWA plugin
  - index.html 删 theme-color / apple-touch-icon / mobile-web-app-capable
  - package-lock.json 净减 5860 行 workbox
- **4b5926f0** `feat(main-site): 全局门卫强制 14 岁以下家长同意才能进入`
  - 前端只 `isUnder14(birthYear)` 容易被跳过；统一改读后端 `d.data.requiresParentConsent`
  - App.vue refreshUser 全局门卫，登录后被强制拉回同意弹窗
  - AuthModal 注册/登录/手机 3 入口都改

## 部署注意（main-site 不是静态 root）

- nginx 配置是 `proxy_pass http://127.0.0.1:3000` 到 serve（Caddy → haodaer-nginx:80 → serve -s dist -l 3000）
- 不用 `scripts/deploy.sh`（它是为 `root /haodaer/.../dist` 模式设计的）
- 直接：`rsync -av --delete apps/main-site/dist/ root@47.114.77.124:/grandkidsgo/apps/main-site/dist/`
- 部署后 `ssh root@47.114.77.124 "curl -s http://127.0.0.1:3000"` 验证本地 HTML 无 PWA 标签

## 顺手发现两个隐患

1. **裸机 systemd nginx failed**（自 7-3 23:27 起，因 80/443 被 docker-proxy 占）— 不影响线上（容器内 nginx `haodaer-nginx:80` 在跑），但 `ssh 内 curl https://...` 会 reset。**should**: `systemctl mask nginx` 防止误导
2. **dist 目录有 `._*` macOS 元数据**（`._assets` / `._icons` 等）— rsync 没加 `--no-mac-resource-fork` 或 `-E`，重复部署会累积。**修法**: rsync 加 `--exclude '._*'` 或 `-E`

## 验证清单

部署后:
- `curl -s http://127.0.0.1:3000 | grep -E 'manifest|registerSW|workbox|sw\.js'` 无输出 ✅
- 资源 hash 是新的（`D0aLPl0Y.js` / `eBn9XXon.css`），不是旧的 `D5ARiAU6.js`

## 给下次启发的提醒

- 大改动（**改 vite.config.ts/plugin/包管理**）必须重新 `npm run build` + 部署，不能信任 dist 已是新的
- 检查"老部署"时，先 `grep` 线上 HTML 看是否真有 plugins 特征，不要看代码改了就行
