// 个人中心 — 总览（/profile 主页 + layout 共享 Header）
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { HeartIcon, BabyIcon, MapPinIcon, GuidebookIcon, SparklesIcon, TrophyIcon } from '@/components/Icons';
import { getToken, authedFetch } from '@/lib/auth';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface ProfileData {
  user: { id: string; nickname: string; avatar: string | null };
  childSayingCount: number;
  galleryCount: number;
  guideCount: number;
  totalViews: number;
  totalLikes: number;
  badgeCount: number;
  childrenCount: number;
}

export default function ProfileOverview() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? getToken() : null;

  useEffect(() => {
    if (!token) { router.push('/login?redirect=/profile'); return; }
    authedFetch('/api/auth/me')
      .then(r => r.json())
      .then(async (userData) => {
        const user = userData?.data ?? userData?.user ?? userData;
        if (!user?.id) { router.push('/login?redirect=/profile'); return; }

        // 并行拉所有统计
        const [sayings, gallery, stats, badges, children] = await Promise.all([
          fetch(`${TRAVEL_API}/api/child-sayings?shareScope=public,private,community&limit=1`)
            .then(r => r.json().catch(() => ({ data: { items: [], total: 0 } }))),
          fetch(`${TRAVEL_API}/api/gallery?limit=1`)
            .then(r => r.json().catch(() => ({ data: { items: [], total: 0 } }))),
          authedFetch(`/api/user/travel-stats`, { userId: user.id })
            .then(r => r.json().catch(() => null)),
          authedFetch(`/api/user/travel-badges`, { userId: user.id })
            .then(r => r.json().catch(() => null)),
          authedFetch(`/api/user/children?userId=${user.id}`, { userId: user.id })
            .then(r => r.json().catch(() => null)),
        ]);

        const sayingCount = sayings?.data?.total ?? sayings?.data?.items?.length ?? 0;
        const galleryCount = gallery?.data?.total ?? gallery?.data?.items?.length ?? 0;
        const statData = stats?.data ?? stats ?? {};
        const badgeArr = badges?.data ?? [];
        const childArr = children?.data?.items ?? children?.items ?? [];

        setData({
          user,
          childSayingCount: sayingCount,
          galleryCount,
          guideCount: statData.guideCount ?? statData.publishedCount ?? 0,
          totalViews: statData.totalViews ?? 0,
          totalLikes: statData.totalLikes ?? 0,
          badgeCount: Array.isArray(badgeArr) ? badgeArr.length : 0,
          childrenCount: Array.isArray(childArr) ? childArr.length : 0,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router, token]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">加载中…</div>;
  if (!data) return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">请先登录</div>;

  const { user } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ProfileSidebar
        user={user}
        counts={{
          guides: data.guideCount,
          children: data.childrenCount,
          sayings: data.childSayingCount,
          badges: data.badgeCount,
        }}
      />

      <div className="space-y-6 min-w-0">
        {/* 数据看板 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <SparklesIcon size={18} className="text-blue-600" /> 我的数据
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={<GuidebookIcon size={16} className="text-blue-600" />} label="已发攻略" value={data.guideCount} />
            <StatCard icon={<BabyIcon size={16} className="text-amber-600" />} label="童言趣语" value={data.childSayingCount} />
            <StatCard icon={<HeartIcon size={16} className="text-pink-600" />} label="儿童画廊" value={data.galleryCount} />
            <StatCard icon={<TrophyIcon size={16} className="text-yellow-600" />} label="已获勋章" value={data.badgeCount} />
            <StatCard icon={<span className="text-blue-600">👁</span>} label="总浏览" value={data.totalViews} />
            <StatCard icon={<span className="text-pink-600">♥</span>} label="总点赞" value={data.totalLikes} />
          </div>
        </section>

        {/* 快捷入口 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">快捷入口</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/guides/create" className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 transition">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">+</span>
              <div>
                <p className="font-bold text-gray-900">发布新攻略</p>
                <p className="text-xs text-gray-500">分享你和孩子的旅行故事</p>
              </div>
            </Link>
            <Link href="/child-sayings" className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition">
              <BabyIcon size={20} className="text-amber-600" />
              <div>
                <p className="font-bold text-gray-900">记录童言趣语</p>
                <p className="text-xs text-gray-500">孩子的金句值得被记住</p>
              </div>
            </Link>
            <Link href="/gallery" className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 transition">
              <HeartIcon size={20} className="text-pink-600" />
              <div>
                <p className="font-bold text-gray-900">上传旅行照片</p>
                <p className="text-xs text-gray-500">孩子的旅行画廊</p>
              </div>
            </Link>
            <Link href="/places" className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 transition">
              <MapPinIcon size={20} className="text-emerald-600" />
              <div>
                <p className="font-bold text-gray-900">找亲子景点</p>
                <p className="text-xs text-gray-500">13 类亲子宝典</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1 text-xs text-gray-500">{icon}<span>{label}</span></div>
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
    </div>
  );
}