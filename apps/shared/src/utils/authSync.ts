// ─── Shared Cross-App Auth Sync ─────────────────────────────────
//
// Framework-agnostic utility that ALL sub-apps use for login sync.
// Cookie is the truth; sessionStorage is the per-tab cache.
//
// Usage (Vue):    import { ... } from '@shared/utils/authSync'
// Usage (React):  import { ... } from '@shared/utils/authSync'
//
// Known apps that consume this module are configured with a Vite alias:
//   resolve: { alias: { '@shared': path.resolve(__dirname, '../shared/src') } }

const TOKEN_KEY = 'grandkidsgo_token'
const USER_KEY = 'grandkidsgo_user'
const NEW_USER_KEY = 'grandkidsgo_isNewUser'
const COOKIE_NAME = 'grandkidsgo_token'
const COOKIE_DOMAIN = '.grandand.com'

// ── Cookie helpers (vanilla, no library) ───────────────────────

export function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[1]) : null
}

export function setCookie(name: string, value: string) {
  document.cookie =
    name + '=' + encodeURIComponent(value) +
    '; domain=' + COOKIE_DOMAIN +
    '; path=/; Secure; SameSite=Lax'
}

export function removeCookie(name: string) {
  document.cookie =
    name + '=; domain=' + COOKIE_DOMAIN +
    '; path=/; Secure; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

// ── Token helpers ───────────────────────────────────────────────

export function getToken(): string | null {
  const t = sessionStorage.getItem(TOKEN_KEY)
  if (t) return t
  // Cookie fallback — covers cross-app sync when arriving from another subdomain
  const c = getCookie(COOKIE_NAME)
  if (c) {
    sessionStorage.setItem(TOKEN_KEY, c)
    return c
  }
  return null
}

/** Write token to sessionStorage AND the shared cross-app cookie.
 *  Pass the long-lived syncToken as the 2nd arg when you have it.
 *  If omitted, the short-lived accessToken is written to the cookie
 *  (less ideal — syncToken is prefered for the 7-day TTL). */
export function setToken(token: string, syncToken?: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
  setCookie(COOKIE_NAME, syncToken || token)
}

export function removeToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  removeCookie(COOKIE_NAME)
}

// ── User helpers ────────────────────────────────────────────────

export interface UserData {
  id: string
  username: string
  nickname?: string
  avatar?: string
  children?: any[]
  [key: string]: any
}

export function getUser(): UserData | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function setUser(u: UserData) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(u))
}

export function removeUser() {
  sessionStorage.removeItem(USER_KEY)
}

// ── Auth state helpers ──────────────────────────────────────────

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function isNewUser(): boolean {
  return localStorage.getItem(NEW_USER_KEY) === 'true'
}

export function setIsNewUser(val: boolean) {
  if (val) localStorage.setItem(NEW_USER_KEY, 'true')
  else localStorage.removeItem(NEW_USER_KEY)
}

// ── Batch operations ────────────────────────────────────────────

/** Save auth state after login/register — writes both storage and cookie.
 *  Cookie is session-only (cleared on browser close). */
export function saveAuth(token: string, user: UserData, isNew: boolean, syncToken?: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  setIsNewUser(isNew)
  setCookie(COOKIE_NAME, syncToken || token)
}

/** Clear all auth state — called on logout. */
export function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
  localStorage.removeItem(NEW_USER_KEY)
  removeCookie(COOKIE_NAME)
}

/** Attempt to restore auth from cookie (cross-app sync).
 *  Call this once on app mount. Returns the token if restored, null otherwise. */
export async function syncAuthFromCookie(): Promise<string | null> {
  const already = getToken()
  if (already) return already

  const cookieToken = getCookie(COOKIE_NAME)
  if (!cookieToken) return null

  sessionStorage.setItem(TOKEN_KEY, cookieToken)

  try {
    const r = await fetch('/api/auth/me', {
      headers: { Authorization: 'Bearer ' + cookieToken }
    })
    const d = await r.json()
    if (d.code === 'OK') {
      sessionStorage.setItem(USER_KEY, JSON.stringify(d.data))
      return cookieToken
    }
  } catch { /* auth service may be unavailable — cookie still cached */ }

  return cookieToken
}
