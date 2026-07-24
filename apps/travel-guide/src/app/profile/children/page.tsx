// /profile/children — 孩子档案管理（多孩切换 + 基础/扩展分离）
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { BabyIcon, SparklesIcon, ClockIcon, AlertIcon, ThumbsUpIcon } from '@/components/Icons';

type Child = {
  childId: string;
  nickname?: string | null;
  name?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  avatar?: string | null;
  likes?: string[];
  dislikes?: string[];
  allergies?: string[];
  activeHoursPerDay?: number;
  needNap?: string;
  earlyOrLate?: string;
  hasMotionSickness?: boolean;
  isShyWithStrangers?: boolean;
  healthNotes?: string | null;
};

type Feeling = {
  childId: string;
  spotTypePreferences?: Record<string, number>;
  averageActiveStayMinutes?: number | null;
  cryingTriggers?: Record<string, number>;
  energyCurveByTimeOfDay?: Record<string, number>;
  totalDataPoints?: number;
};

export default function MyChildrenPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [feelings, setFeelings] = useState<Record<string, Feeling>>({});
  const [activeId, setActiveId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; nickname: string; avatar: string | null } | null>(null);

  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('grandkidsgo_token') || localStorage.getItem('haodaer_token')
    : null;

  useEffect(() => {
    if (!token) { router.push('/login?redirect=/profile/children'); return; }
    fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUser(d?.data ?? d?.user ?? d))
      .catch(() => {});
  }, [router, token]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/user/children?userId=${user.id}`, { headers: { 'x-debug-user-id': user.id } })
      .then(r => r.json())
      .then(async (j) => {
        const items: Child[] = j?.data?.items ?? j?.items ?? [];
        setChildren(items);
        if (items.length && !activeId) setActiveId(items[0].childId);
        // 拉所有孩子的感受画像
        const feelingMap: Record<string, Feeling> = {};
        await Promise.all(items.map(async c => {
          try {
            const r = await fetch(`/api/user/children/${c.childId}/feeling`, { headers: { 'x-debug-user-id': user.id } });
            if (r.ok) {
              const fj = await r.json();
              feelingMap[c.childId] = fj?.data ?? fj;
            }
          } catch { /* skip */ }
        }));
        setFeelings(feelingMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const active = children.find(c => c.childId === activeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ProfileSidebar user={user} counts={{
        guides: 0,
        children: children.length,
        sayings: 0,
        badges: 0,
      }} />
      <div className="space-y-4 min-w-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-extrabold text-gray-900">孩子档案</h1>
            <Link href="/profile/children?action=add" className="text-sm px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-medium">
              + 添加孩子
            </Link>
          </div>
          {loading ? (
            <p className="text-gray-400 py-8 text-center">加载中…</p>
          ) : children.length === 0 ? (
            <EmptyChildren />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {children.map(c => {
                const initials = (c.nickname ?? c.name ?? '宝')[0];
                return (
                  <button
                    key={c.childId}
                    onClick={() => setActiveId(c.childId)}
                    className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition flex-shrink-0 ${
                      activeId === c.childId ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${
                      activeId === c.childId
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                        : 'bg-gradient-to-br from-pink-100 to-amber-100 text-gray-700'
                    }`}>
                      {c.avatar ? <img src={c.avatar} alt="" className="w-14 h-14 rounded-full object-cover" /> : initials}
                    </span>
                    <span className="text-xs text-gray-700 max-w-[60px] truncate">{c.nickname ?? c.name ?? '未命名'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {active && <ChildDetail child={active} feeling={feelings[active.childId]} />}
      </div>
    </div>
  );
}

function EmptyChildren() {
  return (
    <div className="text-center py-8">
      <BabyIcon size={40} className="mx-auto text-gray-300 mb-3" />
      <p className="text-gray-700 font-medium">还没有添加孩子</p>
      <p className="text-sm text-gray-400 mt-1 mb-4">孩子档案会同步到主站童慧行账号</p>
      <a href="https://grandand.com/profile" target="_blank" rel="noopener" className="inline-block px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold">
        去主站添加
      </a>
    </div>
  );
}

function ChildDetail({ child, feeling }: { child: Child; feeling?: Feeling }) {
  const age = child.birthDate ? computeAge(child.birthDate) : null;
  const genderLabel = child.gender === 'male' ? '♂ 男宝' : child.gender === 'female' ? '♀ 女宝' : '';
  const topSpots = feeling?.spotTypePreferences
    ? Object.entries(feeling.spotTypePreferences).sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [];
  const topTriggers = feeling?.cryingTriggers
    ? Object.entries(feeling.cryingTriggers).sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [];

  return (
    <>
      {/* 基本信息 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold">
            {child.avatar ? <img src={child.avatar} alt="" className="w-20 h-20 rounded-full object-cover" /> : (child.nickname ?? child.name ?? '宝')[0]}
          </span>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">{child.nickname ?? child.name ?? '未命名'}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {genderLabel}
              {age && <span className="ml-2">{age}</span>}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {child.birthDate && <Info label="生日" value={child.birthDate} />}
          {child.needNap && <Info label="午休" value={child.needNap === 'required' ? '必午休' : child.needNap === 'optional' ? '可午休' : '不午休'} />}
          {child.earlyOrLate && <Info label="作息" value={child.earlyOrLate === 'early_bird' ? '早起型' : '晚起型'} />}
          {child.activeHoursPerDay !== undefined && <Info label="活跃时长" value={`${child.activeHoursPerDay} 小时/天`} />}
          {child.hasMotionSickness !== undefined && <Info label="晕车" value={child.hasMotionSickness ? '是' : '否'} />}
          {child.isShyWithStrangers !== undefined && <Info label="怕生" value={child.isShyWithStrangers ? '是' : '否'} />}
        </div>
      </div>

      {/* 兴趣/讨厌/过敏 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TagBlock icon={<ThumbsUpIcon size={16} className="text-pink-500" />} title="喜欢" tags={child.likes ?? []} empty="暂未填写" />
        <TagBlock icon={<AlertIcon size={16} className="text-orange-500" />} title="讨厌" tags={child.dislikes ?? []} empty="暂未填写" />
        <TagBlock icon={<SparklesIcon size={16} className="text-blue-500" />} title="过敏" tags={child.allergies ?? []} empty="暂未填写" />
      </div>

      {/* 感受画像摘要 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-3 inline-flex items-center gap-2">
          <ClockIcon size={16} className="text-blue-600" /> 感受画像
        </h3>
        {feeling?.totalDataPoints === 0 || !feeling ? (
          <p className="text-sm text-gray-400">暂无数据。等孩子去过几个景点后会自动汇总最爱景点、哭闹触发、活跃时段。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">最爱景点类型</p>
              {topSpots.length === 0 ? <p className="text-gray-400">—</p> : (
                <ul className="space-y-1">
                  {topSpots.map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="text-blue-600 font-medium">{v} 次</span></li>)}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">哭闹触发</p>
              {topTriggers.length === 0 ? <p className="text-gray-400">—</p> : (
                <ul className="space-y-1">
                  {topTriggers.map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="text-orange-600 font-medium">{v} 次</span></li>)}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">平均停留</p>
              <p className="text-2xl font-extrabold text-gray-900">{feeling?.averageActiveStayMinutes ?? '—'} <span className="text-sm text-gray-500">分钟</span></p>
              <p className="text-xs text-gray-400 mt-2">数据点 {feeling?.totalDataPoints ?? 0}</p>
            </div>
          </div>
        )}
      </div>

      {child.healthNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
          <strong>健康备注：</strong>{child.healthNotes}
        </div>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-gray-900 font-medium mt-0.5">{value}</div>
    </div>
  );
}

function TagBlock({ icon, title, tags, empty }: { icon: React.ReactNode; title: string; tags: string[]; empty: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 className="font-bold text-gray-900 mb-2 inline-flex items-center gap-1.5">{icon}{title}</h3>
      {tags.length === 0 ? (
        <p className="text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => <span key={t} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">{t}</span>)}
        </div>
      )}
    </div>
  );
}

function computeAge(birthDate: string): string {
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return '';
  const now = new Date();
  const months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (months < 24) return `${months} 月`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} 岁` : `${years} 岁 ${rest} 月`;
}