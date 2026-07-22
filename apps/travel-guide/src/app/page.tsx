// 走天下首页 - PC 端（v4.0 全站 UI 优化）
// 详见 项目建设方案/走天下实施方案-v4.0.md
//
// v4.0 调整（基于用户提供的设计图）：
// - 配色：浅蓝→青色 渐变（from-blue-400 via-cyan-500 to-teal-500）
// - 图标：全部用 SVG（替换 emoji）
// - 亲子宝典三板块：统一为 grid 卡片网格
// - 全部/更多链接：统一为"查看全部 →" + text-blue-600
// v4.1 文案调整：
// - 智能攻略板块改名为"懒人规划"
// - 主标题/介绍/三步骤文案改为"以孩子为核心"

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BookIcon, CityIcon, MapPinIcon, GuidebookIcon, SparklesIcon,
  TrophyIcon, AwardIcon, ForkIcon,
  BeachIcon, MountainIcon, WaterIcon, LeafIcon, ParkIcon, CampIcon,
  SearchIcon, ClockIcon, StarIcon, UserIcon,
  FireIcon, HandPointUpIcon, PlaneIcon,
  CrownIcon, MedalIcon, ThumbsUpIcon, BabyIcon,
} from '@/components/Icons';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

// SVG 标签（替代 emoji 字典）
const TAG_SVG: Record<string, JSX.Element> = {
  '玩水': <WaterIcon size={14} />,
  '海边': <BeachIcon size={14} />,
  '爬山': <MountainIcon size={14} />,
  '研学': <BookIcon size={14} />,
  '动物': <SparklesIcon size={14} />,
  '采摘': <LeafIcon size={14} />,
  '露营': <CampIcon size={14} />,
  '历史': <BookIcon size={14} />,
  '主题乐园': <SparklesIcon size={14} />,
  '博物馆': <BookIcon size={14} />,
  '滑雪': <MountainIcon size={14} />,
  '观星': <StarIcon size={14} />,
  '漂流': <WaterIcon size={14} />,
  '游船': <WaterIcon size={14} />,
};

const PLACE_CATEGORIES = [
  { key: 'sight', label: '景点', Icon: MapPinIcon },
  { key: 'restaurant', label: '餐厅', Icon: BookIcon },
  { key: 'hotel', label: '酒店', Icon: CityIcon },
  { key: 'park', label: '公园', Icon: ParkIcon },
  { key: 'playground', label: '游乐场', Icon: SparklesIcon },
  { key: 'museum', label: '博物馆', Icon: BookIcon },
  { key: 'science', label: '科技馆', Icon: SparklesIcon },
  { key: 'library', label: '图书馆', Icon: BookIcon },
  { key: 'aquarium', label: '海洋馆', Icon: WaterIcon },
  { key: 'mall', label: '商场', Icon: CityIcon },
  { key: 'medical', label: '医疗', Icon: BookIcon },
  { key: 'transport', label: '交通', Icon: CityIcon },
  { key: 'convenience', label: '便利店', Icon: CityIcon },
];

interface Guide {
  id: string;
  title: string;
  cityName: string | null;
  days: number | null;
  childAges: number[];
  coverImages?: string[];
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

interface CityLbEntry {
  rank: number;
  cityId: string;
  cityName: string;
  tripCount: number;
  feelingAvg: number;
  score: number;
}

interface PlaceLbEntry {
  rank: number;
  placeId: string;
  placeName: string;
  adultAvg: number;
  childAvg: number | null;
  reviewCount: number;
  childReviewed: number;
  score: number;
}

interface BadgeLbEntry {
  rank: number;
  badgeDefId: string;
  name: string;
  icon: string;
  rarity: string;
  category: string;
  description: string;
  unlockCount: number;
}

const RARITY_LABEL: Record<string, string> = {
  bronze: '铜',
  silver: '银',
  gold: '金',
  diamond: '钻',
};

// 真实亲子旅行照片（来自 Unsplash）
// 每张都是真实孩子在旅行中开心玩耍的照片
const CAROUSEL_SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=1600&q=85',
    eyebrow: '走遍宝宝的世界',
    title: '13 类亲子地点',
    titleLine2: '真实妈妈打分',
    subtitle: '大人孩子双维度评分 · 看真实评价再出发',
    cta: '探索宝典',
    href: '/places',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1600&q=85',
    eyebrow: '真实妈妈的攻略',
    title: '孩子说好',
    titleLine2: '才是真的好',
    subtitle: '基于孩子真实感受数据 · 看到喜欢就一键 fork',
    cta: '看看别人怎么玩',
    href: '/guides',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=1600&q=85',
    eyebrow: '孩子真实感受驱动',
    title: '妈妈榜',
    titleLine2: '你的下一站在哪',
    subtitle: '4 类榜单 × 3 时间维度 · 看妈妈带娃去的好地方',
    cta: '查看妈妈榜',
    href: '/leaderboard',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1559131397-f94da358f7ca?w=1600&q=85',
    eyebrow: '懒人规划',
    title: '不用从零开始',
    titleLine2: '也不用硬塞',
    subtitle: '推荐相似行程 · 一键 fork · 不满意再生成',
    cta: '试试懒人规划',
    href: '/wizard',
  },
];

// 瀑布流卡片高度变体（小红书风格）
const MASONRY_HEIGHTS = ['h-64', 'h-80', 'h-72', 'h-60', 'h-72', 'h-64', 'h-80', 'h-60'];

export default function TravelHome() {
  const [hotGuides, setHotGuides] = useState<Guide[]>([]);
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([]);
  const [cityLb, setCityLb] = useState<CityLbEntry[]>([]);
  const [placeLb, setPlaceLb] = useState<PlaceLbEntry[]>([]);
  const [badgeLb, setBadgeLb] = useState<BadgeLbEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [lbTab, setLbTab] = useState<'mom' | 'city' | 'place' | 'badge'>('mom');

  useEffect(() => {
    const t = setInterval(() => {
      setCarouselIdx((i) => (i + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${TRAVEL_API}/api/guides/feed`).then((r) => r.json()),
      fetch(`${TRAVEL_API}/api/leaderboard/mom?period=week`).then((r) => r.json()),
      fetch(`${TRAVEL_API}/api/leaderboard/city?period=week`).then((r) => r.json()),
      fetch(`${TRAVEL_API}/api/leaderboard/place-hot?period=week`).then((r) => r.json()),
      fetch(`${TRAVEL_API}/api/leaderboard/badge-hot?period=week`).then((r) => r.json()),
    ])
      .then(([feedData, lbData, cityData, placeData, badgeData]) => {
        const allGuides: Guide[] = feedData.items ?? [];
        // 热门攻略：按 like + save 排序，取 12 个瀑布用
        setHotGuides(
          [...allGuides].sort((a, b) => (b.stats.like + b.stats.save * 2) - (a.stats.like + a.stats.save * 2)).slice(0, 12),
        );
        setTopUsers((lbData.items ?? []).slice(0, 8));
        setCityLb((cityData.items ?? []).slice(0, 5));
        setPlaceLb((placeData.items ?? []).slice(0, 5));
        setBadgeLb((badgeData.items ?? []).slice(0, 4));
      })
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, []);

  const slide = CAROUSEL_SLIDES[carouselIdx];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      {/* ===== Hero 轮播相册（真实亲子照片 + 右侧文字） ===== */}
      <header className="relative h-[480px] md:h-[560px] overflow-hidden bg-gray-100">
        {/* 真实照片 */}
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
        </div>

        {/* 右侧文字区（无全屏蒙版，文字下方加白色阴影保证可读） */}
        <Link
          href={slide.href}
          className="absolute inset-0 flex items-center justify-end z-10"
        >
          <div className="text-right px-8 md:px-16 max-w-2xl mr-4 md:mr-12">
            {/* eyebrow chip - 单行不换行 */}
            <div className="inline-block mb-4">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 shadow-md">
                <PlaneIcon size={14} className="text-blue-600" /> {slide.eyebrow}
              </span>
            </div>
            {/* 标题 — 故意分两行，避免自动断行难看 */}
            <h1
              className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight text-white leading-tight"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)' }}
            >
              {slide.title}
              <br />
              {slide.titleLine2}
            </h1>
            {/* 副标题 - text-balance 自动平衡，避免单字成行 */}
            <p
              className="text-base md:text-lg text-white mb-6 leading-relaxed text-balance"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
            >
              {slide.subtitle}
            </p>
            {/* CTA 按钮 - inline-flex 保持单行 */}
            <span className="inline-flex items-center gap-2 px-7 py-3 bg-white text-gray-900 font-bold rounded-full shadow-xl hover:scale-105 transition-transform whitespace-nowrap">
              {slide.cta}
              <span className="text-xl">→</span>
            </span>
          </div>
        </Link>

        <button
          onClick={() => setCarouselIdx((i) => (i - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white transition z-20 flex items-center justify-center text-2xl shadow-lg"
          aria-label="上一张"
        >
          ‹
        </button>
        <button
          onClick={() => setCarouselIdx((i) => (i + 1) % CAROUSEL_SLIDES.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white transition z-20 flex items-center justify-center text-2xl shadow-lg"
          aria-label="下一张"
        >
          ›
        </button>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {CAROUSEL_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCarouselIdx(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === carouselIdx ? 'w-10 bg-white shadow-lg' : 'w-2.5 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`跳到第 ${i + 1} 张`}
            />
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* ===== 板块 1: 亲子宝典（主题 → 城市 → 景点 三层） ===== */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600"><BookIcon size={26} /></span>
              亲子宝典
              <span className="text-sm font-normal text-gray-500">先选主题，再选城市，找到你想去的地方</span>
            </h2>
            <Link href="/places" className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap">
              查看全部 →
            </Link>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            玩水 / 海边 / 研学 / 露营 · 上千个真实亲子地点 · 大人孩子双维度评分
          </p>

          {/* 第一层：热门主题（grid 卡片） */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-600 whitespace-nowrap inline-flex items-center gap-1.5">
                <SparklesIcon size={14} className="text-blue-500" /> 热门主题
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
              {[
                { id: '玩水' }, { id: '海边' },
                { id: '爬山' }, { id: '研学' },
                { id: '动物' }, { id: '采摘' },
                { id: '露营' }, { id: '历史' },
                { id: '主题乐园' }, { id: '博物馆' },
                { id: '滑雪' }, { id: '观星' },
                { id: '漂流' }, { id: '游船' },
              ].slice(0, 7).map((t) => (
                <Link
                  key={t.id}
                  href={`/places?tag=${encodeURIComponent(t.id)}`}
                  className="group bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200"
                >
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 mb-2 group-hover:bg-blue-100 transition">
                    {TAG_SVG[t.id]}
                  </span>
                  <div className="text-sm font-medium text-gray-700">{t.id}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* 第二层：热门城市（grid 卡片） */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-600 whitespace-nowrap inline-flex items-center gap-1.5">
                <CityIcon size={14} className="text-blue-500" /> 热门城市
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
              {['北京', '上海', '杭州', '成都', '广州', '西安', '厦门'].map((city) => (
                <Link
                  key={city}
                  href={`/places?cityName=${encodeURIComponent(city)}`}
                  className="group bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200"
                >
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 mb-2 group-hover:bg-blue-100 transition">
                    <CityIcon size={20} />
                  </span>
                  <div className="text-sm font-medium text-gray-700">{city}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* 第三层：地点类别（grid 卡片） */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-600 whitespace-nowrap inline-flex items-center gap-1.5">
                <MapPinIcon size={14} className="text-blue-500" /> 地点类别
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
              {PLACE_CATEGORIES.slice(0, 7).map((c) => {
                const Icon = c.Icon;
                return (
                  <Link
                    key={c.key}
                    href={`/places?category=${c.key}`}
                    className="group bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200"
                  >
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 mb-2 group-hover:bg-blue-100 transition">
                      <Icon size={20} />
                    </span>
                    <div className="text-sm font-medium text-gray-700">{c.label}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== 板块 2: 热门攻略（小红书瀑布流） ===== */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600"><FireIcon size={26} /></span>
              热门攻略
              <span className="text-sm font-normal text-gray-500">本周点赞收藏最多的真实旅行</span>
            </h2>
            <Link href="/guides" className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap">
              查看全部 →
            </Link>
          </div>

          {!loaded && (
            <div className="text-center py-12 text-gray-400">加载中…</div>
          )}

          {loaded && hotGuides.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
                <GuidebookIcon size={28} className="text-blue-500" />
              </div>
              <div className="text-gray-500 mb-1">还没有发布的攻略</div>
              <div className="text-sm text-gray-400">
                妈妈完成一次出行 + 发布一篇攻略，就会出现在这里
              </div>
            </div>
          )}

          {/* 小红书风格瀑布流 - 2 列错落 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {hotGuides.map((g, i) => {
              // 瀑布流风格：不同高度 + 第一张大图
              const isFeatured = i === 0;
              const heightClass = isFeatured ? 'h-96' : MASONRY_HEIGHTS[i % MASONRY_HEIGHTS.length];
              const coverGradient = COVER_GRADIENTS[i % COVER_GRADIENTS.length];
              const coverImage = g.coverImages?.[0];
              return (
                <Link
                  key={g.id}
                  href={`/guides/${g.id}`}
                  className={`group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all ${isFeatured ? 'col-span-2 md:col-span-2 row-span-2' : ''}`}
                >
                  <div className={`relative ${heightClass} overflow-hidden`}>
                    {coverImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={coverImage}
                        alt={g.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className={`w-full h-full ${coverGradient} flex items-center justify-center relative`}>
                        <MapPinIcon size={56} className="opacity-50 text-white" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      </div>
                    )}
                    {/* 标签 */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {g.cityName && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
                          <MapPinIcon size={12} className="text-blue-600" /> {g.cityName}
                        </span>
                      )}
                      {g.days && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/40 backdrop-blur-sm text-white rounded-full text-xs font-medium">
                          <ClockIcon size={12} /> {g.days} 天
                        </span>
                      )}
                    </div>
                    {/* 底部渐变 + 标题 */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      {isFeatured && (
                        <div className="inline-flex items-center gap-1 text-xs text-yellow-300 font-bold mb-1">
                          <FireIcon size={12} /> 本周最热
                        </div>
                      )}
                      <h3 className={`font-bold text-white line-clamp-2 ${isFeatured ? 'text-lg' : 'text-sm'}`}>
                        {g.title}
                      </h3>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-gray-600 truncate">
                        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-[10px] flex-shrink-0">
                          {g.author.nickname?.[0] ?? '?'}
                        </span>
                        <span className="truncate">{g.author.nickname}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-gray-400 whitespace-nowrap">
                        <ThumbsUpIcon size={12} /> {g.stats.like}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ===== 板块 3: 排行榜（4 个 Tab） ===== */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600"><TrophyIcon size={26} /></span>
              排行榜
              <span className="text-sm font-normal text-gray-500">看看妈妈们带娃玩过的好地方</span>
            </h2>
            <Link href="/leaderboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap">
              查看全部 →
            </Link>
          </div>

          {/* Tab 切换 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-blue-100">
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {[
                { k: 'mom', l: '妈妈榜', d: '按真实感受分排序', Icon: UserIcon },
                { k: 'city', l: '热门城市', d: '妈妈们最爱去', Icon: CityIcon },
                { k: 'place', l: '热门景点', d: '孩子评分最高', Icon: MapPinIcon },
                { k: 'badge', l: '热门勋章', d: '大家都在解锁', Icon: AwardIcon },
              ].map((t) => {
                const Icon = t.Icon;
                return (
                  <button
                    key={t.k}
                    onClick={() => setLbTab(t.k as any)}
                    className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition whitespace-nowrap ${
                      lbTab === t.k
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 font-bold">
                      <Icon size={16} className={lbTab === t.k ? 'text-blue-600' : 'text-gray-400'} />
                      {t.l}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.d}</div>
                  </button>
                );
              })}
            </div>

            <div className="p-4">
              {/* 妈妈榜 */}
              {lbTab === 'mom' && (
                <>
                  {!loaded && <div className="p-8 text-center text-sm text-gray-400">加载中…</div>}
                  {loaded && topUsers.length === 0 && (
                    <div className="p-8 text-center text-sm text-gray-400">暂无榜单数据</div>
                  )}
                  {topUsers.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {topUsers.map((u, i) => (
                        <Link
                          key={u.userId}
                          href="/leaderboard"
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition border border-transparent hover:border-blue-200"
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-lg font-bold shadow-md">
                              {i + 1}
                            </div>
                            {i < 3 && (
                              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white shadow text-amber-500">
                                {i === 0 ? <CrownIcon size={12} className="text-amber-500" /> : i === 1 ? <MedalIcon size={12} className="text-slate-400" /> : <MedalIcon size={12} className="text-orange-500" />}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {u.childLabel || u.nickname || '匿名妈妈'}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              <span className="flex items-center gap-1"><StarIcon size={12} className="text-amber-500 inline" />{u.feelingScoreAvg.toFixed(1)}</span> · <span className="flex items-center gap-1"><AwardIcon size={12} className="inline" />{u.badgeCount}</span> · <span className="flex items-center gap-1"><GuidebookIcon size={12} className="inline" />{u.guideCount}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* 热门城市榜 */}
              {lbTab === 'city' && (
                <>
                  {!cityLb && <div className="p-8 text-center text-sm text-gray-400">加载中…</div>}
                  {cityLb && cityLb.length === 0 && (
                    <div className="p-8 text-center text-sm text-gray-400">还没有城市数据</div>
                  )}
                  {cityLb && cityLb.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                      {cityLb.map((c, i) => (
                        <Link
                          key={c.cityId}
                          href={`/places?cityId=${c.cityId}`}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition border border-transparent hover:border-blue-200"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-lg font-bold shadow-md">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate flex items-center gap-1">
                              <CityIcon size={14} className="text-blue-500 flex-shrink-0" /> {c.cityName}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1"><MapPinIcon size={12} />{c.tripCount} 次出行</span>
                              <span className="inline-flex items-center gap-1"><StarIcon size={12} className="text-amber-500" />{c.feelingAvg.toFixed(1)}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* 热门景点榜 */}
              {lbTab === 'place' && (
                <>
                  {!placeLb && <div className="p-8 text-center text-sm text-gray-400">加载中…</div>}
                  {placeLb && placeLb.length === 0 && (
                    <div className="p-8 text-center text-sm text-gray-400">
                      还没有景点评分 · <Link href="/places" className="text-amber-600">去宝典打分</Link>
                    </div>
                  )}
                  {placeLb && placeLb.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {placeLb.map((p) => (
                        <Link
                          key={p.placeId}
                          href={`/place/sight/${p.placeId}`}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition border border-transparent hover:border-green-200"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0">
                            {p.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate flex items-center gap-1">
                              <MapPinIcon size={14} className="text-green-600 flex-shrink-0" /> {p.placeName}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <UserIcon size={12} /><StarIcon size={12} className="text-amber-500" />{p.adultAvg}
                              </span>
                              {p.childAvg != null && (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <BabyIcon size={12} /><StarIcon size={12} className="text-amber-500" />{p.childAvg}
                                </span>
                              )}
                              <span className="text-gray-400">· {p.reviewCount} 条</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* 热门勋章榜 */}
              {lbTab === 'badge' && (
                <>
                  {!badgeLb && <div className="p-8 text-center text-sm text-gray-400">加载中…</div>}
                  {badgeLb && badgeLb.length === 0 && (
                    <div className="p-8 text-center text-sm text-gray-400">
                      还没有勋章解锁记录
                    </div>
                  )}
                  {badgeLb && badgeLb.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {badgeLb.map((b) => (
                        <Link
                          key={b.badgeDefId}
                          href="/badges"
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-yellow-50 transition border border-transparent hover:border-yellow-200"
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 flex items-center justify-center text-2xl shadow-md">
                              {b.icon}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {b.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <AwardIcon size={12} className="text-amber-500" /> {b.unlockCount} 人已解锁 · {RARITY_LABEL[b.rarity] ?? b.rarity}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* ===== 板块 4: 懒人规划 ===== */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600"><SparklesIcon size={26} /></span>
              懒人规划
              <span className="text-sm font-normal text-gray-500">推荐相似行程，一键 fork 或重新生成</span>
            </h2>
            <Link href="/wizard" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              立即试用 →
            </Link>
          </div>

          <div className="bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl shadow-lg overflow-hidden text-white">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-8">
              <div className="md:col-span-3">
                <h3 className="text-2xl font-bold mb-3">先看相似的行程，再决定怎么玩</h3>
                <p className="text-blue-50 leading-relaxed mb-6">
                  以孩子的需求为核心，推荐和你家孩子情况相似的真实行程，看到喜欢的可以一键做成自己的计划，不用从零开始。
                </p>
                <div className="space-y-3 mb-6">
                  {[
                    { Icon: CityIcon, t: '1. 输入需求（以孩子为核心）' },
                    { Icon: SearchIcon, t: '2. 查看相似行程真实攻略（带相似度评分）' },
                    { Icon: ForkIcon, t: '3. 一键 fork 成你的计划 或 单独生成' },
                  ].map((s) => {
                    const Icon = s.Icon;
                    return (
                      <div key={s.t} className="flex items-center gap-3 text-sm">
                        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Icon size={18} className="text-white" />
                        </span>
                        <span className="text-white">{s.t}</span>
                      </div>
                    );
                  })}
                </div>
                <Link
                  href="/wizard"
                  className="inline-block px-8 py-3 bg-white text-blue-600 font-bold rounded-full shadow-lg hover:shadow-xl transition hover:scale-105"
                >
                  开始懒人规划 →
                </Link>
              </div>

              {/* 右侧 mock 流程图 */}
              <div className="md:col-span-2 flex items-center justify-center">
                <div className="space-y-3 w-full">
                  {[
                    { Icon: CityIcon, t: '北京 · 3 天 · 3 岁 · 平衡' },
                    { Icon: SearchIcon, t: '找到 4 篇相似攻略' },
                    { Icon: SparklesIcon, t: '一键 fork → 我的计划' },
                  ].map((step, i) => {
                    const Icon = step.Icon;
                    return (
                      <div
                        key={i}
                        className="bg-white/15 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 border border-white/20"
                      >
                        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Icon size={16} className="text-white" />
                        </span>
                        <span className="text-sm text-white">{step.t}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-blue-100 mt-2">
                    <HandPointUpIcon size={12} /> 真实的懒人规划体验
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100 mt-16">
        &copy; {new Date().getFullYear()} 童慧行走天下 — 童慧行旗下亲子旅行品牌
      </footer>
    </div>
  );
}

// 瀑布流卡片背景渐变
const COVER_GRADIENTS = [
  'bg-gradient-to-br from-green-300 via-emerald-400 to-teal-500',
  'bg-gradient-to-br from-pink-300 via-rose-400 to-red-500',
  'bg-gradient-to-br from-amber-300 via-orange-400 to-red-400',
  'bg-gradient-to-br from-blue-300 via-cyan-400 to-teal-500',
  'bg-gradient-to-br from-purple-300 via-violet-400 to-indigo-500',
  'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500',
  'bg-gradient-to-br from-emerald-300 via-green-400 to-lime-500',
  'bg-gradient-to-br from-rose-300 via-pink-400 to-fuchsia-500',
];
