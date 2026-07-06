---
name: session-2026-07-04-nginx-main-deploy-path
description: "揭示服务器 nginx 实际服务的 grandand.com 内容路径，纠正 deploy 时 \"rsync 到 dist/ 就够了\" 的错觉；并写下浏览器本机 PWA 安装状态的清理路径。"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0d9a096e-46ec-4313-a4d2-af2d49ab5874
---

## 触发

grandand.com "在应用中打开" 按钮在 commit 7159e942 之后仍出现。用户反馈后走查发现踩了**两条独立路径**的坑。

## 关键发现：nginx root 不是 dist/

服务器上 main-site 内容**有两条路径**：
| 路径 | 时间 | 谁管 |
|------|------|------|
| `/grandkidsgo/apps/main-site/dist/` (D0aLPl0Y.js) | 7-4 14:13 | 用户本地 serve (`serve -s dist -l 3000`) |
| `/grandkidsgo/nginx/html/main/` ← bind mount → 容器内 `/usr/share/nginx/html/main/` | 7-4 14:13 | **nginx 实际服务** |

- `/grandkidsgo/nginx/html` 是 bind mount 源（ro），容器 `/usr/share/nginx/html` 是挂载点
- 我之前的 deploy 用的是前者 (`dist/`)，但用户浏览器拉的是后者 (`main/` 通过 nginx)
- **deploy.sh 早就处理了** (`nginx_dir_for main-site → main` 映射)，只是我 7-4 14:13 那次手动 rsync 走了 dist 路径，没用 deploy.sh，所以 nginx 拿到了**仍在用的旧 main/**
- 凌晨 04:13 UTC (北京时间 12:13) **神秘的同步** → 现在看是某次我看不到的 sync 让 main/ 跟上了 dist/ 的内容

**根因**：我部署时刻错以为"两个路径等价"，但实际上 deploy 那天 12:13 后才有新内容进入 main/，所以下午 PWA 触发的就是当时还停留在 7-2 12:42 的 main/。

## 教训

1. **不要被 dist/ 误导**：服务 nginx 的路径是 `/grandkidsgo/nginx/html/main/`（由 deploy.sh 的 `nginx_dir_for` 决定）
2. **bind mount 不等于实时刻同步**：ro mount 让容器内时间戳 = UTC（比 host 看起来慢几小时），**别看时间戳判断新鲜度**；用 diff 内容判断
3. **容器内只读**：`docker exec ... rm` 会失败；要改 `docker exec ... cp -r from to`，或者直接改 host bind 路径
4. **PWA 提示有多重缓存层**：
   - 服务器文件（已删）
   - SW（已 unregister）
   - **浏览器本机 Profile 记忆**（chrome://apps 才能清）

## 修法（针对 PWA）

如果用户反馈"按钮还在"：

1. 服务器确认：先 curl `https://grandand.com/` 看 index.html 是否含 `<link rel="manifest">`（nginx 已没 = 通过）
2. 再 `curl https://grandand.com/assets/index-D0aLPl0Y.js | grep -c 寓教于乐`（应为 0）
3. 如都过了，清理浏览器本机状态：
   - `chrome://apps` → 找到 grandand.com → 右键 → 从 Chrome 移除
   - 或 `chrome://settings/clearBrowserData` → "所有时间" + 勾"已安装的网站数据"

## 给 deploy.sh 不需要改

它已经是对的（早就维护了 `nginx_dir_for` 映射 + `--exclude='._*'`）。**症结不是脚本，是我那次手动 rsync 走错了路径。** 复盘后:**以后部署走 `./scripts/deploy.sh main-site`，禁止手动 rsync**。

## 主站验证清单（按"如果 curl 通过还看到 PWA"的排查顺序）

```
curl -s https://grandand.com/                          # 主页无 PWA 标签？
curl -s https://grandand.com/manifest.webmanifest      # 404 不是 200？
docker exec grandkidsgo-nginx ls /usr/share/nginx/html/main/   # 容器内容是新版？
diff <(ls /grandkidsgo/nginx/html/main/) <(docker exec grandkidsgo-nginx ls /usr/share/nginx/html/main/)  # bind 一致？
chrome://apps                                          # 本机 profile 还记着？
```

## 串入前两段

7-4 完整工作日志前三段：
1. [PWA + parent-guard](session-2026-07-04-grandand-pwa-and-parent-guard.md) — 移除 vite-plugin-pwa + 14 岁门卫
2. [mask + _.* 清理](session-2026-07-04-mask-and-metadata-cleanup.md) — nginx mask + 全机 6378 元数据
3. **本段** — nginx main/ 路径同步 + 浏览器 PWA 状态清理

合计推送 4 个 commit：`4102d1c7..e813c78d`
