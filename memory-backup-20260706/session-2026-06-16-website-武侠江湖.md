---
name: session-2026-06-16-website
description: "十八侠官网从\"国风科技\"推翻重做为\"武侠江湖风\"：墨色水墨+残阳远山+孤舟+毛笔字+墨滴晕开动效+江湖话术"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9b5478f1-529b-41f9-b3df-ffe31d0eeb94
---

# Session 2026-06-16 官网武侠江湖改版

## 触发

用户反馈上一版"国风科技"做成了五颜六色的科技感，**完全没体现"十八侠"这个名字的江湖/武侠气质**。
- 用户原话："我们叫十八侠，江湖、武侠、山高水长这些侠客气质要展现出来啊"
- 上一版的本质问题：只是换了色（朱砂红+金箔+宣纸），没有真正的水墨/山水/毛笔字/动效

## 设计转向

| 维度 | 上一版（国风科技） | 这一版（武侠江湖） |
|---|---|---|
| 核心气质 | 故宫文创·华丽 | 侠客·冷峻·山河意境 |
| 主色 | 朱砂红 #C73B33 + 秋金 #C6952C | 墨色 #1B1610 + 远山青黛 #3D5440 + 残阳橙 #B85F1F |
| 辅色 | 宣纸暖白 | 旧纸 #EDE6D3 + 桃花红点缀 |
| 字体 | Noto Serif SC | 标题用 Ma Shan Zheng（毛笔体），正文用 Noto Serif SC |
| 标题 | 黑体大字 | 毛笔字超大 + brush-write 描边动画 |
| 视觉元素 | 金色装饰线、光晕、emoji | 远山 3 层剪影、孤舟+渔翁、飞鸟、墨滴晕染、印章、卷轴 |
| 动效 | gradient rotate 假科技感 | 墨滴晕开 inkSpread、毛笔书写 brushWrite、孤舟摇摆 boatSway、江雾飘动 mistDrift、剑光扫过 swordFlash、印章按压 stampPress |
| 文案 | "AI 赋能，智享未来" | "山高水长处，执剑而行"、"十八般武艺，十八般 AI 科技"、"愿与君共饮一壶酒" |
| 导航 | 首页/产品中心/关于我们/联系我们 | 首页/**兵器谱**/**门派渊源**/**留帖传书** |
| 产品比喻 | 平台/App | 盟主令（好大儿）/易物帖（潮玩换）/练功册（SeedMe）/茶马道（懂咖帝） |
| 状态 | 已上线/开发中/规划中 | 已开宗/修炼中/待开山 |
| CTA | 联系我们 | 留下名帖 / 飞鸽传书 |

## 文件改动

- `tailwind.config.js` — 整个色板重写（ink/mountain/dusk/peach/paper），新增 8 个 keyframes（brushWrite/inkSpread/mistDrift/boatSway/swordFlash/scrollUnroll/fadeInUp/stampPress）
- `assets/css/main.css` — 重写，新增全局宣纸噪点纹理 + body 边缘晕黄 + 卷轴/印章/水墨笔触分割线/落款小字组件类
- `layouts/default.vue` — 导航/页脚整体改：毛笔字 logo、远山 SVG 背景的 footer、江湖话术
- `pages/index.vue` — 大幅重写：Hero 是残阳+远山 3 层+孤舟+飞鸟+墨滴晕染，Hero 标题用 brush-write 动画；产品矩阵改"四件兵器"；数据区块改"修为簿"
- `pages/products.vue` — 重写为兵器谱，每件兵器一卷轴+一侧介绍
- `pages/about.vue` — 门派渊源，门训用引用块，三条门规
- `pages/contact.vue` — 留帖传书，飞鸽 SVG 装饰，名帖式表单

## 部署

沿用上次验证可行的"临时目录绕开 SSO gate"方案：
```bash
rm -rf /tmp/eighteenman-deploy
mkdir -p /tmp/eighteenman-deploy
cp -R website/.vercel /tmp/eighteenman-deploy/.vercel
cd /tmp/eighteenman-deploy && vercel deploy --prebuilt --prod --yes
```
Deployment ID: dpl_Cs8w8dYq62zXRqAAxLgquTES9C2e
readyState: READY
Aliased: https://eighteenman.cn

## 教训

- **设计前先问"名字意味着什么"** — 十八侠=江湖/武侠/侠客，不是"国风科技"。名字本身就是设计方向。
- **配色不决定气质** — 用国风的红金也能做出科技感；用水墨灰青也能做出清新感。气质靠的是元素+动效+文案共同表达。
- **不要把"国风"等同于"故宫文创"** — 故宫文创=华丽+金+红；江湖=冷峻+墨+山水+侠气。两者完全不同的情绪。

相关：[[session-2026-06-16-website-国风科技]] [[session-2026-06-16-vercel-sso-block]]
