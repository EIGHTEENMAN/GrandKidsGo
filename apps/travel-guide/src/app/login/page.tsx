'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('请填写用户名和密码'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json();
      if (d.code === 'OK') {
        sessionStorage.setItem('haodaer_token', d.data.token);
        sessionStorage.setItem('haodaer_user', JSON.stringify(d.data.user));
        document.cookie = 'haodaer_token=' + encodeURIComponent(d.data.token) + '; domain=.grandand.com; path=/; Secure; SameSite=Lax';
        router.push(redirect);
      } else {
        setError(d.message || '登录失败');
      }
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="text-green-600 hover:text-green-800 text-sm mb-6 block">← 返回首页</Link>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">登录</h1>
        <p className="text-sm text-gray-500 mb-6">登录童慧行走天下</p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500" placeholder="请输入用户名" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500" placeholder="请输入密码" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500 text-center">
          还没有账号？<Link href={`/register${redirect !== '/' ? `?redirect=${redirect}` : ''}`} className="text-green-600 hover:text-green-800">注册</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-gray-400">加载中...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
