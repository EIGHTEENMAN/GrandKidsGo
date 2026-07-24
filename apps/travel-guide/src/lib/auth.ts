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
  if (t) return t;
  const c = getCookie(TOKEN_KEY);
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
  removeToken();
  removeUser();
  setIsNewUser(false);
}

/**
 * 走天下统一鉴权 fetch helper（批次1 P0 修复 2）
 * - 自动从 sessionStorage/cookie 取 Bearer token
 * - 同时附带 x-debug-user-id（向后兼容老 route 内部从 header 取 userId）
 * - 401 时自动清 token 并触发自定义事件，调用方可监听 'auth:logout' 跳登录
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
  if (opts.userId) headers['x-debug-user-id'] = opts.userId;
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401 && typeof window !== 'undefined') {
    // 触发全局事件，Header/页面可监听跳转登录
    window.dispatchEvent(new CustomEvent('auth:logout'));
    removeToken();
    removeUser();
  }
  return res;
}
