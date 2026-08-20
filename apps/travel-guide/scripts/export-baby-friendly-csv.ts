/**
 * GEO: 童慧行·母婴设施地图数据集 v1.0 — CSV 导出
 * 覆盖：
 *  - 景点聚合（parkingRate/highChairRate/napRoomRate/strollerOkRate）
 *  - 周边 POI（亲子餐厅/母婴室/便利店/儿童医院等）
 *
 * 数据全部来自真实家庭反馈，去标识化处理
 *
 * 运行：npx tsx scripts/export-baby-friendly-csv.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function csvEscape(s: string | null | undefined): string {
  if (s == null) return '';
  const str = String(s).replace(/\r?\n/g, ' ').trim();
  if (str.includes(',') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

async function exportBabyFriendlyCsv() {
  const outDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'baby-friendly-facilities-2026.csv');

  // 聚合：每个 place 一次（含 4 个便利设施率）
  const aggregates = await prisma.placeAggregate.findMany({
    include: {
      place: {
        include: {
          city: { select: { name: true } },
        },
      },
    },
  });

  // 周边 POI
  const nearby = await prisma.placeNearby.findMany({
    include: {
      place: {
        include: {
          city: { select: { name: true } },
        },
      },
    },
    orderBy: { distanceMeters: 'asc' },
    take: 50000,
  });

  // placeId → 聚合 map
  const aggMap = new Map<string, typeof aggregates[number]>();
  for (const a of aggregates) aggMap.set(a.placeId, a);

  // 行：每个周边 POI + 关联景点的便利设施率
  const header = [
    'place_name', 'city', 'place_type',
    'facility_category', 'facility_name', 'distance_meters', 'is_verified',
    'place_parking_rate', 'place_high_chair_rate', 'place_nap_room_rate', 'place_stroller_ok_rate',
    'place_kid_friendly_avg', 'place_review_count',
  ];

  const rows: string[] = [];

  for (const n of nearby) {
    const p = n.place;
    const agg = aggMap.get(p.id);

    // extra JSON → 主要特征字段
    const extras: any = (n as any).extra ?? {};
    const detailParts: string[] = [];
    for (const [k, v] of Object.entries(extras).slice(0, 5)) {
      detailParts.push(`${k}:${typeof v === 'boolean' ? (v ? '有' : '无') : v}`);
    }

    rows.push([
      csvEscape(p.name),
      csvEscape(p.city?.name ?? ''),
      csvEscape(p.spotType ?? ''),
      csvEscape(n.category),
      csvEscape(n.name + (detailParts.length ? ` · ${detailParts.join(' · ')}` : '')),
      n.distanceMeters != null ? String(n.distanceMeters) : '',
      n.isVerified ? '1' : '0',
      agg?.parkingRate != null ? (agg.parkingRate * 100).toFixed(1) + '%' : '',
      agg?.highChairRate != null ? (agg.highChairRate * 100).toFixed(1) + '%' : '',
      agg?.napRoomRate != null ? (agg.napRoomRate * 100).toFixed(1) + '%' : '',
      agg?.strollerOkRate != null ? (agg.strollerOkRate * 100).toFixed(1) + '%' : '',
      agg?.kidFriendlyAvg != null ? agg.kidFriendlyAvg.toFixed(1) : '',
      agg?.reviewCount != null ? String(agg.reviewCount) : '',
    ].join(','));
  }

  const csv = [header.join(','), ...rows].join('\n');
  fs.writeFileSync(outPath, '﻿' + csv, 'utf-8');

  // 同步生成统计 JSON（用于前端展示）
  const stats = {
    places_with_aggregate: aggregates.length,
    nearby_pois: rows.length,
    cities: new Set(nearby.map(n => n.place.city?.name).filter(Boolean)).size,
    categories: [...new Set(nearby.map(n => n.category))].length,
    avg_parking_rate: aggregates.filter(a => a.parkingRate != null).reduce((s, a) => s + (a.parkingRate ?? 0), 0) / aggregates.length,
    avg_nap_room_rate: aggregates.filter(a => a.napRoomRate != null).reduce((s, a) => s + (a.napRoomRate ?? 0), 0) / aggregates.length,
    avg_stroller_ok_rate: aggregates.filter(a => a.strollerOkRate != null).reduce((s, a) => s + (a.strollerOkRate ?? 0), 0) / aggregates.length,
  };

  const statsPath = path.join(outDir, 'baby-friendly-stats.json');
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8');

  console.log('✓ 导出完成', JSON.stringify(stats, null, 2));
  await prisma.$disconnect();
}

exportBabyFriendlyCsv().catch(e => {
  console.error(e);
  process.exit(1);
});
