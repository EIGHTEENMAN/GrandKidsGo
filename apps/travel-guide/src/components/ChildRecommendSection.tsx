// 2026-07-31 v1.0 Phase A：基于当前用户孩子的"为孩子推荐"Section
// 在 /places 列表页顶部、city 筛选下方展示
// 入参：当前 cityId（已选城市）
'use client';
import { useEffect, useState } from 'react';
import { SparklesIcon } from '@/components/Icons';
import { getToken, authedFetch } from '@/lib/auth';

interface RecommendedItem {
  placeId: string;
  placeType: string;
  placeName: string;
  coverImage: string | null;
  tags: string[];
  score: number;
  reasons: Array<{ type: string; text: string; weight: number }>;
}

interface ChildSnapshot {
  childId: string;
  name: string;
  ageMonths: number;
  isShy: boolean;
  fearsAnimals: boolean;
  allergies: string[];
  likes: string[];
}

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

export function ChildRecommendSection({ cityId }: { cityId: string }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RecommendedItem[]>([]);
  const [snapshot, setSnapshot] = useState<ChildSnapshot | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!cityId) return;
    const token = typeof window !== 'undefined' ? getToken() : null;
    if (!token) return; // 未登录直接隐藏（推荐是增强功能）

    setLoading(true);
    setError('');
    (async () => {
      try {
        // 拉当前用户第一个孩子
        const meRes = await authedFetch('/api/auth/me');
        const meJson = await meRes.json().catch(() => null);
        const userId = meJson?.data?.id ?? meJson?.user?.id;
        if (!userId) { setLoading(false); return; }
        const childrenRes = await authedFetch(`/api/user/children?userId=${userId}`);
        const childrenJson = await childrenRes.json().catch(() => null);
        const childItems = childrenJson?.data?.items ?? childrenJson?.items ?? [];
        if (!childItems.length) { setLoading(false); return; }
        const childId = childItems[0]!.childId;

        // 调推荐端点
        const r = await fetch(`${TRAVEL_API}/api/places/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cityId, childId, limit: 6 }),
        });
        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.data) {
          setError(j?.message ?? `HTTP ${r.status}`);
          setLoading(false);
          return;
        }
        setItems(j.data.items ?? []);
        setSnapshot(j.data.childSnapshot ?? null);
      } catch (e: any) {
        setError(e?.message ?? '推荐失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [cityId]);

  if (!cityId) return null;
  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 text-sm text-gray-400 inline-flex items-center gap-2">
        <SparklesIcon size={16} className="text-blue-500 animate-pulse" />
        正在根据孩子画像推荐…
      </div>
    );
  }
  if (error || items.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-white border border-blue-100 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900 inline-flex items-center gap-2 text-base">
            <SparklesIcon size={18} className="text-blue-500" />
            为 {snapshot?.name ?? '孩子'} 推荐
          </h3>
          {snapshot && (
            <p className="text-xs text-gray-500 mt-0.5">
              {snapshot.ageMonths >= 24 ? `${Math.floor(snapshot.ageMonths / 12)} 岁` : `${snapshot.ageMonths} 月龄`}
              {snapshot.likes.length > 0 && ` · 喜欢「${snapshot.likes.slice(0, 2).join("」「")}」`}
            </p>
          )}
        </div>
        <button
          disabled
          title="完整推荐列表 Phase B 上线"
          className="text-xs text-blue-600 hover:text-blue-700 font-medium opacity-60 cursor-not-allowed"
        >
          查看全部 →
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {items.slice(0, 6).map(it => (
          <div
            key={it.placeId}
            className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer"
          >
            <div className="aspect-square bg-gray-100 relative">
              {it.coverImage ? (
                <img src={it.coverImage} alt={it.placeName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
                  {it.placeType === 'restaurant' ? '🍽' : '🗺'}
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur text-[10px] font-bold text-blue-600 px-1.5 py-0.5 rounded">
                ★ {(it.score * 5).toFixed(1)}
              </div>
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-gray-900 truncate">{it.placeName}</p>
              {it.reasons[0] && (
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                  {it.reasons[0].type === 'likes' && '🎯'}
                  {it.reasons[0].type === 'shy_safe' && '⚠️'}
                  {it.reasons[0].type === 'no_animal' && '⚠️'}
                  {it.reasons[0].type === 'student_discount' && '🎓'}
                  {it.reasons[0].type === 'kid_ticket' && '🎫'}
                  {it.reasons[0].type === 'age_match' && '👶'}
                  {' '}{it.reasons[0].text}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
