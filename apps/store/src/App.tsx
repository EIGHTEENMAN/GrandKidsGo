import { useState, useEffect } from 'react'
import { navLinks } from '@shared/config/navLinks'
import LoginModal from './components/LoginModal'

interface Product { id: string; name: string; description: string; category: string; price: number; image: string; stock: number }
interface UserItem { product_id: string; quantity: number; name: string; category: string; image: string }
interface Order { id: string; product_id: string; product_name: string; image: string; quantity: number; points_spent: number; status: string; created_at: string }

function getStoredUser(): { id: string; username: string; nickname?: string; avatar?: string } | null {
  try {
    const raw = sessionStorage.getItem('haodaer_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function getToken(): string | null {
  return sessionStorage.getItem('haodaer_token')
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function getDisplayName(): string {
  const stored = getStoredUser()
  if (!stored) return ''
  try {
    const profile = localStorage.getItem('haodaer_active_profile')
    if (profile) {
      const p = JSON.parse(profile)
      return p.nickname || stored.nickname || stored.username
    }
  } catch {}
  return stored.nickname || stored.username || '用户'
}

function api(url: string, options?: RequestInit) {
  return fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers as any } })
}

function App() {
  const [user, setUser] = useState<{ id: string; username: string; token: string } | null>(null)
  const [points, setPoints] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<UserItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<'shop' | 'inventory' | 'history'>('shop')
  const [category, setCategory] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [loading, setLoading] = useState('')

  useEffect(() => {
    api('/api/products').then(r => r.json()).then(setProducts).catch(() => {})
    history.replaceState({ tab: 'shop' }, '')

    async function autoLogin() {
      let stored = getStoredUser()
      let token = getToken()

      // Cross-app auth sync: check cookie if no localStorage
      if (!token) {
        const cookieToken = getCookie('haodaer_token')
        if (cookieToken) {
          sessionStorage.setItem('haodaer_token', cookieToken)
          token = cookieToken
          try {
            const r = await fetch('/api/auth/me', {
              headers: { 'Authorization': 'Bearer ' + cookieToken }
            })
            const d = await r.json()
            if (d.code === 'OK') {
              sessionStorage.setItem('haodaer_user', JSON.stringify(d.data))
              stored = d.data
            }
          } catch {}
        }
      }

      if (stored && token) {
        const username = getDisplayName()
        try {
          const r = await api('/api/auth', {
            method: 'POST',
            body: JSON.stringify({ userId: stored.id, username })
          })
          const d = await r.json()
          setUser({ id: stored.id, username, token: d.token })
          if (d.points !== undefined) setPoints(d.points)
        } catch {}
      }
    }

    autoLogin()
  }, [])

  // Browser navigation: popstate listener for tab switching
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setTab(event.state.tab)
      } else {
        setTab('shop')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const switchTab = (t: 'shop' | 'inventory' | 'history') => {
    history.pushState({ tab: t }, '')
    setTab(t)
  }

  const fetchUserData = async () => {
    if (!user) return
    const r = await api('/api/user', { headers: { 'Authorization': `Bearer ${user.token}` } })
    const d = await r.json()
    setPoints(d.user.points)
    setItems(d.items || [])
    setOrders(d.orders || [])
  }

  useEffect(() => { if (user) fetchUserData() }, [user])

  const handleLogin = async (_token: string, userData: any) => {
    const stored = getStoredUser()
    const token = getToken()
    if (stored && token) {
      const username = getDisplayName()
      try {
        const r = await api('/api/auth', {
          method: 'POST', body: JSON.stringify({ userId: stored.id, username }),
        })
        const d = await r.json()
        setUser({ id: stored.id, username, token: d.token })
        setPoints(d.points)
        fetchUserData()
      } catch {}
    }
  }

  const handleRedeem = async (productId: string) => {
    if (!user || loading) return
    setLoading(productId)
    const r = await api('/api/redeem', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user.token}` },
      body: JSON.stringify({ productId }),
    })
    const d = await r.json()
    if (d.error) { alert(d.error); setLoading(''); return }
    setPoints(d.points_left)
    await fetchUserData()
    setLoading('')
  }

  const categories = [...new Set(products.map(p => p.category))]
  const filtered = category ? products.filter(p => p.category === category) : products

  const owned = (productId: string) => items.some(i => i.product_id === productId)

  return (
    <>
      <header className="store-header">
        <div className="store-header-inner">
          <div className="store-header-left">
            <a href="https://grandand.com" className="store-logo">童慧行</a>
            <form className="store-search" onSubmit={(e) => { e.preventDefault(); const inp = document.querySelector(".store-search-input") as HTMLInputElement; if(inp?.value) window.location.href = "https://grandand.com/search?q=" + encodeURIComponent(inp.value); }}>
              <svg className="store-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" onClick={() => { const inp = document.querySelector(".store-search-input") as HTMLInputElement; if(inp?.value) window.location.href = "https://grandand.com/search?q=" + encodeURIComponent(inp.value); }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input placeholder="搜索" className="store-search-input" />
            </form>
          </div>
          <div className="store-header-right">
            <div className="store-header-links">
              {navLinks.filter(l => !l.hidden).map(link => (
                <a key={link.label} href={link.href} className="store-header-link">{link.icon} {link.label}</a>
              ))}
            </div>
            <div className="store-header-auth">
              {user && <span className="points-badge">⭐ {points} 积分</span>}
              {!user ? (
                <button className="btn btn-primary btn-sm" onClick={() => setShowLogin(true)} style={{ border: 'none', cursor: 'pointer' }}>登录 / 注册</button>
              ) : (
                <span className="username">{user.username}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="app">

      {user && (
        <div className="tabs">
          {(['shop', 'inventory', 'history'] as const).map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => switchTab(t)}>
              {t === 'shop' ? '🛒 商品' : t === 'inventory' ? '🎒 我的物品' : '📜 兑换记录'}
            </button>
          ))}
        </div>
      )}

      {tab === 'shop' && (
        <>
          <div className="categories">
            <button className={`cat-chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>全部</button>
            {categories.map(c => (
              <button key={c} className={`cat-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>

          <div className="product-grid">
            {filtered.map(p => (
              <div key={p.id} className="product-card">
                <div className="product-image">{p.image}</div>
                <div className="product-name">{p.name}</div>
                <div className="product-desc">{p.description}</div>
                <div className="product-footer">
                  <span className="product-price">⭐ {p.price}</span>
                  {user && (
                    owned(p.id) ? <span className="owned-badge">已拥有</span>
                    : <button className="btn btn-primary btn-sm" disabled={loading === p.id}
                      onClick={() => handleRedeem(p.id)}>
                      {loading === p.id ? '兑换中...' : '兑换'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!user && <p className="login-prompt">请登录后兑换商品</p>}
        </>
      )}

      {tab === 'inventory' && (
        <div>
          {items.length === 0 ? <p className="empty-state">还没有兑换过任何物品</p> : (
            <div className="product-grid">
              {items.map(i => (
                <div key={i.product_id} className="product-card">
                  <div className="product-image">{i.image}</div>
                  <div className="product-name">{i.name}</div>
                  <div className="product-desc">{i.category}</div>
                  <div className="product-footer">
                    <span className="product-price">×{i.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {orders.length === 0 ? <p className="empty-state">还没有兑换记录</p> : (
            <div className="order-list">
              {orders.map(o => (
                <div key={o.id} className="order-item">
                  <span className="order-image">{o.image}</span>
                  <div className="order-info">
                    <div className="order-name">{o.product_name}</div>
                    <div className="order-meta">×{o.quantity} · {o.created_at?.slice(0, 10)}</div>
                  </div>
                  <span className="order-price">-⭐{o.points_spent}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onLogin={handleLogin} />
    </>
  )
}

export default App
