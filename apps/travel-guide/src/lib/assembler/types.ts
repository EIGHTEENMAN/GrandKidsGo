// 拼装引擎 A — 数据契约
// 详见 项目建设方案/走天下实施方案-v1.5.md 第五节 + 第十节
//
// 输入 TravelParams（前端 / 4 步向导构造）
// 输出 Outline（含三套候选：省时 / 省钱 / 舒服，每档内部紧凑/平衡/宽松）

import { z } from "zod";

// ---------------------------------------------------------------------------
// ChildProfile
// ---------------------------------------------------------------------------
export const ChildProfileSchema = z.object({
  childId: z.string(),
  name: z.string(),
  birthDate: z.string().optional(),          // ISO
  likes: z.array(z.string()).default([]),    // ["动物", "恐龙", ...]
  activities: z.array(z.string()).default([]),
  dislikes: z.array(z.string()).default([]),
  activeHoursPerDay: z.number().min(1).max(12).default(6),
  needNap: z.enum(["required", "optional", "none"]).default("optional"),
  earlyOrLate: z.enum(["early_bird", "night_owl"]).default("early_bird"),
  hasMotionSickness: z.boolean().default(false),
  allergies: z.array(z.string()).default([]),
  isShyWithStrangers: z.boolean().default(false),
});

export type ChildProfile = z.infer<typeof ChildProfileSchema>;

// ---------------------------------------------------------------------------
// TravelParams（向导输入）
// ---------------------------------------------------------------------------
export const TravelParamsSchema = z.object({
  userId: z.string(),
  cityId: z.string(),                         // 主目的地（连程时下标 0）
  // 连程：A→B→C；多于此值会被截断为前 N 天
  cities: z.array(z.string()).optional(),
  startDate: z.string(),                      // ISO date
  endDate: z.string(),
  travelers: z
    .object({
      adults: z.number().int().min(1).default(2),
      children: z.number().int().min(0).default(1),
    })
    .default({ adults: 2, children: 1 }),
  childProfiles: z.array(ChildProfileSchema).min(1),
  budgetLevel: z.enum(["economy", "balanced", "premium"]).default("balanced"),
  preferredSpotTypes: z.array(z.string()).optional(),
  sourceGuideId: z.string().optional(),       // 从攻略 fork 时传
  hasChildFeelingProfile: z.boolean().default(false), // 引擎是否启用感受画像匹配
});

export type TravelParams = z.infer<typeof TravelParamsSchema>;

// ---------------------------------------------------------------------------
// 输出：TimelineBlock / TimelineDay / PlanOutline / CandidateOutline
// ---------------------------------------------------------------------------
export type TimeBlockKind = "spot" | "restaurant" | "park" | "playground" | "hotel" | "transit" | "rest";
export type RestReason = "nap" | "late_arrival" | "early_departure" | "buffer";

export interface TimelineBlock {
  blockId: string;
  kind: TimeBlockKind;
  startMinutes: number;                       // 0 = 当日 00:00，向引擎传入分钟数
  endMinutes: number;
  title: string;
  spotId?: string;
  restaurantId?: string;
  hotelId?: string;
  cityId?: string;                           // 跨城天块的归属城市
  kidHook?: string;                          // 引用的护城河片段
  notes?: string;
  restReason?: RestReason;
  scoreDetail?: {
    evaluation: number;
    route: number;
    cost: number;
    time: number;
    photoWorthy: number;
    feelingMatch: number;
    composite: number;
  };
}

export interface TimelineDay {
  dayIndex: number;
  date: string;                              // ISO
  theme: string;                             // "Day 1: 城市博物馆 + 亲子餐厅"
  blocks: TimelineBlock[];
  totalWalkMinutes: number;
  totalCostCents: number;
  cityId: string;
  kidFriendlySummary: string;
}

export type CandidateStyle = "time_saver" | "money_saver" | "comfort";
export type CandidateRhythm = "compact" | "balanced" | "relaxed";

export interface CandidateOutline {
  style: CandidateStyle;
  rhythm: CandidateRhythm;
  label: string;                             // 中文："省时档 / 紧凑"
  whyThisPlan: string;                       // 给父母看的理由（用于确认环节）
  totalCostCents: number;
  totalDays: number;
  totalActiveHours: number;
  days: TimelineDay[];
}

export interface PlanOutline {
  cityId: string;
  cityName: string;
  generatedAt: string;
  candidates: CandidateOutline[];
}
