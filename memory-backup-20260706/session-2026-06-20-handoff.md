---
name: session-2026-06-20-handoff
description: 2026-06-20 TTS 全量生成跑完后的 handoff 清单 — commit 脚本 + 跑 #2 + 部署 + 验证
metadata:
  type: project
  originSessionId: 2026-06-20
---

# Session 2026-06-20 收尾 Handoff 清单

## 触发条件
后台 TTS original 全量生成进度达到 100% (done.original = 2026)
（当前 21.5%，预计今晚 21:30 完成）

## 执行步骤

### 步骤 1：确认生成完成
```bash
node -e "const s=require('/Users/eighteenman/工作/好大儿/scripts/generate-poem-audio/tts-status.json'); console.log('done.original:', Object.keys(s.done).filter(k=>k.endsWith('-original')).length, '/ 2026'); console.log('failed:', Object.keys(s.failed).length);"
# 期望：done.original = 2026
```

### 步骤 2：检查 failed ID，单独补跑（如有）
```bash
node -e "const s=require('/Users/eighteenman/工作/好大儿/scripts/generate-poem-audio/tts-status.json'); console.log('Failed IDs:', Object.keys(s.failed).filter(k=>k.endsWith('-original')).map(k=>k.split('-')[0]).join(','));"
# 如有 failed IDs：node tts.mjs --ids <IDs> --type original
```

### 步骤 3：Commit TTS 脚本改动（暂存未 commit）
```bash
cd /Users/eighteenman/工作/好大儿
git add scripts/generate-poem-audio/moodClassifier.mjs scripts/generate-poem-audio/tts.mjs
git -c user.email="eighteenman@users.noreply.github.com" -c user.name="eighteenman" \
  commit -m "fix(tts): pitch 替代 style 解决 mstts 字面朗读乱码 + rate 整体降一档"
git push origin main
```

### 步骤 4：跑 #2 - 补 60 段译文/赏析（30 首 × 2 类型）
```bash
cd /Users/eighteenman/工作/好大儿/scripts/generate-poem-audio
node tts.mjs --ids 1997,1998,1999,2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026 --type translation
node tts.mjs --ids 1997,1998,1999,2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026 --type interpretation
# 预计 26 分钟
```

### 步骤 5：部署全量音频到服务器
```bash
# 同步 2026 段 original 到服务器
rsync -av /Users/eighteenman/工作/好大儿/apps/xueshici/public/audio/poems/*_original.mp3 \
  root@47.114.77.124:/haodaer/nginx/html/xueshici/audio/poems/

# 同步 30 首新增的 translation + interpretation（不会覆盖已有 1797 个）
rsync -av /Users/eighteenman/工作/好大儿/apps/xueshici/public/audio/poems/{1997..2026}_translation.mp3 \
  root@47.114.77.124:/haodaer/nginx/html/xueshici/audio/poems/
rsync -av /Users/eighteenman/工作/好大儿/apps/xueshici/public/audio/poems/{1997..2026}_interpretation.mp3 \
  root@47.114.77.124:/haodaer/nginx/html/xueshici/audio/poems/
```

### 步骤 6：服务器验证
```bash
ssh root@47.114.77.124 "
echo '=== 服务器 audio 统计 ==='
echo 'original:' \$(ls /haodaer/nginx/html/xueshici/audio/poems/*_original.mp3 | wc -l) '/ 2026'
echo 'translation:' \$(ls /haodaer/nginx/html/xueshici/audio/poems/*_translation.mp3 | wc -l) '/ 2026'
echo 'interpretation:' \$(ls /haodaer/nginx/html/xueshici/audio/poems/*_interpretation.mp3 | wc -l) '/ 2026'

# 抽查 5 个 random 的 mp3 大小，确认生成成功
for id in 1 500 1000 1500 2026; do
  ls -la /haodaer/nginx/html/xueshici/audio/poems/\${id}_original.mp3
done
"
```

### 步骤 7：浏览器端验证（curl 几个关键诗）
```bash
curl -I https://xueshici.grandand.com/audio/poems/1_original.mp3
curl -I https://xueshici.grandand.com/audio/poems/1004_original.mp3  # 杨万里 PoC 用过
curl -I https://xueshici.grandand.com/audio/poems/2026_original.mp3  # 最新一首
# 期望：HTTP 200 + Content-Type: audio/mpeg
```

### 步骤 8：xueshici 前端代码（如有 bug fix）
如 TTS 后发现新问题（如 mp3 加载失败、播放异常），需要修 `apps/xueshici/src/lib/audio.ts`

## 已完成事项（无需再做）
- ✅ 全量重生成 2026 段原文 MP3
- ✅ 学习板块首页数字校准（commit 6011b1d）
- ✅ HeaderBar 移动端 UI 修复（commit 70b11f4）
- ✅ 英语单词 App 完整架构方案（memory）
- ✅ mp4 状态修正（无丢失）

## 预期产出
- 3 个 commit (TTS 脚本 + 可能的失败补跑 + 可能的 audio.ts 修复)
- 服务器音频完整度 100%
- 所有学习板块功能完整

## 链接
- [[session-2026-06-20-tts-v5-pitch]] — TTS v5 修复方案
- [[session-2026-06-20-english-architecture]] — 英语单词架构
- [[xueshici-deploy-paths]] — 服务器部署路径