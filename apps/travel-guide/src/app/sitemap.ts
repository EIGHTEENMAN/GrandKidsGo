// GEO: 走天下 sitemap（动态生成）
import type { MetadataRoute } from 'next';

const BASE = 'https://travel.grandand.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = new Date().toISOString().slice(0, 10);

  // 静态页面
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: today, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/places`, lastModified: today, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/guides`, lastModified: today, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/leaderboard`, lastModified: today, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/faq`, lastModified: today, priority: 0.6 },
    { url: `${BASE}/about`, lastModified: today, priority: 0.6 },
    { url: `${BASE}/legal/privacy`, lastModified: today, priority: 0.3 },
    { url: `${BASE}/legal/terms`, lastModified: today, priority: 0.3 },
  ];

  return staticUrls;
}
