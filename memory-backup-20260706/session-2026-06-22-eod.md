---
name: session-2026-06-22-eod
description: 蒙学498段TTS音频完成 + 国学详情页三按钮UI对齐学诗词 + 国学/通识答题功能隐藏
metadata: 
  node_type: memory
  type: project
  originSessionId: a60974a0-1995-447e-96b6-d1643bcf9454
---

# Session 2026-06-22 EOD 总结

## 三大任务

### 1. 蒙学 10 部 TTS 音频全量完成 ✅
- 166 节 → 498 段（原文+译文+解读 × 10 部书）
- Edge TTS 童声方案：女童 XiaoyiNeural(+10Hz) / 男童 YunxiaNeural(+0Hz)，语速 -30%
- 10 部：弟子规/三字经/笠翁对韵/童蒙须知/名贤集/神童诗/千家诗/童蒙训/小学诗/性理字训
- 本地 124M / 服务器 106M，rsync 同步
- Commit `3a38fda`，已 push

### 2. 国学详情页三按钮 UI 升级 ✅
- 用户反馈"跟学诗词一样"
- 学诗词版：橙色药丸按钮带文字"▶朗读原文/译文/赏析"
- 国学版改造：圆形 32px 仅图标 → 药丸型带文字（保留国学蓝色主题 #2563eb）
- 标签 emoji 统一：📜原文 / 📖译文 / 💡解读
- 播放状态色从红色 #ef4444 改为蓝色（与 hover 同色统一）
- Commit `ffdced9`，已部署

### 3. 答题功能隐藏（国学 + 通识）✅
- 用户反馈"不止学国学，是都需要隐藏"
- 涉及站点：xueguoxue（国学）+ xuetongshi（通识）
- 学诗词**没有**此功能，无需改
- 方案：注释掉 watch 中的 `showChallenge.value = true` 触发行，保留组件代码
- 默认值改为 false 并加注释"待后续优化再启用"
- 恢复只需取消 1 行注释
- Commit `775fb07`，已部署

## 涉及文件
- `apps/xueguoxue/src/App.vue`（UI + 隐藏）
- `apps/xuetongshi/src/App.vue`（隐藏）
- `apps/xueguoxue/scripts/tts-mengxue.mjs`（生成用）
- `apps/xueguoxue/public/audio/books/`（498 文件 124M）

## 服务器部署
- `/haodaer/nginx/html/xueguoxue/` — 静态 dist + audio
- `/haodaer/nginx/html/xuetongshi/` — 静态 dist

## 今日提交链
```
3a38fda 蒙学498段TTS
ffdced9 国学三按钮UI升级
775fb07 答题功能隐藏
```