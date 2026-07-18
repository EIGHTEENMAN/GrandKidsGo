---
name: vercel-json-framework-nuxtjs
description: vercel.json framework 字段值是 nuxtjs 不是 nuxt——Vercel 白名单枚举，否则 deploy 报 400 Invalid request
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ab073bf8-53ec-4165-ab5f-0be6f93654d9
---

# Vercel framework 配置

`vercel.json` 里 `framework` 字段，**Nuxt 项目必须写 `"nuxtjs"`**，不是 `"nuxt"`。

Vercel 白名单枚举（部分）：
blitzjs, nextjs, gatsby, remix, react-router, astro, hexo, eleventy, docusaurus-2, docusaurus, preact, solidstart-1, solidstart, dojo, ember, vue, scully, ionic-angular, angular, polymer, svelte, sveltekit, sveltekit-1, ionic-react, create-react-app, gridsome, umijs, sapper, saber, stencil, **nuxtjs**, redwoodjs, hugo, jekyll, brunch, middleman, zola, hydrogen, vite, tanstack-start, vitepress, vuepress, parcel, fastapi, flask, fasthtml, django, ash, eve, sanity, sanity-v2, storybook, nitro, hono, express, h3, koa, nestjs, elysia, fastify, xmcp, python, ruby, rust, axum, actix-web, bun, node, go, services, mastra

写错后的报错：
```
Invalid request: `projectSettings.framework` should be equal to one of the allowed values ...
```

**Why:** website 仓库 commit 3baa682 (2026-06-09) 自称"修复Vercel框架配置"，但没把 vercel.json 改对，导致后续所有 git push 都部署成功（webhook 自动），CLI 手动 deploy 才暴露报错。直到 2026-06-19 才彻底修干净。

**How to apply:**
- 给 Nuxt 项目配 vercel.json 时直接写 `"nuxtjs"`
- Vercel 部署报 framework 错误，先检查 vercel.json 而不是 framework detection
- 修复 vercel.json 必须 commit + push，因为 Vercel 从 git HEAD 读，不读本地未提交文件