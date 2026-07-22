// 攻略列表 - PC 端（v4.2 UI 重构）
// 借鉴 /places 筛选体系：搜索框 + 天数 chip + 城市 chip + 更多城市下拉
// 用户先看真实攻略 → fork 到自己的计划 / 或一键生成新计划
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SparklesIcon, MapPinIcon, ClockIcon, HeartIcon, EyeIcon, ForkIcon, CloseIcon, SearchIcon, ChevronDown } from '@/components/Icons';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

interface Guide {
  id: string;
  title: string;
  cityName: string | null;
  days: number | null;
  childAges: number[];
  travelStyle: string | null;
  stats: { view: number; save: number; like: number };
  author: { nickname: string; avatar: string | null };
  coverImage?: string | null;
  isMock?: boolean;
}

// 模拟数据：真实亲子旅行照片（Unsplash）+ 真实标题
const MOCK_GUIDES: Guide[] = [
  { id: 'mock-1', title: '北京 5 天 4 晚 · 故宫 + 动物园 + 海洋馆', cityName: '北京', days: 5, childAges: [4, 6], travelStyle: '平衡',
    stats: { view: 1832, save: 246, like: 487 }, author: { nickname: '甜豆妈妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&q=80', isMock: true },
  { id: 'mock-2', title: '上海迪士尼 3 天 · 不踩雷的排队路线', cityName: '上海', days: 3, childAges: [3, 5], travelStyle: '慢游',
    stats: { view: 2410, save: 312, like: 658 }, author: { nickname: '小米妈妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80', isMock: true },
  { id: 'mock-3', title: '广州长隆 4 天 · 孩子玩疯的攻略', cityName: '广州', days: 4, childAges: [2, 7], travelStyle: '主题乐园',
    stats: { view: 1290, save: 198, like: 412 }, author: { nickname: '果冻爸', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80', isMock: true },
  { id: 'mock-4', title: '三亚海边亲子 6 天 · 海鲜酒店避坑', cityName: '三亚', days: 6, childAges: [3, 5], travelStyle: '度假',
    stats: { view: 2156, save: 287, like: 524 }, author: { nickname: '海螺小姐', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1559131397-f94da358f7ca?w=800&q=80', isMock: true },
  { id: 'mock-5', title: '成都 4 天 · 熊猫基地 + 周边古镇', cityName: '成都', days: 4, childAges: [4, 6], travelStyle: '平衡',
    stats: { view: 1467, save: 156, like: 298 }, author: { nickname: '圆圆妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1545569310-c55b3c63b8c2?w=800&q=80', isMock: true },
  { id: 'mock-6', title: '杭州西湖 3 天 · 骑行苏堤 + 灵隐', cityName: '杭州', days: 3, childAges: [5, 8], travelStyle: '自然',
    stats: { view: 1135, save: 142, like: 256 }, author: { nickname: '莲藕妈妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=800&q=80', isMock: true },
  { id: 'mock-7', title: '西安 4 天 · 兵马俑研学之旅', cityName: '西安', days: 4, childAges: [7, 9], travelStyle: '研学',
    stats: { view: 1680, save: 223, like: 401 }, author: { nickname: '小满爸', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80', isMock: true },
  { id: 'mock-8', title: '厦门鼓浪屿 3 天 · 亲子拍照路线', cityName: '厦门', days: 3, childAges: [2, 5], travelStyle: '慢游',
    stats: { view: 1342, save: 178, like: 367 }, author: { nickname: '榕树妈妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', isMock: true },
  { id: 'mock-9', title: '青岛海边 4 天 · 啤酒博物馆 + 金沙滩', cityName: '青岛', days: 4, childAges: [5, 7], travelStyle: '平衡',
    stats: { view: 982, save: 134, like: 245 }, author: { nickname: '浪花妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1581837647423-1c5ddff1e0e5?w=800&q=80', isMock: true },
  { id: 'mock-10', title: '深圳 3 天 · 科技馆 + 野生动物园', cityName: '深圳', days: 3, childAges: [4, 6], travelStyle: '研学',
    stats: { view: 1198, save: 167, like: 312 }, author: { nickname: '南风爸爸', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1538099074-9b9e2c1f0e85?w=800&q=80', isMock: true },
  { id: 'mock-11', title: '南京 3 天 · 中山陵 + 红山动物园', cityName: '南京', days: 3, childAges: [6, 8], travelStyle: '历史',
    stats: { view: 1056, save: 145, like: 278 }, author: { nickname: '梧桐妈妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=80', isMock: true },
  { id: 'mock-12', title: '丽江大理 6 天 · 古城 + 洱海骑行', cityName: '丽江', days: 6, childAges: [5, 9], travelStyle: '度假',
    stats: { view: 1879, save: 256, like: 489 }, author: { nickname: '云朵妈', avatar: null },
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', isMock: true },
];

// 统一卡片高度
const CARD_HEIGHT = 'h-72';

// chip 样式（与 /places 完全同款）
const CHIP_BASE = "flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition border whitespace-nowrap bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600";
const CHIP_ACTIVE = "flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition border whitespace-nowrap bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-500 shadow-sm";

// 1 行 12 个热门亲子城市（与 /places 同款）
const TOP_CITIES = ['北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '南京', '厦门', '苏州', '重庆', '武汉'];

// 天数 chip（替代 /places 的主题/类别，更贴合攻略维度）
const DAY_OPTIONS = [
  { label: '周末游', days: [1, 2] },
  { label: '小长假', days: [3, 4] },
  { label: '长假', days: [5, 7] },
  { label: '深度游', days: [8, 99] },
];

// 风格 chip
const TRAVEL_STYLES = ['平衡', '慢游', '主题乐园', '度假', '自然', '研学', '历史'];

// 拼音首字母映射（51 城全覆盖；查不到走 'Z' 兜底）
const PINYIN_LETTER: Record<string, string> = {
  '北京': 'B', '北戴河': 'B',
  '成都': 'C', '重庆': 'C', '长沙': 'C', '长春': 'C',
  '大连': 'D', '东莞': 'D', '大理': 'D',
  '峨眉山': 'E',
  '福州': 'F', '佛山': 'F',
  '广州': 'G',
  '杭州': 'H', '合肥': 'H', '海口': 'H', '哈尔滨': 'H', '黄山': 'H',
  '济南': 'J',
  '昆明': 'K', '开封': 'K',
  '丽江': 'L', '兰州': 'L', '拉萨': 'L', '洛阳': 'L',
  '南京': 'N', '南宁': 'N', '南昌': 'N', '宁波': 'N',
  '青岛': 'Q', '秦皇岛': 'Q',
  '上海': 'S', '深圳': 'S', '苏州': 'S', '三亚': 'S',
  '沈阳': 'S', '汕头': 'S', '石家庄': 'S',
  '天津': 'T', '太原': 'T', '台北': 'T',
  '武汉': 'W', '温州': 'W',
  '西安': 'X', '厦门': 'X', '西双版纳': 'X', '西宁': 'X', '香港': 'X',
  '宜昌': 'Y',
  '郑州': 'Z', '珠海': 'Z',
};
function getPinyinLetter(name: string): string {
  if (/[A-Za-z]/.test(name[0])) return name[0].toUpperCase();
  return PINYIN_LETTER[name] ?? 'Z';
}

export default function GuidesPage() {
  const router = useRouter();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [forkingId, setForkingId] = useState<string | null>(null);

  // 筛选状态（与 /places 一致）
  const [q, setQ] = useState('');
  const [dayFilter, setDayFilter] = useState<string>('');  // 选中的天数标签
  const [styleFilter, setStyleFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [cityPopoverOpen, setCityPopoverOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState('');

  useEffect(() => {
    // 加载城市（与 /places 同样来源）
    fetch(`${TRAVEL_API}/api/cities`)
      .then((r) => r.json())
      .then((d) => setCities(d.data ?? d.cities ?? []))
      .catch(console.error);

    // 加载攻略
    fetch(`${TRAVEL_API}/api/guides/feed`)
      .then((r) => r.json())
      .then((d) => {
        const apiGuides: Guide[] = (d.items ?? []).map((g: Guide) => ({ ...g, isMock: false }));
        const merged = apiGuides.length >= 12
          ? apiGuides
          : [...apiGuides, ...MOCK_GUIDES.slice(0, 12 - apiGuides.length)];
        setGuides(merged);
      })
      .catch(() => setGuides(MOCK_GUIDES))
      .finally(() => setLoading(false));
  }, []);

  const forkGuide = async (guideId: string) => {
    if (guideId.startsWith('mock-')) {
      alert('这是模拟数据，请先用真实攻略 fork');
      return;
    }
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

  // 计算 dayFilter 对应的天数集合
  const dayMatch = (g: Guide): boolean => {
    if (!dayFilter) return true;
    const opt = DAY_OPTIONS.find((d) => d.label === dayFilter);
    if (!opt || !g.days) return false;
    return g.days >= opt.days[0] && g.days <= opt.days[1];
  };

  // 计算搜索关键词（标题/城市/作者）
  const searchMatch = (g: Guide): boolean => {
    if (!q.trim()) return true;
    const k = q.trim().toLowerCase();
    return (
      g.title.toLowerCase().includes(k) ||
      (g.cityName ?? '').toLowerCase().includes(k) ||
      g.author.nickname.toLowerCase().includes(k)
    );
  };

  const filtered = guides
    .filter(searchMatch)
    .filter(dayMatch)
    .filter((g) => !styleFilter || g.travelStyle === styleFilter)
    .filter((g) => !cityFilter || g.cityName === cityFilter);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold">看看大家怎么玩</h1>
              <p className="text-blue-100 mt-2 text-sm md:text-base">真实妈妈的亲子旅行 · 看到喜欢的可以一键做成自己的计划</p>
            </div>
            <Link
              href="/wizard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-full text-sm hover:bg-blue-50 transition shadow-md whitespace-nowrap self-start md:self-auto"
            >
              <SparklesIcon size={16} />
              一键生成出行计划
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 搜索框（与 /places 完全同款） */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-3">
          <SearchIcon size={20} className="text-blue-500 flex-shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜攻略（按标题 / 城市 / 作者，如：上海迪士尼 / 厦门 / 甜豆妈妈）"
            className="flex-1 px-2 py-2 text-lg border-0 focus:outline-none bg-transparent"
          />
        </div>

        {/* 天数 chip（替代 /places 的主题筛选） */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap inline-flex items-center gap-1.5">
              <ClockIcon size={14} className="text-blue-500" /> 天数
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button onClick={() => setDayFilter('')} className={dayFilter === '' ? CHIP_ACTIVE : CHIP_BASE}>
              <CloseIcon size={12} /> 全部
            </button>
            {DAY_OPTIONS.map((d) => (
              <button key={d.label} onClick={() => setDayFilter(dayFilter === d.label ? '' : d.label)} className={dayFilter === d.label ? CHIP_ACTIVE : CHIP_BASE}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* 风格 chip（替代 /places 的类别筛选） */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap inline-flex items-center gap-1.5">
              <SparklesIcon size={14} className="text-blue-500" /> 风格
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button onClick={() => setStyleFilter('')} className={styleFilter === '' ? CHIP_ACTIVE : CHIP_BASE}>
              <CloseIcon size={12} /> 全部
            </button>
            {TRAVEL_STYLES.map((s) => (
              <button key={s} onClick={() => setStyleFilter(styleFilter === s ? '' : s)} className={styleFilter === s ? CHIP_ACTIVE : CHIP_BASE}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 城市 chip（与 /places 完全同款：1 行 12 个 + 更多入口） */}
        {cities.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-600 whitespace-nowrap inline-flex items-center gap-1.5">
                <MapPinIcon size={14} className="text-blue-500" /> 城市
              </span>
              <div className="flex-1 h-px bg-gray-100" />
              <button
                onClick={() => setCityPopoverOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
              >
                更多城市 <ChevronDown size={12} />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setCityFilter('')} className={cityFilter === '' ? CHIP_ACTIVE : CHIP_BASE}>
                <CloseIcon size={12} /> 全部
              </button>
              {TOP_CITIES.map((name) => {
                if (!cities.find((c) => c.name === name)) return null;
                const active = cityFilter === name;
                return (
                  <button key={name} onClick={() => setCityFilter(active ? '' : name)} className={active ? CHIP_ACTIVE : CHIP_BASE}>
                    {name}
                  </button>
                );
              })}
            </div>
            {cityPopoverOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setCityPopoverOpen(false)} />
                <div className="relative z-40 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-4 max-h-96 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                    <SearchIcon size={14} className="text-blue-500" />
                    <input
                      value={cityQuery}
                      onChange={(e) => setCityQuery(e.target.value)}
                      placeholder="搜索城市..."
                      className="flex-1 text-sm border-0 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    {Object.entries(
                      cities
                        .filter((c) => c.name.includes(cityQuery))
                        .reduce((groups: Record<string, typeof cities>, c) => {
                          const letter = getPinyinLetter(c.name);
                          (groups[letter] ||= []).push(c);
                          return groups;
                        }, {})
                    )
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([letter, group]) => (
                        <div key={letter}>
                          <div className="text-xs font-bold text-blue-600 mb-1.5">{letter}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.map((c) => {
                              const active = cityFilter === c.name;
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => { setCityFilter(active ? '' : c.name); setCityPopoverOpen(false); setCityQuery(''); }}
                                  className={`px-2.5 py-1 rounded-full text-xs transition ${active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`}
                                >
                                  {c.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-400">加载攻略中…</div>}

        {!loading && guides.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
              <ForkIcon size={28} className="text-blue-500" />
            </div>
            <div className="text-gray-500 mb-1">还没有发布的攻略</div>
            <div className="text-sm text-gray-400">妈妈完成出行 + 发布一篇，就会出现在这里</div>
          </div>
        )}

        {/* 3 列等高卡片（统一 h-72） */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <article key={g.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group">
              <Link href={`/guides/${g.id}`} className="block">
                <div className={`relative ${CARD_HEIGHT} overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100`}>
                  {g.coverImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={g.coverImage}
                      alt={g.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPinIcon size={48} className="text-blue-300" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {g.cityName && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
                        <MapPinIcon size={10} className="text-blue-600" /> {g.cityName}
                      </span>
                    )}
                    {g.days && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/40 backdrop-blur-sm text-white rounded-full text-xs font-medium">
                        <ClockIcon size={10} /> {g.days} 天
                      </span>
                    )}
                  </div>
                  {g.isMock && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-amber-400/90 backdrop-blur-sm text-white rounded-full text-xs font-medium shadow-sm">
                      示意
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/guides/${g.id}`}>
                  <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 hover:text-blue-600 transition">
                    {g.title}
                  </h3>
                </Link>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-[10px] flex-shrink-0">
                      {g.author.nickname?.[0] ?? '?'}
                    </span>
                    <span className="truncate">{g.author.nickname}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-0.5"><EyeIcon size={11} />{g.stats.view}</span>
                    <span className="inline-flex items-center gap-0.5"><HeartIcon size={11} className="text-pink-500" />{g.stats.like}</span>
                    <span className="inline-flex items-center gap-0.5"><ForkIcon size={11} className="text-blue-500" />{g.stats.save}</span>
                  </span>
                </div>
                <button
                  onClick={() => forkGuide(g.id)}
                  disabled={forkingId === g.id}
                  className="w-full py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:shadow-md transition flex items-center justify-center gap-1"
                >
                  <ForkIcon size={12} />
                  {forkingId === g.id ? '生成中…' : '做成我的计划'}
                </button>
              </div>
            </article>
          ))}
        </div>

        {!loading && filtered.length === 0 && guides.length > 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            当前筛选下没有匹配的攻略，<button onClick={() => { setQ(''); setDayFilter(''); setStyleFilter(''); setCityFilter(''); }} className="text-blue-600 hover:underline">清除筛选</button>
          </div>
        )}
      </div>
    </main>
  );
}