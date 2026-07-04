'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type GuideDetail = {
  id: string; title: string; summary: string; destination: string; category: string;
  coverImage: string; ageRange: string; days: number; budget: number; viewCount: number;
  createdAt: string;
  author: { id: string; nickname: string; avatar: string };
  sections: { id: string; title: string; content: string; order: number }[];
  ratings: { score: number }[];
  comments: { id: string; content: string; createdAt: string; user: { nickname: string } }[];
};

export default function GuideDetailPage() {
  const params = useParams();
  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('haodaer_token');
    if (token) {
      fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if (d.code === 'OK') setUser(d.data); }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetch(`/api/guides/${params.id}`)
      .then(r => r.json()).then(d => { if (d.code === 'OK') setGuide(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  const submitComment = async () => {
    if (!commentText.trim() || !user) return;
    const token = localStorage.getItem('haodaer_token');
    const res = await fetch(`/api/guides/${params.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: commentText, userId: user.id }),
    });
    const d = await res.json();
    if (d.code === 'OK') {
      setGuide(prev => prev ? {
        ...prev,
        comments: [...prev.comments, { id: d.data.id, content: d.data.content, createdAt: d.data.createdAt, user: { nickname: user.nickname || user.username } }]
      } : prev);
      setCommentText('');
    }
  };

  const submitRating = async (score: number) => {
    if (!user) return alert('请先登录');
    const token = localStorage.getItem('haodaer_token');
    const res = await fetch(`/api/guides/${params.id}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ score, userId: user.id }),
    });
    const d = await res.json();
    if (d.code === 'OK') alert('评分成功');
    else alert(d.message || '评分失败');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>;
  if (!guide) return <div className="min-h-screen flex items-center justify-center text-gray-400">攻略不存在</div>;

  const avgRating = guide.ratings.length > 0
    ? (guide.ratings.reduce((a: number, r: any) => a + r.score, 0) / guide.ratings.length).toFixed(1)
    : '暂无';

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-green-600 hover:text-green-800 text-sm">← 返回首页</Link>
          <span className="text-gray-300">|</span>
          <Link href="/guides/create" className="text-green-600 hover:text-green-800 text-sm">发布攻略</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 标题区 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="h-48 bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold">
            {guide.destination}
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-green-50 text-green-600 text-xs px-2 py-0.5 rounded">{guide.category}</span>
              {guide.ageRange && <span className="bg-green-50 text-green-600 text-xs px-2 py-0.5 rounded">{guide.ageRange}</span>}
              {guide.days > 0 && <span className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded">{guide.days}天</span>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{guide.title}</h1>
            <p className="text-gray-600 mb-4">{guide.summary}</p>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>作者：{guide.author?.nickname || '匿名'}</span>
              <div className="flex items-center gap-4">
                <span>评分：{avgRating}</span>
                <span>浏览：{guide.viewCount}</span>
                <span>{new Date(guide.createdAt).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>

            {/* 评分 */}
            <div className="mt-4 pt-4 border-t flex items-center gap-2">
              <span className="text-sm text-gray-500">评分：</span>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => submitRating(s)}
                  className="text-2xl hover:scale-110 transition-transform">⭐</button>
              ))}
            </div>
          </div>
        </div>

        {/* 正文 */}
        <div className="space-y-4 mb-6">
          {guide.sections.sort((a, b) => a.order - b.order).map(sec => (
            <div key={sec.id} className="bg-white rounded-xl shadow-sm p-6">
              {sec.title && <h2 className="text-xl font-bold text-gray-900 mb-4">{sec.title}</h2>}
              <div className="prose prose-green max-w-none" dangerouslySetInnerHTML={{ __html: sec.content }} />
            </div>
          ))}
        </div>

        {/* 评论 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">评论 ({guide.comments.length})</h2>

          {user ? (
            <div className="flex gap-3 mb-6">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500" rows={2} placeholder="写评论..." />
              <button onClick={submitComment} disabled={!commentText.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 self-end">
                发表
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-6"><Link href={`/login?redirect=/guides/${params.id}`} className="text-green-600">登录</Link>后可以评论</p>
          )}

          {guide.comments.length === 0 ? (
            <p className="text-gray-400 text-sm">暂无评论</p>
          ) : (
            <div className="space-y-3">
              {guide.comments.map(c => (
                <div key={c.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-700">{c.user.nickname}</span>
                    <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <p className="text-sm text-gray-600">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
