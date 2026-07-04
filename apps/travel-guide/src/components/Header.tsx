'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isLoggedIn, getUser, logout, setUser } from '@/lib/auth';
import AuthModal from './AuthModal';
import ProfileSetup from './ProfileSetup';

export default function Header() {
  const [user, setLocalUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const isSearchPage = pathname?.startsWith('/search');

  const refreshUser = () => {
    setLocalUser(isLoggedIn() ? getUser() : null);
  };

  useEffect(() => {
    refreshUser();

    // Cross-domain auth sync: check cookie if no localStorage token
    if (!isLoggedIn()) {
      const match = document.cookie.match(new RegExp('(^| )haodaer_token=([^;]+)'));
      if (match) {
        const cookieToken = decodeURIComponent(match[2]);
        sessionStorage.setItem('haodaer_token', cookieToken);
        fetch('/api/auth/me', {
          headers: { Authorization: 'Bearer ' + cookieToken }
        })
        .then(r => r.json())
        .then(d => {
          if (d.code === 'OK') {
            sessionStorage.setItem('haodaer_user', JSON.stringify(d.data));
            setLocalUser(d.data);
          }
        })
        .catch(() => {});
      }
    }

    window.addEventListener('storage', refreshUser);
    const iv = setInterval(refreshUser, 3000);
    return () => {
      window.removeEventListener('storage', refreshUser);
      clearInterval(iv);
    };
  }, []);

  const handleLogin = (u: any) => {
    refreshUser();
    const isNew = localStorage.getItem('haodaer_isNewUser') === 'true';
    if (isNew && (!u.nickname || u.nickname.startsWith('user_'))) {
      setShowSetup(true);
    }
  };

  const handleLogout = () => {
    logout();
    setLocalUser(null);
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('haodaer_token')}` },
    }).then(r => r.json()).then(d => {
      if (d.code === 'OK') {
        setUser(d.data);
        setLocalUser(d.data);
      }
    }).catch(() => {});
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = '/search?q=' + encodeURIComponent(searchQuery.trim());
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-lg text-green-600">
              童慧行走天下
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link href="/guides" className="text-gray-600 hover:text-green-600">攻略列表</Link>
              <Link href="/guides/create" className="text-gray-600 hover:text-green-600">发布攻略</Link>
              <Link href="/faq" className="text-gray-600 hover:text-green-600">常见问题</Link>
            </nav>
          </div>
          <form onSubmit={handleSearch} className="hidden sm:flex items-center">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索攻略..."
                className="w-44 lg:w-56 pl-9 pr-3 py-1.5 text-sm bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-green-400 focus:ring-1 focus:ring-green-400 outline-none transition-all placeholder-gray-400"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span className="flex items-center gap-1.5 text-gray-700">
                  {user.avatar && <span className="text-lg">{user.avatar}</span>}
                  <span>{user.nickname || user.username}</span>
                </span>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
                  退出
                </button>
              </>
            ) : isSearchPage ? (
              <a
                href="/"
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all shadow-sm"
              >
                首页
              </a>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all shadow-sm"
              >
                登录 / 注册
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onLogin={handleLogin}
        force={false}
      />

      <ProfileSetup
        open={showSetup}
        onComplete={handleSetupComplete}
      />
    </>
  );
}
