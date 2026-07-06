---
name: xueshici-deploy-paths
description: 好大儿服务器 xueshici 站实际部署目录是 /haodaer/nginx/html/xueshici/（挂载到 haodaer-nginx 容器 /usr/share/nginx/html），而不是 /haodaer/apps/xueshici/dist/。修复代码后必须同步到 /haodaer/nginx/html/xueshici/ 才生效。
metadata:
  type: project
  originSessionId: 2026-06-19
---

# xueshici 实际部署路径（关键！）

## 真相
- 服务器实际部署目录：**`/haodaer/nginx/html/xueshici/`**
- 通过 docker bind mount 挂载到容器 `haodaer-nginx` 的 `/usr/share/nginx/html`
- 容器内 nginx 的 `root` 指向 `/usr/share/nginx/html/xueshici`

## 错误假设（踩过的坑）
- ❌ 以为改 `/haodaer/apps/xueshici/dist/` 然后 build 就完事——其实根本没用上
- ❌ 以为 `npm run build` 在主机 `/haodaer/apps/xueshici/dist/` 生成的就是线上代码——不是

## 正确部署流程
1. 在主机 `/haodaer/apps/xueshici/src/` 改代码
2. `cd /haodaer/apps/xueshici && npm run build` → 输出到 `/haodaer/apps/xueshici/dist/`
3. **同步 dist 到实际部署目录**：
   ```bash
   rsync -av --delete /haodaer/apps/xueshici/dist/* /haodaer/nginx/html/xueshici/
   ```
4. mp3 直接放到 `/haodaer/nginx/html/xueshici/audio/poems/`（不走 build）

## 验证方法
```bash
# 看实际服务的 index.html 引用哪个 js
cat /haodaer/nginx/html/xueshici/index.html
# grep 关键字符串确认新版已上线
grep -c '朗读赏析' /haodaer/nginx/html/xueshici/assets/index-*.js
```

## 关联
- [[feedback-deploy-immediately]] — 部署必须真的同步到线上目录，不能只 build
- [[feedback-confirm-project-first]] — 每次开始前先确认部署架构