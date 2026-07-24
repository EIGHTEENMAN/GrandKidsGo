// /profile/badges — 勋章墙（已获 / 未获 / 分类筛选）
'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { TrophyIcon, AwardIcon, CrownIcon, MedalIcon } from '@/components/Icons';

const RARITY_LABEL: Record<string, string> = { bronze: '铜', silver: '银', gold: '金', diamond: '钻石' };
const RARITY_COLOR: Record<string, string> = {
  bronze: 'from-amber-600 to-amber-800 border-amber-700',
  silver: 'from-slate-300 to-slate-500 border-slate-400',
  gold: 'from-yellow-300 to-amber-500 border-yellow-500',
  diamond: 'from-cyan-300 to-blue-500 border-cyan-500',
};

type BadgeDef = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  rarity: string;
  tier: number;
  seasonalTag: string | null;
  hiddenFlag: boolean;
};

type EarnedBadge = {
  badgeId: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  rarity: string;
  tier: number;
  hiddenFlag: boolean;
  obtainedAt: string;
  shareScope: string;
  exchanged: boolean;
  exchangeablePoints: number;
};

export default function MyBadgesPage() {
  const router = useRouter();
  const [earned, setEarned] = useState<EarnedBadge[]>([]);
  const [defs, setDefs] = useState<BadgeDef[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; nickname: string; avatar: string | null } | null>(null);

  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('grandkidsgo_token') || localStorage.getItem('haodaer_token')
    : null;

  useEffect(() => {
    if (!token) { router.push('/login?redirect=/profile/badges'); return; }
    fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUser(d?.data ?? d?.user ?? d))
      .catch(() => {});
  }, [router, token]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      fetch('/api/user/travel-badges', { headers: { 'x-debug-user-id': user.id } }).then(r => r.json()),
      fetch('/api/badges/all-defs').then(r => r.json()),
    ]).then(([ej, dj]) => {
      setEarned(ej?.items ?? []);
      setDefs(dj?.items ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user?.id]);

  const earnedIds = useMemo(() => new Set(earned.map(b => b.name)), [earned]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    defs.forEach(d => cats.add(d.category));
    return ['all', ...Array.from(cats)];
  }, [defs]);

  const filteredDefs = useMemo(() => {
    let list = activeCategory === 'all' ? defs : defs.filter(d => d.category === activeCategory);
    // 隐藏勋章未解锁则不显示
    list = list.filter(d => !d.hiddenFlag || earnedIds.has(d.name));
    // 排序：已获在前，按稀有度
    const rarityOrder = { diamond: 0, gold: 1, silver: 2, bronze: 3 };
    list = [...list].sort((a, b) => {
      const ae = earnedIds.has(a.name) ? 0 : 1;
      const be = earnedIds.has(b.name) ? 0 : 1;
      if (ae !== be) return ae - be;
      return (rarityOrder[a.rarity as keyof typeof rarityOrder] ?? 99) - (rarityOrder[b.rarity as keyof typeof rarityOrder] ?? 99);
    });
    return list;
  }, [defs, activeCategory, earnedIds]);

  const totalPoints = useMemo(() => earned.reduce((s, b) => s + b.exchangeablePoints, 0), [earned]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ProfileSidebar user={user} counts={{
        guides: 0,
        children: 0,
        sayings: 0,
        badges: earned.length,
      }} />
      <div className="space-y-4 min-w-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-extrabold text-gray-900 inline-flex items-center gap-2">
              <TrophyIcon size={20} className="text-yellow-500" /> 勋章墙
            </h1>
            {totalPoints > 0 && (
              <span className="text-xs px-3 py-1 bg-amber-50 text-amber-700 rounded-full font-medium">
                可兑换 {totalPoints} 积分
              </span>
            )}
          </div>

          {loading ? (
            <p className="text-gray-400 py-8 text-center">加载中…</p>
          ) : earned.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-700 font-medium">还没有勋章</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">发布攻略、收藏地点、带孩子去旅行……都能解锁勋章</p>
              <Link href="/guides/create" className="inline-block px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold">去发攻略</Link>
            </div>
          ) : (
            <p className="text-sm text-gray-500">已获 {earned.length} 枚，共 {defs.length} 枚可解锁</p>
          )}
        </div>

        {!loading && defs.length > 0 && (
          <>
            {/* 分类 Tab */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
              <div className="flex gap-2 overflow-x-auto">
                {categories.map(c => {
                  const label = c === 'all' ? '全部' : c;
                  const count = c === 'all' ? defs.filter(d => !d.hiddenFlag || earnedIds.has(d.name)).length : defs.filter(d => d.category === c && (!d.hiddenFlag || earnedIds.has(d.name))).length;
                  return (
                    <button
                      key={c}
                      onClick={() => setActiveCategory(c)}
                      className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                        activeCategory === c
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label} <span className={`text-xs ml-1 ${activeCategory === c ? 'text-white/80' : 'text-gray-500'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 勋章网格 */}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredDefs.map(d => {
                const got = earnedIds.has(d.name);
                const earnedItem = earned.find(e => e.name === d.name);
                return (
                  <div
                    key={d.id}
                    title={d.description ?? d.name}
                    className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center p-2 text-center transition ${
                      got
                        ? `bg-gradient-to-br ${RARITY_COLOR[d.rarity] ?? ''} border-2 text-white shadow-md`
                        : 'bg-gray-100 border-2 border-gray-200 text-gray-400'
                    }`}
                  >
                    <span className={`text-3xl ${got ? '' : 'grayscale opacity-50'}`}>{d.icon ?? '🏅'}</span>
                    <span className="text-xs font-medium mt-1 line-clamp-2 px-1">{d.name}</span>
                    <span className={`text-[10px] mt-0.5 ${got ? 'text-white/80' : 'text-gray-400'}`}>
                      {RARITY_LABEL[d.rarity] ?? d.rarity}
                    </span>
                    {!got && <span className="absolute top-1 right-1 text-xs">🔒</span>}
                    {earnedItem?.exchanged && <span className="absolute top-1 right-1 text-xs">✓ 已兑换</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}