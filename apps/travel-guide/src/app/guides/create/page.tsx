'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TipTapEditor from '@/components/TipTapEditor';
import { BabyIcon, CheckIcon } from '@/components/Icons';
import { getToken, authedFetch } from '@/lib/auth';

export default function CreateGuidePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [spots, setSpots] = useState<Array<{ id: string; name: string; cityId: string }>>([]);
  const [form, setForm] = useState({
    title: '', destination: '', category: '', coverImage: '',
    ageRange: '', days: 0, childAges: '', contentHtml: '',
    cityId: '', spotId: '',
  });
  const [saving, setSaving] = useState(false);
  const [childSayings, setChildSayings] = useState<Array<{ text: string; mood: string }>>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login?redirect=/guides/create'); return; }
    fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.code === 'OK') setUser(d.data); else router.push('/login?redirect=/guides/create'); })
      .catch(() => router.push('/login?redirect=/guides/create'))
      .finally(() => setLoading(false));
  }, [router]);

  // 加载城市 + 景点列表
  useEffect(() => {
    fetch('/api/cities').then(r => r.json()).then(d => setCities(d.data?.items ?? d.cities ?? d.data ?? [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (!form.cityId) { setSpots([]); return; }
    fetch(`/api/places?cityId=${form.cityId}`).then(r => r.json()).then(d => setSpots(d.data?.items ?? d.items ?? [])).catch(() => {});
  }, [form.cityId]);

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
    if (!form.title || !form.cityId) return alert('标题和目的地不能为空');
    if (!form.contentHtml) return alert('攻略内容不能为空');
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch('/api/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title,
          contentHtml: form.contentHtml,
          cityId: form.cityId || null,
          spotId: form.spotId || null,
          days: form.days || undefined,
          childAges: form.childAges ? form.childAges.split(',').map(Number).filter(Boolean) : [],
          travelStyle: form.category || undefined,
          coverImages: form.coverImage ? [form.coverImage] : [],
          tags: [form.category, form.ageRange].filter(Boolean),
          // 同时提交孩子说记录（绑定 spotId 自动关联地点页面）
          childSayings: childSayings.filter(s => s.text.trim()).map(s => ({
            text: s.text.trim(),
            mood: s.mood || null,
            spotId: form.spotId || null,
          })),
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
            <label className="block text-sm font-medium text-gray-700 mb-1">目的地（城市）</label>
            <select value={form.cityId} onChange={e => setForm({ ...form, cityId: e.target.value, spotId: '' })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500">
              <option value="">选择城市（必填）</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联景点（可选，关联后孩子说会显示在该地点页面）</label>
            <select value={form.spotId} onChange={e => setForm({ ...form, spotId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500">
              <option value="">不关联</option>
              {spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
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

        {/* ============ 孩子说记录区 — 同时提交攻略和孩子说 ============ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1 inline-flex items-center gap-2">
            <BabyIcon size={18} className="text-pink-500" /> 孩子说
          </h2>
          <p className="text-xs text-gray-500 mb-4">记录旅行中孩子的童言趣语 · 提交攻略时会同时保存</p>

          {/* 孩子说记录列表（在正文编辑下方添加） */}
          <div className="space-y-3 mb-4">
            {childSayings.map((s, i) => (
              <div key={i} className="flex items-start gap-3 bg-pink-50 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <textarea value={s.text} onChange={e => {
                    const next = [...childSayings];
                    next[i].text = e.target.value;
                    setChildSayings(next);
                  }}
                    className="w-full bg-transparent border-0 focus:outline-none resize-none text-sm font-medium text-gray-900"
                    rows={1} placeholder="输入孩子说的话..." />
                  <div className="flex items-center gap-2 mt-1">
                    {['开心', '困惑', '惊讶', '生气', '困了'].map(m => (
                      <button key={m} onClick={() => {
                        const next = [...childSayings];
                        next[i].mood = next[i].mood === m ? '' : m;
                        setChildSayings(next);
                      }}
                        className={`px-2 py-0.5 rounded-full text-xs border transition ${s.mood === m ? 'bg-pink-100 border-pink-300 text-pink-700' : 'bg-white border-gray-200 text-gray-500 hover:border-pink-200'}`}>
                        {m}
                      </button>
                    ))}
                    <button onClick={async () => {
                      if (!navigator.mediaDevices?.getUserMedia) {
                        alert('当前浏览器不支持录音功能，建议使用 Chrome');
                        return;
                      }
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const mediaRecorder = new MediaRecorder(stream);
                        const chunks: Blob[] = [];
                        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
                        mediaRecorder.onstop = () => {
                          const blob = new Blob(chunks, { type: 'audio/webm' });
                          const url = URL.createObjectURL(blob);
                          // 临时提示转文字（P2 接语音识别后自动填充 text）
                          const text = prompt('录音完成，请输入识别结果（或手动填写）:', '');
                          if (text && text.trim()) {
                            const next = [...childSayings];
                            next[i].text = text.trim();
                            setChildSayings(next);
                          }
                          stream.getTracks().forEach(t => t.stop());
                        };
                        mediaRecorder.start();
                        alert('录音中…点击确定结束录音');
                        setTimeout(() => {
                          if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                          }
                        }, 30000);
                      } catch {
                        alert('录音权限被拒绝，请在浏览器设置中允许麦克风');
                      }
                    }} className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded-full">
                      <span>🎤</span> 录音
                    </button>
                  </div>
                </div>
                <button onClick={() => setChildSayings(childSayings.filter((_, idx) => idx !== i))}
                  className="text-gray-400 hover:text-red-500 text-sm flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
          <button onClick={() => setChildSayings([...childSayings, { text: '', mood: '' }])}
            className="text-sm text-pink-600 hover:text-pink-700 font-medium">
            + 添加一句
          </button>
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
