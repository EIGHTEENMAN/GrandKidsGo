#!/bin/bash
# SSL 证书过期监控
# 检查 grandand.com 通配证书剩余天数，< 14 天写日志 + 输出告警
# 建议 cron: 0 9 * * * /grandkidsgo/scripts/ssl-expiry-monitor.sh
# 2026-09-01 紧急添加：证书已过期 13 天未发现

CERT=/etc/letsencrypt/live/travel.grandand.com/fullchain.pem
LOG=/grandkidsgo/logs/ssl-expiry.log
WARN_DAYS=14
CRITICAL_DAYS=3

mkdir -p "$(dirname "$LOG")"

if [ ! -f "$CERT" ]; then
  echo "[$(date -Iseconds)] CRITICAL: cert not found at $CERT" >> "$LOG"
  echo "SSL CERT NOT FOUND" >&2
  exit 2
fi

NOT_AFTER=$(openssl x509 -in "$CERT" -noout -enddate 2>&1 | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$NOT_AFTER" +%s 2>/dev/null)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "[$(date -Iseconds)] cert=$CERT notAfter=$NOT_AFTER days_left=$DAYS_LEFT" >> "$LOG"

if [ "$DAYS_LEFT" -lt 0 ]; then
  echo "🚨 SSL CERT EXPIRED ${DAYS_LEFT#-} DAYS AGO — RENEW IMMEDIATELY" >&2
  exit 1
elif [ "$DAYS_LEFT" -lt "$CRITICAL_DAYS" ]; then
  echo "🚨 SSL cert expires in $DAYS_LEFT days (< $CRITICAL_DAYS critical)" >&2
  exit 1
elif [ "$DAYS_LEFT" -lt "$WARN_DAYS" ]; then
  echo "⚠️  SSL cert expires in $DAYS_LEFT days (< $WARN_DAYS warn)" >&2
  exit 0
else
  echo "✅ SSL cert OK: $DAYS_LEFT days remaining"
  exit 0
fi