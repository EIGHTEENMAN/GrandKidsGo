// GEO: 地点详情页 metadata（服务端组件）
import type { Metadata } from 'next';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

export async function generateMetadata({ params }: { params: { type: string; id: string } }): Promise<Metadata> {
  const { type, id } = params;
  const title = '亲子景点 - 童慧行走天下';
  let description = `${type} 类型景点，含双维度评分（大人 vs 孩子）、便利设施（母婴室/停车/婴儿车）、孩子真实反馈、相关古诗与攻略。`;
  let ogImage = 'https://travel.grandand.com/og-cover.svg';
  let keywords = ['亲子景点', '走天下', '童慧行', '儿童景点', '亲子旅行'];

  try {
    const res = await fetch(`${TRAVEL_API}/api/places/${type}/${id}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const json = await res.json();
      const place = json.data?.place;
      const stats = json.data?.stats;
      const aggregate = json.data?.aggregate;
      if (place?.name) {
        const cityName = place.city?.name || '';
        const adultScore = aggregate?.adultAvgScore ?? stats?.adultAvg;
        const kidScore = aggregate?.kidAvgScore ?? stats?.childAvg;
        const titleParts = [place.name, cityName ? `（${cityName}）` : '', '亲子景点'];
        const descParts: string[] = [];
        if (cityName) descParts.push(cityName);
        if (place.recommendedMonths?.length) {
          const m = place.recommendedMonths;
          if (m.length >= 10) descParts.push('四季皆宜');
          else if (m.length === 12) descParts.push('全年推荐');
        }
        if (adultScore != null) descParts.push(`大人 ${adultScore.toFixed(1)}/5`);
        if (kidScore != null) descParts.push(`孩子 ${kidScore.toFixed(1)}/5`);
        descParts.push('真实家长评价 · 童慧行走天下');

        return {
          title: `${titleParts.filter(Boolean).join(' ')} - 童慧行走天下`,
          description: descParts.join(' · '),
          keywords: [...new Set([...keywords, place.name, cityName, type])],
          alternates: { canonical: `https://travel.grandand.com/place/${type}/${id}` },
          openGraph: {
            title: `${place.name} - 童慧行走天下`,
            description: descParts.join(' · '),
            url: `https://travel.grandand.com/place/${type}/${id}`,
            siteName: '童慧行走天下',
            locale: 'zh_CN',
            type: 'place',
            images: [{ url: place.coverImages?.[0] || ogImage, width: 1200, height: 630, alt: place.name }],
          },
          twitter: { card: 'summary_large_image', title: place.name, description: descParts.join(' · '), images: [place.coverImages?.[0] || ogImage] },
          robots: { index: true, follow: true },
        };
      }
    }
  } catch { /* 兜底用默认 */ }

  return {
    title,
    description,
    keywords: [...new Set(keywords)],
    alternates: { canonical: `https://travel.grandand.com/place/${type}/${id}` },
    openGraph: {
      title, description, url: `https://travel.grandand.com/place/${type}/${id}`,
      siteName: '童慧行走天下', locale: 'zh_CN', type: 'place',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    robots: { index: true, follow: true },
  };
}
