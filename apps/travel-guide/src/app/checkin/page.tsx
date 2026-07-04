'use client';
import { useEffect, useState } from 'react';

type CheckIn = {
  id: string;
  location: string;
  note: string;
  lat: number;
  lng: number;
  createdAt: string;
  user: { nickname: string; avatar: string };
};

export default function CheckInPage() {
  useEffect(() => {
    const u = sessionStorage.getItem("haodaer_user");
    if (u) { try { setUser(JSON.parse(u)); } catch {} }
  }, []);
  const [user, setUser] = useState<any>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch('/api/checkins').then(r => r.json()).then(d => setCheckins(d.data || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <a href="/" className="text-green-500 text-sm">&larr; 首页</a>
            <h1 className="text-xl font-bold text-gray-900 mt-1">足迹地图</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
            {showForm ? '取消' : '打卡'}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {showForm && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target as HTMLFormElement);
            await fetch('/api/checkins', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: fd.get('location'),
                note: fd.get('note'),
                userId: user?.id || 'seed-author-1',
              }),
            });
            setShowForm(false);
            const r = await fetch('/api/checkins').then(r => r.json());
            setCheckins(r.data || []);
          }} className="bg-white rounded-xl p-4 mb-6 space-y-3 shadow-sm">
            <input name="location" placeholder="目的地" required className="w-full px-3 py-2 border rounded-lg text-sm" />
            <textarea name="note" placeholder="和孩子一起经历了什么..." className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
            <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">发布打卡</button>
          </form>
        )}

        <div className="space-y-4">
          {checkins.map(c => (
            <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm">📍</div>
                <span className="font-medium text-gray-800">{c.location}</span>
                <span className="text-xs text-gray-400 ml-auto">{c.createdAt?.slice(0, 10)}</span>
              </div>
              {c.note && <p className="text-sm text-gray-600">{c.note}</p>}
              <p className="text-xs text-gray-400 mt-2">{c.user?.nickname || '匿名'}</p>
            </div>
          ))}
          {checkins.length === 0 && <p className="text-center py-10 text-gray-400">还没有打卡记录</p>}
        </div>
      </div>
    </div>
  );
}
