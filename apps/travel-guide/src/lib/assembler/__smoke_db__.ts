// 引擎 A 真实数据联调（连库不连 mock）
// 跑：npx tsx src/lib/assembler/__smoke_db__.ts

import { PrismaClient } from '@prisma/client'
import { assemble } from './index'

const prisma = new PrismaClient()

async function run() {
  const beijing = await prisma.city.findUnique({ where: { name: '北京' } })
  if (!beijing) {
    console.error('数据库无北京。请先跑 04-import-db.ts')
    process.exit(1)
  }
  console.log(`北京载入，lat=${beijing.lat} lng=${beijing.lng}`)

  const params = {
    userId: 'test-smoke-user',
    cityId: beijing.id,
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    travelers: { adults: 2, children: 1 },
    childProfiles: [
      {
        childId: 'demo-child-1',
        name: '小可乐',
        birthDate: new Date(Date.now() - 36 * 30.44 * 86400000).toISOString(),
        likes: ['动物', '恐龙'],
        activities: ['户外', '互动'],
        dislikes: ['黑暗'],
        activeHoursPerDay: 6,
        needNap: 'required',
        earlyOrLate: 'early_bird',
        hasMotionSickness: false,
        allergies: [],
        isShyWithStrangers: false,
      },
    ],
    budgetLevel: 'balanced' as const,
    hasChildFeelingProfile: false,
  }

  const t0 = performance.now()
  const outline = await assemble(params)
  const dt = performance.now() - t0

  console.log(`\n[smoke-db] 引擎 A 在 ${dt.toFixed(1)}ms 内输出 ${outline.candidates.length} 档候选\n`)
  for (const c of outline.candidates) {
    console.log(`  - ${c.label} · ${c.totalDays}天 · ${c.totalActiveHours}h · ¥${Math.round(c.totalCostCents / 100)}`)
    for (const d of c.days) {
      console.log(`    Day ${d.dayIndex}: ${d.blocks.length} 块`)
    }
  }
}

run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
