import { useState, useEffect, useRef } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onLogin: (token: string, user: any) => void
}

function setAuthCookie(token: string) {
  document.cookie = 'haodaer_token=' + encodeURIComponent(token) + '; domain=.grandand.com; path=/; Secure; SameSite=Lax'
}

export default function LoginModal({ open, onClose, onLogin }: Props) {
  const [authTab, setAuthTab] = useState<'phone' | 'password'>('phone')
  const [passwordMode, setPasswordMode] = useState<'login' | 'register'>('login')

  // Terms agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Phone login state
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  // Password login/register state
  const [pwdUsername, setPwdUsername] = useState('')
  const [pwdPassword, setPwdPassword] = useState('')
  const [pwdConfirmPassword, setPwdConfirmPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setPhone(''); setCode(''); setAgreedToTerms(false)
      setError(''); setCountdown(0); clearInterval(timerRef.current)
      setPwdUsername(''); setPwdPassword(''); setPwdConfirmPassword('')
      setAuthTab('phone'); setPasswordMode('login')
    }
  }, [open])

  useEffect(() => () => clearInterval(timerRef.current), [])

  const startCountdown = () => {
    setCountdown(60)
    timerRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current); return 0 }; return prev - 1 })
    }, 1000)
  }

  const sendCode = async () => {
    if (phone.length < 11) { setError('请输入正确的手机号'); return }
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'login' }),
      })
      const d = await r.json()
      if (d.code === 'OK') startCountdown()
      else setError(d.message || '发送失败')
    } catch { setError('网络错误') }
    finally { setLoading(false) }
  }

  const doLogin = async () => {
    if (!phone || !code) { setError('请填写手机号和验证码'); return }
    if (!agreedToTerms) { setError('请阅读并同意服务条款'); return }
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/phone-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const d = await r.json()
      if (d.code === 'OK') {
        const { accessToken, syncToken, user } = d.data
        sessionStorage.setItem('haodaer_token', accessToken)
        sessionStorage.setItem('haodaer_user', JSON.stringify(user))
        if (d.data.isNewUser) localStorage.setItem('haodaer_isNewUser', '1')
        setAuthCookie(syncToken || accessToken)
        onLogin(accessToken, user)
        onClose()
      } else setError(d.message || '登录失败')
    } catch { setError('网络错误') }
    finally { setLoading(false) }
  }

  const doUsernameLogin = async () => {
    if (!pwdUsername || !pwdPassword) { setError('请填写用户名和密码'); return }
    setPwdLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: pwdUsername, password: pwdPassword }),
      })
      const d = await r.json()
      if (d.code === 'OK') {
        const { accessToken, syncToken, user } = d.data
        sessionStorage.setItem('haodaer_token', accessToken)
        sessionStorage.setItem('haodaer_user', JSON.stringify(user))
        if (d.data.isNewUser) localStorage.setItem('haodaer_isNewUser', '1')
        setAuthCookie(syncToken || accessToken)
        onLogin(accessToken, user)
        onClose()
      } else setError(d.message || '登录失败')
    } catch { setError('网络错误') }
    finally { setPwdLoading(false) }
  }

  const doUsernameRegister = async () => {
    if (!pwdUsername || !pwdPassword) { setError('请填写用户名和密码'); return }
    if (pwdUsername.length < 2) { setError('用户名至少2个字符'); return }
    if (pwdPassword.length < 6) { setError('密码至少6位'); return }
    if (pwdPassword !== pwdConfirmPassword) { setError('两次密码输入不一致'); return }
    if (!agreedToTerms) { setError('请阅读并同意服务条款'); return }
    setPwdLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: pwdUsername, password: pwdPassword }),
      })
      const d = await r.json()
      if (d.code === 'OK') {
        const { accessToken, syncToken, user } = d.data
        sessionStorage.setItem('haodaer_token', accessToken)
        sessionStorage.setItem('haodaer_user', JSON.stringify(user))
        if (d.data.isNewUser) localStorage.setItem('haodaer_isNewUser', '1')
        setAuthCookie(syncToken || accessToken)
        onLogin(accessToken, user)
        onClose()
      } else setError(d.message || '注册失败')
    } catch { setError('网络错误') }
    finally { setPwdLoading(false) }
  }

  if (!open) return null

  return (
    <div className="am-overlay" onClick={onClose}>
      <div className="am-modal" onClick={e => e.stopPropagation()}>
        <button className="am-close" onClick={onClose}>✕</button>
        <div className="am-body">
          <div className="am-left">
            <div className="am-left-desktop">
              <h2 className="am-title">扫码登录</h2>
              <div className="am-qr">
                <div className="am-qr-inner">
                  <div className="am-qr-icon">📷</div>
                  <p className="am-qr-text">扫码登录</p>
                </div>
              </div>
              <p className="am-qr-hint">打开 App 或微信扫一扫</p>
              <div className="am-methods">
                {[
                  { name: '童慧行 App', icon: '📱', desc: '打开童慧行 App 扫一扫' },
                  { name: '微信', icon: '💬', desc: '使用微信扫一扫' },
                ].map(m => (
                  <div key={m.name} className="am-method">
                    <span className="am-method-icon">{m.icon}</span>
                    <div>
                      <p className="am-method-name">{m.name}</p>
                      <p className="am-method-desc">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="am-right">
            {/* Mobile: compact OAuth row */}
            <div className="am-mobile-oauth">
              <span className="amo-label">一键登录</span>
              <button className="amo-btn amo-btn-wechat" onClick={() => window.location.href = '/api/oauth/wechat'}>💬 微信</button>
              <button className="amo-btn amo-btn-app">📱 童慧行 App</button>
            </div>
            {/* Tab Bar */}
            <div className="am-tabs">
              <button
                className={'am-tab' + (authTab === 'phone' ? ' am-tab-active' : '')}
                onClick={() => { setAuthTab('phone'); setError('') }}
              >手机验证</button>
              <button
                className={'am-tab' + (authTab === 'password' ? ' am-tab-active' : '')}
                onClick={() => { setAuthTab('password'); setError('') }}
              >账号密码</button>
            </div>

            {/* Phone Login */}
            {authTab === 'phone' && (
              <>
                <h2 className="am-title am-title-dark">手机号登录</h2>
                <p className="am-subtitle">输入手机号，验证后自动注册/登录</p>
                {error && <div className="am-error">{error}</div>}
                <div className="am-field">
                  <label className="am-label">手机号</label>
                  <input className="am-input" type="tel" maxLength={11} placeholder="请输入手机号"
                    value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    onKeyDown={e => e.key === 'Enter' && !code && sendCode()} />
                </div>
                <div className="am-field">
                  <label className="am-label">验证码</label>
                  <div className="am-code-row">
                    <input className="am-input am-code-input" type="text" maxLength={6}
                      placeholder="请输入验证码" value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={e => e.key === 'Enter' && phone.length >= 11 && doLogin()} />
                    <button className="am-code-btn" disabled={loading || countdown > 0} onClick={sendCode}>
                      {countdown > 0 ? `${countdown}s` : loading ? '发送中...' : '获取验证码'}
                    </button>
                  </div>
                </div>
                <label className="am-terms-checkbox">
                  <input type="checkbox" checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)} />
                  <span>我已阅读并同意 <a href="/legal/terms" target="_blank" className="am-terms-link">《服务条款》</a>和<a href="/legal/privacy" target="_blank" className="am-terms-link">《隐私政策》</a></span>
                </label>
                <button className="am-login-btn" disabled={loading} onClick={doLogin}>
                  {loading ? '处理中...' : '登录 / 注册'}
                </button>
              </>
            )}

            {/* Username/Password */}
            {authTab === 'password' && (
              <>
                <h2 className="am-title am-title-dark">账号密码登录</h2>
                <p className="am-subtitle">使用用户名和密码登录或注册新账号</p>
                {error && <div className="am-error">{error}</div>}

                {/* Login / Register sub-tab */}
                <div className="am-sub-tabs">
                  <button
                    className={'am-sub-tab' + (passwordMode === 'login' ? ' am-sub-tab-active' : '')}
                    onClick={() => { setPasswordMode('login'); setError('') }}
                  >登录</button>
                  <button
                    className={'am-sub-tab' + (passwordMode === 'register' ? ' am-sub-tab-active' : '')}
                    onClick={() => { setPasswordMode('register'); setError('') }}
                  >注册</button>
                </div>

                {/* Login mode */}
                {passwordMode === 'login' && (
                  <>
                    <div className="am-field">
                      <label className="am-label">用户名 / 手机号</label>
                      <input className="am-input" type="text" placeholder="请输入用户名或手机号"
                        value={pwdUsername} onChange={e => setPwdUsername(e.target.value)} />
                    </div>
                    <div className="am-field">
                      <label className="am-label">密码</label>
                      <input className="am-input" type="password" placeholder="请输入密码"
                        value={pwdPassword} onChange={e => setPwdPassword(e.target.value)} />
                    </div>
                    <button className="am-login-btn" disabled={pwdLoading} onClick={doUsernameLogin}>
                      {pwdLoading ? '处理中...' : '登录'}
                    </button>
                    <p className="am-toggle-mode" onClick={() => { setPasswordMode('register'); setError('') }}>
                      没有账号？去注册
                    </p>
                  </>
                )}

                {/* Register mode */}
                {passwordMode === 'register' && (
                  <>
                    <div className="am-field">
                      <label className="am-label">用户名</label>
                      <input className="am-input" type="text" placeholder="2-20个字符"
                        value={pwdUsername} onChange={e => setPwdUsername(e.target.value)} />
                    </div>
                    <div className="am-field">
                      <label className="am-label">密码</label>
                      <input className="am-input" type="password" placeholder="至少6位密码"
                        value={pwdPassword} onChange={e => setPwdPassword(e.target.value)} />
                    </div>
                    <div className="am-field">
                      <label className="am-label">确认密码</label>
                      <input className="am-input" type="password" placeholder="再次输入密码"
                        value={pwdConfirmPassword} onChange={e => setPwdConfirmPassword(e.target.value)} />
                    </div>
                    <label className="am-terms-checkbox">
                      <input type="checkbox" checked={agreedToTerms}
                        onChange={e => setAgreedToTerms(e.target.checked)} />
                      <span>我已阅读并同意 <a href="/legal/terms" target="_blank" className="am-terms-link">《服务条款》</a>和<a href="/legal/privacy" target="_blank" className="am-terms-link">《隐私政策》</a></span>
                    </label>
                    <button className="am-login-btn" disabled={pwdLoading} onClick={doUsernameRegister}>
                      {pwdLoading ? '处理中...' : '注册'}
                    </button>
                    <p className="am-toggle-mode" onClick={() => { setPasswordMode('login'); setError('') }}>
                      已有账号？去登录
                    </p>
                  </>
                )}
              </>
            )}

            <p className="am-terms" style={{ display: authTab === 'password' && passwordMode === 'register' ? 'none' : 'block' }}>
              登录即代表同意
              <a href="/legal/terms" target="_blank" className="am-terms-link">《服务条款》</a>和<a href="/legal/privacy" target="_blank" className="am-terms-link">《隐私政策》</a>
              · 支持<a href="/legal#youth" target="_blank" className="am-terms-link">青少年模式</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
