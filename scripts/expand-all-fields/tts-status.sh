#!/bin/bash
# 查看 TTS 实时进度
cd /Users/eighteenman/工作/好大儿

echo "=== TTS mp3 进度 ==="
echo ""
echo "xueshici 原文: $(ls apps/xueshici/public/audio/poems/*_original.mp3 2>/dev/null | wc -l)/2026"
echo "xueshici 译文: $(ls apps/xueshici/public/audio/poems/*_translation.mp3 2>/dev/null | wc -l)/1908"
echo "xueshici 解读: $(ls apps/xueshici/public/audio/poems/*_interpretation.mp3 2>/dev/null | wc -l)/2026"
echo "xueguoxue 原文: $(ls apps/xueguoxue/public/audio/books/*_原文.mp3 2>/dev/null | wc -l)/1502"
echo "xueguoxue 译文: $(ls apps/xueguoxue/public/audio/books/*_译文.mp3 2>/dev/null | wc -l)/1502"
echo "xueguoxue 解读: $(ls apps/xueguoxue/public/audio/books/*_解读.mp3 2>/dev/null | wc -l)/1502"
echo ""
echo "=== TTS 进程 ==="
ps -ef | grep -E "tts.mjs|tts-guoxue" | grep -v grep | awk '{print "  PID="$2"  CMD="$8" "$9" "$10" "$11}'