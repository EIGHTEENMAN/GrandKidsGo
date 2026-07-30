// /plan/[id]/edit — 计划轻量编辑（用户答复 2026-07-29：用户可以在生成的计划上进行修改）
//
// owner + status ∈ {draft, confirmed, active} 才允许编辑
// 可改：title / startDate / endDate / childAges / timelineBlocks（增删 block / 改 kidHook / 调 day 顺序）
// 不能改：cityId（换城市要重新跑 wizard）/ status 流转（自动按转换规则）

'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { authedFetch } from '@/lib/auth';
import { EditIcon, TrashIcon, PlusIcon, CheckIcon } from '@/components/Icons';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface TimelineBlock {
  blockId?: string;
  kind?: 'spot' | 'restaurant' | 'park' | 'playground' | 'hotel' | 'transit' | 'rest';
  startMinutes?: number;
  endMinutes?: number;
  title?: string;
  kidHook?: string;
  notes?: string;
  spotId?: string;
  cityId?: string;
}

interface TimelineDay {
  day?: number;
  cityId?: string;
  date?: string;
  theme?: string;
  blocks?: TimelineBlock[];
  kidFriendlySummary?: string;
}

interface PlanData {
  id: string;
  title: string | null;
  status: string;
  cityId: string | null;
  cityName: string | null;
  startDate: string;
  endDate: string;
  childAges: number[];
  travelStyle: string | null;
  timelineBlocks: TimelineDay[];
}

export default function PlanEditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>}>
      <PlanEditInner />
    </Suspense>
  );
}

function PlanEditInner() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [form, setForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    childAges: '' as string, // 逗号分隔字符串
    timelineBlocks: [] as TimelineDay[],
  });

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/plans/${id}`)
      .then(r => r.json())
      .then(d => {
        const p: PlanData | undefined = d?.data ?? d;
        if (!p?.id) { setError('计划不存在'); return; }
        if (!['draft', 'confirmed', 'active'].includes(p.status)) {
          setError(`当前状态 ${p.status} 不允许编辑`);
          return;
        }
        setPlan(p);
        setForm({
          title: p.title ?? '',
          startDate: p.startDate?.slice(0, 10) ?? '',
          endDate: p.endDate?.slice(0, 10) ?? '',
          childAges: (p.childAges ?? []).join(', '),
          timelineBlocks: p.timelineBlocks ?? [],
        });
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const childAges = form.childAges
        ? form.childAges.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n) && n >= 0 && n <= 240)
        : [];
      if (childAges.length === 0) {
        alert('请填写至少 1 个孩子年龄（0-240 月龄）');
        setSaving(false);
        return;
      }
      const r = await authedFetch(`/api/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          startDate: form.startDate,
          endDate: form.endDate,
          childAges,
          timelineBlocks: form.timelineBlocks,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { alert(d?.error?.message ?? '保存失败'); return; }
      alert('已保存');
      router.push(`/plan/${plan.id}`);
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (dayIndex: number) => {
    setForm(f => {
      const days = [...f.timelineBlocks];
      while (days.length <= dayIndex) {
        days.push({ day: days.length + 1, blocks: [], theme: `Day ${days.length + 1}` });
      }
      const blocks = days[dayIndex].blocks ?? [];
      const lastMinutes = blocks.length > 0
        ? (blocks[blocks.length - 1].endMinutes ?? blocks[blocks.length - 1].startMinutes ?? 540)
        : 540;
      days[dayIndex] = {
        ...days[dayIndex],
        blocks: [
          ...blocks,
          {
            blockId: `b${Date.now()}-${blocks.length}`,
            kind: 'spot',
            startMinutes: lastMinutes,
            endMinutes: lastMinutes + 60,
            title: '新景点',
            kidHook: '',
          },
        ],
      };
      return { ...f, timelineBlocks: days };
    });
  };

  const removeBlock = (dayIndex: number, blockIndex: number) => {
    setForm(f => {
      const days = [...f.timelineBlocks];
      const blocks = [...(days[dayIndex].blocks ?? [])];
      blocks.splice(blockIndex, 1);
      days[dayIndex] = { ...days[dayIndex], blocks };
      return { ...f, timelineBlocks: days };
    });
  };

  const updateBlock = (dayIndex: number, blockIndex: number, patch: Partial<TimelineBlock>) => {
    setForm(f => {
      const days = [...f.timelineBlocks];
      const blocks = [...(days[dayIndex].blocks ?? [])];
      blocks[blockIndex] = { ...blocks[blockIndex], ...patch };
      days[dayIndex] = { ...days[dayIndex], blocks };
      return { ...f, timelineBlocks: days };
    });
  };

  const removeDay = (dayIndex: number) => {
    if (!confirm('删除这一天？')) return;
    setForm(f => {
      const days = f.timelineBlocks.filter((_, i) => i !== dayIndex);
      return { ...f, timelineBlocks: days };
    });
  };

  const addDay = () => {
    setForm(f => {
      const newDay: TimelineDay = {
        day: f.timelineBlocks.length + 1,
        blocks: [],
        theme: `Day ${f.timelineBlocks.length + 1}`,
      };
      return { ...f, timelineBlocks: [...f.timelineBlocks, newDay] };
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-gray-500">{error}</div>;
  if (!plan) return null;

  const days = form.timelineBlocks;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href={`/plan/${plan.id}`} className="text-sm text-gray-500 hover:text-gray-900">← 返回</Link>
          <span className="flex-1" />
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold hover:shadow-md disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* 基本信息 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">基本信息</h2>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">标题</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="给这次出行起个标题"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">开始日期</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">结束日期</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">孩子月龄（逗号分隔）</label>
            <input
              type="text"
              value={form.childAges}
              onChange={e => setForm(f => ({ ...f, childAges: e.target.value }))}
              placeholder="例：36, 60"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </section>

        {/* 每日行程 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">每日行程</h2>
            <button
              onClick={addDay}
              className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 inline-flex items-center gap-1"
            >
              <PlusIcon size={12} /> 加一天
            </button>
          </div>
          {days.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              还没有时间表，点击右上角「加一天」开始编辑
            </div>
          ) : (
            <div className="space-y-4">
              {days.map((day, dayIdx) => (
                <div key={dayIdx} className="border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900 text-sm">Day {dayIdx + 1}</span>
                    <button
                      onClick={() => removeDay(dayIdx)}
                      className="text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-0.5"
                    >
                      <TrashIcon size={12} /> 删除
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(day.blocks ?? []).map((b, bIdx) => (
                      <div key={bIdx} className="bg-white rounded-lg p-3 space-y-2 border border-gray-100">
                        <div className="grid grid-cols-12 gap-2">
                          <input
                            type="number"
                            min={0}
                            max={1440}
                            value={b.startMinutes ?? ''}
                            onChange={e => updateBlock(dayIdx, bIdx, { startMinutes: parseInt(e.target.value, 10) || 0 })}
                            placeholder="开始(分钟)"
                            className="col-span-3 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                          />
                          <input
                            type="number"
                            min={0}
                            max={1440}
                            value={b.endMinutes ?? ''}
                            onChange={e => updateBlock(dayIdx, bIdx, { endMinutes: parseInt(e.target.value, 10) || 0 })}
                            placeholder="结束(分钟)"
                            className="col-span-3 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                          />
                          <select
                            value={b.kind ?? 'spot'}
                            onChange={e => updateBlock(dayIdx, bIdx, { kind: e.target.value as TimelineBlock['kind'] })}
                            className="col-span-3 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                          >
                            <option value="spot">🎯 景点</option>
                            <option value="restaurant">🍽️ 餐厅</option>
                            <option value="park">🌳 公园</option>
                            <option value="playground">🎠 游乐场</option>
                            <option value="hotel">🏨 酒店</option>
                            <option value="transit">🚄 交通</option>
                            <option value="rest">😴 休息</option>
                          </select>
                          <button
                            onClick={() => removeBlock(dayIdx, bIdx)}
                            className="col-span-3 text-xs text-red-500 hover:text-red-700 inline-flex items-center justify-center gap-0.5"
                          >
                            <TrashIcon size={12} /> 删除
                          </button>
                        </div>
                        <input
                          type="text"
                          value={b.title ?? ''}
                          onChange={e => updateBlock(dayIdx, bIdx, { title: e.target.value })}
                          placeholder="标题（如：动物园 + 海底世界）"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                        />
                        <input
                          type="text"
                          value={b.kidHook ?? ''}
                          onChange={e => updateBlock(dayIdx, bIdx, { kidHook: e.target.value })}
                          placeholder="👶 孩子专属看点（kidHook）"
                          className="w-full px-2 py-1.5 border border-blue-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 bg-blue-50/30"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => addBlock(dayIdx)}
                      className="w-full text-xs py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 inline-flex items-center justify-center gap-1"
                    >
                      <PlusIcon size={12} /> 加一个行程块
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 底部保存栏 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <button
            onClick={save}
            disabled={saving}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-bold hover:shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <CheckIcon size={16} />
            {saving ? '保存中…' : '保存修改'}
          </button>
          <p className="text-xs text-gray-400 mt-2">保存后会回到详情页</p>
        </div>
      </div>
    </main>
  );
}