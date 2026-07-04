import prisma from '@/lib/prisma';

const BASE_URL = 'https://travel.grandand.com';

export default async function sitemap() {
  let guideEntries: { url: string; lastModified: Date; changeFrequency: 'weekly'; priority: number }[] = [];
  try {
    const guides = await prisma.guide.findMany({
      where: { isPublish: true },
      select: { id: true, updatedAt: true },
    });
    guideEntries = guides.map((g) => ({
      url: `${BASE_URL}/guides/${g.id}`,
      lastModified: g.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable during build (local dev), falls back to static entries
  }

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/legal/privacy`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.2 },
    { url: `${BASE_URL}/legal/terms`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.2 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${BASE_URL}/checkin`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/gallery`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/kidsays`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/challenges`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/votes`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    ...guideEntries,
  ];
}
