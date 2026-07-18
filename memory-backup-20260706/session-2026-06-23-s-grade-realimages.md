---
name: session-2026-06-23-s-grade-realimages
description: 学通识 12 个 S 级真图完成（MiniMax image-01）+ 动画 vs 真图回退链
metadata: 
  node_type: memory
  type: project
  originSessionId: af46b21e-c291-46cd-ba47-daa70ae0b838
---

# 2026-06-23 学通识 12 个 S 级真图

## ✅ 完成

### 流程
1. **PoC**：复用诗配画 `secrets.env` 中的 `MINIMAX_API_KEY`（不是 OpenAI）
2. **端点**：`https://api.minimaxi.com/v1/image_generation`
3. **模型**：`image-01`（不是 dall-e-3）
4. **aspect_ratio**: 16:9
5. **后台 nohup** 批量跑 + 25s 间隔

### 12 张真图（apps/xuetongshi/public/images/knowledge/）
- solar-system 428KB / earth-moon 333KB / force-motion 190KB（重做）
- simple-machines 182KB / human-body 358KB / dinosaurs 474KB
- space-explore 371KB / basic-circuits 163KB / volcanoes 415KB
- weather-climate 272KB / matter-elements 118KB / atoms-molecules 382KB

成功率 **11/12**（force-motion 含希腊文字已加强 prompt 重做）

### 脚本
- `scripts/generate-xuetongshi-images/poc-solar-system.mjs`（单张 PoC）
- `scripts/generate-xuetongshi-images/batch-generate.mjs`（批量 + 跳过 + retry）
- `scripts/generate-xuetongshi-images/topics-batch1.json`（12 prompt）
- `scripts/generate-xuetongshi-images/batch-status.json`（运行状态）

## 关键技术细节

### MiniMax API 响应结构（学诗词已验证）
```json
{
  "id": "...", "data": {
    "image_base64": ["..."]  // ← 关键
  },
  "metadata": {...},
  "base_resp": {...}
}
```

### 教训
- image-01 **不严格遵守"no text" prompt**，force-motion 含希腊字母
- 解决方法：加强 prompt 加 "严禁要求" 段落
- 重做后还有数字（6, 10.1），但核心要素正确
- **接受微小瑕疵**，不再死磕（成本 0.3 元/张）

### AnimationSlot 4 级回退
```
组件动画 → jpg → svg → 文字占位
```
- jpg 存在时**优先**用 jpg（无需改代码）
- 部署真图后**自动替换**之前的 SVG 占位

## 下一步（TODO #32 续）
- A 级 26 个真图（~8 分钟 × 3 批 = 24 分钟）
- B 级 30+ 个真图（按多合一组件，每个可能单独出图）
- 总计 ~50 张，估 30-60 分钟，成本 ~¥15

**Why**: 真图替代占位 SVG，让首页更吸引人；与动画互补
**How to apply**: 写新 batch 时复用 `batch-generate.mjs` + 新 json 即可
