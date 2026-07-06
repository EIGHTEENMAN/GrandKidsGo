---
name: session-2026-06-22-xuetongshi-todo
description: 学通识 44 个中国传统文化 topic 扩充 - 2-5 节扩到 8-10 节
metadata:
  node_type: memory
  type: project
  status: todo
  originSessionId: 2026-06-22
---

# Session 2026-06-22 学通识 44 个 ct-* topic 扩充（待办）

## 数据现状
- 243 个 topic，2149 节（平均 8.8 节）
- 44 个"中国传统文化"topic 大部分 2-5 节，急需扩充
- 9 个 P1（2 节）：ct-water-safety / ct-electricity-safety / ct-food-safety
- 12 个 P2（3 节）：节日+传统艺术（mid-autumn/qingming/qixi/hanfu/chinese-music/song-ci/chinese-chess/lion-dance/chinese-cuisine/safety 3 + social-etiquette）
- 22 个 P3（4 节）：四大发明/春节/端午/二十四节气/十二生肖/书法/中国画/京剧/茶/中医/古建/神话/四大名著/丝绸/瓷器/武术/唐诗/年俗/剪纸/礼仪3个
- 1 个 P4（5 节）：ct-first-aid

## 目标
**44 → 42 个 topic**（去掉 ct-song-ci 宋词 + ct-tang-poetry 唐词）
每个 topic 补到 10 节，共需新增 ~270 节，每节 250-400 字

## 实施方式
- 写 batch 脚本读 /tmp/tongshi-expanded.ts（已生成内容）→ 写入 knowledge.ts
- 用 expand-classic.py 模式（找 book 位置 → 替换 sections: [ ... ]）
- 一次跑完 44 个 topic，commit + 部署

## 关联
- [[session-2026-06-22-xuetongshi-survey]] - 调研报告（DK/NG/Usborne 对标）
