#!/usr/bin/env bash
# ============================================
# 童慧行 · AI 爬虫 UA 监控脚本
# 统计 GPTBot / ClaudeBot / Claude-SearchBot / Bytespider / PerplexityBot 等
# 在 nginx access log 中的命中情况
# 输出到 /grandkidsgo/logs/ai-bot-stats-YYYY-MM-DD.log
# ============================================

set -euo pipefail

NGINX_LOG_DIR="/var/log/nginx"        # access.log 所在目录
OUTPUT_DIR="/grandkidsgo/logs"
DATE=$(date +%Y-%m-%d)
LOG_FILE="${OUTPUT_DIR}/ai-bot-stats-${DATE}.log"

mkdir -p "$OUTPUT_DIR"

# 检测当前激活的 access log（access.log 可能是符号链接到 access.log-YYYYMMDD）
ACCESS_LOG=""
for f in "${NGINX_LOG_DIR}/access.log" "${NGINX_LOG_DIR}/access.log-$(date +%Y%m%d)" "${NGINX_LOG_DIR}/access.log-1"; do
  if [ -f "$f" ]; then
    ACCESS_LOG="$f"
    break
  fi
done

if [ -z "$ACCESS_LOG" ]; then
  echo "⚠️  未找到 nginx access log，请检查 ${NGINX_LOG_DIR}" >&2
  exit 1
fi

echo "📊 AI 爬虫命中统计 · $(date '+%Y-%m-%d %H:%M:%S')"
echo "   源日志: $ACCESS_LOG"
echo "   输出:   $LOG_FILE"
echo

{
  echo "📊 童慧行 AI 爬虫命中统计 · ${DATE}"
  echo "源日志: $ACCESS_LOG"
  echo "================================="
  echo

  # AI Bot 列表（UA token → 显示名）
  declare -A BOTS=(
    ["GPTBot"]="OpenAI GPTBot (训练)"
    ["OAI-SearchBot"]="OpenAI Search (检索)"
    ["ChatGPT-User"]="OpenAI ChatGPT 用户触发"
    ["ClaudeBot"]="Anthropic ClaudeBot (训练)"
    ["Claude-User"]="Anthropic Claude 用户触发"
    ["Claude-SearchBot"]="Anthropic Search (检索)"
    ["Claude-Web"]="Anthropic Web"
    ["PerplexityBot"]="Perplexity (训练)"
    ["Perplexity-User"]="Perplexity 用户触发"
    ["Bytespider"]="字节豆包 / 抖音 (不遵守 robots)"
    ["Google-Extended"]="Google Gemini 训练"
    ["Applebot-Extended"]="Apple Intelligence 训练"
    ["CCBot"]="Common Crawl (开源训练)"
    ["Baiduspider"]="百度"
    ["360Spider"]="360 智脑 / 纳米搜索"
    ["Sogou Pic Spider"]="搜狗 / 微信元宝"
    ["TencentTraveler"]="微信元宝"
  )

  # 按 UA 统计命中数 + Top URL
  for UA in "${!BOTS[@]}"; do
    LABEL="${BOTS[$UA]}"
    COUNT=$(grep -c "$UA" "$ACCESS_LOG" 2>/dev/null || echo 0)
    if [ "$COUNT" -gt 0 ]; then
      echo "🤖 [$UA] $LABEL"
      echo "   命中次数: $COUNT"
      echo "   Top 10 URL:"
      grep "$UA" "$ACCESS_LOG" \
        | awk -F'"' '{print $4}' \
        | grep -oE 'https?://[^ "]+|/[^ "]+' \
        | sort | uniq -c | sort -rn | head -10 \
        | sed 's/^/     /'
      echo
    fi
  done

  echo "================================="
  echo "📈 总 AI Bot 命中: $(grep -ciE '(GPTBot|ClaudeBot|Claude-Web|Claude-SearchBot|Claude-User|ChatGPT-User|OAI-SearchBot|PerplexityBot|Perplexity-User|Bytespider|Google-Extended|Applebot-Extended|CCBot)' $ACCESS_LOG 2>/dev/null || echo 0)"
} > "$LOG_FILE" 2>&1

echo "✅ 已生成 $LOG_FILE"
echo
echo "预览（前 40 行）："
head -40 "$LOG_FILE"
