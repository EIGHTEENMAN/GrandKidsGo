// 地点详情 + 评价页（双维度评分）
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface Review {
  id: string;
  adultRating: number;
  childRating: number | null;
  childAgeMonths: number | null;
  text: string | null;
  tags: string[];
  hasParking: boolean;
  hasHighChair: boolean;
  hasNapRoom: boolean;
  strollerOk: boolean;
  kidFriendly: number | null;
  visitDate: string | null;
  createdAt: string;
}

interface PlaceData {
  place: any;
  stats: { adultAvg: number | null; childAvg: number | null; reviewCount: number; withChildRating: number };
  reviews: Review[];
  type: string;
  typeLabel: string;
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - d) / 86400000);
  if (diff < 1) return '今天';
  if (diff < 30) return `${diff} 天前`;
  return `${Math.floor(diff / 30)} 个月前`;
}

export default function PlaceDetailPage() {
  const params = useParams();
  const type = params.type as string;
  const id = params.id as string;
  const [data, setData] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/places/${type}/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [type, id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中…</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center">地点不存在</div>;

  const { place, stats, reviews, typeLabel } = data;
  const isRestaurant = type === 'restaurant';

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-12">
      <header className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/places" className="text-amber-100 text-sm hover:text-white">← 返回宝典</Link>
          <div className="text-xs mt-2 text-amber-100">{typeLabel} · {place.city?.name ?? ''}</div>
          <h1 className="text-3xl font-extrabold mt-1">{place.name}</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 评分卡 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <div className="text-xs text-gray-500 mb-1">👩 大人评分</div>
              <div className="text-3xl font-extrabold text-amber-600">
                {stats.adultAvg ? stats.adultAvg.toFixed(1) : '—'}
                <span className="text-sm font-normal text-gray-400 ml-1">/ 5</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{stats.reviewCount} 条评价</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">👶 孩子评分</div>
              <div className="text-3xl font-extrabold text-green-600">
                {stats.childAvg ? stats.childAvg.toFixed(1) : '—'}
                <span className="text-sm font-normal text-gray-400 ml-1">/ 5</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{stats.withChildRating} 条孩子评分</div>
            </div>
          </div>
          <div className="text-center mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">真实妈妈打分 · 双维度对比</span>
          </div>
        </div>

        {/* 评分提示 */}
        <button
          onClick={() => setShowReviewForm(!showReviewForm)}
          className="block w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-4 rounded-2xl shadow-md transition mb-6"
        >
          {showReviewForm ? '收起评价表单' : '⭐ 我也要打分（大人 + 孩子双维度）'}
        </button>

        {showReviewForm && <ReviewForm type={type} placeId={id} placeName={place.name} />}

        {/* 评价列表 */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">真实妈妈的评价（{reviews.length}）</h2>

        {reviews.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed text-gray-500">
            还没有人评价 · 成为第一个分享感受的妈妈
          </div>
        )}

        <div className="space-y-3">
          {reviews.map((r) => (
            <article key={r.id} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded text-sm">
                    <span className="text-amber-600">👩</span>
                    <span className="font-bold text-amber-700">⭐ {r.adultRating}</span>
                  </div>
                  {r.childRating && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded text-sm">
                      <span className="text-green-600">👶</span>
                      <span className="font-bold text-green-700">⭐ {r.childRating}</span>
                      {r.childAgeMonths != null && (
                        <span className="text-xs text-gray-500 ml-1">
                          {Math.floor(r.childAgeMonths / 12)} 岁
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400">{timeAgo(r.createdAt)}</span>
              </div>
              {r.text && (
                <p className="text-gray-700 text-sm leading-relaxed mb-2">{r.text}</p>
              )}
              {(r.hasParking || r.hasHighChair || r.hasNapRoom || r.strollerOk) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.hasParking && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">🅿️ 有停车</span>}
                  {r.hasHighChair && <span className="text-xs px-2 py-0.5 bg-pink-50 text-pink-700 rounded">🪑 宝宝椅</span>}
                  {r.hasNapRoom && <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded">🍼 母婴室</span>}
                  {r.strollerOk && <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded">🚼 婴儿车友好</span>}
                </div>
              )}
              {r.tags && r.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.tags.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">#{t}</span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function ReviewForm({ type, placeId, placeName }: { type: string; placeId: string; placeName: string }) {
  const [adultRating, setAdultRating] = useState(5);
  const [childRating, setChildRating] = useState(5);
  const [childAgeMonths, setChildAgeMonths] = useState(36);
  const [text, setText] = useState('');
  const [hasParking, setHasParking] = useState(false);
  const [hasHighChair, setHasHighChair] = useState(false);
  const [hasNapRoom, setHasNapRoom] = useState(false);
  const [strollerOk, setStrollerOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isRestaurant = type === 'restaurant';

  const submit = async () => {
    setSubmitting(true);
    try {
      const headers: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        const t = sessionStorage.getItem('grandkidsgo_token');
        if (t) headers.Authorization = `Bearer ${t}`;
      }
      const res = await fetch(`${TRAVEL_API}/api/places/${type}/${placeId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          adultRating,
          childRating,
          childAgeMonths,
          text: text || null,
          hasParking,
          hasHighChair: isRestaurant ? hasHighChair : undefined,
          hasNapRoom,
          strollerOk,
        }),
      });
      const d = await res.json();
      if (d.code === 'OK') {
        setSubmitted(true);
        setTimeout(() => location.reload(), 1000);
      } else {
        alert(d.error?.message ?? '提交失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6 text-center">
        <div className="text-3xl mb-2">✅</div>
        <div className="font-bold text-green-800">评价已提交，感谢分享！</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h3 className="font-bold text-gray-900 mb-4">为「{placeName}」打分</h3>

      {/* 大人评分 */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-2">👩 大人评分（实际体验）</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setAdultRating(n)}
              className={`text-3xl transition ${n <= adultRating ? 'text-amber-500' : 'text-gray-200'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* 孩子评分 */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-2">👶 孩子评分（孩子真实感受）</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setChildRating(n)}
              className={`text-3xl transition ${n <= childRating ? 'text-green-500' : 'text-gray-200'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-2">孩子当时多大？</label>
        <select
          value={childAgeMonths}
          onChange={(e) => setChildAgeMonths(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="12">1 岁</option>
          <option value="24">2 岁</option>
          <option value="36">3 岁</option>
          <option value="48">4 岁</option>
          <option value="60">5 岁</option>
          <option value="72">6 岁</option>
          <option value="96">8 岁</option>
          <option value="120">10 岁+</option>
        </select>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="说说你的真实体验：孩子当时玩得开心吗？哪些坑要避？"
        rows={3}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-amber-300"
      />

      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={hasParking} onChange={(e) => setHasParking(e.target.checked)} /> 🅿️ 有停车
        </label>
        {isRestaurant && (
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={hasHighChair} onChange={(e) => setHasHighChair(e.target.checked)} /> 🪑 有宝宝椅
          </label>
        )}
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={hasNapRoom} onChange={(e) => setHasNapRoom(e.target.checked)} /> 🍼 有母婴室
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={strollerOk} onChange={(e) => setStrollerOk(e.target.checked)} /> 🚼 婴儿车友好
        </label>
      </div>

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-lg disabled:opacity-50"
      >
        {submitting ? '提交中…' : '提交评价'}
      </button>
    </div>
  );
}
