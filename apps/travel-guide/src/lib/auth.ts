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
