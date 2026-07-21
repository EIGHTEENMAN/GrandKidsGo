// 统一的亲子体验标签字典（v3.6）
// 详见 项目建设方案/走天下实施方案-v3.6.md 标签系统
//
// 设计原则：
// - 横切属性，不与城市/景点并列
// - 用户路径："我想要 [标签]" → 看带此标签的地点和攻略
// - 标签覆盖 6 大维度：主题/体验/玩法/场景/适龄/预算

export const TAG_CATEGORIES = [
  {
    key: 'theme',
    label: '🎯 主题',
    tags: [
      { id: '玩水', emoji: '💦', label: '玩水' },
      { id: '海边', emoji: '🏖️', label: '海边' },
      { id: '爬山', emoji: '⛰️', label: '爬山' },
      { id: '漂流', emoji: '🛶', label: '漂流' },
      { id: '露营', emoji: '🏕️', label: '露营' },
      { id: '滑雪', emoji: '⛷️', label: '滑雪' },
      { id: '采摘', emoji: '🍎', label: '采摘' },
      { id: '游船', emoji: '⛵', label: '游船' },
      { id: '观星', emoji: '🌌', label: '观星' },
    ],
  },
  {
    key: 'experience',
    label: '📚 体验',
    tags: [
      { id: '研学', emoji: '📖', label: '研学' },
      { id: '历史', emoji: '🏛️', label: '历史' },
      { id: '文化', emoji: '🎭', label: '文化' },
      { id: '艺术', emoji: '🎨', label: '艺术' },
      { id: '科技', emoji: '🔬', label: '科技' },
      { id: '自然', emoji: '🌿', label: '自然' },
      { id: '动物', emoji: '🦁', label: '动物' },
      { id: '植物', emoji: '🌸', label: '植物' },
    ],
  },
  {
    key: 'style',
    label: '🎮 玩法',
    tags: [
      { id: '刺激', emoji: '🎢', label: '刺激' },
      { id: '休闲', emoji: '🛋️', label: '休闲' },
      { id: '探险', emoji: '🧗', label: '探险' },
      { id: '互动', emoji: '🤝', label: '互动' },
      { id: '表演', emoji: '🎪', label: '表演' },
      { id: 'DIY', emoji: '🔨', label: 'DIY' },
    ],
  },
  {
    key: 'scene',
    label: '🏖️ 场景',
    tags: [
      { id: '室内', emoji: '🏠', label: '室内' },
      { id: '户外', emoji: '🌳', label: '户外' },
      { id: '主题乐园', emoji: '🎡', label: '主题乐园' },
      { id: '古迹', emoji: '🏯', label: '古迹' },
      { id: '公园', emoji: '🌳', label: '公园' },
      { id: '商场', emoji: '🛍️', label: '商场' },
    ],
  },
  {
    key: 'age',
    label: '👶 适龄',
    tags: [
      { id: '婴儿', emoji: '🍼', label: '婴儿（0-2岁）' },
      { id: '幼儿', emoji: '👶', label: '幼儿（3-5岁）' },
      { id: '学龄', emoji: '🧒', label: '学龄（6-9岁）' },
      { id: '少年', emoji: '👦', label: '少年（10岁+）' },
    ],
  },
  {
    key: 'budget',
    label: '💰 预算',
    tags: [
      { id: '免费', emoji: '🆓', label: '免费' },
      { id: '性价比', emoji: '💵', label: '性价比' },
      { id: '中等', emoji: '💰', label: '中等' },
      { id: '高端', emoji: '💎', label: '高端' },
    ],
  },
];

// 把所有标签扁平化
export const ALL_TAGS = TAG_CATEGORIES.flatMap((c) => c.tags);

// 按 id 查找
export function getTagById(id: string) {
  return ALL_TAGS.find((t) => t.id === id);
}

// 热门标签（首页 chip 横滑用）
export const POPULAR_TAGS = [
  '玩水', '海边', '爬山', '研学', '动物', '采摘',
  '露营', '历史', '主题乐园', '博物馆', '滑雪', '观星',
];
