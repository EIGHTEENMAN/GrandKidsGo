'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TipTapEditor from '@/components/TipTapEditor';

export default function CreateGuidePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '', summary: '', destination: '', category: '', coverImage: '',
    ageRange: '', days: 0, budget: 0, sections: [{ title: '', content: '' }],
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
    setSaving(true);
    try {
      const token = localStorage.getItem('haodaer_token');
      const res = await fetch('/api/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, authorId: user.id, days: form.days || undefined, budget: form.budget || undefined }),
      });
      const d = await res.json();
      if (d.code === 'OK') router.push(`/guides/${d.data.id}`);
      else alert(d.message || '发布失败');
    } catch { alert('网络错误'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">发布攻略</h1>
          <div className="flex gap-3">
            <button onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
            <button onClick={submit} disabled={saving}
              className="px-6 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              {saving ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="如：带娃游三亚攻略" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目的地 *</label>
            <input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="如：三亚" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">摘要</label>
            <textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" rows={2} placeholder="简短描述这篇攻略" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">选择分类</option>
              <option value="海滨度假">海滨度假</option>
              <option value="城市探索">城市探索</option>
              <option value="自然风光">自然风光</option>
              <option value="主题乐园">主题乐园</option>
              <option value="文化历史">文化历史</option>
              <option value="乡村田园">乡村田园</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">适合年龄</label>
            <input value={form.ageRange} onChange={e => setForm({ ...form, ageRange: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="如：3-6岁" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">天数</label>
            <input type="number" value={form.days || ''} onChange={e => setForm({ ...form, days: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="如：5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预算(元)</label>
            <input type="number" value={form.budget || ''} onChange={e => setForm({ ...form, budget: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="如：5000" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">攻略内容</h2>
            <button onClick={addSection} className="text-sm text-green-600 hover:text-green-800">+ 添加段落</button>
          </div>
          <div className="space-y-6">
            {form.sections.map((sec, i) => (
              <div key={i} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <input value={sec.title} onChange={e => updateSection(i, 'title', e.target.value)}
                    className="flex-1 text-base font-medium border-none focus:outline-none focus:ring-0 placeholder-gray-400"
                    placeholder={`段落 ${i + 1} 标题（可选）`} />
                  {form.sections.length > 1 && (
                    <button onClick={() => removeSection(i)} className="text-red-400 hover:text-red-600 text-sm ml-2">删除</button>
                  )}
                </div>
                <TipTapEditor
                  content={sec.content}
                  onChange={(html) => updateSection(i, 'content', html)}
                  placeholder={`开始写第 ${i + 1} 段的内容...`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
