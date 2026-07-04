const TOKEN_KEY = 'grandkidsgo_token'
const USER_KEY = 'grandkidsgo_user'
const NEW_USER_KEY = 'grandkidsgo_isNewUser'
const ACTIVE_PROFILE_KEY = 'grandkidsgo_active_profile'
const AUTH_SERVICE = 'http://localhost:3007'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[1]) : null
}

export function getToken(): string | null {
  const t = sessionStorage.getItem(TOKEN_KEY)
  if (t) return t
  const c = getCookie(TOKEN_KEY)
  if (c) {
    sessionStorage.setItem(TOKEN_KEY, c)
    return c
  }
  return null
}

export function setToken(token: string, syncToken?: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
  document.cookie = 'grandkidsgo_token=' + encodeURIComponent(syncToken || token) + '; domain=.grandand.com; path=/; Secure; SameSite=Lax'
}

export function removeToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  document.cookie = 'grandkidsgo_token=; domain=.grandand.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export function getUser(): any | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setUser(user: any) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeUser() {
  sessionStorage.removeItem(USER_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function getIsNewUser(): boolean {
  return localStorage.getItem(NEW_USER_KEY) === 'true'
}

export function setIsNewUser(val: boolean) {
  if (val) localStorage.setItem(NEW_USER_KEY, 'true')
  else localStorage.removeItem(NEW_USER_KEY)
}

export function logout() {
  removeToken()
  removeUser()
  setIsNewUser(false)
  localStorage.removeItem(ACTIVE_PROFILE_KEY)
}

// Active profile (which person is currently displayed)
export function getActiveProfile(): any | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function setActiveProfile(profile: any) {
  if (profile) localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(profile))
  else localStorage.removeItem(ACTIVE_PROFILE_KEY)
}

export function getDisplayName(): string {
  const profile = getActiveProfile()
  if (profile) return profile.nickname || '用户'
  const user = getUser()
  return user?.nickname || user?.username || '用户'
}

// API calls
export async function sendCode(phone: string) {
  const res = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, purpose: 'login' }),
  })
  return res.json()
}

export async function phoneLogin(phone: string, code: string, extra?: Record<string, any>) {
  const res = await fetch('/api/auth/phone-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code, ...extra }),
  })
  return res.json()
}

export async function usernameLogin(username: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.json()
}

export async function usernameRegister(data: { username: string; password: string }) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function fetchUser() {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const d = await res.json()
    if (d.code === 'OK') {
      setUser(d.data)
      return d.data
    }
    return null
  } catch {
    return null
  }
}

export async function saveProfile(data: { nickname: string; avatar?: string }) {
  const token = getToken()
  const res = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function addChild(data: { nickname: string; gender?: string; birthday?: string; avatar?: string; phone?: string }) {
  const token = getToken()
  const res = await fetch('/api/user/children', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getChildren() {
  const token = getToken()
  const res = await fetch('/api/user/children', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function deleteChild(id: string) {
  const token = getToken()
  const res = await fetch('/api/user/children/' + id, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function updateChild(id: string, data: { nickname?: string; gender?: string; birthday?: string; avatar?: string; phone?: string }) {
  const token = getToken()
  const res = await fetch('/api/user/children/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

// ─── Game Data Sync ────────────────────────────────────────

export async function updateGameData(childId: string, data: { gameLevel?: number; gameScore?: number }) {
  const token = getToken()
  const res = await fetch('/api/user/children/' + childId + '/game-data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateChallengePoints(childId: string, challengePoints: number) {
  const token = getToken()
  const res = await fetch('/api/user/children/' + childId + '/challenge-points', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ challengePoints }),
  })
  return res.json()
}

export async function getRanking(childId: string) {
  const token = getToken()
  const res = await fetch('/api/user/ranking?childId=' + encodeURIComponent(childId), {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

// ─── Learning Progress ─────────────────────────────────────

export async function getLearningProgress(childId?: string) {
  const token = getToken()
  const url = childId ? '/api/user/learning-progress?childId=' + encodeURIComponent(childId) : '/api/user/learning-progress'
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  return res.json()
}

export async function updateLearningProgress(data: { childId: string; subject: string; itemsLearned?: number; timeSpentMinutes?: number; accuracy?: number }) {
  const token = getToken()
  const res = await fetch('/api/user/learning-progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

// ─── Child Independent Password ──────────────────────────────

export async function setChildPassword(childId: string, password: string) {
  const token = getToken()
  const res = await fetch('/api/user/children/set-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ childId, password }),
  })
  return res.json()
}

export async function getLearningSummary() {
  const token = getToken()
  const res = await fetch('/api/user/learning-progress/summary', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function deleteAccount() {
  const token = getToken()
  const res = await fetch('/api/user/account', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}
