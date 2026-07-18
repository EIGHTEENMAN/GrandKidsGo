---
name: session-2026-06-21-xueguoxue-tts
description: 国学TTS音频系统搭建 — 蒙学童声+非蒙学中年方案，论语22节整本扩充，端到端验证通过
metadata: 
  node_type: memory
  type: project
  status: completed
  originSessionId: 480d7750-b045-4da7-80ea-09ddf4a5b51d
---

# Session 2026-06-21 国学TTS音频系统搭建

## 两大音频方案确认

### 蒙学（童声，10部166节）
- **女童** (XiaoyiNeural, -30%, +10Hz)：三字经、弟子规、神童诗、千家诗、小学诗
- **男童** (YunxiaNeural, -30%, +0Hz)：笠翁对韵、童蒙须知、名贤集、童蒙训、性理字训
- 每本书固定单音色，不混合
- 脚本：`scripts/tts-mengxue.mjs`

### 经部/子部/史部/医部（中年沉稳风，90本书）
- **音色**：YunyangNeural（磁性中年）
- 原文：+ `narration` SSML
- 译文/解读：中性讲解（无style）
- 语速：-35%
- 脚本：`scripts/tts-guoxue.mjs`

### 通用
- BGM：复用学诗词6首古风器乐
- BGM音量：0.15（调低）
- 文件名：`{书名}_{节名}_{类型}.mp3`（原文/译文/解读）
- 兜底：Web Speech API（mp3不存在时）
- 前端：`lib/audio.ts` + `App.vue`

## 已完成

| 项 | 状态 | 说明 |
|---|---|---|
| 论语整本 10→22节 | ✅ | 按20篇自然分节，长篇分上下 |
| 论语 sectionCount元数据 | ✅ | 10→22 |
| BGM导入（6曲） | ✅ | 复制到 public + dist |
| audio.ts Web Speech→MP3+BGM | ✅ | playSectionAudioWithFallback |
| App.vue 播放按钮改造 | ✅ | playOriginal/Translation/Interpretation |
| 蒙学性别分配方案A | ✅ | 女童5+男童5 |
| tts-mengxue.mjs PoC | ✅ | 10本书每本第1节共29段 |
| 蒙学方案简介 | ✅ | 已定稿并存档 |
| 非蒙学 TTS脚本 | ✅ | tts-guoxue.mjs 带注释 |
| 论语第1节 Yunyang音频 | ✅ | 3段（原文/译文/解读） |
| BGM音量 0.3→0.15 | ✅ | |

## 待办

### 高优
- [ ] **蒙学166节全量生成**：`node scripts/tts-mengxue.mjs`（去掉--poc，注意限速）
- [ ] **经部26本整本扩充**：jing-1（论语）已完成样板，jing-2~jing-26需要逐本扩充
- [ ] **子部31本整本扩充**：zi-1~zi-31
- [ ] **全量TTS生成（经/子/史/医）**：`node scripts/tts-guoxue.mjs`（数据扩完后）
- [ ] **部署上线**：rsync dist + audio to 服务器

### 低优
- [ ] 学生诗词 BGM也同步调低到0.15
- [ ] 史部/医部数据扩充
- [ ] 备份文件清理（classics.ts.bak vs .gitignore *.bak）

## 关联
- [[xueguoxue-tts-config]] — 完整配置方案
- [[session-2026-06-20-meng-full-text]] — 蒙学数据扩充前置
- [[xueshici-deploy-paths]] — 学诗词部署路径参考
