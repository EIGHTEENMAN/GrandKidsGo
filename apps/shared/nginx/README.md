# Nginx 配置

这是 `/grandkidsgo/nginx/conf.d/haodaer.conf` 的镜像副本。

## 部署方式

服务器实际路径：`/grandkidsgo/nginx/conf.d/haodaer.conf`（通过 docker bind mount 给 grandkidsgo-nginx 容器读）

### 修改流程
1. 在 `grandand-nginx.conf` 改文件
2. 复制到服务器：
   ```bash
   ssh root@47.114.77.124 'docker exec grandkidsgo-nginx nginx -t'
   docker cp apps/shared/nginx/grandand-nginx.conf grandkidsgo-nginx:/etc/nginx/conf.d/haodaer.conf
   docker exec grandkidsgo-nginx nginx -s reload
   ```

## 包含的安全 Headers（每个 location 都有）
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

## 反代应用
- grandand.com → main
- auth.grandand.com → 172.17.0.1:3007 (auth-service)
- xueshici/xueguoxue/xuetongshi/english/tiaozhan/admin/mobile → 各自静态
