// /profile/settings — 设置中心（4 Tab：资料 / 隐私 / 账号 / 通知）
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { CheckIcon, AlertIcon } from '@/components/Icons';
import { getToken, authedFetch } from '@/lib/auth';

const TABS = [
  { key: 'profile', label: '资料' },
  { key: 'privacy', label: '隐私' },
  { key: 'account', label: '账号' },
  { key: 'notify', label: '通知' },
] as const;

type TabKey = typeof TABS[number]['key'];

type User = {
  id: string;
  nickname: string;
  username?: string;
  avatar: string | null;
  gender?: string | null;
  birthday?: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const token = typeof window !== 'undefined' ? getToken() : null;

  useEffect(() => {
    if (!token) { router.push('/login?redirect=/profile/settings'); return; }
    setLoading(true);
    authedFetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d?.data ?? d?.user ?? d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router, token]);

  function showToast(ok: boolean, text: string) {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 2500);
  }

  if (loading || !user) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <ProfileSidebar user={null} />
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">加载中…</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ProfileSidebar user={user} counts={{ guides: 0, children: 0, sayings: 0, badges: 0 }} />
      <div className="space-y-4 min-w-0 relative">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h1 className="text-xl font-extrabold text-gray-900 mb-3">设置</h1>
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  tab === t.key
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {tab === 'profile' && <ProfileTab user={user} onSaved={(msg) => showToast(true, msg)} />}
          {tab === 'privacy' && <PrivacyTab userId={user.id} onSaved={(msg) => showToast(true, msg)} onError={(msg) => showToast(false, msg)} />}
          {tab === 'account' && <AccountTab />}
          {tab === 'notify' && <NotifyTab />}
        </div>

        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium shadow-lg ${
            toast.ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {toast.ok && <CheckIcon size={14} className="inline mr-1" />}
            {!toast.ok && <AlertIcon size={14} className="inline mr-1" />}
            {toast.text}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ user, onSaved }: { user: User; onSaved: (msg: string) => void }) {
  const [nickname, setNickname] = useState(user.nickname);
  const [gender, setGender] = useState(user.gender ?? '');
  const [birthday, setBirthday] = useState(user.birthday?.slice(0, 10) ?? '');
  const [avatar, setAvatar] = useState(user.avatar ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      // 资料 Tab 写 auth-service
      const token = getToken();
      const res = await fetch('https://grandand.com/api/user/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, gender, birthday, avatar }),
      });
      if (res.ok) onSaved('资料已保存');
      else onSaved('保存失败');
    } catch {
      onSaved('网络错误');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-gray-900 mb-3">个人资料</h2>
      <Field label="昵称">
        <input value={nickname} onChange={e => setNickname(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
      </Field>
      <Field label="头像 URL">
        <input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
      </Field>
      <Field label="性别">
        <div className="flex gap-2">
          {['', 'male', 'female'].map(g => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                gender === g ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {g === '' ? '不选' : g === 'male' ? '男' : '女'}
            </button>
          ))}
        </div>
      </Field>
      <Field label="生日">
        <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg" />
      </Field>
      <button onClick={save} disabled={saving} className="mt-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-bold hover:shadow-md transition disabled:opacity-50">
        {saving ? '保存中…' : '保存'}
      </button>
    </div>
  );
}

function PrivacyTab({ userId, onSaved, onError }: { userId: string; onSaved: (msg: string) => void; onError: (msg: string) => void }) {
  const [allowLeaderboard, setAllowLeaderboard] = useState(true);
  const [allowFeed, setAllowFeed] = useState(true);
  const [badgeScope, setBadgeScope] = useState('private');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? getToken() : null;

  useEffect(() => {
    authedFetch('/api/user/privacy-settings')
      .then(r => r.json())
      .then(j => {
        const d = j?.data ?? j;
        setAllowLeaderboard(d?.allowLeaderboardPublic ?? true);
        setAllowFeed(d?.allowCommunityFeed ?? true);
        setBadgeScope(d?.badgeShareScope ?? 'private');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  async function save() {
    setSaving(true);
    try {
      const res = await authedFetch('/api/user/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowLeaderboardPublic: allowLeaderboard,
          allowCommunityFeed: allowFeed,
          badgeShareScope: badgeScope,
        }),
      });
      if (res.ok) onSaved('隐私设置已保存');
      else onError('保存失败');
    } catch {
      onError('网络错误');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-400">加载中…</p>;

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-gray-900 mb-3">隐私设置</h2>
      <Toggle label="公开排行榜" desc="允许你的勋章和攻略出现在全平台排行榜" checked={allowLeaderboard} onChange={setAllowLeaderboard} />
      <Toggle label="公开到社区信息流" desc="允许你的攻略、孩子说出现在社区广场" checked={allowFeed} onChange={setAllowFeed} />
      <Field label="勋章默认分享范围">
        <div className="flex gap-2">
          {[{ v: 'private', l: '仅自己' }, { v: 'community', l: '社区可见' }, { v: 'public', l: '完全公开' }].map(o => (
            <button
              key={o.v}
              onClick={() => setBadgeScope(o.v)}
              className={`px-3 py-1.5 rounded-full text-sm ${badgeScope === o.v ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </Field>
      <button onClick={save} disabled={saving} className="mt-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-bold hover:shadow-md transition disabled:opacity-50">
        {saving ? '保存中…' : '保存'}
      </button>
    </div>
  );
}

function AccountTab() {
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-gray-900 mb-3">账号安全</h2>
      <p className="text-sm text-gray-500 -mt-2 mb-4">账号基础信息在主站管理。下方跳转。</p>
      <LinkRow label="手机号 / 邮箱" desc="绑定和换绑" href="https://grandand.com/profile" />
      <LinkRow label="修改密码" desc="定期更换更安全" href="https://grandand.com/profile" />
      <LinkRow label="登录设备" desc="查看已登录的设备" href="https://grandand.com/profile" />
      <LinkRow label="注销账号" desc="永久删除账号和数据" href="https://grandand.com/profile" danger />
    </div>
  );
}

function NotifyTab() {
  const [emailReply, setEmailReply] = useState(true);
  const [emailLike, setEmailLike] = useState(false);
  const [emailSystem, setEmailSystem] = useState(true);
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-gray-900 mb-3">通知偏好</h2>
      <p className="text-sm text-amber-600 -mt-2 mb-4 inline-flex items-center gap-1.5">
        <AlertIcon size={14} /> 当前为本地占位设置，刷新页面后重置。正式通知偏好待后端上线。
      </p>
      <Toggle label="评论 / 回复提醒" checked={emailReply} onChange={setEmailReply} />
      <Toggle label="点赞 / 收藏提醒" checked={emailLike} onChange={setEmailLike} />
      <Toggle label="系统通知" checked={emailSystem} onChange={setEmailSystem} />
      <button
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }}
        className="mt-2 px-5 py-2 bg-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-300 transition"
      >
        {saved ? '已保存（本地）' : '保存'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}

function LinkRow({ label, desc, href, danger }: { label: string; desc?: string; href: string; danger?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={`flex items-center justify-between p-3 rounded-xl border transition ${
        danger
          ? 'border-red-200 hover:bg-red-50 text-red-600'
          : 'border-gray-200 hover:bg-gray-50 text-gray-900'
      }`}
    >
      <div>
        <p className={`font-medium ${danger ? 'text-red-600' : 'text-gray-900'}`}>{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <span className="text-gray-400">→</span>
    </a>
  );
}