const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 46 枚勋章定义（精简版）
const BADGES = [
  { name: "城市探索者", icon: "🗺️", category: "城市探索", rarity: "bronze", tier: 1, hiddenFlag: false, criteria: { type: "city_count", value: 1 } },
  { name: "三代同游", icon: "👨‍👩‍👧‍👦", category: "城市探索", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "generations_met", value: 3 } },
  { name: "周末游侠", icon: "🗓️", category: "城市探索", rarity: "bronze", tier: 1, hiddenFlag: false, criteria: { type: "total_trips", value: 5 } },
  { name: "海岛达人", icon: "🏝️", category: "城市探索", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "city_type_count", value: 3, tags: ["海岛"] } },
  { name: "古城探秘", icon: "🏯", category: "城市探索", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "city_type_count", value: 3, tags: ["古城"] } },
  { name: "边境之城", icon: "🛂", category: "城市探索", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "city_type_count", value: 1, tags: ["边境"] } },
  { name: "首都足迹", icon: "🏛️", category: "城市探索", rarity: "gold", tier: 3, hiddenFlag: false, criteria: { type: "city_reach", value: "北京" } },
  { name: "江南水乡", icon: "🚣", category: "城市探索", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "city_type_count", value: 1, tags: ["水乡"] } },
  { name: "西北豪情", icon: "🐪", category: "城市探索", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "city_type_count", value: 1, tags: ["西北"] } },
  { name: "山城印象", icon: "⛰️", category: "城市探索", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "city_reach", value: "重庆" } },
  { name: "首篇攻略", icon: "📝", category: "内容产出", rarity: "bronze", tier: 1, hiddenFlag: false, criteria: { type: "guide_count", value: 1 } },
  { name: "图文并茂", icon: "🖼️", category: "内容产出", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "rich_guide", value: 1 } },
  { name: "避坑贡献者", icon: "⚠️", category: "内容产出", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "pitfall_count", value: 3 } },
  { name: "小旅行家", icon: "🧳", category: "内容产出", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "multi_city_guide", value: 1 } },
  { name: "真实记录者", icon: "📖", category: "内容产出", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "consecutive_guides", value: 3 } },
  { name: "视频攻略", icon: "🎬", category: "内容产出", rarity: "gold", tier: 3, hiddenFlag: false, criteria: { type: "has_video", value: 1 } },
  { name: "长篇游记", icon: "📜", category: "内容产出", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "long_guide", value: 1 } },
  { name: "神级攻略", icon: "👑", category: "内容产出", rarity: "gold", tier: 3, hiddenFlag: false, criteria: { type: "top_reviewed", value: 1 } },
  { name: "攻略合集", icon: "📚", category: "内容产出", rarity: "gold", tier: 3, hiddenFlag: false, criteria: { type: "guide_count", value: 5 } },
  { name: "修正师", icon: "✏️", category: "内容产出", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "self_edit", value: 3 } },
  { name: "人气攻略家", icon: "🌟", category: "社交影响", rarity: "gold", tier: 3, hiddenFlag: false, criteria: { type: "max_saves", value: 50 } },
  { name: "避坑英雄", icon: "🦸", category: "社交影响", rarity: "gold", tier: 3, hiddenFlag: false, criteria: { type: "max_likes", value: 10 } },
  { name: "社区之星", icon: "⭐", category: "社交影响", rarity: "gold", tier: 3, hiddenFlag: false, criteria: { type: "follower_count", value: 100 } },
  { name: "新人引导员", icon: "🧭", category: "社交影响", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "follower_count", value: 10 } },
  { name: "评论王", icon: "💬", category: "社交影响", rarity: "bronze", tier: 1, hiddenFlag: false, criteria: { type: "comment_count", value: 10 } },
  { name: "收藏达人", icon: "⭐", category: "社交影响", rarity: "bronze", tier: 1, hiddenFlag: false, criteria: { type: "total_saves", value: 20 } },
  { name: "引路人", icon: "🧭", category: "社交影响", rarity: "gold", tier: 3, hiddenFlag: false, criteria: { type: "total_saves", value: 100 } },
  { name: "孩子观察家", icon: "👶", category: "父母成长", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "child_age_range", minAge: 0, maxAge: 36 } },
  { name: "节奏掌握者", icon: "⏰", category: "父母成长", rarity: "gold", tier: 3, hiddenFlag: false, criteria: { type: "has_needs_met", value: 1 } },
  { name: "协调者", icon: "🤝", category: "父母成长", rarity: "bronze", tier: 1, hiddenFlag: false, criteria: { type: "multi_child_balance", value: 1 } },
  { name: "预算把控者", icon: "💰", category: "父母成长", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "within_budget", value: 3 } },
  { name: "复盘者", icon: "🔄", category: "父母成长", rarity: "bronze", tier: 1, hiddenFlag: false, criteria: { type: "feeling_update", value: 5 } },
  { name: "暑期玩家", icon: "🌞", category: "季节限定", rarity: "silver", tier: 2, hiddenFlag: false, seasonalTag: "暑期限定", criteria: { type: "seasonal_trips", season: "summer", value: 3 } },
  { name: "寒假旅行家", icon: "❄️", category: "季节限定", rarity: "silver", tier: 2, hiddenFlag: false, seasonalTag: "寒假限定", criteria: { type: "seasonal_trips", season: "winter", value: 2 } },
  { name: "樱花季", icon: "🌸", category: "季节限定", rarity: "bronze", tier: 1, hiddenFlag: false, seasonalTag: "春期限定", criteria: { type: "seasonal_trips", season: "spring", value: 1 } },
  { name: "红叶季", icon: "🍁", category: "季节限定", rarity: "bronze", tier: 1, hiddenFlag: false, seasonalTag: "秋期限定", criteria: { type: "seasonal_trips", season: "autumn", value: 1 } },
  { name: "雪国", icon: "⛄", category: "季节限定", rarity: "silver", tier: 2, hiddenFlag: false, seasonalTag: "寒期限定", criteria: { type: "specific_date", season: "winter", value: 1 } },
  { name: "兄弟同行", icon: "👬", category: "亲子协作", rarity: "bronze", tier: 1, hiddenFlag: false, criteria: { type: "multi_child", value: 1 } },
  { name: "祖孙三代", icon: "👨‍👩‍👧‍👦", category: "亲子协作", rarity: "gold", tier: 3, hiddenFlag: false, criteria: { type: "generations_met", value: 3 } },
  { name: "夫妻档", icon: "💑", category: "亲子协作", rarity: "silver", tier: 2, hiddenFlag: false, criteria: { type: "both_parents_rated", value: 1 } },
  { name: "第一次写避坑", icon: "🎁", category: "内容产出", rarity: "gold", tier: 3, hiddenFlag: true, criteria: { type: "first_pitfall_liked", value: 1 } },
  { name: "凌晨的旅人", icon: "🌙", category: "父母成长", rarity: "bronze", tier: 1, hiddenFlag: true, criteria: { type: "rating_in_hour_range", startHour: 4, endHour: 6 } },
  { name: "雨中的赞", icon: "🌧️", category: "内容产出", rarity: "silver", tier: 2, hiddenFlag: true, criteria: { type: "rainy_day_save_count", value: 3 } },
  { name: "治愈者", icon: "🩹", category: "社交影响", rarity: "gold", tier: 3, hiddenFlag: true, criteria: { type: "tag_save_count", tag: "治愈", value: 5 } },
  { name: "跨年出行", icon: "🎆", category: "季节限定", rarity: "gold", tier: 3, hiddenFlag: true, criteria: { type: "specific_date_range", dates: ["12-31", "01-01"] } },
];

async function main() {
  let count = 0;
  for (const b of BADGES) {
    await prisma.travelBadgeDef.upsert({
      where: { name: b.name },
      update: { description: `${b.icon} ${b.name}`, icon: b.icon, category: b.category, rarity: b.rarity, tier: b.tier, seasonalTag: b.seasonalTag ?? null, hiddenFlag: b.hiddenFlag, criteria: b.criteria },
      create: { name: b.name, description: `${b.icon} ${b.name}`, icon: b.icon, category: b.category, rarity: b.rarity, tier: b.tier, seasonalTag: b.seasonalTag ?? null, hiddenFlag: b.hiddenFlag, criteria: b.criteria },
    });
    count++;
  }
  console.log(`seeded ${count} badge defs`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
