/**
 * 种子数据：创建 15 条已发布的真实攻略
 *
 * 用途：
 * - 首页热门攻略（按 like+save*2 排序取 12 条，需 12+ 条竞争）
 * - 攻略列表 /guides 可浏览可点击进入详情页
 * - 排行榜 snapshot 跑批后出数据
 *
 * 图片：Unsplash 真实旅行摄影（无渐变/纯色/emoji）
 * 执行：npx tsx prisma/seed-guides.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 种子用户 ID（无 User 表，纯引用字符串）
const SEED_USER = "seed-user-00000000-0000-0000-0000-000000000001";

// 城市 ID
const CITY_IDS = {
  beijing: "city-beijing",
  shanghai: "city-shanghai",
  guangzhou: "city-guangzhou",
};

// ============================================================
// 真实 Unsplash 旅行照片 URL
// ============================================================
const PHOTOS = {
  greatWall: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1200&q=80",
  forbiddenCity: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=1200&q=80",
  beijingHutong: "https://images.unsplash.com/photo-1591126524143-3910a9ff4837?w=1200&q=80",
  summerPalace: "https://images.unsplash.com/photo-1547146573-99c89acc629c?w=1200&q=80",
  templeHeaven: "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1200&q=80",
  shanghaiSkyline: "https://images.unsplash.com/photo-1538428494232-9c0d8a3ab403?w=1200&q=80",
  shanghaiBund: "https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=1200&q=80",
  disneyCastle: "https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=1200&q=80",
  guangzhouCanton: "https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?w=1200&q=80",
  guangzhouNight: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&q=80",
  oceanWorld: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1200&q=80",
  museum: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200&q=80",
  zoo: "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=1200&q=80",
  park: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=1200&q=80",
  science: "https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=1200&q=80",
  mountain: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80",
  lake: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
  family: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=1200&q=80",
  nightView: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
};

// ============================================================
// 攻略定义
// ============================================================
interface GuideSeed {
  title: string;
  coverImage: string;
  cityId: string;
  cityName: string;
  days: number;
  childAges: number[]; // 月龄
  travelStyle: string;
  tags: string[];
  viewCount: number;
  saveCount: number;
  likeCount: number;
  daysAgo: number; // 几天前发布
  contentHtml: string;
}

function htmlGuide(
  title: string,
  cover: string,
  city: string,
  days: number,
  sections: { heading: string; body: string }[],
  tips: string[],
): string {
  const sectionHtml = sections
    .map(
      (s) => `
    <h2 style="font-size:22px;font-weight:700;margin:28px 0 12px;color:#1a1a2e;">${s.heading}</h2>
    <p style="font-size:16px;line-height:1.85;color:#333;margin-bottom:16px;">${s.body}</p>`,
    )
    .join("");

  const tipsHtml =
    tips.length > 0
      ? `
    <h2 style="font-size:22px;font-weight:700;margin:28px 0 12px;color:#1a1a2e;">实用贴士</h2>
    <ul style="font-size:16px;line-height:1.85;color:#333;padding-left:20px;">${tips.map((t) => `<li style="margin-bottom:8px;">${t}</li>`).join("")}</ul>`
      : "";

  return `<article style="max-width:720px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <img src="${cover}" alt="${title}" style="width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin-bottom:24px;" />
    <h1 style="font-size:28px;font-weight:800;color:#1a1a2e;margin-bottom:8px;">${title}</h1>
    <p style="font-size:15px;color:#888;margin-bottom:24px;">${city} · ${days} 天亲子行程</p>
    ${sectionHtml}
    ${tipsHtml}
    <p style="font-size:14px;color:#aaa;margin-top:40px;padding-top:20px;border-top:1px solid #eee;">本文由走天下用户分享，转载请注明出处。</p>
  </article>`;
}

const GUIDES: GuideSeed[] = [
  // ===================== 北京（6 条）=====================
  {
    title: "北京 5 天 4 晚亲子深度游｜故宫长城动物园全覆盖",
    coverImage: PHOTOS.forbiddenCity,
    cityId: CITY_IDS.beijing,
    cityName: "北京",
    days: 5,
    childAges: [48, 60], // 4-5 岁
    travelStyle: "深度游",
    tags: ["历史", "博物馆", "动物园", "公园", "亲子"],
    viewCount: 3850,
    saveCount: 520,
    likeCount: 186,
    daysAgo: 2,
    contentHtml: htmlGuide(
      "北京 5 天 4 晚亲子深度游｜故宫长城动物园全覆盖",
      PHOTOS.forbiddenCity,
      "北京",
      5,
      [
        {
          heading: "Day 1：故宫 + 景山公园",
          body: "上午 9:00 从午门进入故宫，建议提前在「故宫博物院」小程序预约门票。带孩子走中轴线，重点看太和殿、乾清宫和御花园。故宫很大，4-5 岁的孩子一般能坚持 2-3 小时，所以中间可以在御花园休息一下。下午去对面的景山公园，登万春亭俯瞰故宫全景，孩子会特别喜欢看下面金灿灿的屋顶。",
        },
        {
          heading: "Day 2：八达岭长城",
          body: "提前一天在「八达岭长城」公众号买票。推荐坐 S2 线火车过去，沿途风景很美，孩子也喜欢坐火车。长城上风大，记得带件薄外套。我们只爬了北一楼到北四楼，对孩子来说刚刚好，既体验了「不到长城非好汉」，又不会太累。下山后去长城脚下的熊乐园，孩子可以喂熊，非常开心。",
        },
        {
          heading: "Day 3：北京动物园 + 海洋馆",
          body: "北京动物园很大，建议早上 8:30 开门就去。必看：熊猫馆、狮虎山、大象馆。园内的海洋馆也很棒，有海豚表演和白鲸表演，场次可以在入口处查。带上推车，动物园里步行距离很长。中午可以在园内的餐厅解决，品质一般但方便。",
        },
        {
          heading: "Day 4：天坛 + 自然博物馆",
          body: "天坛公园非常适合遛娃，祈年殿是必打卡的地标。公园里有很多老人在踢毽子、打太极、写地书，孩子看得津津有味。下午步行到旁边的北京自然博物馆（免费但需预约），恐龙骨架和各种动物标本是孩子的最爱。",
        },
        {
          heading: "Day 5：颐和园 + 返程",
          body: "最后一天安排了轻松的颐和园半日游。从东宫门进，沿着长廊走到石舫，然后在昆明湖边喂鸭子。如果时间充裕，可以租一条小船在湖上划。下午根据航班/高铁时间安排返程。",
        },
      ],
      [
        "北京地铁很方便，下载「亿通行」APP 扫码乘车",
        "故宫和自然博物馆都需要提前预约，旺季建议提前 3-5 天",
        "4-5 岁孩子每天安排 2-3 个景点比较合理，中间一定要留休息时间",
        "北京秋天（9-10 月）是最佳季节，天气凉爽，银杏叶金黄",
      ],
    ),
  },
  {
    title: "带娃逛北京胡同｜南锣鼓巷-什刹海-鼓楼一日漫步",
    coverImage: PHOTOS.beijingHutong,
    cityId: CITY_IDS.beijing,
    cityName: "北京",
    days: 1,
    childAges: [36, 72], // 3-6 岁
    travelStyle: "慢游",
    tags: ["文化", "美食", "步行"],
    viewCount: 2120,
    saveCount: 340,
    likeCount: 128,
    daysAgo: 5,
    contentHtml: htmlGuide(
      "带娃逛北京胡同｜南锣鼓巷-什刹海-鼓楼一日漫步",
      PHOTOS.beijingHutong,
      "北京",
      1,
      [
        {
          heading: "路线概览",
          body: "这是一条非常适合亲子的胡同漫步路线，全程约 3 公里，走走停停大约需要 4-5 小时。从南锣鼓巷地铁站出发，一路向北到鼓楼，再向西到什刹海。路面平坦，推车友好。",
        },
        {
          heading: "南锣鼓巷",
          body: "虽然是游客聚集地，但胡同里的烟火气很浓。孩子喜欢看胡同口下棋的老爷爷、晒太阳的猫咪和各种特色小店。推荐尝试文宇奶酪和冰糖葫芦。注意：主街人多，看好孩子。",
        },
        {
          heading: "什刹海",
          body: "到了什刹海一定要坐人力三轮车逛胡同，车夫会讲很多有趣的老北京故事。冬天湖面结冰后可以滑冰车，夏天可以划船。银锭桥上看日落是经典机位，拍照很美。",
        },
      ],
      [
        "穿舒服的鞋子，全程走路",
        "胡同里公厕很多但卫生条件一般，建议提前让孩子上过厕所",
        "银锭桥附近的烤肉季和烤肉宛是老字号，可以体验一下",
      ],
    ),
  },
  {
    title: "上海迪士尼 3 天全攻略｜带 5 岁娃刷遍所有适龄项目",
    coverImage: PHOTOS.disneyCastle,
    cityId: CITY_IDS.shanghai,
    cityName: "上海",
    days: 3,
    childAges: [60], // 5 岁
    travelStyle: "主题乐园",
    tags: ["主题乐园", "迪士尼", "亲子", "拍照"],
    viewCount: 6200,
    saveCount: 980,
    likeCount: 412,
    daysAgo: 1,
    contentHtml: htmlGuide(
      "上海迪士尼 3 天全攻略｜带 5 岁娃刷遍所有适龄项目",
      PHOTOS.disneyCastle,
      "上海",
      3,
      [
        {
          heading: "Day 1：入园 + 明日世界 + 梦幻世界",
          body: "建议买早享卡提前入园，7:30 就能进。入园后直奔「翱翔·飞越地平线」（身高 102cm 以上），5 岁孩子一般都能玩。然后去「七个小矮人矿山车」（身高 97cm），刺激度刚刚好。下午看花车巡游，提前 20 分钟在明日世界附近占位。晚上的烟花秀在城堡前看效果最好，建议提前 1 小时去占位。",
        },
        {
          heading: "Day 2：探险岛 + 宝藏湾 + 玩具总动员",
          body: "第二天重点玩探险岛的「雷鸣山漂流」（身高 107cm），记得给孩子准备雨衣。宝藏湾的「加勒比海盗-沉落宝藏之战」视觉效果震撼，没有身高限制，孩子非常喜欢。下午去玩具总动员园区，胡迪牛仔嘉年华和弹簧狗团团转都适合小朋友。",
        },
        {
          heading: "Day 3：二刷 + 拍照 + 买纪念品",
          body: "第三天可以轻松一点，二刷孩子最喜欢的项目。和迪士尼朋友合影需要在小程序上看好时间地点。米奇大街的商店可以买纪念品，推荐米奇耳朵发箍和爆米花桶，孩子会很开心。",
        },
      ],
      [
        "下载「上海迪士尼度假区」APP，实时查看排队时间和地图",
        "可以自带食物和水，园内餐饮较贵",
        "推车可以在入园处租，一天 90 元",
        "避开节假日和周末，周二周三人最少",
      ],
    ),
  },
  {
    title: "上海自然博物馆 + 科技馆一日｜边玩边学的科学之旅",
    coverImage: PHOTOS.museum,
    cityId: CITY_IDS.shanghai,
    cityName: "上海",
    days: 1,
    childAges: [48, 84], // 4-7 岁
    travelStyle: "研学",
    tags: ["博物馆", "科技馆", "研学", "室内"],
    viewCount: 1850,
    saveCount: 290,
    likeCount: 95,
    daysAgo: 7,
    contentHtml: htmlGuide(
      "上海自然博物馆 + 科技馆一日｜边玩边学的科学之旅",
      PHOTOS.museum,
      "上海",
      1,
      [
        {
          heading: "上午：上海自然博物馆",
          body: "位于静安雕塑公园内，建筑设计本身就是一件艺术品。馆内的恐龙骨架群是绝对的主角，孩子站在马门溪龙化石下面会发出「哇」的惊叹。「生命长河」展区有各种动物标本和模型，从深海到极地都有。4D 影院需要提前预约，场次有限。建议游玩 3 小时。",
        },
        {
          heading: "下午：上海科技馆",
          body: "从自然博物馆坐地铁 2 号线到上海科技馆站。科技馆的「智慧之光」和「机器人世界」展区互动性很强，孩子可以动手操作各种科学实验。彩虹儿童乐园是专门为低龄孩子设计的区域，有水上乐园和建筑工地体验。建议游玩 2-3 小时。",
        },
      ],
      [
        "两个馆都需要提前在公众号预约门票",
        "自然博物馆周二至周日开放，周一闭馆",
        "科技馆内有餐厅，但出馆后有更多选择",
        "两个馆之间地铁约 30 分钟，合理安排时间",
      ],
    ),
  },
  {
    title: "上海外滩 + 陆家嘴半日｜看大船、登高楼、坐轮渡",
    coverImage: PHOTOS.shanghaiSkyline,
    cityId: CITY_IDS.shanghai,
    cityName: "上海",
    days: 1,
    childAges: [36, 60], // 3-5 岁
    travelStyle: "打卡游",
    tags: ["城市", "轮渡", "拍照"],
    viewCount: 1650,
    saveCount: 210,
    likeCount: 76,
    daysAgo: 10,
    contentHtml: htmlGuide(
      "上海外滩 + 陆家嘴半日｜看大船、登高楼、坐轮渡",
      PHOTOS.shanghaiSkyline,
      "上海",
      1,
      [
        {
          heading: "外滩看船",
          body: "下午 3 点左右到达外滩，江面上各种船只来往，货轮、游船、拖船，孩子能盯着看很久。万国建筑群在夕阳下非常漂亮，适合拍照。外滩观光平台上人不多的时候可以让孩子跑跑。",
        },
        {
          heading: "坐轮渡去陆家嘴",
          body: "从金陵东路渡口坐轮渡到东昌路渡口，票价只要 2 元，是上海最划算的「江景游」。船上可以看两岸的风景，孩子特别喜欢。下了轮渡就是陆家嘴，抬头看三件套（上海中心、环球金融中心、金茂大厦）非常震撼。",
        },
        {
          heading: "登上上海中心",
          body: "如果孩子不恐高，可以上上海中心 118 层的观光厅。电梯 55 秒到顶，从高空俯瞰黄浦江和外滩，视角非常壮观。建议傍晚时分上去，可以看到日落和夜景。",
        },
      ],
      [
        "轮渡可以刷交通卡，2 元一人",
        "外滩风大，给孩子多带一件外套",
        "上海中心观光厅门票成人 180 元，1 米以下儿童免费",
      ],
    ),
  },
  {
    title: "颐和园 + 圆明园｜北京西郊皇家园林亲子一日游",
    coverImage: PHOTOS.summerPalace,
    cityId: CITY_IDS.beijing,
    cityName: "北京",
    days: 1,
    childAges: [60, 96], // 5-8 岁
    travelStyle: "文化游",
    tags: ["园林", "历史", "划船", "户外"],
    viewCount: 1320,
    saveCount: 180,
    likeCount: 63,
    daysAgo: 14,
    contentHtml: htmlGuide(
      "颐和园 + 圆明园｜北京西郊皇家园林亲子一日游",
      PHOTOS.summerPalace,
      "北京",
      1,
      [
        {
          heading: "上午：颐和园精华游",
          body: "从东宫门进入，先走长廊——这是世界上最长的画廊，廊顶的彩绘有西游记、三国等故事，边走边给孩子讲。到石舫后可以在昆明湖租船，电动船 120 元/小时，孩子可以体验当「小船长」。万寿山上的佛香阁需要爬一段台阶，量力而行。",
        },
        {
          heading: "下午：圆明园遗址",
          body: "从颐和园打车 10 分钟到圆明园。相比颐和园的精致，圆明园的西洋楼遗址有一种沧桑的美感。给孩子讲讲十二生肖兽首的故事，他们会很有兴趣。圆明园的荷花季（7-8 月）特别美，大片荷花池非常壮观。",
        },
      ],
      [
        "两个园子都很大，建议带推车",
        "颐和园东宫门外有停车场，自驾方便",
        "夏天注意防晒，园内树荫不多的地方很晒",
        "可以在园内的听鹂馆吃宫廷菜，但价格偏高",
      ],
    ),
  },
  // ===================== 上海（5 条）=====================
  {
    title: "上海野生动物园一日｜喂长颈鹿、看大熊猫、坐投喂车",
    coverImage: PHOTOS.zoo,
    cityId: CITY_IDS.shanghai,
    cityName: "上海",
    days: 1,
    childAges: [24, 48], // 2-4 岁
    travelStyle: "亲子",
    tags: ["动物园", "动物", "户外", "亲子"],
    viewCount: 2450,
    saveCount: 380,
    likeCount: 142,
    daysAgo: 3,
    contentHtml: htmlGuide(
      "上海野生动物园一日｜喂长颈鹿、看大熊猫、坐投喂车",
      PHOTOS.zoo,
      "上海",
      1,
      [
        {
          heading: "车入区 — 猛兽投喂车",
          body: "入园后建议先坐投喂车去车入区。车入区分为食草动物区和猛兽区，狮子、老虎、熊都在这里。投喂车的工作人员会给动物投喂食物，能看到老虎扑食的场面，孩子非常兴奋。全程约 30 分钟。",
        },
        {
          heading: "步行区 — 互动体验",
          body: "步行区很大，重点推荐几个互动项目：长颈鹿喂食（20 元一把树叶）、袋鼠互动区（可以摸袋鼠）、小动物乐园（可以抱小兔子和小羊）。大熊猫馆的熊猫很活跃，上午去更容易看到它们吃竹子的样子。海狮表演和百兽山表演也很精彩，注意看好时间表。",
        },
      ],
      [
        "园区很大，建议租一辆电瓶车，带孩子走路太累",
        "自己带一些胡萝卜条和白菜叶，有些区域可以喂动物",
        "餐厅的饭一般，建议自带午餐",
        "上海野生动物园在浦东新区，地铁 16 号线野生动物园站下",
      ],
    ),
  },
  {
    title: "上海世纪公园 + 世纪汇｜周末亲子骑行 + 美食半日",
    coverImage: PHOTOS.park,
    cityId: CITY_IDS.shanghai,
    cityName: "上海",
    days: 1,
    childAges: [36, 72], // 3-6 岁
    travelStyle: "休闲",
    tags: ["公园", "骑行", "户外"],
    viewCount: 980,
    saveCount: 150,
    likeCount: 52,
    daysAgo: 16,
    contentHtml: htmlGuide(
      "上海世纪公园 + 世纪汇｜周末亲子骑行 + 美食半日",
      PHOTOS.park,
      "上海",
      1,
      [
        {
          heading: "世纪公园骑行",
          body: "世纪公园是上海内环内最大的公园，有专门的骑行道和儿童游乐区。可以在门口租共享单车或自带平衡车。公园中心的大草坪可以放风筝、踢球、野餐。春天樱花季和秋天银杏季最美。公园内的游船码头可以划船。",
        },
        {
          heading: "世纪汇午餐",
          body: "从世纪公园步行 10 分钟到世纪汇商场，B1/B2 的美食广场选择很多。推荐桂满陇（江浙菜，环境好适合家庭）和苏小柳（点心专营，孩子喜欢的小笼包和生煎都很好吃）。吃完可以在商场里的儿童区玩一会。",
        },
      ],
      [
        "世纪公园门票 10 元，早 7 点前免费入园",
        "公园内有卫生间和饮水处，很方便",
        "周末人较多，建议早上 9 点前到",
      ],
    ),
  },
  {
    title: "广州长隆野生动物世界 2 日深度游｜坐小火车穿越五大洲",
    coverImage: PHOTOS.zoo,
    cityId: CITY_IDS.guangzhou,
    cityName: "广州",
    days: 2,
    childAges: [48, 72], // 4-6 岁
    travelStyle: "主题乐园",
    tags: ["动物园", "主题乐园", "亲子", "拍照"],
    viewCount: 4800,
    saveCount: 720,
    likeCount: 298,
    daysAgo: 4,
    contentHtml: htmlGuide(
      "广州长隆野生动物世界 2 日深度游｜坐小火车穿越五大洲",
      PHOTOS.zoo,
      "广州",
      2,
      [
        {
          heading: "Day 1：小火车 + 步行区南区",
          body: "入园后直奔小火车乘车区，这是整个长隆最值得体验的项目。小火车穿越澳洲森林、美洲丛林、亚洲象园、猛兽区和非洲草原五大区，全程约 40 分钟。坐右边视野更好。下午逛步行区南区，必看：考拉馆（中国唯一有考拉的动物园）、熊猫村（全球唯一大熊猫三胞胎）、白虎山。",
        },
        {
          heading: "Day 2：缆车 + 步行区北区 + 飞鸟乐园",
          body: "坐空中缆车俯瞰整个动物园，脚下的长颈鹿和斑马非常可爱。缆车有透明玻璃底车厢，孩子会觉得很刺激。下午去飞鸟乐园，火烈鸟群和金刚鹦鹉表演都很精彩。4D 影院值得一看，但小一点的孩子可能会被喷水和震动吓到。",
        },
      ],
      [
        "长隆在番禺区，建议住长隆酒店或附近的民宿",
        "园区内餐饮选择多但价格偏高，可以自带食物",
        "身高 1 米以下儿童免票",
        "下载「长隆旅游」APP，提前买票可以优惠",
        "缆车和 4D 影院需要另外购票或买套票",
      ],
    ),
  },
  {
    title: "上海海昌海洋公园一日｜看虎鲸表演 + 企鹅馆 + 海底隧道",
    coverImage: PHOTOS.oceanWorld,
    cityId: CITY_IDS.shanghai,
    cityName: "上海",
    days: 1,
    childAges: [36, 72], // 3-6 岁
    travelStyle: "主题乐园",
    tags: ["海洋馆", "主题乐园", "表演", "亲子"],
    viewCount: 3100,
    saveCount: 460,
    likeCount: 185,
    daysAgo: 6,
    contentHtml: htmlGuide(
      "上海海昌海洋公园一日｜看虎鲸表演 + 企鹅馆 + 海底隧道",
      PHOTOS.oceanWorld,
      "上海",
      1,
      [
        {
          heading: "必看表演：虎鲸科普秀",
          body: "海昌的虎鲸表演是招牌项目，建议入园后第一时间看表演时间表，提前 30 分钟去占好位置。前排会湿身，如果不想被水溅到可以坐中后排。虎鲸跃出水面的瞬间非常震撼，孩子会兴奋地尖叫。",
        },
        {
          heading: "南极企鹅馆 + 海底世界",
          body: "企鹅馆里可以看到帝企鹅和阿德利企鹅，走路一摇一摆的样子特别可爱。馆内有透明隧道可以近距离观察企鹅游泳。海底世界馆的超长海底隧道有鲨鱼、鳐鱼和海龟从头顶游过，视觉效果很棒。",
        },
        {
          heading: "珊瑚水母馆 + 游乐设施",
          body: "珊瑚水母馆非常适合拍照，五颜六色的水母在灯光下如梦如幻。园内还有一些小型游乐设施如旋转木马、碰碰车等，适合低龄孩子。火山漂流身高限制 120cm，小宝宝玩不了。",
        },
      ],
      [
        "海昌在浦东临港，距离市区较远，建议自驾",
        "园内有婴儿车租赁服务",
        "海豚剧场和白鲸之恋表演也很值得看",
        "避开周末，工作日人少很多",
      ],
    ),
  },
  // ===================== 广州（4 条）=====================
  {
    title: "广州塔 + 珠江夜游｜带孩子看最美广州夜景",
    coverImage: PHOTOS.guangzhouCanton,
    cityId: CITY_IDS.guangzhou,
    cityName: "广州",
    days: 1,
    childAges: [36, 84], // 3-7 岁
    travelStyle: "夜景游",
    tags: ["城市", "夜景", "轮渡"],
    viewCount: 1580,
    saveCount: 195,
    likeCount: 68,
    daysAgo: 11,
    contentHtml: htmlGuide(
      "广州塔 + 珠江夜游｜带孩子看最美广州夜景",
      PHOTOS.guangzhouCanton,
      "广州",
      1,
      [
        {
          heading: "登广州塔",
          body: "广州塔（小蛮腰）总高 600 米，是广州的地标。推荐买 433 米白云星空观光票，性价比最高。孩子站在透明玻璃观景台上往下看，又怕又兴奋。塔顶的极速云霄（跳楼机）不适合孩子，忽略就好。",
        },
        {
          heading: "珠江夜游",
          body: "从广州塔码头登船，推荐「信息时报号」或「广百号」，船上有自助餐。珠江两岸的灯光秀非常漂亮，广州塔、IFC、花城广场的灯光交相辉映。航程约 70 分钟，船上有儿童救生衣。建议选 19:30 的班次，天刚黑灯刚亮，效果最好。",
        },
        {
          heading: "花城广场漫步",
          body: "下船后可以沿着花城广场散步，广东省博物馆和广州大剧院都在这里。广场中间的音乐喷泉晚间有灯光秀，孩子们喜欢在水雾中跑来跑去。",
        },
      ],
      [
        "广州塔建议提前在公众号买票，现场排队久",
        "珠江夜游船上风大，给孩子带外套",
        "花城广场地下有 APM 线，可以体验无人驾驶地铁，孩子会很新奇",
      ],
    ),
  },
  {
    title: "广州白云山 + 云台花园｜城市里的森林氧吧",
    coverImage: PHOTOS.mountain,
    cityId: CITY_IDS.guangzhou,
    cityName: "广州",
    days: 1,
    childAges: [48, 96], // 4-8 岁
    travelStyle: "户外",
    tags: ["爬山", "户外", "自然", "植物园"],
    viewCount: 1120,
    saveCount: 165,
    likeCount: 58,
    daysAgo: 12,
    contentHtml: htmlGuide(
      "广州白云山 + 云台花园｜城市里的森林氧吧",
      PHOTOS.mountain,
      "广州",
      1,
      [
        {
          heading: "白云山索道上山",
          body: "从南门坐索道上山，8 分钟到山顶广场。白云山的植被非常茂密，空气清新，是广州的「市肺」。山顶广场可以看到广州市区的全景。从山顶广场走到摩星岭（最高点）约 20 分钟，台阶不多，孩子可以轻松走完。路边有很多卖山水豆腐花的小摊，很地道。",
        },
        {
          heading: "云台花园",
          body: "下山后去山脚的云台花园，这是一个欧式风格的园林，有大草坪、喷泉和四季花海。孩子可以在草地上奔跑、吹泡泡、放风筝。玫瑰园和温室植物馆可以认识很多植物。",
        },
      ],
      [
        "白云山门票 5 元，索道单程 25 元",
        "山上蚊虫多，带驱蚊液",
        "云台花园门票 25 元，1.2 米以下免费",
        "白云山脚下有很多农家菜馆，推荐尝试白云猪手和烧鹅",
      ],
    ),
  },
  {
    title: "广州陈家祠 + 荔枝湾涌｜岭南文化亲子半日游",
    coverImage: PHOTOS.guangzhouNight,
    cityId: CITY_IDS.guangzhou,
    cityName: "广州",
    days: 1,
    childAges: [60, 120], // 5-10 岁
    travelStyle: "文化游",
    tags: ["文化", "建筑", "美食", "历史"],
    viewCount: 860,
    saveCount: 128,
    likeCount: 45,
    daysAgo: 18,
    contentHtml: htmlGuide(
      "广州陈家祠 + 荔枝湾涌｜岭南文化亲子半日游",
      PHOTOS.guangzhouNight,
      "广州",
      1,
      [
        {
          heading: "陈家祠 — 岭南建筑瑰宝",
          body: "陈家祠是广东现存规模最大的岭南祠堂式建筑，以「三雕两塑一铸一画」闻名。屋顶的灰塑和陶塑色彩艳丽、造型生动，有龙凤、麒麟、历史人物等图案。给孩子指认这些图案，就像一堂生动的民间艺术课。馆内的广东民间工艺博物馆展示了很多精美的广绣、广彩和牙雕。",
        },
        {
          heading: "荔枝湾涌 — 岭南水乡",
          body: "从陈家祠步行 15 分钟到荔枝湾涌。这里是广州老城的水乡风貌，可以坐花船沿涌游览。两岸的骑楼建筑和榕树很有岭南特色。荔枝湾旁边的泮溪酒家是老字号园林餐厅，带孩子体验正宗的广式点心（虾饺、烧卖、凤爪、肠粉）。",
        },
      ],
      [
        "陈家祠门票 10 元，18 岁以下免费",
        "花船 50 元一人，约 30 分钟",
        "泮溪酒家周末人很多，建议 11 点前去排队",
        "陈家祠地铁站出来步行 2 分钟就到",
      ],
    ),
  },
  {
    title: "广州海珠湿地公园｜城市中心的候鸟天堂",
    coverImage: PHOTOS.lake,
    cityId: CITY_IDS.guangzhou,
    cityName: "广州",
    days: 1,
    childAges: [36, 72], // 3-6 岁
    travelStyle: "自然",
    tags: ["公园", "自然", "观鸟", "户外"],
    viewCount: 720,
    saveCount: 105,
    likeCount: 38,
    daysAgo: 20,
    contentHtml: htmlGuide(
      "广州海珠湿地公园｜城市中心的候鸟天堂",
      PHOTOS.lake,
      "广州",
      1,
      [
        {
          heading: "湿地探索",
          body: "海珠湿地是广州最大的湿地公园，也是候鸟迁徙的重要驿站。每年秋冬季节可以看到成群的候鸟。园内有专门的观鸟屋和观鸟栈道，可以租望远镜。即使不是观鸟季，大片的湖面和水生植物也让人心旷神怡。",
        },
        {
          heading: "亲子互动区",
          body: "园内的儿童游乐区有沙池、攀爬架和秋千，孩子可以尽情玩耍。果林区的荔枝树和龙眼树在夏天挂满果实（不能随意采摘）。花田区的波斯菊和向日葵在不同季节盛开，是绝佳的拍照背景。",
        },
      ],
      [
        "门票 20 元，可以在公众号提前预约",
        "园内有电瓶车可以乘坐，带孩子走路太远",
        "带望远镜和鸟类图鉴，体验更好",
        "园内餐饮选择少，建议自带水和零食",
      ],
    ),
  },
  // ===================== 通用/跨城市（1 条）=====================
  {
    title: "带 3 岁娃亲子游避坑指南｜全国通用 10 条经验",
    coverImage: PHOTOS.family,
    cityId: CITY_IDS.beijing,
    cityName: "北京",
    days: 3,
    childAges: [36], // 3 岁
    travelStyle: "亲子",
    tags: ["亲子", "攻略", "经验"],
    viewCount: 9200,
    saveCount: 1560,
    likeCount: 534,
    daysAgo: 0,
    contentHtml: htmlGuide(
      "带 3 岁娃亲子游避坑指南｜全国通用 10 条经验",
      PHOTOS.family,
      "北京",
      3,
      [
        {
          heading: "行程规划篇",
          body: "3 岁孩子的体力和耐心有限，每天安排 1-2 个景点就够了。上午出门，中午回酒店午休，下午再轻量活动是最佳节奏。选择住宿时优先考虑离地铁近、有儿童游乐设施的酒店。行程中预留充足的「自由玩耍」时间——孩子不需要一直打卡，一个沙坑或一片草地就能让他玩得很开心。",
        },
        {
          heading: "交通出行篇",
          body: "高铁和飞机各有优劣：高铁可以走动、空间大，适合 3 小时内的路程；飞机速度快但不适合耳压敏感的孩子。自驾的话一定要用安全座椅。市内交通推荐打网约车，比地铁更灵活，孩子累了可以在车上休息。",
        },
        {
          heading: "饮食住宿篇",
          body: "找餐厅时优先看有没有儿童餐和宝宝椅。随身携带孩子爱吃的零食和水果，关键时刻能安抚情绪。住宿方面，带厨房的民宿比酒店更方便——可以给孩子做熟悉的食物，避免水土不服。洗浴用品和睡袋最好自带，孩子用惯了的才有安全感。",
        },
      ],
      [
        "随身携带：湿巾、创可贴、退热贴、孩子的医保卡",
        "提前查好目的地最近的医院地址",
        "孩子的身份证/户口本一定要带，高铁飞机都需要",
        "不要安排太多打卡行程，孩子的快乐往往来自最普通的小事",
      ],
    ),
  },
];

// ============================================================
// 执行
// ============================================================
async function main() {
  console.log("🌱 开始创建攻略种子数据...\n");

  // 先清空 seed 攻略，防止重复执行报错
  const existing = await prisma.guide.findMany({
    where: { userId: SEED_USER },
    select: { id: true },
  });
  if (existing.length > 0) {
    console.log(`发现 ${existing.length} 条旧种子攻略，正在清理...`);
    for (const g of existing) {
      await prisma.guide.delete({ where: { id: g.id } }).catch(() => {});
    }
    console.log("清理完成。\n");
  }

  let created = 0;
  for (const g of GUIDES) {
    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - g.daysAgo);

    await prisma.guide.create({
      data: {
        userId: SEED_USER,
        title: g.title,
        coverImages: [g.coverImage],
        contentHtml: g.contentHtml,
        cityId: g.cityId,
        days: g.days,
        childAges: g.childAges,
        travelStyle: g.travelStyle,
        tags: g.tags,
        status: "published",
        viewCount: g.viewCount,
        saveCount: g.saveCount,
        likeCount: g.likeCount,
        publishedAt,
        createdAt: publishedAt,
        updatedAt: publishedAt,
      },
    });

    created++;
    console.log(`  ✅ [${created}] ${g.title.slice(0, 40)}...`);
  }

  console.log(`\n🎉 完成！共创建 ${created} 条已发布攻略。`);
  console.log("   现在首页热门攻略、攻略列表、详情页应该都能正常显示了。");
  console.log("   排行榜需要跑 snapshot 后才能出数据：npx tsx src/lib/data-pipeline/08-snapshot-leaderboard.ts\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
