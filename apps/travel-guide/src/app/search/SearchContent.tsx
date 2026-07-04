'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Guide = {
  id: string;
  title: string;
  summary: string;
  destination: string;
  coverImage: string;
  category: string;
  author: { nickname: string; avatar: string };
};

export default function SearchContent() {
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const q = searchParams?.get('q') || '';
  const [results, setResults] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchParams(params);
    setSearchInput(params.get('q') || '');
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setLoading(false);
      setResults([]);
      return;
    }
    setLoading(true);
    setError('');
    fetch(`/api/guides?search=${encodeURIComponent(q.trim())}`)
      .then(r => r.json())
      .then(d => {
        setResults(d.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError('搜索失败，请稍后重试');
        setLoading(false);
      });
  }, [q]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchInput.trim())}`;
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-xl">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="搜索攻略..."
              autoFocus
              className="w-full pl-10 pr-4 py-3 text-base bg-white border border-gray-200 rounded-xl focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        {!q.trim() && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg">输入关键词搜索亲子攻略</p>
          </div>
        )}

        {q.trim() && loading && (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {q.trim() && !loading && error && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">{error}</p>
          </div>
        )}

        {q.trim() && !loading && !error && (
          <>
            <p className="text-sm text-gray-500 mb-6">
              搜索 &ldquo;{q}&rdquo; 共找到 {results.length} 篇攻略
            </p>
            {results.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-lg mb-2">没有找到相关攻略</p>
                <p className="text-sm">换个关键词试试吧</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map(guide => (
                  <Link key={guide.id} href={`/guides/${guide.id}`}>
                    <article className="bg-white rounded-xl overflow-hidden hover:shadow-md transition-all flex">
                      {guide.coverImage && (
                        <div className="w-32 md:w-48 shrink-0">
                          <img src={guide.coverImage} alt={guide.title} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="p-5 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{guide.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{guide.summary}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          {guide.destination && <span>📍 {guide.destination}</span>}
                          {guide.category && <span>🏷️ {guide.category}</span>}
                          <span className="ml-auto">{guide.author?.nickname || '匿名'}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
