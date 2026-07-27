// Wizard 6 区块输入流 — 完整版
// 从 landing 页（/wizard）点击"直接生成计划"进入
// 6 步: 主题 → 出发城市 → 目的地+日期 → 景点选择 → 偏好调节 → 生成
//
// 最终调用 POST /api/wizard/assemble → POST /api/plans → 跳转 /plan/[id]

'use client';
import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getToken, authedFetch } from '@/lib/auth';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

// --- 常量 ---
const THEMES: { key: string; label: string; desc: string }[] = [
  { key: 'sight', label: '景点', desc: '标志性景点' },
  { key: 'park', label: '公园', desc: '户外活动' },
  { key: 'museum', label: '博物馆', desc: '文化教育' },
  { key: 'science', label: '科技馆', desc: '互动体验' },
  { key: 'aquarium', label: '海洋馆', desc: '动物世界' },
  { key: 'library', label: '图书馆', desc: '安静阅读' },
  { key: 'playground', label: '游乐场', desc: '释放精力' },
  { key: 'restaurant', label: '餐厅', desc: '美食探索' },
  { key: 'mall', label: '商场', desc: '购物便利' },
  { key: 'hotel', label: '酒店', desc: '住宿休息' },
  { key: 'medical', label: '医疗', desc: '应急保障' },
  { key: 'convenience', label: '便利店', desc: '日用补给' },
  { key: 'transport', label: '交通', desc: '出行方式' },
];

const PREFS: { key: PrefKey; label: string; desc: string }[] = [
  { key: 'timeSaver', label: '省时', desc: '少排路、少等待' },
  { key: 'moneySaver', label: '省钱', desc: '门票餐饮更实惠' },
  { key: 'comfort', label: '舒服', desc: '午休充足、母婴室齐备' },
  { key: 'uniqueness', label: '独特', desc: '避开热门，去人少的好去处' },
];

type PrefKey = 'timeSaver' | 'moneySaver' | 'comfort' | 'uniqueness';
interface StylePrefs { timeSaver: number; moneySaver: number; comfort: number; uniqueness: number }

const STEP_LABELS = ['主题', '出发城市', '目的地', '景点', '偏好', '生成'];

// --- 类型 ---
interface CityOption { id: string; name: string; province: string | null; kidHook?: string | null }
interface PlaceOption {
  id: string; type: string; typeLabel: string; name: string;
  rating: number; kidHighlights: string | null; coverImage: string | null;
}
interface WizardChild {
  childId: string; nickname?: string | null; name?: string | null;
  gender?: string | null; birthDate?: string | null; avatar?: string | null; likes?: string[];
}

// --- 页面包裹 Suspense ---
export default function WizardGeneratePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50" />}>
      <WizardGenerate />
    </Suspense>
  );
}

function WizardGenerate() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从 landing 页继承的参数
  const inheritedCityName = searchParams.get('cityName') ?? '';
  const inheritedDays = Number(searchParams.get('days') ?? 3);
  const inheritedStyle = searchParams.get('travelStyle') ?? 'balanced';

  // 步骤
  const [step, setStep] = useState(0); // 0-5

  // 区块 1: 主题
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set());

  // 区块 2: 出发城市
  const [fromCity, setFromCity] = useState('');
  const [fromCityQuery, setFromCityQuery] = useState('');

  // 区块 3: 目的地 + 日期
  const [cities, setCities] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState(inheritedDays || 3);
  const [adults, setAdults] = useState(2);
  const [childrenCount, setChildrenCount] = useState(1);

  // 区块 4: 景点选择
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [pickedSpotIds, setPickedSpotIds] = useState<Set<string>>(new Set());
  const [placeFilter, setPlaceFilter] = useState('');

  // 区块 5: 偏好
  const [prefs, setPrefs] = useState<StylePrefs>(
    inheritedStyle === 'time_saver' ? { timeSaver: 8, moneySaver: 4, comfort: 5, uniqueness: 5 }
    : inheritedStyle === 'money_saver' ? { timeSaver: 5, moneySaver: 8, comfort: 5, uniqueness: 5 }
    : inheritedStyle === 'comfort' ? { timeSaver: 5, moneySaver: 4, comfort: 8, uniqueness: 5 }
    : { timeSaver: 5, moneySaver: 5, comfort: 5, uniqueness: 5 }
  );

  // 孩子档案
  const [userChildren, setUserChildren] = useState<WizardChild[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState('');
  const [authReady, setAuthReady] = useState(false);

  // 生成
  const [generating, setGenerating] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number>(0);
  const [genError, setGenError] = useState('');

  // --- 初始化：加载城市 + 恢复出发城市 + 认证 ---
  useEffect(() => {
    // 城市列表
    fetch(`${TRAVEL_API}/api/cities`)
      .then((r) => r.json())
      .then((d) => {
        const list: CityOption[] = d?.data ?? d?.cities ?? [];
        setCities(list);
        if (inheritedCityName) {
          const found = list.find((c) => c.name === inheritedCityName);
          if (found) setSelectedCityId(found.id);
        }
      })
      .catch(console.error)
      .finally(() => setCitiesLoading(false));

    // 出发城市（localStorage）
    const savedFrom = localStorage.getItem('wizard:fromCity');
    if (savedFrom) {
      setFromCity(savedFrom);
      setFromCityQuery(savedFrom);
    }

    // 默认出发日期 = 明天
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(tomorrow.toISOString().slice(0, 10));
  }, [inheritedCityName]);

  // 认证 + 孩子档案
  useEffect(() => {
    const token = typeof window !== 'undefined' ? getToken() : null;
    if (!token) {
      setAuthReady(true);
      return;
    }
    (async () => {
      try {
        const meRes = await authedFetch('/api/auth/me');
        const me = await meRes.json().catch(() => null);
        const uid = me?.data?.id ?? me?.user?.id ?? me?.id;
        if (uid) setUserId(uid);

        const r = await authedFetch(`/api/user/children?userId=${uid}`);
        if (r.ok) {
          const j = await r.json().catch(() => null);
          const items: WizardChild[] = j?.data?.items ?? j?.items ?? [];
          setUserChildren(items);
          if (items.length > 0) {
            setSelectedChildIds(new Set([items[0].childId]));
            setChildrenCount(items.length);
          }
        }
      } catch { /* fallback */ }
      finally { setAuthReady(true); }
    })();
  }, []);

  // 区块 4: 加载选中城市的景点
  const loadPlaces = useCallback(async () => {
    if (!selectedCityId) return;
    setPlacesLoading(true);
    try {
      const res = await fetch(`${TRAVEL_API}/api/places?cityId=${selectedCityId}&sort=popular`);
      const d = await res.json();
      setPlaces(d?.data?.items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setPlacesLoading(false);
    }
  }, [selectedCityId]);

  // 进入区块 4 时加载景点
  useEffect(() => {
    if (step === 3 && selectedCityId && places.length === 0) {
      loadPlaces();
    }
  }, [step, selectedCityId, places.length, loadPlaces]);

  // --- 派生 ---
  const selectedCity = cities.find((c) => c.id === selectedCityId);
  const endDate = useMemo(() => {
    if (!startDate) return '';
    const d = new Date(startDate);
    d.setDate(d.getDate() + days - 1);
    return d.toISOString().slice(0, 10);
  }, [startDate, days]);

  const monthsFromBirth = (b: string | null | undefined): number | null => {
    if (!b) return null;
    const dt = new Date(b);
    if (isNaN(dt.getTime())) return null;
    const now = new Date();
    let m = (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth());
    if (now.getDate() < dt.getDate()) m -= 1;
    return Math.max(0, m);
  };

  const childAges = useMemo(() => {
    return Array.from(selectedChildIds)
      .map((id) => userChildren.find((c) => c.childId === id))
      .map((c) => monthsFromBirth(c?.birthDate))
      .filter((n): n is number => n !== null);
  }, [selectedChildIds, userChildren]);

  const budgetLevel = useMemo(() => {
    if (prefs.moneySaver >= 7) return 'economy';
    if (prefs.comfort >= 7) return 'premium';
    return 'balanced';
  }, [prefs]);

  // --- 步骤校验 ---
  const canNext = useMemo(() => {
    switch (step) {
      case 0: return true; // 主题可选
      case 1: return true; // 出发城市可选
      case 2: return !!selectedCityId && !!startDate;
      case 3: return true; // 景点可选
      case 4: return userId ? selectedChildIds.size > 0 : true;
      case 5: return true; // 生成
      default: return false;
    }
  }, [step, selectedCityId, startDate, userId, selectedChildIds]);

  // --- 生成 ---
  const handleGenerate = async () => {
    setGenerating(true);
    setGenError('');
    try {
      // 构造 childProfiles
      const childProfiles = Array.from(selectedChildIds).map((id) => {
        const c = userChildren.find((x) => x.childId === id);
        return {
          childId: id,
          name: c?.nickname ?? c?.name ?? '宝宝',
          birthDate: c?.birthDate,
          likes: c?.likes ?? [],
        };
      });

      // 如果没有选孩子，用月龄占位
      const finalChildProfiles = childProfiles.length > 0 ? childProfiles : [{
        childId: 'guest',
        name: '宝宝',
        likes: [],
      }];

      const travelParams = {
        userId: userId || 'guest',
        cityId: selectedCityId,
        startDate,
        endDate,
        travelers: { adults, children: childrenCount },
        childProfiles: finalChildProfiles,
        budgetLevel,
        preferredSpotTypes: selectedThemes.size > 0 ? Array.from(selectedThemes) : undefined,
      };

      const res = await fetch(`${TRAVEL_API}/api/wizard/assemble`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(travelParams),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? `组装失败 (${res.status})`);
      }
      setCandidates(data.candidates ?? []);
    } catch (e) {
      setGenError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreatePlan = async (candidateIndex: number) => {
    const cand = candidates[candidateIndex];
    if (!cand) return;
    setGenerating(true);
    try {
      const res = await fetch(`${TRAVEL_API}/api/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          cityId: selectedCityId,
          startDate,
          endDate,
          travelers: { adults, children: childrenCount },
          childAges,
          travelStyle: cand.style,
          status: 'draft',
          title: `${selectedCity?.name ?? ''} ${days}天行程 · ${cand.label}`,
          timelineBlocks: cand.days,
          candidateLabel: cand.label,
        }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/plan/${data.id}`);
      } else {
        throw new Error(data?.error?.message ?? '创建计划失败');
      }
    } catch (e) {
      setGenError((e as Error).message);
      setGenerating(false);
    }
  };

  // --- 渲染 ---
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
      {/* 头部 + 步骤条 */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <Link href="/wizard" className="text-blue-100 text-sm hover:text-white">← 返回</Link>
          <h1 className="text-2xl font-extrabold mt-2">智能攻略生成</h1>
          {/* 步骤进度条 */}
          <div className="flex items-center gap-1 mt-4">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                  i === step ? 'bg-white text-blue-700' : i < step ? 'bg-white/30 text-white' : 'bg-white/10 text-blue-100'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </span>
                  {label}
                </div>
                {i < STEP_LABELS.length - 1 && <div className={`w-4 h-0.5 mx-0.5 ${i < step ? 'bg-white/60' : 'bg-white/20'}`} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 区块 1: 主题选择 */}
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">想去什么样的地方？</h2>
            <p className="text-sm text-gray-500 mb-6">选择你感兴趣的地点类型，走天下会优先安排（可多选，也可跳过）</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {THEMES.map((t) => {
                const checked = selectedThemes.has(t.key);
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      const next = new Set(selectedThemes);
                      if (next.has(t.key)) next.delete(t.key);
                      else next.add(t.key);
                      setSelectedThemes(next);
                    }}
                    className={`text-left p-4 rounded-xl border-2 transition ${
                      checked ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-gray-900 text-sm">{t.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                  </button>
                );
              })}
            </div>
            {selectedThemes.size > 0 && (
              <p className="mt-4 text-sm text-blue-600">已选 {selectedThemes.size} 类：{Array.from(selectedThemes).map(k => THEMES.find(t => t.key === k)?.label).join('、')}</p>
            )}
          </div>
        )}

        {/* 区块 2: 出发城市 */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">从哪个城市出发？</h2>
            <p className="text-sm text-gray-500 mb-6">走天下会根据出发城市优化交通建议（可跳过）</p>
            <input
              type="text"
              value={fromCityQuery}
              onChange={(e) => setFromCityQuery(e.target.value)}
              onBlur={() => {
                setFromCity(fromCityQuery.trim());
                if (fromCityQuery.trim()) localStorage.setItem('wizard:fromCity', fromCityQuery.trim());
              }}
              placeholder="例: 北京、上海、广州..."
              className="w-full max-w-md px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-3 text-xs text-gray-400">下次会自动记住你的出发城市</p>
          </div>
        )}

        {/* 区块 3: 目的地 + 日期 */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">去哪里？什么时候去？</h2>
            <p className="text-sm text-gray-500 mb-6">选择目的地城市和出行时间</p>

            {/* 城市选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">目的地城市</label>
              {citiesLoading ? (
                <p className="text-sm text-gray-400">加载城市中...</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2">
                  {cities.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCityId(c.id)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${
                        selectedCityId === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {c.province ? `${c.province} · ${c.name}` : c.name}
                    </button>
                  ))}
                </div>
              )}
              {selectedCity?.kidHook && (
                <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">{selectedCity.kidHook}</p>
              )}
            </div>

            {/* 日期 + 天数 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">出发日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">玩几天</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDays(Math.max(1, days - 1))} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">-</button>
                  <span className="w-12 text-center text-lg font-bold">{days}</span>
                  <button onClick={() => setDays(Math.min(30, days + 1))} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">+</button>
                  <span className="text-sm text-gray-500 ml-2">天 ({startDate && endDate ? `${startDate} ~ ${endDate}` : ''})</span>
                </div>
              </div>
            </div>

            {/* 出行人数 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">大人</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAdults(Math.max(1, adults - 1))} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 font-bold">-</button>
                  <span className="w-12 text-center text-lg font-bold">{adults}</span>
                  <button onClick={() => setAdults(Math.min(10, adults + 1))} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 font-bold">+</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">孩子</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setChildrenCount(Math.max(1, childrenCount - 1))} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 font-bold">-</button>
                  <span className="w-12 text-center text-lg font-bold">{childrenCount}</span>
                  <button onClick={() => setChildrenCount(Math.min(10, childrenCount + 1))} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 font-bold">+</button>
                </div>
              </div>
            </div>

            {/* 孩子选择（已登录） */}
            {authReady && userChildren.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3">这次出行带哪个孩子？（可多选）</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {userChildren.map((c) => {
                    const months = monthsFromBirth(c.birthDate);
                    const ageText = months == null ? '未填生日' : months < 24 ? `${months} 月` : `${Math.floor(months / 12)} 岁`;
                    const checked = selectedChildIds.has(c.childId);
                    return (
                      <button
                        key={c.childId}
                        onClick={() => {
                          const next = new Set(selectedChildIds);
                          if (next.has(c.childId)) next.delete(c.childId);
                          else next.add(c.childId);
                          setSelectedChildIds(next);
                        }}
                        className={`text-left p-3 rounded-xl border-2 transition ${
                          checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                            {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full object-cover" /> : (c.nickname ?? c.name ?? '宝')[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate">{c.nickname ?? c.name ?? '未命名'}</div>
                            <div className="text-xs text-gray-500">{ageText}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 区块 4: 景点选择 */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">有没有特别想去的景点？</h2>
            <p className="text-sm text-gray-500 mb-6">
              从{selectedCity?.name}的地点库中挑选，选中的景点会被优先安排（可选，也可跳过让走天下自动安排）
            </p>

            {placesLoading ? (
              <div className="text-center py-12 text-gray-400">加载景点中...</div>
            ) : places.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <p className="text-gray-500">该城市暂无地点数据</p>
                <p className="text-sm text-gray-400 mt-1">走天下会自动为你安排行程</p>
              </div>
            ) : (
              <>
                {/* 筛选 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setPlaceFilter('')}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${!placeFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    全部 ({places.length})
                  </button>
                  {Array.from(new Set(places.map(p => p.type))).map((type) => {
                    const label = places.find(p => p.type === type)?.typeLabel ?? type;
                    const count = places.filter(p => p.type === type).length;
                    return (
                      <button
                        key={type}
                        onClick={() => setPlaceFilter(type)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${placeFilter === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* 地点列表 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                  {places
                    .filter(p => !placeFilter || p.type === placeFilter)
                    .map((p) => {
                      const checked = pickedSpotIds.has(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            const next = new Set(pickedSpotIds);
                            if (next.has(p.id)) next.delete(p.id);
                            else next.add(p.id);
                            setPickedSpotIds(next);
                          }}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 transition text-left ${
                            checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {p.coverImage ? (
                            <img src={p.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs text-gray-400">{p.typeLabel}</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm truncate">{p.name}</span>
                              {checked && <span className="text-blue-600 text-xs flex-shrink-0">已选</span>}
                            </div>
                            {p.kidHighlights && <div className="text-xs text-gray-500 mt-0.5 truncate">{p.kidHighlights}</div>}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500">{p.typeLabel}</span>
                              {p.rating > 0 && <span className="text-[10px] text-amber-600">评分 {p.rating.toFixed(1)}</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
                {pickedSpotIds.size > 0 && (
                  <p className="mt-4 text-sm text-blue-600">已选 {pickedSpotIds.size} 个景点</p>
                )}
              </>
            )}
          </div>
        )}

        {/* 区块 5: 偏好调节 */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">更看重什么？</h2>
            <p className="text-sm text-gray-500 mb-6">拖动滑块调节你的偏好（0-10），走天下会据此调整行程节奏</p>
            <div className="space-y-6">
              {PREFS.map((p) => (
                <div key={p.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-gray-900">{p.label}</span>
                      <span className="text-sm text-gray-500 ml-2">{p.desc}</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600 w-8 text-center">{prefs[p.key]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={prefs[p.key]}
                    onChange={(e) => setPrefs((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                根据你的偏好，走天下将以 <span className="font-bold text-blue-600">
                  {budgetLevel === 'economy' ? '经济实惠' : budgetLevel === 'premium' ? '舒适品质' : '均衡兼顾'}
                </span> 档位生成 3 套候选方案（省时 / 省钱 / 舒服）
              </p>
            </div>
          </div>
        )}

        {/* 区块 6: 生成 */}
        {step === 5 && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">确认并生成</h2>
            <p className="text-sm text-gray-500 mb-6">请确认以下信息，点击"生成行程"开始</p>

            {/* 汇总 */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">目的地</span><span className="font-medium">{selectedCity?.name ?? '未选'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">出发城市</span><span className="font-medium">{fromCity || '未填'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">出行日期</span><span className="font-medium">{startDate} ~ {endDate} ({days}天)</span></div>
              <div className="flex justify-between"><span className="text-gray-500">出行人数</span><span className="font-medium">{adults}大人 + {childrenCount}孩子</span></div>
              <div className="flex justify-between"><span className="text-gray-500">主题偏好</span><span className="font-medium">{selectedThemes.size > 0 ? Array.from(selectedThemes).map(k => THEMES.find(t => t.key === k)?.label).join('、') : '自动安排'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">指定景点</span><span className="font-medium">{pickedSpotIds.size > 0 ? `${pickedSpotIds.size} 个已选` : '自动安排'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">预算档位</span><span className="font-medium">{budgetLevel === 'economy' ? '经济实惠' : budgetLevel === 'premium' ? '舒适品质' : '均衡兼顾'}</span></div>
              {userChildren.length > 0 && selectedChildIds.size > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">出行孩子</span><span className="font-medium">{Array.from(selectedChildIds).map(id => userChildren.find(c => c.childId === id)?.nickname ?? userChildren.find(c => c.childId === id)?.name ?? '未知').join('、')}</span></div>
              )}
            </div>

            {/* 未登录提示 */}
            {authReady && !userId && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
                未登录账号将无法保存行程。请先 <Link href="/login?redirect=/wizard" className="font-bold underline">登录</Link> 或注册。
              </div>
            )}

            {/* 错误提示 */}
            {genError && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
                {genError}
              </div>
            )}

            {/* 候选方案 */}
            {candidates.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3">走天下为你生成了 {candidates.length} 套方案</h3>
                <div className="space-y-3">
                  {candidates.map((cand, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedCandidate(i)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition ${
                        selectedCandidate === i ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900">{cand.label}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{cand.style}</span>
                      </div>
                      <p className="text-sm text-gray-600">{cand.whyThisPlan}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>{cand.totalDays} 天</span>
                        <span>{Math.round(cand.totalActiveHours)} 小时活动</span>
                        <span>{cand.totalCostCents > 0 ? `约 ¥${(cand.totalCostCents / 100).toFixed(0)}` : '费用待估'}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleCreatePlan(selectedCandidate)}
                  disabled={generating}
                  className="w-full mt-4 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl disabled:opacity-50 shadow-md hover:shadow-lg transition"
                >
                  {generating ? '正在创建行程...' : `用「${candidates[selectedCandidate]?.label}」创建我的行程`}
                </button>
              </div>
            )}

            {/* 生成按钮 */}
            {candidates.length === 0 && (
              <button
                onClick={handleGenerate}
                disabled={generating || !userId}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl disabled:opacity-50 shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                {generating ? '走天下正在拼装行程...' : '生成行程'}
              </button>
            )}
          </div>
        )}

        {/* 底部导航 */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0 || generating}
            className="px-6 py-2.5 text-gray-600 font-medium disabled:opacity-30 hover:text-gray-800 transition"
          >
            ← 上一步
          </button>
          {step < 5 ? (
            <button
              onClick={() => canNext && setStep(step + 1)}
              disabled={!canNext}
              className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-40 hover:bg-blue-700 transition"
            >
              下一步 →
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
