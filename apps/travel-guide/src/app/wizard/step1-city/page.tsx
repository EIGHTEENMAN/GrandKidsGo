// Wizard 步骤 1 — 选城市（PC 端）
'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface City {
  id: string;
  name: string;
  province: string | null;
  kidHook: string | null;
  coverImage: string | null;
}

const CHILD_AGE_LABEL: Record<number, string> = {
  12: '1 岁', 24: '2 岁', 36: '3 岁', 48: '4 岁',
  60: '5 岁', 72: '6 岁', 96: '8 岁',
};

const STYLE_LABEL: Record<string, string> = {
  time_saver: '省时',
  money_saver: '省钱',
  balanced: '平衡',
  comfort: '舒服',
};

// useSearchParams() 必须包一层 Suspense 才不会被 build 期 prerender 卡住
export default function WizardStep1Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gradient-to-b from-blue-50 to-white" />}>
      <WizardStep1 />
    </Suspense>
  );
}

function WizardStep1() {
  const searchParams = useSearchParams();
  const incomingCityName = searchParams.get('cityName') ?? '';
  const incomingDays = searchParams.get('days') ?? '';
  const incomingChildMonths = searchParams.get('childAgeMonths') ?? '';
  const incomingStyle = searchParams.get('travelStyle') ?? '';

  const [cities, setCities] = useState<City[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/cities`)
      .then((r) => r.json())
      .then((d) => {
        const list: City[] = d.cities ?? [];
        setCities(list);
        // 从 URL 预填：当 wizard 跳来带 cityName 时，自动选中对应城市
        if (incomingCityName) {
          const found = list.find((c) => c.name === incomingCityName);
          if (found) setSelected(found.id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [incomingCityName]);

  const showPrefillBanner = !!(incomingCityName || incomingDays || incomingStyle);
  const childLabel = incomingChildMonths ? CHILD_AGE_LABEL[Number(incomingChildMonths)] ?? `${Math.floor(Number(incomingChildMonths) / 12)} 岁` : '';
  const styleLabel = STYLE_LABEL[incomingStyle] ?? '';

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
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

      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-gray-600 mb-6">先选一个城市，再告诉走天下您孩子的月龄。</p>

        {showPrefillBanner && (
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-900">
            <div className="font-bold mb-1">📌 您之前选的偏好</div>
            <div className="text-blue-700">
              {incomingCityName && <>城市 · <span className="font-medium">{incomingCityName}</span>　</>}
              {incomingDays && <>天数 · <span className="font-medium">{incomingDays} 天</span>　</>}
              {childLabel && <>孩子 · <span className="font-medium">{childLabel}</span>　</>}
              {styleLabel && <>风格 · <span className="font-medium">{styleLabel}</span></>}
            </div>
          </div>
        )}

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
