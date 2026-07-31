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
  // 2026-07-31 v1.0 Phase A：扩展字段（票务/推车/饮食/怕动物/温度）
  hasStudentCard: z.boolean().default(false),
  idCardPrefix: z.string().optional(),
  needsChildTicket: z.boolean().default(true),
  strollerWidthCm: z.number().int().min(20).max(120).optional(),
  comfortableTempC: z.string().regex(/^\d{1,2}-\d{1,2}$/).optional(),
  fearsAnimals: z.boolean().default(false),
  dietaryRestrictions: z.array(z.string()).default([]),
  // 票务/尺寸字段（wizard 透传，assembler 部分消费）
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  healthNotes: z.string().optional(),
});

export type ChildProfile = z.infer<typeof ChildProfileSchema>;

// MergedChildProfile：多孩合并后的画像（v1 用，合并策略见 §C.2）
// 类型上等于 ChildProfile，因为合并函数保留所有字段
export type MergedChildProfile = ChildProfile;

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
// v1: 跨城交通方式由距离启发式分配 (assembler/index.ts → getTransitModeAndMinutes)
// PR2 起接入 AMAP/12306 真实数据
export type TransitMode = "walk" | "drive" | "high_speed_rail" | "flight";

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
  // ---- 多城拼接 (v1) ----
  // 仅当 kind === "transit" 时填充；其他 block 这些字段全部 undefined
  transitFromCityId?: string;                 // 出发城市 id
  transitToCityId?: string;                   // 到达城市 id
  transitMode?: TransitMode;                  // 由距离阈值启发分配
  transitMinutes?: number;                    // 交通时长（分钟，估值 v1）
  transitDistanceKm?: number;                 // 距离（km，haversine 算）
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
  // 2026-07-31 v1.0 Phase A：孩子画像定制的提示 chip 列表
  childProfileHints?: ChildProfileHint[];
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

// 候选方案的孩子画像提示（wizard 候选卡片展示用）
export interface ChildProfileHint {
  type: 'customization' | 'warning' | 'info';
  icon: '🎯' | '⚠️' | '📐';
  text: string;
}

export interface PlanOutline {
  cityId: string;                             // 保留：primary 城市（首站）
  cityName: string;                           // 保留：primary 城市名
  // ---- 多城拼接 (v1) ----
  cityIds: string[];                          // 全部被选城市，按顺序；单城时等于 [cityId]
  cityNames: string[];                        // 对应城市名
  generatedAt: string;
  candidates: CandidateOutline[];
}
