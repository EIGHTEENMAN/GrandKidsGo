// 智能攻略页 - PC 端（v3.0 重做版）
// 详见 项目建设方案/走天下实施方案-v3.0.md
//
// 新流程：
// 1. 先输入基本信息（城市/天数/孩子月龄）
// 2. 系统推荐相似行程的真实攻略（基于孩子画像匹配）
// 3. 用户可：
//    a) 选一个喜欢的 → 一键 fork 成自己的计划
//    b) 不满意 → 重新生成（引擎 A 拼装）

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface SimilarGuide {
  id: string;
  title: string;
  cityName: string | null;
  days: number | null;
  childAges: number[];
  travelStyle: string | null;
  stats: { view: number; save: number; like: number };
  author: { nickname: string; avatar: string | null };
  // 相似度（评分越高越像）
  matchScore: number;
  matchReason: string;
}

const CITY_OPTIONS = ['北京', '上海', '广州'];

export default function SmartGuideLanding() {
  const router = useRouter();
  const [step, setStep] = useState<'input' | 'results'>('input');
  const [cityName, setCityName] = useState('北京');
  const [days, setDays] = useState(3);
  const [childAgeMonths, setChildAgeMonths] = useState(36);
  const [travelStyle, setTravelStyle] = useState('balanced');
  const [guides, setGuides] = useState<SimilarGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [forkingId, setForkingId] = useState<string | null>(null);

  const searchSimilar = async () => {
    setLoading(true);
    try {
      // 查所有相关 city 的攻略
      const citiesRes = await fetch(`${TRAVEL_API}/api/cities`);
      const citiesData = await citiesRes.json();
      const targetCity = (citiesData.data ?? citiesData.cities ?? []).find((c: any) => c.name === cityName);
      if (!targetCity) {
        alert('城市未找到，请先在宝典中查看该城市');
        return;
      }

      // 查真实攻略
      const guidesRes = await fetch(`${TRAVEL_API}/api/guides/feed`);
      const guidesData = await guidesRes.json();
      const allGuides = guidesData.items ?? [];

      // 算相似度：城市匹配 + 天数匹配 + 孩子月龄匹配
      const matched: SimilarGuide[] = allGuides
        .map((g: any) => {
          let score = 0;
          const reasons: string[] = [];
          if (g.cityName === cityName) {
            score += 50;
            reasons.push('同城市');
          }
          if (g.days && Math.abs(g.days - days) <= 1) {
            score += 25;
            reasons.push(`天数相近（${g.days} 天）`);
          }
          if (g.childAges?.length) {
            const ageDiff = Math.min(...g.childAges.map((a: number) => Math.abs(a - childAgeMonths)));
            if (ageDiff <= 12) {
              score += 25;
              reasons.push(`孩子月龄相近（${Math.floor(Math.min(...g.childAges)/12)} 岁）`);
            } else if (ageDiff <= 24) {
              score += 10;
            }
          }
          if (g.travelStyle === travelStyle) {
            score += 10;
            reasons.push('旅行风格匹配');
          }
          return {
            ...g,
            matchScore: score,
            matchReason: reasons.length ? reasons.join(' · ') : '弱匹配',
          };
        })
        .filter((g: any) => g.matchScore >= 50)
        .sort((a: any, b: any) => b.matchScore - a.matchScore)
        .slice(0, 6);

      setGuides(matched);
      setStep('results');
    } catch (e) {
      console.error(e);
      alert('查询失败');
    } finally {
      setLoading(false);
    }
  };

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

  const regenerate = () => {
    router.push('/wizard/step1-city');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">🪄 智能攻略</h1>
          <p className="text-blue-100 mt-1">先看别人怎么玩，再决定怎么玩</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {step === 'input' && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">📋 先告诉我你的情况</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">想去哪个城市？</label>
                <div className="flex flex-wrap gap-2">
                  {CITY_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCityName(c)}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                        cityName === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">玩几天？</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 7].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                        days === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d} 天
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">孩子当时多大？</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { m: 12, l: '1 岁' },
                    { m: 24, l: '2 岁' },
                    { m: 36, l: '3 岁' },
                    { m: 48, l: '4 岁' },
                    { m: 60, l: '5 岁' },
                    { m: 72, l: '6 岁' },
                    { m: 96, l: '8 岁' },
                  ].map((a) => (
                    <button
                      key={a.m}
                      onClick={() => setChildAgeMonths(a.m)}
                      className={`px-4 py-2 rounded-full text-sm transition ${
                        childAgeMonths === a.m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {a.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">想要什么风格？</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { k: 'time_saver', l: '⚡ 省时' },
                    { k: 'money_saver', l: '💰 省钱' },
                    { k: 'balanced', l: '🌿 平衡' },
                    { k: 'comfort', l: '🛋️ 舒服' },
                  ].map((s) => (
                    <button
                      key={s.k}
                      onClick={() => setTravelStyle(s.k)}
                      className={`px-4 py-2 rounded-full text-sm transition ${
                        travelStyle === s.k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={searchSimilar}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 rounded-xl mt-6 disabled:opacity-50 shadow-md"
              >
                {loading ? '🔍 正在找相似行程…' : '🔍 看看别人怎么玩'}
              </button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div>
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">✨ 找到 {guides.length} 个相似行程</h2>
              <p className="text-sm text-gray-500">
                看到喜欢的 → 一键做成你的计划 · 不喜欢 → 重新生成
              </p>
            </div>

            {guides.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-dashed mb-6">
                <div className="text-4xl mb-3">🤷</div>
                <div className="text-gray-500 mb-2">没有找到相似的攻略</div>
                <div className="text-sm text-gray-400">走天下的真实攻略还在积累中</div>
              </div>
            )}

            <div className="space-y-4 mb-6">
              {guides.map((g) => (
                <article key={g.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">📍 {g.cityName ?? '未选'}</span>
                          {g.days && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded">{g.days} 天</span>}
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">
                            🎯 {g.matchScore}% 匹配
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2">{g.title}</h3>
                        <p className="text-sm text-gray-500 mb-2">{g.matchReason}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">👩 {g.author.nickname}</span>
                          <span className="text-gray-400 text-xs">
                            👍 {g.stats.like} ⭐ {g.stats.save}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Link
                        href={`/guide/${g.id}`}
                        className="flex-1 text-center py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >
                        👀 看真实评价
                      </Link>
                      <button
                        onClick={() => forkGuide(g.id)}
                        disabled={forkingId === g.id}
                        className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:shadow-md"
                      >
                        {forkingId === g.id ? '生成中…' : '✨ 用这个做我的计划'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 text-center">
              <p className="text-gray-600 mb-3">没看到喜欢的？</p>
              <button
                onClick={regenerate}
                className="px-8 py-3 bg-white text-gray-700 font-bold rounded-full shadow border border-gray-200 hover:bg-gray-50 transition"
              >
                🪄 重新生成我的方案
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
