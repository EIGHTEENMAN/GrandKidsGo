'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TipTapEditor from '@/components/TipTapEditor';

export default function CreateGuidePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '', destination: '', category: '', coverImage: '',
    ageRange: '', days: 0, childAges: '', contentHtml: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('haodaer_token');
    if (!token) { router.push('/login?redirect=/guides/create'); return; }
    fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.code === 'OK') setUser(d.data); else router.push('/login?redirect=/guides/create'); })
      .catch(() => router.push('/login?redirect=/guides/create'))
      .finally(() => setLoading(false));
  }, [router]);

  const updateSection = (i: number, field: string, value: any) => {
    const s = [...form.sections];
    (s[i] as any)[field] = value;
    setForm({ ...form, sections: s });
  };

  const addSection = () => setForm({ ...form, sections: [...form.sections, { title: '', content: '' }] });
  const removeSection = (i: number) => {
    if (form.sections.length > 1) setForm({ ...form, sections: form.sections.filter((_, idx) => idx !== i) });
  };

  const submit = async () => {
    if (!form.title || !form.destination) return alert('标题和目的地不能为空');
    if (!form.contentHtml) return alert('攻略内容不能为空');
    setSaving(true);
    try {
      const token = sessionStorage.getItem('grandkidsgo_token') || localStorage.getItem('haodaer_token');
      const res = await fetch('/api/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title,
          contentHtml: form.contentHtml,
          cityId: null, // P4 接 city 选择器
          days: form.days || undefined,
          childAges: form.childAges ? form.childAges.split(',').map(Number).filter(Boolean) : [],
          travelStyle: form.category || undefined,
          coverImages: form.coverImage ? [form.coverImage] : [],
          tags: [form.category, form.ageRange].filter(Boolean),
        }),
      });
      const d = await res.json();
      if (d.code === 'OK') router.push(`/guides/${d.data.id}`);
      else alert(d.message || '发布失败');
    } catch { alert('网络错误'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl font-extrabold mt-3">发布攻略</h1>
          <p className="text-blue-100 mt-1 text-sm">分享你的亲子旅行经验</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white" placeholder="如：带娃游三亚攻略" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目的地</label>
            <input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white" placeholder="如：三亚" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">旅行风格</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white">
              <option value="">选择风格</option>
              <option value="平衡">平衡</option>
              <option value="慢游">慢游</option>
              <option value="主题乐园">主题乐园</option>
              <option value="度假">度假</option>
              <option value="自然">自然</option>
              <option value="研学">研学</option>
              <option value="历史">历史</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">孩子年龄（逗号分隔）</label>
            <input value={form.childAges} onChange={e => setForm({ ...form, childAges: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white" placeholder="如：3,6" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">天数</label>
            <input type="number" value={form.days || ''} onChange={e => setForm({ ...form, days: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white" placeholder="如：5" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">攻略内容</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <TipTapEditor
              content={form.contentHtml}
              onChange={(html) => setForm({ ...form, contentHtml: html })}
              placeholder="写攻略正文..."
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => router.back()} className="px-6 py-3 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-full transition">取消</button>
          <button onClick={submit} disabled={saving}
            className="px-8 py-3 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:shadow-lg disabled:opacity-50 transition font-bold">
            {saving ? '发布中...' : '发布攻略'}
          </button>
        </div>
      </div>
    </main>
  );
}
