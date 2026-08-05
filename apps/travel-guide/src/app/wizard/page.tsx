// 智能攻略页 - PC 端（v4.0 — 单页 6 区块 + 多城拼接）
// 详见 项目建设方案/走天下实施方案-v1.5.md
//
// 流程（一次页面，单页 0 跳转）：
//   1. 6 区块 inline 输入：主题 / 出发城市 / 目的地+日期 / 景点 / 孩子 / 偏好
//   2. 双 CTA：「看看大家怎么玩」跑相似攻略；「直接生成计划」跑 assemble 出 3 候选
//   3. 候选方案面板展示 3 个候选（含多城 transit + hotel 块）；选中一个 → 建 plan → push /plan/[id]
//   4. 相似攻略面板「用这个做我的计划」走 fork
//
// 多城（v1）：目的地可多选；assemble 一站式生成多城行程；天数由后端启发分配；
//            transit 时长由 haversine + 距离阈值启发；hotel 按 kid-friendly 评分排序

'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, authedFetch } from '@/lib/auth';
import type { CandidateOutline, TimelineBlock, TimelineDay, ChildProfileHint } from '@/lib/assembler/types';
import { ChildProfileHints } from '@/components/ChildProfileHints';
import { getChildFeelingProfile } from '@/lib/child-profile-aggregate';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

// ---------------------------------------------------------------------------
// 模块顶部内联常量
// ---------------------------------------------------------------------------
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

// chip → 关键词（命中 guide.tags 提分）
const THEME_KEYWORDS: Record<string, string[]> = {
  sight: ['景点', '名胜', '地标', 'sight'],
  park: ['公园', '绿地', 'park'],
  museum: ['博物馆', 'museum'],
  science: ['科技', 'science', '科技馆'],
  aquarium: ['海洋', 'aquarium', '水族馆'],
  library: ['图书', 'library'],
  playground: ['游乐', 'playground'],
  restaurant: ['美食', '餐厅', 'food'],
  mall: ['商场', '购物', 'mall'],
  hotel: ['酒店', 'hotel'],
  medical: ['医疗', '医院'],
  convenience: ['便利', 'convenience'],
  transport: ['交通', 'transport'],
};

// place.type → 关键词（命中 guide.tags 提分）
const SPOT_TYPE_KEYWORDS: Record<string, string[]> = {
  sight: ['景点', '名胜'],
  park: ['公园', '绿地'],
  museum: ['博物馆'],
  science: ['科技', '科技馆'],
  aquarium: ['海洋', '水族馆'],
  library: ['图书'],
  playground: ['游乐'],
  restaurant: ['美食', '餐厅'],
  mall: ['商场', '购物'],
  hotel: ['酒店'],
};

const DAY_PRESETS = [2, 3, 5, 7, 10, 14];
const DAY_MIN = 2;
const DAY_MAX = 21;

const PREFS: { key: PrefKey; label: string; desc: string }[] = [
  { key: 'timeSaver', label: '省时', desc: '少排路、少等待' },
  { key: 'moneySaver', label: '省钱', desc: '门票餐饮更实惠' },
  { key: 'comfort', label: '舒服', desc: '午休充足、母婴室齐备' },
  { key: 'uniqueness', label: '独特', desc: '避开热门，去人少的好去处' },
];

type PrefKey = 'timeSaver' | 'moneySaver' | 'comfort' | 'uniqueness';
interface StylePrefs { timeSaver: number; moneySaver: number; comfort: number; uniqueness: number }

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------
interface CityOption {
  id: string;
  name: string;
  province: string | null;
  kidHook?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface PlaceOption {
  id: string;
  type: string;
  typeLabel: string;
  name: string;
  rating: number;
  kidHighlights: string | null;
  coverImage: string | null;
}

interface WizardChild {
  childId: string;
  nickname?: string | null;
  name?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  avatar?: string | null;
  likes?: string[];
  // 2026-07-31 v1.0 Phase A：24 字段透传（实际只透传到 assembler，按需消费）
  activities?: string[];
  dislikes?: string[];
  allergies?: string[];
  activeHoursPerDay?: number | null;
  needNap?: string;
  earlyOrLate?: string;
  hasMotionSickness?: boolean;
  isShyWithStrangers?: boolean;
  healthNotes?: string | null;
  hasStudentCard?: boolean;
  idCardPrefix?: string | null;
  needsChildTicket?: boolean;
  strollerWidthCm?: number | null;
  comfortableTempC?: string | null;
  fearsAnimals?: boolean;
  dietaryRestrictions?: string[];
  heightCm?: number | null;
  weightKg?: number | null;
}

interface MatchReason {
  type: string;
  text: string;
  weight: number;
}

interface SimilarGuide {
  id: string;
  title: string;
  cityName: string | null;
  days: number | null;
  childAges: number[];
  travelStyle: string | null;
  stats: { view: number; save: number; like: number };
  author: { nickname: string; avatar: string | null };
  matchScore: number;
  matchReasons: MatchReason[];
}

// 月龄 → monthlyFeedback 分桶 key（与 child-profile-aggregate.ts 对齐）
function bucketAgeMonths(months: number): string {
  if (months <= 6) return '0-6m';
  if (months <= 12) return '7-12m';
  if (months <= 24) return '13-24m';
  if (months <= 36) return '25-36m';
  if (months <= 60) return '37-60m';
  if (months <= 84) return '61-84m';
  if (months <= 120) return '85-120m';
  return '121m+';
}

// 从 guide.tags 提取可能的 spotType 中文标签（用于匹配 monthlyFeedback 的 key）
// monthlyFeedback key 示例：动物园、科技馆、博物馆、公园、游乐场、海洋馆 等
const SPOT_TYPE_TAG_MAP: Record<string, string[]> = {
  sight: ['景点', '名胜', '地标'],
  park: ['公园', '绿地', '植物园'],
  museum: ['博物馆', '科技馆'],
  science: ['科技馆', '科学中心'],
  aquarium: ['海洋馆', '水族馆', '动物园'],
  library: ['图书', '图书馆'],
  playground: ['游乐场', '主题公园'],
  restaurant: ['美食', '餐厅'],
  mall: ['商场', '购物'],
  hotel: ['酒店'],
};

function inferSpotTypesFromTags(tags: string[]): string[] {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const types: string[] = [];
  for (const keywords of Object.values(SPOT_TYPE_TAG_MAP)) {
    for (const kw of keywords) {
      if (tagSet.has(kw.toLowerCase())) {
        if (!types.includes(kw)) types.push(kw);
      }
    }
  }
  return types;
}

// ---------------------------------------------------------------------------
// 工具函数（pure）
// ---------------------------------------------------------------------------
const monthsFromBirth = (b: string | null | undefined): number | null => {
  if (!b) return null;
  const dt = new Date(b);
  if (isNaN(dt.getTime())) return null;
  const now = new Date();
  let m = (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth());
  if (now.getDate() < dt.getDate()) m -= 1;
  return Math.max(0, m);
};

const ageText = (months: number | null): string | null => {
  if (months == null) return null;
  if (months < 24) return `${months} 月`;
  const y = Math.floor(months / 12);
  const r = months % 12;
  return r === 0 ? `${y} 岁` : `${y} 岁 ${r} 月`;
};

const clamp = (min: number, max: number, v: number) => Math.max(min, Math.min(max, v));

const addDaysISO = (date: string, n: number): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const minToHHMM = (m: number): string => {
  const h = Math.floor(m / 60).toString().padStart(2, '0');
  const mm = (m % 60).toString().padStart(2, '0');
  return `${h}:${mm}`;
};

const tomorrowISO = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

// prefs → budgetLevel（与 assembler 派生一致）
const prefsToBudgetLevel = (p: StylePrefs): "economy" | "balanced" | "premium" => {
  if (p.moneySaver >= 7) return 'economy';
  if (p.comfort >= 7) return 'premium';
  return 'balanced';
};

// prefs → travelStyle（取最高权重维映射到 4 选 1）
const prefsToTravelStyle = (p: StylePrefs): "time_saver" | "money_saver" | "comfort" | "balanced" => {
  const arr: Array<[PrefKey, number]> = [
    ['timeSaver', p.timeSaver],
    ['moneySaver', p.moneySaver],
    ['comfort', p.comfort],
    ['uniqueness', p.uniqueness],
  ];
  arr.sort((a, b) => b[1] - a[1]);
  const max = arr[0]!;
  if (max[1] < 5) return 'balanced';
  if (max[0] === 'timeSaver') return 'time_saver';
  if (max[0] === 'moneySaver') return 'money_saver';
  if (max[0] === 'comfort') return 'comfort';
  return 'balanced';
};

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------
export default function SmartGuideLanding() {
  const router = useRouter();

  // ---- Section 1: 主题 ----
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set());

  // ---- Section 2: 出发城市 ----
  const [fromCity, setFromCity] = useState('');
  const [fromCityQuery, setFromCityQuery] = useState('');

  // ---- Section 3: 目的地 + 日期 ----
  const [cities, setCities] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [days, setDays] = useState(3);
  const [adults, setAdults] = useState(2);
  const [childrenCount, setChildrenCount] = useState(1);

  // ---- Section 4: 景点 ----
  // 多城按选中顺序逐城显示；删城后该城景点段消失
  const [placesByCity, setPlacesByCity] = useState<Record<string, PlaceOption[]>>({});
  const [loadingByCity, setLoadingByCity] = useState<Record<string, boolean>>({});
  const [pickedSpotIds, setPickedSpotIds] = useState<Set<string>>(new Set());
  const [placeFilter, setPlaceFilter] = useState('');

  // ---- Section 5: 孩子 ----
  const [authReady, setAuthReady] = useState(false);
  const [userChildren, setUserChildren] = useState<WizardChild[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());
  const [childAgeMonths, setChildAgeMonths] = useState(36);
  const hasUserChildren = !childrenLoading && authReady && userChildren.length > 0;

  // ---- Section 6: 偏好 ----
  const [prefs, setPrefs] = useState<StylePrefs>({
    timeSaver: 5, moneySaver: 5, comfort: 5, uniqueness: 5,
  });

  // ---- 认证 / 用户 ----
  const [userId, setUserId] = useState('');

  // ---- 结果区 state ----
  const [guides, setGuides] = useState<SimilarGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [directLoading, setDirectLoading] = useState(false);

  const [candidates, setCandidates] = useState<CandidateOutline[]>([]);
  const [cityNames, setCityNames] = useState<string[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [creatingId, setCreatingId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 副作用
  // ---------------------------------------------------------------------------
  // 默认 startDate = tomorrow
  useEffect(() => {
    setStartDate(tomorrowISO());
  }, []);

  // 加载真实孩子档案 + 监听 visibilitychange 重载
  const loadUserData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? getToken() : null;
    if (!token) { setUserId(''); setUserChildren([]); setAuthReady(true); return; }
    setChildrenLoading(true);
    try {
      const meRes = await authedFetch('/api/auth/me');
      const me = await meRes.json().catch(() => null);
      const uid: string | undefined = me?.data?.id ?? me?.user?.id ?? me?.id;
      if (uid) {
        setUserId(uid);
        const r = await authedFetch(`/api/user/children?userId=${uid}`);
        if (r.ok) {
          const j = await r.json().catch(() => null);
          const items: WizardChild[] = j?.data?.items ?? j?.items ?? [];
          setUserChildren(items);
          if (items.length > 0 && selectedChildIds.size === 0) {
            setSelectedChildIds(new Set([items[0]!.childId]));
            setChildrenCount(items.length);
          }
        }
      } else {
        setUserId('');
        setUserChildren([]);
      }
    } catch {
      // fallback
    } finally {
      setChildrenLoading(false);
      setAuthReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadUserData();

    // P-bug-fix：用户从 /profile/children 添加孩子返回 wizard 后重新拉 user
    const onFocus = () => loadUserData();
    const onVisible = () => { if (!document.hidden) loadUserData(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadUserData]);

  // 加载城市列表
  useEffect(() => {
    fetch(`${TRAVEL_API}/api/cities`)
      .then((r) => r.json())
      .then((d) => {
        const list: CityOption[] = (d?.data ?? d?.cities ?? []) as CityOption[];
        setCities(list);
      })
      .catch(console.error)
      .finally(() => setCitiesLoading(false));
  }, []);

  // 出发城市 localStorage 记忆（与 generate 页做法一致）
  useEffect(() => {
    try {
      const stored = localStorage.getItem('wizard:fromCity');
      if (stored) {
        setFromCity(stored);
        setFromCityQuery(stored);
      }
    } catch { /* ignore */ }
  }, []);
  const persistFromCity = (v: string) => {
    setFromCity(v);
    try { localStorage.setItem('wizard:fromCity', v); } catch { /* ignore */ }
  };

  // 选了目的地 → 按 selectedCityIds 逐城拉景点（多城：每城一段独立）
  const primaryCityId = selectedCityIds[0] ?? '';
  useEffect(() => {
    if (selectedCityIds.length === 0) {
      // 全部删空，清掉所有缓存
      setPlacesByCity({});
      setLoadingByCity({});
      return;
    }
    // 删城同步：placesByCity/loadingByCity 里多余 key 移除
    setPlacesByCity((prev) => {
      const next: Record<string, PlaceOption[]> = {};
      for (const id of selectedCityIds) if (prev[id]) next[id] = prev[id];
      if (Object.keys(next).length === Object.keys(prev).length) return prev;
      return next;
    });
    setLoadingByCity((prev) => {
      const next: Record<string, boolean> = {};
      for (const id of selectedCityIds) if (prev[id]) next[id] = prev[id];
      if (Object.keys(next).length === Object.keys(prev).length) return prev;
      return next;
    });
    // 拉还没拉的城（cache：placesByCity 里已有就跳过）
    for (const cityId of selectedCityIds) {
      if (placesByCity[cityId]) continue; // 已加载过
      setLoadingByCity((prev) => ({ ...prev, [cityId]: true }));
      fetch(`${TRAVEL_API}/api/places?cityId=${cityId}&sort=popular`)
        .then((r) => r.json())
        .then((d) => {
          const list: PlaceOption[] = (d?.data?.items ?? []) as PlaceOption[];
          setPlacesByCity((prev) => ({ ...prev, [cityId]: list }));
        })
        .catch(console.error)
        .finally(() =>
          setLoadingByCity((prev) => ({ ...prev, [cityId]: false })),
        );
    }
  // 只在 selectedCityIds 改变时触发；placesByCity 不进 deps（避免循环）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCityIds.join(',')]);

  // ---------------------------------------------------------------------------
  // 派生量
  // ---------------------------------------------------------------------------
  const primaryCity = cities.find((c) => c.id === primaryCityId);
  const endDate = startDate ? addDaysISO(startDate, days - 1) : '';
  const selectedMonths = useMemo(
    () =>
      Array.from(selectedChildIds)
        .map((id) => userChildren.find((c) => c.childId === id))
        .map((c) => monthsFromBirth(c?.birthDate))
        .filter((n): n is number => n !== null),
    [selectedChildIds, userChildren],
  );
  const representativeMonths = selectedMonths.length
    ? Math.round(selectedMonths.reduce((a, b) => a + b, 0) / selectedMonths.length)
    : childAgeMonths;
  const budgetLevel = prefsToBudgetLevel(prefs);
  const travelStyle = prefsToTravelStyle(prefs);

  const canSubmit = !loading && !directLoading && !generating && selectedCityIds.length > 0
    && !!startDate
    && (hasUserChildren ? selectedChildIds.size > 0 : true);

  const setDaysClamped = (n: number) => {
    if (!Number.isFinite(n)) return;
    setDays(clamp(DAY_MIN, DAY_MAX, Math.round(n)));
  };

  // 自动推荐天数（占位：UI 只提示，不动后端逻辑；用户在 Section 3 自己改）
  const autoRecommendedDays = useMemo(() => {
    if (selectedCityIds.length === 0) return null;
    const primarySpots = placesByCity[selectedCityIds[0]!]?.length ?? 0;
    const base = selectedCityIds.reduce((sum, id) => {
      const spots = placesByCity[id]?.length ?? primarySpots;
      return sum + Math.max(2, Math.round(spots * 0.4 + 1));
    }, 0);
    const overhead = selectedCityIds.length > 1 ? Math.ceil(0.5 * (selectedCityIds.length - 1)) : 0;
    return clamp(DAY_MIN, DAY_MAX, base + overhead);
  }, [selectedCityIds, placesByCity]);

  // ---------------------------------------------------------------------------
  // 候选候选筛选 + 子集显示
  // ---------------------------------------------------------------------------
  // 所有城景点拉平 → 用于 placeFilter 和 pickedSpotTypeKeywords 派生
  const allLoadedPlaces = useMemo(
    () => selectedCityIds.flatMap((id) => placesByCity[id] ?? []),
    [selectedCityIds, placesByCity],
  );
  const filteredPlaces = useMemo(() => {
    if (!placeFilter) return allLoadedPlaces;
    return allLoadedPlaces.filter((p) =>
      (p.typeLabel ?? p.type).toLowerCase().includes(placeFilter.toLowerCase()),
    );
  }, [allLoadedPlaces, placeFilter]);

  // 已选 spot 对应的 type 关键词集合（跨城聚合）
  const pickedSpotTypeKeywords = useMemo(() => {
    const keywords = new Set<string>();
    Array.from(pickedSpotIds).forEach((id) => {
      const p = allLoadedPlaces.find((x) => x.id === id);
      if (!p) return;
      (SPOT_TYPE_KEYWORDS[p.type] ?? []).forEach((k) => keywords.add(k.toLowerCase()));
      (SPOT_TYPE_KEYWORDS[p.typeLabel] ?? []).forEach((k) => keywords.add(k.toLowerCase()));
    });
    return Array.from(keywords);
  }, [pickedSpotIds, allLoadedPlaces]);

  // 是否有任何城正在加载
  const anyPlaceLoading = useMemo(
    () => Object.values(loadingByCity).some(Boolean),
    [loadingByCity],
  );

  // ---------------------------------------------------------------------------
  // 行为：searchSimilar + fork + assemble + create plan
  // ---------------------------------------------------------------------------
  async function searchSimilar() {
    if (!primaryCity || !startDate) return;
    setLoading(true);
    setGuides([]);
    try {
      // Phase D：预拉选中孩子的感受画像（用于 child_feeling 维度加权）
      const selectedChildren = Array.from(selectedChildIds)
        .map((id) => userChildren.find((c) => c.childId === id))
        .filter(Boolean) as WizardChild[];
      let childFeelingProfiles: Map<string, NonNullable<Awaited<ReturnType<typeof getChildFeelingProfile>>>> = new Map();
      if (selectedChildren.length > 0) {
        const results = await Promise.allSettled(
          selectedChildren.map((c) => getChildFeelingProfile(c.childId)),
        );
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value && r.value.totalDataPoints > 0) {
            childFeelingProfiles.set(selectedChildren[i]!.childId, r.value);
          }
        });
      }
      const hasFeelingData = childFeelingProfiles.size > 0;

      // 拉 1 页 50（最多）
      const r = await fetch(`${TRAVEL_API}/api/guides/feed?pageSize=50`);
      const d = await r.json();
      const all: any[] = d.items ?? [];

      // 硬过滤 cityName
      let filtered = all;
      let cityFallbackUsed = false;
      if (primaryCity.name) {
        filtered = all.filter((g: any) => g.cityName === primaryCity.name);
        if (filtered.length === 0) {
          filtered = all;
          cityFallbackUsed = true;
        }
      }

      // 算分 + Phase D child_feeling 维度
      const scored: SimilarGuide[] = filtered.map((g: any) => {
        let score = 0;
        const reasons: MatchReason[] = [];

        if (!cityFallbackUsed && g.cityName === primaryCity.name) {
          score += 50;
          reasons.push({ type: 'city', text: '同城市', weight: 50 });
        }
        if (g.days && Math.abs(g.days - days) <= 1) {
          score += 25;
          reasons.push({ type: 'days', text: `天数相近（${g.days} 天）`, weight: 25 });
        }
        if (g.childAges?.length) {
          const ageDiff = Math.min(...g.childAges.map((a: number) => Math.abs(a - representativeMonths)));
          if (ageDiff <= 12) {
            score += 25;
            reasons.push({ type: 'childAges', text: `孩子月龄相近（${Math.floor(Math.min(...g.childAges) / 12)} 岁）`, weight: 25 });
          } else if (ageDiff <= 24) {
            score += 10;
          }
        }
        if (g.travelStyle === travelStyle) {
          score += 10;
          reasons.push({ type: 'travelStyle', text: '旅行风格匹配', weight: 10 });
        }
        // 主题关键词命中 → +5/项，封顶 +20
        if (selectedThemes.size > 0 && Array.isArray(g.tags)) {
          const tagSet = new Set((g.tags as string[]).map((t) => String(t).toLowerCase()));
          let themeBonus = 0;
          const matchedTags: string[] = [];
          for (const key of Array.from(selectedThemes)) {
            const kws = THEME_KEYWORDS[key] ?? [];
            for (const kw of kws) {
              if (tagSet.has(kw.toLowerCase())) {
                themeBonus += 5;
                if (!matchedTags.includes(kw)) matchedTags.push(kw);
                break; // 每个 chip 只算一次
              }
            }
            if (themeBonus >= 20) break;
          }
          themeBonus = Math.min(themeBonus, 20);
          if (themeBonus > 0) {
            score += themeBonus;
            reasons.push({ type: 'theme', text: `主题相似 · ${matchedTags.slice(0, 2).join('、')}`, weight: themeBonus });
          }
        }
        // 已选景点 type 关键词 → +3/项，封顶 +15
        if (pickedSpotTypeKeywords.length > 0 && Array.isArray(g.tags)) {
          const tagSet = new Set((g.tags as string[]).map((t) => String(t).toLowerCase()));
          let spotBonus = 0;
          const matched: string[] = [];
          for (const kw of pickedSpotTypeKeywords) {
            if (tagSet.has(kw)) {
              spotBonus += 3;
              matched.push(kw);
            }
            if (spotBonus >= 15) break;
          }
          if (spotBonus > 0) {
            score += spotBonus;
            reasons.push({ type: 'spotType', text: `去过相似类 · ${matched.slice(0, 2).join('、')}`, weight: spotBonus });
          }
        }

        // ---- Phase D：child_feeling_profile 维度 ----
        if (hasFeelingData && Array.isArray(g.tags)) {
          const guideSpotTypes = inferSpotTypesFromTags(g.tags);
          let childFeelingBonus = 0;
          const feelingReasons: string[] = [];
          childFeelingProfiles.forEach((profile) => {
            const childAgeBucket = bucketAgeMonths(representativeMonths);
            const monthFeedback = (profile.monthlyFeedback as Record<string, any>) ?? {};
            const bucketData = monthFeedback[childAgeBucket];
            if (!bucketData) return;
            // 统计 guide 中同月龄高评的 spotType 数量
            const highRatedTypes: string[] = [];
            for (const st of guideSpotTypes) {
              const spotData = bucketData[st];
              if (spotData && spotData.avgScore >= 3.5 && spotData.count >= 1) {
                highRatedTypes.push(st);
                childFeelingBonus += 8; // 每项 +8，合理的 bonus
              }
            }
            childFeelingBonus = Math.min(childFeelingBonus, 30); // 封顶 30
            if (highRatedTypes.length > 0) {
              feelingReasons.push(
                `${Math.floor(representativeMonths / 12)}岁孩子评 ${highRatedTypes.length} 类高分`,
              );
            }
          });
          if (childFeelingBonus > 0) {
            score += childFeelingBonus;
            reasons.push({
              type: 'childFeeling',
              text: feelingReasons.join('；'),
              weight: childFeelingBonus,
            });
          }
        }

        return {
          id: g.id,
          title: g.title,
          cityName: g.cityName,
          days: g.days,
          childAges: g.childAges ?? [],
          travelStyle: g.travelStyle,
          stats: { view: g.stats?.view ?? 0, save: g.stats?.save ?? 0, like: g.stats?.like ?? 0 },
          author: { nickname: g.author?.nickname ?? '匿名', avatar: g.author?.avatar ?? null },
          matchScore: score,
          matchReasons: reasons.length ? reasons : [{ type: 'default', text: '弱匹配', weight: 0 }],
        };
      });

      const sortedGuides = scored
        .filter((g) => g.matchScore >= 40)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 6);
      setGuides(sortedGuides);
    } catch (e) {
      console.error(e);
      setGenError('查询相似攻略失败');
    } finally {
      setLoading(false);
    }
  }

  async function forkGuide(guideId: string) {
    setForkingId(guideId);
    try {
      const res = await authedFetch(`${TRAVEL_API}/api/guides/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  }

  async function directGenerate() {
    if (selectedCityIds.length === 0 || !startDate) return;
    setDirectLoading(true);
    setGenError('');
    setCandidates([]);

    // P-bug-fix：未选孩子时给出友好引导，而不是默默用 guest 占位
    const token = typeof window !== 'undefined' ? getToken() : null;
    if (!token) {
      // P-bug-fix：登录后跳回 wizard 继续填表
      router.push('/login?redirect=' + encodeURIComponent('/wizard') + '&fromIntent=generate-plan');
      return;
    }
    if (!userId || selectedChildIds.size === 0) {
      const ok = window.confirm(
        '这次出行还没选孩子。去「个人中心」添加孩子后，wizard 会按孩子真实月龄匹配更合适的行程。\n\n确定要去添加吗？'
      );
      if (ok) {
        router.push('/profile/children?returnTo=/wizard');
        setDirectLoading(false);
        return;
      }
      // 用户取消 → 不生成
      setDirectLoading(false);
      return;
    }

    // P-bug-fix：提前检查所选城市是否都有景点
    const citiesWithSpots = selectedCityIds.filter(
      (id) => (placesByCity[id]?.length ?? 0) > 0
    );
    if (citiesWithSpots.length === 0) {
      const cityNames = selectedCityIds
        .map((id) => cities.find((c) => c.id === id)?.name ?? id)
        .join('、');
      setGenError(`所选城市「${cityNames}」暂无景点数据，请换一城（试试：北京 / 上海 / 广州）`);
      setDirectLoading(false);
      return;
    }
    // 把没数据的城踢掉
    if (citiesWithSpots.length !== selectedCityIds.length) {
      setSelectedCityIds(citiesWithSpots);
    }

    // childProfiles 从真实孩子档案映射（v1.0 Phase A：22 字段全透传，无孩子时用 guest 占位）
    const childProfiles = selectedChildIds.size > 0
      ? Array.from(selectedChildIds)
        .map((id) => userChildren.find((c) => c.childId === id))
        .filter((c): c is WizardChild => !!c)
        .map((c) => ({
          childId: c.childId,
          name: c.nickname ?? c.name ?? '宝宝',
          birthDate: c.birthDate ?? undefined,
          likes: c.likes ?? [],
          activities: c.activities ?? [],
          dislikes: c.dislikes ?? [],
          allergies: c.allergies ?? [],
          activeHoursPerDay: c.activeHoursPerDay ?? undefined,
          needNap: c.needNap as any,
          earlyOrLate: c.earlyOrLate as any,
          hasMotionSickness: c.hasMotionSickness ?? false,
          isShyWithStrangers: c.isShyWithStrangers ?? false,
          healthNotes: c.healthNotes ?? undefined,
          hasStudentCard: c.hasStudentCard ?? false,
          idCardPrefix: c.idCardPrefix ?? undefined,
          needsChildTicket: c.needsChildTicket ?? true,
          strollerWidthCm: c.strollerWidthCm ?? undefined,
          comfortableTempC: c.comfortableTempC ?? undefined,
          fearsAnimals: c.fearsAnimals ?? false,
          dietaryRestrictions: c.dietaryRestrictions ?? [],
          heightCm: c.heightCm ?? undefined,
          weightKg: c.weightKg ?? undefined,
        }))
      : [{ childId: 'guest', name: '宝宝', likes: [] as string[] }];

    try {
      // 没 userId 就用 'guest'（handler 不验）
      const finalUserId = userId || 'guest';
      // childProfiles 用筛选后的 citiesWithSpots 重发
      const payload = {
        userId: finalUserId,
        cityId: citiesWithSpots[0],
        cities: citiesWithSpots,            // 多城：发给后端做拼接
        startDate,
        endDate,
        travelers: { adults, children: childrenCount },
        childProfiles,
        budgetLevel,
        preferredSpotTypes: selectedThemes.size > 0 ? Array.from(selectedThemes) : undefined,
      };
      const res = await fetch(`${TRAVEL_API}/api/wizard/assemble`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) {
        setGenError(j?.error?.message ?? `assemble 失败（${res.status}）`);
        return;
      }
      const cs: CandidateOutline[] = j.candidates ?? [];
      if (cs.length === 0) {
        setGenError('未能生成候选方案，请调整天数或目的地');
        return;
      }
      setCandidates(cs);
      // cityNames：从 primaryCity 名 + 其他城名倒推
      const allNames = selectedCityIds.map((id) => cities.find((c) => c.id === id)?.name ?? '');
      setCityNames(allNames);
      setSelectedCandidate(0);
      // 滚动到结果区
      setTimeout(() => {
        document.getElementById('candidates-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (e) {
      console.error(e);
      setGenError('生成失败：' + (e as Error).message);
    } finally {
      setDirectLoading(false);
    }
  }

  async function createPlanFromCandidate(candIdx: number) {
    const cand = candidates[candIdx];
    if (!cand) return;
    setGenerating(true);
    setGenError('');
    try {
      const finalUserId = userId || 'guest';
      const childAges = selectedChildIds.size > 0
        ? Array.from(selectedChildIds)
          .map((id) => userChildren.find((c) => c.childId === id))
          .map((c) => monthsFromBirth(c?.birthDate))
          .filter((n): n is number => n !== null)
        : [representativeMonths];
      const res = await fetch(`${TRAVEL_API}/api/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: finalUserId,
          cityId: primaryCityId,
          cityIds: selectedCityIds,
          cityNames,
          startDate,
          endDate,
          travelers: { adults, children: childrenCount },
          childAges,
          travelStyle: cand.style,
          status: 'draft',
          candidateLabel: cand.label,
          timelineBlocks: cand.days,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setGenError(j?.error?.message ?? `创建失败（${res.status}）`);
        return;
      }
      if (j?.id) {
        setCreatingId(j.id);
        router.push(`/plan/${j.id}`);
      }
    } catch (e) {
      setGenError('网络错误：' + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------
  function toggleTheme(key: string) {
    const next = new Set(selectedThemes);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedThemes(next);
  }
  function toggleCity(id: string) {
    setSelectedCityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  function togglePickSpot(id: string) {
    const next = new Set(pickedSpotIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPickedSpotIds(next);
  }
  function toggleChild(id: string) {
    const next = new Set(selectedChildIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedChildIds(next);
  }

  // ---------------------------------------------------------------------------
  // 渲染
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">🪄 智能攻略</h1>
          <p className="text-blue-100 mt-1">一次填完 6 项，看大家怎么玩 · 或直接让走天下帮你算</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {/* ====================== Section 1 · 主题 ====================== */}
        <Section title="① 主题" subtitle="想要什么类型的体验？可多选">
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => {
              const checked = selectedThemes.has(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggleTheme(t.key)}
                  title={t.desc}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                    checked ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ====================== Section 2 · 出发城市 ====================== */}
        <Section title="② 出发城市" subtitle="你们从哪座城出发？（用于推荐返程交通；本字段未直接接入行程生成）">
          <input
            type="text"
            value={fromCityQuery}
            onChange={(e) => setFromCityQuery(e.target.value)}
            onBlur={() => persistFromCity(fromCityQuery.trim())}
            placeholder="例：北京、上海、广州…"
            className="w-full sm:w-96 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
          {fromCity && (
            <p className="text-xs text-gray-400 mt-2">已记：{fromCity}</p>
          )}
        </Section>

        {/* ====================== Section 3 · 目的地 + 日期 ====================== */}
        <Section title="③ 目的地 + 日期" subtitle="想去哪几城？按点击顺序拼接 · 自动算每城天数">
          {citiesLoading ? (
            <p className="text-xs text-gray-400">正在读取亲子宝典…</p>
          ) : cities.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              暂未加载到城市，请稍后再试。
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2">
                {cities.map((c) => {
                  const checked = selectedCityIds.includes(c.id);
                  const idx = selectedCityIds.indexOf(c.id);
                  // P-bug-fix：拉过景点且是 0 条 → 标注"暂无数据"
                  const loaded = Object.prototype.hasOwnProperty.call(placesByCity, c.id);
                  const spotCount = placesByCity[c.id]?.length ?? 0;
                  const noData = loaded && spotCount === 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={noData}
                      onClick={() => !noData && toggleCity(c.id)}
                      title={noData ? `${c.name} 暂无景点数据` : (c.kidHook ?? c.name)}
                      className={`pl-3 pr-3 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap flex items-center gap-2 ${
                        noData
                          ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                          : checked
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{c.province ? `${c.province} · ${c.name}` : c.name}</span>
                      {noData && <span className="text-[10px] text-gray-400">暂无数据</span>}
                      {checked && (
                        <span className="ml-1 px-1.5 rounded-full bg-white/30 text-[10px] font-bold">
                          {idx + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                已选顺序：
                {selectedCityIds.length === 0
                  ? '（暂无）'
                  : selectedCityIds
                      .map((id, i) => `${i + 1}. ${cities.find((c) => c.id === id)?.name ?? '?'}`)
                      .join('  →  ')}
              </p>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* 日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出发日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">返程：{endDate || '—'}</p>
            </div>

            {/* 天数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                玩几天？ <span className="text-xs text-gray-400 font-normal">{DAY_MIN}–{DAY_MAX} 天</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDaysClamped(days - 1)}
                  disabled={days <= DAY_MIN}
                  aria-label="减少一天"
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >−</button>
                <input
                  type="number"
                  min={DAY_MIN}
                  max={DAY_MAX}
                  value={days}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n)) setDaysClamped(n);
                  }}
                  className="w-20 text-center px-2 py-1 border border-gray-200 rounded-lg text-base font-bold focus:outline-none focus:border-blue-500"
                />
                <span className="text-gray-600 text-sm">天</span>
                <button
                  type="button"
                  onClick={() => setDaysClamped(days + 1)}
                  disabled={days >= DAY_MAX}
                  aria-label="增加一天"
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >＋</button>
              </div>
              {autoRecommendedDays != null && Math.abs(autoRecommendedDays - days) > 0 && (
                <button
                  type="button"
                  onClick={() => setDays(autoRecommendedDays)}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  系统推荐 {autoRecommendedDays} 天（每城按景点密度启发）→
                </button>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {DAY_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`px-2.5 py-0.5 rounded-full text-xs transition ${
                      days === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >{d} 天</button>
                ))}
              </div>
            </div>

            {/* 出行人数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出行人数</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">大人</span>
                <button
                  type="button"
                  onClick={() => setAdults(Math.max(1, adults - 1))}
                  aria-label="减少大人"
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40"
                  disabled={adults <= 1}
                >−</button>
                <span className="w-8 text-center font-bold">{adults}</span>
                <button
                  type="button"
                  onClick={() => setAdults(Math.min(10, adults + 1))}
                  aria-label="增加大人"
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                >＋</button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500 w-12">小孩</span>
                <button
                  type="button"
                  onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                  aria-label="减少小孩"
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40"
                  disabled={childrenCount <= 0}
                >−</button>
                <span className="w-8 text-center font-bold">{childrenCount}</span>
                <button
                  type="button"
                  onClick={() => setChildrenCount(Math.min(10, childrenCount + 1))}
                  aria-label="增加小孩"
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                >＋</button>
              </div>
            </div>
          </div>
        </Section>

        {/* ====================== Section 4 · 景点 ====================== */}
        <Section title="④ 想去哪些景点" subtitle="按选中顺序逐城展示 · 已选会用于匹配相似攻略 · 完整跨城景点锁定 PR2 加入">
          {selectedCityIds.length === 0 ? (
            <p className="text-sm text-gray-400">请先在第 ③ 项选目的地。</p>
          ) : (
            <>
              <input
                type="text"
                value={placeFilter}
                onChange={(e) => setPlaceFilter(e.target.value)}
                placeholder="按类目筛选（如：景点、餐厅）…"
                className="w-full sm:w-80 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 mb-3"
              />
              <div className="space-y-4">
                {selectedCityIds.map((cityId, idx) => {
                  const city = cities.find((c) => c.id === cityId);
                  const cityName = city?.name ?? cityId;
                  const cityPlaces = placesByCity[cityId];
                  const isLoading = loadingByCity[cityId];
                  return (
                    <div key={cityId} className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-900">
                          <span className="inline-block w-6 h-6 mr-2 rounded-full bg-blue-600 text-white text-xs leading-6 text-center">
                            {idx + 1}
                          </span>
                          {cityName} 景点
                          {cityPlaces && (
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              {cityPlaces.length} 个
                            </span>
                          )}
                        </h3>
                      </div>
                      {isLoading ? (
                        <p className="text-xs text-gray-400 py-4">正在读取 {cityName} 的景点…</p>
                      ) : !cityPlaces ? (
                        <p className="text-xs text-gray-400 py-4">点击此处上方 chip 触发加载</p>
                      ) : cityPlaces.length === 0 ? (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                          {cityName} 暂无景点数据。
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {cityPlaces
                            .filter((p) =>
                              placeFilter
                                ? (p.typeLabel ?? p.type)
                                    .toLowerCase()
                                    .includes(placeFilter.toLowerCase())
                                : true,
                            )
                            .map((p) => {
                              const checked = pickedSpotIds.has(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => togglePickSpot(p.id)}
                                  className={`text-left bg-white rounded-xl p-3 transition border-2 relative ${
                                    checked
                                      ? 'border-blue-500 ring-2 ring-blue-100 shadow-md'
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
                                  >{checked ? '✓' : ''}</span>
                                  <div className="text-xs text-blue-600 font-medium mb-1">{p.typeLabel}</div>
                                  <div className="font-bold text-gray-900 text-sm truncate">{p.name}</div>
                                  {p.kidHighlights && (
                                    <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                                      {p.kidHighlights}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-amber-500 mt-1">★ {p.rating.toFixed(1)}</div>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-400">已选 {pickedSpotIds.size} 个（跨城总计数）</p>
            </>
          )}
        </Section>

        {/* ====================== Section 5 · 孩子 ====================== */}
        <Section title="⑤ 这次出行带哪个孩子" subtitle="影响孩子月龄匹配 · 至少选 1 个（如有真实孩子）">
          {hasUserChildren ? (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs text-gray-400">可多选 · 也可去个人中心管理</span>
                <Link href="/profile/children" className="text-xs text-blue-600 hover:text-blue-700 underline">
                  去个人中心管理 →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {userChildren.map((c) => {
                  const months = monthsFromBirth(c.birthDate);
                  const txt = ageText(months);
                  const initials = (c.nickname ?? c.name ?? '宝')[0];
                  const checked = selectedChildIds.has(c.childId);
                  return (
                    <button
                      key={c.childId}
                      type="button"
                      onClick={() => toggleChild(c.childId)}
                      className={`text-left bg-white rounded-2xl p-3 transition border-2 relative ${
                        checked ? 'border-blue-500 ring-4 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          checked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'
                        }`}
                      >{checked ? '✓' : ''}</span>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg font-bold overflow-hidden mb-2">
                        {c.avatar ? <img src={c.avatar} alt="" className="w-12 h-12 object-cover" /> : initials}
                      </div>
                      <div className="font-bold text-gray-900 text-sm truncate">
                        {c.nickname ?? c.name ?? '未命名'}
                        {c.gender === 'male' && <span className="ml-1 text-blue-600">♂</span>}
                        {c.gender === 'female' && <span className="ml-1 text-pink-500">♀</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{txt ?? '未填生日'}</div>
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
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs text-gray-400">登录后可自动读取真实孩子档案</span>
                {authReady && (
                  <Link href="/profile/children?returnTo=/wizard" className="text-xs text-blue-600 hover:text-blue-700 underline">
                    去个人中心添加真实孩子 →
                  </Link>
                )}
              </div>
              {!authReady || childrenLoading ? (
                <p className="text-xs text-gray-400">正在读取个人中心的孩子档案…</p>
              ) : (
                <>
                  <div className="mb-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    💡 还没添加孩子？先去
                    <a href="/profile/children?returnTo=/wizard" className="text-blue-600 underline mx-1">个人中心</a>
                    添加，wizard 会自动按孩子真实月龄匹配行程。
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
                      >{a.l}</button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </Section>

        {/* ====================== Section 6 · 偏好 ====================== */}
        <Section title="⑥ 想要什么风格" subtitle="4 个维度，0–10 滑杆 · 权重越高越侧重 · 派生 budget = economy/balanced/premium">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PREFS.map((p) => (
              <div key={p.key} className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{p.label}</span>
                  <span className="text-sm font-bold text-blue-600">{prefs[p.key]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={prefs[p.key]}
                  onChange={(e) => setPrefs({ ...prefs, [p.key]: Number(e.target.value) })}
                  className="w-full"
                />
                <p className="text-[11px] text-gray-400 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            当前倾向：<span className="font-bold text-blue-600">{travelStyle}</span>
            {' · '}预算级别：<span className="font-bold text-blue-600">{budgetLevel}</span>
          </p>
        </Section>

        {/* ====================== 双 CTA ====================== */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <p className="text-sm text-gray-500 mb-2 text-center">选好就行动 ↓</p>
          <p className="text-xs text-gray-400 text-center mb-4">
            当前：{selectedCityIds.length} 座城 · {days} 天 · {cities.find((c) => c.id === primaryCityId)?.name ?? '—'}（首站）
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <span>{directLoading ? '生成中…' : '直接生成计划'}</span>
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400 text-center">
            「直接生成计划」需要先登录账号（走天下会自动保存您的出行方案）
          </p>
        </div>

        {/* ====================== GenError 显示 ====================== */}
        {genError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-3 text-sm">
            ⚠️ {genError}
          </div>
        )}

        {/* ====================== 相似攻略结果面板 ====================== */}
        {(loading || guides.length > 0) && (
          <Section title="🎯 相似攻略" subtitle="按 城市 · 天数 · 孩子月龄 · 主题关键词 · 风格 · 孩子感受画像 算分（来自 1 页 50 个候选）">
            {loading && <p className="text-sm text-gray-400">查找中…</p>}
            {!loading && guides.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-dashed">
                <div className="text-3xl mb-2">🤷</div>
                <div className="text-gray-500">没有找到相似攻略</div>
                <div className="text-sm text-gray-400 mt-1">可调整天数/主题，或直接生成新计划</div>
              </div>
            )}
            {!loading && guides.length > 0 && (
              <div className="space-y-3">
                {guides.map((g) => (
                  <article key={g.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">📍 {g.cityName ?? '未选'}</span>
                          {g.days && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded">{g.days} 天</span>}
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">🎯 {g.matchScore}% 匹配</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base mb-1">{g.title}</h3>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {g.matchReasons.map((r, idx) => (
                            <span
                              key={idx}
                              className={`inline-block text-xs px-2 py-0.5 rounded ${
                                r.type === 'childFeeling'
                                  ? 'bg-pink-50 text-pink-700'
                                  : r.type === 'city'
                                  ? 'bg-blue-50 text-blue-700'
                                  : r.type === 'days' || r.type === 'childAges'
                                  ? 'bg-green-50 text-green-700'
                                  : r.type === 'theme' || r.type === 'spotType'
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'bg-gray-50 text-gray-600'
                              }`}
                            >
                              {r.text}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">👩 {g.author.nickname}</span>
                          <span className="text-gray-400 text-xs">👍 {g.stats.like} ⭐ {g.stats.save}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <Link
                        href={`/guides/${g.id}`}
                        className="flex-1 text-center py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >👀 看真实评价</Link>
                      <button
                        onClick={() => forkGuide(g.id)}
                        disabled={forkingId === g.id}
                        className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:shadow-md"
                      >{forkingId === g.id ? '生成中…' : '✨ 用这个做我的计划'}</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ====================== 候选方案面板 ====================== */}
        {(candidates.length > 0 || directLoading) && (
          <div id="candidates-panel" className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-gray-900">✨ 走天下为你生成了 {candidates.length} 套方案</h2>
              <p className="text-xs text-gray-400">
                {cityNames.join(' → ')} · 共 {candidates[0]?.totalDays ?? 0} 天
              </p>
            </div>
            {directLoading && candidates.length === 0 && (
              <p className="text-sm text-gray-400">正在拼装行程…</p>
            )}
            <div className="space-y-3">
              {candidates.map((c, idx) => {
                const checked = selectedCandidate === idx;
                return (
                  <div
                    key={`${c.style}-${c.rhythm}-${idx}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCandidate(idx)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedCandidate(idx); }}
                    className={`relative bg-white rounded-2xl shadow-sm border-2 p-5 transition cursor-pointer ${
                      checked ? 'border-blue-500 ring-4 ring-blue-100 bg-blue-50/30' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {/* PR3 用户答复：候选加「查看详情」按钮跳到 /plan/preview
                        P-bug-fix：c= 太长（base64 候选 JSON > 8KB）导致 414
                        改用 sessionStorage 存候选（避免 URL 超长），仅传 idx 让 preview 读 storage */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          sessionStorage.setItem(
                            `wizard:candidate:${idx}`,
                            JSON.stringify(c)
                          );
                        } catch (err) {
                          // storage 满 / 不可用 → 走 URL fallback
                          const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(c))))
                            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                          window.location.href = `/plan/preview?c=${encoded}&i=${idx}`;
                          return;
                        }
                        window.location.href = `/plan/preview?i=${idx}`;
                      }}
                      className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-3.5 py-1.5 rounded-full shadow-md hover:shadow-lg transition"
                    >
                      👁 查看详情
                    </button>
                    <div className="flex items-start justify-between gap-2 mb-2 pr-24">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">{c.label}</h3>
                        <span className="mt-1 inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{c.style}</span>
                      </div>
                      {checked && <span className="text-blue-600 font-bold">✓ 已选</span>}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{c.whyThisPlan}</p>
                    {/* 2026-07-31 v1.0 Phase A：孩子画像定制提示 */}
                    <ChildProfileHints hints={c.childProfileHints} max={4} />
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                      <span>📅 {c.totalDays} 天</span>
                      <span>⏰ {c.totalActiveHours} 小时活动</span>
                      <span>💰 约 ¥{Math.round(c.totalCostCents / 100)}</span>
                    </div>

                    {/* 多城时显示转场概要 */}
                    {cityNames.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-bold text-gray-700 mb-2">跨城转场概要：</p>
                        <div className="space-y-1 text-xs text-gray-600">
                          {c.days
                            .flatMap((d) => d.blocks)
                            .filter((b: TimelineBlock) => b.kind === 'transit')
                            .map((t: TimelineBlock, i: number) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-blue-600">→</span>
                                <span>{t.title}</span>
                                {t.notes && <span className="text-gray-400">（{t.notes}）</span>}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* 折叠每天详情 */}
                    <details className="mt-3">
                      <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">查看每日详细安排</summary>
                      <div className="mt-2 space-y-2 max-h-96 overflow-y-auto">
                        {c.days.map((d: TimelineDay) => (
                          <div key={d.dayIndex} className="bg-gray-50 rounded-lg p-2 text-xs">
                            <div className="font-bold text-gray-800 mb-1">
                              Day {d.dayIndex}（{d.date}，{cityNames.find((_, i) => cityNames.length === 1 || i < c.days.length) ?? ''}）
                            </div>
                            <div className="space-y-1 text-gray-600">
                              {d.blocks.map((b: TimelineBlock) => (
                                <div key={b.blockId} className="flex items-center gap-2">
                                  <span className="text-gray-400 w-12">{minToHHMM(b.startMinutes)}</span>
                                  <span className={
                                    b.kind === 'transit' ? 'text-orange-600'
                                    : b.kind === 'hotel' ? 'text-purple-600'
                                    : b.kind === 'restaurant' ? 'text-pink-600'
                                    : b.kind === 'rest' ? 'text-gray-500'
                                    : 'text-blue-600'
                                  }>
                                    {b.kind === 'transit' ? '🚄' :
                                     b.kind === 'hotel' ? '🏨' :
                                     b.kind === 'restaurant' ? '🍽️' :
                                     b.kind === 'rest' ? '😴' : '🎯'}
                                  </span>
                                  <span className="flex-1 truncate">{b.title}</span>
                                  {b.kind === 'hotel' && b.kidHook && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                                      {b.kidHook}
                                    </span>
                                  )}
                                  {b.notes && <span className="text-[10px] text-gray-400">{b.notes}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-5">
              {genError && (
                <p className="text-sm text-red-600 mb-2">⚠️ {genError}</p>
              )}
              <button
                onClick={() => createPlanFromCandidate(selectedCandidate)}
                disabled={generating || candidates.length === 0 || !!creatingId}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {generating
                  ? '正在创建行程…'
                  : creatingId
                    ? '已创建，跳转中…'
                    : `用「${candidates[selectedCandidate]?.label ?? ''}」创建我的行程`}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                注意：交通时长为估值，PR2 起接入 12306/AMAP 真实数据
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Section helper
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}
      {children}
    </section>
  );
}
