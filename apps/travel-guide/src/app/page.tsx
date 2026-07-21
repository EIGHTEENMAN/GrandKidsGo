// 走天下首页 - PC 端（v3.0 重做版）
// 详见 项目建设方案/走天下实施方案-v3.0.md
//
// 重新定位：宝典先行 + 排行榜 + 智能攻略
// - 顶部 hero：孩子说好才是真的好
// - 13 类地点库搜索（宝典入口）
// - 真实感受数据驱动的妈妈榜
// - 智能攻略（推荐相似行程 → 一键 fork / 重新生成）

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

export default function TravelHome() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/guides/feed`)
      .then((r) => r.json())
      .then((d) => setGuides(d.items ?? []))
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-amber-50">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-green-700 to-emerald-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 relative z-10">
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
                href="/places"
                className="px-6 py-3 bg-white text-green-700 font-semibold rounded-full hover:bg-green-50 transition shadow-md"
              >
                📚 走遍宝宝的世界
              </Link>
              <Link
                href="/leaderboard"
                className="px-6 py-3 bg-amber-400 text-amber-900 font-semibold rounded-full hover:bg-amber-300 transition shadow-md"
              >
                🏆 妈妈榜
              </Link>
              <Link
                href="/guides"
                className="px-6 py-3 bg-yellow-300 text-yellow-900 font-semibold rounded-full hover:bg-yellow-200 transition shadow-md"
              >
                ✨ 看看别人怎么玩
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* 13 类地点库入口 */}
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
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {PLACE_CATEGORIES.map((c) => (
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

        {/* 真实感受攻略 */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              ✨ 别人家怎么玩的
            </h2>
            <Link href="/guides" className="text-green-600 hover:text-green-700 text-sm font-medium">
              查看全部攻略 →
            </Link>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            基于真实感受数据排序 · 看到喜欢的攻略可以一键做成自己的计划
          </p>

          {!loaded && (
            <div className="text-center py-12 text-gray-400">加载攻略中…</div>
          )}

          {loaded && guides.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
              <div className="text-4xl mb-3">📝</div>
              <div className="text-gray-500 mb-1">还没有发布的攻略</div>
              <div className="text-sm text-gray-400">
                妈妈完成一次出行 + 发布一篇攻略，就会出现在这里
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {guides.slice(0, 6).map((g) => (
              <Link
                key={g.id}
                href={`/guide/${g.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition border border-gray-100"
              >
                <div className="h-32 bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                  <span className="text-5xl">🗺️</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="px-2 py-0.5 bg-green-50 rounded">{g.cityName ?? '未选'}</span>
                    {g.days && <span className="px-2 py-0.5 bg-amber-50 rounded">{g.days} 天</span>}
                  </div>
                  <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 min-h-[3em]">
                    {g.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 truncate">{g.author.nickname}</span>
                    <span className="text-gray-400 text-xs whitespace-nowrap">
                      👍 {g.stats.like} ⭐ {g.stats.save}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 智能攻略 CTA */}
        <section className="bg-gradient-to-r from-green-100 via-amber-50 to-yellow-50 rounded-3xl p-8 md:p-12 text-center">
          <div className="text-5xl mb-4">🪄</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">看看别人怎么玩，再决定怎么玩</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
            先看真实攻略里的孩子感受数据，<br className="hidden md:block" />
            看到喜欢的 → 一键基于它做你的计划 · 想换思路 → 让走天下重新生成。
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/guides"
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition"
            >
              📖 看看别人怎么玩
            </Link>
            <Link
              href="/wizard"
              className="px-8 py-4 bg-white text-gray-700 font-bold rounded-full shadow border border-gray-200 hover:bg-gray-50 transition"
            >
              🪄 重新生成我的方案
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
