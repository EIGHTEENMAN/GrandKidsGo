#!/bin/bash
# 一键续跑所有未完成的 TTS mp3
# 等 edge-tts 恢复后执行此脚本

set -e

cd /Users/eighteenman/工作/好大儿

# 先测试 edge-tts 是否可用
echo "🔍 测试 edge-tts 连通性..."
python3 -c "
import asyncio, edge_tts
async def test():
    tts = edge_tts.Communicate('测试', 'zh-CN-XiaoxiaoNeural')
    await tts.save('/tmp/edge-test.mp3')
asyncio.run(test())
import os
print('✅ edge-tts OK:', os.path.getsize('/tmp/edge-test.mp3'), 'bytes')
" || { echo "❌ edge-tts 仍不可用，放弃"; exit 1; }

echo ""
echo "🚀 启动学诗词 translation TTS..."
nohup node scripts/generate-poem-audio/tts.mjs --type translation --concurrency 2 > /tmp/tts-shi-trans3.log 2>&1 &
TPID=$!
echo "PID: $TPID"
sleep 2

echo "🚀 启动学诗词 interpretation TTS..."
nohup node scripts/generate-poem-audio/tts.mjs --type interpretation --concurrency 2 > /tmp/tts-shi-interp3.log 2>&1 &
IPID=$!
echo "PID: $IPID"
sleep 2

echo "🚀 启动学国学 TTS（自动排除蒙学）..."
nohup node apps/xueguoxue/scripts/tts-guoxue.mjs --concurrency 3 > /tmp/tts-gx2.log 2>&1 &
GPID=$!
echo "PID: $GPID"

echo ""
echo "✅ 3 个 TTS 进程已启动"
echo "  学诗词 translation: $TPID"
echo "  学诗词 interpretation: $IPID"
echo "  学国学: $GPID"
echo ""
echo "📊 实时状态查询："
echo "  bash scripts/expand-all-fields/tts-status.sh"