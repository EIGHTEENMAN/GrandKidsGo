---
name: session-2026-06-22-xuetongshi-survey
description: 学通识扩充调研 - DK/NG/Usborne 系列对标 + 30 个薄弱 topic 扩充清单
metadata:
  node_type: memory
  type: project
  status: in_progress
  originSessionId: 2026-06-22
---

# Session 2026-06-22 学通识扩充调研

## 数据状态

| 项 | 数量 |
|---|---|
| 总 topic | 243 |
| 已扩到 10 节 | 199 |
| 4 节 | 28 |
| 3 节 | 12 |
| 2 节 | 3 |
| 5 节 | 1 |
| 实际类目 | 11 个（meta 10 + 中国传统文化 44 个 ct-*） |

**核心问题**：10 大类目中"科学/地理/自然/历史人物/艺术/科技工程/健康生活/逻辑思维/经济社会/语言文字"虽有 20 个 topic/类目，但**sectionCount 大部分 ≤ 4**，急需扩充到 8-15 节。

## 调研对标（3 大国际 + 2 中文）

### DK 系列（重点参考）
- **DK Eyewitness**：200+ 册单本 30-50 节，视觉化主题组织
- **DK Children's Encyclopedia**：单本 304 页覆盖 10 大领域
- **DK Knowledge Encyclopedia**：大开本视觉化百科，按主题分册
- **DK Smithsonian**：博物馆级内容 + 儿童语言

### National Geographic Kids
- 5,000 Awesome Facts 系列（事实百科）
- Weird But True 系列
- Everything 系列（大视觉百科）

### Usborne
- Lift-the-Flap 翻翻书（问答式）
- First Encyclopedia（学龄前百科）
- See Inside / Look Inside（看里面）

### 中文对标
- **乐乐趣揭秘系列**（50+ 翻翻书）
- **十万个为什么少年版**（18 卷问答体）
- **中国国家地理少儿百科**（中国视角）

## 节数标准建议

| Topic 类型 | 建议节数 |
|---|---|
| 入门认知型 | 6-8 节 |
| 通识科普型 | 10-12 节 |
| 深度知识型 | 12-15 节 |
| 综合主题型 | 15-20 节 |

## 首批 30 个薄弱 topic 扩充清单

按 sectionCount 升序：

### P1（2 节，重点）
1. `sculpture` 雕塑（2→10）
2. `mental-health` 心理健康（2→10）
3. `ecosystem` 生态系统（2→10）
4. `calligraphy` 书法（2→10）

### P2（逻辑思维 9 个，3→8-10）
5-13: logical-fallacy / reverse-thinking / divergent-thinking / abstract-thinking / sudoku-logic / lateral-thinking / game-theory / truth-lie / information-org

### P2（经济社会 8 个，3→10）
14-21: business-mgmt / ecommerce / insurance / tax-basics / monetary-policy / sharing-economy / smart-money / internet-economy / rural-economy

### P3（健康生活 4 个，3→10）
22-25: balanced-diet / drug-knowledge / home-safety / vaccination

### P3（语言文字 5 个，3→8-10）
26-30: rhetoric / punctuation / polyphone / xiangjinzi / riddles

## 主题树（10 类目下二级 topic）

每个一级 topic 下列 8-15 个二级 topic，参考 DK/NG/Usborne 书目结构（详见 jinyiwei 报告）。

## 下一步行动

1. 编写 `batch-tongshi-p1.py` 扩充 4 个 P1 topic（sculpture/mental-health/ecosystem/calligraphy）
2. 编写 `batch-tongshi-logic.py` 扩充 9 个逻辑思维 topic
3. 编写 `batch-tongshi-economy.py` 扩充 9 个经济社会 topic
4. 编写 `batch-tongshi-health-language.py` 扩充 9 个健康+语言 topic
5. 每批生成后 commit + 推送到服务器

## 关联
- [[session-2026-06-22-mengxue-audio-done]] - 上次音频完成
- [[xueshici-deploy-paths]] - 部署路径参考
