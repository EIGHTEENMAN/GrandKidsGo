// 智能攻略页 - PC 端（v3.0 重做版）
// 详见 项目建设方案/走天下实施方案-v3.0.md
//
// 新流程：
// 1. 先输入基本信息（城市/天数/孩子月龄）
// 2. 系统推荐相似行程的真实攻略（基于孩子画像匹配）
// 3. 用户可：
//    a) 选一个喜欢的 → 一键 fork 成自己的计划
//    b) 不满意 → 重新生成（引擎 A 拼装）

'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, authedFetch } from '@/lib/auth';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface SimilarGuide {
  id: string;
  title: string;
  cityName: string | null;
  days: number | null;
  childAges: number[];
  travelStyle: string | null;
  stats: { view: number; save: number; like: number };
  author: { nickname: string; avatar: string | null };
  // 相似度（评分越高越像）
  matchScore: number;
  matchReason: string;
}

// 从个人中心拉取的孩子档案（结构同 apps/travel-guide/src/lib/child-sync-client.ts）
interface WizardChild {
  childId: string;
  nickname?: string | null;
  name?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  avatar?: string | null;
  likes?: string[];
}

// 从 /api/cities 拉到的真实城市（与亲子宝典同源）
interface CityOption {
  id: string;
  name: string;
  province: string | null;
  kidHook?: string | null;
}

const CITY_FALLBACK = '北京'; // 首屏默认，城市列表还没加载时显示
const DAY_PRESETS = [2, 3, 5, 7, 10, 14];
const DAY_MIN = 1;
const DAY_MAX = 30;

// 主题（与 /places 一致）
const THEMES: { key: string; label: string }[] = [
  { key: 'sight', label: '景点' },
  { key: 'restaurant', label: '餐厅' },
  { key: 'hotel', label: '酒店' },
  { key: 'transport', label: '交通' },
  { key: 'medical', label: '医疗' },
  { key: 'convenience', label: '便利店' },
  { key: 'park', label: '公园' },
  { key: 'mall', label: '商场' },
  { key: 'playground', label: '游乐场' },
  { key: 'science', label: '科技馆' },
  { key: 'library', label: '图书馆' },
  { key: 'museum', label: '博物馆' },
  { key: 'aquarium', label: '海洋馆' },
];

// 风格偏好 4 维 0–10（替代单一 4 选 1）
type PrefKey = 'timeSaver' | 'moneySaver' | 'comfort' | 'uniqueness';
interface StylePrefs { timeSaver: number; moneySaver: number; comfort: number; uniqueness: number }
const PREF_DEFS: { key: PrefKey; label: string; desc: string }[] = [
  { key: 'timeSaver', label: '⚡ 省时', desc: '想少排点路、少等等' },
  { key: 'moneySaver', label: '💰 省钱', desc: '门票餐饮便宜一些' },
  { key: 'comfort', label: '🛋️ 舒服', desc: '午休连续、母婴室齐备' },
  { key: 'uniqueness', label: '⭐ 独特', desc: '避开热门，去人少的好去处' },
];

// 单城市下的简版 POI（用于展开面板选景点）
interface WizardSpot {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  rating: number;
}

// 高德 IP 定位（暂未启用 — 等 AMAP_API_KEY + 新增 /api/geo/ip-city 路由后接入）
// 当前版本：从浏览器 localStorage 读上次选择；都没有就空。
function loadLastFromCity(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('wizard:lastFromCity') ?? '';
}

export default function SmartGuideLanding() {
  const router = useRouter();
  const [step, setStep] = useState<'input' | 'results'>('input');
  const [days, setDays] = useState(3);
  const [childAgeMonths, setChildAgeMonths] = useState(36);
  const [guides, setGuides] = useState<SimilarGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [directLoading, setDirectLoading] = useState(false);

  // 旧版输入页所需状态（6 区块重构未完成，这些仍被引用）
  const [cityName, setCityName] = useState(CITY_FALLBACK);
  const [travelStyle, setTravelStyle] = useState('balanced');

  // 6 区块状态
  const [theme, setTheme] = useState<string>('');
  const [fromCity, setFromCity] = useState<string>('');
  const [fromCityQuery, setFromCityQuery] = useState<string>('');
  const [destinationCityIds, setDestinationCityIds] = useState<Set<string>>(new Set());
  const [openSpotPickerCityId, setOpenSpotPickerCityId] = useState<string>('');
  const [pickedSpotsByCity, setPickedSpotsByCity] = useState<Record<string, Set<string>>>({});
  const [preferences, setPreferences] = useState<StylePrefs>({ timeSaver: 5, moneySaver: 5, comfort: 5, uniqueness: 5 });

  // 真实孩子档案（从 /api/user/children 拉）
  const [authReady, setAuthReady] = useState(false);
  const [userChildren, setUserChildren] = useState<WizardChild[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());
  const hasUserChildren = !childrenLoading && authReady && userChildren.length > 0;

  useEffect(() => {
    // 加载个人中心孩子档案；失败/未登录 → fallback 到月龄胶囊
    const token = typeof window !== 'undefined' ? getToken() : null;
    if (!token) {
      setAuthReady(true);
      return;
    }
    setChildrenLoading(true);
    (async () => {
      try {
        const meRes = await authedFetch('/api/auth/me');
        const me = await meRes.json().catch(() => null);
        const uid: string | undefined = me?.data?.id ?? me?.user?.id ?? me?.id;
        if (!uid) {
          setAuthReady(true);
          return;
        }
        const r = await authedFetch(`/api/user/children?userId=${uid}`);
        if (!r.ok) return;
        const j = await r.json().catch(() => null);
        const items: WizardChild[] = j?.data?.items ?? j?.items ?? [];
        setUserChildren(items);
        // 默认勾选第一个（若有）
        if (items.length > 0) {
          setSelectedChildIds(new Set([items[0].childId]));
        }
      } catch {
        // swallow: fallback 路径自动生效
      } finally {
        setChildrenLoading(false);
        setAuthReady(true);
      }
    })();
  }, []);

  // 派生代表月龄（多孩取均值，单孩直接给），fallback 用 childAgeMonths
  const monthsFromBirth = (b: string | null | undefined): number | null => {
    if (!b) return null;
    const dt = new Date(b);
    if (isNaN(dt.getTime())) return null;
    const now = new Date();
    let m = (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth());
    if (now.getDate() < dt.getDate()) m -= 1;
    return Math.max(0, m);
  };
  const selectedMonths = useMemo(
    () =>
      Array.from(selectedChildIds)
        .map((id) => userChildren.find((c) => c.childId === id))
        .map((c) => monthsFromBirth(c?.birthDate))
        .filter((n): n is number => n !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedChildIds, userChildren],
  );
  const representativeMonths = selectedMonths.length
    ? Math.round(selectedMonths.reduce((a, b) => a + b, 0) / selectedMonths.length)
    : childAgeMonths;
  const canSubmit = !loading && !directLoading && (hasUserChildren ? selectedChildIds.size > 0 : true);

  // 真实城市列表（与 /places 同源 — /api/cities）
  const [cities, setCities] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  useEffect(() => {
    fetch(`${TRAVEL_API}/api/cities`)
      .then((r) => r.json())
      .then((d) => {
        const list: CityOption[] = (d?.data ?? d?.cities ?? []) as CityOption[];
        setCities(list);
        // 默认选中：宝典里有北京 → 北京，否则第一个
        if (list.length > 0) {
          const beijing = list.find((c) => c.name === CITY_FALLBACK);
          setCityName(beijing?.name ?? list[0].name);
        }
      })
      .catch(console.error)
      .finally(() => setCitiesLoading(false));
  }, []);

  const setDaysClamped = (n: number) => {
    if (!Number.isFinite(n)) return;
    const v = Math.max(DAY_MIN, Math.min(DAY_MAX, Math.round(n)));
    setDays(v);
  };

  const searchSimilar = async () => {
    setLoading(true);
    try {
      // 查所有相关 city 的攻略
      const citiesRes = await fetch(`${TRAVEL_API}/api/cities`);
      const citiesData = await citiesRes.json();
      const targetCity = (citiesData.data ?? citiesData.cities ?? []).find((c: any) => c.name === cityName);
      if (!targetCity) {
        alert('城市未找到，请先在宝典中查看该城市');
        return;
      }

      // 查真实攻略
      const guidesRes = await fetch(`${TRAVEL_API}/api/guides/feed`);
      const guidesData = await guidesRes.json();
      const allGuides = guidesData.items ?? [];

      // 算相似度：城市匹配 + 天数匹配 + 孩子月龄匹配
      const matched: SimilarGuide[] = allGuides
        .map((g: any) => {
          let score = 0;
          const reasons: string[] = [];
          if (g.cityName === cityName) {
            score += 50;
            reasons.push('同城市');
          }
          if (g.days && Math.abs(g.days - days) <= 1) {
            score += 25;
            reasons.push(`天数相近（${g.days} 天）`);
          }
          if (g.childAges?.length) {
            const ageDiff = Math.min(...g.childAges.map((a: number) => Math.abs(a - representativeMonths)));
            if (ageDiff <= 12) {
              score += 25;
              reasons.push(`孩子月龄相近（${Math.floor(Math.min(...g.childAges)/12)} 岁）`);
            } else if (ageDiff <= 24) {
              score += 10;
            }
          }
          if (g.travelStyle === travelStyle) {
            score += 10;
            reasons.push('旅行风格匹配');
          }
          return {
            ...g,
            matchScore: score,
            matchReason: reasons.length ? reasons.join(' · ') : '弱匹配',
          };
        })
        .filter((g: any) => g.matchScore >= 50)
        .sort((a: any, b: any) => b.matchScore - a.matchScore)
        .slice(0, 6);

      setGuides(matched);
      setStep('results');
    } catch (e) {
      console.error(e);
      alert('查询失败');
    } finally {
      setLoading(false);
    }
  };

  const forkGuide = async (guideId: string) => {
    setForkingId(guideId);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const t = sessionStorage.getItem('grandkidsgo_token');
        if (t) headers.Authorization = `Bearer ${t}`;
      }
      const res = await fetch(`${TRAVEL_API}/api/guides/fork`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sourceGuideId: guideId }),
      });
      const d = await res.json();
      if (d.code === 'OK') {
        router.push(`/plan/${d.data.planRecordId}`);
      } else {
        alert(d.error?.message ?? 'fork 失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setForkingId(null);
    }
  };

  const regenerate = () => {
    router.push('/wizard/step1-city');
  };

  const directGenerate = () => {
    setDirectLoading(true);
    const token = typeof window !== 'undefined' ? getToken() : null;
    if (!token) {
      // 未登录：跳登录，回跳时携带 fromIntent，让 login 页能记住意图
      router.push('/login?redirect=/wizard&fromIntent=generate-plan');
      return;
    }
    const qs = new URLSearchParams({
      cityName,
      days: String(days),
      childAgeMonths: String(representativeMonths),
      travelStyle,
    });
    router.push(`/wizard/step1-city?${qs.toString()}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">🪄 智能攻略</h1>
          <p className="text-blue-100 mt-1">看看大家怎么玩，或者直接交给走天下算</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {step === 'input' && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">告诉我们您这次的出行偏好</h2>

            <div className="space-y-5">
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">想去哪个城市？</label>
                  {citiesLoading && <span className="text-xs text-gray-400">正在读取亲子宝典…</span>}
                </div>
                {!citiesLoading && cities.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    暂未加载到城市，请稍后再试。
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-2">
                    {cities.map((c) => {
                      const label = c.province ? `${c.province} · ${c.name}` : c.name;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          title={c.kidHook ?? label}
                          onClick={() => setCityName(c.name)}
                          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${
                            cityName === c.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  玩几天？
                  <span className="text-xs text-gray-400 ml-2 font-normal">{DAY_MIN}–{DAY_MAX} 天</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDaysClamped(days - 1)}
                    disabled={days <= DAY_MIN}
                    aria-label="减少一天"
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={DAY_MIN}
                    max={DAY_MAX}
                    value={days}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n)) setDaysClamped(n);
                    }}
                    onBlur={(e) => setDaysClamped(Number(e.target.value))}
                    className="w-20 text-center px-3 py-2 border border-gray-200 rounded-lg text-base font-bold focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-600 text-sm">天</span>
                  <button
                    type="button"
                    onClick={() => setDaysClamped(days + 1)}
                    disabled={days >= DAY_MAX}
                    aria-label="增加一天"
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ＋
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {DAY_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(d)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                        days === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d} 天
                    </button>
                  ))}
                </div>
              </div>

              {hasUserChildren ? (
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">这次出行带哪个孩子？（可多选）</label>
                    <Link
                      href="/profile/children"
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      去个人中心管理 →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {userChildren.map((c) => {
                      const months = monthsFromBirth(c.birthDate);
                      const ageText = months == null
                        ? null
                        : months < 24
                          ? `${months} 月`
                          : (() => {
                              const y = Math.floor(months / 12);
                              const r = months % 12;
                              return r === 0 ? `${y} 岁` : `${y} 岁 ${r} 月`;
                            })();
                      const initials = (c.nickname ?? c.name ?? '宝')[0];
                      const checked = selectedChildIds.has(c.childId);
                      return (
                        <button
                          key={c.childId}
                          type="button"
                          onClick={() => {
                            const next = new Set(selectedChildIds);
                            if (next.has(c.childId)) next.delete(c.childId);
                            else next.add(c.childId);
                            setSelectedChildIds(next);
                          }}
                          className={`text-left bg-white rounded-2xl p-3 transition border-2 relative ${
                            checked
                              ? 'border-blue-500 ring-4 ring-blue-100 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              checked
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-400 border border-gray-200'
                            }`}
                          >
                            {checked ? '✓' : ''}
                          </span>
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg font-bold overflow-hidden mb-2">
                            {c.avatar
                              ? <img src={c.avatar} alt="" className="w-12 h-12 object-cover" />
                              : initials}
                          </div>
                          <div className="font-bold text-gray-900 text-sm truncate">
                            {c.nickname ?? c.name ?? '未命名'}
                            {c.gender === 'male' && <span className="ml-1 text-blue-600">♂</span>}
                            {c.gender === 'female' && <span className="ml-1 text-pink-500">♀</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{ageText ?? '未填生日'}</div>
                          {c.likes && c.likes.length > 0 && (
                            <div className="text-[11px] text-gray-400 mt-1 truncate">
                              喜欢：{c.likes.slice(0, 2).join('、')}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedChildIds.size === 0 && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      请至少勾选一个孩子，两个按钮才会激活。
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">孩子当时多大？（月龄估算）</label>
                    {authReady && (
                      <Link
                        href="/profile/children"
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        去个人中心添加真实孩子 →
                      </Link>
                    )}
                  </div>
                  {!authReady || childrenLoading ? (
                    <p className="text-xs text-gray-400">正在读取个人中心的孩子档案…</p>
                  ) : (
                    <>
                      <div className="mb-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        💡 还没添加孩子？先去<a href="/profile/children" className="text-blue-600 underline mx-1">个人中心</a>添加，wizard 会自动按孩子真实月龄匹配行程。
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { m: 12, l: '1 岁' },
                          { m: 24, l: '2 岁' },
                          { m: 36, l: '3 岁' },
                          { m: 48, l: '4 岁' },
                          { m: 60, l: '5 岁' },
                          { m: 72, l: '6 岁' },
                          { m: 96, l: '8 岁' },
                        ].map((a) => (
                          <button
                            key={a.m}
                            onClick={() => setChildAgeMonths(a.m)}
                            className={`px-4 py-2 rounded-full text-sm transition ${
                              childAgeMonths === a.m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {a.l}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">想要什么风格？</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { k: 'time_saver', l: '⚡ 省时' },
                    { k: 'money_saver', l: '💰 省钱' },
                    { k: 'balanced', l: '🌿 平衡' },
                    { k: 'comfort', l: '🛋️ 舒服' },
                  ].map((s) => (
                    <button
                      key={s.k}
                      onClick={() => setTravelStyle(s.k)}
                      className={`px-4 py-2 rounded-full text-sm transition ${
                        travelStyle === s.k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                <button
                  onClick={searchSimilar}
                  disabled={!canSubmit}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 rounded-xl disabled:opacity-50 shadow-md inline-flex items-center justify-center gap-2"
                >
                  <span aria-hidden>🤝</span>
                  <span>{loading ? '正在找相似行程…' : '看看大家怎么玩'}</span>
                </button>
                <button
                  onClick={directGenerate}
                  disabled={!canSubmit}
                  className="w-full bg-white text-blue-700 font-bold py-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <span aria-hidden>✨</span>
                  <span>{directLoading ? '准备中…' : '直接生成计划'}</span>
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-400 text-center">
                「直接生成计划」需要先登录账号（走天下会自动保存您的出行方案）
              </p>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div>
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">✨ 找到 {guides.length} 个相似行程</h2>
              <p className="text-sm text-gray-500">
                看到喜欢的 → 一键做成你的计划 · 不喜欢 → 重新生成
              </p>
            </div>

            {guides.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-dashed mb-6">
                <div className="text-4xl mb-3">🤷</div>
                <div className="text-gray-500 mb-2">没有找到相似的攻略</div>
                <div className="text-sm text-gray-400">走天下的真实攻略还在积累中</div>
              </div>
            )}

            <div className="space-y-4 mb-6">
              {guides.map((g) => (
                <article key={g.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">📍 {g.cityName ?? '未选'}</span>
                          {g.days && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded">{g.days} 天</span>}
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">
                            🎯 {g.matchScore}% 匹配
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2">{g.title}</h3>
                        <p className="text-sm text-gray-500 mb-2">{g.matchReason}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">👩 {g.author.nickname}</span>
                          <span className="text-gray-400 text-xs">
                            👍 {g.stats.like} ⭐ {g.stats.save}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Link
                        href={`/guides/${g.id}`}
                        className="flex-1 text-center py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >
                        👀 看真实评价
                      </Link>
                      <button
                        onClick={() => forkGuide(g.id)}
                        disabled={forkingId === g.id}
                        className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:shadow-md"
                      >
                        {forkingId === g.id ? '生成中…' : '✨ 用这个做我的计划'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 text-center">
              <p className="text-gray-600 mb-3">没看到喜欢的？</p>
              <button
                onClick={regenerate}
                className="px-8 py-3 bg-white text-gray-700 font-bold rounded-full shadow border border-gray-200 hover:bg-gray-50 transition"
              >
                🪄 改一下再生成
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
