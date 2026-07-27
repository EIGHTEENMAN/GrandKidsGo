// Admin 后台 — 攻略审核
// Tab 1: 待审核 (pending_review) — 通过/拒绝
// Tab 2: 已发布 (published) — 只读
// Tab 3: 已拒绝 (rejected) — 只读 + 拒绝原因
//
// 鉴权: x-admin-token header (默认 dev-admin-token, 通过 ADMIN_TOKEN 环境变量覆盖)

'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const TRAVEL_API = (process.env.NEXT_PUBLIC_TRAVEL_API as string) || 'https://travel.grandand.com';

type GuideStatus = 'pending_review' | 'published' | 'rejected';

interface GuideItem {
  id: string;
  title: string;
  contentPreview: string;
  cover: string | null;
  cityName: string | null;
  childAges: number[];
  days: number | null;
  userId: string;
  createdAt: string;
}

interface RejectState {
  guideId: string | null;
  reason: string;
  submitting: boolean;
}

const TABS: { key: GuideStatus; label: string; icon: string }[] = [
  { key: 'pending_review', label: '待审核', icon: 'M12 8v4M12 16h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { key: 'published', label: '已发布', icon: 'M5 13l4 4L19 7' },
  { key: 'rejected', label: '已拒绝', icon: 'M6 18L18 6M6 6l12 12' },
];

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<GuideStatus>('pending_review');
  const [guides, setGuides] = useState<GuideItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reject, setReject] = useState<RejectState>({ guideId: null, reason: '', submitting: false });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 从 localStorage 恢复 token
  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) {
      setToken(saved);
      setAuthed(true);
    }
  }, []);

  const fetchGuides = useCallback(async (status: GuideStatus, p: number) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${TRAVEL_API}/api/admin/guides/pending?status=${status}&page=${p}&pageSize=${pageSize}`,
        { headers: { 'x-admin-token': token } },
      );
      if (res.status === 403) {
        setAuthed(false);
        localStorage.removeItem('admin_token');
        setError('Token 无效或已过期，请重新输入');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGuides(data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, pageSize]);

  // 切换 tab 或翻页时重新加载
  useEffect(() => {
    if (authed) fetchGuides(activeTab, 1);
  }, [authed, activeTab, fetchGuides]);

  const handleLogin = () => {
    if (!token.trim()) return;
    localStorage.setItem('admin_token', token.trim());
    setAuthed(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setAuthed(false);
    setGuides([]);
  };

  const handleApprove = async (guideId: string) => {
    setActionLoading(guideId);
    try {
      const res = await fetch(`${TRAVEL_API}/api/admin/guides/${guideId}/approve`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // 从列表移除
      setGuides((prev) => prev.filter((g) => g.id !== guideId));
      setTotal((prev) => prev - 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!reject.guideId || !reject.reason.trim()) return;
    setReject((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await fetch(`${TRAVEL_API}/api/admin/guides/${reject.guideId}/reject`, {
        method: 'POST',
        headers: { 'x-admin-token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reject.reason.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setGuides((prev) => prev.filter((g) => g.id !== reject.guideId));
      setTotal((prev) => prev - 1);
      setReject({ guideId: null, reason: '', submitting: false });
    } catch (e) {
      setError((e as Error).message);
      setReject((prev) => ({ ...prev, submitting: false }));
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatAges = (ages: number[]) => {
    if (!ages.length) return '未填';
    return ages.map((a) => (a < 24 ? `${a}月` : `${Math.floor(a / 12)}岁`)).join(' / ');
  };

  // --- 未登录: Token 输入 ---
  if (!authed) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">走天下 · 管理后台</h1>
            <p className="text-sm text-gray-500 mt-1">请输入管理员密钥</p>
          </div>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Admin Token"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={!token.trim()}
            className="w-full mt-4 py-3 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-40 hover:bg-blue-700 transition"
          >
            进入后台
          </button>
          <Link href="/" className="block text-center mt-4 text-xs text-gray-400 hover:text-gray-600">
            ← 返回走天下首页
          </Link>
        </div>
      </main>
    );
  }

  // --- 已登录: 审核主界面 ---
  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">走天下管理后台</h1>
              <p className="text-xs text-gray-400">攻略审核系统</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 返回首页</Link>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-600 font-medium"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tab 导航 */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-6 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={tab.icon} />
              </svg>
              {tab.label}
              {tab.key === 'pending_review' && total > 0 && activeTab === tab.key && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">{total}</span>
              )}
            </button>
          ))}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">x</button>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="text-center py-20 text-gray-400">
            <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-3" />
            <p>加载中...</p>
          </div>
        )}

        {/* 空状态 */}
        {!loading && guides.length === 0 && (
          <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">
              {activeTab === 'pending_review' && '暂无待审核攻略'}
              {activeTab === 'published' && '暂无已发布攻略'}
              {activeTab === 'rejected' && '暂无已拒绝攻略'}
            </p>
          </div>
        )}

        {/* 攻略列表 */}
        {!loading && guides.length > 0 && (
          <div className="space-y-4">
            {guides.map((g) => (
              <article key={g.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex">
                  {/* 封面 */}
                  {g.cover && (
                    <div className="w-32 h-32 flex-shrink-0 bg-gray-100">
                      <img src={g.cover} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {/* 内容 */}
                  <div className="flex-1 p-5 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-bold text-gray-900 text-lg truncate">{g.title}</h3>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(g.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {g.cityName && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{g.cityName}</span>
                      )}
                      {g.days && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">{g.days} 天</span>
                      )}
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">孩子: {formatAges(g.childAges)}</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">用户: {g.userId.slice(0, 8)}...</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{g.contentPreview}</p>

                    {/* 操作按钮 */}
                    {activeTab === 'pending_review' && (
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                        <button
                          onClick={() => handleApprove(g.id)}
                          disabled={actionLoading === g.id || reject.submitting}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-green-700 transition"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {actionLoading === g.id ? '处理中...' : '通过'}
                        </button>
                        <button
                          onClick={() => setReject({ guideId: g.id, reason: '', submitting: false })}
                          disabled={actionLoading === g.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-red-100 transition"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          拒绝
                        </button>
                        <a
                          href={`${TRAVEL_API}/guides/${g.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          查看详情
                        </a>
                      </div>
                    )}
                    {activeTab !== 'pending_review' && (
                      <div className="mt-4 pt-4 border-t border-gray-50">
                        <a
                          href={`${TRAVEL_API}/guides/${g.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          查看攻略详情 →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* 分页 */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => fetchGuides(activeTab, page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => fetchGuides(activeTab, page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* 拒绝弹窗 */}
      {reject.guideId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">拒绝该攻略</h3>
                <p className="text-xs text-gray-500">请填写拒绝原因，将记录到操作日志</p>
              </div>
            </div>
            <textarea
              value={reject.reason}
              onChange={(e) => setReject((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="例: 内容包含不当信息 / 攻略内容过于简单 / 与亲子出行无关..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setReject({ guideId: null, reason: '', submitting: false })}
                disabled={reject.submitting}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                取消
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!reject.reason.trim() || reject.submitting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-red-700 transition"
              >
                {reject.submitting ? '提交中...' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
