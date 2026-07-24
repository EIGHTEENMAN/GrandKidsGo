// /profile/sayings — 孩子说（按孩子分组 + mood 统计）
'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { BabyIcon, SparklesIcon } from '@/components/Icons';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

const MOODS = ['happy', 'surprised', 'curious', 'sleepy', 'excited'];
const MOOD_LABEL: Record<string, string> = {
  happy: '开心', surprised: '惊喜', curious: '好奇', sleepy: '犯困', excited: '兴奋',
};
const MOOD_COLOR: Record<string, string> = {
  happy: 'bg-pink-100 text-pink-600',
  surprised: 'bg-amber-100 text-amber-600',
  curious: 'bg-blue-100 text-blue-600',
  sleepy: 'bg-purple-100 text-purple-600',
  excited: 'bg-orange-100 text-orange-600',
};

type Saying = {
  id: string;
  text: string;
  mood: string | null;
  shareScope: string;
  createdAt: string;
  childId: string | null;
  spotId: string | null;
};

type Child = {
  childId: string;
  nickname?: string | null;
  name?: string | null;
  avatar?: string | null;
};

export default function MyChildSayingsPage() {
  const router = useRouter();
  const [sayings, setSayings] = useState<Saying[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [filterChild, setFilterChild] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; nickname: string; avatar: string | null } | null>(null);

  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('grandkidsgo_token') || localStorage.getItem('haodaer_token')
    : null;

  useEffect(() => {
    if (!token) { router.push('/login?redirect=/profile/sayings'); return; }
    fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUser(d?.data ?? d?.user ?? d))
      .catch(() => {});
  }, [router, token]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/child-sayings`, { headers: { 'x-debug-user-id': user.id } }).then(r => r.json()),
      fetch(`/api/user/children?userId=${user.id}`, { headers: { 'x-debug-user-id': user.id } }).then(r => r.json()),
    ]).then(([sj, cj]) => {
      setSayings(sj?.data?.items ?? []);
      setChildren(cj?.data?.items ?? cj?.items ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (filterChild === 'all') return sayings;
    return sayings.filter(s => s.childId === filterChild);
  }, [sayings, filterChild]);

  const moodCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sayings) {
      if (!s.mood) continue;
      map[s.mood] = (map[s.mood] ?? 0) + 1;
    }
    return map;
  }, [sayings]);

  const totalForMood = Object.values(moodCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ProfileSidebar user={user} counts={{
        guides: 0,
        children: children.length,
        sayings: sayings.length,
        badges: 0,
      }} />
      <div className="space-y-4 min-w-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-extrabold text-gray-900">孩子说</h1>
            <Link href="/child-sayings" className="text-sm text-blue-600 hover:text-blue-700">+ 记录新语录</Link>
          </div>

          {loading ? (
            <p className="text-gray-400 py-8 text-center">加载中…</p>
          ) : sayings.length === 0 ? (
            <EmptySayings />
          ) : (
            <>
              {/* 孩子切换器 */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <ChildChip active={filterChild === 'all'} onClick={() => setFilterChild('all')} label="全部" count={sayings.length} />
                {children.map(c => (
                  <ChildChip
                    key={c.childId}
                    active={filterChild === c.childId}
                    onClick={() => setFilterChild(c.childId)}
                    label={c.nickname ?? c.name ?? '未命名'}
                    avatar={c.avatar ?? null}
                    count={sayings.filter(s => s.childId === c.childId).length}
                  />
                ))}
              </div>

              {/* mood 统计 */}
              {totalForMood > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">心情分布</p>
                  <div className="space-y-1.5">
                    {MOODS.filter(m => moodCounts[m]).map(m => (
                      <div key={m} className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${MOOD_COLOR[m]}`}>{MOOD_LABEL[m]}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${MOOD_COLOR[m].replace('100', '400').replace('text-', 'bg-')}`} style={{ width: `${(moodCounts[m] / totalForMood) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{moodCounts[m]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 时间线 */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(s => {
              const child = children.find(c => c.childId === s.childId);
              return (
                <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-amber-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-700">
                      {child?.avatar
                        ? <img src={child.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        : (child?.nickname ?? '宝')[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 text-lg leading-relaxed mb-2">"{s.text}"</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {child?.nickname && <span className="font-medium text-gray-700">{child.nickname}</span>}
                        {s.mood && <span className={`px-2 py-0.5 rounded-full ${MOOD_COLOR[s.mood]}`}>{MOOD_LABEL[s.mood] ?? s.mood}</span>}
                        <span className="text-gray-400">{new Date(s.createdAt).toLocaleDateString('zh-CN')}</span>
                        {s.shareScope !== 'private' && <span className="text-gray-400">· {s.shareScope === 'public' ? '公开' : '社区'}</span>}
                        {s.spotId && <span className="text-blue-500">· 关联景点</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && sayings.length > 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400">
            这个孩子还没有童言趣语
          </div>
        )}
      </div>
    </div>
  );
}

function ChildChip({ active, onClick, label, avatar, count }: { active: boolean; onClick: () => void; label: string; avatar?: string | null; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap transition ${
        active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {avatar && <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover" />}
      <span className="text-sm font-medium">{label}</span>
      {count !== undefined && <span className={`text-xs ${active ? 'text-white/80' : 'text-gray-500'}`}>{count}</span>}
    </button>
  );
}

function EmptySayings() {
  return (
    <div className="text-center py-8">
      <BabyIcon size={40} className="mx-auto text-gray-300 mb-3" />
      <p className="text-gray-700 font-medium">还没有童言趣语</p>
      <p className="text-sm text-gray-400 mt-1 mb-4">孩子的金句值得被记住</p>
      <Link href="/child-sayings" className="inline-block px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold">
        记录第一条
      </Link>
    </div>
  );
}