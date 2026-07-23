// 攻略详情页 — 走天下 PC 端（v4.1 蓝青 UI）
// 数据源：/api/guides/[id]（contentHtml + stats + author + isLiked/isSaved）
// 渲染：contentHtml 安全清洗 + like/save/fork 按钮 + 双维度评分 + 评论区
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  SparklesIcon, MapPinIcon, ClockIcon, BabyIcon, StarIcon, UserIcon, HeartIcon,
  EyeIcon, ForkIcon, BookmarkIcon, GuidebookIcon, ChevronRight, CheckIcon, ChevronDown,
} from '@/components/Icons';
import { sanitizeHtml } from '@/lib/sanitize';
import { GuideReviewForm, GuideComments } from '@/components/guide/GuideReviewForm';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

const HERO_POOL = [
  'photo-1602002418082-a4443e081dd1',
  'photo-1511895426328-dc8714191300',
  'photo-1502086223501-7ea6ecd79368',
  'photo-1559131397-f94da358f7ca',
  'photo-1545569310-c55b3c63b8c2',
];

interface GuideData {
  id: string;
  title: string;
  coverImages: string[];
  contentHtml: string;
  city: { id: string; name: string; kidHook?: string; momHook?: string; dadHook?: string } | null;
  days: number | null;
  childAges: number[];
  travelStyle: string | null;
  season: string | null;
  tags: string[];
  publishedAt: string;
  createdAt: string;
  stats: { view: number; save: number; like: number; avgAdultRating?: number | null; avgChildRating?: number | null; ratingCount?: number; commentCount?: number };
  author: { id: string; nickname: string; avatar: string | null };
  isLiked: boolean;
  isSaved: boolean;
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - d) / 86400000);
  if (diff < 1) return '今天';
  if (diff < 30) return `${diff} 天前`;
  const months = Math.floor(diff / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}

export default function GuideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('grandkidsgo_token') : null;

  useEffect(() => {
    fetch(`${TRAVEL_API}/api/guides/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.code === 'OK' && d.data) {
          setData(d.data);
          setLiked(d.data.isLiked ?? false);
          setSaved(d.data.isSaved ?? false);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const toggleLike = async () => {
    if (!token) { router.push('/login'); return; }
    const res = await fetch(`${TRAVEL_API}/api/guides/${id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    if (d.code === 'OK') {
      setLiked(d.data.isLiked);
      setData(prev => prev ? { ...prev, stats: { ...prev.stats, like: prev.stats.like + (d.data.isLiked ? 1 : -1) } } : prev);
    }
  };

  const toggleSave = async () => {
    if (!token) { router.push('/login'); return; }
    const res = await fetch(`${TRAVEL_API}/api/guides/${id}/save`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    if (d.code === 'OK') {
      setSaved(d.data.isSaved);
      setData(prev => prev ? { ...prev, stats: { ...prev.stats, save: prev.stats.save + (d.data.isSaved ? 1 : -1) } } : prev);
    }
  };

  const forkGuide = async () => {
    if (!token) { router.push('/login'); return; }
    const res = await fetch(`${TRAVEL_API}/api/guides/fork`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sourceGuideId: id }),
    });
    const d = await res.json();
    if (d.code === 'OK' && d.data?.planRecordId) router.push(`/plan/${d.data.planRecordId}`);
    else alert(d.error?.message ?? 'fork 失败');
  };

  const submitComment = async () => {
    if (!commentText.trim() || !token) return;
    const res = await fetch(`${TRAVEL_API}/api/guides/${id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: commentText }),
    });
    const d = await res.json();
    if (d.code === 'OK') { setCommentText(''); /* reload to show new comment */ location.reload(); }
    else alert(d.error?.message ?? '评论失败');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-gray-500">攻略不存在或已删除</div>;

  const heroImg = data.coverImages?.[0]
    ? data.coverImages[0]
    : `https://images.unsplash.com/${HERO_POOL[Math.abs(data.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % HERO_POOL.length]}?w=1600&q=85`;
  const safeHtml = sanitizeHtml(data.contentHtml);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50 pb-24">
      {/* ============ ① Hero ============ */}
      <header className="relative h-[380px] md:h-[440px] overflow-hidden bg-gray-100">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImg})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/50 via-cyan-600/30 to-teal-600/60" />
        <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10 z-10">
          <Link href="/guides" className="text-white/80 hover:text-white text-sm inline-flex items-center gap-1 self-start">
            <span>←</span> 返回攻略
          </Link>
          <div>
            {data.city?.name && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/30 mb-3">
                <MapPinIcon size={12} /> {data.city.name}
              </span>
            )}
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">{data.title}</h1>
            <div className="flex flex-wrap gap-2">
              {data.days && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/30">
                  <ClockIcon size={12} /> {data.days} 天
                </span>
              )}
              {data.childAges?.length > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/30">
                  <BabyIcon size={12} /> {data.childAges.join(', ')} 岁
                </span>
              )}
              {data.travelStyle && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-white/30">
                  <SparklesIcon size={12} /> {data.travelStyle}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ============ ② 攻略正文 ============ */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
          <div
            className="prose max-w-none text-gray-800 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-3 [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-700 [&_img]:rounded-xl [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-200 [&_blockquote]:bg-blue-50 [&_blockquote]:rounded-r-xl [&_blockquote]:p-4 [&_blockquote]:italic"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </section>

        {/* ============ ③ 作者信息 + 互动 ============ */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0">
              {data.author.nickname?.[0] ?? '?'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{data.author.nickname || '匿名妈妈'}</div>
              <div className="text-xs text-gray-500">{timeAgo(data.publishedAt || data.createdAt)} · {data.stats.view ?? 0} 次浏览</div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={toggleLike} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition ${liked ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-white border-gray-200 text-gray-600 hover:border-pink-200'}`}>
              <HeartIcon size={16} className={liked ? 'text-pink-500' : ''} />
              {data.stats.like}
            </button>
            <button onClick={toggleSave} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition ${saved ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-gray-200 text-gray-600 hover:border-amber-200'}`}>
              <StarIcon size={16} />
              收藏 {data.stats.save}
            </button>
            <button onClick={forkGuide} className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-full text-sm hover:shadow-lg transition">
              <ForkIcon size={14} />
              做成我的计划
            </button>
          </div>
        </section>

        {/* ============ ④ 双维度评分 ============ */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <StarIcon size={18} className="text-amber-500" /> 妈妈们如何评价（{data.stats.ratingCount ?? 0} 条）
          </h2>
          <div className="grid grid-cols-2 gap-6 text-center mb-4">
            <div>
              <div className="text-xs text-gray-500 mb-1 inline-flex items-center gap-1"><UserIcon size={12} /> 大人评分</div>
              <div className="text-3xl font-extrabold text-blue-600">
                {data.stats.avgAdultRating != null ? data.stats.avgAdultRating.toFixed(1) : '—'}
                <span className="text-sm font-normal text-gray-400 ml-1">/ 5</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 inline-flex items-center gap-1"><BabyIcon size={12} /> 孩子评分</div>
              <div className="text-3xl font-extrabold text-pink-600">
                {data.stats.avgChildRating != null ? data.stats.avgChildRating.toFixed(1) : '—'}
                <span className="text-sm font-normal text-gray-400 ml-1">/ 5</span>
              </div>
            </div>
          </div>
          <button onClick={() => setShowReviewForm(v => !v)}
            className="block w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl text-sm hover:shadow-md transition">
            {showReviewForm ? '收起' : '📝 我也要评分（大人 + 孩子双维度）'}
          </button>
          {showReviewForm && (
            <GuideReviewForm guideId={data.id} guideTitle={data.title} onSubmitted={() => {}} />
          )}
        </section>

        {/* ============ ⑤ 评论区 ============ */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <GuidebookIcon size={18} className="text-blue-600" /> 评论（{data.stats.commentCount ?? 0}）
          </h2>
          {token ? (
            <GuideComments guideId={data.id} initialItems={[]} initialCount={0} />
          ) : (
            <p className="text-sm text-gray-400 mb-6">
              <Link href={`/login?redirect=/guides/${id}`} className="text-blue-600 hover:underline">登录</Link>后可以评论
            </p>
          )}
        </section>

        {/* ============ ⑥ 相关攻略 ============ */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <SparklesIcon size={18} className="text-blue-600" /> 相关攻略
          </h2>
          <div className="text-xs text-gray-400">P2 接入 /api/guides/[id]/related 后展示</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            <p className="text-sm text-gray-500">基于同作者 + 同城市匹配</p>
          </div>
        </section>
      </div>
    </main>
  );
}