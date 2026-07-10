/**
 * GEO: JSON-LD 结构化数据注入
 * 各 app 在适当位置调用 injectXxxSchema
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
