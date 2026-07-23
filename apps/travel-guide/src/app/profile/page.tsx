// 个人中心 — 走天下 PC 端（v1.0）
// 用户功能入口：儿童画廊 | 孩子说 | 足迹地图（等 key）
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartIcon, UserIcon, MapPinIcon, BabyIcon, StarIcon, SparklesIcon, GuidebookIcon } from '@/components/Icons';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface ProfileData {
  user: { id: string; nickname: string; avatar: string | null };
  childSayingCount: number;
  galleryCount: number;
  guideCount: number;
  totalViews: number;
  totalLikes: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('grandkidsgo_token') || localStorage.getItem('haodaer_token')
    : null;

  useEffect(() => {
    if (!token) { router.push('/login?redirect=/profile'); return; }
    // 同时查用户信息 + 统计数据
    Promise.all([
      fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${TRAVEL_API}/api/child-sayings`).then(r => r.json()).catch(() => ({ data: { items: [] } })),
      fetch(`${TRAVEL_API}/api/gallery`).then(r => r.json()).catch(() => ({ data: { items: [] } })),
    ])
      .then(([userData, sayingData, galleryData]) => {
        const user = userData.data ?? userData;
        const sayingCount = sayingData.data?.items?.length ?? 0;
        const galleryCount = galleryData.data?.items?.length ?? 0;
        setData({ user, childSayingCount: sayingCount, galleryCount, guideCount: 0, totalViews: 0, totalLikes: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router, token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-gray-500">请先登录</div>;

  const { user } = data;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <div className="mt-6 flex items-center gap-5">
            <span className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/30 flex-shrink-0">
              {(user.nickname || user.username)?.[0] ?? '?'}
            </span>
            <div>
              <h1 className="text-3xl font-extrabold">我的</h1>
              <p className="text-blue-100 text-sm mt-1">{user.nickname || user.username || '走天下用户'}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 功能入口卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* 儿童画廊 */}
          <Link href="/gallery" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition group">
            <div className="flex items-center gap-4 mb-3">
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-md">
                <HeartIcon size={22} className="text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate group-hover:text-pink-600 transition">儿童画廊</h3>
                <p className="text-xs text-gray-500">{data.galleryCount} 张照片</p>
              </div>
              <span className="text-gray-300 group-hover:text-pink-400 transition">→</span>
            </div>
            <p className="text-sm text-gray-600">孩子旅行中拍下的照片</p>
          </Link>

          {/* 孩子说 */}
          <Link href="/child-sayings" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition group">
            <div className="flex items-center gap-4 mb-3">
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <BabyIcon size={22} className="text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate group-hover:text-amber-600 transition">孩子说</h3>
                <p className="text-xs text-gray-500">{data.childSayingCount} 条语录</p>
              </div>
              <span className="text-gray-300 group-hover:text-amber-400 transition">→</span>
            </div>
            <p className="text-sm text-gray-600">记录孩子的童言趣语</p>
          </Link>

          {/* 足迹地图（阻塞于 AMAP_API_KEY） */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-4 mb-3">
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-md">
                <MapPinIcon size={22} className="text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-500 truncate">足迹地图</h3>
                <p className="text-xs text-gray-400">即将上线</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">收集孩子的旅行足迹（等待 AMAP 地图配置）</p>
          </div>
        </div>

        {/* 攻略统计 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <GuidebookIcon size={18} className="text-blue-600" /> 我的攻略
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-extrabold text-blue-600">{data.guideCount}</div>
              <div className="text-xs text-gray-500 mt-1">发布攻略</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-blue-600">{data.totalViews}</div>
              <div className="text-xs text-gray-500 mt-1">浏览</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-pink-600">{data.totalLikes}</div>
              <div className="text-xs text-gray-500 mt-1">点赞</div>
            </div>
            <div>
              <Link href="/guides/create" className="inline-block mt-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-xs font-bold hover:shadow-md transition">
                发布新攻略
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}