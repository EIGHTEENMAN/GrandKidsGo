// 宝典 - 13 类亲子地点库（v4.1 UI 重构）
// 对齐首页亲子宝典板块：白底 grid 卡片 + 蓝青色 + 全 SVG 图标，去 emoji
'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BookIcon, CityIcon, MapPinIcon, GuidebookIcon, SparklesIcon,
  BeachIcon, MountainIcon, WaterIcon, LeafIcon, ParkIcon, CampIcon,
  SearchIcon, StarIcon, UserIcon, BabyIcon, CloseIcon,
  ForkIcon, RestaurantIcon, HotelIcon, TransportIcon, MedicalIcon,
  StoreIcon, PlaygroundIcon, ScienceIcon, LibraryIcon, MuseumIcon, AquariumIcon,
} from '@/components/Icons';

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

interface Category { key: string; label: string; Icon: any }

const PLACE_CATEGORIES: Category[] = [
  { key: 'sight', label: '景点', Icon: MapPinIcon },
  { key: 'restaurant', label: '餐厅', Icon: ForkIcon },
  { key: 'hotel', label: '酒店', Icon: HotelIcon },
  { key: 'transport', label: '交通', Icon: TransportIcon },
  { key: 'medical', label: '医疗', Icon: MedicalIcon },
  { key: 'convenience', label: '便利店', Icon: StoreIcon },
  { key: 'park', label: '公园', Icon: ParkIcon },
  { key: 'mall', label: '商场', Icon: StoreIcon },
  { key: 'playground', label: '游乐场', Icon: PlaygroundIcon },
  { key: 'science', label: '科技馆', Icon: ScienceIcon },
  { key: 'library', label: '图书馆', Icon: LibraryIcon },
  { key: 'museum', label: '博物馆', Icon: MuseumIcon },
  { key: 'aquarium', label: '海洋馆', Icon: AquariumIcon },
];

const TAG_SVG: Record<string, any> = {
  '玩水': WaterIcon,
  '海边': BeachIcon,
  '爬山': MountainIcon,
  '研学': BookIcon,
  '动物': SparklesIcon,
  '采摘': LeafIcon,
  '露营': CampIcon,
  '历史': BookIcon,
  '主题乐园': SparklesIcon,
  '博物馆': BookIcon,
  '滑雪': MountainIcon,
  '观星': StarIcon,
};

// 卡片容器统一样式
const CARD_CLASS = "group bg-white rounded-lg p-2.5 text-center shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200";
const CARD_ACTIVE_CLASS = "bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-lg p-2.5 text-center shadow-md hover:shadow-lg transition border border-blue-500";

// 类别 icon SVG 映射（卡片无封面时的兜底）
function CategoryIcon({ type, className }: { type: string; className?: string }) {
  const cat = PLACE_CATEGORIES.find((c) => c.key === type);
  const Icon = cat?.Icon ?? MapPinIcon;
  return <Icon className={className} />;
}

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
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-3">走遍宝宝的世界</h1>
          <p className="text-blue-100 mt-2 text-sm md:text-base">13 类亲子地点 · 大人孩子双维度评分 · 看真实评价再决定</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 当前标签高亮 */}
        {tag && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 inline-flex items-center justify-center">
              <SparklesIcon size={16} />
            </span>
            <div className="flex-1">
              <div className="text-xs text-gray-500">正在筛选主题</div>
              <div className="text-lg font-bold text-gray-900">{tag}</div>
            </div>
            <button
              onClick={() => setTag('')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50"
            >
              <CloseIcon size={14} /> 清除
            </button>
          </div>
        )}

        {/* 搜索框 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-3">
          <SearchIcon size={20} className="text-blue-500 flex-shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜地点名称（如：北京动物园 / 上海迪士尼 / 蓝色港湾）"
            className="flex-1 px-2 py-2 text-lg border-0 focus:outline-none bg-transparent"
          />
        </div>

        {/* 按主题筛选 — grid 卡片 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap inline-flex items-center gap-1.5">
              <SparklesIcon size={14} className="text-blue-500" /> 按主题筛选
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
            <button
              onClick={() => setTag('')}
              className={tag === '' ? CARD_ACTIVE_CLASS : CARD_CLASS}
            >
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-1.5 transition ${tag === '' ? 'bg-white/20' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                <CloseIcon size={16} className={tag === '' ? 'text-white' : 'text-blue-600'} />
              </span>
              <div className="text-xs font-medium">全部</div>
            </button>
            {[
              '玩水', '海边', '爬山', '研学', '动物', '采摘', '露营',
              '历史', '主题乐园', '博物馆', '滑雪', '观星',
            ].map((tid) => {
              const Icon = TAG_SVG[tid] ?? SparklesIcon;
              const active = tag === tid;
              return (
                <button
                  key={tid}
                  onClick={() => setTag(active ? '' : tid)}
                  className={active ? CARD_ACTIVE_CLASS : CARD_CLASS}
                >
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-1.5 transition ${active ? 'bg-white/20' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                    <Icon size={16} className={active ? 'text-white' : 'text-blue-600'} />
                  </span>
                  <div className="text-xs font-medium">{tid}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 地点类别 — grid 卡片 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap inline-flex items-center gap-1.5">
              <MapPinIcon size={14} className="text-blue-500" /> 地点类别
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
            <button
              onClick={() => setCategory('')}
              className={!category ? CARD_ACTIVE_CLASS : CARD_CLASS}
            >
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-1.5 transition ${!category ? 'bg-white/20' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                <MapPinIcon size={16} className={!category ? 'text-white' : 'text-blue-600'} />
              </span>
              <div className="text-xs font-medium">全部</div>
            </button>
            {PLACE_CATEGORIES.map((c) => {
              const Icon = c.Icon;
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(active ? '' : c.key)}
                  className={active ? CARD_ACTIVE_CLASS : CARD_CLASS}
                >
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-1.5 transition ${active ? 'bg-white/20' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                    <Icon size={16} className={active ? 'text-white' : 'text-blue-600'} />
                  </span>
                  <div className="text-xs font-medium">{c.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 城市筛选 — grid 卡片 */}
        {cities.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-600 whitespace-nowrap inline-flex items-center gap-1.5">
                <CityIcon size={14} className="text-blue-500" /> 热门城市
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
              <button
                onClick={() => setCityId('')}
                className={!cityId ? CARD_ACTIVE_CLASS : CARD_CLASS}
              >
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-1.5 transition ${!cityId ? 'bg-white/20' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                  <CityIcon size={16} className={!cityId ? 'text-white' : 'text-blue-600'} />
                </span>
                <div className="text-xs font-medium">全部城市</div>
              </button>
              {cities.slice(0, 13).map((c) => {
                const active = cityId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCityId(active ? '' : c.id)}
                    className={active ? CARD_ACTIVE_CLASS : CARD_CLASS}
                  >
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-1.5 transition ${active ? 'bg-white/20' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                      <CityIcon size={16} className={active ? 'text-white' : 'text-blue-600'} />
                    </span>
                    <div className="text-xs font-medium">{c.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-400">搜索中…</div>}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
              <SearchIcon size={28} className="text-blue-500" />
            </div>
            <div className="text-gray-500">没有找到符合条件的地点</div>
            <div className="text-sm text-gray-400 mt-1">换个关键词或调整筛选条件试试</div>
          </div>
        )}

        {/* 地点结果列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <Link
              key={`${p.type}-${p.id}`}
              href={`/place/${p.type}/${p.id}`}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200"
            >
              <div className="h-28 bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center relative">
                {p.coverImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.coverImage} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <CategoryIcon type={p.type} className="text-blue-500" />
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 rounded text-xs font-medium text-gray-700">
                  {p.typeLabel}
                </div>
                {p.cityName && (
                  <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 bg-black/40 text-white rounded text-xs">
                    <CityIcon size={10} />{p.cityName}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 line-clamp-1 mb-2">{p.name}</h3>
                {p.kidHighlights && (
                  <p className="text-xs text-green-700 mb-1 flex items-center gap-1">
                    <BabyIcon size={12} className="flex-shrink-0" /><span className="line-clamp-1">{p.kidHighlights}</span>
                  </p>
                )}
                {p.momHighlights && (
                  <p className="text-xs text-pink-700 mb-2 flex items-center gap-1">
                    <UserIcon size={12} className="flex-shrink-0" /><span className="line-clamp-1">{p.momHighlights}</span>
                  </p>
                )}
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-100">
                  <span className="text-gray-500">{p.reviewCount} 条真实评价</span>
                  {p.adultAvg != null && (
                    <span className="text-amber-600 text-xs inline-flex items-center gap-1">
                      <UserIcon size={10} /><StarIcon size={10} className="text-amber-500" />{p.adultAvg.toFixed(1)}
                      {p.childAvg != null && (
                        <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                          <BabyIcon size={10} /><StarIcon size={10} className="text-amber-500" />{p.childAvg.toFixed(1)}
                        </span>
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
            显示 {items.length} 个地点 · 找不到合适的？<Link href="/guides" className="text-blue-600 hover:text-blue-700 font-medium">看真实攻略</Link>
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