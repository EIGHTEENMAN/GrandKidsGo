// /plan/[id]/feeling — 出行后感受打分（用户答复 2026-07-29：评价打分闭环）
// 2026-07-31 v1.0 Phase B：5 维度 + 4 新字段（孩子视角 + 父母视角 + 哭闹触发器）
//   - physicalState（满电 / 正常 / 略疲 / 累趴）
//   - emotionalPeak（兴奋 / 平静 / 无聊 / 烦躁 / 哭闹）
//   - stayDurationMinutes（实际停留分钟）
//   - willingnessToReturn（要求再来 / 可再来 / 不愿再来）
//   - cryTriggers（9 标准触发器 tag 多选）
//   - favoriteMoment（孩子最开心的瞬间，可选文本）
//   - wishToReturn（孩子想不想再来）
//   - parentJoy（父母满足度）
// 写完后跳回 /plan/[id] 并展示"评分已沉淀为攻略素材"

'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CheckIcon, SparklesIcon, PlanIcon, BabyIcon } from '@/components/Icons';
import { authedFetch } from '@/lib/auth';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface PlanLite {
  id: string;
  title: string | null;
  status: string;
  childAges: number[];
  timelineBlocks?: Array<{ day?: number; blocks?: Array<{ blockId?: string; title?: string; spotId?: string; kidHook?: string; startMinutes?: number; endMinutes?: number }> }>;
}

interface BlockFeeling {
  blockId: string;
  title: string;
  spotId?: string;
  startMinutes?: number;
  endMinutes?: number;
  // 5 维度（v1.5）
  physicalState: string;
  emotionalPeak: string;
  stayDurationMinutes: number;
  willingnessToReturn: string;
  cryEpisodes: number;
  // 2026-07-31 v1.0 Phase B：4 新字段
  cryTriggers: string[];       // 9 标准词典多选（每个 block 单独存）
  favoriteMoment: string;      // 孩子最开心的瞬间
  wishToReturn: string;        // 孩子想不想再来：想/不想/看情况
  parentJoy: string;           // 父母满足度：满足/轻松/疲惫/焦虑/享受
}

const PHYSICAL_OPTIONS = ['满电', '正常', '略疲', '累趴'] as const;
const EMOTION_OPTIONS = ['兴奋', '平静', '无聊', '烦躁', '哭闹'] as const;
const RETURN_OPTIONS = ['要求再来', '可再来', '不愿再来'] as const;
const WISH_OPTIONS = ['想再来', '不想再来', '看情况'] as const;
const PARENT_JOY_OPTIONS = ['满足', '轻松', '享受', '疲惫', '焦虑'] as const;
// 9 标准 cryTriggers 词典（详见 项目建设方案/亲子宝典数据闭环-v1.0.md §2.1）
const CRY_TRIGGER_OPTIONS = [
  { value: 'hungry', label: '饿了' },
  { value: 'sleepy', label: '困了' },
  { value: 'crowded', label: '人多' },
  { value: 'queueing', label: '排队' },
  { value: 'loud', label: '怕大声' },
  { value: 'dark', label: '怕黑' },
  { value: 'animal', label: '怕动物' },
  { value: 'height', label: '怕高' },
  { value: 'uncomfortable', label: '不舒服' },
] as const;

export default function PlanFeelingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>}>
      <PlanFeelingInner />
    </Suspense>
  );
}

function PlanFeelingInner() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const [plan, setPlan] = useState<PlanLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feelings, setFeelings] = useState<BlockFeeling[]>([]);

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/plans/${planId}`)
      .then(r => r.json().catch(() => null))
      .then(d => {
        const p = d?.data ?? d;
        if (!p?.id) { setError('计划不存在'); return; }
        setPlan(p);
        // 提取所有 spot block（kidHook 可评分的）
        const days = Array.isArray(p.timelineBlocks) ? p.timelineBlocks : [];
        const list: BlockFeeling[] = [];
        for (const day of days) {
          for (const b of day.blocks ?? []) {
            if (b.spotId || b.kidHook) {
              list.push({
                blockId: b.blockId ?? `b${Math.random()}`,
                title: b.title ?? '未命名',
                spotId: b.spotId,
                startMinutes: b.startMinutes,
                endMinutes: b.endMinutes,
                physicalState: '正常',
                emotionalPeak: '兴奋',
                stayDurationMinutes: Math.max(0, (b.endMinutes ?? 0) - (b.startMinutes ?? 0)),
                willingnessToReturn: '要求再来',
                cryEpisodes: 0,
                // 2026-07-31 v1.0 Phase B
                cryTriggers: [],
                favoriteMoment: '',
                wishToReturn: '',
                parentJoy: '',
              });
            }
          }
        }
        setFeelings(list);
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [planId]);

  const updateFeeling = (idx: number, patch: Partial<BlockFeeling>) => {
    setFeelings(f => f.map((b, i) => i === idx ? { ...b, ...patch } : b));
  };

  const submit = async () => {
    if (!plan || feelings.length === 0) {
      alert('没有可评分的景点');
      return;
    }
    setSaving(true);
    try {
      // 取 plan 的第一个 childAge 作为 childAgeAtVisit
      const childAgeAtVisit = plan.childAges?.[0] ?? null;
      // 串行提交每条评分
      let ok = 0, fail = 0;
      for (const f of feelings) {
        // cryTriggers 数组：仅在选过 trigger 时才提交
        const cryTriggersPayload = f.cryTriggers.length > 0
          ? f.cryTriggers.map(t => ({ trigger: t, atMinutes: 0, durationSeconds: 0 }))
          : [];
        const r = await authedFetch(`/api/plans/${plan.id}/ratings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spotId: f.spotId ?? null,
            blockId: f.blockId,
            physicalState: f.physicalState,
            emotionalPeak: f.emotionalPeak,
            stayDurationMinutes: f.stayDurationMinutes,
            willingnessToReturn: f.willingnessToReturn,
            cryEpisodes: f.cryEpisodes > 0
              ? [{ atMinutes: 0, durationSeconds: f.cryEpisodes * 60 }]
              : [],
            childAgeAtVisit,
            // 2026-07-31 v1.0 Phase B
            cryTriggers: cryTriggersPayload.length > 0 ? cryTriggersPayload : null,
            favoriteMoment: f.favoriteMoment.trim() || null,
            wishToReturn: f.wishToReturn || null,
            parentJoy: f.parentJoy || null,
          }),
        });
        if (r.ok) ok++; else fail++;
      }
      alert(`评分完成：${ok} 条成功${fail ? `，${fail} 条失败` : ''}`);
      router.push(`/plan/${plan.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-gray-500">{error}</div>;
  if (!plan) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32">
      <header className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href={`/plan/${plan.id}`} className="text-pink-100 text-sm hover:text-white">← 返回计划</Link>
          <div className="flex items-center gap-3 mt-2">
            <SparklesIcon size={28} />
            <h1 className="text-2xl md:text-3xl font-extrabold flex-1">出行后感受</h1>
          </div>
          <p className="text-pink-100 mt-2 text-sm leading-relaxed">
            行程结束了吧？给我们 9 维度的真实反馈（5 维度 + 4 个新维度），沉淀为攻略素材，下次出行更顺手
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-5">
        {feelings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
            <BabyIcon size={36} className="mx-auto text-gray-300 mb-3" />
            <p>这次计划没有可评分的景点</p>
            <p className="text-sm text-gray-400 mt-1">（plan 里的 block 没有 spotId 或 kidHook）</p>
          </div>
        ) : (
          feelings.map((f, idx) => (
            <div key={f.blockId} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-base flex-1">{f.title}</h3>
                {f.spotId && (
                  <Link
                    href={`/place/spot/${f.spotId}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    查看景点 →
                  </Link>
                )}
              </div>
              <div className="space-y-3">
                <RadioRow
                  label="🟢 体力状态"
                  options={[...PHYSICAL_OPTIONS]}
                  value={f.physicalState}
                  onChange={v => updateFeeling(idx, { physicalState: v })}
                />
                <RadioRow
                  label="😊 情绪峰值"
                  options={[...EMOTION_OPTIONS]}
                  value={f.emotionalPeak}
                  onChange={v => updateFeeling(idx, { emotionalPeak: v })}
                />
                <RadioRow
                  label="🔄 重游意愿（家长）"
                  options={[...RETURN_OPTIONS]}
                  value={f.willingnessToReturn}
                  onChange={v => updateFeeling(idx, { willingnessToReturn: v })}
                />
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">⏱ 实际停留（分钟）</label>
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    value={f.stayDurationMinutes}
                    onChange={e => updateFeeling(idx, { stayDurationMinutes: parseInt(e.target.value, 10) || 0 })}
                    className="w-32 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">😢 哭闹次数</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={f.cryEpisodes}
                    onChange={e => updateFeeling(idx, { cryEpisodes: parseInt(e.target.value, 10) || 0 })}
                    className="w-24 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                {/* 2026-07-31 v1.0 Phase B：哭闹触发器 tag 多选 */}
                <div>
                  <label className="text-xs text-gray-600 mb-1.5 block">😢 哭闹原因（多选，选过次数&gt;0 才填）</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CRY_TRIGGER_OPTIONS.map(opt => {
                      const selected = f.cryTriggers.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? f.cryTriggers.filter(v => v !== opt.value)
                              : [...f.cryTriggers, opt.value];
                            updateFeeling(idx, { cryTriggers: next });
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full transition ${
                            selected
                              ? 'bg-orange-100 text-orange-700 border border-orange-300 font-medium'
                              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-orange-200'
                          }`}
                        >
                          {selected ? '✓ ' : ''}{opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* 2026-07-31 v1.0 Phase B：孩子最开心的瞬间 */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">🎉 孩子最开心的瞬间（选填）</label>
                  <input
                    type="text"
                    value={f.favoriteMoment}
                    onChange={e => updateFeeling(idx, { favoriteMoment: e.target.value })}
                    maxLength={100}
                    placeholder="如：看见海豚跳跃、喂了小兔子"
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                {/* 2026-07-31 v1.0 Phase B：孩子想不想再来 */}
                <RadioRow
                  label="👶 孩子想不想再来"
                  options={[...WISH_OPTIONS]}
                  value={f.wishToReturn}
                  onChange={v => updateFeeling(idx, { wishToReturn: v })}
                />
                {/* 2026-07-31 v1.0 Phase B：父母满足度 */}
                <RadioRow
                  label="💝 父母自己的感受"
                  options={[...PARENT_JOY_OPTIONS]}
                  value={f.parentJoy}
                  onChange={v => updateFeeling(idx, { parentJoy: v })}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部提交栏 */}
      {feelings.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
            <span className="flex-1 text-xs text-gray-500">
              完成后这份评分将作为攻略的"孩子真实感受"素材
            </span>
            <button
              onClick={submit}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full text-sm font-bold hover:shadow-md disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <CheckIcon size={16} />
              {saving ? '提交中…' : `提交 ${feelings.length} 条评分`}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function RadioRow({
  label, options, value, onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-600 mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`text-xs px-3 py-1.5 rounded-full transition ${
              value === opt
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}