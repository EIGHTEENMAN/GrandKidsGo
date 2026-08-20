/**
 * GEO: JSON-LD 结构化数据注入
 * 各 app 在适当位置调用 injectXxxSchema
 * v1.1 — 2026-08-20 P1 扩展：Article / HowTo / TouristAttraction / Quiz / Product / BreadcrumbList / Organization
 */

const SCHEMA_ID = 'geo-jsonld'

function removeOld() {
  const old = document.getElementById(SCHEMA_ID)
  if (old) old.remove()
}

function inject(data: object) {
  removeOld()
  const script = document.createElement('script')
  script.id = SCHEMA_ID
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

/** 注入多组 schema（互不覆盖，用 geo-jsonld-0 / geo-jsonld-1 ... 区分） */
function injectMany(items: object[]) {
  // 清理旧的所有 geo-jsonld-* 节点
  document.querySelectorAll('[id^="geo-jsonld-"]').forEach(el => el.remove())
  items.forEach((data, i) => {
    const script = document.createElement('script')
    script.id = `geo-jsonld-${i}`
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(data)
    document.head.appendChild(script)
  })
}

/** 首页 WebSite schema */
export function injectWebSite(name: string, desc: string, url: string) {
  inject({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    description: desc,
    inLanguage: 'zh-CN',
  })
}

/** 学习资源 schema（学诗词/学国学/学通识 共享） */
export function injectLearningResource(props: {
  name: string
  description: string
  author?: string
  url: string
  type?: string   // 'poem' | 'classic' | 'topic' | 'word'
  dynasty?: string
}) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: props.name,
    description: props.description,
    inLanguage: 'zh-CN',
    educationalLevel: 'beginner',
    learningResourceType: props.type || 'learning',
    url: props.url,
  }
  if (props.author) {
    schema.author = { '@type': 'Person', name: props.author }
  }
  if (props.dynasty) {
    schema.teaches = [`${props.dynasty}文学作品`]
  }
  inject(schema)
}

/** FAQ schema（main-site FAQ 页） */
export function injectFAQ(questions: { q: string; a: string }[]) {
  inject({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  })
}

/** ============================================
 * P1 新增 schema（2026-08-20）
 * ============================================ */

/** Organization schema（站点 / 品牌 / 编辑部实体） */
export function injectOrganization(props: {
  name: string
  url: string
  logo: string
  description: string
  sameAs?: string[]          // 微信公众号 / 微博 / 小红书 / 抖音 等
  foundingDate?: string      // YYYY-MM
  areaServed?: string        // '中国大陆' | 'CN'
  knowsAbout?: string[]      // 站点主题领域
  contactEmail?: string
}) {
  inject({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: props.name,
    url: props.url,
    logo: { '@type': 'ImageObject', url: props.logo },
    description: props.description,
    foundingDate: props.foundingDate,
    areaServed: props.areaServed || '中国大陆',
    knowsAbout: props.knowsAbout,
    contactPoint: props.contactEmail ? {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: props.contactEmail,
      availableLanguage: ['zh-Hans'],
    } : undefined,
    sameAs: props.sameAs,
    inLanguage: 'zh-CN',
  })
}

/** Article schema（攻略 / 博客 / 内容页通用） */
export function injectArticle(props: {
  headline: string
  description: string
  image?: string
  datePublished?: string    // ISO 8601
  dateModified?: string
  authorName: string
  authorUrl?: string
  url: string
  publisherName?: string
  publisherLogo?: string
  keywords?: string[]
  articleBody?: string      // 长文本（可选，>200 字）
  wordCount?: number
}) {
  inject({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: props.headline,
    description: props.description,
    image: props.image ? [props.image] : undefined,
    datePublished: props.datePublished,
    dateModified: props.dateModified || props.datePublished,
    author: {
      '@type': 'Person',
      name: props.authorName,
      url: props.authorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: props.publisherName || '童慧行走天下',
      logo: props.publisherLogo ? { '@type': 'ImageObject', url: props.publisherLogo } : { '@type': 'ImageObject', url: 'https://travel.grandand.com/og-cover.svg' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': props.url },
    keywords: props.keywords?.join(','),
    articleBody: props.articleBody,
    wordCount: props.wordCount,
    inLanguage: 'zh-CN',
  })
}

/** HowTo schema（步骤化内容：怎么背诗 / 怎么去景点） */
export function injectHowTo(props: {
  name: string
  description: string
  steps: Array<{ name: string; text: string; image?: string }>
  totalTime?: string        // ISO 8601 Duration, e.g. 'PT5M'
  tool?: string[]
  url: string
}) {
  inject({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: props.name,
    description: props.description,
    totalTime: props.totalTime,
    tool: props.tool?.map(t => ({ '@type': 'HowToTool', name: t })),
    step: props.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      image: s.image,
    })),
    url: props.url,
    inLanguage: 'zh-CN',
  })
}

/** TouristAttraction schema（景点详情） */
export function injectTouristAttraction(props: {
  name: string
  description: string
  url: string
  image?: string
  city?: string
  address?: string
  geo?: { lat: number; lng: number }
  aggregateRating?: {
    adultAvg: number | null   // 1-5
    kidAvg: number | null     // 1-5
    reviewCount: number
    withChildRatingCount?: number
  }
  amenityFeature?: Array<{ name: string; available: boolean; rate?: number }>
  openingHours?: string
  telephone?: string
  publicAccess?: boolean
  isAccessibleForFree?: boolean
}) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: props.name,
    description: props.description,
    url: props.url,
    image: props.image,
    address: props.city || props.address ? {
      '@type': 'PostalAddress',
      addressLocality: props.city,
      streetAddress: props.address,
      addressCountry: 'CN',
    } : undefined,
    geo: props.geo ? {
      '@type': 'GeoCoordinates',
      latitude: props.geo.lat,
      longitude: props.geo.lng,
    } : undefined,
    publicAccess: props.publicAccess ?? true,
    isAccessibleForFree: props.isAccessibleForFree,
    telephone: props.telephone,
    openingHours: props.openingHours,
    inLanguage: 'zh-CN',
  }

  // 双维度评分（Schema.org AggregateRating 只支持一个 ratingValue，
  // 用两个 review 标记表示「大人」+「孩子」）
  if (props.aggregateRating) {
    const ar = props.aggregateRating
    if (ar.adultAvg != null) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: ar.adultAvg.toFixed(1),
        reviewCount: ar.reviewCount,
        bestRating: 5,
        worstRating: 1,
        ratingExplanation: `${ar.reviewCount} 位家长的大人评分均值`,
      }
    }
    // 孩子评分作为「子评分」（用 additionalProperty 标记）
    if (ar.kidAvg != null) {
      schema.additionalProperty = [
        {
          '@type': 'PropertyValue',
          name: '孩子评分',
          value: ar.kidAvg.toFixed(1),
          minValue: 1,
          maxValue: 5,
          description: `${ar.withChildRatingCount ?? ar.reviewCount} 条孩子真实反馈均值`,
        },
      ]
    }
  }

  // 便利设施（停车/母婴室/宝宝椅/婴儿车）
  if (props.amenityFeature?.length) {
    schema.amenityFeature = props.amenityFeature
      .filter(a => a.available)
      .map(a => ({
        '@type': 'LocationFeatureSpecification',
        name: a.name,
        value: a.rate != null ? `${Math.round(a.rate * 100)}% 家庭确认` : true,
      }))
  }

  inject(schema)
}

/** Quiz schema（题目聚合） */
export function injectQuiz(props: {
  name: string
  description: string
  url: string
  about?: string              // 学科：诗词 / 英语 / 通识
  educationalLevel?: string   // 'beginner' | 'intermediate' | 'advanced'
  questions: Array<{
    text: string
    answerText: string
    difficulty?: 'easy' | 'medium' | 'hard'
  }>
  providerName?: string
}) {
  inject({
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: props.name,
    description: props.description,
    url: props.url,
    about: props.about,
    educationalLevel: props.educationalLevel || 'beginner',
    hasPart: props.questions.slice(0, 20).map((q, i) => ({
      '@type': 'Question',
      position: i + 1,
      text: q.text,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answerText,
      },
      educationalLevel: q.difficulty,
    })),
    provider: {
      '@type': 'Organization',
      name: props.providerName || '童慧行来挑战',
      url: 'https://tiaozhan.grandand.com',
    },
    inLanguage: 'zh-CN',
  })
}

/** Product schema（商城商品） */
export function injectProduct(props: {
  name: string
  description: string
  image?: string
  url: string
  sku?: string
  brandName?: string
  priceCoins: number         // 金币价
  priceRmb?: number          // 现金价（若有）
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
  ratingValue?: number
  reviewCount?: number
  category?: string
}) {
  const offers: any = {
    '@type': 'Offer',
    priceCurrency: 'COIN',           // 虚拟币
    price: props.priceCoins,
    availability: props.availability
      ? `https://schema.org/${props.availability}`
      : 'https://schema.org/InStock',
    url: props.url,
    seller: { '@type': 'Organization', name: '童慧行积分商城', url: 'https://store.grandand.com' },
  }
  if (props.priceRmb != null) {
    offers.priceSpecification = [
      { '@type': 'PriceSpecification', priceCurrency: 'COIN', price: props.priceCoins },
      { '@type': 'PriceSpecification', priceCurrency: 'CNY', price: props.priceRmb },
    ]
  }

  inject({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: props.name,
    description: props.description,
    image: props.image,
    url: props.url,
    sku: props.sku,
    brand: props.brandName ? { '@type': 'Brand', name: props.brandName } : undefined,
    category: props.category,
    aggregateRating: props.ratingValue != null ? {
      '@type': 'AggregateRating',
      ratingValue: props.ratingValue,
      reviewCount: props.reviewCount ?? 0,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    offers,
    inLanguage: 'zh-CN',
  })
}

/** BreadcrumbList schema（层级路径） */
export function injectBreadcrumb(items: Array<{ name: string; url: string }>) {
  inject({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  })
}

/** 一次注入多组 schema（攻略页同时是 Article + BreadcrumbList 等） */
export function injectMultiSchema(items: object[]) {
  injectMany(items)
}

/** Dataset schema（独家数据资产） */
export function injectDataset(props: {
  name: string
  description: string
  url: string
  creatorName?: string
  creatorUrl?: string
  keywords?: string[]
  license?: string             // 'https://creativecommons.org/licenses/by-nc/4.0/'
  temporalCoverage?: string    // '2024-01/2026-08'
  spatialCoverage?: string     // '中国大陆'
  distribution?: { contentUrl: string; encodingFormat: string }
  variableMeasured?: string[]
  size?: number | string
  dateModified?: string
}) {
  inject({
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: props.name,
    description: props.description,
    url: props.url,
    creator: props.creatorName ? {
      '@type': 'Organization',
      name: props.creatorName,
      url: props.creatorUrl || 'https://grandand.com',
    } : undefined,
    keywords: props.keywords?.join(','),
    license: props.license,
    temporalCoverage: props.temporalCoverage,
    spatialCoverage: props.spatialCoverage ? {
      '@type': 'Place',
      name: props.spatialCoverage,
    } : undefined,
    distribution: props.distribution ? {
      '@type': 'DataDownload',
      contentUrl: props.distribution.contentUrl,
      encodingFormat: props.distribution.encodingFormat,
    } : undefined,
    variableMeasured: props.variableMeasured,
    size: props.size != null ? String(props.size) : undefined,
    dateModified: props.dateModified,
    inLanguage: 'zh-CN',
  })
}
