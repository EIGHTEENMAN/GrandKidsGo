// 推荐共享层 — 供 /api/places/recommend 端点和将来 searchSimilar 反哺使用
// 2026-07-31 v1.0 Phase A：基于 child 静态字段打分（不用 child_feeling_profile，Phase D 才接）
// 详见 项目建设方案/亲子宝典数据闭环-v1.0.md §8

import {
  filterSpotsByChildProfile,
  mergeChildProfiles,
} from "./index";
import type { ChildProfile } from "./types";
type MergedChildProfile = ChildProfile;

export interface TripContext {
  startDate?: string;
  endDate?: string;
  days?: number;
  travelStyle?: "time_saver" | "money_saver" | "comfort";
  preferredSpotTypes?: string[];
}

export interface RecommendedSpot {
  placeId: string;
  placeType: string;
  placeName: string;
  coverImage: string | null;
  tags: string[];
  score: number;
  reasons: Array<{
    type: 'age_match' | 'likes' | 'top_among_age' | 'no_cry_history'
        | 'shy_safe' | 'no_animal' | 'allergy_safe'
        | 'student_discount' | 'kid_ticket';
    text: string;
    weight: number;
  }>;
}

export interface ChildSnapshot {
  childId: string;
  name: string;
  ageMonths: number;
  isShy: boolean;
  fearsAnimals: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  likes: string[];
  activities: string[];
}

/**
 * 约月龄（与 assembler/index.ts:approxChildAgeMonths 同步）
 */
export function approxAgeMonths(child: ChildProfile): number {
  if (!child.birthDate) return 36;
  const ms = Date.now() - new Date(child.birthDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44)));
}

/**
 * 给定 spots 和 merged child，组装每条 reason
 */
function buildReasons(
  spot: { name: string; tags?: string[]; spotType?: string | null },
  child: MergedChildProfile,
  ageMonths: number,
): RecommendedSpot['reasons'] {
  const reasons: RecommendedSpot['reasons'] = [];
  const tags = spot.tags ?? [];
  // likes 命中
  const matchedLikes = (child.likes ?? []).filter(l => tags.includes(l));
  if (matchedLikes.length > 0) {
    reasons.push({
      type: 'likes',
      text: `你孩子喜欢「${matchedLikes.slice(0, 2).join("」「")}」`,
      weight: 0.4,
    });
  }
  // 怕生
  if (child.isShyWithStrangers && !tags.some(t => ['人群密集', '高峰', '热门'].includes(t))) {
    reasons.push({ type: 'shy_safe', text: '人群密度低，适合怕生的孩子', weight: 0.3 });
  }
  // 怕动物
  if (child.fearsAnimals && !tags.some(t => ['动物园', '宠物', '动物互动'].includes(t))) {
    reasons.push({ type: 'no_animal', text: '无动物接触，避免怕动物的孩子紧张', weight: 0.3 });
  }
  // 学生证
  if (child.hasStudentCard) {
    reasons.push({ type: 'student_discount', text: '有学生证可享门票半价', weight: 0.2 });
  }
  // 儿童票
  if (child.needsChildTicket) {
    reasons.push({ type: 'kid_ticket', text: '支持儿童票规则', weight: 0.2 });
  }
  // 年龄适配（粗略：spotType 与月龄关联在 assembler 里有，这里只标 age_match）
  if (ageMonths >= 24 && ageMonths <= 84) {
    reasons.push({ type: 'age_match', text: `${Math.floor(ageMonths / 12)} 岁孩子的热门目的地`, weight: 0.25 });
  }
  return reasons;
}

/**
 * 主入口：基于 child + cityId 拉 spots 排序，返回带 reasons 的 top N
 * 内部使用 mergeChildProfiles 多孩合并
 */
export function recommendFromSpots(
  spots: Array<{
    id: string;
    name: string;
    spotType?: string | null;
    tags?: string[];
    coverImage?: string | null;
    kidScore?: number | null;
  }>,
  children: ChildProfile[],
  _tripContext: TripContext | undefined,
  limit: number = 20,
): { items: RecommendedSpot[]; childSnapshot: ChildSnapshot } {
  const merged = mergeChildProfiles(children);
  const ageMonths = approxAgeMonths(merged);

  // 过滤：怕生/怕动物（filterSpotsByChildProfile 接收的是 LoadedSpot，但我们这里用任何带 tags/name 的对象 → 用 any）
  const filtered = filterSpotsByChildProfile(spots as any, merged);

  // 排序：kidScore × likes 加权 + 怕生避雷（已经过滤掉了，无需再降权）
  const ranked = filtered
    .map(s => {
      const baseScore = s.kidScore ?? 4.0;
      const tags: string[] = s.tags ?? [];
      const likesBonus = (merged.likes ?? []).filter(l => tags.includes(l)).length * 0.3;
      const activitiesBonus = (merged.activities ?? []).filter(t => tags.includes(t)).length * 0.2;
      const score = baseScore + likesBonus + activitiesBonus;
      const reasons = buildReasons(s, merged, ageMonths);
      const placeName: string = s.name;
      const coverImage: string | null = (s as any).coverImage ?? null;
      return {
        placeId: s.id,
        placeType: s.spotType ?? "sight",
        placeName,
        coverImage,
        tags,
        score: Math.min(5, score) / 5, // 归一化 0-1
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(50, Math.max(1, limit)));

  const snapshot: ChildSnapshot = {
    childId: merged.childId,
    name: merged.name,
    ageMonths,
    isShy: !!merged.isShyWithStrangers,
    fearsAnimals: !!merged.fearsAnimals,
    allergies: merged.allergies ?? [],
    dietaryRestrictions: merged.dietaryRestrictions ?? [],
    likes: merged.likes ?? [],
    activities: merged.activities ?? [],
  };

  return { items: ranked, childSnapshot: snapshot };
}
