// GuideReviewForm + GuideComments — 攻略详情页评分/评论组件
// 复用 /place/[type]/[id] 的 ReviewForm 模式，双维度评分 + 评论列表
'use client';
import { useState } from 'react';
import { StarIcon, UserIcon, BabyIcon, ForkIcon, ThumbsUpIcon, CheckIcon } from '@/components/Icons';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface GuideReviewFormProps {
  guideId: string;
  guideTitle: string;
  onSubmitted: () => void;
}

export function GuideReviewForm({ guideId, guideTitle, onSubmitted }: GuideReviewFormProps) {
  const [adultRating, setAdultRating] = useState(5);
  const [childRating, setChildRating] = useState(5);
  const [childAgeMonths, setChildAgeMonths] = useState(36);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('grandkidsgo_token');
      const res = await fetch(`${TRAVEL_API}/api/guides/${guideId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adultRating, childRating, childAgeMonths, text: text || null }),
      });
      const d = await res.json();
      if (d.code === 'OK') { setSubmitted(true); setTimeout(() => { onSubmitted(); location.reload(); }, 1000); }
      else alert(d.message || '提交失败');
    } catch { alert('网络错误'); }
    finally { setSubmitting(false); }
  };

  if (submitted) return <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-4 text-center"><CheckIcon size={24} className="text-blue-600 mx-auto mb-1" /><div className="font-bold text-blue-900">评分已提交！</div></div>;

  return (
    <div className="bg-blue-50/30 rounded-2xl p-5 mt-4 border border-blue-100">
      <h3 className="font-bold text-gray-900 mb-3">为「{guideTitle}」打分</h3>

      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1 inline-flex items-center gap-1"><UserIcon size={12} /> 大人评分</label>
        <div className="flex gap-1">{[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => setAdultRating(n)}><StarIcon size={24} className={n <= adultRating ? 'text-amber-500' : 'text-gray-200'} /></button>
        ))}</div>
      </div>
      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1 inline-flex items-center gap-1"><BabyIcon size={12} /> 孩子评分</label>
        <div className="flex gap-1">{[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => setChildRating(n)}><StarIcon size={24} className={n <= childRating ? 'text-amber-500' : 'text-gray-200'} /></button>
        ))}</div>
      </div>
      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1">孩子当时多大？</label>
        <select value={childAgeMonths} onChange={e => setChildAgeMonths(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="12">1 岁</option><option value="24">2 岁</option><option value="36">3 岁</option>
          <option value="48">4 岁</option><option value="60">5 岁</option><option value="72">6 岁</option>
          <option value="96">8 岁</option><option value="120">10 岁+</option>
        </select>
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="说说你的真实体验…" rows={2}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-blue-300 bg-white" />
      <button onClick={submit} disabled={submitting}
        className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-lg text-sm disabled:opacity-50 hover:shadow-md transition">
        {submitting ? '提交中…' : '提交评分'}
      </button>
    </div>
  );
}

interface GuideCommentsProps {
  guideId: string;
  initialItems: Array<{id: string; content: string; createdAt: string}>;
  initialCount: number;
}

export function GuideComments({ guideId, initialItems, initialCount }: GuideCommentsProps) {
  const [items, setItems] = useState(initialItems);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('grandkidsgo_token');
      const res = await fetch(`${TRAVEL_API}/api/guides/${guideId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text }),
      });
      const d = await res.json();
      if (d.code === 'OK') { setText(''); setItems(prev => [{id: d.data.id, content: d.data.content, createdAt: d.data.createdAt}, ...prev]); }
      else alert(d.message || '评论失败');
    } catch { alert('网络错误'); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <textarea value={text} onChange={e => setText(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-300 bg-white" rows={2} placeholder="说点什么吧..." />
        <button onClick={submit} disabled={!text.trim() || submitting}
          className="px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold disabled:opacity-50 self-end hover:shadow-md transition">
          {submitting ? '…' : '发表'}
        </button>
      </div>
      {items.length === 0 && <p className="text-gray-400 text-sm text-center py-4">暂无评论</p>}
      <div className="space-y-3">
        {items.map(c => (
          <div key={c.id} className="border-b border-gray-100 pb-3 last:border-0">
            <p className="text-sm text-gray-700">{c.content}</p>
            <span className="text-xs text-gray-400 mt-1 block">{new Date(c.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}