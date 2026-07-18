// 走天下勋章 v2.0 完整定义（30+ 枚，6 大类 + 隐藏）
// 详见 项目建设方案/走天下实施方案-v2.0.md 第八节 + 附录 C
//
// v1.5 13 枚 → v2.0 35 枚
// 新增：父母成长 5 / 季节限定 5 / 亲子协作 3 / 隐藏 5
// 扩展：城市探索 +5 / 内容产出 +5 / 社交影响 +4
// 引入：稀有度 (bronze/silver/gold/diamond) + tier + hiddenFlag + seasonalTag

export type Rarity = "bronze" | "silver" | "gold" | "diamond";

export interface BadgeDef {
  name: string;
  description: string;
  icon: string;
  category: "城市探索" | "内容产出" | "社交影响" | "父母成长" | "季节限定" | "亲子协作";
  rarity: Rarity;
  tier: number;            // 0-4，用于排序
  seasonalTag?: string;    // e.g. "暑期限定"
  hiddenFlag?: boolean;    // 达到条件才弹
  criteria: Record<string, any>;
}

export const RARITY_WEIGHT: Record<Rarity, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 5,
};

export const RARITY_EXCHANGE_POINTS: Record<Rarity, number> = {
  bronze: 50,
  silver: 100,
  gold: 200,
  diamond: 500,
};

export const TRAVEL_BADGES: BadgeDef[] = [
  // ====================================================================
  // 类别一：城市探索（10 枚）
  // ====================================================================
  {
    name: "城市探索者",
    description: "首次完成一座城市的出行计划",
    icon: "🗺️",
    category: "城市探索",
    rarity: "bronze",
    tier: 1,
    criteria: { type: "city_count", value: 1 },
  },
  {
    name: "三代同游",
    description: "和爷爷奶奶/外公外婆一起完成一次出行",
    icon: "👨‍👩‍👧‍👦",
    category: "城市探索",
    rarity: "silver",
    tier: 2,
    criteria: { type: "generations_met", value: 3 },
  },
  {
    name: "周末游侠",
    description: "完成 5 次周末短途出行",
    icon: "🥾",
    category: "城市探索",
    rarity: "bronze",
    tier: 1,
    criteria: { type: "weekend_count", value: 5 },
  },
  {
    name: "海岛达人",
    description: "完成 3 次海岛主题城市旅行",
    icon: "🏝️",
    category: "城市探索",
    rarity: "silver",
    tier: 2,
    criteria: { type: "city_tag_count", tag: "海岛", value: 3 },
  },
  {
    name: "古城探秘",
    description: "完成 3 次古城主题城市旅行",
    icon: "🏯",
    category: "城市探索",
    rarity: "silver",
    tier: 2,
    criteria: { type: "city_tag_count", tag: "古城", value: 3 },
  },
  // v2.0 新增
  {
    name: "边境之城",
    description: "完成 1 次边远省份城市（新疆/西藏/内蒙/云南）出行",
    icon: "🏔️",
    category: "城市探索",
    rarity: "silver",
    tier: 2,
    criteria: { type: "city_province_match", provinces: ["新疆", "西藏", "内蒙古", "云南"], value: 1 },
  },
  {
    name: "首都足迹",
    description: "完成 4 个一线城市（北京/上海/广州/深圳）",
    icon: "🏛️",
    category: "城市探索",
    rarity: "gold",
    tier: 3,
    criteria: { type: "city_name_match", cities: ["北京", "上海", "广州", "深圳"], value: 4 },
  },
  {
    name: "江南水乡",
    description: "完成 1 次江浙沪城市（杭州/苏州/南京/无锡）出行",
    icon: "🏞️",
    category: "城市探索",
    rarity: "silver",
    tier: 2,
    criteria: { type: "city_name_match", cities: ["杭州", "苏州", "南京", "无锡"], value: 1 },
  },
  {
    name: "西北豪情",
    description: "完成 1 次陕甘宁青城市（西安/兰州/银川/西宁）出行",
    icon: "🐫",
    category: "城市探索",
    rarity: "silver",
    tier: 2,
    criteria: { type: "city_name_match", cities: ["西安", "兰州", "银川", "西宁"], value: 1 },
  },
  {
    name: "山城印象",
    description: "完成 1 次云贵川城市（重庆/成都/昆明/贵阳/大理）出行",
    icon: "🌶️",
    category: "城市探索",
    rarity: "silver",
    tier: 2,
    criteria: { type: "city_name_match", cities: ["重庆", "成都", "昆明", "贵阳", "大理"], value: 1 },
  },

  // ====================================================================
  // 类别二：内容产出（10 枚）
  // ====================================================================
  {
    name: "首篇攻略",
    description: "第一次发布攻略",
    icon: "📝",
    category: "内容产出",
    rarity: "bronze",
    tier: 1,
    criteria: { type: "guide_count", value: 1 },
  },
  {
    name: "图文并茂",
    description: "单篇攻略含 ≥5 张图 + ≥300 字",
    icon: "📸",
    category: "内容产出",
    rarity: "silver",
    tier: 2,
    criteria: { type: "guide_min_quality", minImages: 5, minChars: 300 },
  },
  {
    name: "避坑贡献者",
    description: "攻略含 ≥3 条避坑被其他用户点赞 ≥1 次",
    icon: "⚠️",
    category: "内容产出",
    rarity: "silver",
    tier: 2,
    criteria: { type: "guide_pitfall_count", value: 3 },
  },
  {
    name: "小旅行家",
    description: "单篇攻略覆盖 ≥3 个城市",
    icon: "✈️",
    category: "内容产出",
    rarity: "silver",
    tier: 2,
    criteria: { type: "guide_city_count", value: 3 },
  },
  {
    name: "真实记录者",
    description: "连续 3 次出行都发布攻略",
    icon: "🎯",
    category: "内容产出",
    rarity: "bronze",
    tier: 1,
    criteria: { type: "consecutive_publish_streak", value: 3 },
  },
  // v2.0 新增
  {
    name: "视频攻略",
    description: "发布 1 篇含视频的攻略",
    icon: "🎬",
    category: "内容产出",
    rarity: "gold",
    tier: 3,
    criteria: { type: "guide_with_video", value: 1 },
  },
  {
    name: "长篇游记",
    description: "发布 1 篇字数 ≥1500 字的攻略",
    icon: "📖",
    category: "内容产出",
    rarity: "silver",
    tier: 2,
    criteria: { type: "guide_min_chars", value: 1500 },
  },
  {
    name: "神级攻略",
    description: "单篇攻略收藏 ≥10 + 点赞 ≥50",
    icon: "🌠",
    category: "内容产出",
    rarity: "gold",
    tier: 3,
    criteria: { type: "guide_save_and_like", minSave: 10, minLike: 50 },
  },
  {
    name: "攻略合集",
    description: "累计发布 ≥5 篇攻略",
    icon: "📚",
    category: "内容产出",
    rarity: "gold",
    tier: 3,
    criteria: { type: "guide_count", value: 5 },
  },
  {
    name: "修正师",
    description: "编辑被采纳（攻略被 admin 标记为'已修正'）",
    icon: "✏️",
    category: "内容产出",
    rarity: "silver",
    tier: 2,
    criteria: { type: "guide_corrected", value: 1 },
  },

  // ====================================================================
  // 类别三：社交影响（7 枚）
  // ====================================================================
  {
    name: "人气攻略家",
    description: "单篇攻略收藏 ≥50",
    icon: "⭐",
    category: "社交影响",
    rarity: "gold",
    tier: 3,
    criteria: { type: "guide_save_count", value: 50 },
  },
  {
    name: "避坑英雄",
    description: "攻略含避坑被点赞 ≥10 次",
    icon: "🛡️",
    category: "社交影响",
    rarity: "gold",
    tier: 3,
    criteria: { type: "guide_pitfall_like_count", value: 10 },
  },
  {
    name: "社区之星",
    description: "粉丝数 ≥100",
    icon: "🌟",
    category: "社交影响",
    rarity: "gold",
    tier: 3,
    criteria: { type: "follower_count", value: 100 },
  },
  // v2.0 新增
  {
    name: "新人引导员",
    description: "回复新妈妈 10 个提问",
    icon: "🤝",
    category: "社交影响",
    rarity: "silver",
    tier: 2,
    criteria: { type: "comments_to_new_users", value: 10 },
  },
  {
    name: "评论王",
    description: "累计评论 100 条",
    icon: "💬",
    category: "社交影响",
    rarity: "bronze",
    tier: 1,
    criteria: { type: "total_comments", value: 100 },
  },
  {
    name: "收藏达人",
    description: "累计收藏 200 攻略",
    icon: "🔖",
    category: "社交影响",
    rarity: "bronze",
    tier: 1,
    criteria: { type: "total_saves", value: 200 },
  },
  {
    name: "引路人",
    description: "10 个新用户通过你的攻略注册",
    icon: "🧭",
    category: "社交影响",
    rarity: "gold",
    tier: 3,
    criteria: { type: "guide_referral_count", value: 10 },
  },

  // ====================================================================
  // 类别四：父母成长（5 枚，v2.0 新增）
  // ====================================================================
  {
    name: "孩子观察家",
    description: "完成 10 次多维度评分（7 维结构化记录）",
    icon: "🔍",
    category: "父母成长",
    rarity: "silver",
    tier: 2,
    criteria: { type: "rating_count", value: 10 },
  },
  {
    name: "节奏掌握者",
    description: "5 次行程被其他妈妈 fork",
    icon: "🎼",
    category: "父母成长",
    rarity: "gold",
    tier: 3,
    criteria: { type: "plan_forked_count", value: 5 },
  },
  {
    name: "协调者",
    description: "行程包含至少 3 种不同类型活动",
    icon: "🎨",
    category: "父母成长",
    rarity: "bronze",
    tier: 1,
    criteria: { type: "plan_activity_diversity", minTypes: 3 },
  },
  {
    name: "预算把控者",
    description: "行程实际花费在预算 ±10% 内（5 次）",
    icon: "💰",
    category: "父母成长",
    rarity: "silver",
    tier: 2,
    criteria: { type: "plan_within_budget", value: 5 },
  },
  {
    name: "复盘者",
    description: "出行后 7 天内发布攻略（5 次）",
    icon: "📋",
    category: "父母成长",
    rarity: "bronze",
    tier: 1,
    criteria: { type: "review_within_7d", value: 5 },
  },

  // ====================================================================
  // 类别五：季节限定（5 枚，v2.0 新增）
  // ====================================================================
  {
    name: "暑期玩家",
    description: "6-8 月完成 3 次出行",
    icon: "🌞",
    category: "季节限定",
    rarity: "silver",
    tier: 2,
    seasonalTag: "暑期限定",
    criteria: { type: "month_range_count", months: [6, 7, 8], value: 3 },
  },
  {
    name: "寒假旅行家",
    description: "12-2 月完成 2 次出行",
    icon: "❄️",
    category: "季节限定",
    rarity: "silver",
    tier: 2,
    seasonalTag: "寒假限定",
    criteria: { type: "month_range_count", months: [12, 1, 2], value: 2 },
  },
  {
    name: "樱花季",
    description: "3-4 月完成 1 次出行",
    icon: "🌸",
    category: "季节限定",
    rarity: "bronze",
    tier: 1,
    seasonalTag: "春季限定",
    criteria: { type: "month_range_count", months: [3, 4], value: 1 },
  },
  {
    name: "红叶季",
    description: "10-11 月完成 1 次出行",
    icon: "🍁",
    category: "季节限定",
    rarity: "bronze",
    tier: 1,
    seasonalTag: "秋季限定",
    criteria: { type: "month_range_count", months: [10, 11], value: 1 },
  },
  {
    name: "雪国",
    description: "12-2 月完成含雪/冰场/滑雪的出行",
    icon: "⛷️",
    category: "季节限定",
    rarity: "silver",
    tier: 2,
    seasonalTag: "冬季限定",
    criteria: { type: "month_range_with_tag", months: [12, 1, 2], tag: "雪", value: 1 },
  },

  // ====================================================================
  // 类别六：亲子协作（3 枚，v2.0 新增）
  // ====================================================================
  {
    name: "兄弟同行",
    description: "携带 ≥2 孩子完成 1 次出行",
    icon: "👫",
    category: "亲子协作",
    rarity: "bronze",
    tier: 1,
    criteria: { type: "travelers_children_min", value: 2 },
  },
  {
    name: "祖孙三代",
    description: "三代同行 1 次（包含祖辈）",
    icon: "👴",
    category: "亲子协作",
    rarity: "gold",
    tier: 3,
    criteria: { type: "generations_met", value: 3 },
  },
  {
    name: "夫妻档",
    description: "与配偶同行 + 都留下真实感受记录",
    icon: "💑",
    category: "亲子协作",
    rarity: "silver",
    tier: 2,
    criteria: { type: "both_parents_rated", value: 1 },
  },

  // ====================================================================
  // 隐藏勋章（5 枚，v2.0 新增，不预先在勋章墙出现）
  // ====================================================================
  {
    name: "第一次写避坑",
    description: "你的第一条「避坑」攻略被点赞后才揭晓",
    icon: "🎁",
    category: "内容产出",
    rarity: "gold",
    tier: 3,
    hiddenFlag: true,
    criteria: { type: "first_pitfall_liked", value: 1 },
  },
  {
    name: "凌晨的旅人",
    description: "凌晨 4-6 点记录过感受",
    icon: "🌙",
    category: "父母成长",
    rarity: "bronze",
    tier: 1,
    hiddenFlag: true,
    criteria: { type: "rating_in_hour_range", startHour: 4, endHour: 6, value: 1 },
  },
  {
    name: "雨中的赞",
    description: "雨天的攻略被收藏 ≥3",
    icon: "🌧️",
    category: "内容产出",
    rarity: "silver",
    tier: 2,
    hiddenFlag: true,
    criteria: { type: "rainy_day_save_count", value: 3 },
  },
  {
    name: "治愈者",
    description: "攻略被标注「治愈」 ≥5",
    icon: "🩹",
    category: "社交影响",
    rarity: "gold",
    tier: 3,
    hiddenFlag: true,
    criteria: { type: "tag_save_count", tag: "治愈", value: 5 },
  },
  {
    name: "跨年出行",
    description: "12.31 或 1.1 当天完成 1 次出行",
    icon: "🎆",
    category: "季节限定",
    rarity: "gold",
    tier: 3,
    hiddenFlag: true,
    criteria: { type: "specific_date_range", dates: ["12-31", "01-01"], value: 1 },
  },
];

// 工具函数
export function getBadgeByName(name: string): BadgeDef | undefined {
  return TRAVEL_BADGES.find((b) => b.name === name);
}

export function getRarityWeight(rarity: Rarity): number {
  return RARITY_WEIGHT[rarity];
}

export function getExchangePoints(rarity: Rarity): number {
  return RARITY_EXCHANGE_POINTS[rarity];
}

export const BADGE_CATEGORIES = [
  "城市探索",
  "内容产出",
  "社交影响",
  "父母成长",
  "季节限定",
  "亲子协作",
] as const;
