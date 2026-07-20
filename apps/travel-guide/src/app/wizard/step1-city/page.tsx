// Wizard 步骤 1 — 选城市（PC 端）
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface City {
  id: string;
  name: string;
  province: string | null;
  kidHook: string | null;
  coverImage: string | null;
}

export default function WizardStep1() {
  const [cities, setCities] = useState<City[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/cities`)
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/wizard" className="text-blue-100 text-sm hover:text-white">← 返回</Link>
          <h1 className="text-2xl md:text-3xl font-extrabold mt-2">第 1 步 · 选城市</h1>
          <div className="flex gap-2 mt-3">
            <div className="w-8 h-1 bg-white rounded-full" />
            <div className="w-8 h-1 bg-white/30 rounded-full" />
            <div className="w-8 h-1 bg-white/30 rounded-full" />
            <div className="w-8 h-1 bg-white/30 rounded-full" />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-gray-600 mb-6">先选一个城市，再告诉走天下你的孩子多大了。</p>

        {loading && <div className="text-center py-12 text-gray-400">加载城市中…</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {cities.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`text-left bg-white rounded-2xl p-6 transition shadow-sm hover:shadow-md border-2 ${
                selected === c.id ? 'border-blue-500 ring-4 ring-blue-100' : 'border-transparent'
              }`}
            >
              <div className="text-3xl mb-2">🏙️</div>
              <div className="text-lg font-bold text-gray-900">{c.name}</div>
              {c.province && <div className="text-xs text-gray-500 mt-0.5">{c.province}</div>}
              {c.kidHook && <div className="text-sm text-gray-600 mt-2 line-clamp-2">{c.kidHook}</div>}
            </button>
          ))}
        </div>

        <div className="text-center">
          <Link
            href={selected ? `/wizard/step2-basic?cityId=${selected}` : '#'}
            className={`inline-block px-10 py-4 rounded-full font-bold text-lg shadow-lg transition ${
              selected
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            下一步：基本信息 →
          </Link>
        </div>
      </div>
    </main>
  );
}
