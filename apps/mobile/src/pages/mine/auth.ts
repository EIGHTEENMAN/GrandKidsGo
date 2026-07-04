// Mobile app auth utilities
const STORAGE_KEYS = {
  TOKEN: 'grandkidsgo_token',
  USER: 'grandkidsgo_user',
  NEW_USER: 'grandkidsgo_new_user',
  PROFILE: 'grandkidsgo_active_profile',
}

export function getToken(): string {
  return uni.getStorageSync(STORAGE_KEYS.TOKEN) || ''
}

export function getUser(): any {
  const stored = uni.getStorageSync(STORAGE_KEYS.USER)
  if (!stored) return null
  try { return JSON.parse(stored) } catch { return null }
}

export function setToken(token: string) {
  uni.setStorageSync(STORAGE_KEYS.TOKEN, token)
}

export function setUser(user: any) {
  uni.setStorageSync(STORAGE_KEYS.USER, JSON.stringify(user))
}

export function logout() {
  uni.removeStorageSync(STORAGE_KEYS.TOKEN)
  uni.removeStorageSync(STORAGE_KEYS.USER)
  uni.removeStorageSync(STORAGE_KEYS.NEW_USER)
  uni.removeStorageSync(STORAGE_KEYS.PROFILE)
}

export async function loginWithPhone(phone: string, code: string): Promise<any> {
  const res = await uni.request({
    url: 'https://grandand.com/api/auth/phone-login',
    method: 'POST',
    data: { phone, code },
  })
  const d = res.data as any
  if (d.code === 'OK') {
    setToken(d.data.token)
    setUser(d.data.user)
    return d.data
  }
  throw new Error(d.message || '登录失败')
}

export async function sendCode(phone: string): Promise<void> {
  const res = await uni.request({
    url: 'https://grandand.com/api/auth/send-code',
    method: 'POST',
    data: { phone },
  })
  const d = res.data as any
  if (d.code !== 'OK') throw new Error(d.message || '发送失败')
}
