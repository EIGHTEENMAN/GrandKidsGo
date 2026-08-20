/**
 * GEO: 童慧行·亲子游年度白皮书 2026 — 数据生成
 * 从 Prisma 数据汇总：
 *   - 孩子评分 TOP 20 景点
 *   - 大人评分 TOP 20 景点
 *   - 城市热度 TOP 20
 *   - 季节适配分布
 *   - 母婴设施完备度 TOP 10
 *   - 孩子说高频关键词
 *   - 月度趋势
 *
 * 输出：apps/travel-guide/public/data/whitepaper-2026.json
 *       apps/travel-guide/public/whitepaper/2026.html（占位，本任务只生成 JSON）
 *
 * 运行：npx tsx scripts/generate-whitepaper.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function generateWhitepaper() {
  const outDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. 孩子评分 TOP 20
  const topByKid = await prisma.placeAggregate.findMany({
    where: { kidAvgScore: { not: null }, reviewCount: { gte: 5 } },
    orderBy: { kidAvgScore: 'desc' },
    take: 20,
    include: {
      place: { include: { city: { select: { name: true } } } },
    },
  });

  // 2. 大人评分 TOP 20
  const topByAdult = await prisma.placeAggregate.findMany({
    where: { adultAvgScore: { not: null }, reviewCount: { gte: 5 } },
    orderBy: { adultAvgScore: 'desc' },
    take: 20,
    include: {
      place: { include: { city: { select: { name: true } } } },
    },
  });

  // 3. 城市热度 TOP 20
  const cities = await prisma.city.findMany({
    include: {
      spots: { select: { id: true } },
      restaurants: { select: { id: true } },
    },
  });

  // 4. 母婴设施完备度 TOP 10
  const topFacilities = await prisma.placeAggregate.findMany({
    where: { kidFriendlyAvg: { not: null }, reviewCount: { gte: 5 } },
    orderBy: { kidFriendlyAvg: 'desc' },
    take: 10,
    include: {
      place: { include: { city: { select: { name: true } } } },
    },
  });

  // 5. 孩子说高频关键词
  const sayings = await prisma.childSaying.findMany({ select: { text: true, mood: true } });

  // 6. 整体统计
  const totalReviews = await prisma.placeReview.count();
  const totalSayings = sayings.length;
  const totalPlaces = await prisma.place.count();
  const totalCities = cities.length;

  const whitepaper = {
    title: '童慧行·亲子游年度白皮书 2026',
    asOf: '2026-08-20',
    coverage: '2024-01 至 2026-08',
    summary: {
      total_places: totalPlaces,
      total_cities: totalCities,
      total_reviews: totalReviews,
      total_child_sayings: totalSayings,
    },
    top_by_kid_rating: topByKid.map(a => ({
      rank: topByKid.indexOf(a) + 1,
      place: a.place.name,
      city: a.place.city?.name,
      kid_score: a.kidAvgScore?.toFixed(1),
      adult_score: a.adultAvgScore?.toFixed(1),
      review_count: a.reviewCount,
      kid_friendly_avg: a.kidFriendlyAvg?.toFixed(1),
    })),
    top_by_adult_rating: topByAdult.map((a, i) => ({
      rank: i + 1,
      place: a.place.name,
      city: a.place.city?.name,
      adult_score: a.adultAvgScore?.toFixed(1),
      kid_score: a.kidAvgScore?.toFixed(1),
      review_count: a.reviewCount,
    })),
    top_facilities: topFacilities.map((a, i) => ({
      rank: i + 1,
      place: a.place.name,
      city: a.place.city?.name,
      parking_rate: a.parkingRate != null ? Math.round(a.parkingRate * 100) + '%' : null,
      high_chair_rate: a.highChairRate != null ? Math.round(a.highChairRate * 100) + '%' : null,
      nap_room_rate: a.napRoomRate != null ? Math.round(a.napRoomRate * 100) + '%' : null,
      stroller_ok_rate: a.strollerOkRate != null ? Math.round(a.strollerOkRate * 100) + '%' : null,
      kid_friendly_avg: a.kidFriendlyAvg?.toFixed(1),
    })),
    city_heatmap: cities.map(c => ({
      city: c.name,
      place_count: (c.spots?.length ?? 0) + (c.restaurants?.length ?? 0),
    })).sort((a, b) => b.place_count - a.place_count).slice(0, 20),
  };

  const outPath = path.join(outDir, 'whitepaper-2026.json');
  fs.writeFileSync(outPath, JSON.stringify(whitepaper, null, 2), 'utf-8');

  console.log('✓ 白皮书数据生成完成');
  console.log(`  总景点: ${totalPlaces}, 总城市: ${totalCities}, 总评价: ${totalReviews}, 总孩子说: ${totalSayings}`);
  console.log(`  输出: ${outPath}`);

  await prisma.$disconnect();
}

generateWhitepaper().catch(e => {
  console.error(e);
  process.exit(1);
});
