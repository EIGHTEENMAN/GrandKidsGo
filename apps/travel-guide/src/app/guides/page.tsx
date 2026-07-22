// 攻略列表 - PC 端（v4.1 UI 重构）
// 用户先看真实攻略 → fork 到自己的计划 / 或一键生成新计划
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SparklesIcon, MapPinIcon, ClockIcon, HeartIcon, EyeIcon, ForkIcon } from '@/components/Icons';

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
  coverImage?: string | null;
  isMock?: boolean;
}

// 模拟数据：真实亲子旅行照片（Unsplash）+ 真实标题
const MOCK_GUIDES: Guide[] = [
  { id: 'mock-1', title: '北京 5 天 4 晚 · 故宫 + 动物园 + 海洋馆', cityName: '北京', days: 5, childAges: [4, 6], travelStyle: '平衡',
    stats: { view: 1832, save: 246, like: 487 }, author: { nickname: '甜豆妈妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&q=80', isMock: true },
  { id: 'mock-2', title: '上海迪士尼 3 天 · 不踩雷的排队路线', cityName: '上海', days: 3, childAges: [3, 5], travelStyle: '慢游',
    stats: { view: 2410, save: 312, like: 658 }, author: { nickname: '小米妈妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80', isMock: true },
  { id: 'mock-3', title: '广州长隆 4 天 · 孩子玩疯的攻略', cityName: '广州', days: 4, childAges: [2, 7], travelStyle: '主题乐园',
    stats: { view: 1290, save: 198, like: 412 }, author: { nickname: '果冻爸', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80', isMock: true },
  { id: 'mock-4', title: '三亚海边亲子 6 天 · 海鲜酒店避坑', cityName: '三亚', days: 6, childAges: [3, 5], travelStyle: '度假',
    stats: { view: 2156, save: 287, like: 524 }, author: { nickname: '海螺小姐', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1559131397-f94da358f7ca?w=800&q=80', isMock: true },
  { id: 'mock-5', title: '成都 4 天 · 熊猫基地 + 周边古镇', cityName: '成都', days: 4, childAges: [4, 6], travelStyle: '平衡',
    stats: { view: 1467, save: 156, like: 298 }, author: { nickname: '圆圆妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1545569310-c55b3c63b8c2?w=800&q=80', isMock: true },
  { id: 'mock-6', title: '杭州西湖 3 天 · 骑行苏堤 + 灵隐', cityName: '杭州', days: 3, childAges: [5, 8], travelStyle: '自然',
    stats: { view: 1135, save: 142, like: 256 }, author: { nickname: '莲藕妈妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=800&q=80', isMock: true },
  { id: 'mock-7', title: '西安 4 天 · 兵马俑研学之旅', cityName: '西安', days: 4, childAges: [7, 9], travelStyle: '研学',
    stats: { view: 1680, save: 223, like: 401 }, author: { nickname: '小满爸', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80', isMock: true },
  { id: 'mock-8', title: '厦门鼓浪屿 3 天 · 亲子拍照路线', cityName: '厦门', days: 3, childAges: [2, 5], travelStyle: '慢游',
    stats: { view: 1342, save: 178, like: 367 }, author: { nickname: '榕树妈妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', isMock: true },
  { id: 'mock-9', title: '青岛海边 4 天 · 啤酒博物馆 + 金沙滩', cityName: '青岛', days: 4, childAges: [5, 7], travelStyle: '平衡',
    stats: { view: 982, save: 134, like: 245 }, author: { nickname: '浪花妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1581837647423-1c5ddff1e0e5?w=800&q=80', isMock: true },
  { id: 'mock-10', title: '深圳 3 天 · 科技馆 + 野生动物园', cityName: '深圳', days: 3, childAges: [4, 6], travelStyle: '研学',
    stats: { view: 1198, save: 167, like: 312 }, author: { nickname: '南风爸爸', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1538099074-9b9e2c1f0e85?w=800&q=80', isMock: true },
  { id: 'mock-11', title: '南京 3 天 · 中山陵 + 红山动物园', cityName: '南京', days: 3, childAges: [6, 8], travelStyle: '历史',
    stats: { view: 1056, save: 145, like: 278 }, author: { nickname: '梧桐妈妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=80', isMock: true },
  { id: 'mock-12', title: '丽江大理 6 天 · 古城 + 洱海骑行', cityName: '丽江', days: 6, childAges: [5, 9], travelStyle: '度假',
    stats: { view: 1879, save: 256, like: 489 }, author: { nickname: '云朵妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', isMock: true },
];

// 瀑布流大小变体（3 列）
const MASONRY_HEIGHTS = ['h-64', 'h-72', 'h-80', 'h-60', 'h-72', 'h-80'];

export default function GuidesPage() {
  const router = useRouter();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [forkingId, setForkingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/guides/feed`)
      .then((r) => r.json())
      .then((d) => {
        const apiGuides: Guide[] = (d.items ?? []).map((g: Guide) => ({ ...g, isMock: false }));
        // API < 12 时用模拟补足
        const merged = apiGuides.length >= 12
          ? apiGuides
          : [...apiGuides, ...MOCK_GUIDES.slice(0, 12 - apiGuides.length)];
        setGuides(merged);
      })
      .catch(() => setGuides(MOCK_GUIDES)) // 接口挂了直接用模拟
      .finally(() => setLoading(false));
  }, []);

  const forkGuide = async (guideId: string) => {
    if (guideId.startsWith('mock-')) {
      alert('这是模拟数据，请先用真实攻略 fork');
      return;
    }
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
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold">看看大家怎么玩</h1>
              <p className="text-blue-100 mt-2 text-sm md:text-base">真实妈妈的亲子旅行 · 看到喜欢的可以一键做成自己的计划</p>
            </div>
            <Link
              href="/wizard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-full text-sm hover:bg-blue-50 transition shadow-md whitespace-nowrap self-start md:self-auto"
            >
              <SparklesIcon size={16} />
              一键生成出行计划
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading && <div className="text-center py-12 text-gray-400">加载攻略中…</div>}

        {!loading && guides.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
              <ForkIcon size={28} className="text-blue-500" />
            </div>
            <div className="text-gray-500 mb-1">还没有发布的攻略</div>
            <div className="text-sm text-gray-400">妈妈完成出行 + 发布一篇，就会出现在这里</div>
          </div>
        )}

        {/* 小红书风格瀑布流 — 3 列大小混合 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guides.map((g, i) => {
            const heightClass = MASONRY_HEIGHTS[i % MASONRY_HEIGHTS.length];
            return (
              <article key={g.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                <Link href={`/guide/${g.id}`} className="block">
                  <div className={`relative ${heightClass} overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100`}>
                    {g.coverImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={g.coverImage}
                        alt={g.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPinIcon size={48} className="text-blue-300" />
                      </div>
                    )}
                    {/* 顶部标签 */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {g.cityName && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
                          <MapPinIcon size={10} className="text-blue-600" /> {g.cityName}
                        </span>
                      )}
                      {g.days && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/40 backdrop-blur-sm text-white rounded-full text-xs font-medium">
                          <ClockIcon size={10} /> {g.days} 天
                        </span>
                      )}
                    </div>
                    {g.isMock && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-amber-400/90 backdrop-blur-sm text-white rounded-full text-xs font-medium shadow-sm">
                        示意
                      </div>
                    )}
                    {/* 底部渐变 */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/guide/${g.id}`}>
                    <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 hover:text-blue-600 transition">
                      {g.title}
                    </h3>
                  </Link>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-[10px] flex-shrink-0">
                        {g.author.nickname?.[0] ?? '?'}
                      </span>
                      <span className="truncate">{g.author.nickname}</span>
                    </span>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-0.5"><EyeIcon size={11} />{g.stats.view}</span>
                      <span className="inline-flex items-center gap-0.5"><HeartIcon size={11} className="text-pink-500" />{g.stats.like}</span>
                      <span className="inline-flex items-center gap-0.5"><ForkIcon size={11} className="text-blue-500" />{g.stats.save}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => forkGuide(g.id)}
                    disabled={forkingId === g.id}
                    className="w-full py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:shadow-md transition flex items-center justify-center gap-1"
                  >
                    <ForkIcon size={12} />
                    {forkingId === g.id ? '生成中…' : '做成我的计划'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}