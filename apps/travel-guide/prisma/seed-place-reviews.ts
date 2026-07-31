/**
 * 种子数据：为 15 个景点生成真实评价
 *
 * 用途：
 * - 首页热门景点榜（place-hot API 按 composite 排序取前8）
 * - 景点详情页评价列表
 * - PlaceAggregate 聚合数据
 *
 * 原则：
 * - 每条评价都有真实中文评论文本
 * - 双维度评分：大人 + 孩子（模拟真实亲子出游场景）
 * - 便利设施标记因人而异（有人在乎停车，有人在乎母婴室）
 * - 评价数分布：热门景点 7-8 条，一般景点 5-6 条
 *
 * 执行：npx tsx prisma/seed-place-reviews.ts
 */

import { PrismaClient } from "@prisma/client";
import { recomputePlaceAggregate } from "../src/lib/place-aggregate";

const prisma = new PrismaClient();

// ============================================================
// 景点 ID 映射（从数据库查询的实际 ID）
// ============================================================
const SPOTS = {
  // 北京 8 个
  beijingNaturalMuseum: { id: "d4c250a0-12de-4c10-a703-ade8e3ad4cff", name: "北京自然博物馆", cityId: "city-beijing" },
  chinaSciTechMuseum:  { id: "abd85100-461b-42f8-8b7f-d262201d6795", name: "中国科学技术馆（新馆）", cityId: "city-beijing" },
  beijingZoo:          { id: "73067815-6b81-4bdf-a5db-cc6cc6a8cf20", name: "北京动物园", cityId: "city-beijing" },
  beijingAquarium:     { id: "eb971e00-5a97-4781-a8d5-c2fab3f38644", name: "北京海洋馆", cityId: "city-beijing" },
  summerPalace:        { id: "c1638bb5-7663-4861-850e-07b8ffa4bc38", name: "颐和园", cityId: "city-beijing" },
  beijingHappyValley:  { id: "24e67298-efad-4c0f-8823-37e27a9bac9f", name: "北京欢乐谷", cityId: "city-beijing" },
  beijingPlanetarium:  { id: "a0072a27-3830-4e48-9b5e-1f14c8c46dfb", name: "北京天文馆", cityId: "city-beijing" },
  blueSkyKids:         { id: "ea0eb1f9-f80c-4806-9e48-f84477345419", name: "蓝天城儿童乐园(朝阳大悦城)", cityId: "city-beijing" },
  // 上海 4 个
  shanghaiSciMuseum:   { id: "32f0edfe-ce44-4919-80c6-c150aad67dc5", name: "上海科技馆", cityId: "city-shanghai" },
  shanghaiNatMuseum:   { id: "58ea13d9-6637-4110-9084-416f9f858f89", name: "上海自然博物馆", cityId: "city-shanghai" },
  shanghaiWildZoo:     { id: "b73f4647-f538-4298-8523-ed287b39baa2", name: "上海野生动物园", cityId: "city-shanghai" },
  shanghaiOceanPark:   { id: "f89afef1-d6f6-456e-9c80-dd9842bf2305", name: "上海海昌海洋公园", cityId: "city-shanghai" },
  // 广州 3 个
  chimelongSafari:     { id: "10838a4c-f049-48cc-920b-01a59ee8cc6d", name: "广州长隆野生动物世界", cityId: "city-guangzhou" },
  guangdongMuseum:     { id: "98ca4ab6-cc72-41e4-95c0-80bdce3ad49c", name: "广东省博物馆", cityId: "city-guangzhou" },
  guangzhouAquarium:   { id: "bfc93807-1269-41f9-bb26-85f1d2e6e7e9", name: "广州海洋馆", cityId: "city-guangzhou" },
};

// ============================================================
// 种子用户 ID（模拟 12 个不同家庭）
// ============================================================
const USERS = Array.from({ length: 12 }, (_, i) =>
  `seed-reviewer-${String(i + 1).padStart(2, "0")}`
);

// ============================================================
// 便利设施组合（模拟不同家庭的需求）
// ============================================================
interface Convenience {
  hasParking: boolean;
  hasHighChair: boolean;
  hasNapRoom: boolean;
  strollerOk: boolean;
  kidFriendly: number; // 1-5
}

const CONVENIENCE_PRESETS: Record<string, Convenience[]> = {
  museum: [
    { hasParking: true, hasHighChair: false, hasNapRoom: false, strollerOk: true, kidFriendly: 4 },
    { hasParking: true, hasHighChair: false, hasNapRoom: false, strollerOk: true, kidFriendly: 5 },
    { hasParking: false, hasHighChair: false, hasNapRoom: false, strollerOk: true, kidFriendly: 4 },
  ],
  zoo: [
    { hasParking: true, hasHighChair: true, hasNapRoom: true, strollerOk: true, kidFriendly: 5 },
    { hasParking: true, hasHighChair: true, hasNapRoom: false, strollerOk: true, kidFriendly: 4 },
    { hasParking: false, hasHighChair: true, hasNapRoom: true, strollerOk: true, kidFriendly: 4 },
  ],
  aquarium: [
    { hasParking: true, hasHighChair: false, hasNapRoom: false, strollerOk: true, kidFriendly: 5 },
    { hasParking: true, hasHighChair: false, hasNapRoom: false, strollerOk: true, kidFriendly: 4 },
    { hasParking: false, hasHighChair: false, hasNapRoom: true, strollerOk: true, kidFriendly: 5 },
  ],
  park: [
    { hasParking: true, hasHighChair: false, hasNapRoom: false, strollerOk: false, kidFriendly: 3 },
    { hasParking: false, hasHighChair: false, hasNapRoom: false, strollerOk: false, kidFriendly: 3 },
  ],
  amusement: [
    { hasParking: true, hasHighChair: true, hasNapRoom: true, strollerOk: true, kidFriendly: 4 },
    { hasParking: true, hasHighChair: true, hasNapRoom: true, strollerOk: true, kidFriendly: 3 },
    { hasParking: false, hasHighChair: false, hasNapRoom: false, strollerOk: true, kidFriendly: 4 },
  ],
  indoor_play: [
    { hasParking: true, hasHighChair: true, hasNapRoom: true, strollerOk: true, kidFriendly: 5 },
    { hasParking: true, hasHighChair: true, hasNapRoom: true, strollerOk: true, kidFriendly: 4 },
    { hasParking: false, hasHighChair: false, hasNapRoom: true, strollerOk: true, kidFriendly: 5 },
  ],
};

// ============================================================
// 预定义评论模板（每个景点多条，含不同语气和侧重点）
// ============================================================
interface ReviewTemplate {
  adultRating: number;
  childRating: number | null;
  childAgeMonths: number;
  text: string;
  tags: string[];
  convenience: (presets: Convenience[]) => Convenience;
  daysAgo: number; // 相对今天的天数
}

type SpotReviewMap = Record<string, ReviewTemplate[]>;

// ---------- 各景点评价模板 ----------
// 评价分布策略：热门景点 7-8 条，普通景点 5-6 条
// 评分策略：部分景点故意高分（冲排行榜），部分中等偏低
const REVIEWS: SpotReviewMap = {

  // ====== 北京 ======

  "d4c250a0-12de-4c10-a703-ade8e3ad4cff": [ // 北京自然博物馆
    { adultRating: 5, childRating: 5, childAgeMonths: 48, text: "恐龙展厅太震撼了！孩子看到霸王龙骨架兴奋得不行，全程自己走完。免费预约太良心，就是周末人多要排队。", tags: ["恐龙迷必去", "免费", "寓教于乐"], convenience: p => p[0], daysAgo: 5 },
    { adultRating: 4, childRating: 4, childAgeMonths: 36, text: "带3岁娃去的，动物标本很逼真，孩子有点害怕大型恐龙骨架。但是蝴蝶展区很喜欢，互动屏幕也不错。", tags: ["标本丰富", "适合3岁+"], convenience: p => p[1], daysAgo: 12 },
    { adultRating: 5, childRating: 5, childAgeMonths: 60, text: "简直是遛娃神地！夏天有空调，冬天有暖气，孩子能逛一下午。地下一层的水生生物区孩子最爱。", tags: ["遛娃神地", "冬暖夏凉", "交通方便"], convenience: p => p[0], daysAgo: 20 },
    { adultRating: 4, childRating: 3, childAgeMonths: 24, text: "2岁娃去稍微早了点，能看但不太懂。恐龙骨架很高大，孩子有点怕。建议至少3岁以上来。", tags: ["3岁以下慎选", "免费"], convenience: p => p[1], daysAgo: 35 },
    { adultRating: 5, childRating: 5, childAgeMonths: 72, text: "一年级孩子学校组织去过一次，这次特意带弟弟又来。哥哥当小讲解员给我们讲恐龙知识，特别有成就感。", tags: ["适合小学生", "知识性强", "亲子互动"], convenience: p => p[2], daysAgo: 45 },
    { adultRating: 4, childRating: 4, childAgeMonths: 42, text: "预约有点麻烦，但进去后发现很值。哺乳动物展厅做得很好，还有人体探秘区，孩子回来一直在说心脏怎么跳。", tags: ["预约制", "科普教育"], convenience: p => p[0], daysAgo: 60 },
    { adultRating: 3, childRating: 3, childAgeMonths: 30, text: "人太多了，周末去的排队半小时。里面有些区域在装修没开放。好在孩子还是玩得挺开心。", tags: ["人多", "周末慎去"], convenience: p => p[1], daysAgo: 75 },
  ],

  "abd85100-461b-42f8-8b7f-d262201d6795": [ // 中国科学技术馆（新馆）
    { adultRating: 5, childRating: 5, childAgeMonths: 84, text: "全国最棒的科技馆没有之一！儿童科学乐园、探索与发现、科技与生活三大展厅，孩子玩了一整天都舍不得走。", tags: ["全国最佳", "互动体验", "玩一整天"], convenience: p => p[0], daysAgo: 3 },
    { adultRating: 5, childRating: 5, childAgeMonths: 60, text: "光影世界和声音实验室是孩子的最爱。比自己小时候去的科技馆先进太多了，连大人都在玩。提前公众号预约球幕影院！", tags: ["球幕影院", "光影世界", "大人也爱玩"], convenience: p => p[1], daysAgo: 10 },
    { adultRating: 4, childRating: 5, childAgeMonths: 72, text: "儿童科学乐园的超大攀爬架娃玩了快一个小时。科学实验秀很有意思，工作人员很耐心。就是餐厅一般。", tags: ["攀爬区", "科学实验秀", "餐厅一般"], convenience: p => p[0], daysAgo: 18 },
    { adultRating: 5, childRating: 4, childAgeMonths: 96, text: "10岁孩子对机器人展厅和太空探索厅特别感兴趣，回来要报编程班。科技馆对激发孩子学习兴趣真的有用。", tags: ["机器人", "太空探索", "激发兴趣"], convenience: p => p[2], daysAgo: 28 },
    { adultRating: 4, childRating: 4, childAgeMonths: 48, text: "第一次带4岁娃来，儿童区够玩了。其他展厅稍微深了点，等他大点再来。停车方便，中午有休息区。", tags: ["儿童区友好", "停车方便"], convenience: p => p[0], daysAgo: 40 },
    { adultRating: 5, childRating: 5, childAgeMonths: 66, text: "二刷了！这次体验了4D影院和电磁表演，孩子激动地直拍手。强烈建议工作日来，人少体验好很多。", tags: ["建议二刷", "4D影院", "工作日更佳"], convenience: p => p[1], daysAgo: 55 },
    { adultRating: 3, childRating: 3, childAgeMonths: 36, text: "孩子才3岁，大部分互动装置用不太明白。但是光影区和泡泡区确实玩得很开心。等大点再来应该更好。", tags: ["适合大孩子", "光影区好"], convenience: p => p[2], daysAgo: 70 },
    { adultRating: 5, childRating: 5, childAgeMonths: 78, text: "学校春游来过，回来写了一篇小作文。说最喜欢的是静电实验和自己的影子在彩虹墙上跳舞。科技馆永远值得。", tags: ["学校推荐", "春游好去处", "永远值得"], convenience: p => p[0], daysAgo: 85 },
  ],

  "73067815-6b81-4bdf-a5db-cc6cc6a8cf20": [ // 北京动物园
    { adultRating: 4, childRating: 5, childAgeMonths: 42, text: "熊猫馆是必去的！萌兰好可爱，孩子看了半小时不肯走。动物园很大，建议进门租推车，不然娃走不动。", tags: ["熊猫必看", "建议租推车", "地方大"], convenience: p => p[0], daysAgo: 7 },
    { adultRating: 3, childRating: 4, childAgeMonths: 36, text: "夏天去太热了，好多动物都躲起来睡觉。但是狮虎山和猴山还是很精彩的。建议春秋天去。", tags: ["夏天太热", "春秋更佳"], convenience: p => p[1], daysAgo: 15 },
    { adultRating: 4, childRating: 4, childAgeMonths: 54, text: "海洋馆和大熊猫馆要另外买票，通票划算。孩子最喜欢喂长颈鹿，虽然要排队。整体设施有点旧。", tags: ["喂长颈鹿", "设施偏旧", "通票划算"], convenience: p => p[2], daysAgo: 25 },
    { adultRating: 5, childRating: 5, childAgeMonths: 60, text: "北京遛娃经典之选！孩子从2岁开始每年都来，每次都有新发现。今年终于敢摸小羊了，进步很大。", tags: ["经典之选", "每年必来", "见证成长"], convenience: p => p[0], daysAgo: 38 },
    { adultRating: 3, childRating: 3, childAgeMonths: 18, text: "推车友好但人太多。1岁半的娃看动物还不太有概念，只在儿童动物园玩了会儿沙子。建议2岁以上。", tags: ["推车友好", "人太多", "2岁以上"], convenience: p => p[1], daysAgo: 50 },
    { adultRating: 4, childRating: 5, childAgeMonths: 48, text: "今天运气特别好，看到了孔雀开屏！孩子高兴得又蹦又跳。动物园的冰淇淋有点贵但味道还行。", tags: ["孔雀开屏", "运气好", "动物种类多"], convenience: p => p[2], daysAgo: 65 },
  ],

  "eb971e00-5a97-4781-a8d5-c2fab3f38644": [ // 北京海洋馆
    { adultRating: 5, childRating: 5, childAgeMonths: 42, text: "海豚表演绝了！孩子全程目不转睛，散场了还哭着要再看一遍。鲨鱼隧道也超酷，拍照很出片。", tags: ["海豚表演", "鲨鱼隧道", "拍照出片"], convenience: p => p[0], daysAgo: 4 },
    { adultRating: 4, childRating: 5, childAgeMonths: 54, text: "海底隧道太美了！孩子说像在海底世界游泳。水母馆的光影效果很好，适合拍照。美中不足门票有点贵。", tags: ["海底隧道", "水母馆", "门票偏贵"], convenience: p => p[1], daysAgo: 14 },
    { adultRating: 4, childRating: 4, childAgeMonths: 36, text: "企鹅馆孩子很喜欢，看企鹅游泳看呆了。馆内温度适宜，夏天去很舒服。就是周末人比较多。", tags: ["企鹅可爱", "温度舒适", "周末人多"], convenience: p => p[2], daysAgo: 22 },
    { adultRating: 5, childRating: 5, childAgeMonths: 66, text: "孩子生日带他来的，提前预约了和海豚互动的体验项目，贵是贵了点但孩子开心坏了，值！", tags: ["生日首选", "海豚互动", "值回票价"], convenience: p => p[0], daysAgo: 33 },
    { adultRating: 3, childRating: 3, childAgeMonths: 20, text: "1岁多的宝宝看了一会儿就坐不住了，推车也不太方便。表演场地声音有点大，小宝宝可能会害怕。", tags: ["小宝宝慎选", "声音大"], convenience: p => p[2], daysAgo: 48 },
    { adultRating: 4, childRating: 4, childAgeMonths: 48, text: "白鲸太治愈了！一直在玻璃前和孩子互动，孩子回来画了一幅画说白鲸是他的好朋友。", tags: ["白鲸互动", "治愈之旅", "激发创造力"], convenience: p => p[0], daysAgo: 62 },
  ],

  "c1638bb5-7663-4861-850e-07b8ffa4bc38": [ // 颐和园
    { adultRating: 3, childRating: 3, childAgeMonths: 48, text: "景色很美，但真不适合带小娃来。推车基本没法走，台阶太多了。划船还不错，孩子玩了半小时。", tags: ["景色美", "不适合推车", "台阶多"], convenience: p => p[0], daysAgo: 8 },
    { adultRating: 4, childRating: 3, childAgeMonths: 72, text: "小学一年级孩子来，当户外郊游还不错。讲了一些历史故事孩子还挺感兴趣。就是太累了，走了两万步。", tags: ["户外郊游", "历史教育", "费体力"], convenience: p => p[0], daysAgo: 18 },
    { adultRating: 5, childRating: 4, childAgeMonths: 96, text: "春天花开的时候来美极了！孩子带着相机拍了很多花和建筑。昆明湖划船是亮点，建议带点面包喂鸭子。", tags: ["春季最美", "拍照圣地", "划船"], convenience: p => p[1], daysAgo: 30 },
    { adultRating: 2, childRating: 2, childAgeMonths: 24, text: "2岁娃全程坐推车或者抱，大人累瘫了。路不平推车很颠。以后等孩子大点能自己走了再来。", tags: ["低龄不推荐", "路不平"], convenience: p => p[1], daysAgo: 42 },
    { adultRating: 4, childRating: 3, childAgeMonths: 60, text: "长廊夏天挺凉快的，孩子在长廊里跑来跑去很开心。但整体对孩子来说趣味性不高，更适合大人。", tags: ["长廊凉快", "趣味性一般"], convenience: p => p[0], daysAgo: 58 },
  ],

  "24e67298-efad-4c0f-8823-37e27a9bac9f": [ // 北京欢乐谷
    { adultRating: 4, childRating: 5, childAgeMonths: 84, text: "水上乐园孩子玩疯了！儿童区的项目刚好适合七八岁孩子，身高限制要提前看好。年卡很划算。", tags: ["水上乐园", "年卡划算", "身高限制"], convenience: p => p[0], daysAgo: 6 },
    { adultRating: 3, childRating: 2, childAgeMonths: 42, text: "适合大孩子的项目多，4岁娃能玩的不多。坐了旋转木马和小火车就基本没什么了。感觉更适合小学生以上。", tags: ["低龄项目少", "小学生更合适"], convenience: p => p[1], daysAgo: 16 },
    { adultRating: 5, childRating: 5, childAgeMonths: 96, text: "10岁生日带他来的，能玩的项目多了很多。过山车有点刺激但他说还好。夜场灯光很漂亮。", tags: ["生日好去处", "夜场漂亮", "过山车"], convenience: p => p[2], daysAgo: 24 },
    { adultRating: 4, childRating: 4, childAgeMonths: 72, text: "工作日来基本不用排队，体验好很多。儿童室内区救了夏天的命，有空调！冰淇淋价格能接受。", tags: ["工作日更佳", "室内区友好", "不用排队"], convenience: p => p[0], daysAgo: 36 },
    { adultRating: 3, childRating: 3, childAgeMonths: 54, text: "暑假周末去的，排队排到怀疑人生。热门项目至少排40分钟。孩子耐心有限，玩了三四个就闹着要走了。", tags: ["排队久", "暑假慎去"], convenience: p => p[1], daysAgo: 52 },
    { adultRating: 4, childRating: 4, childAgeMonths: 78, text: "欢乐谷的万圣节活动挺有意思的，不太恐怖，孩子觉得好玩。花车巡游也很精彩。", tags: ["万圣节", "花车巡游", "节日氛围好"], convenience: p => p[2], daysAgo: 68 },
  ],

  "a0072a27-3830-4e48-9b5e-1f14c8c46dfb": [ // 北京天文馆
    { adultRating: 4, childRating: 4, childAgeMonths: 72, text: "球幕电影太酷了！躺在椅子上看星空，孩子一直说哇。就是有些展品比较旧了，希望能更新。", tags: ["球幕电影", "星空震撼", "展品偏旧"], convenience: p => p[0], daysAgo: 10 },
    { adultRating: 3, childRating: 3, childAgeMonths: 48, text: "4岁娃对天文馆理解有限，但那个超大地球仪他玩了好久。买票建议提前预约剧场，现场买容易没票。", tags: ["大地球仪", "提前购票", "适合大孩子"], convenience: p => p[1], daysAgo: 20 },
    { adultRating: 5, childRating: 5, childAgeMonths: 96, text: "天文迷娃的天堂！自己带着星图去找各种星座的位置。天象厅的节目制作精良，大人也长见识了。", tags: ["天文迷必去", "天象厅", "大人也学习"], convenience: p => p[2], daysAgo: 32 },
    { adultRating: 4, childRating: 4, childAgeMonths: 60, text: "正好配合学校讲太阳系，带孩子实地看一眼比书上讲一百遍都管用。B馆新馆比A馆好很多。", tags: ["配合教学", "B馆更棒", "太阳系"], convenience: p => p[0], daysAgo: 44 },
    { adultRating: 3, childRating: 2, childAgeMonths: 36, text: "3岁娃看不懂，在里面待了不到一小时就闹着要走。剧场节目时间太长，孩子坐不住。建议6岁以上。", tags: ["低龄不推荐", "剧场太久", "6岁+"], convenience: p => p[2], daysAgo: 56 },
    { adultRating: 4, childRating: 5, childAgeMonths: 84, text: "生日那天正好赶上月全食观测活动，天文馆组织了户外观测，孩子用专业望远镜看到了环形山，激动了一晚上。", tags: ["天文观测", "月全食", "难忘体验"], convenience: p => p[0], daysAgo: 72 },
  ],

  "ea0eb1f9-f80c-4806-9e48-f84477345419": [ // 蓝天城儿童乐园
    { adultRating: 4, childRating: 5, childAgeMonths: 48, text: "职业体验太好玩了！孩子当了消防员、医生、厨师，每个项目都认真排队。玩了一整天都不想走。", tags: ["职业体验", "玩一整天", "寓教于乐"], convenience: p => p[0], daysAgo: 2 },
    { adultRating: 5, childRating: 5, childAgeMonths: 36, text: "室内遛娃天花板！夏天外面38度，里面凉快干净。大人有休息区，孩子能安全地疯玩。强烈推荐！", tags: ["遛娃天花板", "夏天首选", "安全干净"], convenience: p => p[1], daysAgo: 9 },
    { adultRating: 4, childRating: 4, childAgeMonths: 54, text: "在商场里真的很方便，娃玩完可以直接吃饭逛街。项目丰富，但热门项目要排队，建议早点来。", tags: ["商场内方便", "项目丰富", "建议早到"], convenience: p => p[2], daysAgo: 18 },
    { adultRating: 3, childRating: 4, childAgeMonths: 30, text: "2岁半娃也能玩不少，但一些职业体验要求年龄。建议4岁以上体验感更好。价格小贵但偶尔来一次还行。", tags: ["低龄可玩", "价格小贵", "偶尔来"], convenience: p => p[0], daysAgo: 27 },
    { adultRating: 5, childRating: 5, childAgeMonths: 60, text: "已经是第三次来了，每次孩子都有新发现。这次的航空体验是新项目，孩子穿上机长服帅呆了。", tags: ["三刷", "航空体验", "孩子最爱"], convenience: p => p[1], daysAgo: 39 },
    { adultRating: 4, childRating: 5, childAgeMonths: 42, text: "朋友推荐的，果然没失望。饼干制作和冰淇淋DIY孩子超喜欢，做好了还能带回家。", tags: ["饼干DIY", "朋友推荐", "带回家"], convenience: p => p[0], daysAgo: 51 },
  ],

  // ====== 上海 ======

  "32f0edfe-ce44-4919-80c6-c150aad67dc5": [ // 上海科技馆
    { adultRating: 5, childRating: 5, childAgeMonths: 72, text: "上海最好的亲子场所之一！动物世界展区太逼真了，蜘蛛馆虽然我怕但是孩子不怕哈哈。建议工作日来。", tags: ["上海最佳", "动物世界", "工作日来"], convenience: p => p[0], daysAgo: 2 },
    { adultRating: 5, childRating: 5, childAgeMonths: 60, text: "智慧之光展区孩子玩了两个多小时！高空自行车和怒发冲冠体验感满分。餐厅比想象中好，有儿童餐。", tags: ["智慧之光", "体验感满分", "有儿童餐"], convenience: p => p[1], daysAgo: 11 },
    { adultRating: 4, childRating: 4, childAgeMonths: 48, text: "信息时代展区对4岁娃有点难，但机器人弹钢琴吸引了他。IMAX巨幕影院很震撼，孩子第一次看3D电影。", tags: ["机器人弹琴", "巨幕震撼", "3D初体验"], convenience: p => p[0], daysAgo: 21 },
    { adultRating: 4, childRating: 5, childAgeMonths: 84, text: "学校科技节活动来过一次，这次专门来深度体验。地震体验和台风体验区让他明白了自然灾害，很有教育意义。", tags: ["地震体验", "教育意义强", "科技节"], convenience: p => p[2], daysAgo: 31 },
    { adultRating: 5, childRating: 5, childAgeMonths: 66, text: "已经是三刷了，每次都有不同主题。这次重点逛了宇航天地，模拟太空行走让孩子兴奋得不行。", tags: ["三刷", "宇航天地", "太空行走"], convenience: p => p[1], daysAgo: 43 },
    { adultRating: 3, childRating: 3, childAgeMonths: 30, text: "2岁半宝宝还太小了，好在有个「彩虹儿童乐园」区救了场。等大点再带他来深度体验。", tags: ["彩虹乐园", "大点再来"], convenience: p => p[0], daysAgo: 57 },
    { adultRating: 5, childRating: 4, childAgeMonths: 90, text: "作为一名科学老师，带娃来科技馆是最好的亲子时光。每个展品都是一堂生动的科学课。推荐给所有家长。", tags: ["科学老师推荐", "每展品都是课", "亲子时光"], convenience: p => p[2], daysAgo: 69 },
  ],

  "58ea13d9-6637-4110-9084-416f9f858f89": [ // 上海自然博物馆
    { adultRating: 5, childRating: 5, childAgeMonths: 60, text: "建筑设计就很惊艳！恐龙骨架群太壮观了。生命长河展区做得太好了，从恐龙到人类，孩子一路看一路问。", tags: ["恐龙震撼", "生命长河", "建筑设计"], convenience: p => p[0], daysAgo: 5 },
    { adultRating: 4, childRating: 4, childAgeMonths: 42, text: "非洲大草原展区的动物模型太逼真了，孩子以为是真的。蝴蝶标本墙拍照很美。就是周末人太多了。", tags: ["逼真模型", "蝴蝶墙", "人多"], convenience: p => p[1], daysAgo: 13 },
    { adultRating: 5, childRating: 5, childAgeMonths: 78, text: "走进馆里就被那个大恐龙骨架震住了！连我都觉得震撼。孩子拿着讲解器听了两个小时，回来跟我讲了好多恐龙知识。", tags: ["讲解器好", "知识收获大", "震撼"], convenience: p => p[0], daysAgo: 23 },
    { adultRating: 4, childRating: 3, childAgeMonths: 24, text: "2岁娃不太懂，但动物标本是喜欢的。看到大恐龙有点害怕，躲在爸爸身后不敢出来。建议幼儿园以后再带。", tags: ["2岁太小", "恐龙害怕", "幼儿园+"], convenience: p => p[1], daysAgo: 34 },
    { adultRating: 5, childRating: 5, childAgeMonths: 96, text: "学校布置了自然笔记作业，来这儿太合适了。孩子一边看一边画，写了满满三页。教育和亲子一举两得。", tags: ["自然笔记", "作业好去处", "一举两得"], convenience: p => p[2], daysAgo: 46 },
    { adultRating: 4, childRating: 4, childAgeMonths: 54, text: "提前微信预约的，非常方便。馆内空调很足，夏天遛娃绝佳。4D电影推荐看，孩子第一次看吓一跳又笑。", tags: ["预约方便", "空调好", "4D推荐"], convenience: p => p[0], daysAgo: 59 },
    { adultRating: 5, childRating: 5, childAgeMonths: 72, text: "从北京来上海旅游特意安排了这一站，比北京自然博物馆规模大设备新。孩子说这是他这次旅行最喜欢的地方。", tags: ["比北京的好", "旅行首选", "设备新"], convenience: p => p[0], daysAgo: 74 },
  ],

  "b73f4647-f538-4298-8523-ed287b39baa2": [ // 上海野生动物园
    { adultRating: 5, childRating: 5, childAgeMonths: 54, text: "猛兽区坐车看狮子老虎太刺激了！孩子又害怕又想看，全程抓着我的手。喂长颈鹿的项目一定要体验！", tags: ["猛兽区刺激", "喂长颈鹿", "必体验"], convenience: p => p[0], daysAgo: 4 },
    { adultRating: 4, childRating: 5, childAgeMonths: 42, text: "和普通动物园完全不一样！动物们活动空间大，看起来状态很好。大象表演很精彩，孩子跟着音乐跳舞。", tags: ["活动空间大", "动物状态好", "大象表演"], convenience: p => p[1], daysAgo: 12 },
    { adultRating: 4, childRating: 4, childAgeMonths: 66, text: "去的那天下雨，很多动物躲起来了。但好在有室内场馆。火烈鸟区和熊猫馆不受天气影响，还是一样精彩。", tags: ["雨天影响", "室内有保障", "火烈鸟"], convenience: p => p[2], daysAgo: 22 },
    { adultRating: 5, childRating: 5, childAgeMonths: 78, text: "建议买门票+车票的套票，坐观光车进散养区太值了。动物在车旁边走来走去，感觉像在非洲草原！", tags: ["套票划算", "散养区必去", "非洲草原感"], convenience: p => p[0], daysAgo: 35 },
    { adultRating: 3, childRating: 3, childAgeMonths: 20, text: "带小月龄宝宝不太方便，园区很大要走很多路。虽然推车友好但看完一圈大人精疲力尽。", tags: ["月龄太小", "全程徒步"], convenience: p => p[1], daysAgo: 47 },
    { adultRating: 4, childRating: 5, childAgeMonths: 48, text: "海狮剧场太精彩了！孩子笑得前仰后合。园区餐厅的儿童套餐有熊猫造型包子，孩子很喜欢。", tags: ["海狮剧场", "熊猫包子", "儿童套餐"], convenience: p => p[0], daysAgo: 61 },
  ],

  "f89afef1-d6f6-456e-9c80-dd9842bf2305": [ // 上海海昌海洋公园
    { adultRating: 5, childRating: 5, childAgeMonths: 54, text: "虎鲸表演太震撼了！看到虎鲸跃出水面那一刻全场的孩子都尖叫了。注意别坐前排会被水溅到。", tags: ["虎鲸震撼", "全场尖叫", "别坐前排"], convenience: p => p[0], daysAgo: 3 },
    { adultRating: 5, childRating: 5, childAgeMonths: 72, text: "全国最大的海洋公园名不虚传！极地馆的企鹅和北极熊太可爱了。孩子说这是他最开心的一天。", tags: ["全国最大", "极地馆", "最开心的一天"], convenience: p => p[1], daysAgo: 9 },
    { adultRating: 4, childRating: 5, childAgeMonths: 60, text: "美人鱼表演美轮美奂，小姑娘看呆了。海底餐厅用餐体验独特，虽然贵但是值得。建议穿舒适的鞋。", tags: ["美人鱼表演", "海底餐厅", "穿舒适鞋"], convenience: p => p[2], daysAgo: 17 },
    { adultRating: 4, childRating: 4, childAgeMonths: 42, text: "和迪士尼联动区域孩子很喜欢，看到了很多海洋主题的卡通人物。就是人太多，热门项目要排很久。", tags: ["迪士尼联动", "卡通人物", "排队久"], convenience: p => p[0], daysAgo: 27 },
    { adultRating: 5, childRating: 5, childAgeMonths: 84, text: "提前做了攻略，进门先冲虎鲸剧场抢好位置。整天的表演安排很紧凑，每个都不想错过。晚上烟花秀是惊喜！", tags: ["做攻略有必要", "烟花秀", "表演紧凑"], convenience: p => p[0], daysAgo: 38 },
    { adultRating: 3, childRating: 3, childAgeMonths: 18, text: "门票太贵了但1岁半宝宝基本看不懂表演，只在水母馆看了会儿。不太适合小月龄，性价比低。", tags: ["小月龄不值", "门票贵"], convenience: p => p[1], daysAgo: 49 },
    { adultRating: 5, childRating: 5, childAgeMonths: 66, text: "已经是二刷了！这次特意参加了和海豚互动的付费体验，孩子摸到海豚的时候眼睛发光。拍照服务也很赞。", tags: ["二刷", "海豚互动", "拍照服务好"], convenience: p => p[2], daysAgo: 63 },
    { adultRating: 4, childRating: 4, childAgeMonths: 48, text: "带孩子过六一来的，园方布置了很多儿童节活动，还有免费棉花糖。管理很用心，推荐给有娃家庭。", tags: ["六一活动", "管理用心", "亲子推荐"], convenience: p => p[0], daysAgo: 77 },
  ],

  // ====== 广州 ======

  "10838a4c-f049-48cc-920b-01a59ee8cc6d": [ // 广州长隆野生动物世界
    { adultRating: 5, childRating: 5, childAgeMonths: 48, text: "全国最好的野生动物园！自驾区开车进去，长颈鹿把头伸进车窗的那一刻，全家都疯了。绝对值得去！", tags: ["全国最好", "自驾体验", "长颈鹿探头"], convenience: p => p[0], daysAgo: 1 },
    { adultRating: 5, childRating: 5, childAgeMonths: 60, text: "空中缆车俯瞰动物太酷了！孩子从高处看到了老虎和熊，激动得不行。一定买包含缆车的套票。", tags: ["空中缆车", "俯瞰动物", "强烈推荐"], convenience: p => p[1], daysAgo: 6 },
    { adultRating: 5, childRating: 5, childAgeMonths: 72, text: "考拉馆有6只考拉！孩子第一次见到真实的考拉，回来画了一幅考拉在桉树上睡觉的画。亲子游天堂！", tags: ["考拉", "亲子天堂", "激发创作"], convenience: p => p[0], daysAgo: 15 },
    { adultRating: 4, childRating: 5, childAgeMonths: 36, text: "3岁娃第一次看这么多动物，每次都大声喊动物名字，特别可爱。儿童动物园可以喂羊驼，体验很好。", tags: ["第一次看动物", "喂羊驼", "特别可爱"], convenience: p => p[2], daysAgo: 24 },
    { adultRating: 5, childRating: 5, childAgeMonths: 84, text: "第三次来了，每次都觉得值。这次看了白虎表演和飞鸟乐园，孩子说下次还要来。长隆确实名不虚传。", tags: ["三刷", "白虎表演", "名不虚传"], convenience: p => p[0], daysAgo: 36 },
    { adultRating: 4, childRating: 4, childAgeMonths: 54, text: "园区太大了，一天根本逛不完。建议住长隆酒店玩两天。餐厅价格偏高但味道不错，有儿童菜单。", tags: ["一天不够", "建议住酒店", "儿童菜单"], convenience: p => p[1], daysAgo: 48 },
    { adultRating: 5, childRating: 5, childAgeMonths: 96, text: "学校放假来广州玩，长隆是重头戏。孩子最喜欢熊猫三胞胎，说是萌帅酷。回去写了一篇游记被老师表扬了。", tags: ["熊猫三胞胎", "学校假期", "游记素材"], convenience: p => p[2], daysAgo: 60 },
    { adultRating: 5, childRating: 5, childAgeMonths: 42, text: "整个动物园像热带雨林，植被太好了。小火车坐了一个多小时，看到了各种动物。工作人员讲解也很专业。", tags: ["热带雨林", "小火车", "专业讲解"], convenience: p => p[0], daysAgo: 73 },
  ],

  "98ca4ab6-cc72-41e4-95c0-80bdce3ad49c": [ // 广东省博物馆
    { adultRating: 4, childRating: 3, childAgeMonths: 54, text: "博物馆建筑很大气，但孩子对文物不太感兴趣。好在海洋生物展厅和恐龙展救了场。免费但需要预约。", tags: ["免费需预约", "海洋展厅", "建筑大气"], convenience: p => p[0], daysAgo: 8 },
    { adultRating: 5, childRating: 4, childAgeMonths: 84, text: "带孩子了解岭南文化的好地方。端砚展厅和潮州木雕特别精美。孩子最喜欢海洋馆里的大鲸鱼骨架。", tags: ["岭南文化", "海洋馆", "教育意义"], convenience: p => p[1], daysAgo: 18 },
    { adultRating: 3, childRating: 2, childAgeMonths: 36, text: "3岁孩子基本看不懂文物，只在海洋生物区待了一会儿。不过馆内空调很足，夏天当避暑也行。", tags: ["低龄不推荐", "避暑还行"], convenience: p => p[0], daysAgo: 28 },
    { adultRating: 4, childRating: 3, childAgeMonths: 60, text: "正好赶上特展「从伦勃朗到莫奈」，大人看得津津有味。孩子对互动区的手工活动更感兴趣，做了一张剪纸。", tags: ["特展精彩", "手工互动", "大人更享受"], convenience: p => p[2], daysAgo: 40 },
    { adultRating: 5, childRating: 4, childAgeMonths: 96, text: "学校暑假作业要求参观博物馆写报告，广东省博是最佳选择。展品丰富、解说清晰，回来写了1500字报告。", tags: ["学校作业", "展品丰富", "解说清晰"], convenience: p => p[0], daysAgo: 55 },
    { adultRating: 4, childRating: 4, childAgeMonths: 72, text: "带孩子来认识广东历史，从南越王到海上丝绸之路。孩子对船模和航海工具特别感兴趣。提前微信预约很方便。", tags: ["广东历史", "船模", "微信预约"], convenience: p => p[1], daysAgo: 67 },
  ],

  "bfc93807-1269-41f9-bb26-85f1d2e6e7e9": [ // 广州海洋馆
    { adultRating: 4, childRating: 4, childAgeMonths: 42, text: "虽然不如长隆大，但胜在市区内交通方便。海底隧道很不错，孩子看鲨鱼看了好久。周末亲子半日游够了。", tags: ["市区方便", "海底隧道", "半日游"], convenience: p => p[0], daysAgo: 6 },
    { adultRating: 3, childRating: 4, childAgeMonths: 48, text: "空间偏小，跟海昌比有差距。但海狮表演还不错，孩子挺喜欢的。门票价格合理，作为日常遛娃还行。", tags: ["空间小", "海狮表演", "价格合理"], convenience: p => p[1], daysAgo: 16 },
    { adultRating: 4, childRating: 5, childAgeMonths: 36, text: "3岁娃去刚刚好！不大不小，逛两小时刚好不累。五颜六色的热带鱼很吸引他，一直趴在玻璃上。", tags: ["3岁刚好", "热带鱼", "时间合适"], convenience: p => p[2], daysAgo: 25 },
    { adultRating: 3, childRating: 3, childAgeMonths: 72, text: "去过海昌和长隆再来看这个，落差有点大。但孩子说还是喜欢，因为看到了会变色的水母。", tags: ["有水母", "跟大馆有差距"], convenience: p => p[0], daysAgo: 37 },
    { adultRating: 4, childRating: 4, childAgeMonths: 54, text: "场馆虽小但维护得很好，水质清澈。触摸池让孩子亲手摸了海星和海胆，体验感加分。路边停车方便。", tags: ["触摸池", "水质好", "停车方便"], convenience: p => p[0], daysAgo: 50 },
    { adultRating: 5, childRating: 5, childAgeMonths: 30, text: "意外之喜！本来没抱太大期望，结果小宝宝看到鱼群游过兴奋地拍玻璃。工作人员很友好，还帮忙拍照。", tags: ["意外之喜", "工作人员好", "小宝宝友好"], convenience: p => p[2], daysAgo: 64 },
  ],

};

// ============================================================
// 工具函数
// ============================================================
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgoToDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
  return d;
}

function spotTypeFromName(name: string): string {
  if (name.includes("博物馆") || name.includes("科技馆") || name.includes("天文馆")) return "museum";
  if (name.includes("海洋馆") || name.includes("海洋公园") || name.includes("动物园") || name.includes("野生动物")) return "zoo";
  if (name.includes("欢乐谷")) return "amusement";
  if (name.includes("儿童乐园")) return "indoor_play";
  if (name.includes("颐和园")) return "park";
  return "museum";
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log("🌱 开始插入景点评价种子数据...\n");

  let totalInserted = 0;
  const allInserts: any[] = [];

  for (const spot of Object.values(SPOTS)) {
    const reviews = REVIEWS[spot.id];
    if (!reviews) {
      console.log(`  ⚠️  跳过 ${spot.name}：无评价模板`);
      continue;
    }

    console.log(`  📝 ${spot.name}（${reviews.length} 条评价）`);

    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      const userId = USERS[totalInserted % USERS.length];
      const spotType = spotTypeFromName(spot.name);
      const presets = CONVENIENCE_PRESETS[spotType] || CONVENIENCE_PRESETS.museum;
      const conv = r.convenience(presets);
      const visitDate = daysAgoToDate(r.daysAgo);

      const data = {
        placeId: spot.id,
        placeType: "sight",
        placeName: spot.name,
        cityId: spot.cityId,
        userId,
        adultRating: r.adultRating,
        childRating: r.childRating,
        childAgeMonths: r.childAgeMonths,
        text: r.text,
        tags: r.tags,
        visitDate,
        hasParking: conv.hasParking,
        hasHighChair: conv.hasHighChair,
        hasNapRoom: conv.hasNapRoom,
        strollerOk: conv.strollerOk,
        kidFriendly: conv.kidFriendly,
        status: "published",
      };

      await prisma.placeReview.upsert({
        where: {
          placeId_placeType_userId: {
            placeId: data.placeId,
            placeType: data.placeType,
            userId: data.userId,
          },
        },
        create: data,
        update: {
          adultRating: data.adultRating,
          childRating: data.childRating,
          text: data.text,
          tags: data.tags,
          hasParking: data.hasParking,
          hasHighChair: data.hasHighChair,
          hasNapRoom: data.hasNapRoom,
          strollerOk: data.strollerOk,
          kidFriendly: data.kidFriendly,
        },
      });

      totalInserted++;
    }
  }

  console.log(`\n✅ 共插入 ${totalInserted} 条评价\n`);

  // 重算所有景点的聚合数据
  console.log("📊 重算聚合数据...");
  for (const spot of Object.values(SPOTS)) {
    try {
      await recomputePlaceAggregate(spot.id, "sight");
    } catch (e: any) {
      console.log(`  ⚠️  聚合失败 ${spot.name}: ${e.message}`);
    }
  }
  console.log("✅ 聚合数据重算完成\n");

  // 统计
  const reviewCount = await prisma.placeReview.count();
  const aggCount = await prisma.placeAggregate.count();
  console.log(`📈 数据库现状：${reviewCount} 条评价，${aggCount} 个聚合\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
