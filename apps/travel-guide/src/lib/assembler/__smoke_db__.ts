// 引擎 A 真实数据联调（连库不连 mock）
// 跑：npx tsx src/lib/assembler/__smoke_db__.ts
// v1 多城拼接：北京 + 上海 + 5 天（2026-07-28 引入）

import { PrismaClient } from '@prisma/client'
import { assemble, autoSuggestTotalDays, computeCityAllocation, getTransitModeAndMinutes } from './index'

const prisma = new PrismaClient()

async function run() {
  const beijing = await prisma.city.findUnique({ where: { name: '北京' }, select: { id: true, name: true, lat: true, lng: true } })
  const shanghai = await prisma.city.findUnique({ where: { name: '上海' }, select: { id: true, name: true, lat: true, lng: true } })
  if (!beijing || !shanghai) {
    console.error('数据库无北京/上海。请先跑 04-import-db.ts')
    process.exit(1)
  }
  console.log(`北京载入 (${beijing.id}) lat=${beijing.lat} lng=${beijing.lng}`)
  console.log(`上海载入 (${shanghai.id}) lat=${shanghai.lat} lng=${shanghai.lng}`)

  // ---------- 单城 case（向后兼容） ----------
  await runSingleCity(beijing.id, '北京')

  // ---------- 多城 case ----------
  await runMultiCity([beijing.id, shanghai.id], [beijing, shanghai])

  // ---------- 算法纯函数 sanity ----------
  runAlgSanity()
}

async function runSingleCity(cityId: string, name: string) {
  console.log(`\n=== 单城模式：${name} 3 天 ===`)
  const params = makeParams([cityId], '2026-08-01', '2026-08-03')
  const outline = await assemble(params)
  printOutline('单城', outline)
}

async function runMultiCity(cityIds: string[], cities: Array<{ id: string; name: string; lat: number | null; lng: number | null }>) {
  console.log(`\n=== 多城模式：${cities.map((c) => c.name).join(' → ')} 5 天 ===`)
  // 先打印启发算法
  const spotsCounts: Record<string, number> = {}
  for (const id of cityIds) {
    spotsCounts[id] = await prisma.spot.count({ where: { cityId: id } })
  }
  console.log('spotsCounts:', spotsCounts)
  console.log('autoSuggestTotalDays:', autoSuggestTotalDays(cityIds, spotsCounts))

  console.log('computeCityAllocation:')
  for (const days of [3, 5, 7]) {
    const a = computeCityAllocation(cityIds, spotsCounts, days)
    console.log(`  totalDays=${days} →`, a.map((x) => `${x.cityId.slice(0, 4)}:${x.days}d`).join(', '))
  }

  console.log('transit:')
  for (let i = 0; i < cities.length - 1; i++) {
    const t = getTransitModeAndMinutes(cities[i]!, cities[i + 1]!)
    console.log(`  ${cities[i]!.name} → ${cities[i + 1]!.name}: mode=${t.mode} km=${t.distanceKm.toFixed(0)} min=${t.minutes}`)
  }

  const params = makeParams(cityIds, '2026-08-01', '2026-08-05')
  const t0 = performance.now()
  const outline = await assemble(params)
  const dt = performance.now() - t0
  console.log(`assemble() in ${dt.toFixed(1)}ms`)
  printOutline('多城', outline)
}

function makeParams(cityIds: string[], start: string, end: string) {
  return {
    userId: 'test-smoke-user',
    cityId: cityIds[0]!,
    cities: cityIds,
    startDate: start,
    endDate: end,
    travelers: { adults: 2, children: 1 },
    childProfiles: [
      {
        childId: 'demo-child-1',
        name: '小可乐',
        likes: ['动物', '恐龙'],
        activities: ['户外', '互动'],
        dislikes: ['黑暗'],
        activeHoursPerDay: 6,
        needNap: 'required' as const,
        earlyOrLate: 'early_bird' as const,
        hasMotionSickness: false,
        allergies: [],
        isShyWithStrangers: false,
        birthDate: new Date(Date.now() - 36 * 30.44 * 86400000).toISOString(),
        // 2026-07-31 v1.0 Phase A
        hasStudentCard: false,
        needsChildTicket: true,
        fearsAnimals: false,
        dietaryRestrictions: [],
      },
    ],
    budgetLevel: 'balanced' as const,
    hasChildFeelingProfile: false,
  }
}

function printOutline(label: string, outline: { cityNames: string[]; candidates: any[] }) {
  console.log(`\n[${label}] cities=${outline.cityNames.join('→')} candidates=${outline.candidates.length}`)
  for (const c of outline.candidates) {
    console.log(`  - ${c.label} · ${c.totalDays}天 · ${c.totalActiveHours}h · ¥${Math.round(c.totalCostCents / 100)}`)
    let transitCount = 0
    let hotelCount = 0
    for (const d of c.days) {
      const kinds: Record<string, number> = {}
      for (const b of d.blocks) kinds[b.kind] = (kinds[b.kind] ?? 0) + 1
      transitCount += kinds['transit'] ?? 0
      hotelCount += kinds['hotel'] ?? 0
      console.log(`    Day ${d.dayIndex} (city=${d.cityId.slice(0, 4)}): ${d.blocks.length} blocks · kinds=${JSON.stringify(kinds)}`)
    }
    console.log(`    total transit=${transitCount} hotel=${hotelCount}`)
  }
}

function runAlgSanity() {
  console.log('\n=== Alg sanity ===')
  // 单城: 1 城 → [1城:N 天]
  console.log(computeCityAllocation(['A'], { A: 5 }, 3).map((a) => `${a.cityId}:${a.days}d`).join(','))
  // 2 城: 5 天 → 每城 2 天
  console.log(computeCityAllocation(['A', 'B'], { A: 5, B: 4 }, 5).map((a) => `${a.cityId}:${a.days}d`).join(','))
  // 3 城: 7 天
  console.log(computeCityAllocation(['A', 'B', 'C'], { A: 5, B: 4, C: 3 }, 7).map((a) => `${a.cityId}:${a.days}d`).join(','))
}

run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
