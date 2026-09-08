/**
 * scripts/backfill-child-sayings.ts
 *
 * 回扫所有已发布攻略（Guide.status='published' 且 deletedAt is null），
 * 用 extract-child-sayings 正则提取童言，自动入 child_sayings 表。
 *
 * 配套 POST /api/guides 的实时提取，本脚本是**保险层**：
 *   - 历史修复：早期发布但还没接 extractor 的 guide
 *   - 离线保障：发布逻辑临时被绕过时不会遗失数据
 *
 * 运行：
 *   npx tsx scripts/backfill-child-sayings.ts              # 实际跑
 *   npx tsx scripts/backfill-child-sayings.ts --dry-run    # 只看不写
 *   npx tsx scripts/backfill-child-sayings.ts --limit=3    # 限制最多处理 N 篇（试跑）
 *   npx tsx scripts/backfill-child-sayings.ts --force      # 已存在的 (sourceGuideId,text) 也再插
 *
 * dedup 策略：默认跳过已存在的 (sourceGuideId, text)，--force 才重复插。
 */
import { PrismaClient } from '@prisma/client';
import { extractChildSayingsFromHtml } from '../src/lib/extract-child-sayings';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const forceFlag = args.includes('--force');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0;

const STATUS = process.env.STATUS || 'published';

async function main() {
  console.log(
    `[backfill] start  dryRun=${isDryRun}  force=${forceFlag}  limit=${limit || '∞'}  status=${STATUS}`,
  );

  const guides = await prisma.guide.findMany({
    where: {
      status: STATUS,
      contentHtml: { not: '' },
    },
    select: {
      id: true,
      title: true,
      userId: true,
      cityId: true,
      contentHtml: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  });
  console.log(`[backfill] guides to scan: ${guides.length}`);

  let totalExtracted = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  const perGuide: Array<{ guideId: string; title: string; inserted: number; skipped: number; extracted: number }> = [];

  for (const g of guides) {
    const html = g.contentHtml ?? '';
    const candidates = extractChildSayingsFromHtml(html).map((s) => s.text);
    if (!candidates.length) continue;

    // 现有入库查一下（去重）
    const existing = !forceFlag
      ? await prisma.childSaying.findMany({
          where: {
            sourceGuideId: g.id,
            text: { in: candidates },
          },
          select: { text: true },
        })
      : [];
    const existingSet = new Set(existing.map((e) => e.text));
    const toInsert = candidates.filter((t) => !existingSet.has(t));
    const skipped = candidates.length - toInsert.length;

    if (toInsert.length && !isDryRun) {
      // 批量创建
      await prisma.childSaying.createMany({
        data: toInsert.map((text) => ({
          userId: g.userId,
          childId: null,
          text,
          mood: null,
          spotId: null,
          source: 'auto_extract',
          status: 'draft',
          sourceGuideId: g.id,
          shareScope: 'private',
        })),
      });
    }

    totalExtracted += candidates.length;
    totalInserted += toInsert.length;
    totalSkipped += skipped;
    perGuide.push({
      guideId: g.id,
      title: g.title,
      inserted: toInsert.length,
      skipped,
      extracted: candidates.length,
    });
  }

  console.log('\n[backfill] === per-guide breakdown ===');
  for (const row of perGuide) {
    console.log(
      `[backfill] ${row.guideId.slice(0, 8)}  ${row.inserted} inserted / ${row.skipped} skipped / ${row.extracted} extracted  → ${row.title.slice(0, 32)}`,
    );
  }
  console.log('\n[backfill] === summary ===');
  console.log(`[backfill] guides scanned: ${guides.length}`);
  console.log(`[backfill] total candidates: ${totalExtracted}`);
  console.log(`[backfill] total inserted: ${totalInserted}`);
  console.log(`[backfill] total skipped (dedup): ${totalSkipped}`);
  if (isDryRun) console.log('[backfill] *** DRY RUN — nothing written ***');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('[backfill] failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
