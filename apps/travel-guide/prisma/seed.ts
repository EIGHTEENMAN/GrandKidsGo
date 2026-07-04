import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const author1 = await prisma.user.upsert({
    where: { id: 'seed-author-1' },
    update: {},
    create: { id: 'seed-author-1', username: 'travel_mom', nickname: '带娃旅行的妈妈', role: 'author', password: '$2a$10$dummyhashseedusers' },
  });
  const author2 = await prisma.user.upsert({
    where: { id: 'seed-author-2' },
    update: {},
    create: { id: 'seed-author-2', username: 'daddy_zhou', nickname: '周爸爸', role: 'author', password: '$2a$10$dummyhashseedusers' },
  });
  const author3 = await prisma.user.upsert({
    where: { id: 'seed-author-3' },
    update: {},
    create: { id: 'seed-author-3', username: 'travel_expert', nickname: '亲子游达人', role: 'author', password: '$2a$10$dummyhashseedusers' },
  });

  const guides = [
    { id: 'guide-1', title: '带3岁宝宝第一次坐飞机全攻略', summary: '从选航班时间到机上安抚技巧，让第一次飞行不再焦虑。', destination: '三亚', category: '国内游', ageRange: '0-3岁', days: 5, budget: 8000, isPublish: true, authorId: 'seed-author-1',
      sections: [
        { title: '为什么选择三亚作为第一站', content: '三亚是国内最适合低龄宝宝亲子游的目的地之一。飞行时间短，气候温暖，酒店设施完善。我们选择海棠湾区域的亲子酒店，有专门的儿童泳池和托管服务。' },
        { title: '行前准备清单', content: '证件类：户口本/出生证明（婴儿乘机必备）。衣物类：防晒衣、泳衣、拖鞋。药品类：退烧药、体温计、创可贴、防蚊液。饮食类：小饼干、果泥、奶粉、保温杯。玩具类：贴纸书、iPad提前下载动画片。' },
        { title: '航班选择技巧', content: '建议选择宝宝午睡时间的航班。尽量避开红眼航班和太早的航班。选座选第一排或紧急出口前一排（空间更大）。提前在app上预订儿童餐。' },
        { title: '机上安抚指南', content: '起飞和降落时给宝宝喝水或吃零食，有助于缓解耳压不适。准备新玩具，每15-20分钟换一个节目。空乘人员通常也会提供帮助。' },
      ] },
    { id: 'guide-2', title: '暑假带孩子游北京：5天4晚精华路线', summary: '故宫、长城、科技馆...北京适合孩子的景点怎么选？怎么玩不累？', destination: '北京', category: '国内游', ageRange: '6-12岁', days: 5, budget: 12000, isPublish: true, authorId: 'seed-author-2',
      sections: [
        { title: 'Day 1: 抵达+天安门广场', content: '下午抵达后入住前门附近酒店，傍晚去天安门广场看降旗仪式。晚餐推荐前门大街的炸酱面馆。' },
        { title: 'Day 2: 故宫+景山公园', content: '故宫门票提前10天预约！建议走中轴线+东六宫路线，大约3-4小时。租一个讲解器有儿童版。从神武门出去对面就是景山公园。' },
        { title: 'Day 3: 中国科技馆+鸟巢', content: '中国科学技术馆绝对是孩子的最爱！提前预约儿童科学乐园。巨幕影院也要提前购票。下午去鸟巢水立方外面拍照即可。' },
        { title: 'Day 4: 慕田峪长城', content: '推荐慕田峪长城而不是八达岭，人少很多。带孩子走1-2个敌楼就可以。山下有滑道下来，孩子超喜欢！' },
        { title: 'Day 5: 颐和园+返程', content: '上午去颐和园，从东宫门进，坐船到十七孔桥。中午在附近吃烤鸭，下午去机场。' },
      ] },
    { id: 'guide-3', title: '新加坡亲子游：环球影城+动物园+海边', summary: '新加坡是亲子游的天堂，干净安全、中文畅通。7天6晚深度游。', destination: '新加坡', category: '出境游', ageRange: '3-6岁', days: 7, budget: 25000, isPublish: true, authorId: 'seed-author-1',
      sections: [
        { title: '签证和行前准备', content: '新加坡电子签3-5个工作日出签。买EZ-Link卡，儿童7岁以下免费坐地铁。' },
        { title: '圣淘沙岛2日游', content: '环球影城低龄项目很多，马达加斯加区适合3-6岁。SEA海洋馆的魔鬼鱼池和触摸池是孩子最爱。' },
        { title: '动物园系列', content: '日间动物园早餐与猩猩共进。夜间动物园看精灵动物表演。河川生态园坐船看大熊猫。' },
        { title: '市区景点', content: '滨海湾花园室内瀑布孩子惊叹不已。超级树灯光秀每晚7:45和8:45免费。坐鸭子船孩子觉得超酷。' },
      ] },
    { id: 'guide-4', title: '台北亲子游：5天4晚深度探索中国台湾台北', summary: '带娃玩转台北：故宫博物院、猫空缆车、儿童乐园、士林夜市，感受宝岛魅力。', destination: '中国台湾台北', category: '出境游', ageRange: '6-12岁', days: 5, budget: 20000, isPublish: true, authorId: 'seed-author-3',
      sections: [
        { title: 'Day 1: 台北故宫博物院+士林夜市', content: '台北故宫博物院有专门的儿童导览手册，翠玉白菜和肉形石是必看展品。下午可以在至善园散步。晚上逛士林夜市，推荐蚵仔煎、大肠包小肠、芒果冰。' },
        { title: 'Day 2: 猫空缆车+台北市立动物园', content: '早上坐猫空水晶缆车上山，透明地板看山景茶园，俯瞰台北盆地。下午去旁边的台北市立动物园，熊猫馆是孩子最爱，门票超便宜。' },
        { title: 'Day 3: 儿童新乐园+美丽华摩天轮', content: '台北儿童新乐园有摩天轮、旋转木马、云霄飞车等丰富游乐设施，适合各年龄段儿童。晚上去美丽华百乐园坐百米摩天轮看台北夜景。' },
        { title: 'Day 4: 北投温泉+地热谷+淡水老街', content: '北投温泉博物馆和地热谷是免费景点，孩子可以看冒烟的温泉池。下午去淡水老街，吃阿给和鱼丸汤，坐船看夕阳。' },
        { title: 'Day 5: 中正纪念堂+西门町+返程', content: '上午参观中正纪念堂和自由广场，了解台湾历史。下午去西门町逛街购物，买伴手礼。傍晚去机场返程。' },
      ] },
    { id: 'guide-5', title: '周末亲子露营：装备清单+营地推荐', summary: '第一次带孩子露营需要准备什么？江浙沪有哪些适合新手的亲子露营地？', destination: '杭州', category: '周边游', ageRange: '3-12岁', days: 2, budget: 2000, isPublish: true, authorId: 'seed-author-2',
      sections: [
        { title: '入门装备推荐', content: '帐篷推荐迪卡侬速开帐篷。睡袋根据季节选择温标。防潮垫必买，铝箔垫+充气垫双层最好。头灯每人一个。炊具用卡式炉+套锅。' },
        { title: '杭州周边营地推荐', content: '1. 径山竹海营地：杭州市区开车1小时。2. 莫干山庾村营地：适合新手。3. 安吉云上草原营地：海拔高夏天凉快。4. 桐庐瑶琳营地：富春江边风景好。' },
        { title: '亲子露营活动建议', content: '白天：搭帐篷比赛、自然探索、放风筝。晚上：篝火晚会烤棉花糖、观星。第二天早上一起做早餐。' },
      ] },
  ];

  for (const guide of guides) {
    const { sections, ...guideData } = guide;
    await prisma.guide.upsert({
      where: { id: guide.id },
      update: {},
      create: { ...guideData, sections: { create: sections.map((s, i) => ({ ...s, order: i })) } },
    });
  }

  const ratings = [
    { guideId: 'guide-1', userId: 'seed-author-2', score: 5 },
    { guideId: 'guide-1', userId: 'seed-author-3', score: 4 },
    { guideId: 'guide-2', userId: 'seed-author-1', score: 5 },
    { guideId: 'guide-2', userId: 'seed-author-3', score: 4 },
    { guideId: 'guide-3', userId: 'seed-author-2', score: 5 },
    { guideId: 'guide-4', userId: 'seed-author-1', score: 4 },
    { guideId: 'guide-5', userId: 'seed-author-1', score: 5 },
    { guideId: 'guide-5', userId: 'seed-author-3', score: 5 },
  ];
  for (const r of ratings) {
    await prisma.rating.upsert({ where: { guideId_userId: { guideId: r.guideId, userId: r.userId } }, update: {}, create: r });
  }

  const comments = [
    { content: '太实用了！下个月正打算带宝宝去三亚，收藏了！', guideId: 'guide-1', userId: 'seed-author-2' },
    { content: '写的很详细，特别是飞机上安抚那部分，太有同感了', guideId: 'guide-1', userId: 'seed-author-3' },
    { content: '北京那个科技馆确实不错，我家娃去了三次还想去', guideId: 'guide-2', userId: 'seed-author-1' },
  ];
  for (const c of comments) {
    await prisma.comment.create({ data: c });
  }

  console.log('Seed data created!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
