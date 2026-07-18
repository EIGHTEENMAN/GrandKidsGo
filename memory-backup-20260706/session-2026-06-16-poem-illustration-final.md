---
name: session-2026-06-16-poem-illustration-final
description: 诗配画任务最终收尾：retry路径bug+API key陷阱+cwd错误导致状态写错位置
metadata: 
  node_type: memory
  type: project
  originSessionId: 089a1cbe-1db4-48b7-a147-ba54bcc93c1a
---

# Session 2026-06-16 诗配画收尾：retry 实战踩坑

## 最终战绩

接手时 1529/2028 (75.39%)，最终 **1734/2028 = 85.5%**
- ✅ retry 成功 32/33（仅 [1783] 都孔目风雨还牢末・收江南 content_policy_violation 顽固失败）
- 服务器 jpg 从 906 → **1842** (+936 张)

## 三大踩坑（必看）

### 1. API key 必须是真实 key
**症状**：retry 全部返回 `401 无效的令牌`
**根因**：我用一个占位 key `sk-1jktzlb...`，真实 key 在 memory 里 `sk-IqVdWLfEwAKfBFRQSHVG9USMN8oOn92DERL34sho15DJcVzM`
**教训**：调用 API 前先在 memory/.env 找真实 key，绝不用占位符

### 2. retry 必须 cd 进 scripts 目录
**症状**：retry 完成后磁盘 status.json 没变化
**根因**：`STATUS_FILE = './generation-status.json'` 是相对路径，retry 进程 cwd 是项目根目录，导致状态写到 `/Users/eighteenman/工作/好大儿/generation-status.json`（错位置），原文件不变
**修复**：retry 启动前必须 `cd /Users/eighteenman/工作/好大儿/scripts/generate-poem-images`，否则 status.json 写到错地方
**如何发现**：retry 日志显示"完成"，但 `md5sum generation-status.json` 不变 → 进程把状态写到别处

### 3. 已 done 诗不会覆盖（existsSync 检查）
**误区**：以为 retry 会覆盖 done 的诗
**事实**：`generate.mjs:167 existsSync(imgPath)` 检查 jpg 文件存在与否，与状态字段无关。done 的诗 jpg 存在 → 跳过，不重生成

## 正确 retry 启动模板

```bash
cd /Users/eighteenman/工作/好大儿/scripts/generate-poem-images && \
AGNES_API_KEY="sk-IqVdWLfEwAKfBFRQSHVG9USMN8oOn92DERL34sho15DJcVzM" \
AI_PROVIDER=agnes \
nohup node generate.mjs --retry > /tmp/retry.log 2>&1 &
```

验证 retry 是否正确工作的检查清单：
1. `lsof -p $PID | grep cwd` → 必须看到 scripts/generate-poem-images
2. `head -10 /tmp/retry.log` → 应显示"准备生成 N 张"（N 是实际失败数，不是 2028）
3. 等待 10 秒后查磁盘 stats：`md5sum generation-status.json` 应该变化

## 剩余 1 首诗处理建议

[1783] 都孔目风雨还牢末・收江南（无名氏，元曲）
- 标题含"风雨还牢"，Agnes 审核拒绝（content_policy_violation）
- 用户决定接受现状（85.5% 完成）
- 兜底方案（如以后想补救）：mock 占位图 / 改标题重试
