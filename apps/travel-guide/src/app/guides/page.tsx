// 攻略列表 - PC 端（v3.0）
// 用户先看真实攻略 → 点"用这个做我的计划" → fork 到自己的计划
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface Guide {
  id: string;
  title: string;
  cityName: string | null;
  days: number | null;
  childAges: number[];
  travelStyle: string | null;
  stats: { view: number; save: number; like: number };
  author: { nickname: string; avatar: string | null };
}

export default function GuidesPage() {
  const router = useRouter();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [forkingId, setForkingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/guides/feed`)
      .then((r) => r.json())
      .then((d) => setGuides(d.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const forkGuide = async (guideId: string) => {
    setForkingId(guideId);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const t = sessionStorage.getItem('grandkidsgo_token');
        if (t) headers.Authorization = `Bearer ${t}`;
      }
      const res = await fetch(`${TRAVEL_API}/api/guides/fork`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sourceGuideId: guideId }),
      });
      const d = await res.json();
      if (d.code === 'OK') {
        router.push(`/plan/${d.data.planRecordId}`);
      } else {
        alert(d.error?.message ?? 'fork 失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setForkingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/" className="text-green-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">📖 别人家怎么玩的</h1>
          <p className="text-green-100 mt-1">真实妈妈的亲子旅行 · 看到喜欢的可以一键做成自己的计划</p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/wizard"
              className="px-5 py-2 bg-white text-green-700 font-semibold rounded-full text-sm hover:bg-green-50 transition shadow-md"
            >
              🪄 不想 fork？重新生成
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading && <div className="text-center py-12 text-gray-400">加载攻略中…</div>}

        {!loading && guides.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed">
            <div className="text-4xl mb-3">📝</div>
            <div className="text-gray-500 mb-1">还没有发布的攻略</div>
            <div className="text-sm text-gray-400">妈妈完成出行 + 发布一篇，就会出现在这里</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {guides.map((g) => (
            <article key={g.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition border border-gray-100">
              <Link href={`/guide/${g.id}`} className="block">
                <div className="h-32 bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center relative">
                  <span className="text-5xl">🗺️</span>
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 rounded text-xs font-medium">
                    {g.cityName ?? '未选'}
                  </div>
                  {g.days && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 text-white rounded text-xs">
                      {g.days} 天
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/guide/${g.id}`}>
                  <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 min-h-[3em] hover:text-green-700">
                    {g.title}
                  </h3>
                </Link>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>👩 {g.author.nickname}</span>
                  <span>👍 {g.stats.like} ⭐ {g.stats.save}</span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/guide/${g.id}`}
                    className="flex-1 text-center py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                  >
                    👀 看真实评价
                  </Link>
                  <button
                    onClick={() => forkGuide(g.id)}
                    disabled={forkingId === g.id}
                    className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:shadow-md"
                  >
                    {forkingId === g.id ? '生成中…' : '✨ 做成我的计划'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
