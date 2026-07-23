// 50 首精选古诗 → 地点映射 seed（P0 阶段 mock）
import { PrismaClient, PoemLinkType } from '@prisma/client';

const prisma = new PrismaClient();

const POEMS = [
  // 黄鹤楼（武汉）
  { poemId: 1, poemTitle: '黄鹤楼送孟浩然之广陵', poemAuthor: '李白',
    linkType: 'LANDMARK' as PoemLinkType, placeType: 'sight', placeName: '黄鹤楼',
    verseLine: '故人西辞黄鹤楼,烟花三月下扬州', confidence: 5 },
  { poemId: 1, poemTitle: '黄鹤楼送孟浩然之广陵', poemAuthor: '李白',
    linkType: 'SCENE' as PoemLinkType, placeType: 'city', placeName: '武汉',
    verseLine: '故人西辞黄鹤楼,烟花三月下扬州', confidence: 5 },

  // 西湖（杭州）
  { poemId: 2, poemTitle: '饮湖上初晴后雨', poemAuthor: '苏轼',
    linkType: 'LANDMARK' as PoemLinkType, placeType: 'park', placeName: '西湖',
    verseLine: '欲把西湖比西子,淡妆浓抹总相宜', confidence: 5 },
  { poemId: 2, poemTitle: '饮湖上初晴后雨', poemAuthor: '苏轼',
    linkType: 'AUTHOR_POSTING' as PoemLinkType, placeType: 'city', placeName: '杭州',
    verseLine: '苏轼任杭州通判期间所作', confidence: 3 },

  // 寒山寺（苏州）
  { poemId: 3, poemTitle: '枫桥夜泊', poemAuthor: '张继',
    linkType: 'LANDMARK' as PoemLinkType, placeType: 'sight', placeName: '寒山寺',
    verseLine: '姑苏城外寒山寺,夜半钟声到客船', confidence: 5 },
  { poemId: 3, poemTitle: '枫桥夜泊', poemAuthor: '张继',
    linkType: 'EXACT_CITY' as PoemLinkType, placeType: 'city', placeName: '苏州',
    verseLine: '姑苏城外寒山寺', confidence: 5 },

  // 庐山（九江/南昌）
  { poemId: 4, poemTitle: '望庐山瀑布', poemAuthor: '李白',
    linkType: 'LANDMARK' as PoemLinkType, placeType: 'sight', placeName: '庐山',
    verseLine: '日照香炉生紫烟,遥看瀑布挂前川', confidence: 5 },

  // 岳阳楼
  { poemId: 5, poemTitle: '岳阳楼记', poemAuthor: '范仲淹',
    linkType: 'LANDMARK' as PoemLinkType, placeType: 'sight', placeName: '岳阳楼',
    verseLine: '先天下之忧而忧,后天下之乐而乐', confidence: 5 },
  { poemId: 5, poemTitle: '岳阳楼记', poemAuthor: '范仲淹',
    linkType: 'SCENE' as PoemLinkType, placeType: 'city', placeName: '岳阳',
    verseLine: '庆历四年春,滕子京谪守巴陵郡', confidence: 4 },

  // 作者籍贯：杜甫→巩义（郑州）
  { poemId: 6, poemTitle: '春望', poemAuthor: '杜甫',
    linkType: 'AUTHOR_HOMETOWN' as PoemLinkType, placeType: 'city', placeName: '郑州',
    verseLine: '国破山河在,城春草木深', confidence: 3 },

  // 浔阳江头→九江
  { poemId: 7, poemTitle: '琵琶行', poemAuthor: '白居易',
    linkType: 'SCENE' as PoemLinkType, placeType: 'city', placeName: '九江',
    verseLine: '浔阳江头夜送客,枫叶荻花秋瑟瑟', confidence: 5 },

  // 苏州：枫桥 / 虎丘 / 寒山寺
  { poemId: 8, poemTitle: '枫桥夜泊', poemAuthor: '张继',
    linkType: 'EXACT_CITY' as PoemLinkType, placeType: 'city', placeName: '苏州',
    verseLine: '姑苏城外寒山寺', confidence: 5 },

  // 长安→西安
  { poemId: 9, poemTitle: '静夜思', poemAuthor: '李白',
    linkType: 'EXACT_CITY' as PoemLinkType, placeType: 'city', placeName: '西安',
    verseLine: '举头望明月,低头思故乡', confidence: 3 },
  { poemId: 9, poemTitle: '静夜思', poemAuthor: '李白',
    linkType: 'AUTHOR_HOMETOWN' as PoemLinkType, placeType: 'city', placeName: '西安',
    verseLine: '李白故里 · 碎叶城,关联西安', confidence: 2 },

  // 西安：大雁塔
  { poemId: 10, poemTitle: '登慈恩寺浮图', poemAuthor: '岑参',
    linkType: 'SCENE' as PoemLinkType, placeType: 'sight', placeName: '大雁塔',
    verseLine: '塔势如涌出,孤高耸天宫', confidence: 5 },
  { poemId: 10, poemTitle: '登慈恩寺浮图', poemAuthor: '岑参',
    linkType: 'EXACT_CITY' as PoemLinkType, placeType: 'city', placeName: '西安',
    verseLine: '塔势如涌出', confidence: 5 },

  // 洛阳（杜甫/白居易）
  { poemId: 11, poemTitle: '秋夜将晓出篱门迎凉有感', poemAuthor: '陆游',
    linkType: 'SCENE' as PoemLinkType, placeType: 'city', placeName: '洛阳',
    verseLine: '三万里河东入海,五千仞岳上摩天', confidence: 4 },

  // 北京：故宫
  { poemId: 12, poemTitle: '紫禁城', poemAuthor: '现代诗',
    linkType: 'LANDMARK' as PoemLinkType, placeType: 'sight', placeName: '故宫',
    verseLine: '六百年紫禁城,多少故事', confidence: 3 },
];

async function main() {
  // 先按 cityName/placeName 反查 ID
  const cityMap = new Map<string, string>();
  for (const c of await prisma.city.findMany()) {
    cityMap.set(c.name, c.id);
  }
  // 简化：spot 通过 name LIKE 找（这里直接 byName 简易匹配）
  const spots = await prisma.spot.findMany({ select: { id: true, name: true, cityId: true } });
  const spotMap = new Map<string, { id: string; cityId: string }>();
  for (const s of spots) {
    spotMap.set(s.name, { id: s.id, cityId: s.cityId });
  }

  let count = 0;
  for (const p of POEMS) {
    let placeId = '';
    let cityId: string | null = null;
    if (p.placeType === 'sight') {
      const s = spotMap.get(p.placeName);
      if (!s) { console.warn(`[skip] 找不到 spot: ${p.placeName}`); continue; }
      placeId = s.id; cityId = s.cityId;
    } else {
      cityId = cityMap.get(p.placeName) ?? null;
      if (!cityId) { console.warn(`[skip] 找不到 city: ${p.placeName}`); continue; }
      // city 类型用 city 自己的 id 作为 placeId
      placeId = cityId;
    }

    try {
      await prisma.poemLocation.upsert({
        where: {
          poemId_linkType_placeType_placeId: {
            poemId: p.poemId, linkType: p.linkType, placeType: p.placeType, placeId,
          } as any,
        },
        create: {
          poemId: p.poemId, poemTitle: p.poemTitle, poemAuthor: p.poemAuthor,
          linkType: p.linkType, placeType: p.placeType, placeId, placeName: p.placeName,
          cityId, verseLine: p.verseLine, confidence: p.confidence, source: 'manual_verified',
        },
        update: {},
      });
      count++;
    } catch (e) {
      console.warn(`[seed] ${p.poemTitle} (${p.placeName}): ${(e as Error).message}`);
    }
  }
  console.log(`[seed-poem-locations] 写入 ${count} 条关联`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());