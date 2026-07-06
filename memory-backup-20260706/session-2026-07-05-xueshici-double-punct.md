---
name: session-2026-07-05-xueshici-double-punct
description: "xueshici 双标点 bug：前端 splitBySentence() 无条件加 '，'+ '。'，配源数据每行已带 '。' → \"。，\"/\"。。\"；批量扫到 21 处源数据脏。"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0d9a096e-46ec-4313-a4d2-af2d49ab5874
---

## 触发

用户截屏反馈 xueshici 单首诗（吕本中《渔家傲》）原文末尾出现 `春未远。，` 这种双标点，**但音频正确** —— 表明问题在前端渲染不是数据源。

## 根因（前端）

`apps/xueshici/src/App.vue::splitBySentence()` line 494：
```js
result.push(pair[0] + '，' + pair[1] + '。')
```
**无条件加 '，' + '。'**，而源数据 `original` 字段每行已自带末尾 `。`，渲染出 "。，"/"。。"。

修复：stripTail + ensureEndPunct helper，先去末尾再统一处理。

## 根因（源数据脏）

扫 1093 首 `original` 字段，**21 处**末尾含「！。」「？。」「！，」「。」「，」等双标点：
- 多数为戏曲（背景文人作品中常见 "好一个憔悴的凭阑人！。"）
- 修法：保留问号/感叹号（强标点），删后续重号

修完 `本地源剩余双标点: 0`，含吕本中《渔家傲》整首生效。

## 部署踩坑（衍生）

修完后手工部署踩了第二个坑：xueshici nginx root 不接收 dist/ 子目录路径，需要手工 4 步（cp index.html + rsync assets）。这个坑被下一段 [deploy.sh skip-media](session-2026-07-04-deploy-sh-skip-media.md) 解决。

## 实测结果

- 本地 poems.ts 0 双标点
- 服务器 HTTP 200 + bundle YMXDf-k4.js 在线
- audio 6085 文件 + images 9939 文件未动（**这次手工 rsync 误删了一次，由 revert 加 skip-media 修复**）

## 给下次启发的提醒

- **前端正则拼接中文标点**要 100% 总是去配对端已有标点再统一，不能假设源数据"绝对干净"
- **扫数据库脏 regex**：`re.findall(r'([一-鿿][。？！，；]{2,})', src)` 是一个好工具
- **保守做法**：保留问号/感叹号（语义最强），删后续普通标点

## 串入 7-4 完整工作日志

1. [PWA + parent-guard](session-2026-07-04-grandand-pwa-and-parent-guard.md)
2. [mask + _.*](session-2026-07-04-mask-and-metadata-cleanup.md)
3. [nginx main/](session-2026-07-04-nginx-main-deploy-path.md)
4. **本段** — xueshici 双标点
5. [deploy.sh skip-media](session-2026-07-04-deploy-sh-skip-media.md)（本次衍生）

合计 6 commit：`4102d1c7..20fdf5c6`
