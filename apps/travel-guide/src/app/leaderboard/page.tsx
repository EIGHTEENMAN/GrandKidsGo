// 人气榜 - PC 端
// 详见 项目建设方案/走天下实施方案-v2.0.md 第九节 B
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface Entry {
  rank: number;
  userId: string;
  nickname: string | null;
  childLabel?: string;
  feelingScoreAvg: number;
  badgeCount: number;
  guideCount: number;
  cityCount: number;
  score: number;
  badgeBreakdown?: { bronze: number; silver: number; gold: number; diamond: number };
}

const PERIODS = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '总榜' },
];

export default function LeaderboardPage() {
  const [scope, setScope] = useState<'mom' | 'child' | 'city' | 'guide'>('mom');
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${TRAVEL_API}/api/leaderboard/${scope}?period=${period}`);
        const d = await res.json();
        setItems(d.items ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [scope, period]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/" className="text-amber-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">🏆 人气榜</h1>
          <p className="text-amber-100 mt-1">孩子真实感受数据驱动的亲子旅行榜单</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 筛选 */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { k: 'mom', l: '👤 人气榜' },
            { k: 'child', l: '👶 孩子榜' },
            { k: 'city', l: '🏙️ 城市榜' },
            { k: 'guide', l: '📖 攻略榜' },
          ].map((s) => (
            <button
              key={s.k}
              onClick={() => setScope(s.k as any)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                scope === s.k ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300'
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key as any)}
              className={`px-4 py-1.5 rounded-full text-xs transition ${
                period === p.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-12 text-gray-400">加载榜单中…</div>}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-gray-500">暂无榜单数据</div>
            <div className="text-sm text-gray-400 mt-2">每日 02:00 跑批生成快照，请稍后查看</div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-3 w-16">#</th>
                <th className="px-6 py-3">用户</th>
                {scope !== 'city' && scope !== 'guide' && <th className="px-6 py-3">真实感受</th>}
                {scope === 'mom' && <th className="px-6 py-3">勋章数</th>}
                {scope === 'mom' && <th className="px-6 py-3">攻略/城市</th>}
                <th className="px-6 py-3 text-right">总分</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.userId || it.rank} className="border-b last:border-0 hover:bg-amber-50/40">
                  <td className="px-6 py-4">
                    {it.rank <= 3 ? (
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                        it.rank === 1 ? 'bg-yellow-500' : it.rank === 2 ? 'bg-gray-400' : 'bg-orange-400'
                      }`}>
                        {it.rank}
                      </span>
                    ) : (
                      <span className="text-gray-500 font-mono">#{it.rank}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {it.childLabel || it.nickname || '匿名用户'}
                    </div>
                  </td>
                  {scope !== 'city' && scope !== 'guide' && (
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                        ⭐ {it.feelingScoreAvg?.toFixed(1) ?? '—'} / 5
                      </span>
                    </td>
                  )}
                  {scope === 'mom' && (
                    <td className="px-6 py-4 text-sm">
                      {it.badgeCount > 0 && (
                        <span className="text-gray-700">
                          🏅 {it.badgeCount}
                          {it.badgeBreakdown && (
                            <span className="text-xs text-gray-400 ml-1">
                              ({it.badgeBreakdown.bronze}🥉 {it.badgeBreakdown.silver}🥈 {it.badgeBreakdown.gold}🥇 {it.badgeBreakdown.diamond}💎)
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                  )}
                  {scope === 'mom' && (
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {it.guideCount} 攻略 · {it.cityCount} 城市
                    </td>
                  )}
                  <td className="px-6 py-4 text-right font-bold text-amber-600">
                    {it.score?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          隐私护栏：孩子姓名脱敏为"宝宝 N 月" · 月龄 3 月粒度 · 撤回即刻消失
        </p>
      </div>
    </main>
  );
}
