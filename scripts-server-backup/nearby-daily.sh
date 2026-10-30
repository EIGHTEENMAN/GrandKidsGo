#!/bin/bash
# 每日 quota 重置后自动跑一城 13-nearby（早上 0:05 之后高德 quota 5k 已重置）
# **缺口驱动**：每次跑 nearby < spot 的城，按缺口（spot - nearby）降序选最大缺口的城
# AMAP 个人开发者 QPS=3，单城 933-1322 spot 约 12-18 min（rate ~1.3/s）
# quota 触顶会自然退出（"Amap 429: 达每日配额 5000"），下次 cron 再续
#
# 2026-10-16 修复：13-nearby 返回非 0 时**不前进 state**，明早同一城继续
# - 退出码 2 = 0 spot（上游 04-import 漏跑 / AI enrich 失败，需人工排查）
# - 退出码 1 = 真异常（state 也不前进）
# - 退出码 0 = 正常（哪怕 quota 触顶中途退出）
#
# 2026-10-19 改进：缺口驱动取代顺序队列
# - 旧：state=NEXT_CITY 顺序推进 → 队列末尾的 changsha/tianjin 缺口永不会自动回来
# - 新：每次查所有城市的 (spot - nearby) gap，pick 最大的跑
# - 完全 100% 的城不跑（避免 cache miss 浪费）
#
# 2026-10-30 修复（配额封禁 8 天后的止血）：
# - 高德「搜索类」配额（place/around 等）自 2026-10-22 起被 10044 封死，
#   而旧版错误分类把 10044 误判成 QPS 限流 → 告警被吞 → 脚本每天空烧
#   9058 次失败调用、产出 0 条数据，且 cron.log 一路显示"✅ 正常"。
# - 现在：13-collect-nearby 会在 around 撞到 10044 时**自动切 regeo**
#   （地理编码桶，独立配额，2026-10-29 实测单日可跑 30000 次）。
# - 本脚本再加两道保险：
#   1) 跑前 curl 探一下搜索桶，死了就显式 --mode=regeo（不浪费一次失败调用）
#   2) --max-calls 限制单轮调用数，避免一次跑爆整个地理编码桶
#   3) 13 退出码 3 = 两个桶都耗尽 → 本日不再重试，等明早 00:10 自动重置

set -a
. /grandkidsgo/apps/travel-guide/.env
set +a
cd /grandkidsgo/apps/travel-guide

STATE=/root/.nearby-state
LOGDIR=/root/nearby-logs
mkdir -p "$LOGDIR"

# 9 城列表（顺序无所谓，缺口驱动会自动挑）
ALL_CITIES=(beijing shanghai guangzhou chengdu hangzhou shenzhen nanjing suzhou chongqing xian xiamen qingdao wuhan tianjin changsha)

# 选缺口最大的城（spot - nearby 降序，>0 才选；0=全 100% 跳过）
CITY=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const cities = $(printf '%s\n' \"${ALL_CITIES[@]}\" | jq -R . | jq -s 'map(select(length>0))' 2>/dev/null || echo '[]');
" 2>/dev/null)

# jq 不可用时退化到 awk
if [ -z "$CITY" ] || [ "$CITY" = "[]" ]; then
  CITY=""
  max_gap=0
  for c in "${ALL_CITIES[@]}"; do
    stats=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.all([
  p.spot.count({ where: { cityId: 'city-${c}' } }),
  p.spot.count({ where: { cityId: 'city-${c}', nearbyFacilities: { not: null } } }),
]).then(([t, d]) => { console.log(\`\${t} \${d}\`); p.\$disconnect(); });
" 2>/dev/null)
    spot_n=$(echo "$stats" | awk '{print $1}')
    near_n=$(echo "$stats" | awk '{print $2}')
    gap=$((spot_n - near_n))
    if [ "$gap" -gt "$max_gap" ]; then
      max_gap=$gap
      CITY=$c
    fi
  done
fi

# 兜底（node 整体失败）：用静态顺序
if [ -z "$CITY" ]; then
  CITY="chongqing"
fi

TS=$(date +%Y%m%d-%H%M)
LOG="$LOGDIR/${CITY}-${TS}.log"

# 检查 spot 是否已入库；为 0 时自动补 01-pull → 02-enrich → 04-import（消耗 POI quota ~几百）
SPOT_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.spot.count({ where: { cityId: 'city-${CITY}' } }).then(n => { console.log(n); p.\$disconnect(); });
" 2>/dev/null || echo 0)

if [ "$SPOT_COUNT" = "0" ] || [ -z "$SPOT_COUNT" ]; then
  echo "[nearby-daily] $CITY spot=0，跑 01→02→04 入库" >> "$LOGDIR/cron.log"
  npx tsx src/lib/data-pipeline/01-amap-pull.ts --city="$CITY" >> "$LOG" 2>&1 || { echo "[nearby-daily] 01 失败，state 不前进" >> "$LOGDIR/cron.log"; exit 1; }
  npx tsx src/lib/data-pipeline/02-ai-enrich.ts --city="$CITY" >> "$LOG" 2>&1 || { echo "[nearby-daily] 02 失败，state 不前进" >> "$LOGDIR/cron.log"; exit 1; }
  npx tsx src/lib/data-pipeline/04-import-db.ts --city="$CITY" >> "$LOG" 2>&1 || { echo "[nearby-daily] 04 失败，state 不前进" >> "$LOGDIR/cron.log"; exit 1; }
fi

echo "[nearby-daily] 跑 13-nearby $CITY → $LOG" >> "$LOGDIR/cron.log"

# 2026-10-30：跑前探测搜索桶是否还活着。
# 搜索桶（place/around）与地理编码桶（geocode/regeo）配额独立；
# 搜索桶封禁时用 regeo 走另一个桶，避免每天白烧 9000 次失败调用。
SEARCH_ALIVE=$(curl -s --max-time 20 \
  "https://restapi.amap.com/v3/place/around?key=${AMAP_API_KEY}&location=120.3826,36.0671&radius=2000&types=060101&offset=5&page=1&extensions=base" \
  2>/dev/null | grep -c '"status":"1"' || echo 0)

MODE="auto"
if [ "$SEARCH_ALIVE" = "0" ]; then
  MODE="regeo"
  echo "[nearby-daily] ⚠️  搜索类配额已耗尽（10044），本轮显式用 --mode=regeo（地理编码桶，独立配额）" >> "$LOGDIR/cron.log"
fi

# 单轮调用上限：留余量给明早，明早接着跑同一个城
npx tsx src/lib/data-pipeline/13-collect-nearby.ts \
  --city="$CITY" --concurrency=2 --mode="$MODE" --max-calls=4000 \
  >> "$LOG" 2>&1
RC=$?

# 13 退出码：0 = 正常推进 / 1 = 异常 state 不动 / 2 = spot=0 严重 / 3 = 两个配额桶都耗尽
if [ $RC -eq 3 ]; then
  echo "[nearby-daily] 🛑 搜索桶 + 地理编码桶都已耗尽，$CITY 今日无法采集，等明早 00:10 自动重置" >> "$LOGDIR/cron.log"
  exit 3
fi
if [ $RC -ne 0 ]; then
  echo "[nearby-daily] ⚠️  13-nearby 退出码=$RC $CITY，state 保留为 $CITY，明天重试本城" >> "$LOGDIR/cron.log"
  exit $RC
fi

# 缺口驱动：无需 NEXT_CITY；每次跑前重新选缺口最大的城
# 清掉旧 state（防止顺序队列残留）
rm -f "$STATE"
echo "[nearby-daily] 缺口驱动：明早重新选最大缺口城" >> "$LOGDIR/cron.log"
