// 地点详情页 - 走天下 PC 端（v4.0 蓝青 UI）
// 数据来源：/api/places/[type]/[id]（透传完整 place 对象）
// 接 5 字段：recommendedMonths / durationMinutes / kidScore / momScore / dadScore
// Unsplash 兜底图 + 全 SVG 图标 + 0 emoji
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  MapPinIcon, ClockIcon, PhoneIcon, GuidebookIcon, SparklesIcon,
  StarIcon, UserIcon, BabyIcon, ForkIcon, HeartIcon, EyeIcon, ThumbsUpIcon,
  CheckIcon, SunIcon, ChevronRight, ChevronDown,
  NursingIcon, WaterDropIcon, StoreIcon, PlaygroundIcon,
  HospitalIcon, PharmacyIcon, StrollerIcon, DiDiIcon, HotelRoomIcon,
} from '@/components/Icons';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

// Unsplash 兜底图池（5 张亲子旅行主题）
const HERO_POOL = [
  'photo-1602002418082-a4443e081dd1',
  'photo-1511895426328-dc8714191300',
  'photo-1502086223501-7ea6ecd79368',
  'photo-1559131397-f94da358f7ca',
  'photo-1545569310-c55b3c63b8c2',
];

function buildHeroImages(place: { id: string; coverImages?: string[] }): string[] {
  if (place.coverImages && place.coverImages.length > 0) return place.coverImages.slice(0, 5);
  const hash = Array.from(place.id).reduce((s, c) => s + c.charCodeAt(0), 0);
  return [0, 1, 2].map(i =>
    `https://images.unsplash.com/${HERO_POOL[(hash + i) % HERO_POOL.length]}?w=1600&q=85`,
  );
}

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
  createdAt: string;
}

interface PlaceData {
  place: any;
  stats: { adultAvg: number | null; childAvg: number | null; reviewCount: number; withChildRating: number };
  reviews: Review[];
  type: string;
  typeLabel: string;
  nearby?: Record<string, NearbyItem[]>;
}

interface NearbyItem {
  name: string;
  distanceMeters: number | null;
  extra: Record<string, unknown>;
  isVerified: boolean;
}

// 13 类周边 POI 显示配置
const NEARBY_CATEGORIES: Array<{ key: string; label: string; Icon: any; tone: string }> = [
  { key: 'KID_RESTAURANT', label: '亲子餐厅', Icon: ForkIcon, tone: 'text-pink-600 bg-pink-50' },
  { key: 'NURSING_ROOM', label: '母婴室', Icon: NursingIcon, tone: 'text-pink-500 bg-pink-50' },
  { key: 'TAP_WATER', label: '直饮水点', Icon: WaterDropIcon, tone: 'text-cyan-600 bg-cyan-50' },
  { key: 'CONVENIENCE', label: '便利店', Icon: StoreIcon, tone: 'text-blue-600 bg-blue-50' },
  { key: 'TOY_STORE', label: '玩具书店（乐高/泡泡玛特/绘本）', Icon: SparklesIcon, tone: 'text-purple-600 bg-purple-50' },
  { key: 'BOOKSTORE', label: '儿童书店/绘本馆', Icon: GuidebookIcon, tone: 'text-amber-600 bg-amber-50' },
  { key: 'KIDS_HOSPITAL', label: '儿童医院', Icon: HospitalIcon, tone: 'text-red-600 bg-red-50' },
  { key: 'PHARMACY', label: '药店', Icon: PharmacyIcon, tone: 'text-emerald-600 bg-emerald-50' },
  { key: 'MATERNITY_STORE', label: '母婴店', Icon: BabyIcon, tone: 'text-pink-600 bg-pink-50' },
  { key: 'DIDI_PICKUP', label: '网约车点', Icon: DiDiIcon, tone: 'text-blue-600 bg-blue-50' },
  { key: 'TAXI_STAND', label: '出租车候车区', Icon: StoreIcon, tone: 'text-slate-600 bg-slate-50' },
  { key: 'KID_HOTEL', label: '亲子酒店', Icon: HotelRoomIcon, tone: 'text-indigo-600 bg-indigo-50' },
  { key: 'STROLLER_FRIENDLY', label: '婴儿车可达路径', Icon: StrollerIcon, tone: 'text-teal-600 bg-teal-50' },
];

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function formatRecommendedMonths(months: number[]): string {
  if (!months || months.length === 0) return '';
  if (months.length === 12) return '全年';
  if (months.length === 1) return MONTH_NAMES[months[0] - 1];
  const sorted = [...months].sort((a, b) => a - b);
  // 连续区间检测
  const isConsecutive = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1);
  if (isConsecutive) {
    return `${MONTH_NAMES[sorted[0] - 1]} - ${MONTH_NAMES[sorted[sorted.length - 1] - 1]}`;
  }
  return sorted.map((m) => MONTH_NAMES[m - 1]).join('、');
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = minutes / 60;
  if (hours === Math.floor(hours)) return `${hours} 小时`;
  return `${Math.floor(hours)} 小时 ${minutes % 60} 分钟`;
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
  const [heroIdx, setHeroIdx] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/places/${type}/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [type, id]);

  useEffect(() => {
    if (!data) return;
    const t = setInterval(() => {
      setHeroIdx((i) => (i + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(t);
  }, [data]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中…</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center">地点不存在</div>;

  const { place, stats, reviews, typeLabel } = data;
  const heroImages = buildHeroImages(place);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50 pb-12">
      {/* ============ ① Hero 大图轮播（蓝青 mask） ============ */}
      <header className="relative h-[420px] md:h-[480px] overflow-hidden bg-gray-100">
        {heroImages.map((src, i) => (
          <div
            key={i}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
              i === heroIdx ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        {/* 蓝青蒙版 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/50 via-cyan-600/30 to-teal-600/60" />

        <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10 z-10">
          <Link href="/places" className="text-white/80 hover:text-white text-sm inline-flex items-center gap-1 self-start">
            <span>←</span> 返回宝典
          </Link>
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/30">
                {typeLabel}
              </span>
              {place.city?.name && (
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/30 inline-flex items-center gap-1">
                  <MapPinIcon size={12} /> {place.city.name}
                </span>
              )}
              {/* 推荐月份 chip — 接 recommendedMonths 字段 */}
              {place.recommendedMonths && place.recommendedMonths.length > 0 && (
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/30 inline-flex items-center gap-1">
                  <SunIcon size={12} /> 推荐 {formatRecommendedMonths(place.recommendedMonths)}
                </span>
              )}
              {/* 游玩时长 chip — 接 durationMinutes 字段 */}
              {place.durationMinutes && (
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/30 inline-flex items-center gap-1">
                  <ClockIcon size={12} /> {formatDuration(place.durationMinutes)}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              {place.name}
            </h1>
            {/* 三视角评分徽章 — 接 kidScore/momScore/dadScore 字段 */}
            {(place.kidScore || place.momScore || place.dadScore) && (
              <div className="flex flex-wrap gap-2">
                {place.kidScore != null && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-pink-500/90 backdrop-blur-sm rounded-full text-sm font-bold text-white">
                    <BabyIcon size={14} /> 孩子 {place.kidScore.toFixed(1)}
                  </span>
                )}
                {place.momScore != null && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-500/90 backdrop-blur-sm rounded-full text-sm font-bold text-white">
                    <HeartIcon size={14} /> 妈妈 {place.momScore.toFixed(1)}
                  </span>
                )}
                {place.dadScore != null && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-600/90 backdrop-blur-sm rounded-full text-sm font-bold text-white">
                    <UserIcon size={14} /> 爸爸 {place.dadScore.toFixed(1)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 轮播 dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIdx(i)}
              className={`h-2 rounded-full transition-all ${i === heroIdx ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
              aria-label={`第 ${i + 1} 张`}
            />
          ))}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ============ ② 核心信息 ============ */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <GuidebookIcon size={18} className="text-blue-600" /> 核心信息
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {place.address && (
              <div className="flex gap-3">
                <MapPinIcon size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">地址</div>
                  <div className="text-gray-900">{place.address}</div>
                </div>
              </div>
            )}
            {place.openHours && (
              <div className="flex gap-3">
                <ClockIcon size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">营业时间</div>
                  <div className="text-gray-900">{place.openHours}</div>
                </div>
              </div>
            )}
            {place.ticketPrice && (
              <div className="flex gap-3">
                <SparklesIcon size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">门票</div>
                  <div className="text-gray-900">{place.ticketPrice}</div>
                </div>
              </div>
            )}
            {place.phone && (
              <div className="flex gap-3">
                <PhoneIcon size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">电话</div>
                  <div className="text-gray-900">{place.phone}</div>
                </div>
              </div>
            )}
            {place.officialSite && (
              <div className="flex gap-3 md:col-span-2">
                <GuidebookIcon size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">官网</div>
                  <a href={place.officialSite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 break-all">
                    {place.officialSite}
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============ ③ 孩子需求三大视角 ============ */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {place.kidHighlights && (
            <div className="bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-2xl p-5 border border-pink-200">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 mb-2">
                <BabyIcon size={14} /> 孩子视角
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">{place.kidHighlights}</p>
            </div>
          )}
          {place.momHighlights && (
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-2xl p-5 border border-cyan-200">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 mb-2">
                <HeartIcon size={14} /> 妈妈视角
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">{place.momHighlights}</p>
            </div>
          )}
          {place.dadHighlights && (
            <div className="bg-gradient-to-br from-slate-100 to-slate-200/50 rounded-2xl p-5 border border-slate-300">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-2">
                <UserIcon size={14} /> 爸爸视角
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">{place.dadHighlights}</p>
            </div>
          )}
        </section>

        {/* ============ ④ Tips & Pitfalls ============ */}
        {(place.tips || place.pitfalls) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {place.tips && (
              <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-2 inline-flex items-center gap-2">
                  <CheckIcon size={16} /> 小贴士
                </h3>
                <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-line">{place.tips}</p>
              </div>
            )}
            {place.pitfalls && (
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                <h3 className="font-bold text-amber-900 mb-2 inline-flex items-center gap-2">
                  <SparklesIcon size={16} /> 避坑提醒
                </h3>
                <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-line">{place.pitfalls}</p>
              </div>
            )}
          </section>
        )}

        {/* ============ ⑤ 双维度评分卡 ============ */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <StarIcon size={18} className="text-amber-500" /> 双维度评分
          </h2>
          <div className="grid grid-cols-2 gap-6 text-center mb-4">
            <div>
              <div className="text-xs text-gray-500 mb-1 inline-flex items-center gap-1">
                <UserIcon size={12} /> 大人评分
              </div>
              <div className="text-3xl font-extrabold text-blue-600">
                {stats.adultAvg ? stats.adultAvg.toFixed(1) : '—'}
                <span className="text-sm font-normal text-gray-400 ml-1">/ 5</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{stats.reviewCount} 条评价</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 inline-flex items-center gap-1">
                <BabyIcon size={12} /> 孩子评分
              </div>
              <div className="text-3xl font-extrabold text-pink-600">
                {stats.childAvg ? stats.childAvg.toFixed(1) : '—'}
                <span className="text-sm font-normal text-gray-400 ml-1">/ 5</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{stats.withChildRating} 条孩子评分</div>
            </div>
          </div>
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="block w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 rounded-2xl shadow-md transition"
          >
            {showReviewForm ? '收起评价表单' : '为这个地方打分（大人 + 孩子双维度）'}
          </button>
          {showReviewForm && <ReviewForm type={type} placeId={id} placeName={place.name} />}
        </section>

        {/* ============ ⑥ 真实妈妈评价 ============ */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <HeartIcon size={18} className="text-pink-500" /> 真实妈妈的评价（{reviews.length}）
          </h2>
          {reviews.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200 text-gray-500">
              还没有人评价 · 成为第一个分享感受的妈妈
            </div>
          )}
          <div className="space-y-3">
            {reviews.map((r) => (
              <article key={r.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-sm">
                      <UserIcon size={12} className="text-blue-600" />
                      <span className="font-bold text-blue-700 inline-flex items-center gap-0.5">
                        <StarIcon size={12} className="text-amber-500" /> {r.adultRating}
                      </span>
                    </div>
                    {r.childRating && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-pink-50 rounded text-sm">
                        <BabyIcon size={12} className="text-pink-600" />
                        <span className="font-bold text-pink-700 inline-flex items-center gap-0.5">
                          <StarIcon size={12} className="text-amber-500" /> {r.childRating}
                        </span>
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
                    {r.hasParking && (
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded inline-flex items-center gap-1">
                        <SparklesIcon size={10} /> 有停车
                      </span>
                    )}
                    {r.hasHighChair && (
                      <span className="text-xs px-2 py-0.5 bg-pink-50 text-pink-700 rounded inline-flex items-center gap-1">
                        <ForkIcon size={10} /> 宝宝椅
                      </span>
                    )}
                    {r.hasNapRoom && (
                      <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded inline-flex items-center gap-1">
                        <BabyIcon size={10} /> 母婴室
                      </span>
                    )}
                    {r.strollerOk && (
                      <span className="text-xs px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded inline-flex items-center gap-1">
                        <ThumbsUpIcon size={10} /> 婴儿车友好
                      </span>
                    )}
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
        </section>

        {/* ============ ⑦ 周边便利（13 类孩子需求折叠面板） ============ */}
        {data.nearby && Object.keys(data.nearby).length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
              <MapPinIcon size={18} className="text-blue-600" /> 周边便利（孩子视角）
            </h2>
            <div className="space-y-2">
              {NEARBY_CATEGORIES.filter((c) => data.nearby?.[c.key]?.length).map((c) => {
                const items = data.nearby![c.key]!;
                const Icon = c.Icon;
                return (
                  <details
                    key={c.key}
                    className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                    open={c.key === 'KID_RESTAURANT'}
                  >
                    <summary className="px-5 py-4 cursor-pointer flex items-center gap-3 hover:bg-blue-50/50 transition-colors">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${c.tone}`}>
                        <Icon size={18} />
                      </span>
                      <span className="flex-1 font-medium text-gray-900">{c.label}</span>
                      <span className="text-xs text-gray-500">{items.length} 处</span>
                      <ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                      {items.map((it, i) => (
                        <div key={i} className="px-5 py-3 flex items-start gap-3">
                          <MapPinIcon size={14} className="text-blue-500 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{it.name}</div>
                            {Object.keys(it.extra).length > 0 && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {Object.entries(it.extra).slice(0, 3).map(([k, v]) => {
                                  const labelMap: Record<string, string> = {
                                    hasKidsMenu: '儿童菜单', avgPrice: '人均', walkInOk: '可现场取号',
                                    isFree: '免费', hasHotWater: '热水', hasRamp: '无障碍坡道', hasElevator: '电梯',
                                    hasKidsPool: '儿童泳池', hasKidsBreakfast: '儿童早餐', hasFamilyRoom: '家庭房', hasCrib: '婴儿床',
                                    hasLego: '乐高', hasPopMart: '泡泡玛特', hasKidsSection: '儿童区',
                                    hasMilkPowder: '奶粉', hasDiapers: '尿不湿', hasChildMedicine: '儿童用药',
                                    hasPediatrics: '儿科', hasER: '急诊', hasPlayArea: '儿童乐园',
                                    ageRange: '适龄', hasQueue: '排队区', notes: '备注',
                                  };
                                  const display = labelMap[k] ?? k;
                                  const value = typeof v === 'boolean' ? (v ? '✓' : '✗') : v;
                                  return `${display}：${value}`;
                                }).join(' · ')}
                              </div>
                            )}
                          </div>
                          {it.distanceMeters != null && (
                            <div className="text-xs text-blue-600 font-medium flex-shrink-0">
                              {it.distanceMeters < 1000 ? `${it.distanceMeters} 米` : `${(it.distanceMeters / 1000).toFixed(1)} 公里`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
              {/* mock 数据 banner（P4 真数据后移除） */}
              <div className="text-xs text-gray-400 mt-2 px-1">
                提示：周边数据为示意（P4 接高德真实 POI 后自动更新）
              </div>
            </div>
          </section>
        )}
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const t = sessionStorage.getItem('grandkidsgo_token');
        if (t) headers.Authorization = `Bearer ${t}`;
      }
      const res = await fetch(`${TRAVEL_API}/api/places/${type}/${placeId}/review`, {
        method: 'POST',
        headers,
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
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mt-4 text-center">
        <CheckIcon size={32} className="text-blue-600 mx-auto mb-2" />
        <div className="font-bold text-blue-900">评价已提交，感谢分享！</div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50/30 rounded-2xl p-6 mt-4 border border-blue-100">
      <h3 className="font-bold text-gray-900 mb-4">为「{placeName}」打分</h3>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-2 inline-flex items-center gap-1">
          <UserIcon size={14} /> 大人评分（实际体验）
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setAdultRating(n)}
              className={`text-3xl transition ${n <= adultRating ? 'text-amber-500' : 'text-gray-200'}`}
              aria-label={`${n} 星`}
            >
              <StarIcon size={28} />
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-2 inline-flex items-center gap-1">
          <BabyIcon size={14} /> 孩子评分（孩子真实感受）
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setChildRating(n)}
              className={`text-3xl transition ${n <= childRating ? 'text-amber-500' : 'text-gray-200'}`}
              aria-label={`${n} 星`}
            >
              <StarIcon size={28} />
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-2">孩子当时多大？</label>
        <select
          value={childAgeMonths}
          onChange={(e) => setChildAgeMonths(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
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
        className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
      />

      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={hasParking} onChange={(e) => setHasParking(e.target.checked)} className="accent-blue-500" />
          <span className="inline-flex items-center gap-1"><SparklesIcon size={12} /> 有停车</span>
        </label>
        {isRestaurant && (
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={hasHighChair} onChange={(e) => setHasHighChair(e.target.checked)} className="accent-blue-500" />
            <span className="inline-flex items-center gap-1"><ForkIcon size={12} /> 有宝宝椅</span>
          </label>
        )}
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={hasNapRoom} onChange={(e) => setHasNapRoom(e.target.checked)} className="accent-blue-500" />
          <span className="inline-flex items-center gap-1"><BabyIcon size={12} /> 有母婴室</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={strollerOk} onChange={(e) => setStrollerOk(e.target.checked)} className="accent-blue-500" />
          <span className="inline-flex items-center gap-1"><ThumbsUpIcon size={12} /> 婴儿车友好</span>
        </label>
      </div>

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3 rounded-lg disabled:opacity-50 hover:shadow-lg transition"
      >
        {submitting ? '提交中…' : '提交评价'}
      </button>
    </div>
  );
}