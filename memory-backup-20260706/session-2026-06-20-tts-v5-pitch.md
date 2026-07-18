---
name: session-2026-06-20-tts-v5-pitch
description: 2026-06-20 TTS v5 修复方案 — style=null + pitch 替代 mstts:express-as，避开字面朗读乱码 bug
metadata:
  type: project
  originSessionId: 2026-06-20
---

# Session 2026-06-20 TTS v5 修复（pitch 替代 style）

## 用户反馈链
1. PoC 1004 杨万里《过松源晨炊漆公店》→ 听到 "mstts express-as style calm" 乱码
2. 尝试 v4（去 prosody 嵌套保 style）→ 仍乱码
3. v5：彻底去掉 style，改用 `--pitch` 参数（+5Hz 豪迈 / -3~-5Hz 婉约）
4. 用户接受，命令 `node tts.mjs --type original` 后台跑全量

## 三个版本的对比

| 版本 | SSML 结构 | 是否乱码 | 时长 | 听感 |
|------|---------|---------|------|------|
| v1 | `<mstts:express-as><prosody>文本</prosody></mstts:express-as>` | ❌ 乱码 | 44.3s | 30s 乱码 + 14s 真诗 |
| v3 | 纯文本 + prosody rate | ✅ | 14.1s | 无情绪修饰，太平 |
| v4 | `<mstts:express-as>文本</mstts:express-as>` 去 prosody | ❌ 仍乱码 | 42.6s | 同 v1 |
| **v5** | 纯文本 + prosody rate + **pitch 参数** | ✅ | 15.0s | 保留 voice + rate + pitch 12 种差异 |

## v5 改动清单

### `moodClassifier.mjs`
- `VOICE_MATRIX` 所有 style 字段置 null
- 新增 `pitch` 字段（heroic/frontier=+5Hz, graceful=-3Hz, lyric/pastoral=-5Hz, narrative=+0Hz）
- rate 整体降一档（-5%→-10%, -10%→-15%, -15%→-20%, -20%→-25%）
- `getVoiceProfile` 把 `original` 也加入 `isPlain`，强制 style=null

### `tts.mjs`
- `callEdgeTTS` 新增 `pitch` 参数解构
- `args` 拼接时无 style 路径加 `--pitch=${pitch || '+0Hz'}`
- `buildSsml` 注释更新（v5 说明，去 prosody 嵌套的 v4 写法）

## 已知遗留问题
- 单句语速不均：edge-tts 对"流畅词组"自动加速，"赚得行人空喜欢" 7 字叠字词组读得快
- 解决方案：暂不解决（用户接受现状）

## 其他成果
- 任务 #3：HeaderBar 移动端登录按钮改细线描边 + 桌面端 nowrap（commit 70b11f4）
- 任务 #10：学习板块首页数字按实际数据校准
  - xueshici: 299/934 → 344/2026（用 `totalPoets` computed + `poemsIndex.length`）
  - xueguoxue: 92/613 → 92/920（用 `totalBooks` + `totalSections` computed）
  - xuetongshi/english 已用动态值，不需改
  - commit 6011b1d 已 push
- 任务 #5：诗配动画 mp4 状态修正
  - 旧 memory 误判"本地丢失"，实际 public/ 2027 + dist/ 4054 mp4 都在
- 任务 #4：Phase 4 学习内容数据盘点
  - 诗词 2026 / 国学 923 / 通识 2392 / 英语 5018，全部超额
  - CLAUDE.md 已更新状态

## 任务 #2 真相揭露
- 旧 memory 说"229 段译文/赏析缺失（ID 1997-2225）"
- 实际检查：229 个 ID 中只有 30 个真实存在（1997-2026），其余 199 个是错误列表
- 真实工作量：60 段（30 首 × 2），预计 26 分钟

## 待办（后台完成后）
- TTS 脚本改动 commit + push（moodClassifier + tts.mjs）
- 跑 #2：30 首诗 × 2 类型 = 60 段 translation + interpretation
- 部署全量音频到服务器（rsync）
- 全量 final 验证

## 链接
- [[session-2026-06-19-xueshici-deploy]] — 上次修复三个 bug 的 session
- [[xueshici-deploy-paths]] — 服务器实际部署路径
- [[session-2026-06-20-mp4-status]] — mp4 资产状态修正