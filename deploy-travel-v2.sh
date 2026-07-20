#!/bin/bash
# deploy-travel-v2.sh
# 走天下 v2.0 完整部署到 47.114.77.124
# 用法: bash deploy-travel-v2.sh

set -euo pipefail

SERVER="root@47.114.77.124"
REMOTE="/grandkidsgo/apps/travel-guide"
SOURCE="/Users/shibaxia/工作/童慧行/apps/travel-guide"

echo "=== 1. rsync 同步代码 ==="
rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='*.tsbuildinfo' \
  --exclude='.env' \
  --exclude='.env.local' \
  "$SOURCE/" "$SERVER:$REMOTE/"

echo "=== 2. 安装生产依赖 ==="
ssh "$SERVER" "cd $REMOTE && npm ci --omit=dev --ignore-scripts 2>&1 | tail -5"

echo "=== 3. 生成 Prisma Client ==="
ssh "$SERVER" "cd $REMOTE && npx prisma generate 2>&1 | tail -5"

echo "=== 4. 备份旧数据 + 改名旧表 ==="
ssh "$SERVER" "PGPASSWORD='HaodaerDB@2026' psql -h 127.0.0.1 -U haodaer -d travel_guide <<'SQL'
-- 备份：把旧表改名（保留数据）
DO \$\$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' AND tablename NOT LIKE '\\_prisma%'
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I RENAME TO v1_%I', tbl, tbl);
  END LOOP;
END \$\$;
SQL
"

echo "=== 5. 跑迁移 ==="
# 先忽略 Pending 迁移，直接 apply
ssh "$SERVER" "cd $REMOTE && npx prisma migrate deploy 2>&1 | tail -20"

echo "=== 6. Seed 种子数据 ==="
ssh "$SERVER" "cd $REMOTE && npx tsx src/lib/data-pipeline/04-import-db.ts 2>&1 | tail -5"
ssh "$SERVER" "cd $REMOTE && npx tsx src/lib/data-pipeline/06-seed-badges.ts 2>&1 | tail -5"
ssh "$SERVER" "cd $REMOTE && npx tsx src/lib/data-pipeline/08-snapshot-leaderboard.ts 2>&1 | tail -10"

echo "=== 7. Build Next.js ==="
ssh "$SERVER" "cd $REMOTE && npm run build 2>&1 | tail -10"

echo "=== 8. 重启 PM2 ==="
ssh "$SERVER" "pm2 restart travel-guide 2>&1"
sleep 3
ssh "$SERVER" "pm2 show travel-guide 2>&1 | grep status"

echo "=== 9. 验证 ==="
sleep 2
curl -s "https://travel.grandand.com/api/guides/feed" | python3 -m json.tool 2>/dev/null | head -10
echo "..."
curl -s "https://travel.grandand.com/api/guides/hot-badges" | python3 -m json.tool 2>/dev/null
echo ""
echo "=== 部署完成! ==="
