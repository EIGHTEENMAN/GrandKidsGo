#!/usr/bin/env bash
# 童慧行静态站部署脚本
# 用法: ./scripts/deploy.sh <app-name>
# 例如: ./scripts/deploy.sh main-site
#
# 行为:
#   1. 备份服务器当前版本到 /grandkidsgo/.backup/<app>/<timestamp>/
#   2. rsync dist/ 到 /grandkidsgo/nginx/html/<app>/
#   3. 部署后 grep 验证关键文件（dist/index.html 必须包含 <div id="app">）
#   4. 验证失败自动回滚到备份
#
# 注意：目标路径必须和 nginx 配置的 root 一致（见 grandkidsgo/nginx/conf.d/haodaer.conf）

set -e

APP_NAME="${1:-}"
if [ -z "$APP_NAME" ]; then
  echo "用法: $0 <app-name>" >&2
  echo "  例如: $0 main-site" >&2
  exit 1
fi

# 服务器配置
SERVER="root@47.114.77.124"
NGINX_HTML_DIR="/grandkidsgo/nginx/html"   # 宿主机路径（容器 /usr/share/nginx/html 的 bind mount 源）
BACKUP_BASE="/grandkidsgo/.backup"

# app 名 → nginx 实际 root 目录名 的映射
# 原因：nginx 配置里 root 路径可能和 app 名不同（如 main-site 实际对应 main/）
# 添加新 app 时，在这里追加一行
nginx_dir_for() {
  case "$1" in
    main-site) echo "main" ;;
    *)         echo "$1" ;;
  esac
}

# app 名 → 部署策略
#   full       默认：rsync dist/ 全部子目录（含 audio/images）
#   skip-media media 类资源服务侧独立维护（GB 级且由专门 pipeline 推送），
#               deploy 时不删不传，避免 --delete 把服务端 media 删掉
# 添加新 app 时，在这里追加一行
deploy_strategy_for() {
  case "$1" in
    xueshici) echo "skip-media" ;;
    *)        echo "full" ;;
  esac
}

# 本地 dist 路径（脚本位置推导：apps/<app>/dist → apps/<app>/）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/apps/$APP_NAME"
LOCAL_DIST="$APP_DIR/dist"

# 预检
if [ ! -d "$LOCAL_DIST" ]; then
  echo "❌ 找不到 $LOCAL_DIST，请先 npm run build" >&2
  exit 1
fi

# 检查 dist 是否包含 index.html
if [ ! -f "$LOCAL_DIST/index.html" ]; then
  echo "❌ $LOCAL_DIST/index.html 不存在，build 可能失败" >&2
  exit 1
fi

# 解析 nginx 实际目录名
NGINX_DIR_NAME="$(nginx_dir_for "$APP_NAME")"
if [ "$NGINX_DIR_NAME" != "$APP_NAME" ]; then
  echo "ℹ️  app 名 '$APP_NAME' 映射到 nginx 目录 '$NGINX_DIR_NAME'"
fi

REMOTE_TARGET="$SERVER:$NGINX_HTML_DIR/$NGINX_DIR_NAME/"

echo "📦 部署 $APP_NAME"
echo "  本地: $LOCAL_DIST"
echo "  远程: $REMOTE_TARGET"
echo

# 1) 备份服务器当前版本
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_BASE/$APP_NAME/$TIMESTAMP"
echo "💾 备份当前版本到 $BACKUP_DIR"
ssh "$SERVER" "mkdir -p '$BACKUP_DIR' && cp -r '$NGINX_HTML_DIR/$NGINX_DIR_NAME'/. '$BACKUP_DIR'/ 2>/dev/null || true"

# 2) rsync 部署
#    --exclude '._*'     过滤 macOS AppleDouble 元数据文件
#    skip-media 策略再加 --exclude='audio/' --exclude='images/'：
#    服务端这两类资源 (GB 级) 由专门 pipeline 独立维护，deploy 不能动
STRATEGY="$(deploy_strategy_for "$APP_NAME")"
RSYNC_OPTS="-av --delete --exclude='._*'"
if [ "$STRATEGY" = "skip-media" ]; then
  RSYNC_OPTS="$RSYNC_OPTS --exclude='audio/' --exclude='images/'"
fi
echo "🚀 rsync 部署中... (策略: $STRATEGY)"
rsync $RSYNC_OPTS "$LOCAL_DIST/" "$REMOTE_TARGET"

# 把 dist 内的入口文件展到 nginx root，让 nginx location / 和 /assets/ 直接命中
# 注：上面的 rsync 已经把 dist/ 内容同步到 nginx root；skip-media 下保留 audio/images，
# 而 dist/audio/ dist/images/ 因为 --exclude 被排除，自然不会污染服务端的 media 资源。
# 备份快照：dist 内容已在 nginx root，仍可作下一版天然备份（rsync --delete 清理掉 dist/audio/images 但保留 dist/{index.html,assets/} = 部署前后内容相同）
if [ "$STRATEGY" = "skip-media" ]; then
  echo "ℹ️  skip-media 策略确认完成（nginx root = dist 内容平铺；audio/images 服务端独立保留）"
fi

# 3) 部署后验证
echo "🔍 部署后验证..."
REMOTE_INDEX="$NGINX_HTML_DIR/$NGINX_DIR_NAME/index.html"

# 检查 index.html 是否包含 Vue 挂载点
if ! ssh "$SERVER" "grep -q 'id=\"app\"' '$REMOTE_INDEX' 2>/dev/null"; then
  echo "❌ 验证失败：$REMOTE_INDEX 缺少 <div id=\"app\">，触发回滚" >&2
  ssh "$SERVER" "rm -rf '$NGINX_HTML_DIR/$NGINX_DIR_NAME' && cp -r '$BACKUP_DIR' '$NGINX_HTML_DIR/$NGINX_DIR_NAME'"
  echo "✅ 已回滚到 $BACKUP_DIR" >&2
  exit 2
fi

# 检查 dist 大小
REMOTE_SIZE=$(ssh "$SERVER" "du -sk '$NGINX_HTML_DIR/$NGINX_DIR_NAME' 2>/dev/null | awk '{print \$1}'")
LOCAL_SIZE=$(du -sk "$LOCAL_DIST" | awk '{print $1}')
if [ "$REMOTE_SIZE" -lt $((LOCAL_SIZE / 2)) ]; then
  echo "⚠️  警告：远程大小 ($REMOTE_SIZE) 远小于本地 ($LOCAL_SIZE)，请检查"
fi

echo
echo "✅ 部署完成"
echo "  备份位置: $BACKUP_DIR"
echo "  远程路径: $REMOTE_TARGET"
