// GEO: 行程计划详情页 metadata（服务端组件）
import type { Metadata } from 'next';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const title = '亲子行程计划 - 童慧行走天下';
  const description = '个性化亲子行程计划，每日时间表 + 孩子专题 + 推车友好度。';
  const ogImage = 'https://travel.grandand.com/og-cover.svg';
  const url = `https://travel.grandand.com/plan/${params.id}`;

  return {
    title,
    description,
    keywords: ['亲子行程', '行程计划', '走天下', '童慧行', '家庭旅行'],
    alternates: { canonical: url },
    openGraph: {
      title, description, url,
      siteName: '童慧行走天下', locale: 'zh_CN', type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    robots: { index: false, follow: false }, // 行程计划是私人的，不应被 AI 索引
  };
}
