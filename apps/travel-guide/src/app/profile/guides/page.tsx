// /profile/guides — 我的攻略（攻略体系 v1.0 PR3 升级 + 用户答复 2026-07-29 待审核感知）
// 6 状态 tabs + saved tab：pending_review(待审核) / drafts(草稿+退回) / published / rejected / archived / saved
// 卡片按 status 显示不同操作（编辑/撤回/发布/删除/归档/分享）+ 展示 DFA reason（pending_review/rejected）

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import {
  GuidebookIcon, EyeIcon, ThumbsUpIcon, BookmarkIcon, ShareIcon, EditIcon, ArchiveIcon, ClockIcon,
} from '@/components/Icons';
import { getToken, authedFetch } from '@/lib/auth';
import { GUIDE_STATUS_LABEL } from '@/lib/guide-status';

type Tab = 'pending_review' | 'drafts' | 'published' | 'rejected' | 'archived' | 'saved';
type GuideStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

interface GuideItem {
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
  status?: GuideStatus;
  updatedAt?: string;
  mode?: string;
  rejectionReason?: string;
  // PR 后台审核拆分 v1.0：从 OperationLog 拉的 DFA 审核信息
  reviewReason?: string | null;
  reviewSensitivity?: 'hard' | 'soft' | 'clean' | null;
  reviewedAt?: string | null;
}

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode; accent?: string }> = [
  { key: 'pending_review', label: '待审核',  icon: <ClockIcon size={14} />, accent: 'amber' },
  { key: 'drafts',    label: '草稿/退回',  icon: <BookmarkIcon size={14} /> },
  { key: 'published', label: '已发布',  icon: <GuidebookIcon size={14} /> },
  { key: 'rejected',  label: '未通过',  icon: <GuidebookIcon size={14} /> },
  { key: 'archived',  label: '已归档',  icon: <ArchiveIcon size={14} /> },
  { key: 'saved',     label: '收藏',    icon: <ThumbsUpIcon size={14} /> },
];

const STATUS_BADGE: Record<GuideStatus, { tone: string; label: string }> = {
  draft:          { tone: 'bg-gray-100 text-gray-700',     label: '草稿' },
  pending_review: { tone: 'bg-amber-100 text-amber-700',   label: '审核中' },
  published:      { tone: 'bg-emerald-100 text-emerald-700', label: '已发布' },
  rejected:       { tone: 'bg-red-100 text-red-700',       label: '未通过' },
  archived:       { tone: 'bg-gray-200 text-gray-600',     label: '已归档' },
};

export default function MyGuidesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pending_review'); // 用户答复 2026-07-29：默认显示「待审核」
  const [items, setItems] = useState<GuideItem[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({ pending_review: 0, drafts: 0, published: 0, rejected: 0, archived: 0, saved: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; nickname: string; avatar: string | null } | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? getToken() : null;

  useEffect(() => {
    if (!token) { router.push('/login?redirect=/profile/guides'); return; }
    authedFetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d?.data ?? d?.user ?? d))
      .catch(() => {});
  }, [router, token]);

  // 一次拉全量，按 status 本地分桶（避免 4 次串行请求）
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      authedFetch('/api/guides/mine?type=all', { userId: user.id }).then(r => r.json()),
      authedFetch('/api/guides/mine?type=saved', { userId: user.id }).then(r => r.json()),
    ]).then(([all, saved]) => {
      const list: GuideItem[] = all?.items ?? [];
      const newCounts: Record<Tab, number> = {
        pending_review: list.filter(g => g.status === 'pending_review').length,
        drafts:    list.filter(g => g.status === 'draft' || g.status === 'rejected').length,
        published: list.filter(g => g.status === 'published').length,
        rejected:  list.filter(g => g.status === 'rejected').length,
        archived:  list.filter(g => g.status === 'archived').length,
        saved:     saved?.items?.length ?? 0,
      };
      setCounts(newCounts);
      applyTab(list, 'pending_review', newCounts);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user?.id]);

  const applyTab = (list: GuideItem[], t: Tab, c: Record<Tab, number>) => {
    setCounts(c);
    const filtered = list.filter(g => {
      if (t === 'drafts') return g.status === 'draft' || g.status === 'rejected';
      if (t === 'pending_review') return g.status === 'pending_review';
      return g.status === t;
    });
    setItems(filtered);
  };

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    authedFetch(`/api/guides/mine?type=${tab}`, { userId: user.id })
      .then(r => r.json())
      .then(j => {
        const all: GuideItem[] = j?.items ?? [];
        if (tab === 'drafts') {
          setItems(all.filter(g => g.status === 'draft' || g.status === 'rejected'));
        } else {
          setItems(all);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id, tab]);

  const doAction = async (guideId: string, action: 'submit' | 'publish' | 'archive' | 'unarchive' | 'retract') => {
    setActionPending(`${guideId}:${action}`);
    try {
      const r = await authedFetch(`/api/guides/${guideId}/${action}`, { method: 'POST' });
      const actionRes = await r.json().catch(() => null);
      if (!r.ok) {
        alert(actionRes?.error?.message ?? `${action} 失败`);
        return;
      }
      // 刷新当前 tab + 计数
      const [all, saved] = await Promise.all([
        authedFetch('/api/guides/mine?type=all', { userId: user!.id }).then(r => r.json()),
        authedFetch('/api/guides/mine?type=saved', { userId: user!.id }).then(r => r.json()),
      ]);
      const list: GuideItem[] = all?.items ?? [];
      const newCounts: Record<Tab, number> = {
        pending_review: list.filter(g => g.status === 'pending_review').length,
        drafts:    list.filter(g => g.status === 'draft' || g.status === 'rejected').length,
        published: list.filter(g => g.status === 'published').length,
        rejected:  list.filter(g => g.status === 'rejected').length,
        archived:  list.filter(g => g.status === 'archived').length,
        saved:     saved?.items?.length ?? 0,
      };
      applyTab(list, tab, newCounts);
    } finally {
      setActionPending(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ProfileSidebar user={user} counts={{
        guides: counts.published,
        plans: 0,
        children: 0,
        sayings: 0,
        badges: 0,
      }} />
      <div className="space-y-4 min-w-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-extrabold text-gray-900">我的攻略</h1>
            <span className="text-xs text-gray-400">DFA 自动审核 · 异常进人工</span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map(t => {
              const isActive = tab === t.key;
              const isPending = t.key === 'pending_review';
              // 「待审核」tab 用橙色强调（区别于其他 tab）
              const activeClass = isPending
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
              const idleClass = isPending
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    isActive ? activeClass : idleClass
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : isPending ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-600'}`}>
                    {counts[t.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">加载中…</div>
        ) : items.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="space-y-3">
            {items.map(g => (
              <GuideRow
                key={g.id}
                guide={g}
                tab={tab}
                onAction={doAction}
                pending={actionPending?.startsWith(`${g.id}:`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GuideRow({
  guide, tab, onAction, pending,
}: {
  guide: GuideItem;
  tab: Tab;
  onAction: (id: string, a: 'submit' | 'publish' | 'archive' | 'unarchive' | 'retract') => void;
  pending?: boolean;
}) {
  const cover = guide.coverImages?.[0];
  const dateStr = (guide.publishedAt ?? guide.savedAt ?? guide.updatedAt ?? '');
  const date = dateStr ? new Date(dateStr).toLocaleDateString('zh-CN') : '';
  const statusBadge = guide.status && STATUS_BADGE[guide.status];

  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
      <Link href={`/guides/${guide.id}`} className="flex items-center gap-4 flex-1 min-w-0">
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
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 truncate">{guide.title || '未命名攻略'}</h3>
            {statusBadge && tab !== 'saved' && (
              <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusBadge.tone}`}>
                {statusBadge.label}
              </span>
            )}
            {/* PR 后台审核拆分：sensitivity 徽章让用户知道是机审还是人工待审 */}
            {guide.reviewSensitivity && tab !== 'saved' && (
              <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                guide.reviewSensitivity === 'soft'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : guide.reviewSensitivity === 'hard'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {guide.reviewSensitivity === 'soft' ? '⚠️ DFA 标疑' :
                 guide.reviewSensitivity === 'hard' ? '🚨 硬命中' : '✅ DFA 通过'}
              </span>
            )}
          </div>
          {/* PR 后台审核拆分：DFA 命中 reason 展示给用户 */}
          {guide.reviewReason && tab !== 'saved' && (
            <div className="mt-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 leading-relaxed">
              <strong className="font-bold">DFA 审核：</strong>{guide.reviewReason}
              {guide.reviewedAt && (
                <span className="ml-2 text-amber-600">
                  · {new Date(guide.reviewedAt).toLocaleString('zh-CN')}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
            {guide.cityId && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{guide.cityId}</span>}
            {guide.days && <span>{guide.days} 天</span>}
            <span>{date}</span>
          </div>
        </div>
      </Link>
      {/* 右侧操作栏（PR3: 按 status 分支） */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {tab === 'published' && (
          <>
            <span className="inline-flex items-center gap-2 text-xs text-gray-500 mr-2">
              <EyeIcon size={12} />{guide.viewCount ?? 0}
              <ThumbsUpIcon size={12} />{guide.likeCount ?? 0}
              <BookmarkIcon size={12} />{guide.saveCount ?? 0}
            </span>
            <button
              onClick={() => onAction(guide.id, 'retract')}
              disabled={pending}
              className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100 disabled:opacity-50"
            >
              撤回
            </button>
            <button
              onClick={() => onAction(guide.id, 'archive')}
              disabled={pending}
              className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50"
            >
              归档
            </button>
          </>
        )}
        {tab === 'drafts' && guide.status === 'rejected' && (
          <button
            onClick={() => onAction(guide.id, 'submit')}
            disabled={pending}
            className="text-xs px-2.5 py-1 bg-red-50 text-red-700 rounded-full hover:bg-red-100 disabled:opacity-50"
          >
            修改重提
          </button>
        )}
        {tab === 'drafts' && guide.status === 'draft' && (
          <Link
            href={`/guides/${guide.id}/edit`}
            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100"
          >
            继续编辑
          </Link>
        )}
        {tab === 'drafts' && guide.status === 'pending_review' && (
          <span className="text-xs text-amber-600">审核中…</span>
        )}
        {/* PR 后台审核拆分：待审核 tab 操作 — 让用户能编辑/撤回进入审核的攻略 */}
        {tab === 'pending_review' && (
          <>
            <Link
              href={`/guides/${guide.id}/edit`}
              className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100"
            >
              编辑
            </Link>
            <button
              onClick={() => onAction(guide.id, 'retract')}
              disabled={pending}
              className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100 disabled:opacity-50"
            >
              撤回编辑
            </button>
          </>
        )}
        {tab === 'drafts' && guide.status === 'draft' && (
          <button
            onClick={() => onAction(guide.id, 'publish')}
            disabled={pending}
            className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 disabled:opacity-50"
          >
            直接发布
          </button>
        )}
        {tab === 'rejected' && (
          <>
            <Link
              href={`/guides/${guide.id}/edit`}
              className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100"
            >
              修改
            </Link>
            <button
              onClick={() => onAction(guide.id, 'publish')}
              disabled={pending}
              className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 disabled:opacity-50"
            >
              直接发布
            </button>
          </>
        )}
        {tab === 'archived' && (
          <button
            onClick={() => onAction(guide.id, 'unarchive')}
            disabled={pending}
            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 disabled:opacity-50"
          >
            恢复
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  // 用户答复 2026-07-29：「待审核」感知
  const text = tab === 'pending_review' ? { t: '没有待审核的攻略', s: '你提交的攻略都会在这里显示审核进度', color: 'amber' }
    : tab === 'drafts'    ? { t: '还没有草稿', s: '草稿 / 退回都会显示在这里（审核中的攻略在「待审核」tab）' }
    : tab === 'published'  ? { t: '还没有发布攻略', s: '把孩子的旅行故事写下来吧' }
    : tab === 'rejected'   ? { t: '没有退回的攻略', s: '被 DFA 拒绝的攻略会出现在这里（请查看 DFA 命中原因）' }
    : tab === 'archived'   ? { t: '没有归档的攻略', s: '归档的攻略不会出现在公开页面' }
    : { t: '还没有收藏', s: '看到喜欢的攻略可以收藏起来' };
  const accent = (text as any).color === 'amber' ? 'text-amber-600' : 'text-gray-300';
  return (
    <div className={`bg-white rounded-2xl border border-dashed p-12 text-center ${tab === 'pending_review' ? 'border-amber-200' : 'border-gray-200'}`}>
      {tab === 'pending_review' ? (
        <ClockIcon size={36} className={`mx-auto ${accent} mb-3`} />
      ) : (
        <GuidebookIcon size={36} className={`mx-auto ${accent} mb-3`} />
      )}
      <p className="text-gray-700 font-medium">{text.t}</p>
      <p className="text-sm text-gray-400 mt-1">{text.s}</p>
      {tab === 'pending_review' && (
        <p className="text-xs text-amber-700 mt-3 max-w-md mx-auto leading-relaxed">
          ⚙️ <strong>审核流程：</strong>DFA 自动审为主（敏感词/手机号/孩子身份证等），合规则直接发布；触发软命中（色情/赌博/歧视等疑似敏感词）会进入人工审核队列
        </p>
      )}
      {tab !== 'saved' && tab !== 'pending_review' && (
        <Link href="/guides/create" className="inline-block mt-4 px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold hover:shadow-md transition">
          写新攻略
        </Link>
      )}
    </div>
  );
}