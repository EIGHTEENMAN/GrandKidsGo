// /guides/ai-wizard — AI 攻略向导（单页 + 流式生成）
// 2026-07-31 v1.0 上线
// 设计：3 区块输入（出发/目的地/出行条件/偏好）+ 大纲预览 + 生成按钮 + 流式预览

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  SparklesIcon, CheckIcon, ChevronRight, ChevronLeft,
  MapPinIcon, CalendarIcon, UserIcon, BabyIcon, SunIcon,
  ForkIcon, TrainIcon, HotelRoomIcon, LoadingIcon,
} from '@/components/Icons';

type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
type Stage = 'input' | 'outline' | 'generating' | 'preview';

const SEASON_OPTIONS: Array<{ key: Season; label: string; emoji: string }> = [
  { key: 'spring', label: '春季', emoji: '🌸' },
  { key: 'summer', label: '夏季', emoji: '🌊' },
  { key: 'autumn', label: '秋季', emoji: '🍁' },
  { key: 'winter', label: '冬季', emoji: '❄️' },
  { key: 'all', label: '四季皆可', emoji: '🌐' },
];

const SPOT_TYPE_OPTIONS = [
  { key: 'nature', label: '自然风光' },
  { key: 'theme_park', label: '主题乐园' },
  { key: 'culture', label: '文化历史' },
  { key: 'beach', label: '海滨度假' },
  { key: 'city', label: '城市探索' },
  { key: 'countryside', label: '乡村田园' },
  { key: 'science', label: '科技博物馆' },
  { key: 'animal', label: '动物园/海洋馆' },
];

const TRANSPORT_OPTIONS = [
  { key: 'self_drive', label: '自驾' },
  { key: 'high_speed_rail', label: '高铁' },
  { key: 'plane', label: '飞机' },
  { key: 'public', label: '公共交通' },
];

interface OutlineSection {
  day: number;
  theme: string;
  activities: string[];
  transport: string;
  accommodation: string;
  tips: string[];
}

interface GuideOutline {
  title: string;
  summary: string;
  sections: OutlineSection[];
}

export default function AiWizardPage() {
  const [stage, setStage] = useState<Stage>('input');
  const [fromCity, setFromCity] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [days, setDays] = useState(3);
  const [travelers, setTravelers] = useState(3);
  const [childAgesStr, setChildAgesStr] = useState('3,6');
  const [season, setSeason] = useState<Season>('summer');
  const [spotTypes, setSpotTypes] = useState<string[]>(['nature', 'animal']);
  const [transports, setTransports] = useState<string[]>(['high_speed_rail']);
  const [budgetPerDay, setBudgetPerDay] = useState(500);
  const [hotelPreference, setHotelPreference] = useState('');
  const [extraNotes, setExtraNotes] = useState('');

  const [outline, setOutline] = useState<GuideOutline | null>(null);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [outlineError, setOutlineError] = useState<string | null>(null);

  const [streamContent, setStreamContent] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const streamRef = useRef<EventSource | null>(null);

  // 取消流式
  useEffect(() => {
    return () => {
      streamRef.current?.close();
    };
  }, []);

  function toggleArrayItem<T>(arr: T[], item: T, setter: (v: T[]) => void) {
    if (arr.includes(item)) setter(arr.filter((x) => x !== item));
    else setter([...arr, item]);
  }

  async function handleGenerateOutline() {
    if (!destinationCity.trim()) {
      setOutlineError('请填写目的地');
      return;
    }
    setOutlineLoading(true);
    setOutlineError(null);
    setOutline(null);

    const childAges = childAgesStr
      .split(/[,，\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0 && n < 18);

    try {
      const res = await fetch('/api/ai-wizard/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCity: fromCity.trim(),
          destinationCity: destinationCity.trim(),
          days,
          travelers,
          childAges,
          season,
          spotTypes,
          transports,
          budgetPerDay,
          hotelPreference: hotelPreference.trim() || undefined,
          extraNotes: extraNotes.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (d.code === 'OK') {
        setOutline(d.data);
        setStage('outline');
      } else {
        setOutlineError(d.error?.message ?? '生成失败，请重试');
      }
    } catch (e) {
      setOutlineError('网络错误：' + (e as Error).message);
    } finally {
      setOutlineLoading(false);
    }
  }

  function handleGenerateGuide() {
    if (!outline) return;
    setStage('generating');
    setStreamContent('');
    setStreamError(null);

    // SSE 不支持 POST，改用 fetch + ReadableStream
    const childAges = childAgesStr
      .split(/[,，\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0 && n < 18);

    fetch('/api/ai-wizard/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        params: {
          fromCity: fromCity.trim(),
          destinationCity: destinationCity.trim(),
          days,
          travelers,
          childAges,
          season,
          spotTypes,
          transports,
          budgetPerDay,
          hotelPreference: hotelPreference.trim() || undefined,
          extraNotes: extraNotes.trim() || undefined,
        },
        outline,
      }),
    })
      .then((res) => {
        if (!res.ok || !res.body) throw new Error('响应失败');
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let acc = '';
        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              setStage('preview');
              return;
            }
            const text = decoder.decode(value, { stream: true });
            // 解析 SSE 格式
            for (const line of text.split('\n\n')) {
              if (!line.startsWith('data: ')) continue;
              try {
                const payload = JSON.parse(line.slice(6));
                if (payload.delta) {
                  acc += payload.delta;
                  setStreamContent(acc);
                }
                if (payload.done) {
                  setStage('preview');
                }
                if (payload.error) {
                  setStreamError(payload.error);
                }
              } catch {
                // ignore
              }
            }
            return pump();
          });
        }
        return pump();
      })
      .catch((e) => {
        setStreamError('流式生成失败：' + (e as Error).message);
        setStage('outline');
      });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/guides" className="text-gray-500 hover:text-gray-700 text-sm">
            ← 返回攻略
          </Link>
          <div className="flex-1" />
          <div className="text-sm text-gray-500">
            <SparklesIcon size={16} className="inline mr-1 text-blue-500" />
            AI 攻略向导 · 一键生成亲子旅行攻略
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 阶段指示器 */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          {(['input', 'outline', 'preview'] as Stage[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  stage === s
                    ? 'bg-blue-500 text-white'
                    : stage === 'generating' && s === 'preview'
                      ? 'bg-blue-200 text-blue-700'
                      : ['input', 'outline', 'generating', 'preview'].indexOf(stage) > i
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <span className="text-gray-700">
                {s === 'input' && '填写参数'}
                {s === 'outline' && '确认大纲'}
                {s === 'generating' && '生成中'}
                {s === 'preview' && '预览保存'}
              </span>
              {i < 2 && <ChevronRight size={14} className="text-gray-400" />}
            </div>
          ))}
        </div>

        {/* Stage 1: Input */}
        {stage === 'input' && (
          <div className="space-y-6">
            {/* ① 出发地 + 目的地 */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
                <MapPinIcon size={18} className="text-blue-600" /> ① 出发地与目的地
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">出发城市</label>
                  <input
                    type="text"
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    placeholder="例如：北京"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    目的地 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    placeholder="例如：三亚、成都、张家界"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                  />
                </div>
              </div>
            </section>

            {/* ② 出行条件 */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
                <CalendarIcon size={18} className="text-blue-600" /> ② 出行条件
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">天数</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={days}
                    onChange={(e) => setDays(Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 1)))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">人数（含大人）</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={travelers}
                    onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">人均预算/天（元）</label>
                  <input
                    type="number"
                    min={100}
                    max={10000}
                    step={50}
                    value={budgetPerDay}
                    onChange={(e) => setBudgetPerDay(Math.max(100, parseInt(e.target.value, 10) || 500))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1.5">
                  儿童年龄（逗号分隔，0-17 岁）
                </label>
                <input
                  type="text"
                  value={childAgesStr}
                  onChange={(e) => setChildAgesStr(e.target.value)}
                  placeholder="例如：3,6（3 岁和 6 岁）"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">出行季节</label>
                <div className="flex flex-wrap gap-2">
                  {SEASON_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSeason(s.key)}
                      className={`px-4 py-2 rounded-full text-sm border transition ${
                        season === s.key
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ③ 偏好 */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
                <SunIcon size={18} className="text-blue-600" /> ③ 偏好设置
              </h2>

              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">景点类型（可多选）</label>
                <div className="flex flex-wrap gap-2">
                  {SPOT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleArrayItem(spotTypes, opt.key, setSpotTypes)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        spotTypes.includes(opt.key)
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      {spotTypes.includes(opt.key) && '✓ '}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">交通方式（可多选）</label>
                <div className="flex flex-wrap gap-2">
                  {TRANSPORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleArrayItem(transports, opt.key, setTransports)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        transports.includes(opt.key)
                          ? 'bg-cyan-500 text-white border-cyan-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-300'
                      }`}
                    >
                      {transports.includes(opt.key) && '✓ '}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">住宿要求（可选）</label>
                  <input
                    type="text"
                    value={hotelPreference}
                    onChange={(e) => setHotelPreference(e.target.value)}
                    placeholder="例如：亲子酒店、有泳池"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">其他备注（可选）</label>
                  <input
                    type="text"
                    value={extraNotes}
                    onChange={(e) => setExtraNotes(e.target.value)}
                    placeholder="例如：孩子怕动物、老人同行"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </section>

            {outlineError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {outlineError}
                <div className="mt-2 text-xs text-red-600">
                  💡 提示：当前可能是 Mock 模式（未配置 SILICONFLOW_API_KEY）。请检查 apps/travel-guide/.env 中的 AI_PROVIDER 和对应 API key。
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleGenerateOutline}
                disabled={outlineLoading || !destinationCity.trim()}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition inline-flex items-center gap-2"
              >
                {outlineLoading ? (
                  <>
                    <LoadingIcon size={18} className="animate-spin" />
                    正在生成大纲…
                  </>
                ) : (
                  <>
                    <SparklesIcon size={18} />
                    生成行程大纲
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Stage 2: Outline */}
        {(stage === 'outline' || stage === 'generating') && outline && (
          <div className="space-y-6">
            <section className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <SparklesIcon size={24} className="text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
                    {outline.title}
                  </h1>
                  <p className="text-gray-700 leading-relaxed">{outline.summary}</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              {outline.sections.map((s) => (
                <article key={s.day} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-3xl font-extrabold text-blue-500">第 {s.day} 天</span>
                    <h3 className="text-xl font-bold text-gray-900">{s.theme}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1.5">🎯 主要活动</div>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {s.activities.map((a, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-blue-500 flex-shrink-0">·</span>
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-xs text-gray-500">🚗 交通：</span>
                        <span className="text-gray-700">{s.transport}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">🏨 住宿：</span>
                        <span className="text-gray-700">{s.accommodation}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500 mb-1.5">💡 小贴士</div>
                    <ul className="space-y-1 text-sm text-amber-700">
                      {s.tips.map((t, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-amber-500 flex-shrink-0">·</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </section>

            {streamError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {streamError}
              </div>
            )}

            <div className="flex justify-between gap-3">
              <button
                onClick={() => setStage('input')}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <ChevronLeft size={16} /> 返回修改参数
              </button>
              <button
                onClick={handleGenerateGuide}
                disabled={stage === 'generating'}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition inline-flex items-center gap-2"
              >
                {stage === 'generating' ? (
                  <>
                    <LoadingIcon size={18} className="animate-spin" />
                    AI 正在写攻略…
                  </>
                ) : (
                  <>
                    <SparklesIcon size={18} />
                    基于此大纲生成完整攻略
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>

            {stage === 'generating' && streamContent && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-bold text-gray-500 mb-3 inline-flex items-center gap-2">
                  <LoadingIcon size={14} className="animate-spin text-blue-500" />
                  AI 正在生成（实时预览）
                </h3>
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: streamContent }}
                />
              </section>
            )}
          </div>
        )}

        {/* Stage 3: Preview */}
        {stage === 'preview' && (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center gap-2 text-emerald-600 mb-4">
                <CheckIcon size={20} />
                <span className="font-bold">AI 攻略生成完成！</span>
              </div>
              <div
                className="prose prose-sm md:prose-base max-w-none text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: streamContent || '<p>暂无内容</p>' }}
              />
            </section>

            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={() => {
                  setStage('input');
                  setStreamContent('');
                  setOutline(null);
                }}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                重新生成
              </button>
              <button
                onClick={() => {
                  // TODO: 跳转到 /guides/create?source=ai-wizard&content=<base64>
                  alert('保存为草稿 / 直接发布功能待开发（关联攻略体系 v1.0）');
                }}
                className="px-6 py-3 bg-white border border-blue-500 text-blue-600 font-bold rounded-xl hover:bg-blue-50"
              >
                保存为草稿
              </button>
              <button
                onClick={() => {
                  alert('直接发布功能待开发（关联攻略体系 v1.0）');
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg inline-flex items-center gap-2"
              >
                直接发布 <ChevronRight size={16} />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
              💡 下一步：保存草稿 / 直接发布需要关联 <code>/guides/create</code> 路由与攻略体系 v1.0（commit b7162f6）。本任务先打通 AI 生成链路，预览、保存、发布留待 PR2。
            </div>
          </div>
        )}
      </div>
    </main>
  );
}