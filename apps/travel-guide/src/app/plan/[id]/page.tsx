// Plan 详情页（攻略体系 v1.0 PR3 重写 + P2 v2：xlsx 风格 + 孩子专题）
// 67 行空 success card → v2 完整版：
// - hero + 状态徽章
// - 顶部总览（孩子友好度评分 + 推车友好度）
// - 每日行程（xlsx 风格：时段/时间/内容/核心观赏点/门票/交通/时长/饭店/注意事项）
// - 孩子专题板块（每个 spot 的 kidHighlights + tips + pitfalls + 推车友好度）
// - bottom sticky CTA bar

'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PlanIcon, GuidebookIcon, SparklesIcon, PencilIcon, EditIcon, BabyIcon } from '@/components/Icons';
import { getToken, authedFetch } from '@/lib/auth';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

type PlanStatus = 'draft' | 'confirmed' | 'active' | 'completed' | 'published';

interface TimelineBlock {
  kind?: string;
  title?: string;
  startMinutes?: number;
  endMinutes?: number;
  kidHook?: string;
  spotId?: string;
  cityId?: string;
}

interface TimelineDay {
  day?: number;
  cityId?: string;
  date?: string;
  theme?: string;
  blocks?: TimelineBlock[];
}

interface PlanData {
  id: string;
  title: string | null;
  status: PlanStatus;
  cityId: string | null;
  cityIds?: string[];
  cityName?: string;
  childAges: number[];
  startDate: string;
  endDate: string;
  timelineBlocks?: TimelineDay[];
  hasGuide?: boolean;
  guideId?: string | null;
}

interface RatingSummary {
  total: number;
  physicalState: Array<{ value: string; count: number }>;
  emotionalPeak: Array<{ value: string; count: number }>;
  willingnessToReturn: Array<{ value: string; count: number }>;
  stayDuration: { avgMinutes: number | null; medianMinutes: number | null; sample: number };
  cry: { recordsWithCry: number; totalEpisodes: number; rate: number };
  // 2026-07-31 v1.0 Phase B 新增
  cryTriggerDistribution?: Record<string, number>;
  favoriteMoments?: Array<{ spotId: string | null; text: string }>;
  wishToReturnDistribution?: Record<string, number>;
  parentJoyDistribution?: Record<string, number>;
}

interface SpotLite {
  id: string;
  name: string;
  kidHighlights: string | null;
  tips: string | null;
  pitfalls: string | null;
  durationMinutes: number | null;
  kidScore: number | null;
  tags: string[];
  address: string | null;
  phone: string | null;
  images: string[];
  spotType: string | null;
  ticketPrice: string | null;
  openHours: string | null;
  nearbyFacilities: any; // JSON: { 母婴室, 儿童餐, 推车可达, ... }
}

interface PlanSpots {
  spots: SpotLite[];
  summary: {
    totalSpots: number;
    avgKidScore: number | null;
    hasStrollerFriendly: boolean;
    hasStrollerIssue: boolean;
  };
  perDay: Array<{
    dayIndex: number;
    blocks: Array<{
      blockId?: string;
      kind?: string;
      title?: string;
      startMinutes?: number;
      endMinutes?: number;
      kidHook?: string;
      transportMode?: string;
      trafficMinutes?: number;
      distanceFromHotel?: number;
      parkingInfo?: string;
      nearbyRestaurants?: string[];
      spot: SpotLite | null;
    }>;
  }>;
}

const STATUS_META: Record<PlanStatus, { label: string; tone: string; ring: string }> = {
  draft:     { label: '草稿',     tone: 'bg-gray-100 text-gray-700',     ring: 'ring-gray-300' },
  confirmed: { label: '已确认',   tone: 'bg-blue-100 text-blue-700',     ring: 'ring-blue-300' },
  active:    { label: '进行中',   tone: 'bg-amber-100 text-amber-700',   ring: 'ring-amber-300' },
  completed: { label: '已完成',   tone: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-300' },
  published: { label: '已发攻略', tone: 'bg-purple-100 text-purple-700', ring: 'ring-purple-300' },
};

const KIND_LABEL: Record<string, string> = {
  spot: '🎯 景点',
  restaurant: '🍽️ 餐厅',
  park: '🌳 公园',
  playground: '🎠 游乐场',
  hotel: '🏨 酒店',
  transit: '🚄 交通',
  rest: '😴 休息',
};

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [planSpots, setPlanSpots] = useState<PlanSpots | null>(null);
  const [ratings, setRatings] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; nickname: string; avatar: string | null } | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const token = typeof window !== 'undefined' ? getToken() : null;

  useEffect(() => {
    if (!token) { router.push(`/login?redirect=/plan/${id}`); return; }
    authedFetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d?.data ?? d?.user ?? d))
      .catch(() => {});
  }, [router, token, id]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      fetch(`${TRAVEL_API}/api/plans/${id}`).then(r => r.json().catch(() => null)),
      fetch(`${TRAVEL_API}/api/plans/${id}/spots`).then(r => r.json().catch(() => null)),
      fetch(`${TRAVEL_API}/api/guides?planId=${id}`).then(r => r.json().catch(() => null)),
      fetch(`${TRAVEL_API}/api/plans/${id}/ratings/summary`).then(r => r.json().catch(() => null)),
    ]).then(([pd, sd, gd, rd]) => {
      const p = pd?.data ?? pd;
      if (!p?.id) { setError('计划不存在'); return; }
      setPlan({
        id: p.id,
        title: p.title ?? '我的出行计划',
        status: p.status ?? 'draft',
        cityId: p.cityId ?? null,
        cityIds: p.cityIds ?? [],
        cityName: p.city?.name ?? '',
        childAges: p.childAges ?? [],
        startDate: p.startDate,
        endDate: p.endDate,
        timelineBlocks: Array.isArray(p.timelineBlocks) ? p.timelineBlocks : [],
        hasGuide: !!(gd?.data?.items?.length),
        guideId: gd?.data?.items?.[0]?.id ?? null,
      });
      setPlanSpots(sd?.data ?? null);
      setRatings(rd?.data ?? null);
    })
    .catch(() => setError('加载失败'))
    .finally(() => setLoading(false));
  }, [user?.id, id]);

  const days = useMemo(() => plan?.timelineBlocks ?? [], [plan]);

  const handleConvertToGuide = async () => {
    if (!plan) return;
    setActionPending(true);
    try {
      const r = await authedFetch(`/api/guides/from-plan/${plan.id}`, { method: 'POST' });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.id) router.push(`/guides/${d.id}/edit`);
      else alert(d?.error?.message ?? '转换失败');
    } finally {
      setActionPending(false);
    }
  };

  const handleRecordFeeling = () => plan && router.push(`/plans/${plan.id}/feeling`);
  const handleEdit = () => plan && router.push(`/plan/${plan.id}/edit`);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-gray-500">{error}</div>;
  if (!plan) return null;

  const meta = STATUS_META[plan.status];
  const dateRange = `${plan.startDate?.slice(0, 10) ?? ''} → ${plan.endDate?.slice(0, 10) ?? ''}`;
  const totalDays = days.length || daysCompute(plan.startDate, plan.endDate);

  // 汇总：总门票 + 总距离（v3 新增）
  const totalTicketCost = (planSpots?.spots ?? []).reduce((sum, s) => {
    const p = s.ticketPrice ?? '';
    const m = p.match(/(\d+)/);
    return sum + (m ? parseInt(m[1], 10) : 0);
  }, 0);
  const totalDistance = (planSpots?.perDay ?? []).flatMap(d => d.blocks).reduce((sum, b) => {
    return sum + (b.distanceFromHotel ?? 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32">
      {/* Hero */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/profile/plans" className="text-blue-100 text-sm hover:text-white">← 我的计划</Link>
          <div className="flex items-start justify-between mt-2 gap-4">
            <h1 className="text-2xl md:text-3xl font-extrabold flex-1">{plan.title ?? '我的出行计划'}</h1>
            <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold ${meta.tone}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-blue-100 mt-2 text-sm">
            {plan.cityName || plan.cityIds?.join(' · ') || plan.cityId || '未选城市'} · {dateRange} · {totalDays} 天
            {plan.childAges?.length ? ` · 孩子 ${plan.childAges.length} 人` : ''}
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* 计划思路概述（用户答复 2026-07-30） */}
        <PlanOverview
          plan={plan}
          cityName={plan.cityName || plan.cityIds?.join(' · ') || plan.cityId || '未选城市'}
          totalDays={totalDays}
          totalTicketCost={totalTicketCost}
          totalDistance={totalDistance}
        />

        {/* 孩子友好度总览（P2 头部） */}
        {planSpots && planSpots.summary.totalSpots > 0 && (
          <KidFriendlySummary summary={planSpots.summary} totalCost={totalTicketCost} totalDistance={totalDistance} />
        )}

        {/* 每日行程（xlsx 风格） */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PlanIcon size={18} className="text-blue-600" /> 每日行程
          </h2>
          {days.length === 0 ? (
            <div className="text-gray-400 text-sm py-8 text-center">还没有时间表，去移动端补充吧</div>
          ) : (
            <div className="space-y-3">
              {days.map((day, i) => (
                <DayCard key={i} day={day} dayNumber={i + 1} blocks={planSpots?.perDay?.[i]?.blocks ?? null} />
              ))}
            </div>
          )}
        </section>

        {/* 孩子专题板块（P2 核心） */}
        {planSpots && planSpots.spots.length > 0 && (
          <KidsSpotSection spots={planSpots.spots} />
        )}

        {/* 已发攻略提示 */}
        {plan.hasGuide && plan.guideId && (
          <section className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100 p-4 flex items-center gap-3">
            <GuidebookIcon size={20} className="text-purple-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">这份计划已发布为攻略</p>
              <Link href={`/guides/${plan.guideId}`} className="text-sm font-bold text-purple-700 hover:underline truncate block">
                查看攻略 →
              </Link>
            </div>
          </section>
        )}

        {/* 出行后感受评分汇总（P4 评价打分闭环） */}
        {ratings && ratings.total > 0 && (
          <RatingsSummaryCard ratings={ratings} planId={plan.id} />
        )}

        {/* 2026-07-31 v1.0 Phase C：孩子真实记录板块 */}
        {ratings && ratings.total > 0 && (
          <ChildFeedbackSection ratings={ratings} planId={plan.id} />
        )}
      </div>

      <BottomBar
        status={plan.status}
        hasGuide={!!plan.hasGuide}
        onConvert={handleConvertToGuide}
        onRecord={handleRecordFeeling}
        onEdit={handleEdit}
        pending={actionPending}
      />
    </div>
  );
}

/**
 * 计划思路概述卡（用户答复 2026-07-30）
 * 模板："您从 XX 出发，游览 XXX 景点，用时 X 天，系统已为您规划如下"
 * + 智能预警（景点太多/天数太少 等交叉检查）
 */
function PlanOverview({
  plan, cityName, totalDays, totalTicketCost, totalDistance,
}: {
  plan: PlanData;
  cityName: string;
  totalDays: number;
  totalTicketCost: number;
  totalDistance: number;
}) {
  const spotNames = useMemo(() => {
    const names: string[] = [];
    for (const day of plan.timelineBlocks ?? []) {
      for (const b of day.blocks ?? []) {
        if (b.kind === 'spot' && b.title) names.push(b.title);
      }
    }
    return [...Array.from(new Set(names))];
  }, [plan.timelineBlocks]);

  const fromCity = plan.cityIds?.[0] ?? '您所在城市';

  const dailyHours = useMemo(() => {
    const hours: number[] = [];
    for (const day of plan.timelineBlocks ?? []) {
      const totalMin = (day.blocks ?? []).reduce((s, b) => s + ((b.endMinutes ?? 0) - (b.startMinutes ?? 0)), 0);
      hours.push(Math.round(totalMin / 60 * 10) / 10);
    }
    return hours;
  }, [plan.timelineBlocks]);

  // 智能预警：合理性检查
  const warnings: Array<{ type: 'warning' | 'info'; text: string }> = [];
  if (spotNames.length > 0 && totalDays > 0) {
    const spotsPerDay = spotNames.length / totalDays;
    if (spotsPerDay > 3) {
      warnings.push({
        type: 'warning',
        text: `每天平均 ${spotsPerDay.toFixed(1)} 个景点，行程可能过赶。建议适当减少 ${Math.ceil(spotNames.length - totalDays * 3)} 个景点，或把天数加到 ${Math.ceil(spotNames.length / 2.5)} 天。`
      });
    }
    if (spotsPerDay < 1 && totalDays > 2) {
      warnings.push({
        type: 'info',
        text: `每天平均仅 ${spotsPerDay.toFixed(1)} 个景点，行程较宽松。可根据孩子状态增加一些景点。`
      });
    }
  }
  if (dailyHours.length > 0) {
    const maxDay = Math.max(...dailyHours);
    if (maxDay > 10) {
      warnings.push({
        type: 'warning',
        text: `第 ${dailyHours.indexOf(maxDay) + 1} 天活动 ${maxDay} 小时，对孩子可能过长（建议 ≤8 小时）。考虑砍掉一些活动。`
      });
    }
    const avgHours = dailyHours.reduce((a, b) => a + b, 0) / dailyHours.length;
    if (avgHours < 4 && totalDays > 1) {
      warnings.push({
        type: 'info',
        text: `每天平均活动 ${avgHours.toFixed(1)} 小时，较轻松。适合低龄孩子。`
      });
    }
  }
  if (totalTicketCost > 0) {
    warnings.push({
      type: 'info',
      text: `景点门票共计 ¥${totalTicketCost}` + (totalDistance > 0 ? `，全程行驶约 ${totalDistance} km` : '')
    });
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span className="text-blue-600">📋</span> 计划思路
      </h3>
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-blue-100">
        从 <strong>{fromCity}</strong> 出发，在 <strong>{cityName}</strong> 区域共 <strong>{totalDays} 天</strong>，
        游览 <strong>{spotNames.length} 个</strong> 景点{spotNames.length > 0 ? `（${spotNames.slice(0, 5).join('、')}${spotNames.length > 5 ? ` 等${spotNames.length} 处` : ''}）` : ''}。
        系统已充分考虑{plan.childAges?.length ? ` ${plan.childAges.length} 位孩子（${plan.childAges.map(a => `${Math.floor(a / 12)} 岁`).join('/')}）的` : '孩子'}作息和能力，规划如下每日安排。
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`text-xs rounded-lg px-3 py-2 border ${
                w.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-sky-50 border-sky-200 text-sky-800'
              }`}
            >
              {w.type === 'warning' ? '⚠️ ' : '💡 '}{w.text}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * 孩子友好度总览卡（P2 头部）
 */
function KidFriendlySummary({ summary, totalCost, totalDistance }: { summary: PlanSpots['summary']; totalCost: number; totalDistance: number }) {
  return (
    <section className="bg-gradient-to-r from-pink-50 via-amber-50 to-emerald-50 rounded-2xl border border-pink-100 p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <BabyIcon size={16} className="text-pink-600" /> 出行总览
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="景点数" value={`${summary.totalSpots}`} />
        <Stat
          label="孩子平均分"
          value={summary.avgKidScore !== null ? `${summary.avgKidScore}/5` : '—'}
          tone={summary.avgKidScore !== null && summary.avgKidScore >= 4 ? 'good' : summary.avgKidScore !== null && summary.avgKidScore >= 3 ? 'ok' : 'warn'}
        />
        <Stat
          label="推车友好"
          value={summary.hasStrollerFriendly ? '✅ 是' : summary.hasStrollerIssue ? '⚠️ 谨慎' : '—'}
          tone={summary.hasStrollerFriendly ? 'good' : summary.hasStrollerIssue ? 'warn' : 'neutral'}
        />
        <Stat
          label="总路程"
          value={totalDistance > 0 ? `${totalDistance} km` : '—'}
        />
        <Stat
          label="门票总额"
          value={totalCost > 0 ? `¥${totalCost}` : '免费'}
          tone="neutral"
        />
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'ok' | 'warn' | 'neutral' }) {
  const toneClass = tone === 'good' ? 'text-emerald-700' : tone === 'ok' ? 'text-blue-700' : tone === 'warn' ? 'text-amber-700' : 'text-gray-700';
  return (
    <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
      <div className="text-[11px] text-gray-500 mb-1">{label}</div>
      <div className={`text-base font-extrabold ${toneClass}`}>{value}</div>
    </div>
  );
}

/**
 * 每日详情卡（xlsx 风格表格：时段/时间/内容/核心观赏点/门票/交通/时长/饭店/注意事项）
 */
/**
 * 每日详情卡（攻略体系 v1.0 P2 v3：xlsx 13 列 1:1 还原）
 * 列对应：DAY日期 / 时段 / 时间 / 行程内容 / 核心观赏点 / 门票费用 / 酒店距离 / 交通方式 / 交通时长 / 游玩时长 / 饭店 / 周边便利情况 / 注意事项
 * 桌面端 13 列网格，移动端折叠成卡片
 */
function DayCard({
  day, dayNumber, blocks,
}: {
  day: TimelineDay;
  dayNumber: number;
  blocks: Array<any> | null;
}) {
  const rawBlocks = Array.isArray(day.blocks) ? day.blocks : [];
  const merged = rawBlocks.map((rb, i) => blocks?.[i] ?? { ...rb, spot: null });
  return (
    <details className="border border-gray-100 rounded-xl group" open={dayNumber === 1}>
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-xl">
        <span className="font-bold text-gray-900">Day {dayNumber}（{day.date ?? ''}）</span>
        <span className="text-xs text-gray-500">{merged.length} 个行程</span>
      </summary>

      {/* 移动端：单列卡片视图（13 列 → 卡片堆叠） */}
      <div className="md:hidden space-y-3 px-3 pb-4">
        {merged.map((b, i) => (
          <MobileDayCard key={b.blockId ?? i} b={b} />
        ))}
      </div>

      {/* 桌面端：13 列 xlsx 风格表格 */}
      <div className="hidden md:block px-3 pb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200">
              <th className="py-2 px-1 text-left w-[5%]">时段</th>
              <th className="py-2 px-1 text-left w-[7%]">时间</th>
              <th className="py-2 px-1 text-left w-[14%]">行程内容</th>
              <th className="py-2 px-1 text-left w-[18%]">核心观赏点</th>
              <th className="py-2 px-1 text-left w-[10%]">门票</th>
              <th className="py-2 px-1 text-left w-[7%]">距酒店</th>
              <th className="py-2 px-1 text-left w-[9%]">交通方式</th>
              <th className="py-2 px-1 text-left w-[6%]">交通时长</th>
              <th className="py-2 px-1 text-left w-[5%]">游玩</th>
              <th className="py-2 px-1 text-left w-[10%]">饭店</th>
              <th className="py-2 px-1 text-left w-[10%]">周边便利</th>
              <th className="py-2 px-1 text-left w-[10%]">⚠️ 注意</th>
            </tr>
          </thead>
          <tbody>
            {merged.map((b, i) => (
              <DayRow key={b.blockId ?? i} b={b} />
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** 移动端单列卡片（13 列折叠） */
function MobileDayCard({ b }: { b: any }) {
  const spot = b.spot;
  const durationMin = (b.endMinutes ?? 0) - (b.startMinutes ?? 0);
  return (
    <div className="bg-white rounded-lg p-3 text-sm space-y-2 border border-gray-200">
      {/* 行程头部 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">{KIND_LABEL[b.kind ?? 'spot'] ?? '🎯'}</span>
        <span className="text-xs font-mono text-gray-700 font-bold">{fmtMinutes(b.startMinutes)}-{fmtMinutes(b.endMinutes)}</span>
        <span className="text-xs text-gray-500">{timeSlot(b.startMinutes)}</span>
        {durationMin > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">游玩 {durationMin}分</span>}
        {spot?.kidScore && <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-bold">⭐ {spot.kidScore}</span>}
      </div>

      {/* 行程内容 */}
      <div>
        <div className="font-medium text-gray-900 text-base">{b.title ?? spot?.name ?? '未命名'}</div>
        {spot?.kidHighlights && <div className="text-xs text-gray-600 mt-1 leading-relaxed">🎯 {spot.kidHighlights}</div>}
        {b.kidHook && <div className="text-xs text-blue-600 mt-1">👶 {b.kidHook}</div>}
      </div>

      {/* xlsx 13 列字段（移动端栅格化） */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs bg-amber-50/30 rounded p-2 border border-amber-100">
        {spot?.ticketPrice && (
          <div><span className="text-gray-500">🎫 门票</span> <span className="font-bold text-emerald-700">{spot.ticketPrice}</span></div>
        )}
        {spot?.openHours && (
          <div><span className="text-gray-500">🕐 开放</span> {spot.openHours}</div>
        )}
        {b.distanceFromHotel !== undefined && b.distanceFromHotel !== null && (
          <div><span className="text-gray-500">📍 距酒店</span> <span className="font-bold">{b.distanceFromHotel} km</span></div>
        )}
        {b.transportMode && (
          <div><span className="text-gray-500">🚗 交通</span> {transportEmoji(b.transportMode)} {b.transportMode}{b.trafficMinutes ? ` · ${b.trafficMinutes}分` : ''}</div>
        )}
        {b.parkingInfo && (
          <div className="col-span-2"><span className="text-gray-500">🅿️ 停车</span> {b.parkingInfo}</div>
        )}
        {(b.nearbyRestaurants && b.nearbyRestaurants.length > 0) && (
          <div className="col-span-2"><span className="text-gray-500">🍽️ 饭店</span> {b.nearbyRestaurants.join('、')}</div>
        )}
        {spot?.durationMinutes && (
          <div><span className="text-gray-500">⏱ 建议</span> {spot.durationMinutes}分</div>
        )}
        {spot?.nearbyFacilities && (
          <div className="col-span-2">
            <span className="text-gray-500">🎒 周边便利</span>{' '}
            {[
              Array.isArray(spot.nearbyFacilities['母婴室']) && `🍼 母婴室${spot.nearbyFacilities['母婴室'].length}处`,
              Array.isArray(spot.nearbyFacilities['儿童餐']) && `🍱 儿童餐${spot.nearbyFacilities['儿童餐'].length}家`,
              spot.nearbyFacilities['推车可达'] && '🚼 推车可达',
              spot.nearbyFacilities['无障碍通道'] && '♿ 无障碍',
              spot.nearbyFacilities['便利店'] && '🏪 便利店',
              spot.nearbyFacilities['医院'] && '🏥 医院',
            ].filter(Boolean).join('、')}
          </div>
        )}
      </div>

      {/* 注意事项 */}
      {spot?.pitfalls && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 leading-relaxed">
          ⚠️ <strong>注意</strong>：{spot.pitfalls}
        </div>
      )}
      {spot?.tips && !spot?.pitfalls && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5 leading-relaxed">
          ✅ <strong>推荐</strong>：{spot.tips}
        </div>
      )}
    </div>
  );
}

/** 桌面端 13 列表格行（xlsx 1:1） */
function DayRow({ b }: { b: any }) {
  const spot = b.spot;
  const durationMin = (b.endMinutes ?? 0) - (b.startMinutes ?? 0);
  return (
    <tr className="border-b border-gray-100 hover:bg-blue-50/30">
      {/* 时段 */}
      <td className="py-2 px-1 align-top text-xs text-gray-600">{timeSlot(b.startMinutes)}</td>
      {/* 时间 */}
      <td className="py-2 px-1 align-top text-xs font-mono text-gray-700">{fmtMinutes(b.startMinutes)}<br />~{fmtMinutes(b.endMinutes)}</td>
      {/* 行程内容 */}
      <td className="py-2 px-1 align-top">
        <div className="flex items-center gap-1 mb-0.5 flex-wrap">
          <span className="text-[10px] px-1 py-0.5 bg-blue-50 text-blue-700 rounded">{KIND_LABEL[b.kind ?? 'spot'] ?? '🎯'}</span>
          {spot?.kidScore !== null && spot?.kidScore !== undefined && (
            <span className="text-[10px] px-1 py-0.5 bg-amber-50 text-amber-700 rounded font-bold">⭐ {spot.kidScore}</span>
          )}
        </div>
        <div className="font-medium text-gray-800">{b.title ?? spot?.name ?? '未命名'}</div>
        {b.kidHook && <div className="text-[10px] text-blue-600 mt-0.5">👶 {b.kidHook}</div>}
      </td>
      {/* 核心观赏点 */}
      <td className="py-2 px-1 align-top text-xs text-gray-700 leading-relaxed">
        {spot?.kidHighlights ? (
          <div>{spot.kidHighlights}</div>
        ) : (
          <span className="text-gray-400 italic">—</span>
        )}
      </td>
      {/* 门票 */}
      <td className="py-2 px-1 align-top text-xs">
        {spot?.ticketPrice ? (
          <div className="text-emerald-700 font-bold">🎫 {spot.ticketPrice}</div>
        ) : (
          <span className="text-gray-400">免费/—</span>
        )}
        {spot?.openHours && <div className="text-[10px] text-gray-500 mt-0.5">🕐 {spot.openHours}</div>}
      </td>
      {/* 距酒店 */}
      <td className="py-2 px-1 align-top text-xs text-gray-700">
        {b.distanceFromHotel !== undefined && b.distanceFromHotel !== null ? (
          <div>
            <div className="font-bold">{b.distanceFromHotel} km</div>
            {b.distanceFromHotel === 0 && <div className="text-[10px] text-gray-500">🏨 在酒店</div>}
          </div>
        ) : <span className="text-gray-400">—</span>}
      </td>
      {/* 交通方式 */}
      <td className="py-2 px-1 align-top text-xs text-gray-700">
        {b.transportMode ? (
          <div>
            <div className="font-medium">{transportEmoji(b.transportMode)} {b.transportMode}</div>
            {b.parkingInfo && <div className="text-[10px] text-gray-500 mt-0.5">🅿️ {b.parkingInfo}</div>}
          </div>
        ) : <span className="text-gray-400">—</span>}
      </td>
      {/* 交通时长 */}
      <td className="py-2 px-1 align-top text-xs text-gray-700 text-center">
        {b.trafficMinutes !== undefined && b.trafficMinutes !== null ? `${b.trafficMinutes}分` : '—'}
      </td>
      {/* 游玩时长 */}
      <td className="py-2 px-1 align-top text-xs text-gray-700 text-center">
        {durationMin > 0 ? `${durationMin}分` : '—'}
        {spot?.durationMinutes && <div className="text-[10px] text-gray-400">建议{spot.durationMinutes}分</div>}
      </td>
      {/* 饭店 */}
      <td className="py-2 px-1 align-top text-xs text-gray-700">
        {(b.nearbyRestaurants && b.nearbyRestaurants.length > 0) ? (
          <div className="space-y-0.5">
            {b.nearbyRestaurants.map((r: string, i: number) => (
              <div key={i}>🍽️ {r}</div>
            ))}
          </div>
        ) : (spot?.spotType === 'restaurant' || b.kind === 'restaurant') ? (
          <span className="text-pink-700">🍽️ 餐厅块</span>
        ) : <span className="text-gray-400">—</span>}
      </td>
      {/* 周边便利 */}
      <td className="py-2 px-1 align-top text-xs text-gray-700">
        {spot?.nearbyFacilities ? (
          <NearbyFacilitiesCell fac={spot.nearbyFacilities} />
        ) : <span className="text-gray-400">—</span>}
      </td>
      {/* 注意事项 */}
      <td className="py-2 px-1 align-top text-xs text-amber-800">
        {spot?.pitfalls ? <div>{spot.pitfalls}</div> : null}
        {b.notes && !spot?.pitfalls && <div className="text-gray-600">{b.notes}</div>}
        {!spot?.pitfalls && !b.notes && <span className="text-gray-400">—</span>}
      </td>
    </tr>
  );
}

/** 周边便利情况 cell — JSON 字段结构化展示 */
function NearbyFacilitiesCell({ fac }: { fac: any }) {
  const items: Array<[string, string]> = [];
  if (Array.isArray(fac['母婴室'])) items.push(['🍼', `母婴室 ${fac['母婴室'].length} 处`]);
  if (Array.isArray(fac['儿童餐'])) items.push(['🍱', `${fac['儿童餐'].length} 家儿童餐`]);
  if (fac['推车可达']) items.push(['🚼', '推车可达']);
  if (fac['无障碍通道']) items.push(['♿', '无障碍']);
  if (fac['医院']) items.push(['🏥', '医院附近']);
  if (fac['便利店']) items.push(['🏪', '便利店']);
  if (items.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <div className="space-y-0.5">
      {items.slice(0, 4).map(([emoji, txt], i) => (
        <div key={i}>{emoji} {txt}</div>
      ))}
      {items.length > 4 && <div className="text-[10px] text-gray-500">+{items.length - 4} 项</div>}
    </div>
  );
}

function transportEmoji(mode: string): string {
  if (mode.includes('自驾')) return '🚗';
  if (mode.includes('步行')) return '🚶';
  if (mode.includes('观光车') || mode.includes('景区')) return '🚐';
  if (mode.includes('地铁')) return '🚇';
  if (mode.includes('公交')) return '🚌';
  if (mode.includes('出租')) return '🚕';
  return '🚗';
}

/**
 * 孩子专题板块（P2 核心）
 * 列出每个 spot 的：孩子专属看点 + 父母看点 + 避坑 + 推车/无障碍 + 推荐月龄
 */
/**
 * 出行后感受评分汇总卡（P4 评价打分闭环）
 * 展示从 /api/plans/[id]/ratings/summary 来的 5 维度聚合
 * 让用户在 /plan/[id] 一眼看到孩子的真实体验
 */
function RatingsSummaryCard({ ratings, planId }: { ratings: RatingSummary; planId: string }) {
  return (
    <section className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl border border-pink-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <SparklesIcon size={18} className="text-pink-600" /> 出行后感受（{ratings.total} 条评分）
        </h3>
        <Link
          href={`/plan/${planId}/feeling`}
          className="text-xs px-3 py-1 bg-white border border-pink-200 text-pink-700 rounded-full hover:bg-pink-50"
        >
          继续评分
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        {ratings.emotionalPeak.length > 0 && (
          <SummaryCol
            label="😊 情绪峰值"
            top={ratings.emotionalPeak[0]}
            total={ratings.total}
          />
        )}
        {ratings.physicalState.length > 0 && (
          <SummaryCol
            label="🟢 体力状态"
            top={ratings.physicalState[0]}
            total={ratings.total}
          />
        )}
        {ratings.willingnessToReturn.length > 0 && (
          <SummaryCol
            label="🔄 重游意愿"
            top={ratings.willingnessToReturn[0]}
            total={ratings.total}
          />
        )}
        {ratings.stayDuration.avgMinutes !== null && (
          <div className="bg-white rounded-xl p-3 border border-pink-100 text-center">
            <div className="text-[10px] text-gray-500 mb-1">⏱ 平均停留</div>
            <div className="text-base font-extrabold text-pink-700">{ratings.stayDuration.avgMinutes} 分钟</div>
          </div>
        )}
        <div className="bg-white rounded-xl p-3 border border-pink-100 text-center">
          <div className="text-[10px] text-gray-500 mb-1">😢 哭闹率</div>
          <div className={`text-base font-extrabold ${ratings.cry.rate > 30 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {ratings.cry.rate}%
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryCol({ label, top, total }: { label: string; top: { value: string; count: number }; total: number }) {
  const pct = Math.round((top.count / total) * 100);
  return (
    <div className="bg-white rounded-xl p-3 border border-pink-100 text-center">
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div className="text-base font-extrabold text-pink-700">{top.value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{pct}%</div>
    </div>
  );
}

// 2026-07-31 v1.0 Phase C：孩子真实记录板块
// 数据源：/api/plans/[id]/ratings/summary 的 favoriteMoments / cryTriggerDistribution / parentJoyDistribution
const TRIGGER_LABEL: Record<string, string> = {
  hungry: '饿了', sleepy: '困了', crowded: '人多', queueing: '排队',
  loud: '怕大声', dark: '怕黑', animal: '怕动物', height: '怕高', uncomfortable: '不舒服',
};

function ChildFeedbackSection({ ratings, planId }: { ratings: RatingSummary; planId: string }) {
  const favorites = ratings.favoriteMoments ?? [];
  const triggers = Object.entries(ratings.cryTriggerDistribution ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const parentJoy = Object.entries(ratings.parentJoyDistribution ?? {}).sort((a, b) => b[1] - a[1]);
  // 仅在有数据时显示（防御）
  if (favorites.length === 0 && triggers.length === 0 && parentJoy.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 inline-flex items-center gap-2 text-base">
          <BabyIcon size={18} className="text-pink-500" />
          孩子真实记录
        </h3>
        <Link
          href={`/plan/${planId}/feeling`}
          className="text-xs text-blue-600 hover:underline"
        >
          补充记录 →
        </Link>
      </div>

      {/* 孩子最开心的瞬间 */}
      {favorites.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">🎉 孩子最开心的瞬间</h4>
          <ul className="space-y-1.5">
            {favorites.map((m, i) => (
              <li key={i} className="text-sm text-gray-700 bg-pink-50/60 border border-pink-100 rounded-lg px-3 py-2">
                <span className="text-pink-600">"</span>
                {m.text}
                <span className="text-pink-600">"</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 哭闹触发器 */}
      {triggers.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">😢 孩子哭闹的常见原因</h4>
          <div className="flex flex-wrap gap-1.5">
            {triggers.map(([trigger, count]) => (
              <span key={trigger} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-200">
                {TRIGGER_LABEL[trigger] ?? trigger}
                <span className="text-orange-500">· {count} 次</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 父母满足度 */}
      {parentJoy.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">💝 父母自己的感受</h4>
          <div className="flex flex-wrap gap-1.5">
            {parentJoy.map(([joy, count]) => (
              <span key={joy} className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                {joy} · {count} 次
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function KidsSpotSection({ spots }: { spots: SpotLite[] }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
        <BabyIcon size={18} className="text-pink-600" /> 孩子专题
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        基于景点数据库的孩子专属信息：核心看点 / 推荐月龄 / 推车友好度 / 避坑
      </p>
      <div className="space-y-3">
        {spots.map(spot => (
          <div key={spot.id} className="border border-pink-100 rounded-xl p-4 bg-gradient-to-br from-pink-50/30 to-amber-50/30">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-gray-900 text-base flex-1">{spot.name}</h3>
              {spot.kidScore !== null && spot.kidScore !== undefined && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">
                  ⭐ {spot.kidScore}/5
                </span>
              )}
            </div>
            {/* 孩子专属看点 */}
            {spot.kidHighlights && (
              <div className="mb-2 text-sm">
                <span className="inline-block mr-2 text-[10px] font-bold uppercase text-pink-700 bg-pink-100 px-1.5 py-0.5 rounded">👶 孩子看点</span>
                <span className="text-gray-700">{spot.kidHighlights}</span>
              </div>
            )}
            {/* 父母看点（mom + dad 各一行）*/}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              {/* momHighlights 在 SpotLite 里没有，但 spots API 返回了，这里从 props 拿不到 */}
            </div>
            {/* 推车 / 无障碍 提示 */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {(spot.tags ?? []).filter(t => /推车|无障碍|轮椅/i.test(t)).map((t, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                  ♿ {t}
                </span>
              ))}
              {(spot.tags ?? []).filter(t => /台阶|楼梯|山路/i.test(t)).map((t, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">
                  ⚠️ {t}
                </span>
              ))}
            </div>
            {/* 推荐月龄 */}
            {spot.tags && spot.tags.length > 0 && (
              <div className="text-[11px] text-gray-500 mb-2">
                🏷️ {spot.tags.slice(0, 6).join(' · ')}
              </div>
            )}
            {/* 避坑 + tips（双栏对比） */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-2 border-t border-pink-100">
              {spot.tips && (
                <div className="text-xs">
                  <div className="font-bold text-emerald-700 mb-0.5">✅ 推荐玩法</div>
                  <div className="text-gray-700">{spot.tips}</div>
                </div>
              )}
              {spot.pitfalls && (
                <div className="text-xs">
                  <div className="font-bold text-amber-700 mb-0.5">⚠️ 注意事项</div>
                  <div className="text-gray-700">{spot.pitfalls}</div>
                </div>
              )}
            </div>
            {spot.address && (
              <div className="mt-2 text-[11px] text-gray-500">📍 {spot.address}{spot.phone && ` · ☎️ ${spot.phone}`}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomBar({
  status, hasGuide, onConvert, onRecord, onEdit, pending,
}: {
  status: PlanStatus;
  hasGuide: boolean;
  onConvert: () => void;
  onRecord: () => void;
  onEdit: () => void;
  pending: boolean;
}) {
  const cta = (() => {
    if (hasGuide) return null;
    if (status === 'completed') return { label: '记录感受', icon: <SparklesIcon size={16} />, onClick: onRecord, primary: true, hint: 'P4：出行后评分，已沉淀为攻略素材' };
    if (status === 'active') return { label: '补记今天', icon: <PencilIcon size={16} />, onClick: onRecord, primary: true };
    return null;
  })();

  if (!cta) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
        <span className="flex-1 text-xs text-gray-500">
          {status === 'draft' && '计划还没发布为攻略，去生成一份可分享的攻略吧'}
          {status === 'completed' && '记录孩子的真实感受，沉淀为数据资产'}
          {status === 'active' && '趁着记忆新鲜，补记今天的感受'}
        </span>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition inline-flex items-center gap-1.5"
        >
          <EditIcon size={14} /> 编辑
        </button>
        <button
          onClick={cta.onClick}
          disabled={pending}
          className="px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold hover:shadow-md transition disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {cta.icon}
          {pending ? '处理中…' : cta.label}
        </button>
      </div>
    </div>
  );
}

function fmtMinutes(m?: number): string {
  if (typeof m !== 'number') return '--:--';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

function timeSlot(m?: number): string {
  if (typeof m !== 'number') return '—';
  const h = Math.floor(m / 60);
  if (h < 6) return '凌晨';
  if (h < 11) return '早上';
  if (h < 14) return '中午';
  if (h < 18) return '下午';
  return '晚上';
}

function daysCompute(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}