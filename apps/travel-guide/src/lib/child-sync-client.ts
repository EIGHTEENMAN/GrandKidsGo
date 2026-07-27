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
  nickname: string;
  gender?: string;
  birthday?: string;
  avatar?: string;
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
  return json.data;
}
