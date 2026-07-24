// 我的勋章 - PC 端
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface Badge {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'diamond';
  obtainedAt: string;
  exchangeablePoints: number;
  exchanged: boolean;
}

const RARITY_META: Record<string, { label: string; color: string; gradient: string; emoji: string }> = {
  bronze: { label: '铜', color: '#a16207', gradient: 'linear-gradient(135deg, #fef3c7, #fde68a)', emoji: '🥉' },
  silver: { label: '银', color: '#475569', gradient: 'linear-gradient(135deg, #f1f5f9, #cbd5e1)', emoji: '🥈' },
  gold: { label: '金', color: '#ca8a04', gradient: 'linear-gradient(135deg, #fef3c7, #fbbf24)', emoji: '🥇' },
  diamond: { label: '钻', color: '#1e40af', gradient: 'linear-gradient(135deg, #dbeafe, #93c5fd)', emoji: '💎' },
};

export default function BadgesPage() {
  const [items, setItems] = useState<Badge[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const t = sessionStorage.getItem('grandkidsgo_token');
      if (t) headers.Authorization = `Bearer ${t}`;
    }
    fetch(`${TRAVEL_API}/api/user/travel-badges`, { headers })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setSummary(d.summary ?? null);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      <header className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/" className="text-yellow-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">🏅 我的勋章</h1>
          <p className="text-yellow-100 mt-1">家长视角的亲子出行勋章墙</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {summary && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm text-gray-500">等级分</div>
                <div className="text-4xl font-extrabold text-amber-600">{summary.totalScore}</div>
              </div>
              <div className="flex gap-2">
                {['diamond', 'gold', 'silver', 'bronze'].map((r) => {
                  const meta = RARITY_META[r];
                  return (
                    <div
                      key={r}
                      className="px-4 py-2 rounded-xl text-center"
                      style={{ background: meta.gradient, color: meta.color }}
                    >
                      <div className="text-xs">{meta.emoji} {meta.label}</div>
                      <div className="text-xl font-bold">{summary.byRarity?.[r] ?? 0}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-400">加载勋章中…</div>}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed">
            <div className="text-4xl mb-3">🎖️</div>
            <div className="text-gray-500">还没拿到勋章</div>
            <div className="text-sm text-gray-400 mt-2">完成一次出行 + 发布攻略即可解锁</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((b) => {
            const meta = RARITY_META[b.rarity];
            return (
              <div
                key={b.badgeId}
                className={`rounded-2xl p-5 text-center shadow-sm hover:shadow-lg transition ${
                  b.exchanged ? 'opacity-50 grayscale' : ''
                }`}
                style={{ background: meta.gradient }}
              >
                <div className="text-5xl mb-2">{b.icon}</div>
                <div className="font-bold text-gray-900 mb-1">{b.name}</div>
                <div className="text-xs text-gray-600 line-clamp-2 min-h-[2.5em]">{b.description}</div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span style={{ color: meta.color }} className="font-bold">
                    {meta.emoji} {meta.label}
                  </span>
                  {b.exchanged ? (
                    <span className="text-gray-500">已兑换</span>
                  ) : (
                    <span className="text-amber-600">+{b.exchangeablePoints} 分</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
