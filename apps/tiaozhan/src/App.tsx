import { useState, useEffect, useCallback } from 'react'
import { navLinks } from '@shared/config/navLinks'
import Home from './pages/Home'
import QuizBattle from './pages/QuizBattle'
import LoginModal from './components/LoginModal'

type Page = 'home' | 'quiz'

interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
  children?: any[]
}

function getStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem('haodaer_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function getToken(): string | null {
  return sessionStorage.getItem('haodaer_token')
}

async function checkYouthMode(token: string): Promise<{ blocked: boolean; reason: string }> {
  try {
    const res = await fetch('/api/user/youth-mode/check', {
      headers: { Authorization: 'Bearer ' + token },
    })
    const d = await res.json()
    if (d.code === 'OK' && d.data.enabled && !d.data.allowed) {
      return { blocked: true, reason: d.data.reason || '当前时段无法使用' }
    }
  } catch {}
  return { blocked: false, reason: '' }
}

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [user, setUser] = useState<User | null>(getStoredUser())
  const [showLogin, setShowLogin] = useState(false)
  const [battleSettings, setBattleSettings] = useState<{ mode: 'solo' | 'online'; category: string; zone: string } | null>(null)
  const [roomTarget, setRoomTarget] = useState<string | null>(null)
  const [youthBlocked, setYouthBlocked] = useState(false)
  const [youthReason, setYouthReason] = useState('')
  const [youthLoading, setYouthLoading] = useState(true)

  // Check youth mode on mount
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setYouthLoading(false)
      return
    }
    checkYouthMode(token).then(r => {
      if (r.blocked) {
        setYouthBlocked(true)
        setYouthReason(r.reason)
      }
      setYouthLoading(false)
    })
  }, [])

  // Check auth with server via cookie (more reliable than client cookie reading)
  const checkServerAuth = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/check')
      const d = await r.json()
      if (d.code === 'OK' && d.data?.token) {
        sessionStorage.setItem('haodaer_token', d.data.token)
        sessionStorage.setItem('haodaer_user', JSON.stringify(d.data))
        setUser(d.data)
      }
    } catch {}
  }, [])

  useEffect(() => {
    // Try restoring from sessionStorage first (fast path)
    const stored = getStoredUser()
    const token = getToken()
    if (stored && token) {
      setUser(stored)
      return
    }

    // No sessionStorage auth → check with server via cookie
    checkServerAuth()
  }, [])

  // Periodic auth sync (every 5s)
  useEffect(() => {
    const interval = setInterval(() => {
      if (getToken()) return // already authenticated
      checkServerAuth()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Check for invite link: #join?room=ABCD-T1
    const hash = window.location.hash
    if (hash.startsWith('#join?room=')) {
      const code = hash.replace('#join?room=', '')
      setRoomTarget(code)
      history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page) {
        setPage(event.state.page as Page)
      } else {
        setPage('home')
      }
    }
    window.addEventListener('popstate', handlePopState)
    history.replaceState({ page: 'home' }, '')
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (p: Page) => {
    setPage(p)
    history.pushState({ page: p }, '')
  }

  const handleLogin = async (token: string, userData: User) => {
    sessionStorage.setItem('haodaer_token', token)
    sessionStorage.setItem('haodaer_user', JSON.stringify(userData))
    setUser(userData)

    // Check youth mode after login
    const ym = await checkYouthMode(token)
    if (ym.blocked) {
      setYouthBlocked(true)
      setYouthReason(ym.reason)
    }

    // Sync with tiaozhan server
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    } catch { /* ignore — local sync failure is non-critical */ }

    // If there's a pending room invite, auto-navigate to quiz
    if (roomTarget) {
      const target = roomTarget
      setRoomTarget(null)
      setBattleSettings({ mode: 'online', category: 'mixed', zone: '' })
      navigate('quiz')
    }
  }

  const startBattle = (mode: 'solo' | 'online', category: string, zone: string) => {
    if (!user || !getToken()) return
    setBattleSettings({ mode, category, zone })
    navigate('quiz')
  }

  const doSearch = () => {
    const inp = document.querySelector('.search-input') as HTMLInputElement
    if (inp?.value) window.location.href = "https://grandand.com/search?q=" + encodeURIComponent(inp.value)
  }

  // Get display name from active profile
  const displayName = (() => {
    if (!user) return ''
    try {
      const profile = localStorage.getItem('haodaer_active_profile')
      if (profile) {
        const p = JSON.parse(profile)
        return p.nickname
      }
    } catch {}
    return user.nickname || user.username || '用户'
  })()

  const displayAvatar = (() => {
    if (!user) return ''
    try {
      const profile = localStorage.getItem('haodaer_active_profile')
      if (profile) {
        const p = JSON.parse(profile)
        return p.avatar
      }
    } catch {}
    return user.avatar
  })()

  if (youthLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (youthBlocked) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', maxWidth: 360, padding: '40px 24px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⏰</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>青少年模式</h2>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, margin: '0 0 8px' }}>{youthReason}</p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>请家长登录个人中心调整设置，或明天再来</p>
          <a href="https://grandand.com" style={{ display: 'inline-block', padding: '10px 24px', background: '#2563eb', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>← 返回首页</a>
        </div>
      </div>
    )
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="header-left">
            <a href="https://grandand.com" className="logo">童慧行</a>
            <form className="header-search" onSubmit={(e) => { e.preventDefault(); doSearch(); }}>
              <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" onClick={doSearch}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input placeholder="搜索" className="search-input" />
            </form>
          </div>
          <div className="header-right">
            <div className="header-links">
              {navLinks.filter(l => !l.hidden).map(link => (
                <a key={link.label} href={link.href} className="header-link">{link.icon} {link.label}</a>
              ))}
            </div>
            <div className="header-auth">
              {user && getToken() ? (
                <>
                  <span className="header-user" onClick={() => window.location.href = 'https://grandand.com/personal-center'}>
                    {displayAvatar && <span className="header-avatar">{displayAvatar}</span>}
                    <span>{displayName}</span>
                  </span>
                  <button className="header-logout" onClick={() => {
                    sessionStorage.removeItem('haodaer_token')
                    sessionStorage.removeItem('haodaer_user')
                    document.cookie = 'haodaer_token=; path=/; domain=.grandand.com; max-age=0'
                    window.location.href = 'https://grandand.com'
                  }}>退出</button>
                </>
              ) : (
                <button className="header-login" onClick={() => setShowLogin(true)}>登录 / 注册</button>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="app">
        {page === 'home' && (
          <Home user={user} onLogin={handleLogin} onStart={startBattle} roomTarget={roomTarget} onShowLogin={() => setShowLogin(true)} />
        )}
        {page === 'quiz' && user && battleSettings && (
          <QuizBattle user={{ id: user.id, username: displayName, token: getToken() || '' }} onBack={() => navigate('home')} initialMode={battleSettings.mode} initialCategory={battleSettings.category} initialRoomTarget={roomTarget || undefined} />
        )}
      </div>
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onLogin={handleLogin} />
    </>
  )
}
