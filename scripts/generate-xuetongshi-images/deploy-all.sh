#!/usr/bin/env bash
# 部署学通识所有真图到服务器
# - /haodaer/nginx/html/xuetongshi/images/knowledge/ (父 topic)
# - /haodaer/nginx/html/xuetongshi/images/sections/ (章节)
set -e

LOCAL_KNOWLEDGE="apps/xuetongshi/public/images/knowledge"
LOCAL_SECTIONS="apps/xuetongshi/public/images/sections"

REMOTE_HOST="root@47.114.77.124"
REMOTE_BASE="/haodaer/nginx/html/xuetongshi/images"

echo "🚀 部署学通识真图到服务器"
echo ""

# 1. 父 topic 图
echo "📁 部署父 topic 图（knowledge/）..."
echo "   本地: $(ls $LOCAL_KNOWLEDGE/*.jpg 2>/dev/null | wc -l | tr -d ' ') 张"
rsync -avz --delete $LOCAL_KNOWLEDGE/ $REMOTE_HOST:$REMOTE_BASE/knowledge/
echo ""

# 2. section 图
echo "📁 部署章节图（sections/）..."
echo "   本地: $(ls $LOCAL_SECTIONS/*.jpg 2>/dev/null | wc -l | tr -d ' ') 张"
rsync -avz --delete $LOCAL_SECTIONS/ $REMOTE_HOST:$REMOTE_BASE/sections/
echo ""

# 3. 验证
echo "🔍 验证部署..."
ssh $REMOTE_HOST "
echo '   服务器 knowledge: '\$(ls $REMOTE_BASE/knowledge/*.jpg 2>/dev/null | wc -l | tr -d ' ')' 张'
echo '   服务器 sections: '\$(ls $REMOTE_BASE/sections/*.jpg 2>/dev/null | wc -l | tr -d ' ')' 张'
echo ''
echo '   测试主页:'
curl -sk -o /dev/null -w '   xuetongshi.grandand.com: HTTP %{http_code}\n' https://xuetongshi.grandand.com/
"
echo ""
echo "✅ 部署完成"
