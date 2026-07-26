// travel-guide 统一鉴权 helper — 替代 x-debug-user-id 的 debug 鉴权
// 逻辑对齐 auth-service/src/middleware/auth.js 的 authenticate 中间件
// 密钥：优先 AUTH_SERVICE_JWT_SECRET，回退 JWT_SECRET（兼容两种命名）
// 生产环境必须配置密钥，否则 fail-closed 拒绝所有请求
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { NextRequest } from 'next/server';

const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET =
  process.env.AUTH_SERVICE_JWT_SECRET ||
  process.env.JWT_SECRET ||
  (IS_PROD ? '' : 'grandkidsgo-jwt-secret-dev');

export interface AuthUser {
  id: string;
  role?: string;
}

/**
 * 从请求中提取并验证用户身份。
 * 优先读 Authorization: Bearer <token>，fallback 到 cookie grandkidsgo_token。
 * 验证 JWT 签名与过期时间，返回 { id, role } 或 null。
 *
 * accessToken（15min）与 syncToken/grandkidsgo_token（7d）均用同一 secret 签发，
 * 二者都能通过验证；cookie fallback 保证 7 天内不因 sessionStorage 失效而 401。
 *
 * 生产环境未配置密钥时 fail-closed 返回 null（不静默用 dev secret）。
 */
export async function verifyAuth(req: NextRequest): Promise<AuthUser | null> {
  if (IS_PROD && !JWT_SECRET) {
    console.error('[verify-auth] 生产环境未配置 AUTH_SERVICE_JWT_SECRET/JWT_SECRET，拒绝请求');
    return null;
  }

  let token: string | null = null;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    token = req.cookies.get('grandkidsgo_token')?.value || null;
  }

  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!payload.sub) return null;
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
