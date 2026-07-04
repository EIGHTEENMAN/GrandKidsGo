'use client';

import { useState, useEffect, useCallback } from 'react';
import { setToken, setUser, setIsNewUser } from '@/lib/auth';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onLogin: (user: any) => void;
  force?: boolean;
};

export default function AuthModal({ open, onClose, onLogin, force }: AuthModalProps) {
  // Phone login state
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password login/register state
  const [authTab, setAuthTab] = useState<'phone' | 'password'>('phone');
  const [passwordMode, setPasswordMode] = useState<'login' | 'register'>('login');
  const [pwdUsername, setPwdUsername] = useState('');
  const [pwdPassword, setPwdPassword] = useState('');
  const [pwdConfirmPassword, setPwdConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const sendCode = useCallback(async () => {
    if (!phone || phone.length < 11) { setError('请输入正确的手机号'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'login' }),
      });
      const d = await res.json();
      if (d.code === 'OK') {
        setCountdown(60);
      } else {
        setError(d.message || '发送失败');
      }
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  }, [phone]);

  const doPhoneLogin = useCallback(async () => {
    if (!phone || !code) { setError('请填写手机号和验证码'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const d = await res.json();
      if (d.code === 'OK') {
        setToken(d.data.accessToken, d.data.syncToken);
        setUser(d.data.user);
        if (d.data.isNewUser) setIsNewUser(true);
        else setIsNewUser(false);
        onLogin(d.data.user);
      } else {
        setError(d.message || '登录失败');
      }
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  }, [phone, code, onLogin]);

  const doUsernameLogin = useCallback(async () => {
    if (!pwdUsername || !pwdPassword) { setError('请填写用户名和密码'); return; }
    setError('');
    setPwdLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: pwdUsername, password: pwdPassword }),
      });
      const d = await res.json();
      if (d.code === 'OK') {
        setToken(d.data.accessToken, d.data.syncToken);
        setUser(d.data.user);
        setIsNewUser(false);
        onLogin(d.data.user);
      } else {
        setError(d.message || '登录失败');
      }
    } catch { setError('网络错误'); }
    finally { setPwdLoading(false); }
  }, [pwdUsername, pwdPassword, onLogin]);

  const doUsernameRegister = useCallback(async () => {
    if (!pwdUsername || !pwdPassword) { setError('请填写用户名和密码'); return; }
    if (pwdUsername.length < 2) { setError('用户名至少2个字符'); return; }
    if (pwdPassword.length < 6) { setError('密码至少6位'); return; }
    if (pwdPassword !== pwdConfirmPassword) { setError('两次密码输入不一致'); return; }
    setError('');
    setPwdLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: pwdUsername, password: pwdPassword }),
      });
      const d = await res.json();
      if (d.code === 'OK') {
        setToken(d.data.accessToken, d.data.syncToken);
        setUser(d.data.user);
        setIsNewUser(true);
        onLogin(d.data.user);
      } else {
        setError(d.message || '注册失败');
      }
    } catch { setError('网络错误'); }
    finally { setPwdLoading(false); }
  }, [pwdUsername, pwdPassword, pwdConfirmPassword, onLogin]);

  if (!open) return null;

  const scanMethods = [
    { name: '童慧行 App', icon: '📱', desc: '打开童慧行 App 扫一扫' },
    { name: '走天下 App', icon: '🧳', desc: '打开童慧行走天下 App 扫一扫' },
    { name: '微信', icon: '💬', desc: '使用微信扫一扫' },
  ];

  const tabClass = (tab: 'phone' | 'password') =>
    `flex-1 py-2.5 text-center text-sm font-medium border-b-2 transition-colors cursor-pointer ${
      authTab === tab
        ? 'text-green-600 border-green-600'
        : 'text-gray-400 border-transparent hover:text-gray-600'
    }`;

  const subTabClass = (mode: 'login' | 'register') =>
    `flex-1 py-1.5 text-center text-sm font-medium rounded-md transition-all cursor-pointer ${
      passwordMode === mode
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500 hover:text-gray-700'
    }`;

  const inputClass = "w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow";
  const btnClass = "w-full py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => !force && onClose()} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-fadeInUp">
        {!force && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
          >
            ✕
          </button>
        )}

        <div className="flex flex-col md:flex-row">
          {/* Left: QR Code (hidden on mobile) */}
          <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-green-500 to-indigo-600 p-8 flex-col items-center justify-center text-white">
            <h2 className="text-xl font-bold mb-6">扫码登录</h2>
            <div className="w-48 h-48 bg-white rounded-xl p-3 mb-4 flex items-center justify-center">
              <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-2">📷</div>
                  <p className="text-xs text-gray-400">扫码登录</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-white/80 mb-6">打开 App 或微信扫一扫</p>
            <div className="space-y-3 w-full">
              {scanMethods.map(m => (
                <div key={m.name} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2.5">
                  <span className="text-xl">{m.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-white/60">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Tabbed Forms */}
          <div className="md:w-1/2 p-4 md:p-6 flex flex-col justify-center">
            {/* Tab Bar */}
            <div className="flex mb-5 border-b border-gray-200">
              <button className={tabClass('phone')} onClick={() => { setAuthTab('phone'); setError(''); }}>
                手机验证
              </button>
              <button className={tabClass('password')} onClick={() => { setAuthTab('password'); setError(''); }}>
                账号密码
              </button>
            </div>

            {/* Phone Login Form */}
            {authTab === 'phone' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">手机号登录</h2>
                <p className="text-sm text-gray-500 mb-5">输入手机号，验证后自动注册/登录</p>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="请输入手机号"
                    className={inputClass}
                    maxLength={11}
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="请输入验证码"
                      className="flex-1 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                      maxLength={6}
                    />
                    <button
                      onClick={sendCode}
                      disabled={loading || countdown > 0}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {countdown > 0 ? `${countdown}s` : loading ? '发送中...' : '获取验证码'}
                    </button>
                  </div>
                </div>

                <button onClick={doPhoneLogin} disabled={loading} className={btnClass}>
                  {loading ? '处理中...' : '登录 / 注册'}
                </button>
              </>
            )}

            {/* Username/Password Form */}
            {authTab === 'password' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">账号密码登录</h2>
                <p className="text-sm text-gray-500 mb-5">使用用户名和密码登录或注册新账号</p>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

                {/* Login / Register sub-tab */}
                <div className="flex mb-4 bg-gray-100 rounded-lg p-0.5">
                  <button className={subTabClass('login')} onClick={() => { setPasswordMode('login'); setError(''); }}>
                    登录
                  </button>
                  <button className={subTabClass('register')} onClick={() => { setPasswordMode('register'); setError(''); }}>
                    注册
                  </button>
                </div>

                {/* Login mode */}
                {passwordMode === 'login' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">用户名 / 手机号</label>
                      <input
                        type="text"
                        value={pwdUsername}
                        onChange={e => setPwdUsername(e.target.value)}
                        placeholder="请输入用户名或手机号"
                        className={inputClass}
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                      <input
                        type="password"
                        value={pwdPassword}
                        onChange={e => setPwdPassword(e.target.value)}
                        placeholder="请输入密码"
                        className={inputClass}
                      />
                    </div>
                    <button onClick={doUsernameLogin} disabled={pwdLoading} className={btnClass}>
                      {pwdLoading ? '处理中...' : '登录'}
                    </button>
                    <p
                      className="mt-3 text-xs text-green-600 text-center cursor-pointer hover:underline"
                      onClick={() => { setPasswordMode('register'); setError(''); }}
                    >
                      没有账号？去注册
                    </p>
                  </>
                )}

                {/* Register mode */}
                {passwordMode === 'register' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                      <input
                        type="text"
                        value={pwdUsername}
                        onChange={e => setPwdUsername(e.target.value)}
                        placeholder="2-20个字符"
                        className={inputClass}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                      <input
                        type="password"
                        value={pwdPassword}
                        onChange={e => setPwdPassword(e.target.value)}
                        placeholder="至少6位密码"
                        className={inputClass}
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                      <input
                        type="password"
                        value={pwdConfirmPassword}
                        onChange={e => setPwdConfirmPassword(e.target.value)}
                        placeholder="再次输入密码"
                        className={inputClass}
                      />
                    </div>
                    <button onClick={doUsernameRegister} disabled={pwdLoading} className={btnClass}>
                      {pwdLoading ? '处理中...' : '注册'}
                    </button>
                    <p
                      className="mt-3 text-xs text-green-600 text-center cursor-pointer hover:underline"
                      onClick={() => { setPasswordMode('login'); setError(''); }}
                    >
                      已有账号？去登录
                    </p>
                  </>
                )}
              </>
            )}

            <p className="mt-4 text-xs text-gray-400 text-center">
              登录即代表同意{' '}
              <a href="/legal/terms" target="_blank" className="text-green-600 hover:underline">《服务条款》</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
