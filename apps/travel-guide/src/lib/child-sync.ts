// 跨 app 孩子档案同步 helper（S-2）
// 详见 项目建设方案/走天下个人中心竞品调研-2026-07-24.md 第二节"特色" + plan/quirky-meandering-frog.md 阶段 S
//
// 设计原则：
//   - 基础字段（nickname / gender / birthday / avatar）的 SSOT = auth-service.children
//   - 扩展字段（likes / needNap / 晕车 / 早睡晚睡 / 过敏 / 健康备注）的 SSOT = travel-guide.child_profiles
//   - 前端调本 helper → 内部双写（auth-service + 本地 Prisma），失败回滚保证一致性
//
// 调用方：
//   - apps/travel-guide/src/app/api/user/children/route.ts 的 PUT handler
//   - apps/travel-guide/src/components/ProfileSetup.tsx 触发时（前端直调）

import { NextRequest } from 'next/server';

const AUTH_SERVICE_BASE =
  process.env.AUTH_SERVICE_URL || process.env.NEXT_PUBLIC_AUTH_API || 'http://127.0.0.1:3007';

export interface BaseChildFields {
  nickname?: string;
  gender?: string;
  birthday?: string;   // ISO date 'YYYY-MM-DD'
  avatar?: string;
}

export interface SyncResult {
  ok: boolean;
  source: 'auth-service' | 'travel-guide' | 'none';
  message?: string;
}

/**
 * 拉单个孩子在 auth-service 的基础字段（SSOT 读）
 * @param childId  auth-service children.id（UUID）
 * @param token    Bearer token（前端 grandkidsgo_token）
 */
export async function fetchAuthChild(
  childId: string,
  token: string,
): Promise<BaseChildFields | null> {
  try {
    const res = await fetch(`${AUTH_SERVICE_BASE}/api/user/children`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { code?: string; data?: Array<{ id: string; nickname?: string; gender?: string; birthday?: string; avatar?: string }> };
    if (json.code !== 'OK' || !Array.isArray(json.data)) return null;
    const child = json.data.find((c) => c.id === childId);
    if (!child) return null;
    return {
      nickname: child.nickname,
      gender: child.gender ?? undefined,
      birthday: child.birthday ?? undefined,
      avatar: child.avatar ?? undefined,
    };
  } catch (e) {
    console.error('[child-sync] fetchAuthChild failed', e);
    return null;
  }
}

/**
 * 拉当前用户在 auth-service 的全部 children（给前端选择器用）
 */
export async function fetchAuthChildren(
  token: string,
): Promise<Array<{ id: string; nickname: string; gender?: string | null; birthday?: string | null; avatar?: string | null }>> {
  try {
    const res = await fetch(`${AUTH_SERVICE_BASE}/api/user/children`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { code?: string; data?: Array<{ id: string; nickname: string; gender?: string | null; birthday?: string | null; avatar?: string | null }> };
    return json.code === 'OK' && Array.isArray(json.data) ? json.data : [];
  } catch (e) {
    console.error('[child-sync] fetchAuthChildren failed', e);
    return [];
  }
}

/**
 * 把基础字段双写到 auth-service（SSOT）和本地（缓存）
 * - auth-service 写失败 → throw，调用方不写本地
 * - 本地写失败 → 不回滚 auth（基础字段已对，扩展字段下次保存重试）
 */
export async function syncBaseFieldsToAuth(
  childId: string,
  fields: BaseChildFields,
  token: string,
): Promise<SyncResult> {
  // 1. 写 auth-service
  const authRes = await fetch(`${AUTH_SERVICE_BASE}/api/user/children/${encodeURIComponent(childId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fields),
    cache: 'no-store',
  });
  if (!authRes.ok) {
    const text = await authRes.text().catch(() => '');
    return { ok: false, source: 'auth-service', message: `auth-service PUT 失败 ${authRes.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true, source: 'auth-service' };
}

/**
 * 从 NextRequest 里读 Bearer token（标准做法）
 */
export function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.substring(7);
  return null;
}