import { ref } from 'vue'
import { getCookie, setCookie, removeCookie } from './cookie'

interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
}

export function isLoggedIn(): boolean {
  return !!sessionStorage.getItem('grandkidsgo_user')
}

export function getUser(): User | null {
  try {
    const d = sessionStorage.getItem('grandkidsgo_user')
    return d ? JSON.parse(d) : null
  } catch {
    return null
  }
}

export function getIsNewUser(): boolean {
  return localStorage.getItem('grandkidsgo_new_user') === 'true'
}

export function setUser(u: User) {
  sessionStorage.setItem('grandkidsgo_user', JSON.stringify(u))
}

export function useAuth() {
  // Cross-subdomain sync: try cookie if localStorage is empty
  let storedToken = sessionStorage.getItem('grandkidsgo_token')
  let storedUser = getUser()
  if (!storedToken) {
    const cookieToken = getCookie('grandkidsgo_token')
    if (cookieToken) {
      storedToken = cookieToken
      sessionStorage.setItem('grandkidsgo_token', cookieToken)
      // Async fetch user data from cookie-identified session
      fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + cookieToken }
      }).then(r => r.json()).then(d => {
        if (d.code === 'OK') {
          sessionStorage.setItem('grandkidsgo_user', JSON.stringify(d.data))
          user.value = d.data
        }
      }).catch(() => {})
    }
  }

  const token = ref(storedToken || '')
  const user = ref<User | null>(storedUser)

  function login(t: string, u: User) {
    token.value = t
    user.value = u
    sessionStorage.setItem('grandkidsgo_token', t)
    sessionStorage.setItem('grandkidsgo_user', JSON.stringify(u))
    setCookie('grandkidsgo_token', t)
  }

  function logout() {
    token.value = ''
    user.value = null
    sessionStorage.removeItem('grandkidsgo_token')
    sessionStorage.removeItem('grandkidsgo_user')
    removeCookie('grandkidsgo_token')
  }

  return { token, user, login, logout }
}
