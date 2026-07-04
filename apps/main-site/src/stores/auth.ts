import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getToken, setToken, getUser, setUser,
  removeToken, removeUser, isLoggedIn as checkLoggedIn,
  getIsNewUser, setIsNewUser, logout as authLogout,
  phoneLogin as apiPhoneLogin,
  usernameLogin as apiUsernameLogin,
  usernameRegister as apiUsernameRegister,
  fetchUser as apiFetchUser,
} from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(getUser())
  const token = ref<string | null>(getToken())

  const isLoggedIn = computed(() => !!token.value)
  const isNewUser = computed(() => getIsNewUser())

  function setAuth(t: string, u: any, isNew: boolean, syncToken?: string) {
    token.value = t
    user.value = u
    setToken(t, syncToken)
    setUser(u)
    setIsNewUser(isNew)
  }

  async function phoneLogin(phone: string, code: string, extra?: Record<string, any>) {
    const d = await apiPhoneLogin(phone, code, extra)
    if (d.code === 'OK') {
      setAuth(d.data.accessToken, d.data.user, d.data.isNewUser, d.data.syncToken)
    }
    return d
  }

  async function usernameLogin(username: string, password: string) {
    const d = await apiUsernameLogin(username, password)
    if (d.code === 'OK') {
      setAuth(d.data.accessToken, d.data.user, false, d.data.syncToken)
    }
    return d
  }

  async function usernameRegister(data: { username: string; password: string }) {
    const d = await apiUsernameRegister(data)
    if (d.code === 'OK') {
      setAuth(d.data.accessToken, d.data.user, true, d.data.syncToken)
    }
    return d
  }

  async function refreshUser() {
    const u = await apiFetchUser()
    if (u) {
      user.value = u
      setUser(u)
    }
    return u
  }

  function logout() {
    token.value = null
    user.value = null
    authLogout()
  }

  return {
    user, token, isLoggedIn, isNewUser,
    setAuth, phoneLogin, usernameLogin, usernameRegister, refreshUser, logout,
  }
})
