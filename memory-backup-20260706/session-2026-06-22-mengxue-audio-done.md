---
name: session-2026-06-22-mengxue-audio-done
description: 蒙学10部TTS音频全量生成完成 498段/124M 部署上线
metadata: 
  node_type: memory
  type: project
  originSessionId: a60974a0-1995-447e-96b6-d1643bcf9454
---

# Session 2026-06-22 蒙学音频完成

## 结果
蒙学 10 部经典（166 节）全部 498 段 TTS 音频（原文+译文+解读）生成完成 + 部署上线。

| 书 | 节数 | 段数 | 音色 |
|---|---|---|---|
| 三字经 | 6 | 18 | 女童 Xiaoyi |
| 弟子规 | 7 | 21 | 女童 Xiaoyi |
| 笠翁对韵 | 30 | 90 | 男童 Yunxia |
| 童蒙须知 | 5 | 15 | 男童 Yunxia |
| 名贤集 | 20 | 60 | 男童 Yunxia |
| 神童诗 | 25 | 75 | 女童 Xiaoyi |
| 千家诗 | 30 | 90 | 女童 Xiaoyi |
| 童蒙训 | 20 | 60 | 男童 Yunxia |
| 小学诗 | 15 | 45 | 女童 Xiaoyi |
| 性理字训 | 8 | 24 | 男童 Yunxia |
| **合计** | **166** | **498** | |

## 工具与参数
- 脚本：`apps/xueguoxue/scripts/tts-mengxue.mjs`
- Edge TTS: zh-CN-XiaoyiNeural (女童 +10Hz) / zh-CN-YunxiaNeural (男童 +0Hz)
- 语速 -30%（童声更慢更清晰）
- 含 3 次自动重试，间隔 2 秒

## 部署
- 本地：`apps/xueguoxue/public/audio/books/` 498 文件 124M
- 服务器：`/haodaer/nginx/html/xueguoxue/audio/books/` 498 文件 106M
- rsync -avh --inplace 同步，约 1 分钟完成
- 已 commit + push

## 跳过文件说明
17 段 skipped 是脚本已存在旧文件覆盖（首节早期手工生成），自动跳过。