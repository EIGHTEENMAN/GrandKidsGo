// 给现有景点添加标签（v3.6 上线种子数据）
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TAG_MAPPING = {
  '野生动物': ['动物', '户外', '主题乐园'],
  '动物园': ['动物', '户外'],
  '海洋馆': ['动物', '室内'],
  '水族馆': ['动物', '室内'],
  '博物馆': ['历史', '文化', '研学', '室内'],
  '科技馆': ['科技', '研学', '室内'],
  '图书馆': ['文化', '室内'],
  '故宫': ['历史', '古迹', '研学'],
  '长城': ['历史', '古迹', '户外', '爬山'],
  '天安门': ['历史', '古迹'],
  '西湖': ['自然', '户外', '古迹', '研学'],
  '黄山': ['爬山', '自然', '户外'],
  '九寨沟': ['自然', '户外'],
  '丽江': ['自然', '文化', '古迹'],
  '三亚': ['海边', '玩水', '户外'],
  '海岛': ['海边', '玩水', '户外'],
  '沙滩': ['海边', '玩水'],
  '滑雪': ['滑雪', '户外'],
  '冰雪': ['滑雪', '室内'],
  '游乐园': ['主题乐园', '刺激', '户外'],
  '迪士尼': ['主题乐园', '户外'],
  '欢乐谷': ['主题乐园', '刺激'],
  '水上乐园': ['玩水', '主题乐园', '刺激'],
  '海洋公园': ['玩水', '动物', '主题乐园'],
  '采摘园': ['采摘', '户外'],
  '果园': ['采摘', '户外'],
  '农场': ['采摘', '户外', '自然'],
  '露营': ['露营', '户外', '自然'],
  '漂流': ['漂流', '玩水', '户外'],
  '游船': ['游船', '户外'],
};

const DEFAULT_TAGS = ['户外', '自然'];

async function main() {
  const spots = await prisma.spot.findMany({ select: { id: true, name: true, tags: true } });
  console.log(`Found ${spots.length} spots`);

  let updated = 0;
  for (const s of spots) {
    const matchedTags = new Set();
    for (const keyword of Object.keys(TAG_MAPPING)) {
      if (s.name.includes(keyword)) {
        TAG_MAPPING[keyword].forEach((t) => matchedTags.add(t));
      }
    }
    if (matchedTags.size === 0) {
      DEFAULT_TAGS.forEach((t) => matchedTags.add(t));
    }
    const existing = s.tags || [];
    existing.forEach((t) => matchedTags.add(t));
    const newTags = Array.from(matchedTags);
    await prisma.spot.update({
      where: { id: s.id },
      data: { tags: newTags },
    });
    console.log(`OK ${s.name}: ${newTags.join(', ')}`);
    updated++;
  }
  console.log(`\nUpdated ${updated} spots with tags`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
