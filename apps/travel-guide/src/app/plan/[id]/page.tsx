// Plan 详情页（攻略体系 v1.0 PR3 重写）
// 67 行空 success card → ~280 行：
// - hero + 状态徽章（draft/confirmed/active/completed/published 5 状态）
// - TimelineViewer 按 day 折叠渲染 timelineBlocks
// - bottom sticky CTA bar（按 status 切换：发成攻略 / 记录感受 / 补记 / 撤回）

'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { PlanIcon, GuidebookIcon, SparklesIcon, EyeIcon, PencilIcon } from '@/components/Icons';
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

const STATUS_META: Record<PlanStatus, { label: string; tone: string; ring: string }> = {
  draft:     { label: '草稿',     tone: 'bg-gray-100 text-gray-700',     ring: 'ring-gray-300' },
  confirmed: { label: '已确认',   tone: 'bg-blue-100 text-blue-700',     ring: 'ring-blue-300' },
  active:    { label: '进行中',   tone: 'bg-amber-100 text-amber-700',   ring: 'ring-amber-300' },
  completed: { label: '已完成',   tone: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-300' },
  published: { label: '已发攻略', tone: 'bg-purple-100 text-purple-700', ring: 'ring-purple-300' },
};

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [plan, setPlan] = useState<PlanData | null>(null);
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
    fetch(`${TRAVEL_API}/api/plans/${id}`)
      .then(r => r.json().catch(() => null))
      .then(d => {
        if (!d) { setError('加载失败'); return; }
        const p = d.data ?? d;
        if (!p?.id) { setError('计划不存在'); return; }
        // 拉一下是否有已发攻略（关联查询，避免再读一次 guides 表）
        return fetch(`${TRAVEL_API}/api/guides?planId=${id}`).then(r => r.json()).catch(() => null).then(gd => {
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
        });
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [user?.id, id]);

  const days = useMemo(() => {
    if (!plan?.timelineBlocks || !Array.isArray(plan.timelineBlocks)) return [];
    return plan.timelineBlocks;
  }, [plan]);

  const handleConvertToGuide = async () => {
    if (!plan) return;
    setActionPending(true);
    try {
      const r = await authedFetch(`/api/guides/from-plan/${plan.id}`, { method: 'POST' });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.id) {
        router.push(`/guides/${d.id}/edit`);
      } else {
        alert(d?.error?.message ?? '转换失败');
      }
    } finally {
      setActionPending(false);
    }
  };

  const handleRecordFeeling = () => {
    if (!plan) return;
    router.push(`/plans/${plan.id}/feeling`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-gray-500">{error}</div>;
  if (!plan) return null;

  const meta = STATUS_META[plan.status];
  const dateRange = `${plan.startDate?.slice(0, 10) ?? ''} → ${plan.endDate?.slice(0, 10) ?? ''}`;
  const totalDays = days.length || daysCompute(plan.startDate, plan.endDate);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32">
      {/* Hero */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
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

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Timeline */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PlanIcon size={18} className="text-blue-600" /> 每日行程
          </h2>
          {days.length === 0 ? (
            <div className="text-gray-400 text-sm py-8 text-center">还没有时间表，去移动端补充吧</div>
          ) : (
            <div className="space-y-3">
              {days.map((day, i) => (
                <DayCard key={i} day={day} dayNumber={i + 1} />
              ))}
            </div>
          )}
        </section>

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
      </div>

      {/* Sticky CTA bar — 按 status 切换 */}
      <BottomBar
        status={plan.status}
        hasGuide={!!plan.hasGuide}
        onConvert={handleConvertToGuide}
        onRecord={handleRecordFeeling}
        pending={actionPending}
      />
    </div>
  );
}

function DayCard({ day, dayNumber }: { day: TimelineDay; dayNumber: number }) {
  const blocks = Array.isArray(day.blocks) ? day.blocks : [];
  return (
    <details className="border border-gray-100 rounded-xl group" open={dayNumber === 1}>
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-xl">
        <span className="font-bold text-gray-900">Day {dayNumber}</span>
        <span className="text-xs text-gray-500">{blocks.length} 个行程</span>
      </summary>
      <div className="px-4 pb-3 space-y-2">
        {blocks.map((b, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="flex-shrink-0 w-16 text-gray-400 font-mono">
              {fmtMinutes(b.startMinutes)}–{fmtMinutes(b.endMinutes)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 truncate">{b.title ?? '未命名'}</div>
              {b.kidHook && <div className="text-xs text-blue-600 mt-0.5 truncate">👶 {b.kidHook}</div>}
            </div>
            {b.kind && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{b.kind}</span>}
          </div>
        ))}
      </div>
    </details>
  );
}

function BottomBar({
  status, hasGuide, onConvert, onRecord, pending,
}: {
  status: PlanStatus;
  hasGuide: boolean;
  onConvert: () => void;
  onRecord: () => void;
  pending: boolean;
}) {
  // 各 status 的 CTA 配置
  const cta = (() => {
    if (hasGuide) return null; // 已发攻略：底部不重复 CTA
    if (status === 'draft') return { label: '发成攻略', icon: <GuidebookIcon size={16} />, onClick: onConvert, primary: true };
    if (status === 'completed') return { label: '记录感受', icon: <SparklesIcon size={16} />, onClick: onRecord, primary: true };
    if (status === 'active') return { label: '补记今天', icon: <PencilIcon size={16} />, onClick: onRecord, primary: true };
    return null;
  })();

  if (!cta) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
        <span className="flex-1 text-xs text-gray-500">
          {status === 'draft' && '计划还没发布为攻略，去生成一份可分享的攻略吧'}
          {status === 'completed' && '记录孩子的真实感受，沉淀为数据资产'}
          {status === 'active' && '趁着记忆新鲜，补记今天的感受'}
        </span>
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

function daysCompute(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}