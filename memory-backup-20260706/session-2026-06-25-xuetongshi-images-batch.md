---
name: session-2026-06-25-xuetongshi-images-batch
description: 学通识 410 张真图批量补齐部署（knowledge 56 + sections 354），线上 2263 张覆盖率 85.4%
metadata: 
  node_type: memory
  type: project
  originSessionId: 92473e97-3bf7-4244-9692-bfc1379575a6
---

# Session 2026-06-25 学通识图片批量补齐

## 起点
- local: knowledge=183 jpg / sections=1670 jpg
- 期望: knowledge=243 / sections=2407

## 实际完成（commit c32160e1）
- knowledge jpg: 183 → 239 (+56)  98.4%
- sections jpg: 1670 → 2024 (+354)  84.1%
- **线上总计: 2263 / 2650 = 85.4% 真实图覆盖**
- 部署服务器: 239 + 2024 张
- 主页 https://xuetongshi.grandand.com/ HTTP 200

## 关键决策
- 用户选择"全量 AI 兜底"：通过 search-images.mjs 先 wiki 后 AI
- AI 跑偏问题接受：少数图（business-mgmt 大象、ecommerce 含中文）质量瑕疵可接受
- ct-* 中国传统文化类 AI 失败率 ~90%（API 异常 + 概念抽象），剩余 383 张走 SVG fallback

## API 异常现象
- MiniMax image-01 在 6-25 下午持续返回非标准 JSON，错误统一为 "AI 未识别响应"
- 7 轮 retry：成功率 13% → 10% → 8%，持续恶化
- 失败 ID 中 77% 是 ct-* 传统文化类，13% 是 logic / economy 抽象类

## 工作流
```bash
# 1. 生成缺失 topic（56 张）— 一次成功 + 2 次 retry 全清
node search-images.mjs --only topics --source ai --ids <comma-list>
node search-images.mjs --only topics --source ai --retry

# 2. 生成缺失 sections（354+ 张）— 全量跑（skip-existing 自动过滤 1670）
node search-images.mjs --only sections --source ai
# 注意：--ids + --only sections 不生效（脚本 bug：filter 用 t.id 而非 t.parentId-t.id）
#       绝对路径 OK：node /abs/path/search-images.mjs ...

# 3. 多轮 retry 推进
node search-images.mjs --only sections --source ai --retry  # 重复直到收敛

# 4. 部署（cd 到项目根，否则 rsync 路径报错）
cd /Users/eighteenman/工作/好大儿
rsync -avz --delete apps/xuetongshi/public/images/sections/ root@47.114.77.124:/haodaer/nginx/html/xuetongshi/images/sections/

# 5. 验证
ssh root@47.114.77.124 "ls /haodaer/nginx/html/xuetongshi/images/{knowledge,sections}/*.jpg | wc -l"
```

## 待办
- 剩余 383 张（基本是 ct-* 传统文化）继续 retry 或手动选题补图
- 偶尔 API 恢复后做最后一轮 retry 可推高覆盖率

## 相关
- [[学通识动画化总规划]]
- [[Session 2026-06-24 学通识100%真图]]