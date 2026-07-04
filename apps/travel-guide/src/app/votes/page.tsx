'use client';
import { useEffect, useState } from 'react';

type Vote = {
  id: string;
  title: string;
  options: string[];
  expiresAt: string;
  createdAt: string;
};

export default function VotesPage() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch('/api/votes').then(r => r.json()).then(d => setVotes(d.data || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <a href="/" className="text-green-500 text-sm">&larr; 首页</a>
            <h1 className="text-xl font-bold text-gray-900 mt-1">亲子投票</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600">
            {showForm ? '取消' : '发起投票'}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {showForm && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target as HTMLFormElement);
            await fetch('/api/votes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: fd.get('title'),
                options: [fd.get('opt1'), fd.get('opt2'), fd.get('opt3')].filter(Boolean),
                creatorId: 'seed-author-1',
              }),
            });
            setShowForm(false);
            const r = await fetch('/api/votes').then(r => r.json());
            setVotes(r.data || []);
          }} className="bg-white rounded-xl p-4 mb-6 space-y-3 shadow-sm">
            <input name="title" placeholder="投票标题" required className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input name="opt1" placeholder="选项1" required className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input name="opt2" placeholder="选项2" required className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input name="opt3" placeholder="选项3（可选）" className="w-full px-3 py-2 border rounded-lg text-sm" />
            <button type="submit" className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm">发布</button>
          </form>
        )}

        <div className="space-y-4">
          {votes.map(v => (
            <div key={v.id} className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3">{v.title}</h3>
              <div className="space-y-2">
                {v.options?.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 text-sm text-gray-700">
                    <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">{i + 1}</span>
                    {opt}
                  </div>
                ))}
              </div>
              {v.expiresAt && <p className="text-xs text-gray-400 mt-3">截止: {v.expiresAt?.slice(0, 10)}</p>}
            </div>
          ))}
          {votes.length === 0 && <p className="text-center py-10 text-gray-400">暂无投票</p>}
        </div>
      </div>
    </div>
  );
}
