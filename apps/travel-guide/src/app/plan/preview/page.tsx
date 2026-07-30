// /plan/preview — wizard 候选方案详情预览（用户答复 2026-07-29：出的计划方案点击可以进入详情页仔细查看）
//
// 入口：wizard 的「查看详情」按钮 → /plan/preview?c=<base64(JSON)>
// 显示完整的候选方案：每日详细时间表（不折叠）、景点图片、孩子看点、推荐路线
// "采用此方案"按钮 → POST /api/plans → 跳 /plan/[id]

'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlanIcon, CheckIcon, EyeIcon, BabyIcon } from '@/components/Icons';
import { authedFetch, getToken } from '@/lib/auth';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface TimelineBlock {
  blockId?: string;
  kind?: 'spot' | 'restaurant' | 'park' | 'playground' | 'hotel' | 'transit' | 'rest';
  startMinutes?: number;
  endMinutes?: number;
  title?: string;
  kidHook?: string;
  notes?: string;
  spotId?: string;
  cityId?: string;
  estimatedCost?: number;
}

interface TimelineDay {
  day?: number;
  cityId?: string;
  date?: string;
  theme?: string;
  blocks?: TimelineBlock[];
  kidFriendlySummary?: string;
}

interface CandidateOutline {
  label?: string;
  style?: string;
  rhythm?: string;
  whyThisPlan?: string;
  totalDays?: number;
  totalActiveHours?: number;
  totalCostCents?: number;
  days?: TimelineDay[];
}

export default function PlanPreviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>}>
      <PlanPreviewInner />
    </Suspense>
  );
}

function PlanPreviewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cParam = searchParams?.get('c') ?? '';
  const iParam = searchParams?.get('i') ?? '';
  const [candidate, setCandidate] = useState<CandidateOutline | null>(null);
  const [spots, setSpots] = useState<Record<string, any>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // 读取用户身份（统一用 getToken + auth/me，与 wizard + plan detail 一致）
    const token = typeof window !== 'undefined' ? getToken() : null;
    if (token) {
      authedFetch('/api/auth/me')
        .then(r => r.json().catch(() => null))
        .then(d => setUser(d?.data ?? d?.user ?? d))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    let parsed: any = null;
    if (iParam) {
      try {
        const raw = typeof window !== 'undefined' ? sessionStorage.getItem(`wizard:candidate:${iParam}`) : null;
        if (raw) parsed = JSON.parse(raw);
      } catch {
        // storage 解析失败 → fallback URL
      }
    }
    if (!parsed) {
      // Fallback：URL ?c= base64（旧版兼容）
      if (!cParam) { setParseError('缺少候选参数'); return; }
      try {
        const padded = cParam.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(escape(atob(padded)));
        parsed = JSON.parse(json);
      } catch {
        setParseError('候选数据解析失败');
        return;
      }
    }
    setCandidate(parsed);

    // 拉所有 spotId 对应的 spot 详情（用于 13 列表格的"周边便利/门票/⚠️注意"列）
    const spotIds = new Set<string>();
    for (const day of parsed.days ?? []) {
      for (const b of day.blocks ?? []) {
        if (typeof b?.spotId === 'string' && b.spotId) spotIds.add(b.spotId);
      }
    }
    if (spotIds.size > 0) {
      fetch(`${TRAVEL_API}/api/places/by-ids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(spotIds) }),
      })
        .then(r => r.json())
        .then(j => {
          const list: any[] = j?.data?.spots ?? j?.spots ?? [];
          const map: Record<string, any> = {};
          for (const s of list) map[s.id] = s;
          setSpots(map);
        })
        .catch(() => {});
    }
  }, [cParam, iParam]);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.json().catch(() => null))
      .then(d => setUser(d?.data ?? d?.user ?? d))
      .catch(() => {});
  }, []);

  const days = useMemo(() => candidate?.days ?? [], [candidate]);

  const adopt = async () => {
    if (!candidate || !user?.id) {
      router.push('/login?redirect=/plan/preview');
      return;
    }
    setCreating(true);
    try {
      const r = await authedFetch(`/api/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          cityId: candidate.days?.[0]?.cityId ?? null,
          cityIds: Array.from(new Set((candidate.days ?? []).map(d => d.cityId).filter(Boolean))) as string[],
          startDate: candidate.days?.[0]?.date ?? new Date().toISOString().slice(0, 10),
          endDate: candidate.days?.[candidate.days.length - 1]?.date ?? new Date().toISOString().slice(0, 10),
          childAges: [60], // v1: 默认 5 岁；用户后续可去 /plan/[id]/edit 改
          timelineBlocks: candidate.days,
          title: candidate.label ?? '我的出行计划',
          candidateLabel: candidate.label,
        }),
      });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.id) router.push(`/plan/${d.id}`);
      else alert(d?.error?.message ?? '创建失败');
    } finally {
      setCreating(false);
    }
  };

  if (parseError) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-500">
        {parseError}
        <Link href="/wizard" className="ml-3 text-blue-600 hover:underline">回到 wizard</Link>
      </main>
    );
  }

  if (!candidate) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32">
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* P-bug-fix：没 c= 时返回 /profile/plans；有 c= 时返回 /wizard（让用户能继续选） */}
          <Link href={cParam ? "/wizard" : "/profile/plans"} className="text-blue-100 text-sm hover:text-white">← 返回</Link>
          <div className="flex items-start justify-between mt-2 gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold">{candidate.label ?? '候选方案详情'}</h1>
              <div className="flex items-center gap-2 mt-2">
                {candidate.style && <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">{candidate.style}</span>}
                {candidate.rhythm && <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">{candidate.rhythm}</span>}
              </div>
            </div>
          </div>
          {candidate.whyThisPlan && (
            <p className="text-blue-100 mt-3 text-sm leading-relaxed">{candidate.whyThisPlan}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-blue-100">
            <span>📅 {candidate.totalDays ?? days.length} 天</span>
            <span>⏰ {candidate.totalActiveHours ?? 0} 小时活动</span>
            <span>💰 约 ¥{Math.round((candidate.totalCostCents ?? 0) / 100)}</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* 每日详情（不折叠） */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PlanIcon size={18} className="text-blue-600" /> 完整行程
          </h2>
          <div className="space-y-5">
            {days.map((day, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 text-base">Day {i + 1}{day.date ? `（${day.date}）` : ''}</h3>
                  {day.kidFriendlySummary && (
                    <span className="text-[10px] px-2 py-0.5 bg-pink-50 text-pink-700 rounded-full">👶 {day.kidFriendlySummary.slice(0, 14)}</span>
                  )}
                </div>
                {day.theme && <div className="text-xs text-gray-500 mb-2 italic">{day.theme}</div>}

                {/* 桌面端：13 列 xlsx 风格表格 */}
                <div className="hidden md:block">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200">
                        <th className="py-1.5 px-1 text-left w-[5%]">时段</th>
                        <th className="py-1.5 px-1 text-left w-[6%]">时间</th>
                        <th className="py-1.5 px-1 text-left w-[12%]">行程内容</th>
                        <th className="py-1.5 px-1 text-left w-[14%]">核心观赏点</th>
                        <th className="py-1.5 px-1 text-left w-[8%]">门票</th>
                        <th className="py-1.5 px-1 text-left w-[6%]">距酒店</th>
                        <th className="py-1.5 px-1 text-left w-[8%]">交通方式</th>
                        <th className="py-1.5 px-1 text-left w-[5%]">交通时长</th>
                        <th className="py-1.5 px-1 text-left w-[5%]">游玩</th>
                        <th className="py-1.5 px-1 text-left w-[10%]">饭店</th>
                        <th className="py-1.5 px-1 text-left w-[10%]">周边便利</th>
                        <th className="py-1.5 px-1 text-left w-[11%]">⚠️ 儿童关注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(day.blocks ?? []).map((b, j) => (
                        <PreviewDayRow key={j} b={b} spots={spots} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 移动端：简单块（不展示完整 13 列以免过挤） */}
                <div className="md:hidden space-y-2">
                  {(day.blocks ?? []).map((b, j) => (
                    <div key={j} className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-700 font-bold">{fmt(b.startMinutes)}-{fmt(b.endMinutes)}</span>
                        <span className={`text-xs ${b.kind === 'transit' ? 'text-orange-600' : b.kind === 'hotel' ? 'text-purple-600' : b.kind === 'restaurant' ? 'text-pink-600' : 'text-blue-600'}`}>
                          {b.kind === 'transit' ? '🚄' : b.kind === 'hotel' ? '🏨' : b.kind === 'restaurant' ? '🍽️' : b.kind === 'rest' ? '😴' : '🎯'}
                        </span>
                        <span className="text-xs text-gray-500">{timeSlot(b.startMinutes)}</span>
                      </div>
                      <div className="font-medium text-gray-800">{b.title ?? '未命名'}</div>
                      {b.kidHook && <div className="text-xs text-blue-600">👶 {b.kidHook}</div>}
                      {b.notes && <div className="text-xs text-gray-500">{b.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 底部采用按钮 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          <span className="flex-1 text-xs text-gray-500">
            确认无误后采用此方案，开始你的亲子出行
          </span>
          <button
            onClick={adopt}
            disabled={creating}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold hover:shadow-md disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <CheckIcon size={16} />
            {creating ? '创建中…' : '采用此方案'}
          </button>
        </div>
      </div>
    </main>
  );
}

/** preview 页 13 列表格行（与 /plan/[id] 桌面端一致 + 用 spots 数据填周边便利/避坑） */
function PreviewDayRow({ b, spots }: { b: any; spots: Record<string, any> }) {
  const durationMin = (b.endMinutes ?? 0) - (b.startMinutes ?? 0);
  const spot = b.spotId ? spots[b.spotId] : null;
  // block 自身的 notes 用作"核心观赏点"；spot.kidHighlights 作 fallback
  const highlight = b.notes || spot?.kidHighlights;
  // 周边便利：block 自带 nearbyRestaurants + spot.nearbyFacilities
  const fac = spot?.nearbyFacilities;
  const facilities: string[] = [];
  if (Array.isArray(fac?.['母婴室'])) facilities.push(`🍼${fac['母婴室'].length}处`);
  if (Array.isArray(fac?.['儿童餐'])) facilities.push(`🍱${fac['儿童餐'].length}家`);
  if (fac?.['推车可达']) facilities.push('🚼推车');
  if (fac?.['无障碍通道']) facilities.push('♿无障碍');
  if (fac?.['便利店']) facilities.push('🏪便利');
  if (fac?.['医院']) facilities.push('🏥医院');
  return (
    <tr className="border-b border-gray-100 hover:bg-blue-50/30">
      <td className="py-1.5 px-1 align-top text-[10px] text-gray-600">{timeSlot(b.startMinutes)}</td>
      <td className="py-1.5 px-1 align-top text-[10px] font-mono text-gray-700">{fmt(b.startMinutes)}<br />~{fmt(b.endMinutes)}</td>
      <td className="py-1.5 px-1 align-top">
        <div className="text-[10px] mb-0.5">
          {b.kind === 'transit' ? '🚄' : b.kind === 'hotel' ? '🏨' : b.kind === 'restaurant' ? '🍽️' : b.kind === 'rest' ? '😴' : '🎯'}
          {spot?.kidScore ? <span className="ml-1 px-1 py-0.5 bg-amber-50 text-amber-700 rounded font-bold">⭐{spot.kidScore}</span> : null}
        </div>
        <div className="font-medium text-gray-800 text-xs">{b.title ?? spot?.name ?? '未命名'}</div>
        {b.kidHook && <div className="text-[10px] text-blue-600 mt-0.5">👶 {b.kidHook}</div>}
      </td>
      <td className="py-1.5 px-1 align-top text-[10px] text-gray-600 leading-relaxed">
        {highlight ?? <span className="text-gray-400">—</span>}
      </td>
      <td className="py-1.5 px-1 align-top text-[10px]">
        {spot?.ticketPrice ? <span className="text-emerald-700 font-bold">🎫 {spot.ticketPrice}</span> : <span className="text-gray-400">—</span>}
        {spot?.openHours && <div className="text-[10px] text-gray-500 mt-0.5">🕐 {spot.openHours}</div>}
      </td>
      <td className="py-1.5 px-1 align-top text-[10px] text-gray-500 text-center">
        {b.distanceFromHotel !== undefined && b.distanceFromHotel !== null ? `${b.distanceFromHotel}km` : '—'}
      </td>
      <td className="py-1.5 px-1 align-top text-[10px] text-gray-600">
        {b.transportMode ? `${b.kind === 'transit' ? '🚄' : '🚗'} ${b.transportMode}` : '—'}
        {b.parkingInfo && <div className="text-[10px] text-gray-500 mt-0.5">🅿️ {b.parkingInfo}</div>}
      </td>
      <td className="py-1.5 px-1 align-top text-[10px] text-gray-500 text-center">
        {b.trafficMinutes !== undefined && b.trafficMinutes !== null ? `${b.trafficMinutes}分` : '—'}
      </td>
      <td className="py-1.5 px-1 align-top text-[10px] text-gray-500 text-center">
        {durationMin > 0 ? `${durationMin}分` : '—'}
        {spot?.durationMinutes ? <div className="text-[10px] text-gray-400">建议{spot.durationMinutes}分</div> : null}
      </td>
      <td className="py-1.5 px-1 align-top text-[10px] text-gray-600">
        {(b.nearbyRestaurants && b.nearbyRestaurants.length > 0) ? b.nearbyRestaurants.join('、') : <span className="text-gray-400">—</span>}
      </td>
      <td className="py-1.5 px-1 align-top text-[10px] text-gray-600">
        {facilities.length > 0 ? (
          <div className="leading-tight">{facilities.slice(0, 3).join('、')}</div>
        ) : <span className="text-gray-400">—</span>}
      </td>
      <td className="py-1.5 px-1 align-top text-[10px] text-amber-800">
        {spot?.pitfalls ?? <span className="text-gray-400">—</span>}
      </td>
    </tr>
  );
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

function fmt(m?: number): string {
  if (typeof m !== 'number') return '--:--';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}