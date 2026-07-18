---
name: session-2026-07-04-deploy-sh-skip-media
description: 扩展 deploy.sh：用 deploy_strategy_for + skip-media 策略让 xueshici 一键部署，同时守住服务端 4.3G audio/images 资源不被误删。
metadata: 
  node_type: memory
  type: project
  originSessionId: 0d9a096e-46ec-4313-a4d2-af2d49ab5874
---

## 触发

7-4 修完 xueshici 双标点 bug 后，部署环节还**依赖手工 4 步**（备份 + rsync dist + cp index.html + rsync assets）才能让 nginx root 正确加载。原因：xueshici 的 4.3G audio/images 由 TTS / 图片生成脚本单独推送，跟 dist 内容不在同一生命周期。

## 设计决策

新增 `deploy_strategy_for()` 与现有 `nginx_dir_for()` 平行：

```bash
deploy_strategy_for() {
  case "$1" in
    xueshici) echo "skip-media" ;;
    *)        echo "full" ;;
  esac
}
```

| 策略 | 行为 | 适用 |
|------|------|------|
| `full` | rsync dist/ 全部子目录（含 audio/images） | 默认 |
| `skip-media` | rsync 时 `--exclude='audio/' --exclude='images/'`，不删不传 | 服务端 media 由专门 pipeline 维护 |

## 关键：rsync `--delete` + `--exclude` 的组合行为

- `--exclude` 让 rsync **不传**这些路径的客户端文件
- `--delete` 让 rsync **删**目标端多余文件
- 两者**正交**：exclude 路径不会被删（删除扫描不匹配）
- 结果：服务端 audio/images 路径完全不动

## 关键：LOCAL_DIST / REMOTE_TARGET 尾斜杠

```bash
rsync -av --delete ... "$LOCAL_DIST/" "$REMOTE_TARGET"
#                                   ^         ^
#                                尾斜杠     尾斜杠
```

- 都加尾斜杠 → rsync 平铺 dist 内容到 nginx root，**不创建 dist 子目录**
- nginx root = `{assets/, audio/, images/, index.html}`，dist 命名空间消失

## 实测结果

- 16035 文件传输（含 4.3G audio/images 的元数据扫描）
- 实际只上传 816KB（exclude 生效，audio/images 被跳过）
- 服务端 audio 6085 + images 9939 文件完整保留
- 主页 HTTP 200，bundle YMXDf-k4.js 在线
- audio/poems/1_original.mp3 仍可拉

## 未来 TODO（commit message 已记录）

- xueguoxue（1.5G audio）/ xuetongshi（195M images）/ english（115M audio）同样 pattern，但今天只解 xueshici——加 case 即可
- 备份当前默认包含 4.3G media（rsync line 86 备份整个 nginx_dir_for 内容）—— 后续可优化成 `if strategy == skip-media` 只备份 dist 部分
- deploy.sh 自动化回滚测试尚未写

## 给下次启发的提醒

- **Vite 默认会把 `public/` 拷进 `dist/`**——这意味着 deploy dist/ 时 audio/images 已经被复制过去了；但本仓库里它们的**主存还在服务端**（TTS 单独推上去），deploy 不应该覆盖
- **manual deploy ≠ script deploy**：今天手工 4 步和未来 ./scripts/deploy.sh 行为**应当 100% 等价**——若发现手动比脚本多一步，就要写进脚本
- **deploy.sh 早就有 `nginx_dir_for main-site → main` 映射**——xueshici 没映射（fallthrough 默认 `$1 = xueshici`）是对的，不要乱加
- **当 deploy.sh 报 EOF 错误时不要慌**——先看 `set -x` 输出，rsync 实际可能已经传完；EOF 往往是 ssh transient 问题

## 串入前四段（7-4 完整工作日志）

1. [PWA + parent-guard](session-2026-07-04-grandand-pwa-and-parent-guard.md) — 移除 vite-plugin-pwa + 14 岁门卫
2. [mask + _.* 清理](session-2026-07-04-mask-and-metadata-cleanup.md) — systemctl mask + 全机 6378 个 AppleDouble
3. [nginx main/ 路径同步](session-2026-07-04-nginx-main-deploy-path.md) — nginx 服务路径 ≠ app 路径 + chrome://apps 清本机 PWA
4. [xueshici 双标点 + 21 处源数据脏](session-2026-07-04-nginx-main-deploy-path.md)（同 session 段，处理过 App.vue splitBySentence + poems.ts 21 处）
5. **本段** — deploy.sh skip-media（本次 commit 20fdf5c6）

合计推送 6 个 commit：`4102d1c7..20fdf5c6`

## 衔接的踩坑链

踩坑 1：grandand.com 显示 PWA → commit 7159e942 移除  
踩坑 2：移除后还显示 → nginx main/ 路径同步才是真服务路径 → 排查  
踩坑 3：xueshici 双标点 bug → 前端 splitBySentence + 21 处源脏 → commit 162870c2  
踩坑 4：xueshici 部署踩坑 → deploy.sh 加 skip-media → commit 20fdf5c6（**本段**）
