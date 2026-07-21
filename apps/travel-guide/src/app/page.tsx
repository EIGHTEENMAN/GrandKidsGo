// 走天下首页 - PC 端（v3.1 轮播 + 三板块）
// 详见 项目建设方案/走天下实施方案-v3.1.md
//
// v3.1 调整：
// - 顶部 hero 改为可滑动图片相册（点击图片跳转内容）
// - 下方三个并排板块：热门攻略 / 排行榜 / 智能攻略

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

const PLACE_CATEGORIES = [
  { key: 'sight', emoji: '🏛️', label: '景点' },
  { key: 'restaurant', emoji: '🍽️', label: '餐厅' },
  { key: 'hotel', emoji: '🏨', label: '酒店' },
  { key: 'park', emoji: '🌳', label: '公园' },
  { key: 'playground', emoji: '🎠', label: '游乐场' },
  { key: 'museum', emoji: '🏛️', label: '博物馆' },
  { key: 'science', emoji: '🔬', label: '科技馆' },
  { key: 'library', emoji: '📚', label: '图书馆' },
  { key: 'aquarium', emoji: '🐠', label: '海洋馆' },
  { key: 'mall', emoji: '🛍️', label: '商场' },
  { key: 'medical', emoji: '🏥', label: '医疗' },
  { key: 'transport', emoji: '🚇', label: '交通' },
  { key: 'convenience', emoji: '🏪', label: '便利店' },
];

interface Guide {
  id: string;
  title: string;
  cityName: string | null;
  days: number | null;
  childAges: number[];
  stats: { view: number; save: number; like: number };
  author: { nickname: string; avatar: string | null };
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string | null;
  childLabel?: string;
  feelingScoreAvg: number;
  badgeCount: number;
  guideCount: number;
  cityCount: number;
  score: number;
}

// 轮播图（点击图片跳转不同类型内容）
const CAROUSEL_SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=85',
    eyebrow: '走遍宝宝的世界',
    title: '13 类亲子地点 · 真实妈妈打分',
    subtitle: '大人 + 孩子双维度评分 · 看真实评价再决定去哪儿',
    cta: '探索宝典',
    href: '/places',
    accent: 'from-green-700/80 to-emerald-900/80',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1600&q=85',
    eyebrow: '真实妈妈的攻略',
    title: '孩子说好才是真的好',
    subtitle: '基于孩子真实感受数据排序 · 看到喜欢的可以一键做成自己的计划',
    cta: '看看别人怎么玩',
    href: '/guides',
    accent: 'from-amber-600/80 to-orange-800/80',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1600&q=85',
    eyebrow: '孩子真实感受驱动',
    title: '妈妈榜 · 你的下一站在哪？',
    subtitle: '4 类榜单 × 3 时间维度 · 看妈妈们带娃玩过的好地方',
    cta: '查看妈妈榜',
    href: '/leaderboard',
    accent: 'from-pink-600/80 to-purple-900/80',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1473625247510-8ceb1760943f?w=1600&q=85',
    eyebrow: '智能攻略',
    title: '不用从零开始 · 也不用硬塞',
    subtitle: '推荐相似行程真实攻略 · 一键 fork · 不满意再重新生成',
    cta: '试试智能攻略',
    href: '/wizard',
    accent: 'from-blue-600/80 to-cyan-900/80',
  },
];

export default function TravelHome() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [hotGuides, setHotGuides] = useState<Guide[]>([]);
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);

  // 轮播自动切换
  useEffect(() => {
    const t = setInterval(() => {
      setCarouselIdx((i) => (i + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // 拉数据
  useEffect(() => {
    Promise.all([
      fetch(`${TRAVEL_API}/api/guides/feed`).then((r) => r.json()),
      fetch(`${TRAVEL_API}/api/leaderboard/mom?period=week`).then((r) => r.json()),
    ])
      .then(([feedData, lbData]) => {
        const allGuides: Guide[] = feedData.items ?? [];
        setGuides(allGuides);
        // 热门攻略：按 like + save 排序
        setHotGuides(
          [...allGuides].sort((a, b) => (b.stats.like + b.stats.save * 2) - (a.stats.like + a.stats.save * 2)).slice(0, 5),
        );
        // 妈妈榜 Top 5
        setTopUsers((lbData.items ?? []).slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, []);

  const slide = CAROUSEL_SLIDES[carouselIdx];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-amber-50">
      {/* ===== 轮播相册 ===== */}
      <header className="relative h-[480px] md:h-[560px] overflow-hidden">
        {/* 背景图 */}
        <div className="absolute inset-0">
          {CAROUSEL_SLIDES.map((s, i) => (
            <div
              key={s.id}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
                i === carouselIdx ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url(${s.image})` }}
            />
          ))}
          <div className={`absolute inset-0 bg-gradient-to-br ${slide.accent}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        </div>

        {/* 文案 */}
        <Link
          href={slide.href}
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <div className="text-center text-white px-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-4">
              ✈️ {slide.eyebrow}
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight drop-shadow-lg">
              {slide.title}
            </h1>
            <p className="text-base md:text-lg text-white/90 mb-6 leading-relaxed drop-shadow">
              {slide.subtitle}
            </p>
            <span className="inline-block px-6 py-3 bg-white text-gray-900 font-bold rounded-full shadow-lg">
              {slide.cta} →
            </span>
          </div>
        </Link>

        {/* 左右切换按钮 */}
        <button
          onClick={() => setCarouselIdx((i) => (i - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition z-20 flex items-center justify-center text-xl"
          aria-label="上一张"
        >
          ‹
        </button>
        <button
          onClick={() => setCarouselIdx((i) => (i + 1) % CAROUSEL_SLIDES.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition z-20 flex items-center justify-center text-xl"
          aria-label="下一张"
        >
          ›
        </button>

        {/* 指示点 */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {CAROUSEL_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCarouselIdx(i)}
              className={`h-2 rounded-full transition-all ${
                i === carouselIdx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`跳到第 ${i + 1} 张`}
            />
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* ===== 三个并排板块 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* 板块 1: 热门攻略 */}
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-orange-100">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <span className="text-2xl">🔥</span>
                <h2 className="font-bold text-lg">热门攻略</h2>
              </div>
              <Link href="/guides" className="text-xs text-white/80 hover:text-white">
                更多 →
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {!loaded && (
                <div className="p-6 text-center text-sm text-gray-400">加载中…</div>
              )}
              {loaded && hotGuides.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400">还没有攻略</div>
              )}
              {hotGuides.map((g, i) => (
                <Link
                  key={g.id}
                  href={`/guide/${g.id}`}
                  className="flex items-start gap-3 p-4 hover:bg-orange-50 transition"
                >
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-400' : i === 2 ? 'bg-amber-400' : 'bg-gray-300'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 line-clamp-2 text-sm mb-1 hover:text-orange-600">
                      {g.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>📍 {g.cityName ?? '未选'}</span>
                      {g.days && <span>· {g.days} 天</span>}
                      <span>· 👍 {g.stats.like}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* 板块 2: 排行榜 */}
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-yellow-100">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <span className="text-2xl">🏆</span>
                <h2 className="font-bold text-lg">排行榜</h2>
              </div>
              <Link href="/leaderboard" className="text-xs text-white/80 hover:text-white">
                更多 →
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {!loaded && (
                <div className="p-6 text-center text-sm text-gray-400">加载中…</div>
              )}
              {loaded && topUsers.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400">暂无榜单数据</div>
              )}
              {topUsers.map((u, i) => (
                <Link
                  key={u.userId}
                  href="/leaderboard"
                  className="flex items-center gap-3 p-4 hover:bg-yellow-50 transition"
                >
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {u.childLabel || u.nickname || '匿名妈妈'}
                    </div>
                    <div className="text-xs text-gray-500">
                      ⭐ 真实感受 {u.feelingScoreAvg.toFixed(1)} / 5 · 🏅 {u.badgeCount}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-amber-600">{u.score.toFixed(1)}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* 板块 3: 智能攻略 */}
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-blue-100">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <span className="text-2xl">🪄</span>
                <h2 className="font-bold text-lg">智能攻略</h2>
              </div>
              <Link href="/wizard" className="text-xs text-white/80 hover:text-white">
                试试 →
              </Link>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                先看真实攻略里的孩子感受数据，<br />
                看到喜欢的 → 一键 fork · 不喜欢 → 重新生成
              </p>
              <div className="space-y-2 mb-5">
                {[
                  { e: '🏙️', t: '1. 告诉走天下你的情况' },
                  { e: '🔍', t: '2. 推荐相似行程真实攻略' },
                  { e: '✨', t: '3. 一键 fork 或重新生成' },
                ].map((s) => (
                  <div key={s.t} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-7 text-center text-lg">{s.e}</span>
                    <span>{s.t}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/wizard"
                className="block text-center w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition"
              >
                开始智能规划 →
              </Link>
              <p className="text-xs text-gray-400 mt-3 text-center">
                移动端可编辑完整计划
              </p>
            </div>
          </section>
        </div>

        {/* ===== 13 类地点库入口 ===== */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              📚 宝典：13 类亲子地点
            </h2>
            <Link href="/places" className="text-green-600 hover:text-green-700 text-sm font-medium">
              搜索全部地点 →
            </Link>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            上千个真实亲子地点 · 大人和孩子双维度评分 · 看真实评价再决定去哪儿
          </p>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
            {PLACE_CATEGORIES.slice(0, 7).map((c) => (
              <Link
                key={c.key}
                href={`/places?category=${c.key}`}
                className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition border border-gray-100"
              >
                <div className="text-3xl mb-1">{c.emoji}</div>
                <div className="text-sm font-medium text-gray-700">{c.label}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100 mt-16">
        &copy; {new Date().getFullYear()} 童慧行走天下 — 童慧行旗下亲子旅行品牌
      </footer>
    </div>
  );
}
