---
name: launch-readiness-2026-06-26
description: 7月上线前的实际状态盘点 + 必修/应修/可延后 TODO 清单
metadata:
  type: project
  status: todo
  originSessionId: 2026-06-26
  priority: critical
---

# 2026-06-26 上线前体检（距 7月1日还有 5 天）

## 架构现状（实际生效链路）
- **Caddy（边缘 80/443）** → **docker `haodaer-nginx`（容器内 80）** → 静态 + 反代 auth/tiaozhan/travel/admin
- host 上的 `/etc/nginx/sites-enabled/grandand.com.conf` **没有被实际加载**（host 80 端口空着）
- 静态文件实际路径：`/usr/share/nginx/html/{main,xueshici,xueguoxue,xuetongshi,english,mobile}/`（容器内）
- 容器配置：`docker exec haodaer-nginx cat /etc/nginx/conf.d/haodaer.conf`

## ✅ 状态良好的（不用动）
- 9 个站点主页 200 + SSL 9/7 到期
- 诗词 5680 音频 / 国学 4232 音频 / 通识 4431 sections / 英语 3340 词 + 2202 音频
- 容器 nginx / Caddy / docker 容器稳定运行 2 周+
- tiaozhan 14195 题 / 1 用户（够自测）
- auth DB 有 parent_consent / youth_mode / children 表（合规基础）

## 🔥 P0 必修（不修不能上线）

### 1. forum.grandand.com 瘫痪
- nginx server 块被双重注释（`# #`）于 `/etc/nginx/sites-enabled/grandand.com.conf` 第 235-281 行
- 3005 端口无进程监听
- 修复：
  ```bash
  # A. 取消注释 + 重载 nginx
  # B. cd /haodaer/apps/forum && node server/index.js &  或加 systemd
  ```
- 备份可参考：`/etc/nginx/sites-enabled/grandand.com.conf.bak.20260616` 第 235-281 行

### 2. store.grandand.com 瘫痪（同样根因）
- 同上，第 259-281 行注释 + 3006 端口无进程
- 修复：取消注释 + `cd /haodaer/apps/store && node server/index.js &`

### 3. grandand.com/faq 和 /legal 404（合规红线）
- 容器 nginx `/etc/nginx/conf.d/haodaer.conf` 把 `/faq` 和 `/legal` 用 alias 指到 `/var/www/pages/{faq,legal}/`
- **目录根本没创建**
- 两种修法（推荐后者，跟 SPA 一致）：
  - A. 改容器 nginx 配置，把 `/faq /legal` 改成 `try_files $uri /index.html`（让 SPA 处理）
  - B. 在容器里 mkdir -p /var/www/pages/{faq,legal} 并放静态文件

### 4. JWT_SECRET 是字面量 "dev"
- `/haodaer/apps/auth-service/.env` JWT_SECRET=haodaer-jwt-secret-dev
- `/haodaer/apps/travel-guide/.env` JWT_SECRET=haodaer-jwt-secret-2026
- 改成随机 64 字符 + 重启服务

### 5. systemd 服务全 disabled（无进程守护）
- haodaer-{auth,tiaozhan,forum,store,admin,main}.service 都是 disabled
- auth/tiaozhan/admin 进程裸跑，崩了不会自启
- 修复：`systemctl enable --now haodaer-{auth,tiaozhan,admin}.service`

## ⚠️ P1 应修（上线后尽快修但可临时放行）

### 6. DB 完全没自动备份
- crontab 只有 aiceooffice 备份，好大儿 DB 无备份策略
- 数据量：forum.db 4KB（空表）/ store.db 4KB（空表）/ auth.db / tiaozhan 14195 题
- 加 cron：每天 03:00 备份 /haodaer/apps/*/data/*.db 到 /haodaer/backup/db/

### 7. travel 攻略数据稀疏（5 篇）
- 走天下核心是攻略分享，5 篇上线会被吐槽
- 解决方案：
  - A. 跑 seed.ts 生成示例攻略（至少 20 篇覆盖 5 类目的地）
  - B. 上线后引导用户贡献（无种子则冷启动难）

### 8. mobile dist 没部署到容器
- mobile 是 uni-app H5，dist 在 host /haodaer/apps/mobile/dist/
- 容器内 /usr/share/nginx/html/mobile 不存在
- m.grandand.com 当前实际指向 main-site dist（fallback 兜底）
- 决策：上线前要不要发布 mobile 独立 H5？还是继续把 m.grandand.com 走 main-site？

### 9. xuetongshi 1100 张真图待 retry
- /Users/eighteenman/工作/好大儿/scripts/generate-xuetongshi-images/search-status.json
- 371 fail / 881 skip / 411 ok，剩 1663 个待补
- 6-24 memory: MiniMax 充值后跑 `--retry`
- 上线时如果覆盖率仍 < 100%，部分 topic 用占位图也行，但要标明

### 10. WeChat OAuth 空配置
- WECHAT_APP_ID / WECHAT_APP_SECRET 都空
- 短信 SMS_ACCESS_KEY 也空
- 上线前确认：只走手机号验证码？还是补 OAuth？
- 补 OAuth 需要走微信开放平台审核（1-3 天）

## 🟡 P2 可延后（不影响上线）

### 11. Caddy 配置备份
- docker caddy-proxy 配置无版本控制
- 建议 caddy config dump > /haodaer/caddy-config-backup.json

### 12. host nginx 配置冗余
- /etc/nginx/sites-enabled/grandand.com.conf 内容跟容器内 conf.d/haodaer.conf 重复但 host 不加载
- 是历史遗留，建议清理（但不影响生产）

### 13. 8 个备份 nginx conf 文件占空间
- /etc/nginx/sites-available/ 5+ 个 .bak 文件
- 清理可释放几 KB

## 检查脚本（重复体检用）
```bash
ssh root@47.114.77.124 "
echo '---端口---' && ss -tlnp | grep -E ':300|:301|:3099|:3020';
echo '---curl 健康---' && for u in grandand.com travel.grandand.com tiaozhan.grandand.com forum.grandand.com store.grandand.com xueshici.grandand.com xueguoxue.grandand.com xuetongshi.grandand.com english.grandand.com admin.grandand.com m.grandand.com grandand.com/faq grandand.com/legal; do
  code=\$(curl -sk -o /dev/null -w '%{http_code}' https://\$u --max-time 5)
  echo \"\$u → \$code\"
done
"
```

**Why:** 距 7 月上线还有 5 天，必须先盘清现状再分优先级修
**How to apply:** 每次修完一个 P0 项就 commit + 部署，deploy 后跑上面的健康检查脚本验证