#!/usr/bin/env bash
# 童慧行静态站部署脚本
# 用法:
#   ./scripts/deploy.sh <app-name>                    # 默认 text-full
#   ./scripts/deploy.sh <app-name> text-full          # dist 整包 (含 audio/images 默认排除)
#   ./scripts/deploy.sh <app-name> text <field>       # 只 rsync dist/{index.html,assets/} <field> 是用于日记式，不做处理
#   ./scripts/deploy.sh <app-name> audio <type>        # audio/original | audio/translation | audio/interpretation | audio/all
#   ./scripts/deploy.sh <app-name> images              # images/
#
# 行为 (取决于策略):
#   1. 备份服务器当前版本到 /grandkidsgo/.backup/<app>/<timestamp>/
#      （skip-media 策略下不备份 media，只备份 dist + index.html）
#   2. rsync dist/ 或 audio/<type>/ 或 images/ 到服务器
#   3. 部署后 grep 验证关键文件（dist/index.html 必须包含 <div id="app">）
#   4. 验证失败自动回滚到备份

set -e

APP_NAME="${1:-}"
KIND="${2:-text-full}"      # text-full | text | audio | images
SUBTYPE="${3:-}"            # audio 时为 original|translation|interpretation|all

if [ -z "$APP_NAME" ]; then
  echo "用法: $0 <app-name> [text-full|text [field]|audio <type>|images]" >&2
  echo "  例如: $0 main-site" >&2
  echo "        $0 xueshici text" >&2
  echo "        $0 xueshici audio original" >&2
  echo "        $0 xueshici audio all" >&2
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

# 本地 dist 路径
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/apps/$APP_NAME"
LOCAL_DIST="$APP_DIR/dist"

# 解析 nginx 实际目录名
NGINX_DIR_NAME="$(nginx_dir_for "$APP_NAME")"
if [ "$NGINX_DIR_NAME" != "$APP_NAME" ]; then
  echo "ℹ️  app 名 '$APP_NAME' 映射到 nginx 目录 '$NGINX_DIR_NAME'"
fi
REMOTE_ROOT="$SERVER:$NGINX_HTML_DIR/$NGINX_DIR_NAME/"

echo "📦 部署 $APP_NAME"
echo "  远程 root: $REMOTE_ROOT"
echo "  类型: $KIND ${SUBTYPE:+($SUBTYPE)}"
echo

# 备份：通用函数。$1 = "full" 备份整个；$1 = "lite" 只备份 dist + index.html
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_BASE/$APP_NAME/$TIMESTAMP"

do_backup() {
  local mode="$1"  # full | lite
  if [ "$mode" = "lite" ]; then
    ssh "$SERVER" "mkdir -p '$BACKUP_DIR' && \
      rsync -a '$NGINX_HTML_DIR/$NGINX_DIR_NAME/dist/' '$BACKUP_DIR/dist/' 2>/dev/null; \
      cp '$NGINX_HTML_DIR/$NGINX_DIR_NAME/index.html' '$BACKUP_DIR/' 2>/dev/null || true"
  else
    ssh "$SERVER" "mkdir -p '$BACKUP_DIR' && \
      cp -r '$NGINX_HTML_DIR/$NGINX_DIR_NAME'/. '$BACKUP_DIR'/ 2>/dev/null || true"
  fi
}

# 通用 rsync option：排除 macOS AppleDouble

# ===== Backup 保留策略：每个 app 只保留最近 5 个 backup =====
cleanup_old_backups() {
  local app_name="$1"
  local keep=5
  ssh "$SERVER" "cd '$BACKUP_BASE/$app_name' && ls -dt */ 2>/dev/null | tail -n +$((keep + 1)) | xargs -r rm -rf" 2>/dev/null || true
}

RSYNC_BASE=(
  -av
  --delete
  --exclude='._*'
  --filter="protect audio/**"
  --filter="protect images/**"
)

# 分发到不同 deploy 路径
case "$KIND" in
  text-full)
    if [ ! -d "$LOCAL_DIST" ]; then
      echo "❌ 找不到 $LOCAL_DIST，请先 npm run build" >&2
      exit 1
    fi
    if [ ! -f "$LOCAL_DIST/index.html" ]; then
      echo "❌ $LOCAL_DIST/index.html 不存在，build 可能失败" >&2
      exit 1
    fi
    # skip-media 策略：audio/images 服务端独立，跳过
    RSYNC_OPTS=("${RSYNC_BASE[@]}" '--exclude=audio/' '--exclude=images/')
    echo "💾 备份 (lite: 仅 dist + index.html)"
    do_backup lite
    echo "🚀 rsync dist/ → nginx root"
    rsync "${RSYNC_OPTS[@]}" "$LOCAL_DIST/" "$REMOTE_ROOT"
    # 把 dist/index.html 和 dist/assets/ 从本地 rsync 到 nginx root（让 location / 和 /assets/ 直接命中）。
    # 注意：上面 rsync 已平铺 dist/ → nginx root，并 --delete 清掉 dist/ 副本；这里从 LOCAL 源头上传。
    rsync -av "$LOCAL_DIST/index.html" "$SERVER:$NGINX_HTML_DIR/$NGINX_DIR_NAME/index.html"
    rsync -av --delete "$LOCAL_DIST/assets/" "$SERVER:$NGINX_HTML_DIR/$NGINX_DIR_NAME/assets/"
    ;;
  text)
    if [ -z "$SUBTYPE" ] || [ "$SUBTYPE" = "all" ]; then
      echo "💾 备份 (lite)"
      do_backup lite
      echo "🚀 rsync dist/ → nginx root (无音频 + 图片子目录)"
      RSYNC_OPTS=("${RSYNC_BASE[@]}" '--exclude=audio/' '--exclude=images/')
      rsync "${RSYNC_OPTS[@]}" "$LOCAL_DIST/" "$REMOTE_ROOT"
      rsync -av "$LOCAL_DIST/index.html" "$SERVER:$NGINX_HTML_DIR/$NGINX_DIR_NAME/index.html"
      rsync -av --delete "$LOCAL_DIST/assets/" "$SERVER:$NGINX_HTML_DIR/$NGINX_DIR_NAME/assets/"
    else
      echo "❌ text 模式不支持 SUBTYPE='$SUBTYPE'（用 text full 替代）" >&2
      exit 1
    fi
    ;;
  audio)
    if [ -z "$SUBTYPE" ]; then
      echo "❌ audio 模式需要指定 type：original | translation | interpretation | all" >&2
      exit 1
    fi
    case "$SUBTYPE" in
      original|translation|interpretation)
        SRC="apps/$APP_NAME/public/audio/$SUBTYPE"
        if [ ! -d "$SRC" ]; then
          echo "❌ 找不到 $SRC" >&2
          exit 1
        fi
        echo "🚀 rsync audio/$SUBTYPE → 服务端"
        # 只备份这一类 audio (变少了)，不备份其他类型
        ssh "$SERVER" "mkdir -p '$BACKUP_DIR' && rsync -a '$NGINX_HTML_DIR/$NGINX_DIR_NAME/audio/$SUBTYPE/' '$BACKUP_DIR/audio-$SUBTYPE/' 2>/dev/null || true"
        rsync ${RSYNC_BASE[@]} "$SRC/" "$SERVER:$NGINX_HTML_DIR/$NGINX_DIR_NAME/audio/$SUBTYPE/"
        ;;
      all)
        if [ ! -d "$APP_DIR/public/audio" ]; then
          echo "❌ 找不到 $APP_DIR/public/audio" >&2
          exit 1
        fi
        echo "🚀 rsync audio/ 全部 → 服务端"
        ssh "$SERVER" "mkdir -p '$BACKUP_DIR' && rsync -a '$NGINX_HTML_DIR/$NGINX_DIR_NAME/audio/' '$BACKUP_DIR/audio/' 2>/dev/null || true"
        rsync ${RSYNC_BASE[@]} "$APP_DIR/public/audio/" "$SERVER:$NGINX_HTML_DIR/$NGINX_DIR_NAME/audio/"
        ;;
      *)
        echo "❌ 未知的 audio type '$SUBTYPE'" >&2
        exit 1
        ;;
    esac
    ;;
  images)
    if [ ! -d "$APP_DIR/public/images" ]; then
      echo "❌ 找不到 $APP_DIR/public/images" >&2
      exit 1
    fi
    echo "🚀 rsync images/ → 服务端"
    ssh "$SERVER" "mkdir -p '$BACKUP_DIR' && rsync -a '$NGINX_HTML_DIR/$NGINX_DIR_NAME/images/' '$BACKUP_DIR/images/' 2>/dev/null || true"
    rsync ${RSYNC_BASE[@]} "$APP_DIR/public/images/" "$SERVER:$NGINX_HTML_DIR/$NGINX_DIR_NAME/images/"
    ;;
  *)
    echo "❌ 未知 kind '$KIND'。支持: text-full | text | audio | images" >&2
    exit 1
    ;;
esac

# 仅 text-full / text 需要验证（audio/images 是静态资源 mp3/jpg，无须检查)
if [ "$KIND" = "text-full" ] || [ "$KIND" = "text" ]; then
  echo "🔍 部署后验证..."
  REMOTE_INDEX="$NGINX_HTML_DIR/$NGINX_DIR_NAME/index.html"

  if ! ssh "$SERVER" "grep -q 'id=\"app\"' '$REMOTE_INDEX' 2>/dev/null"; then
    echo "❌ 验证失败：$REMOTE_INDEX 缺少 <div id=\"app\">，触发回滚" >&2
    ssh "$SERVER" "rm -rf '$NGINX_HTML_DIR/$NGINX_DIR_NAME' && cp -r '$BACKUP_DIR' '$NGINX_HTML_DIR/$NGINX_DIR_NAME'"
    echo "✅ 已回滚到 $BACKUP_DIR" >&2
    exit 2
  fi

  # 检查 dist 大小
  REMOTE_SIZE=$(ssh "$SERVER" "du -sk '$NGINX_HTML_DIR/$NGINX_DIR_NAME' 2>/dev/null | awk '{print \$1}'")
  LOCAL_SIZE=$(du -sk "$LOCAL_DIST" 2>/dev/null | awk '{print $1}')
  if [ -n "$LOCAL_SIZE" ] && [ "$REMOTE_SIZE" -lt $((LOCAL_SIZE / 2)) ]; then
    echo "⚠️  警告：远程大小 ($REMOTE_SIZE) 远小于本地 ($LOCAL_SIZE)，请检查"
  fi
fi

echo
echo "✅ 部署完成"
echo "  备份位置: $BACKUP_DIR"
echo "  远程路径: $REMOTE_ROOT"

# 自动清理旧 backup
cleanup_old_backups "$APP_NAME"
