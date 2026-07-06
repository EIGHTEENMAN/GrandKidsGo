---
name: session-2026-06-20-tts-completed
description: 2026-06-20 TTS 全量生成 + 部署 100% 完成记录
metadata:
  type: project
  originSessionId: 2026-06-20
---

# Session 2026-06-20 TTS 全量完成 🎉

## 最终成果

### 音频数据
- **original**: 2026/2026 (100%)
- **translation**: 1827/2026 (30 个新增 + 1797 原有)
- **interpretation**: 1827/2026 (30 个新增 + 1797 原有)
- 翻译/赏析差 199 个是**错误 ID 列表**导致（诗本身不存在）

### 服务器部署
- `/haodaer/nginx/html/xueshici/audio/poems/` 共 5680 个 mp3（2026+1827+1827）
- 服务器通过 SSH 验证文件存在 + file 类型确认是 MPEG ADTS mp3
- 用户访问 https://xueshici.grandand.com 即可使用

### 代码 commit
- `4e337a7` - fix(tts): pitch 替代 style 解决 mstts 乱码 + rate 整体降一档 ✅ pushed
- `6011b1d` - fix(学习板块): 首页数字按实际数据校准 ✅ pushed
- `70b11f4` - fix(shared): HeaderBar 移动端登录按钮改细线描边 ✅ pushed

## 性能数据
- 全量 original 生成耗时：8239.5s ≈ 2 小时 17 分钟
- 平均速度：14.7 段/分钟（最终加速到 16+）
- 重试失败 12 个 edge-tts 瞬断 → 全部补跑成功（45.7s）
- translation 30 段：140s
- interpretation 30 段：161s

## 已确认问题 & 解决
1. ❌ v1 (style/SSML): 字面朗读乱码 "mstts express-as style calm"
2. ❌ v4 (去 prosody 嵌套): 仍乱码
3. ✅ v5 (style=null + pitch 参数): 完全无乱码，保留情绪差异

## 待办（后续 session）
- 验证线上朗诵效果（用户实际播放检查）
- 诗配动画相关（任务 #5 已有修正）
- 英语 App 重构（按已存架构，9-10 天工作量）
- 其他学习板块（xuetongshi 通识）方案设计

## 链接
- [[session-2026-06-20-tts-v5-pitch]] — v5 修复方案
- [[session-2026-06-20-handoff]] — 8 步执行清单（已完成）
- [[session-2026-06-20-english-architecture]] — 英语 App 架构
- [[session-2026-06-20-mp4-status]] — mp4 状态修正