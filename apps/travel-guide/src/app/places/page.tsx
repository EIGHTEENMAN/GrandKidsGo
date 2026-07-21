// 宝典 - 13 类亲子地点库
'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface Place {
  id: string;
  type: string;
  typeLabel: string;
  name: string;
  cityId: string | null;
  cityName: string | null;
  coverImage: string | null;
  kidHighlights: string | null;
  momHighlights: string | null;
  rating: number;
  reviewCount: number;
  tags: string[];
  adultAvg: number | null;
  childAvg: number | null;
}

interface Category { key: string; label: string }

const PLACE_CATEGORIES: Category[] = [
  { key: 'sight', label: '景点' },
  { key: 'restaurant', label: '餐厅' },
  { key: 'hotel', label: '酒店' },
  { key: 'transport', label: '交通' },
  { key: 'medical', label: '医疗' },
  { key: 'convenience', label: '便利店' },
  { key: 'park', label: '公园' },
  { key: 'mall', label: '商场' },
  { key: 'playground', label: '游乐场' },
  { key: 'science', label: '科技馆' },
  { key: 'library', label: '图书馆' },
  { key: 'museum', label: '博物馆' },
  { key: 'aquarium', label: '海洋馆' },
];

const EMOJI: Record<string, string> = {
  sight: '🏛️',
  restaurant: '🍽️',
  hotel: '🏨',
  transport: '🚇',
  medical: '🏥',
  convenience: '🏪',
  park: '🌳',
  mall: '🛍️',
  playground: '🎠',
  science: '🔬',
  library: '📚',
  museum: '🏛️',
  aquarium: '🐠',
};

function PlacesContent() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [tag, setTag] = useState(searchParams.get('tag') ?? '');
  const [items, setItems] = useState<Place[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [cityId, setCityId] = useState(searchParams.get('cityId') ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/cities`)
      .then((r) => r.json())
      .then((d) => setCities(d.data ?? d.cities ?? []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    // 优先用 tag API（标签优先路径）
    if (tag) {
      const params = new URLSearchParams();
      params.set('tag', tag);
      if (cityId) params.set('cityId', cityId);
      fetch(`${TRAVEL_API}/api/places/by-tag?${params}`)
        .then((r) => r.json())
        .then((d) => setItems(d.data?.items ?? []))
        .catch(console.error)
        .finally(() => setLoading(false));
      return;
    }
    // 普通搜索
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (cityId) params.set('cityId', cityId);
    const t = setTimeout(() => {
      fetch(`${TRAVEL_API}/api/places?${params}`)
        .then((r) => r.json())
        .then((d) => setItems(d.data?.items ?? []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q, category, cityId, tag]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/" className="text-amber-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">📚 走遍宝宝的世界</h1>
          <p className="text-amber-100 mt-1">13 类亲子地点 · 大人孩子双维度评分 · 看真实评价再决定</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 当前标签高亮 */}
        {tag && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <span className="text-2xl">🏷️</span>
            <div className="flex-1">
              <div className="text-xs text-gray-500">正在筛选主题</div>
              <div className="text-lg font-bold text-gray-900">{tag}</div>
            </div>
            <button
              onClick={() => setTag('')}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50"
            >
              ✕ 清除
            </button>
          </div>
        )}

        {/* 标签横滑 chip 行 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-600">🏷️ 按主题筛选</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {[
              { id: '玩水', emoji: '💦' }, { id: '海边', emoji: '🏖️' },
              { id: '爬山', emoji: '⛰️' }, { id: '研学', emoji: '📖' },
              { id: '动物', emoji: '🦁' }, { id: '采摘', emoji: '🍎' },
              { id: '露营', emoji: '🏕️' }, { id: '历史', emoji: '🏛️' },
              { id: '主题乐园', emoji: '🎡' }, { id: '博物馆', emoji: '🏛️' },
              { id: '滑雪', emoji: '⛷️' }, { id: '观星', emoji: '🌌' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTag(t.id === tag ? '' : t.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                  tag === t.id
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300'
                }`}
              >
                {t.emoji} {t.id}
              </button>
            ))}
          </div>
        </div>

        {/* 搜索框 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜地点名称（如：北京动物园 / 上海迪士尼 / 蓝色港湾）"
            className="w-full px-4 py-3 text-lg border-0 focus:outline-none"
          />
        </div>

        {/* 类目筛选 */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setCategory('')}
            className={`px-4 py-2 rounded-full text-sm transition ${
              !category ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            全部
          </button>
          {PLACE_CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-4 py-2 rounded-full text-sm transition flex items-center gap-1 ${
                category === c.key ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300'
              }`}
            >
              <span>{EMOJI[c.key]}</span>
              {c.label}
            </button>
          ))}
        </div>

        {/* 城市筛选 */}
        {cities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setCityId('')}
              className={`px-3 py-1 rounded-full text-xs ${
                !cityId ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部城市
            </button>
            {cities.slice(0, 10).map((c) => (
              <button
                key={c.id}
                onClick={() => setCityId(c.id)}
                className={`px-3 py-1 rounded-full text-xs ${
                  cityId === c.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-400">搜索中…</div>}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-gray-500">没有找到符合条件的地点</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <Link
              key={`${p.type}-${p.id}`}
              href={`/place/${p.type}/${p.id}`}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition border border-gray-100"
            >
              <div className="h-28 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center relative">
                {p.coverImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.coverImage} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl">{EMOJI[p.type]}</span>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 rounded text-xs font-medium">
                  {p.typeLabel}
                </div>
                {p.cityName && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 text-white rounded text-xs">
                    {p.cityName}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 line-clamp-1 mb-1">{p.name}</h3>
                {p.kidHighlights && (
                  <p className="text-xs text-green-700 mb-1">👶 {p.kidHighlights}</p>
                )}
                {p.momHighlights && (
                  <p className="text-xs text-pink-700 mb-2">👩 {p.momHighlights}</p>
                )}
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-100">
                  <span className="text-gray-500">{p.reviewCount} 条真实评价</span>
                  {p.adultAvg != null && (
                    <span className="text-amber-600 text-xs">
                      大人 ⭐{p.adultAvg.toFixed(1)}
                      {p.childAvg != null && (
                        <span className="ml-1 text-green-600">宝宝 ⭐{p.childAvg.toFixed(1)}</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {items.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-400">
            显示 {items.length} 个地点 · 找不到合适的？<Link href="/guides" className="text-green-600">看真实攻略</Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PlacesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中…</div>}>
      <PlacesContent />
    </Suspense>
  );
}
