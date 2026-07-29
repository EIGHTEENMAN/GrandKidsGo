// /profile/plans — 我的计划（攻略体系 v1.0 PR3）
// 4 tab：草稿（draft）/ 已完成（completed）/ 已发攻略（published）/ 全部
// 每条卡片按 status 显示不同操作：draft→编辑+发攻略+删除；completed→记录感受+发攻略

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { PlanIcon, GuidebookIcon, SparklesIcon } from '@/components/Icons';
import { getToken, authedFetch } from '@/lib/auth';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

type Tab = 'draft' | 'completed' | 'published' | 'all';
type PlanStatus = 'draft' | 'confirmed' | 'active' | 'completed' | 'published';

interface PlanItem {
  id: string;
  title: string | null;
  status: PlanStatus;
  cityName: string;
  cityIds: string[];
  childAges: number[];
  startDate: string;
  endDate: string;
  hasGuide?: boolean;
  guideId?: string | null;
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'draft',     label: '草稿' },
  { key: 'completed', label: '已完成' },
  { key: 'published', label: '已发攻略' },
  { key: 'all',       label: '全部' },
];

// tab → status 过滤
const TAB_STATUS: Record<Tab, PlanStatus[]> = {
  draft: ['draft', 'confirmed', 'active'], // "还没发出去" 一类
  completed: ['completed'],
  published: ['published'],
  all: ['draft', 'confirmed', 'active', 'completed', 'published'],
};

const STATUS_LABEL: Record<PlanStatus, string> = {
  draft: '草稿',
  confirmed: '已确认',
  active: '进行中',
  completed: '已完成',
  published: '已发攻略',
};

const STATUS_TONE: Record<PlanStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  active: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  published: 'bg-purple-100 text-purple-700',
};

export default function MyPlansPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('draft');
  const [items, setItems] = useState<PlanItem[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({ draft: 0, completed: 0, published: 0, all: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; nickname: string; avatar: string | null } | null>(null);

  const token = typeof window !== 'undefined' ? getToken() : null;

  useEffect(() => {
    if (!token) { router.push('/login?redirect=/profile/plans'); return; }
    authedFetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d?.data ?? d?.user ?? d))
      .catch(() => {});
  }, [router, token]);

  // 一次性拉全部（用于 4 tab 计数 + 切 tab 本地过滤，避免 4 次并发请求）
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`${TRAVEL_API}/api/plans?userId=${user.id}`)
      .then(r => r.json())
      .then(j => {
        const raw: PlanItem[] = (j?.items ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          cityName: p.city?.name ?? '',
          cityIds: p.cityIds ?? [],
          childAges: p.childAges ?? [],
          startDate: p.startDate,
          endDate: p.endDate,
        }));
        setItems(raw);
        setCounts({
          draft: raw.filter(p => TAB_STATUS.draft.includes(p.status)).length,
          completed: raw.filter(p => TAB_STATUS.completed.includes(p.status)).length,
          published: raw.filter(p => TAB_STATUS.published.includes(p.status)).length,
          all: raw.length,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const visible = items.filter(p => TAB_STATUS[tab].includes(p.status));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ProfileSidebar user={user} counts={{
        guides: 0,
        plans: counts.all,
        children: 0,
        sayings: 0,
        badges: 0,
      }} />
      <div className="space-y-4 min-w-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h1 className="text-xl font-extrabold text-gray-900 mb-3">我的计划</h1>
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  tab === t.key
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{t.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-gray-200 text-gray-600'}`}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">加载中…</div>
        ) : visible.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="space-y-3">
            {visible.map(p => <PlanRow key={p.id} plan={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function PlanRow({ plan }: { plan: PlanItem }) {
  const dateStr = `${plan.startDate?.slice(0, 10) ?? ''} → ${plan.endDate?.slice(0, 10) ?? ''}`;
  const loc = plan.cityName || plan.cityIds.join(' · ') || '未选城市';
  const days = (() => {
    if (!plan.startDate || !plan.endDate) return 0;
    const a = new Date(plan.startDate).getTime();
    const b = new Date(plan.endDate).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
    return Math.floor((b - a) / 86_400_000) + 1;
  })();
  return (
    <Link
      href={`/plan/${plan.id}`}
      className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition"
    >
      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
        <PlanIcon size={26} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-gray-900 truncate">{plan.title || '未命名计划'}</h3>
          <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_TONE[plan.status]}`}>
            {STATUS_LABEL[plan.status]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{loc}</span>
          {days > 0 && <span>· {days} 天</span>}
          <span>· {dateStr}</span>
        </div>
      </div>
      <span className="text-xs text-blue-600 flex-shrink-0">查看 →</span>
    </Link>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const text = tab === 'draft'
    ? { t: '还没有出行计划', s: '去 wizard 生成一份适合孩子的计划' }
    : tab === 'completed'
      ? { t: '没有已完成的计划', s: '出行结束后状态会自动变成已完成' }
      : tab === 'published'
        ? { t: '还没有把计划变成攻略', s: '完成后点「发成攻略」就能分享给其他家长' }
        : { t: '没有计划', s: '去 wizard 创建你的第一份亲子出行计划' };
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
      <PlanIcon size={36} className="mx-auto text-gray-300 mb-3" />
      <p className="text-gray-700 font-medium">{text.t}</p>
      <p className="text-sm text-gray-400 mt-1">{text.s}</p>
      <Link href="/wizard" className="inline-block mt-4 px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold hover:shadow-md transition">
        立即创建
      </Link>
    </div>
  );
}