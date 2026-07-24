// /profile/footprints — 足迹地图（占位，等 AMAP_API_KEY）
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { MapPinIcon, AlertIcon, CheckIcon } from '@/components/Icons';
import { getToken } from '@/lib/auth';

export default function FootprintsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; nickname: string; avatar: string | null } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login?redirect=/profile/footprints'); return; }
    fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUser(d?.data ?? d?.user ?? d))
      .catch(() => {});
  }, [router]);

  const steps = [
    { title: '申请高德地图 API Key', desc: '访问 lbs.amap.com 注册账号 → 应用管理 → 创建应用 → 申请 2 个 Key（Web 端 JS API + Web 服务 API）' },
    { title: '写入环境变量', desc: '在 apps/travel-guide/.env 第 16-17 行配置 AMAP_JS_KEY 和 AMAP_WEB_KEY' },
    { title: '上线足迹地图', desc: '开启交互式地图，记录孩子去过的每个地方，按「去过 / 想去 / 孩子想去」三态点亮' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ProfileSidebar user={user} counts={{ guides: 0, children: 0, sayings: 0, badges: 0 }} />
      <div className="space-y-4 min-w-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
            <MapPinIcon size={36} className="text-slate-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">足迹地图</h1>
          <p className="text-gray-500 mb-6">点亮孩子的每一次出发，按三态展示（去过 / 想去 / 孩子想去）</p>
          <span className="inline-block px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
            等待高德地图 API 配置
          </span>
        </div>

        {/* 申请进度 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <AlertIcon size={18} className="text-amber-500" /> 解锁步骤
          </h2>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{s.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <a
            href="https://lbs.amap.com/"
            target="_blank"
            rel="noopener"
            className="mt-5 inline-block px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold hover:shadow-md transition"
          >
            去高德开放平台 →
          </a>
        </div>
      </div>
    </div>
  );
}