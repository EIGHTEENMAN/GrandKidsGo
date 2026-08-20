// GEO: 攻略详情页 metadata（服务端组件，对 SEO/AI 引擎可见）
// 客户端组件 page.tsx 无法直接导出 metadata，必须放在独立的 server 文件
import type { Metadata } from 'next';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  let title = '亲子攻略 - 童慧行走天下';
  let description = '真实家长撰写的亲子旅行攻略，含双维度评分（大人分 vs 孩子分）、孩子最怕预警、避坑提醒。';
  let ogImage = 'https://travel.grandand.com/og-cover.svg';
  let keywords = ['亲子旅行', '亲子攻略', '走天下', '童慧行', '真实家长攻略'];

  try {
    const res = await fetch(`${TRAVEL_API}/api/guides/${params.id}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const json = await res.json();
      const g = json.data;
      if (g?.title) {
        const cityName = g.city?.name || '';
        const days = g.days ? `${g.days} 天` : '';
        const childRating = g.stats?.avgChildRating ? `孩子评分 ${g.stats.avgChildRating.toFixed(1)}/5` : '';
        const adultRating = g.stats?.avgAdultRating ? `大人评分 ${g.stats.avgAdultRating.toFixed(1)}/5` : '';
        title = `${g.title} - 童慧行走天下`;
        description = [
          cityName ? `${cityName}` : '',
          days,
          childRating,
          adultRating,
          '真实家庭体验 · 童慧行走天下',
        ].filter(Boolean).join(' · ');
        if (g.coverImages?.[0]) ogImage = g.coverImages[0];
        if (Array.isArray(g.tags) && g.tags.length > 0) {
          keywords = [...keywords, ...g.tags.slice(0, 5)];
        }
        if (Array.isArray(g.childAges) && g.childAges.length > 0) {
          keywords.push(`${g.childAges.join('/')}岁亲子`);
        }
      }
    }
  } catch {
    /* 兜底用默认 */
  }

  const url = `https://travel.grandand.com/guides/${params.id}`;
  return {
    title,
    description,
    keywords: [...new Set(keywords)],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: '童慧行走天下',
      locale: 'zh_CN',
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    robots: { index: true, follow: true },
  };
}
