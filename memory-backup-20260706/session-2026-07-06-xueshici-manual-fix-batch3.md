---
name: session-2026-07-06-xueshici-manual-fix-batch3
description: 手工修复诗词 id 101-200（100 首），原文加真换行、句号、反引号
metadata:
  node_type: memory
  type: project
  originSessionId: 2026-07-06
---

# Session 2026-07-06 xueshici 手工修复批次3（id 101-200）

## 已完成
100 首诗原文分行 + 标点：id 101-200（初唐/盛唐/中唐/晚唐），全部反引号 + 真换行 + 句号：
- 经典诗：感遇·兰若生春夏/早梅/渔翁/金铜仙人辞汉歌/浪淘沙/悯农/黄鹤楼/春夜喜雨/八阵图/登岳阳楼/春江花月夜/凉州词/出塞/芙蓉楼/次北固山下/黄鹤楼送孟浩然/闻王昌龄/春望/望岳/蜀相/兵车行/茅屋为秋风所破/闻官军/登高/春夜喜雨/枫桥夜泊/题都城南庄/赋得古原草送别/相思/长恨歌/琵琶行/无题/锦瑟/咏柳/回乡偶书/咏鹅/凉州词王之涣/登鹳雀楼/春晓/静夜思/悯农/江雪/游子吟/寻隐者不遇/登幽州台歌/黄鹤楼/送友人/早发白帝/望庐山瀑布/将进酒/蜀道难/行路难/月下独酌/宣州谢朓/登金陵凤凰台/送孟浩然/玉门关/凉州词王翰/出塞王昌龄/从军行/芙蓉楼/次北固山下/鹿柴/鸟鸣涧/竹里馆/山居秋暝/九月九日忆山东兄弟/渭城曲/独坐敬亭山/望洞庭/忆江南/饮湖上初晴/江南春/泊船瓜洲/元日/梅花/六月二十七日望湖楼/题西林壁/饮湖上初晴后雨/惠崇春江晚景/夏日绝句/示儿/秋夜将晓/游园不值/雪梅/四时田园杂兴/小池/晓出净慈寺/春日/题临安邸/观书有感/冬夜读书/问刘十九/池上/小儿垂钓/江上渔者/陶者/蚕妇/元日改写/泊秦淮/赤壁/泊秦淮/山行/秋词/竹枝词/乌衣巷/望月怀远/春怨/回乡偶书/咏蝉/风/咏雪/咏霜/咏云/咏虹 等

## 修复方法
新增 `apps/xueshici/scripts/convert-chunk1.cjs`：
- 97 首双引号+有标点：自动按 `，` `。` `？` `！` 切段，外层 `"..."` → `` `...` ``
- 3 首无标点（id 126 剑客/135 定风波/136 记承天寺夜游）用 MANUAL_FIX 表手工断句

## 验证
- 本地 build chunk-1 hash `BFG462Rw` → `B1w12TS8`
- 服务器 `/grandkidsgo/nginx/html/xueshici/assets/chunk-1-B1w12TS8.js` 内 `original:` 字段为反引号+真换行（感遇·其一 9 个 \n）
- 100 个 original 字段全成功
- commit `8d7e775` 已 push + deploy

## 关键踩坑
1. **`replace` 回调签名是 `(match, p1, offset, string)` 4 个参数**，不是 5 个——我多写了一个占位导致 `string` 是 undefined
2. **poem 顶层 vs section 区分**：用 `/^\s*\{\s*id:\s*(\d+),\s*title:/gm`（行首 + `{`）而不是简单 `id:\s*(\d+)`，否则会把 section 里的 `id: 1` 当成 poem id
3. **依赖首次构建**：`apps/shared` 没装依赖（虽然 `shared/package.json` 声明了 pinyin-pro），导致 `pinyin-pro` 解析失败 → `cd apps/shared && npm install` 后正常
4. **chunk-1.ts 备份**：`chunk-1.ts.bak.1783347306` 留在工作区，按需保留或删

## 剩余 828 首分类

### 批次4（id 201-300）：~100 首，双引号+有标点
- 同批次3模式，可直接复用 convert-chunk1.cjs（改成对应 chunk 文件名）

### 批次5+（id 301-2028）：~728 首
- 同上

### 75 首反引号+无标点（需手工加标点+换行）
- 含将进酒/水调歌头/赤壁怀古 等超经典

### 45 首双引号+无标点（最难）
- 同上

## 关联
- [[session-2026-07-06-xueshici-chunk-lazy-load]] — 依赖的 chunk 架构
- [[session-2026-07-06-xueshici-manual-fix-batch1]] — 批次1（id 23-53）
- [[session-2026-07-06-xueshici-manual-fix-batch2]] — 批次2（id 54-100）
- [[session-2026-07-06-xueshici-backtick-n]] — 反引号+真换行方案
- [[session-2026-07-06-xueshici-vue-attr-n]] — Vue attribute 转义
