// GEO: 走天下 JSON-LD 生成器（服务端使用，产出字符串供 <Script> 渲染）
// Article + BreadcrumbList + TouristAttraction 联动

const BASE = 'https://travel.grandand.com';
const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || BASE;

export interface GuideJsonLdData {
  id: string;
  title: string;
  contentHtml: string;
  coverImages: string[];
  city?: { id: string; name: string } | null;
  days?: number | null;
  childAges?: number[];
  travelStyle?: string | null;
  season?: string | null;
  tags?: string[];
  publishedAt?: string;
  createdAt: string;
  stats?: {
    view?: number;
    save?: number;
    like?: number;
    avgAdultRating?: number | null;
    avgChildRating?: number | null;
    ratingCount?: number;
    commentCount?: number;
  };
  author?: { id: string; nickname: string; avatar?: string | null };
}

/** 攻略详情 JSON-LD：Article + BreadcrumbList */
export function buildGuideJsonLd(g: GuideJsonLdData): object[] {
  const url = `${BASE}/guides/${g.id}`;
  const cleanText = (g.contentHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = cleanText.length;

  const article: any = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: g.title,
    description: `${g.city?.name || ''} ${g.days ? g.days + ' 天' : ''}亲子攻略`.trim(),
    image: g.coverImages?.[0] ? [g.coverImages[0]] : undefined,
    datePublished: g.publishedAt || g.createdAt,
    dateModified: g.publishedAt || g.createdAt,
    author: {
      '@type': 'Person',
      name: g.author?.nickname || '匿名家长',
      url: g.author?.id ? `${BASE}/author/${g.author.id}` : undefined,
    },
    publisher: {
      '@type': 'Organization',
      name: '童慧行走天下',
      url: BASE,
      logo: { '@type': 'ImageObject', url: `${BASE}/og-cover.svg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleBody: cleanText.slice(0, 5000),
    wordCount,
    inLanguage: 'zh-CN',
  };

  if (g.stats?.avgAdultRating != null || g.stats?.avgChildRating != null) {
    const ar: any = { '@type': 'AggregateRating', reviewCount: g.stats.ratingCount ?? 0, bestRating: 5, worstRating: 1 };
    if (g.stats.avgAdultRating != null) ar.ratingValue = g.stats.avgAdultRating.toFixed(1);
    article.aggregateRating = ar;
  }

  if (Array.isArray(g.tags) && g.tags.length > 0) {
    article.keywords = g.tags.join(',');
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '走天下', item: BASE },
      { '@type': 'ListItem', position: 2, name: '攻略', item: `${BASE}/guides` },
      ...(g.city ? [{ '@type': 'ListItem', position: 3, name: g.city.name, item: `${BASE}/guides?city=${encodeURIComponent(g.city.name)}` }] : []),
      { '@type': 'ListItem', position: g.city ? 4 : 3, name: g.title, item: url },
    ],
  };

  return [article, breadcrumb];
}

export interface PlaceJsonLdData {
  id: string;
  name: string;
  description?: string;
  coverImages?: string[];
  city?: { id: string; name: string } | null;
  address?: string;
  openHours?: string;
  ticketPrice?: string;
  phone?: string;
  officialSite?: string;
  spotType?: string;
  recommendedMonths?: number[];
  durationMinutes?: number | null;
  aggregate?: {
    adultAvgScore?: number | null;
    kidAvgScore?: number | null;
    reviewCount?: number;
    withChildRatingCount?: number;
    parkingRate?: number | null;
    highChairRate?: number | null;
    napRoomRate?: number | null;
    strollerOkRate?: number | null;
    kidFriendlyAvg?: number | null;
  };
  kidScore?: number | null;
  momScore?: number | null;
}

/** 景点详情 JSON-LD：TouristAttraction + AggregateRating + BreadcrumbList */
export function buildPlaceJsonLd(p: PlaceJsonLdData, type: string): object[] {
  const url = `${BASE}/place/${type}/${p.id}`;
  const cityName = p.city?.name;

  // amenityFeature（按 aggregate 字段构造）
  const amenity: any[] = [];
  if (p.aggregate?.parkingRate != null) amenity.push({ '@type': 'LocationFeatureSpecification', name: '停车场', value: p.aggregate.parkingRate >= 0.5 });
  if (p.aggregate?.napRoomRate != null) amenity.push({ '@type': 'LocationFeatureSpecification', name: '母婴室', value: p.aggregate.napRoomRate >= 0.3 });
  if (p.aggregate?.highChairRate != null) amenity.push({ '@type': 'LocationFeatureSpecification', name: '宝宝椅', value: p.aggregate.highChairRate >= 0.3 });
  if (p.aggregate?.strollerOkRate != null) amenity.push({ '@type': 'LocationFeatureSpecification', name: '婴儿车友好', value: p.aggregate.strollerOkRate >= 0.5 });

  const attraction: any = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: p.name,
    description: p.description || `${cityName || ''}亲子景点，含双维度评分与孩子真实反馈`.trim(),
    url,
    image: p.coverImages?.[0],
    address: cityName || p.address ? {
      '@type': 'PostalAddress',
      addressLocality: cityName,
      streetAddress: p.address,
      addressCountry: 'CN',
    } : undefined,
    telephone: p.phone,
    openingHours: p.openHours,
    publicAccess: true,
    amenityFeature: amenity.length > 0 ? amenity : undefined,
    inLanguage: 'zh-CN',
  };

  // 双维度评分：大人用 AggregateRating，孩子用 additionalProperty
  if (p.aggregate?.adultAvgScore != null) {
    attraction.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.aggregate.adultAvgScore.toFixed(1),
      reviewCount: p.aggregate.reviewCount ?? 0,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (p.aggregate?.kidAvgScore != null) {
    attraction.additionalProperty = [
      {
        '@type': 'PropertyValue',
        name: '孩子评分',
        value: p.aggregate.kidAvgScore.toFixed(1),
        minValue: 1,
        maxValue: 5,
        description: `${p.aggregate.withChildRatingCount ?? 0} 条 3-12 岁孩子真实反馈均值`,
      },
    ];
    if (p.aggregate.kidFriendlyAvg != null) {
      attraction.additionalProperty.push({
        '@type': 'PropertyValue',
        name: '综合亲子友好度',
        value: p.aggregate.kidFriendlyAvg.toFixed(1),
        minValue: 1,
        maxValue: 5,
      });
    }
  }

  // 推荐季节作为 additionalProperty
  if (Array.isArray(p.recommendedMonths) && p.recommendedMonths.length > 0) {
    const m = p.recommendedMonths;
    let seasonLabel = '全年推荐';
    if (m.length === 12) seasonLabel = '全年推荐';
    else if (m.length >= 10) seasonLabel = '四季皆宜';
    else if (m.every(x => [6, 7, 8].includes(x))) seasonLabel = '夏季推荐';
    else if (m.every(x => [12, 1, 2].includes(x))) seasonLabel = '冬季推荐';
    else if (m.length >= 3) seasonLabel = `${m.length} 个月推荐`;

    attraction.additionalProperty = [
      ...(attraction.additionalProperty || []),
      {
        '@type': 'PropertyValue',
        name: '推荐季节',
        value: seasonLabel,
        description: `推荐月份：${m.sort((a, b) => a - b).join('、')}月`,
      },
    ];
  }

  // 游玩时长
  if (p.durationMinutes != null) {
    attraction.additionalProperty = [
      ...(attraction.additionalProperty || []),
      {
        '@type': 'PropertyValue',
        name: '推荐游玩时长',
        value: p.durationMinutes < 60
          ? `${p.durationMinutes} 分钟`
          : `${Math.floor(p.durationMinutes / 60)} 小时${p.durationMinutes % 60 ? ` ${p.durationMinutes % 60} 分钟` : ''}`,
      },
    ];
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '走天下', item: BASE },
      { '@type': 'ListItem', position: 2, name: '亲子宝典', item: `${BASE}/places` },
      ...(cityName ? [{ '@type': 'ListItem', position: 3, name: cityName, item: `${BASE}/places?city=${encodeURIComponent(cityName)}` }] : []),
      { '@type': 'ListItem', position: cityName ? 4 : 3, name: p.name, item: url },
    ],
  };

  return [attraction, breadcrumb];
}

/** 通用 Organization schema（About 页 / 站点级别） */
export const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '童慧行',
  alternateName: ['Haodaer', 'GrandKidsGo'],
  url: 'https://grandand.com',
  logo: { '@type': 'ImageObject', url: 'https://grandand.com/og-cover.svg' },
  description: '童慧行是儿童益智乐园与亲子旅行攻略平台，核心理念：「孩子说好才是真的好」。',
  foundingDate: '2024-01',
  areaServed: { '@type': 'Country', name: '中国大陆' },
  knowsAbout: ['儿童学习', '亲子旅行', '古诗词', '国学', '英语启蒙', '通识教育'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'team@grandand.com',
    availableLanguage: ['zh-Hans'],
  },
  sameAs: [
    'https://grandand.com',
    'https://travel.grandand.com',
    'https://xueshici.grandand.com',
    'https://xueguoxue.grandand.com',
    'https://xuetongshi.grandand.com',
    'https://english.grandand.com',
    'https://tiaozhan.grandand.com',
    'https://forum.grandand.com',
    'https://store.grandand.com',
  ],
  inLanguage: 'zh-CN',
};

/** 走天下子站 Organization（用于 travel-guide About 页） */
export const TRAVEL_ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '童慧行走天下',
  url: BASE,
  parentOrganization: { '@type': 'Organization', name: '童慧行', url: 'https://grandand.com' },
  logo: { '@type': 'ImageObject', url: `${BASE}/og-cover.svg` },
  description: '童慧行走天下是亲子旅行攻略平台，覆盖 50+ 城市、1500+ 景点、5000+ 3-12 岁孩子真实反馈。',
  areaServed: { '@type': 'Country', name: '中国大陆' },
  knowsAbout: ['亲子旅行', '亲子景点', '儿童反馈', '母婴设施'],
  inLanguage: 'zh-CN',
};
