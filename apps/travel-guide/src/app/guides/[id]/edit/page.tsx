// /guides/[id]/edit — 编辑攻略（攻略体系 v1.0 PR3）
// owner + status ∈ {draft, rejected, published} 才进
// 顶部 banner：状态徽章 + 提交审核 / 直接发布 / 撤回按钮
// 表单复用 create 页模式；保存调 PUT /api/guides/[id]；状态流转调 /submit /publish /retract

'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import TipTapEditor from '@/components/TipTapEditor';
import { BabyIcon, GuidebookIcon } from '@/components/Icons';
import { getToken, authedFetch } from '@/lib/auth';
import type { GuideStatus } from '@/lib/guide-status';
import { GUIDE_STATUS_LABEL } from '@/lib/guide-status';

const STATUS_TONE: Record<GuideStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  archived: 'bg-gray-200 text-gray-600',
};

export default function EditGuidePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>}>
      <EditGuideInner />
    </Suspense>
  );
}

function EditGuideInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GuideStatus>('draft');
  const [permissions, setPermissions] = useState<{
    canEdit: boolean;
    canSubmit: boolean;
    canPublishDirect: boolean;
    canWithdraw: boolean;
    canArchive: boolean;
  } | null>(null);
  const [form, setForm] = useState({
    title: '',
    cityId: '',
    days: 0,
    childAges: '' as string,
    contentHtml: '',
  });

  useEffect(() => {
    fetch(`/api/guides/${id}`)
      .then(r => r.json().catch(() => null))
      .then(d => {
        if (!d?.data) { setError('攻略不存在'); return; }
        const g = d.data;
        if (!g.permissions?.canEdit) { setError('无权编辑此攻略'); return; }
        setStatus(g.status);
        setPermissions(g.permissions);
        setForm({
          title: g.title ?? '',
          cityId: g.cityId ?? '',
          days: g.days ?? 0,
          childAges: Array.isArray(g.childAges) ? g.childAges.join(',') : '',
          contentHtml: g.contentHtml ?? '',
        });
        // 接受 ?planId= 预填（PR3：from-plan 跳过来后用户接着编辑）
        const planId = searchParams?.get('planId');
        if (planId && !g.title) {
          fetch(`/api/plans/${planId}`).then(r => r.json()).then(pd => {
            const p = pd?.data ?? pd;
            if (p?.title) setForm(f => ({ ...f, title: p.title, cityId: p.cityId ?? f.cityId }));
          }).catch(() => {});
        }
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [id, searchParams]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await authedFetch(`/api/guides/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          cityId: form.cityId,
          days: form.days,
          childAges: form.childAges ? form.childAges.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n)) : [],
          contentHtml: form.contentHtml,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { alert(d?.error?.message ?? '保存失败'); return; }
      alert('已保存');
    } finally {
      setSaving(false);
    }
  };

  const doAction = async (action: 'submit' | 'publish' | 'retract') => {
    if (!confirm(`${action} 后将无法撤销，确定继续吗？`)) return;
    const r = await authedFetch(`/api/guides/${id}/${action}`, { method: 'POST' });
    const d = await r.json().catch(() => null);
    if (!r.ok) { alert(d?.error?.message ?? `${action} 失败`); return; }
    alert(`${action} 成功`);
    router.push('/profile/guides');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-gray-500">{error}</div>;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {/* 顶部状态 banner */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/profile/guides" className="text-sm text-gray-500 hover:text-gray-900">← 返回</Link>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_TONE[status]}`}>
            {GUIDE_STATUS_LABEL[status]}
          </span>
          <span className="flex-1" />
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 disabled:opacity-50 font-medium"
          >
            {saving ? '保存中…' : '保存'}
          </button>
          {permissions?.canSubmit && status === 'rejected' && (
            <button
              onClick={() => doAction('submit')}
              className="px-4 py-1.5 text-sm bg-red-50 text-red-700 rounded-full hover:bg-red-100 font-medium"
            >
              修改重提
            </button>
          )}
          {permissions?.canSubmit && status === 'draft' && (
            <button
              onClick={() => doAction('submit')}
              className="px-4 py-1.5 text-sm bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100 font-medium"
            >
              提交审核
            </button>
          )}
          {permissions?.canPublishDirect && status === 'draft' && (
            <button
              onClick={() => doAction('publish')}
              className="px-4 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:shadow-md font-bold"
            >
              直接发布
            </button>
          )}
          {permissions?.canWithdraw && status === 'published' && (
            <button
              onClick={() => doAction('retract')}
              className="px-4 py-1.5 text-sm bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100 font-medium"
            >
              撤回编辑
            </button>
          )}
        </div>
      </header>

      {/* rejected 状态 banner：原因 + 重新编辑提示 */}
      {status === 'rejected' && (
        <div className="max-w-3xl mx-auto px-6 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800">
            ⚠️ 这篇攻略被自动审核拒绝了。请修改相关内容后点击「修改重提」重新提交。
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">标题</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="给孩子的这次旅行起个标题"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">目的地 City ID</label>
            <input
              type="text"
              value={form.cityId}
              onChange={e => setForm(f => ({ ...f, cityId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">天数</label>
            <input
              type="number"
              min={0}
              value={form.days}
              onChange={e => setForm(f => ({ ...f, days: parseInt(e.target.value, 10) || 0 }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">孩子年龄（月龄，逗号分隔）</label>
          <input
            type="text"
            value={form.childAges}
            onChange={e => setForm(f => ({ ...f, childAges: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="例：36, 60"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">正文</label>
          <TipTapEditor content={form.contentHtml} onChange={html => setForm(f => ({ ...f, contentHtml: html }))} />
        </div>
      </div>
    </main>
  );
}