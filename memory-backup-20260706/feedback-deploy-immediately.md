---
name: feedback-deploy-immediately
description: 每次任务完成后必须立刻构建、部署、生效，不能等用户反馈才发现没部署
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 105c8442-b97c-4a10-b25d-28e452d796b2
---

# 任务完成即部署

每次完成修改后，必须立刻执行完整的部署流程（构建、上传、重启服务），不能留到"最后一起部署"或等用户反馈才知道没生效。

**Why:** 用户认为"修订完成了就应该已在线上生效"，几个修订接连没部署导致用户反复反馈"XXX 没生效"。

**How to apply:** 每次对任何项目文件（前端、后端、数据）的修改完成后，立即：
1. 如果改了前端 → `npm run build` 并上传 dist
2. 如果改了数据 → 生成/复制到生产服务器
3. 如果改了服务器代码 → 复制并 pm2 restart
4. 验证服务健康状态
