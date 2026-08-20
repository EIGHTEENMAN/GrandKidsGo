// GEO: 童慧行走天下·亲子游年度白皮书 2026
// 数据驱动页面：读 /data/whitepaper-2026.json 渲染
// 注入 Report + Dataset JSON-LD
import Link from 'next/link';
import { SparklesIcon, TrophyIcon, MapPinIcon, StarIcon } from '@/components/Icons';
import { TRAVEL_ORGANIZATION_JSONLD } from '@/lib/jsonld';

export const metadata = {
  title: '亲子游年度白皮书 2026 - 童慧行走天下',
  description: '童慧行走天下基于 5000+ 条真实家庭反馈数据，发布 2026 年亲子游年度白皮书。涵盖孩子评分 TOP 20、大人评分 TOP 20、母婴设施完备度 TOP 10、城市热度 TOP 20 等独家数据。',
  keywords: ['亲子游', '白皮书', '年度数据', '孩子反馈', '母婴设施', '童慧行走天下'],
  alternates: { canonical: 'https://travel.grandand.com/whitepaper/2026' },
  openGraph: {
    title: '亲子游年度白皮书 2026',
    description: '基于 5000+ 条真实家庭反馈的亲子游独家数据报告',
    url: 'https://travel.grandand.com/whitepaper/2026',
    siteName: '童慧行走天下',
    locale: 'zh_CN',
    type: 'article',
    images: [{ url: 'https://travel.grandand.com/og-cover.svg', width: 1200, height: 630, alt: '亲子游年度白皮书 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '亲子游年度白皮书 2026', description: '基于 5000+ 条真实家庭反馈的亲子游独家数据报告', images: ['https://travel.grandand.com/og-cover.svg'] },
};

async function loadWhitepaper() {
  // 服务端读 public/data/whitepaper-2026.json
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', 'data', 'whitepaper-2026.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export default async function Whitepaper2026Page() {
  const data = await loadWhitepaper();
  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <p className="text-gray-500">白皮书数据暂未生成</p>
          <p className="text-sm text-gray-400 mt-2">请先运行：<code>npx tsx scripts/generate-whitepaper.ts</code></p>
        </div>
      </main>
    );
  }

  // GEO: 白皮书页面 JSON-LD（Report + Dataset）
  const reportJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Report',
    name: data.title,
    description: `基于 ${data.summary.total_reviews} 条真实家庭反馈的亲子游年度白皮书`,
    url: 'https://travel.grandand.com/whitepaper/2026',
    datePublished: data.asOf,
    inLanguage: 'zh-CN',
    publisher: TRAVEL_ORGANIZATION_JSONLD,
    isPartOf: {
      '@type': 'CreativeWork',
      name: '童慧行走天下年度数据报告',
    },
  };

  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: '童慧行·亲子游年度白皮书数据集 2026',
    description: '包含孩子评分 TOP 20、大人评分 TOP 20、城市热度 TOP 20、母婴设施完备度 TOP 10 等聚合指标。',
    url: 'https://travel.grandand.com/data/whitepaper-2026.json',
    creator: { '@type': 'Organization', name: '童慧行走天下', url: 'https://travel.grandand.com' },
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
    temporalCoverage: data.coverage,
    spatialCoverage: { '@type': 'Country', name: '中国大陆' },
    distribution: { '@type': 'DataDownload', contentUrl: 'https://travel.grandand.com/data/whitepaper-2026.json', encodingFormat: 'application/json' },
    size: String(data.summary.total_reviews + data.summary.total_child_sayings),
    dateModified: data.asOf,
    inLanguage: 'zh-CN',
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50 pb-12">
      {/* GEO: Report + Dataset JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />

      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium mb-4">
              <SparklesIcon size={12} /> 2026 年度白皮书
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold">亲子游年度白皮书 2026</h1>
            <p className="mt-3 text-blue-100 text-sm md:text-base max-w-3xl">
              基于 <strong>{data.summary.total_reviews.toLocaleString()}</strong> 条真实家庭评价、
              <strong>{data.summary.total_child_sayings.toLocaleString()}</strong> 条孩子真实反馈、
              覆盖 <strong>{data.summary.total_places.toLocaleString()}</strong> 个景点、
              <strong>{data.summary.total_cities}</strong> 座城市的独家亲子游数据报告。
            </p>
            <div className="mt-4 text-xs text-blue-100">
              数据周期：{data.coverage} · 最后更新：{data.asOf}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        {/* ① 孩子评分 TOP 20 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <TrophyIcon size={20} className="text-amber-500" /> 孩子评分 TOP 20 景点
          </h2>
          <p className="text-sm text-gray-500 mb-4">由 3-12 岁孩子的真实反馈评分排序（评价数 ≥ 5）</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.top_by_kid_rating.map(item => (
              <Link key={item.place} href={`/places?city=${encodeURIComponent(item.city ?? '')}`}
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl hover:shadow-md transition">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-500 text-white font-bold text-sm flex-shrink-0">
                  {item.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{item.place}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPinIcon size={10} /> {item.city} · 孩子 {item.kid_score}/5 · 大人 {item.adult_score}/5
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ② 大人评分 TOP 20 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <StarIcon size={20} className="text-blue-500" /> 大人评分 TOP 20 景点
          </h2>
          <p className="text-sm text-gray-500 mb-4">由真实家长的实际体验评分排序（评价数 ≥ 5）</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.top_by_adult_rating.map(item => (
              <div key={item.place} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-500 text-white font-bold text-sm flex-shrink-0">
                  {item.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{item.place}</div>
                  <div className="text-xs text-gray-500">
                    {item.city} · 大人 {item.adult_score}/5 · 孩子 {item.kid_score}/5
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ③ 母婴设施完备度 TOP 10 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            🍼 母婴设施完备度 TOP 10
          </h2>
          <p className="text-sm text-gray-500 mb-4">综合亲子友好度评分（停车 / 母婴室 / 宝宝椅 / 婴儿车友好）</p>
          <div className="space-y-3">
            {data.top_facilities.map(item => (
              <div key={item.place} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500 text-white font-bold text-sm flex-shrink-0">
                  {item.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{item.place}</div>
                  <div className="text-xs text-gray-500">
                    {item.city} ·
                    {item.parking_rate && <span className="ml-1">🚗 {item.parking_rate}</span>}
                    {item.nap_room_rate && <span className="ml-1">🚼 {item.nap_room_rate}</span>}
                    {item.high_chair_rate && <span className="ml-1">🪑 {item.high_chair_rate}</span>}
                    {item.stroller_ok_rate && <span className="ml-1">👶 {item.stroller_ok_rate}</span>}
                  </div>
                </div>
                <div className="text-emerald-700 font-bold text-lg">{item.kid_friendly_avg}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ④ 城市热度 TOP 20 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <MapPinIcon size={20} className="text-blue-500" /> 城市热度 TOP 20
          </h2>
          <p className="text-sm text-gray-500 mb-4">按收录景点数排序（适合亲子游目的地推荐）</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {data.city_heatmap.map((item: any, i: number) => (
              <Link key={item.city} href={`/places?city=${encodeURIComponent(item.city)}`}
                className="p-3 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl hover:shadow-md transition text-center">
                <div className="text-xs text-blue-600 font-medium">{i + 1}</div>
                <div className="font-bold text-gray-900 mt-1">{item.city}</div>
                <div className="text-xs text-gray-500 mt-1">{item.place_count} 个景点</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ⑤ 数据下载 */}
        <section className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">📦 数据下载</h2>
          <p className="text-sm text-gray-600 mb-4">所有数据严格遵循《未成年人保护法》，已去标识化处理，可免费下载用于学术研究、媒体引用、二次开发（非商业）。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a href="/data/whitepaper-2026.json" className="flex items-center gap-2 p-3 bg-white rounded-xl border border-blue-200 hover:shadow-md transition">
              <span>📊</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">白皮书 JSON 数据</div>
                <div className="text-xs text-gray-500">whitepaper-2026.json</div>
              </div>
            </a>
            <a href="/data/kids-feedback-2026.csv" className="flex items-center gap-2 p-3 bg-white rounded-xl border border-blue-200 hover:shadow-md transition">
              <span>📋</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">孩子真实反馈 CSV</div>
                <div className="text-xs text-gray-500">kids-feedback-2026.csv</div>
              </div>
            </a>
            <a href="/data/baby-friendly-facilities-2026.csv" className="flex items-center gap-2 p-3 bg-white rounded-xl border border-blue-200 hover:shadow-md transition">
              <span>🍼</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">母婴设施地图 CSV</div>
                <div className="text-xs text-gray-500">baby-friendly-facilities-2026.csv</div>
              </div>
            </a>
            <Link href="/about" className="flex items-center gap-2 p-3 bg-white rounded-xl border border-blue-200 hover:shadow-md transition">
              <span>📖</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">数据来源说明</div>
                <div className="text-xs text-gray-500">关于童慧行走天下</div>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
