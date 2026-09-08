// /profile/footprints — 足迹地图 v2.3 真实地图版（AMAP_JS_KEY 已落地 2026-09-07）
//
// 顶部：高德 JS API 交互式地图（marker + 三态着色 + 弹窗）
// 中部：城市 chip 网格 + tab 切换（保留轻量版逻辑）
// 下方：时间线（按年/月倒序）
// 操作：添加足迹（城市级）弹层表单 → POST /api/footprints

'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { MapPinIcon, PlusIcon, CloseIcon } from '@/components/Icons';
import { getToken, authedFetch } from '@/lib/auth';

// 高德地图容器：仅客户端加载（AMAP JS API 需 window）
const FootprintMap = dynamic(() => import('@/components/FootprintMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full rounded-2xl border border-gray-100 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-gray-500 text-sm">
      地图加载中…
    </div>
  ),
});

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface Footprint {
  id: string;
  childId: string | null;
  cityId: string | null;
  spotId: string | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  state: 'visited' | 'wishlist' | 'child_wishlist';
  source: string;
  sourceId: string | null;
  checkinAt: string | null;
  note: string | null;
  visibility: string;
  createdAt: string;
}

interface CityMini {
  id: string;
  name: string;
}

interface Child {
  childId: string;
  name?: string | null;
}

const STATE_LABEL: Record<string, string> = {
  visited: '已去过',
  wishlist: '想去',
  child_wishlist: '孩子想去',
};
const STATE_TINT: Record<string, { dot: string; ring: string; chip: string; bg: string; label: string }> = {
  visited: {
    dot: 'bg-blue-600',
    ring: 'ring-blue-500',
    chip: 'bg-blue-100 text-blue-700 border-blue-300',
    bg: 'bg-blue-50',
    label: '已去过',
  },
  wishlist: {
    dot: 'bg-amber-500',
    ring: 'ring-amber-400',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    bg: 'bg-amber-50',
    label: '想去',
  },
  child_wishlist: {
    dot: 'bg-pink-500',
    ring: 'ring-pink-400',
    chip: 'bg-pink-50 text-pink-700 border-pink-200',
    bg: 'bg-pink-50',
    label: '孩子想去',
  },
};

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'visited', label: '已去过' },
  { key: 'wishlist', label: '想去' },
  { key: 'child_wishlist', label: '孩子想去' },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function FootprintsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; nickname: string; avatar: string | null } | null>(null);
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [cities, setCities] = useState<CityMini[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 添加表单
  const [addState, setAddState] = useState<'visited' | 'wishlist' | 'child_wishlist'>('visited');
  const [addCityId, setAddCityId] = useState<string>('');
  const [addChildId, setAddChildId] = useState<string>('');
  const [addNote, setAddNote] = useState<string>('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login?redirect=/profile/footprints'); return; }
    void loadAll(token);
  }, [router]);

  async function loadAll(token: string) {
    setLoading(true);
    try {
      // 1) 个人信息
      const meRes = await fetch('/api/auth/me', { headers: { authorization: `Bearer ${token}` } });
      const meJson = await meRes.json();
      setUser(meJson?.data ?? meJson?.user ?? meJson);

      // 2) 足迹列表
      const fpRes = await authedFetch(`${TRAVEL_API}/api/footprints`, token);
      const fpJson = await fpRes.json();
      if (fpJson?.code === 'OK') setFootprints(fpJson.data?.items ?? []);

      // 3) 城市列表（简版：只拿 id+name）
      const cityRes = await fetch(`${TRAVEL_API}/api/cities`);
      const cityJson = await cityRes.json();
      const rawCities = cityJson?.data?.items ?? cityJson?.data?.cities ?? cityJson?.items ?? cityJson ?? [];
      if (Array.isArray(rawCities)) {
        setCities(rawCities.map((c: any) => ({ id: c.id, name: c.name })));
      }

      // 4) 孩子列表
      try {
        const childRes = await authedFetch(`${TRAVEL_API}/api/user/children`, token);
        const childJson = await childRes.json();
        const list = childJson?.data?.items ?? childJson?.data?.children ?? childJson?.data ?? [];
        if (Array.isArray(list)) setChildren(list.map((c: any) => ({ childId: c.childId, name: c.name ?? c.nickname })));
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  // 计算每城市状态聚合
  const cityStateMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const fp of footprints) {
      if (!fp.cityId) continue;
      if (!m.has(fp.cityId)) m.set(fp.cityId, new Set());
      m.get(fp.cityId)!.add(fp.state);
    }
    return m;
  }, [footprints]);

  // stats
  const stats = useMemo(() => {
    const visitedCities = new Set<string>();
    const wishlistCities = new Set<string>();
    let totalVisited = 0;
    let totalWishlist = 0;
    let totalChildWishlist = 0;
    for (const fp of footprints) {
      if (fp.state === 'visited') {
        totalVisited++;
        if (fp.cityId) visitedCities.add(fp.cityId);
      }
      if (fp.state === 'wishlist') {
        totalWishlist++;
        if (fp.cityId) wishlistCities.add(fp.cityId);
      }
      if (fp.state === 'child_wishlist') {
        totalChildWishlist++;
      }
    }
    return {
      visitedCities: visitedCities.size,
      wishlistCities: wishlistCities.size,
      totalVisited,
      totalWishlist,
      totalChildWishlist,
    };
  }, [footprints]);

  // 当前 tab 的城市集合
  const visibleCities = useMemo(() => {
    const arr = cities
      .map((c) => ({ city: c, states: cityStateMap.get(c.id) ?? new Set() }))
      .filter((e) => {
        if (tab === 'all') return e.states.size > 0;
        return e.states.has(tab);
      })
      .sort((a, b) => a.city.name.localeCompare(b.city.name, 'zh'));
    return arr;
  }, [cities, cityStateMap, tab]);

  // 时间线（按年/月倒序分组）
  const timelineGroups = useMemo(() => {
    const filtered = footprints.filter((fp) => {
      if (tab === 'all') return true;
      return fp.state === tab;
    });
    const sorted = [...filtered].sort((a, b) => {
      const da = a.checkinAt ?? a.createdAt;
      const db = b.checkinAt ?? b.createdAt;
      return new Date(db).getTime() - new Date(da).getTime();
    });

    const groups: Record<string, Footprint[]> = {};
    for (const fp of sorted) {
      const d = new Date(fp.checkinAt ?? fp.createdAt);
      const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(fp);
    }
    return groups;
  }, [footprints, tab]);

  // 地图可见的足迹（按当前 tab 过滤 + 需要有 lat/lng；没 lat/lng 用 city 中心点）
  const visibleFpForMap = useMemo(() => {
    const filtered = footprints.filter((fp) => {
      if (tab === 'all') return true;
      return fp.state === tab;
    });
    return filtered.map((fp) => {
      let lat = fp.lat;
      let lng = fp.lng;
      let name = fp.placeName ?? '';
      if ((lat == null || lng == null) && fp.cityId) {
        const city = cities.find((c) => c.id === fp.cityId);
        // 城市坐标：简化为城市名的拼音首字母 hash 不可靠 → 用 city table 的 lat/lng（轻量级 fallback）
        // 这里先用 null 让地图组件内部用城市 list 提供的 lat/lng
        name = name || city?.name || '';
      }
      return { ...fp, lat, lng, placeName: name };
    });
  }, [footprints, tab, cities]);

  const cityNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cities) m.set(c.id, c.name);
    return m;
  }, [cities]);

  async function submitAdd() {
    if (!addCityId) return;
    const token = getToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await authedFetch(`${TRAVEL_API}/api/footprints`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityId: addCityId,
          state: addState,
          childId: addChildId || null,
          note: addNote || null,
          source: 'manual',
        }),
      });
      const json = await res.json();
      if (json?.code === 'OK') {
        setShowAdd(false);
        setAddCityId('');
        setAddChildId('');
        setAddNote('');
        await loadAll(token);
      } else {
        alert(json?.message ?? '添加失败');
      }
    } catch (e: any) {
      alert(e?.message ?? '网络错误');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteFp(id: string) {
    if (!confirm('确认删除这个足迹？')) return;
    const token = getToken();
    if (!token) return;
    const res = await authedFetch(`${TRAVEL_API}/api/footprints/${id}`, token, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (json?.code === 'OK' || res.status === 200) {
      await loadAll(token);
    } else {
      alert(json?.message ?? '删除失败');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ProfileSidebar user={user} counts={{ guides: 0, children: children.length, sayings: 0, badges: 0 }} />
      <div className="space-y-4 min-w-0">
        {/* 标题 + 添加按钮 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <MapPinIcon size={28} className="text-blue-500" />
                足迹地图
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                点亮孩子的每一次出发，按三态展示（去过 / 想去 / 孩子想去）
              </p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold hover:shadow-md transition"
            >
              <PlusIcon size={16} />
              添加足迹
            </button>
          </div>

          {/* 统计三连卡 */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className={`${STATE_TINT.visited.bg} rounded-xl p-4 text-center border border-blue-100`}>
              <div className={`w-3 h-3 ${STATE_TINT.visited.dot} rounded-full mx-auto mb-1`} />
              <div className="text-xl font-extrabold text-blue-700">{stats.visitedCities}</div>
              <div className="text-xs text-gray-600 mt-0.5">去过城市</div>
            </div>
            <div className={`${STATE_TINT.wishlist.bg} rounded-xl p-4 text-center border border-amber-100`}>
              <div className={`w-3 h-3 ${STATE_TINT.wishlist.dot} rounded-full mx-auto mb-1`} />
              <div className="text-xl font-extrabold text-amber-700">{stats.wishlistCities}</div>
              <div className="text-xs text-gray-600 mt-0.5">想去城市</div>
            </div>
            <div className={`${STATE_TINT.child_wishlist.bg} rounded-xl p-4 text-center border border-pink-100`}>
              <div className={`w-3 h-3 ${STATE_TINT.child_wishlist.dot} rounded-full mx-auto mb-1`} />
              <div className="text-xl font-extrabold text-pink-700">{stats.totalChildWishlist}</div>
              <div className="text-xs text-gray-600 mt-0.5">孩子想去</div>
            </div>
          </div>
        </div>

        {/* 真实地图（v2.3 上线） */}
        <FootprintMap
          footprints={visibleFpForMap}
          cities={cities}
        />

        {/* Tab 切换 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                  tab === t.key
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 城市 chip 网格 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-3">城市足迹</h2>
          {loading ? (
            <div className="text-gray-400 text-sm py-8 text-center">加载中...</div>
          ) : visibleCities.length === 0 ? (
            <div className="text-gray-400 text-sm py-8 text-center">
              {tab === 'all' ? '还没有足迹，去添加吧' : `没有${STATE_LABEL[tab]}的足迹`}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleCities.map(({ city, states }) => (
                <div
                  key={city.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
                    states.has('visited')
                      ? STATE_TINT.visited.chip
                      : states.has('wishlist')
                        ? STATE_TINT.wishlist.chip
                        : STATE_TINT.child_wishlist.chip
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      states.has('visited')
                        ? STATE_TINT.visited.dot
                        : states.has('wishlist')
                          ? STATE_TINT.wishlist.dot
                          : STATE_TINT.child_wishlist.dot
                    }`}
                  />
                  {city.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 时间线 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-3">足迹时间线</h2>
          {Object.keys(timelineGroups).length === 0 ? (
            <div className="text-gray-400 text-sm py-8 text-center">暂无记录</div>
          ) : (
            <div className="space-y-5">
              {Object.entries(timelineGroups).map(([monthKey, items]) => (
                <div key={monthKey}>
                  <div className="text-xs font-bold text-gray-500 mb-2">{monthKey}</div>
                  <ul className="space-y-2">
                    {items.map((fp) => (
                      <li
                        key={fp.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border ${STATE_TINT[fp.state].bg} border-gray-100`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${STATE_TINT[fp.state].dot}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-900">
                              {fp.placeName ?? cityNameById.get(fp.cityId ?? '') ?? '—'}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${STATE_TINT[fp.state].chip} border`}>
                              {STATE_LABEL[fp.state]}
                            </span>
                            {fp.source === 'from_plan' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                                来自行程
                              </span>
                            )}
                            {fp.source === 'from_guide' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-600 border border-cyan-200">
                                来自攻略
                              </span>
                            )}
                          </div>
                          {fp.note && <div className="text-xs text-gray-500 mt-1">{fp.note}</div>}
                        </div>
                        <button
                          onClick={() => deleteFp(fp.id)}
                          className="text-xs text-gray-400 hover:text-red-500 px-2"
                          title="删除"
                        >
                          <CloseIcon size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 添加足迹弹层 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PlusIcon size={20} className="text-blue-500" />
              添加足迹
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700">状态</label>
                <div className="flex gap-2 mt-1">
                  {(['visited', 'wishlist', 'child_wishlist'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setAddState(s)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                        addState === s
                          ? STATE_TINT[s].chip + ' ring-2 ring-offset-1'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {STATE_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">城市</label>
                <select
                  value={addCityId}
                  onChange={(e) => setAddCityId(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">-- 选择城市 --</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {children.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-700">关联孩子（可选）</label>
                  <select
                    value={addChildId}
                    onChange={(e) => setAddChildId(e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">不指定</option>
                    {children.map((c) => (
                      <option key={c.childId} value={c.childId}>{c.name ?? c.childId}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700">备注（可选）</label>
                <textarea
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="如：国庆带娃"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={submitAdd}
                disabled={!addCityId || submitting}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {submitting ? '提交中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
