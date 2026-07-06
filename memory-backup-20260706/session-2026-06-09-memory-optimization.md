---
name: session-2026-06-09-memory-optimization
description: 好大儿服务器内存优化 - 静态化 + 停用空壳应用
metadata: 
  node_type: memory
  type: session
  originSessionId: 4987269c-fdcb-45f6-90a9-39364c8f7527
---

# 2026-06-09 好大儿服务器内存优化

## 问题
服务器 3.4GB 内存已用 2.7GB，空闲仅 353MB，急需优化。

## 解决方案

### 1. 静态化架构调整
**发现**：真正的 Nginx 在 Docker 容器 `dkd-nginx` 内（而非 host 上的 Nginx）

将 5 个静态站点从 Node.js serve 改为 Nginx 直接服务：
- `/DKD/nginx/html/` 目录下存放静态文件
- Docker Nginx 配置在 `/DKD/nginx/conf.d/haodaer.conf`

| 站点 | 原端口 | 现路径 |
|------|--------|--------|
| grandand.com | 3000 | /usr/share/nginx/html/main |
| xueshici.grandand.com | 3008 | /usr/share/nginx/html/xueshici |
| xueguoxue.grandand.com | 3003 | /usr/share/nginx/html/xueguoxue |
| xuetongshi.grandand.com | 3004 | /usr/share/nginx/html/xuetongshi |
| english.grandand.com | 3002 | /usr/share/nginx/html/english |

### 2. 停止空壳应用
以下 PM2 进程已停止（内容数据未填充，无业务影响）：
- xueshici (3008)
- xueguoxue (3003)
- xuetongshi (3004)
- english (3002)
- main-site (3000) - 已迁移到 Nginx

### 3. systemd 服务已创建（未启用）
为 6 个动态服务创建了 systemd 文件，可替代 PM2：
- haodaer-auth.service
- haodaer-tiaozhan.service
- haodaer-forum.service
- haodaer-store.service
- haodaer-admin.service
- haodaer-main.service

## 内存效果
- 优化前：2.7GB / 3.4GB (used)
- 优化后：2.0GB / 3.4GB (used)
- 节省：约 700MB

## 重要路径
- Docker Nginx 配置：`/DKD/nginx/conf.d/haodaer.conf`
- 静态文件目录：`/DKD/nginx/html/{app}/`
- Host Nginx 配置：`/etc/nginx/sites-available/grandand.com.conf` (未使用)

## 静态文件更新
```bash
# 1. 复制新文件
cp -r /haodaer/apps/xueshici/dist/* /DKD/nginx/html/xueshici/

# 2. 重载 Nginx
docker exec dkd-nginx nginx -s reload
```

## 保留的服务（必须运行）
- MySQL (499MB) - aiceooffice 数据库必须
- PostgreSQL (20MB) - 某些应用需要
- auth-service, tiaozhan, forum, store, admin, travel-guide

**Why:** 释放内存，支持后续功能开发
**How to apply:** 后续静态内容更新参考上面的更新命令。
