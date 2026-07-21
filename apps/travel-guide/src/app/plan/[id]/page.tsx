// Plan 详情页（fork 后跳转到这里）
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

export default function PlanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/plans/${id}`)
      .then((r) => r.json())
      .then((d) => setPlan(d.data ?? d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中…</div>;
  if (!plan) return <div className="min-h-screen flex items-center justify-center">计划不存在</div>;

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/" className="text-green-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl font-extrabold mt-2">✈️ {plan.title ?? '我的出行计划'}</h1>
          <p className="text-green-100 mt-1">
            {plan.city?.name ?? ''} · {plan.startDate?.slice(0, 10)} → {plan.endDate?.slice(0, 10)} · 状态：{plan.status}
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">计划已创建</h2>
          <p className="text-gray-600 mb-6">
            基于攻略数据创建的草案，可在移动端童慧行 APP → 走天下 tab 中继续编辑
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/guides"
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200"
            >
              ← 返回攻略列表
            </Link>
            <Link
              href="/"
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full text-sm font-bold hover:shadow-md"
            >
              🏠 回首页
            </Link>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mt-6 text-sm text-amber-900">
          💡 <strong>移动端体验更完整</strong>：童慧行 APP 内可编辑计划时间表、加景点、写笔记、记录孩子真实感受。
        </div>
      </div>
    </main>
  );
}
