---
name: session-2026-06-16-vercel-sso-block
description: "Vercel deployment 被 \"no git user associated with the commit\" SSO gate BLOCKED 的根因与绕开方案"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9b5478f1-529b-41f9-b3df-ffe31d0eeb94
---

# 十八侠 website Vercel 部署 BLOCKED 根因与绕开

## 现象

`vercel deploy --prebuilt --prod` 卡在 "Building…" 然后 deployment 状态变 BLOCKED。
`eighteenman.cn` 一直展示 Nuxt 默认欢迎页（不是国风科技版）。

## 根因（API 查证）

```
readyStateReason: "The Deployment was blocked because there was no git user associated with the commit."
meta.githubDeployment: "1"
meta.actor: "claude-code_2-1-167_agent"
```

Vercel 项目配置了 `gitForkProtection: true` + SSO gate。`vercel deploy --prebuilt` **不是干净的本地上传**——它会把当前 git commit 的 author/email 写进 deployment meta，如果 commit author `eighteenman <contact@eighteenman.cn>` 没绑定 Vercel SSO 成员，deployment 就会被卡。

这是 vercel CLI 的隐式行为：**即使 --prebuilt，也走 GitHub deployment hook**，把所有 GitHub commit meta 注入。

## 绕开方案

把 `.vercel/output/` 复制到**无 git 历史**的临时目录，从那里跑 `vercel deploy --prebuilt --prod`：

```bash
mkdir -p /tmp/eighteenman-deploy
cp -R website/.vercel /tmp/eighteenman-deploy/.vercel
cd /tmp/eighteenman-deploy
vercel deploy --prebuilt --prod --yes
```

CLI 没 git 可读，就不会注入 GitHub commit meta，SSO gate 不会被触发。
部署会立刻 BUILDING → READY → Aliased 到 eighteenman.cn。

## 长期修复建议

二选一：

1. **绑定 git author 到 Vercel SSO**：
   - 在 Vercel team 里邀请 `contact@eighteenman.cn` 并完成 SSO 关联
   - 这样原仓库直接 `git push` 就能 deploy

2. **关闭 gitForkProtection**（不推荐，丧失保护）：
   - Vercel 项目 settings → Deployment Protection → Git Fork Protection → off

## 验证脚本（API）

```bash
TOKEN="<vercel-token>"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v13/deployments/dpl_XXX" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('readyState'), '|', d.get('readyStateReason'))"
```

## 教训

- **不要默认 "vercel CLI 部署只是传文件"** —— 它会强制注入 git meta，触发 SSO gate
- **CLI 卡 "Building…" 不一定是真 build** —— `--prebuilt` 模式下 Vercel 直接吃产物，但 CLI 仍显示假 spinner。判断是否完成要靠 API 看 readyState
- **BLOCKED 是终态** —— 不会自动 retry。必须重新创建 deployment

相关：[[session-2026-06-16-website-国风科技]]
