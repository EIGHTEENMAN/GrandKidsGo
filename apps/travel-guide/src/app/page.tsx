// 走天下首页 - PC 端（v2.0 上线版）
// 详见 项目建设方案/走天下实施方案-v2.0.md 第十三节
//
// - 顶部 hero 区
// - 三大入口：我的勋章 / 排行榜 / 社区动态
// - 推荐攻略 feed（v2 权重排序）
// - 今日热门勋章（v2 新增）

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface Guide {
  id: string;
  title: string;
  cityName: string | null;
  days: number | null;
  coverImage: string | null;
  stats: { view: number; save: number; like: number };
  author: { nickname: string; avatar: string | null };
}

interface HotBadge {
  name: string;
  icon: string;
  rarity: string;
  unlockCount: number;
}

export default function TravelHome() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [hotBadges, setHotBadges] = useState<HotBadge[]>([]);
  const [loaded, setLoaded] = useState(false);

  function authHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const t = sessionStorage.getItem('grandkidsgo_token') || '';
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  useEffect(() => {
    (async () => {
      try {
        const [feedRes, badgeRes] = await Promise.all([
          fetch(`${TRAVEL_API}/api/guides/feed`, { headers: authHeaders() }),
          fetch(`${TRAVEL_API}/api/guides/hot-badges`),
        ]);
        const feed = await feedRes.json();
        const badges = await badgeRes.json();
        setGuides(feed?.items ?? []);
        setHotBadges(badges?.items ?? []);
      } catch (e) {
        console.error('[travel] home load failed', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-amber-50">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-green-700 to-emerald-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-white/15 backdrop-blur-sm rounded-full text-sm font-medium mb-6">
              ✈️ 童慧行走天下
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
              孩子说好才是真的好
            </h1>
            <p className="text-lg md:text-xl text-green-100 mb-8 leading-relaxed">
              真实妈妈的亲子旅行攻略平台 · 守护孩子真实感受的数据资产
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/leaderboard"
                className="px-6 py-3 bg-white text-green-700 font-semibold rounded-full hover:bg-green-50 transition shadow-md"
              >
                🏆 妈妈榜
              </Link>
              <Link
                href="/community"
                className="px-6 py-3 bg-amber-400 text-amber-900 font-semibold rounded-full hover:bg-amber-300 transition shadow-md"
              >
                👥 社区动态
              </Link>
              <Link
                href="/badges"
                className="px-6 py-3 bg-yellow-300 text-yellow-900 font-semibold rounded-full hover:bg-yellow-200 transition shadow-md"
              >
                🏅 我的勋章
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* 今日热门勋章 */}
        {hotBadges.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              🔥 本周热门勋章
              <span className="text-sm font-normal text-gray-500">本周获得最多的勋章</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {hotBadges.map((b) => (
                <div
                  key={b.name}
                  className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition border border-amber-100"
                >
                  <div className="text-4xl mb-2">{b.icon}</div>
                  <div className="font-bold text-gray-900">{b.name}</div>
                  <div className="text-sm text-amber-600 mt-1">
                    {b.unlockCount} 人已解锁
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 推荐攻略 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              📖 推荐攻略
              <span className="text-sm font-normal text-gray-500">基于勋章 + 感受 + 时间 + 社交</span>
            </h2>
            <Link href="/search" className="text-green-600 hover:text-green-700 text-sm font-medium">
              查看全部 →
            </Link>
          </div>

          {!loaded && (
            <div className="text-center py-12 text-gray-400">加载攻略中…</div>
          )}

          {loaded && guides.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
              <div className="text-4xl mb-3">🗺️</div>
              <div className="text-gray-500 mb-1">还没有发布的攻略</div>
              <div className="text-sm text-gray-400">
                妈妈完成一次出行 + 发布一篇攻略，就会出现在这里
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {guides.slice(0, 12).map((g) => (
              <Link
                key={g.id}
                href={`/guide/${g.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition border border-gray-100"
              >
                <div className="h-40 bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center relative">
                  {g.coverImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={g.coverImage} alt={g.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">🗺️</span>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700">
                    {g.cityName ?? '未选城市'}
                  </div>
                  {g.days ? (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/40 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                      {g.days} 天
                    </div>
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 min-h-[3em]">
                    {g.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 truncate">{g.author.nickname}</span>
                    <span className="text-gray-400 text-xs whitespace-nowrap">
                      👍 {g.stats.like}  ⭐ {g.stats.save}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 text-center">
          <div className="inline-block bg-gradient-to-r from-green-100 to-amber-100 rounded-3xl p-8 md:p-12 max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">开始你的亲子旅行计划</h2>
            <p className="text-gray-600 mb-6">
              引擎 A 自动生成 3 档行程（省时 / 省钱 / 舒服），从孩子画像出发，100ms 出方案。
            </p>
            <Link
              href="/wizard"
              className="inline-block px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-lg transition"
            >
              ✈️ 我也要做计划
            </Link>
          </div>
        </section>
      </main>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100 mt-16">
        &copy; {new Date().getFullYear()} 童慧行走天下 — 童慧行旗下亲子旅行品牌
      </footer>
    </div>
  );
}
