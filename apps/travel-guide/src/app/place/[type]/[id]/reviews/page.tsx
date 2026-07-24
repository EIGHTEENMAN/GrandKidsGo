// /place/[type]/[id]/reviews — 评价列表子页（时间线 + 分布 + 筛选）
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StarIcon, UserIcon, BabyIcon, CheckIcon, SparklesIcon, ForkIcon, NursingIcon, StrollerIcon, ParkingIcon } from '@/components/Icons';

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

type SortBy = 'newest' | 'highest' | 'lowest' | 'youngest' | 'oldest';

export default function PlaceReviewsPage() {
  const params = useParams();
  const type = params?.type as string;
  const placeId = params?.id as string;

  const [placeName, setPlaceName] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [aggregate, setAggregate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filterWithChild, setFilterWithChild] = useState(false);
  const [showAll, setShowAll] = useState(true);

  useEffect(() => {
    if (!type || !placeId) return;
    setLoading(true);
    fetch(`${TRAVEL_API}/api/places/${type}/${placeId}`)
      .then(r => r.json())
      .then(d => {
        const data = d?.data ?? d;
        setPlaceName(data?.place?.name ?? '');
        setAggregate(data?.aggregate ?? null);
        setReviews(data?.reviews ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [type, placeId]);

  const filtered = reviews.filter(r => !filterWithChild || r.childRating != null);

  // 评分分布
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) distribution[r.adultRating]++;

  // 排序
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'highest') return b.adultRating - a.adultRating;
    if (sortBy === 'lowest') return a.adultRating - b.adultRating;
    if (sortBy === 'youngest') return (b.childAgeMonths ?? 0) - (a.childAgeMonths ?? 0);
    if (sortBy === 'oldest') return (a.childAgeMonths ?? 0) - (b.childAgeMonths ?? 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const maxDist = Math.max(...Object.values(distribution), 1);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href={`/place/${type}/${placeId}`} className="text-blue-100 text-sm hover:text-white">← 返回详情</Link>
          <h1 className="text-2xl font-extrabold mt-2">{placeName || '地点评价'}</h1>
          <p className="text-blue-100 text-sm mt-1">{reviews.length} 条评价</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center text-gray-400">加载中…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            {/* 左侧：聚合信息 */}
            <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              {/* 三视角 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h2 className="font-bold text-gray-900 mb-3">评分总览</h2>
                              {aggregate?.adultAvgScore != null && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="flex items-center gap-1.5 text-sm"><UserIcon size={14} className="text-cyan-500" /> 大人</span>
                    <span className="font-bold text-cyan-600">{aggregate.adultAvgScore.toFixed(1)}</span>
                  </div>
                )}
                {aggregate?.kidAvgScore != null && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="flex items-center gap-1.5 text-sm"><BabyIcon size={14} className="text-pink-500" /> 孩子</span>
                    <span className="font-bold text-pink-600">{aggregate.kidAvgScore.toFixed(1)}</span>
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  共 {aggregate?.reviewCount ?? reviews.length} 条评价，
                  {aggregate?.withChildRatingCount ?? reviews.filter(r => r.childRating != null).length} 条有孩子评分
                </div>
              </div>

              {/* 评分分布 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 mb-3">评分分布</h3>
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map(n => (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-right">{n}</span>
                      <StarIcon size={10} className="text-amber-500 flex-shrink-0" />
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full"
                          style={{ width: `${(distribution[n] / maxDist) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-500 w-6 text-right">{distribution[n]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 便利聚合 */}
              {aggregate && (aggregate.parkingRate != null || aggregate.napRoomRate != null) && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-900 mb-3">便利设施</h3>
                  <div className="space-y-2 text-sm">
                    {aggregate.parkingRate != null && (
                      <div className="flex justify-between"><span className="flex items-center gap-1"><ParkingIcon size={12} /> 停车</span><span className="font-bold">{Math.round(aggregate.parkingRate * 100)}%</span></div>
                    )}
                    {aggregate.napRoomRate != null && (
                      <div className="flex justify-between"><span className="flex items-center gap-1"><NursingIcon size={12} /> 母婴室</span><span className="font-bold">{Math.round(aggregate.napRoomRate * 100)}%</span></div>
                    )}
                    {aggregate.highChairRate != null && (
                      <div className="flex justify-between"><span className="flex items-center gap-1"><ForkIcon size={12} /> 宝宝椅</span><span className="font-bold">{Math.round(aggregate.highChairRate * 100)}%</span></div>
                    )}
                    {aggregate.strollerOkRate != null && (
                      <div className="flex justify-between"><span className="flex items-center gap-1"><StrollerIcon size={12} /> 婴儿车</span><span className="font-bold">{Math.round(aggregate.strollerOkRate * 100)}%</span></div>
                    )}
                  </div>
                </div>
              )}
            </aside>

            {/* 右侧：评价列表 */}
            <div className="space-y-4">
              {/* 筛选栏 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex items-center gap-3 flex-wrap">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortBy)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="newest">最新</option>
                  <option value="highest">最高分</option>
                  <option value="lowest">最低分</option>
                  <option value="youngest">孩子最小</option>
                  <option value="oldest">孩子最大</option>
                </select>
                <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={filterWithChild} onChange={e => setFilterWithChild(e.target.checked)} className="accent-blue-500" />
                  <BabyIcon size={14} className="text-pink-500" /> 只看有孩子评分的
                </label>
              </div>

              {sorted.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
                  暂无符合条件的评价
                </div>
              ) : (
                <div className="space-y-3">
                  {sorted.map(r => (
                    <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            <UserIcon size={12} className="text-gray-500" />
                            <StarIcon size={14} className="text-amber-500" />
                            <span className="font-bold text-amber-600">{r.adultRating}</span>
                          </div>
                          {r.childRating != null && (
                            <div className="flex items-center gap-0.5 ml-2">
                              <BabyIcon size={12} className="text-pink-500" />
                              <StarIcon size={14} className="text-amber-500" />
                              <span className="font-bold text-pink-600">{r.childRating}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {r.childAgeMonths && <span>{Math.floor(r.childAgeMonths / 12)} 岁 {r.childAgeMonths % 12} 月</span>}
                          <span>{new Date(r.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                      {r.text && <p className="text-sm text-gray-800 mb-2">{r.text}</p>}
                      {r.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {r.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">{t}</span>)}
                        </div>
                      )}
                      {(r.hasParking || r.hasHighChair || r.hasNapRoom || r.strollerOk) && (
                        <div className="flex flex-wrap gap-1 text-[10px] text-gray-500">
                          {r.hasParking && <span className="inline-flex items-center gap-0.5"><CheckIcon size={8} /> 停车</span>}
                          {r.hasNapRoom && <span className="inline-flex items-center gap-0.5"><CheckIcon size={8} /> 母婴室</span>}
                          {r.hasHighChair && <span className="inline-flex items-center gap-0.5"><CheckIcon size={8} /> 宝宝椅</span>}
                          {r.strollerOk && <span className="inline-flex items-center gap-0.5"><CheckIcon size={8} /> 婴儿车友好</span>}
                        </div>
                      )}
                      {r.visitDate && (
                        <div className="text-[10px] text-gray-400 mt-1">去过时间：{r.visitDate}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}