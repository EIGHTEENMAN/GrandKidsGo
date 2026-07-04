'use client';
import { useEffect, useState } from 'react';

type KidSay = {
  id: string;
  content: string;
  age: number;
  createdAt: string;
  user: { nickname: string; avatar: string };
};

export default function KidSayPage() {
  const [items, setItems] = useState<KidSay[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch('/api/kidsays').then(r => r.json()).then(d => setItems(d.data || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <a href="/" className="text-green-500 text-sm">&larr; 首页</a>
            <h1 className="text-xl font-bold text-gray-900 mt-1">孩子说</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-orange-400 text-white rounded-lg text-sm hover:bg-orange-500">
            {showForm ? '取消' : '记录'}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {showForm && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target as HTMLFormElement);
            await fetch('/api/kidsays', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: fd.get('content'), age: parseInt(fd.get('age') as string) || null, userId: 'seed-author-1' }),
            });
            setShowForm(false);
            const r = await fetch('/api/kidsays').then(r => r.json());
            setItems(r.data || []);
          }} className="bg-white rounded-xl p-4 mb-6 space-y-3 shadow-sm">
            <textarea name="content" placeholder="孩子说了什么有趣的话..." required className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
            <div className="flex gap-3">
              <input name="age" placeholder="年龄" type="number" className="w-24 px-3 py-2 border rounded-lg text-sm" />
              <button type="submit" className="px-4 py-2 bg-orange-400 text-white rounded-lg text-sm">记录</button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {items.map(s => (
            <div key={s.id} className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-gray-800 leading-relaxed">&ldquo;{s.content}&rdquo;</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                <span>{s.user?.nickname || '匿名'}</span>
                {s.age && <span className="bg-orange-50 text-orange-500 px-2 py-0.5 rounded">{s.age}岁</span>}
                <span className="ml-auto">{s.createdAt?.slice(0, 10)}</span>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-center py-10 text-gray-400">还没有童言稚语</p>}
        </div>
      </div>
    </div>
  );
}
