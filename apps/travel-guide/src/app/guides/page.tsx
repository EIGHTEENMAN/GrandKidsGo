'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Guide = { id: string; title: string; summary: string; destination: string; category: string; author: { nickname: string } };

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  useEffect(() => { fetch("/api/guides").then(r=>r.json()).then(d=>setGuides(d.data||[])).catch(()=>{}); }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">亲子攻略</h1>
          <Link href="/guides/create" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">发布攻略</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map(g => (
            <Link key={g.id} href={"/guides/"+g.id}>
              <article className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">{g.title}</h2>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{g.summary}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{g.author?.nickname||"匿名"}</span>
                  <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded">{g.category}</span>
                </div>
              </article>
            </Link>
          ))}
        </div>
        {guides.length === 0 && <p className="text-center py-20 text-gray-400">暂无攻略</p>}
      </div>
    </main>
  );
}
