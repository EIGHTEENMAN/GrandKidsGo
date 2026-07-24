// /profile/guides — 我的攻略（已发布/草稿/收藏）
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { GuidebookIcon, EyeIcon, ThumbsUpIcon, BookmarkIcon } from '@/components/Icons';
import { getToken, authedFetch } from '@/lib/auth';

type Tab = 'published' | 'drafts' | 'saved';
type GuideItem = {
  id: string;
  title: string;
  coverImages?: string[];
  cityId?: string;
  days?: number;
  viewCount?: number;
  likeCount?: number;
  saveCount?: number;
  publishedAt?: string;
  savedAt?: string;
  status?: string;
  updatedAt?: string;
  mode?: string;
};

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: 'published', label: '已发布', icon: <GuidebookIcon size={14} /> },
  { key: 'drafts', label: '草稿', icon: <BookmarkIcon size={14} /> },
  { key: 'saved', label: '收藏', icon: <ThumbsUpIcon size={14} /> },
];

export default function MyGuidesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('published');
  const [items, setItems] = useState<GuideItem[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({ published: 0, drafts: 0, saved: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; nickname: string; avatar: string | null } | null>(null);

  const token = typeof window !== 'undefined' ? getToken() : null;

  useEffect(() => {
    if (!token) { router.push('/login?redirect=/profile/guides'); return; }
    authedFetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d?.data ?? d?.user ?? d))
      .catch(() => {});
  }, [router, token]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      authedFetch('/api/guides/mine?type=published', { userId: user.id }).then(r => r.json()),
      authedFetch('/api/guides/mine?type=drafts', { userId: user.id }).then(r => r.json()),
      authedFetch('/api/guides/mine?type=saved', { userId: user.id }).then(r => r.json()),
    ]).then(([p, d, s]) => {
      setCounts({
        published: p?.items?.length ?? 0,
        drafts: d?.items?.length ?? 0,
        saved: s?.items?.length ?? 0,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    authedFetch(`/api/guides/mine?type=${tab}`, { userId: user.id })
      .then(r => r.json())
      .then(j => setItems(j?.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id, tab]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ProfileSidebar user={user} counts={{
        guides: counts.published,
        children: 0,
        sayings: 0,
        badges: 0,
      }} />
      <div className="space-y-4 min-w-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h1 className="text-xl font-extrabold text-gray-900 mb-3">我的攻略</h1>
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
                {t.icon}
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
        ) : items.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="space-y-3">
            {items.map(g => (
              <GuideRow key={g.id} guide={g} tab={tab} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GuideRow({ guide, tab }: { guide: GuideItem; tab: Tab }) {
  const cover = guide.coverImages?.[0];
  const dateStr = (guide.publishedAt ?? guide.savedAt ?? guide.updatedAt ?? '');
  const date = dateStr ? new Date(dateStr).toLocaleDateString('zh-CN') : '';
  return (
    <Link
      href={tab === 'drafts' ? `/guides/${guide.id}/edit` : `/guides/${guide.id}`}
      className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition"
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100 flex-shrink-0">
        {cover ? (
          <img src={cover} alt={guide.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <GuidebookIcon size={28} className="text-blue-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 truncate">{guide.title || '未命名攻略'}</h3>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          {guide.cityId && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{guide.cityId}</span>}
          {guide.days && <span>{guide.days} 天</span>}
          {guide.status === 'pending' && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">审核中</span>}
          <span>{date}</span>
        </div>
      </div>
      {tab === 'published' && (
        <div className="flex flex-col items-end gap-1 text-xs text-gray-500 flex-shrink-0">
          <span className="inline-flex items-center gap-1"><EyeIcon size={12} />{guide.viewCount ?? 0}</span>
          <span className="inline-flex items-center gap-1"><ThumbsUpIcon size={12} />{guide.likeCount ?? 0}</span>
          <span className="inline-flex items-center gap-1"><BookmarkIcon size={12} />{guide.saveCount ?? 0}</span>
        </div>
      )}
      {tab === 'drafts' && (
        <span className="text-xs text-blue-600 flex-shrink-0">继续编辑 →</span>
      )}
    </Link>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const text = tab === 'published' ? { t: '还没有发布攻略', s: '把孩子的旅行故事写下来吧' }
    : tab === 'drafts' ? { t: '还没有草稿', s: '草稿会自动保存到这里' }
    : { t: '还没有收藏', s: '看到喜欢的攻略可以收藏起来' };
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
      <GuidebookIcon size={36} className="mx-auto text-gray-300 mb-3" />
      <p className="text-gray-700 font-medium">{text.t}</p>
      <p className="text-sm text-gray-400 mt-1">{text.s}</p>
      {tab !== 'saved' && (
        <Link href="/guides/create" className="inline-block mt-4 px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold hover:shadow-md transition">
          写新攻略
        </Link>
      )}
    </div>
  );
}