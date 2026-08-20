/**
 * GEO: 童慧行·孩子真实反馈数据集 v1.0 — CSV 导出
 * 覆盖 PlaceAggregate（聚合）+ PlaceReview（家长评价）+ ChildSaying（孩子说）
 * 数据全部来自真实家庭反馈，去标识化处理
 *
 * 运行：npx tsx scripts/export-kids-feedback-csv.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CsvRow {
  city: string;
  spot_name: string;
  spot_type: string;
  adult_rating: number | null;
  kid_rating: number | null;
  child_age_months: number | null;
  has_parking: number | null;
  has_high_chair: number | null;
  has_nap_room: number | null;
  stroller_ok: number | null;
  review_text: string | null;
  review_date: string | null;
  child_saying: string | null;
  child_mood: string | null;
  review_count: number | null;
  city_review_count: number | null;
}

function csvEscape(s: string | null | undefined): string {
  if (s == null) return ''
  const str = String(s).replace(/\r?\n/g, ' ').trim()
  if (str.includes(',') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

async function exportKidsFeedbackCsv() {
  const outDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'kids-feedback-2026.csv');

  // 聚合：每个 place 一次
  const aggregates = await prisma.placeAggregate.findMany({
    include: {
      place: {
        include: {
          city: { select: { name: true } },
        },
      },
    },
  });

  // 所有评价（带关联 place）
  const reviews = await prisma.placeReview.findMany({
    include: {
      place: {
        include: {
          city: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  // 所有孩子说
  const childSayings = await prisma.childSaying.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });

  // 构建 placeId → 聚合 map
  const aggMap = new Map<string, typeof aggregates[number]>();
  for (const a of aggregates) aggMap.set(a.placeId, a);

  // 构建 placeId → 孩子说 列表
  const sayingMap = new Map<string, Array<{ text: string; mood: string | null; createdAt: Date }>>();
  for (const s of childSayings) {
    if (!sayingMap.has(s.spotId)) sayingMap.set(s.spotId, []);
    sayingMap.get(s.spotId)!.push({ text: s.text, mood: s.mood, createdAt: s.createdAt });
  }

  // 构建 placeId → review_count map（用于冗余字段）
  const reviewCountMap = new Map<string, number>();
  for (const r of reviews) {
    reviewCountMap.set(r.placeId, (reviewCountMap.get(r.placeId) ?? 0) + 1);
  }

  const rows: CsvRow[] = [];

  // 主行：每个评价 + 关联聚合 + 关联孩子说（取首条）
  for (const r of reviews) {
    const place = r.place;
    const city = place.city?.name ?? '';
    const agg = aggMap.get(r.placeId);
    const sayings = sayingMap.get(r.placeId);
    const firstSaying = sayings?.[0];

    rows.push({
      city,
      spot_name: place.name,
      spot_type: place.spotType ?? '',
      adult_rating: r.adultRating,
      kid_rating: r.childRating ?? null,
      child_age_months: r.childAgeMonths ?? null,
      has_parking: r.hasParking ? 1 : 0,
      has_high_chair: r.hasHighChair ? 1 : 0,
      has_nap_room: r.hasNapRoom ? 1 : 0,
      stroller_ok: r.strollerOk ? 1 : 0,
      review_text: r.text ?? null,
      review_date: r.createdAt.toISOString().slice(0, 10),
      child_saying: firstSaying?.text ?? null,
      child_mood: firstSaying?.mood ?? null,
      review_count: reviewCountMap.get(r.placeId) ?? null,
      city_review_count: null,  // 简化，不做 city 级 count
    });
  }

  // CSV 头
  const header = [
    'city', 'spot_name', 'spot_type', 'adult_rating', 'kid_rating',
    'child_age_months', 'has_parking', 'has_high_chair', 'has_nap_room',
    'stroller_ok', 'review_text', 'review_date',
    'child_saying', 'child_mood', 'review_count',
  ];

  const csv = [
    header.join(','),
    ...rows.map(r => [
      csvEscape(r.city),
      csvEscape(r.spot_name),
      csvEscape(r.spot_type),
      r.adult_rating ?? '',
      r.kid_rating ?? '',
      r.child_age_months ?? '',
      r.has_parking ?? '',
      r.has_high_chair ?? '',
      r.has_nap_room ?? '',
      r.stroller_ok ?? '',
      csvEscape(r.review_text),
      csvEscape(r.review_date),
      csvEscape(r.child_saying),
      csvEscape(r.child_mood),
      r.review_count ?? '',
    ].join(',')),
  ].join('\n');

  // BOM + UTF-8（Excel 兼容中文）
  fs.writeFileSync(outPath, '﻿' + csv, 'utf-8');

  const stats = {
    places_with_aggregate: aggregates.length,
    reviews: rows.length,
    child_sayings: childSayings.length,
    cities: new Set(rows.map(r => r.city)).size,
    output_file: outPath,
    file_size: fs.statSync(outPath).size,
  };

  console.log('✓ 导出完成', JSON.stringify(stats, null, 2));
  await prisma.$disconnect();
}

exportKidsFeedbackCsv().catch(e => {
  console.error(e);
  process.exit(1);
});
