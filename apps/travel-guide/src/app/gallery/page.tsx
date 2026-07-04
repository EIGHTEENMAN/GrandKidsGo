'use client';
import { useEffect, useState } from 'react';

type GalleryItem = {
  id: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
  user: { nickname: string; avatar: string };
};

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch('/api/gallery').then(r => r.json()).then(d => setItems(d.data || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <a href="/" className="text-green-500 text-sm">&larr; 首页</a>
            <h1 className="text-xl font-bold text-gray-900 mt-1">儿童画廊</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
            {showForm ? '取消' : '上传'}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {showForm && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target as HTMLFormElement);
            await fetch('/api/gallery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: fd.get('imageUrl'), caption: fd.get('caption'), userId: 'seed-author-1' }),
            });
            setShowForm(false);
            const r = await fetch('/api/gallery').then(r => r.json());
            setItems(r.data || []);
          }} className="bg-white rounded-xl p-4 mb-6 space-y-3 shadow-sm">
            <input name="imageUrl" placeholder="图片链接" required className="w-full px-3 py-2 border rounded-lg text-sm" />
            <textarea name="caption" placeholder="照片背后的故事..." className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
            <button type="submit" className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm">发布</button>
          </form>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="aspect-square bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center text-4xl">📸</div>
              <div className="p-3">
                {item.caption && <p className="text-sm text-gray-700 line-clamp-2">{item.caption}</p>}
                <p className="text-xs text-gray-400 mt-1">{item.user?.nickname || '匿名'}</p>
              </div>
            </div>
          ))}
        </div>
        {items.length === 0 && <p className="text-center py-10 text-gray-400">还没有照片</p>}
      </div>
    </div>
  );
}
