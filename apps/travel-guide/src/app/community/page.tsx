// 社区动态 - PC 端
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface Activity {
  id: string;
  type: string;
  userId: string;
  author: { id: string; nickname: string; avatar: string | null };
  targetId: string;
  content: { template: string; text: string; meta: Record<string, any> };
  createdAt: string;
}

const TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  badge_unlocked: { emoji: '🏅', label: '勋章解锁', color: 'amber' },
  guide_published: { emoji: '📝', label: '攻略发布', color: 'green' },
  trip_completed: { emoji: '✈️', label: '出行完成', color: 'blue' },
};

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

export default function CommunityPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const t = sessionStorage.getItem('grandkidsgo_token');
      if (t) headers.Authorization = `Bearer ${t}`;
    }
    fetch(`${TRAVEL_API}/api/feed/activities?scope=all`, { headers })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">👥 社区动态</h1>
          <p className="text-blue-100 mt-1">看真实妈妈的勋章 / 攻略 / 出行</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading && <div className="text-center py-12 text-gray-400">加载动态中…</div>}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-gray-500">还没有动态</div>
            <div className="text-sm text-gray-400 mt-2">妈妈完成一次出行 + 发布攻略，自动生成动态</div>
          </div>
        )}

        <div className="space-y-3">
          {items.map((a) => {
            const meta = TYPE_META[a.type] ?? { emoji: '✨', label: a.type, color: 'gray' };
            return (
              <article key={a.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xl flex-shrink-0">
                    {a.author.avatar ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={a.author.avatar} alt={a.author.nickname} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      a.author.nickname?.[0] ?? '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{a.author.nickname}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-${meta.color}-100 text-${meta.color}-700`}>
                        {meta.emoji} {meta.label}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(a.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-gray-700">{a.content.text}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
