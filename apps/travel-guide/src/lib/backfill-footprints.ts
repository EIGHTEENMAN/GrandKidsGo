// lib/backfill-footprints.ts — 当 plan_record 进入 completed 时调用
// 把 plan 的 cityId + timelineBlocks.spotId 全部写入 footprint
//
// 用法：
//   import { backfillFootprintsForCompletedPlan } from "@/lib/backfill-footprints";
//   await backfillFootprintsForCompletedPlan(planRecordId);
//
// 去重策略：footprint_unique(userId, childId, cityId, spotId, state)
// 同一城市/景点的 visited 不会被重复创建。
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TimelineBlockSpot {
  spotId?: string;
  spot_id?: string;
  id?: string;
}

interface TimelineDay {
  blocks?: TimelineBlockSpot[];
}

export interface BackfillResult {
  planRecordId: string;
  userId: string;
  cityFootprintsCreated: number;
  spotFootprintsCreated: number;
  skipped: number;
}

export async function backfillFootprintsForCompletedPlan(
  planRecordId: string,
): Promise<BackfillResult> {
  const plan = await prisma.planRecord.findUnique({
    where: { id: planRecordId },
    select: { id: true, userId: true, cityId: true, timelineBlocks: true },
  });
  if (!plan) return {
    planRecordId, userId: '', cityFootprintsCreated: 0, spotFootprintsCreated: 0, skipped: 0,
  };

  const result: BackfillResult = {
    planRecordId,
    userId: plan.userId,
    cityFootprintsCreated: 0,
    spotFootprintsCreated: 0,
    skipped: 0,
  };

  // 1) 城市级足迹：city 字段存在时 idem（同 user+city+state 已存在则跳过）
  if (plan.cityId) {
    const exists = await prisma.footprint.findFirst({
      where: {
        userId: plan.userId,
        childId: null,
        cityId: plan.cityId,
        spotId: null,
        state: "visited",
      },
      select: { id: true },
    });
    if (!exists) {
      try {
        await prisma.footprint.create({
          data: {
            userId: plan.userId,
            cityId: plan.cityId,
            state: "visited",
            source: "from_plan",
            sourceId: plan.id,
            checkinAt: new Date(),
          },
        });
        result.cityFootprintsCreated += 1;
      } catch (e) {
        result.skipped += 1;
      }
    } else {
      result.skipped += 1;
    }
  }

  // 2) 景点级足迹：遍历 timelineBlocks.spotId
  const days = Array.isArray(plan.timelineBlocks)
    ? (plan.timelineBlocks as TimelineDay[])
    : [];
  const seenSpotIds = new Set<string>();
  for (const day of days) {
    if (!day?.blocks) continue;
    for (const block of day.blocks) {
      const sid = block.spotId ?? block.spot_id ?? block.id;
      if (!sid || seenSpotIds.has(sid)) continue;
      seenSpotIds.add(sid);

      // 验证 spot 存在
      const spot = await prisma.spot.findUnique({
        where: { id: sid },
        select: { id: true, cityId: true, name: true, lat: true, lng: true },
      });
      if (!spot) {
        result.skipped += 1;
        continue;
      }

      try {
        const exists = await prisma.footprint.findFirst({
          where: {
            userId: plan.userId,
            childId: null,
            cityId: spot.cityId,
            spotId: spot.id,
            state: "visited",
          },
          select: { id: true },
        });
        if (exists) {
          result.skipped += 1;
        } else {
          await prisma.footprint.create({
            data: {
              userId: plan.userId,
              cityId: spot.cityId,
              spotId: spot.id,
              placeName: spot.name,
              lat: spot.lat,
              lng: spot.lng,
              state: "visited",
              source: "from_plan",
              sourceId: plan.id,
              checkinAt: new Date(),
            },
          });
          result.spotFootprintsCreated += 1;
        }
      } catch {
        result.skipped += 1;
      }
    }
  }

  console.log(
    `[backfill-footprints] plan=${plan.id} city=${result.cityFootprintsCreated} spot=${result.spotFootprintsCreated} skipped=${result.skipped}`,
  );

  return result;
}
