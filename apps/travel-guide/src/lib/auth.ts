'use client';

const TOKEN_KEY = 'grandkidsgo_token';
const USER_KEY = 'grandkidsgo_user';
const NEW_USER_KEY = 'grandkidsgo_isNewUser';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const t = sessionStorage.getItem(TOKEN_KEY);
  const c = getCookie(TOKEN_KEY);
  // 跨子域登出同步：sessionStorage 有 token 但共享 cookie 已被清除（在别的子站退出了）
  if (t && !c) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    return null;
  }
  if (t) return t;
  if (c) {
    sessionStorage.setItem(TOKEN_KEY, c);
    return c;
  }
  return null;
}

export function setToken(token: string, syncToken?: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  document.cookie = 'grandkidsgo_token=' + encodeURIComponent(syncToken || token) + '; domain=.grandand.com; path=/; Secure; SameSite=Lax';
}

export function removeToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  document.cookie = 'grandkidsgo_token=; domain=.grandand.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function getUser(): any | null {
  if (typeof window === 'undefined') return null;
  // token 失效（cookie 被清）时 user 也应失效
  if (!getToken()) {
    sessionStorage.removeItem(USER_KEY);
    return null;
  }
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user: any) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUser() {
  sessionStorage.removeItem(USER_KEY);
}

/**
 * 检测跨子域登录态变化（在别的子站登出后，本站 cookie 被清但 sessionStorage 可能还有缓存）
 * 在 visibilitychange / pageshow 时调用，返回当前是否仍登录。
 * 如果检测到登出，会清理 sessionStorage 并派发 'auth:sync-logout' 事件供 UI 更新。
 */
export function checkAuthSync(): boolean {
  if (typeof window === 'undefined') return false;
  const wasLoggedIn = !!sessionStorage.getItem(TOKEN_KEY);
  const stillLoggedIn = !!getToken();
  if (wasLoggedIn && !stillLoggedIn) {
    sessionStorage.removeItem(USER_KEY);
    window.dispatchEvent(new CustomEvent('auth:sync-logout'));
  }
  return stillLoggedIn;
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function getIsNewUser(): boolean {
  return localStorage.getItem(NEW_USER_KEY) === 'true';
}

export function setIsNewUser(val: boolean) {
  if (val) localStorage.setItem(NEW_USER_KEY, 'true');
  else localStorage.removeItem(NEW_USER_KEY);
}

export async function fetchUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      // accessToken 过期，清 sessionStorage 让 getToken() fallback 读 cookie 的 syncToken（7d）
      // syncToken 与 accessToken 的 JWT payload 相同、verifyAccessToken 不区分 type，可直接用于 /me
      sessionStorage.removeItem(TOKEN_KEY);
      const cookieToken = getCookie(TOKEN_KEY);
      if (!cookieToken || cookieToken === token) return null;
      const retry = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${cookieToken}` },
      });
      const d2 = await retry.json();
      if (d2.code === 'OK') {
        sessionStorage.setItem(TOKEN_KEY, cookieToken);
        setUser(d2.data);
        return d2.data;
      }
      return null;
    }
    const d = await res.json();
    if (d.code === 'OK') {
      setUser(d.data);
      return d.data;
    }
    return null;
  } catch {
    return null;
  }
}

export function logout() {
  // 调 auth-service /logout 清共享 cookie（domain=.grandand.com），影响所有子站
  fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).catch(() => {});
  removeToken();
  removeUser();
  setIsNewUser(false);
}

/**
 * 走天下统一鉴权 fetch helper
 * - 自动从 sessionStorage/cookie 取 Bearer token
 * - 401 时自动清 token 并触发自定义事件，调用方可监听 'auth:logout' 跳登录
 * - 后端用 verifyAuth(req) 验证 JWT 签名（src/lib/verify-auth.ts）
 */
export interface AuthedFetchOptions extends RequestInit {
  userId?: string;
}

export async function authedFetch(url: string, opts: AuthedFetchOptions = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers['authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401 && typeof window !== 'undefined') {
    // 触发全局事件，Header/页面可监听跳转登录
    window.dispatchEvent(new CustomEvent('auth:logout'));
    removeToken();
    removeUser();
  }
  return res;
}
