// 浏览器侧创建孩子（SSOT = auth-service）
// 关键：浏览器不能直接访问 AUTH_SERVICE_URL（127.0.0.1:3007 不对外暴露，且无 CORS），
// 必须走同源 Next.js API 代理 /api/travel/children-create，由 Next.js 进程内转发到 auth-service。
//
// 路径说明：不能用 /api/auth/* — 在 travel.grandand.com 上 nginx 把 /api/auth/* 路由到
// auth-service（跨子域统一鉴权入口），不是到 travel-guide 的 next.js。所以新路由挂在
// /api/travel/* 命名空间，由 next.js (port 3010) 自己服务。
// 详见 apps/travel-guide/src/app/api/travel/children-create/route.ts

import { authedFetch } from './auth';

export interface ClientChildFields {
  // 基础（仍走 auth-service）
  nickname: string;
  gender?: string;
  birthday?: string;     // ISO date
  avatar?: string;
  // 扩展（Phase A：写本地 /api/user/children）
  heightCm?: number;
  weightKg?: number;
  likes?: string[];
  activities?: string[];
  dislikes?: string[];
  activeHoursPerDay?: number;
  needNap?: 'required' | 'optional' | 'none';
  earlyOrLate?: 'early_bird' | 'night_owl';
  hasMotionSickness?: boolean;
  allergies?: string[];
  isShyWithStrangers?: boolean;
  healthNotes?: string;
  // 2026-07-31 v1.0 Phase A：票务/推车/饮食/怕动物/温度
  hasStudentCard?: boolean;
  idCardPrefix?: string;
  needsChildTicket?: boolean;
  strollerWidthCm?: number;
  comfortableTempC?: string;
  fearsAnimals?: boolean;
  dietaryRestrictions?: string[];
}

export interface ClientChildCreated {
  id: string;
  nickname: string;
  gender?: string | null;
  birthday?: string | null;
  avatar?: string | null;
}

export async function createChildFromClient(
  fields: ClientChildFields,
): Promise<ClientChildCreated> {
  if (!fields?.nickname) {
    throw new Error('孩子昵称不能为空');
  }
  // Step 1: POST /api/travel/children-create → auth-service 拿 childId
  const res = await authedFetch('/api/travel/children-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname: fields.nickname,
      gender: fields.gender,
      birthday: fields.birthday,
      avatar: fields.avatar,
    }),
  });
  const json = (await res.json().catch(() => null)) as
    | { code: string; data?: ClientChildCreated; message?: string }
    | null;
  if (!json || json.code !== 'OK' || !json.data) {
    const msg = json?.message ?? `HTTP ${res.status}`;
    throw new Error(`创建失败: ${msg}`);
  }
  const childId = json.data.id;
  // Step 2: PUT /api/user/children 写扩展字段（Phase A：本地 17+7 字段）
  //         失败不抛错（用户可稍后在 ChildDetail 补充）
  try {
    await authedFetch('/api/user/children', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId,
        nickname: fields.nickname,
        gender: fields.gender,
        birthDate: fields.birthday,
        avatar: fields.avatar,
        // 扩展字段
        heightCm: fields.heightCm,
        weightKg: fields.weightKg,
        likes: fields.likes,
        activities: fields.activities,
        dislikes: fields.dislikes,
        activeHoursPerDay: fields.activeHoursPerDay,
        needNap: fields.needNap,
        earlyOrLate: fields.earlyOrLate,
        hasMotionSickness: fields.hasMotionSickness,
        allergies: fields.allergies,
        isShyWithStrangers: fields.isShyWithStrangers,
        healthNotes: fields.healthNotes,
        // Phase A 7 新字段
        hasStudentCard: fields.hasStudentCard,
        idCardPrefix: fields.idCardPrefix,
        needsChildTicket: fields.needsChildTicket,
        strollerWidthCm: fields.strollerWidthCm,
        comfortableTempC: fields.comfortableTempC,
        fearsAnimals: fields.fearsAnimals,
        dietaryRestrictions: fields.dietaryRestrictions,
        syncBaseToAuth: false, // 已在 children-create 写过 auth
      }),
    });
  } catch (e) {
    console.warn('[child-sync] PUT 扩展字段失败，用户可在 ChildDetail 补充:', e);
  }
  return json.data;
}
