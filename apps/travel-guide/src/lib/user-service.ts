// 跨服务用户信息查询
// 直接读取 auth-service 的 SQLite 数据（同机器部署，简单可靠）。
//
// 原理：travel-guide 存储的是 auth-service 的 userId（UUID），
// 展示作者昵称/头像时，需要从 auth-service 的 users 表拉取。
// 两地同服务器同文件系统，直接 SQLite 只读连接最稳。
//
// 环境变量：
//   AUTH_DB_PATH  — 覆盖 auth.db 路径（默认 ../auth-service/data/auth.db）
//
// 注意：travel-guide 项目本身不依赖 better-sqlite3。
//       此模块**动态** require 它（用 eval('require') 防止 esbuild 静态分析失败）。
//       当 better-sqlite3 不可用时（生产 API 路由环境），降级为返回占位信息。

import path from 'path';

export interface UserInfo {
  id: string;
  nickname: string;
  avatar: string | null;
}

let authDb: any = null;

function getDb(): any {
  if (authDb) return authDb;
  const dbPath =
    process.env.AUTH_DB_PATH ||
    path.join(process.cwd(), '..', 'auth-service', 'data', 'auth.db');
  try {
    // 动态 require，避开 travel-guide 项目不装 better-sqlite3 的问题
    // eslint-disable-next-line no-eval
    const Database = eval('require')('better-sqlite3');
    authDb = new Database(dbPath, { readonly: true });
    return authDb;
  } catch {
    return null;
  }
}

export function batchFetchUsers(ids: string[]): Map<string, UserInfo> {
  const db = getDb();
  if (!db || !ids.length) return new Map();
  const deduped = Array.from(new Set(ids));
  const placeholders = deduped.map(() => '?').join(',');
  try {
    const rows = db
      .prepare(
        `SELECT id, COALESCE(nickname, username, '童慧行用户') AS nickname, avatar
         FROM users
         WHERE id IN (${placeholders})`,
      )
      .all(...deduped) as Array<{ id: string; nickname: string; avatar: string | null }>;
    const map = new Map<string, UserInfo>();
    for (const r of rows) {
      map.set(r.id, { id: r.id, nickname: r.nickname, avatar: r.avatar });
    }
    return map;
  } catch {
    return new Map();
  }
}

export function fetchUser(userId: string): UserInfo | null {
  return batchFetchUsers([userId]).get(userId) ?? null;
}

export function fallbackUser(userId: string): UserInfo {
  return { id: userId, nickname: '童慧行用户', avatar: null };
}

/** 2026-07-24 v1.0：拉用户性别 + 角色快照（用于 PlaceReview 聚合 mom/dad 拆分）
 *  - gender：male | female | null
 *  - role：mom | dad | grandparent | other | null（基于 travel-guide 内置的 user_meta 表，暂无则降级为 gender 推断）
 */
export interface UserSnapshot {
  gender: 'male' | 'female' | null;
  role: 'mom' | 'dad' | 'grandparent' | 'other' | null;
}

export function fetchUserGenderAndRole(userId: string): UserSnapshot | null {
  const db = getDb();
  if (!db) return null;
  try {
    // auth-service 的 users 表当前只有 role（user/admin），没有 gender
    // v1.0：尝试拉 gender 字段（如有），role 默认从 gender 推断
    const row = db
      .prepare(
        `SELECT id, COALESCE(role, 'user') AS role FROM users WHERE id = ?`,
      )
      .get(userId) as { id: string; role: string } | undefined;
    if (!row) return null;

    // v1.0 简化：role 字段是 'user' 或 'admin'，没有 mom/dad 区分
    // 把 admin 排除，普通用户 gender 字段未来才有 → 暂时 role=null
    return {
      gender: null,  // 待 auth-service users 表加 gender 列
      role: null,
    };
  } catch {
    return null;
  }
}
