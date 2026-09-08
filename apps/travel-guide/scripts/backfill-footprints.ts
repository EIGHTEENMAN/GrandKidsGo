/**
 * scripts/backfill-footprints.ts — 给已 completed 的 planRecord 补 footprint
 *
 * 配套 POST /api/plans/[id]/complete（实时钩子）+ POST /api/plans/[id]/ratings
 * （首次评分自动 complete + backfill）的**保险脚本**：
 *   - 历史数据修复：早期 planRecord 已 completed 但 footprint 还没生成
 *   - 离线保障：实时钩子失败时可手动跑
 *
 * 运行：
 *   npx tsx scripts/backfill-footprints.ts              # 实际跑
 *   npx tsx scripts/backfill-footprints.ts --dry-run    # 只看不写
 *   npx tsx scripts/backfill-footprints.ts --limit=3    # 限制最多处理 N 个 plan
 *   npx tsx scripts/backfill-footprints.ts --user=UUID  # 只处理某个用户
 *
 * 注意：backfillFootprintsForCompletedPlan 内部已 idempotent（findFirst + create）
 *       所以重复跑不会产生重复足迹，放心。
 */
import { PrismaClient } from '@prisma/client';
import { backfillFootprintsForCompletedPlan } from '../src/lib/backfill-footprints';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0;
const userArg = args.find((a) => a.startsWith('--user='));
const userFilter = userArg ? userArg.split('=')[1] : null;

async function main() {
  console.log(
    `[backfill-fp] start  dryRun=${isDryRun}  limit=${limit || '∞'}  userFilter=${userFilter ?? 'all'}`,
  );

  const where = { status: 'completed' as const };
  if (userFilter) Object.assign(where, { userId: userFilter });

  const plans = await prisma.planRecord.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    ...(limit ? { take: limit } : {}),
    select: {
      id: true,
      userId: true,
      cityId: true,
      title: true,
      _count: {
        select: {
          media: true,
          ratings: true,
        },
      },
    },
  });
  console.log(`[backfill-fp] plans to scan: ${plans.length}`);

  let totalCity = 0;
  let totalSpot = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;
  let totalErrored = 0;

  for (const p of plans) {
    if (isDryRun) {
      console.log(`[backfill-fp] (dry-run) would process plan ${p.id} ${p.title?.slice(0, 30) ?? ''}`);
      continue;
    }

    try {
      const r = await backfillFootprintsForCompletedPlan(p.id);
      totalCity += r.cityFootprintsCreated;
      totalSpot += r.spotFootprintsCreated;
      totalSkipped += r.skipped;
      totalProcessed += 1;
      // 详细日志：按 plan
      console.log(
        `[backfill-fp] ${p.id.slice(0, 8)} ${p.title?.slice(0, 30) ?? 'untitled'} → city=${r.cityFootprintsCreated} spot=${r.spotFootprintsCreated} skipped=${r.skipped}`,
      );
    } catch (e: any) {
      totalErrored += 1;
      console.error(`[backfill-fp] plan ${p.id} failed:`, e?.message);
    }
  }

  console.log('\n[backfill-fp] === summary ===');
  console.log(`[backfill-fp] plans scanned: ${plans.length}`);
  console.log(`[backfill-fp] plans processed: ${totalProcessed}`);
  console.log(`[backfill-fp] city footprints created: ${totalCity}`);
  console.log(`[backfill-fp] spot footprints created: ${totalSpot}`);
  console.log(`[backfill-fp] skipped (already exists): ${totalSkipped}`);
  console.log(`[backfill-fp] errors: ${totalErrored}`);
  if (isDryRun) console.log('[backfill-fp] *** DRY RUN — nothing written ***');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('[backfill-fp] failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
