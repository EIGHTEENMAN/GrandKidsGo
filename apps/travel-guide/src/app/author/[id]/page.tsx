// 作者主页 — 攻略作者
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SpanIcon, UserIcon, EyeIcon, HeartIcon, ClockIcon, MapPinIcon, GuidebookIcon } from '@/components/Icons';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

const HERO_POOL = [
  'photo-1602002418082-a4443e081dd1', 'photo-1511895426328-dc8714191300',
  'photo-1502086223501-7ea6ecd79368', 'photo-1559131397-f94da358f7ca',
  'photo-1545569310-c55b3c63b8c2',
];

interface AuthorGuide {
  id: string; title: string; coverImage: string | null; viewCount: number; likeCount: number;
  days: number | null; travelStyle: string | null; cityName: string | null; publishedAt: string | null;
}

interface AuthorData {
  author: { id: string; nickname: string; guideCount: number; totalViews: number; totalLikes: number };
  guides: AuthorGuide[];
}

export default function AuthorPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<AuthorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/author/${id}`)
      .then(r => r.json())
      .then(d => { if (d.code === 'OK') setData(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-gray-500">作者不存在</div>;

  const { author, guides } = data;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <div className="mt-6 flex items-center gap-5">
            <span className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/30 flex-shrink-0">
              {author.nickname[0] ?? '?'}
            </span>
            <div>
              <h1 className="text-3xl font-extrabold">{author.nickname}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-blue-100 text-sm">
                <span>{author.guideCount} 篇攻略</span>
                <span>·</span>
                <span>{author.totalViews} 次浏览</span>
                <span>·</span>
                <span>{author.totalLikes} 次点赞</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 inline-flex items-center gap-2">
          <GuidebookIcon size={22} className="text-blue-600" /> 发布的攻略
        </h2>

        {guides.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200 text-gray-500">
            还没有发布过攻略
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guides.map(g => (
            <Link key={g.id} href={`/guides/${g.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition border border-gray-100 group">
              <div className="h-44 bg-gradient-to-br from-blue-100 to-cyan-100 overflow-hidden relative">
                {g.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.coverImage} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPinIcon size={48} className="text-blue-300" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 line-clamp-2 mb-2">{g.title}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {g.days && <span className="inline-flex items-center gap-1"><ClockIcon size={11} />{g.days} 天</span>}
                  {g.cityName && <span className="inline-flex items-center gap-1"><MapPinIcon size={11} />{g.cityName}</span>}
                  <span className="inline-flex items-center gap-1"><EyeIcon size={11} />{g.viewCount}</span>
                  <span className="inline-flex items-center gap-1"><HeartIcon size={11} className="text-pink-500" />{g.likeCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}