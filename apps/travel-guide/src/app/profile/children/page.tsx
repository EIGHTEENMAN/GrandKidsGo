// /profile/children — 孩子档案管理（多孩切换 + 基础/扩展分离）
// 2026-07-31 v1.0 Phase A：22 字段全录入（3 基础 + 14 现有 + 7 新增），单页分组折叠，ChildDetail 可编辑
// 攻略体系 v1.0 P-bug-fix：用户答复 2026-07-30 — 登录后 returnTo 回 wizard 继续
'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { BabyIcon, SparklesIcon, ClockIcon, AlertIcon, ThumbsUpIcon, CloseIcon, EditIcon } from '@/components/Icons';
import { TagInput } from '@/components/TagInput';
import { ToggleField } from '@/components/ToggleField';
import { ChipGroup } from '@/components/ChipGroup';
import { getToken, authedFetch } from '@/lib/auth';
import { createChildFromClient } from '@/lib/child-sync-client';

type Child = {
  childId: string;
  nickname?: string | null;
  name?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  avatar?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  likes?: string[];
  activities?: string[];
  dislikes?: string[];
  allergies?: string[];
  activeHoursPerDay?: number;
  needNap?: string;
  earlyOrLate?: string;
  hasMotionSickness?: boolean;
  isShyWithStrangers?: boolean;
  healthNotes?: string | null;
  // 2026-07-31 v1.0 Phase A：7 新字段
  hasStudentCard?: boolean;
  idCardPrefix?: string | null;
  needsChildTicket?: boolean;
  strollerWidthCm?: number | null;
  comfortableTempC?: string | null;
  fearsAnimals?: boolean;
  dietaryRestrictions?: string[];
};

// 表单 24 字段（基础 3 + 现有 14 + 新增 7）
type ChildForm = {
  nickname: string;
  gender: string;
  birthDate: string;
  heightCm: string;       // string 便于 input 处理
  weightKg: string;
  likes: string[];
  activities: string[];
  dislikes: string[];
  allergies: string[];
  activeHoursPerDay: string;
  needNap: string;
  earlyOrLate: string;
  hasMotionSickness: boolean;
  isShyWithStrangers: boolean;
  healthNotes: string;
  // Phase A 7 新字段
  hasStudentCard: boolean;
  idCardPrefix: string;
  needsChildTicket: boolean;
  strollerWidthCm: string;
  comfortableTempLow: string;  // 双 input 拆开存
  comfortableTempHigh: string;
  fearsAnimals: boolean;
  dietaryRestrictions: string[];
};

const EMPTY_FORM: ChildForm = {
  nickname: '',
  gender: '',
  birthDate: '',
  heightCm: '',
  weightKg: '',
  likes: [],
  activities: [],
  dislikes: [],
  allergies: [],
  activeHoursPerDay: '',
  needNap: 'optional',
  earlyOrLate: 'early_bird',
  hasMotionSickness: false,
  isShyWithStrangers: false,
  healthNotes: '',
  hasStudentCard: false,
  idCardPrefix: '',
  needsChildTicket: true,
  strollerWidthCm: '',
  comfortableTempLow: '',
  comfortableTempHigh: '',
  fearsAnimals: false,
  dietaryRestrictions: [],
};

function childToForm(c: Child): ChildForm {
  const [low, high] = (c.comfortableTempC ?? '').split('-');
  return {
    nickname: c.nickname ?? c.name ?? '',
    gender: c.gender ?? '',
    birthDate: c.birthDate ? c.birthDate.split('T')[0]! : '',
    heightCm: c.heightCm != null ? String(c.heightCm) : '',
    weightKg: c.weightKg != null ? String(c.weightKg) : '',
    likes: c.likes ?? [],
    activities: c.activities ?? [],
    dislikes: c.dislikes ?? [],
    allergies: c.allergies ?? [],
    activeHoursPerDay: c.activeHoursPerDay != null ? String(c.activeHoursPerDay) : '',
    needNap: c.needNap ?? 'optional',
    earlyOrLate: c.earlyOrLate ?? 'early_bird',
    hasMotionSickness: c.hasMotionSickness ?? false,
    isShyWithStrangers: c.isShyWithStrangers ?? false,
    healthNotes: c.healthNotes ?? '',
    hasStudentCard: c.hasStudentCard ?? false,
    idCardPrefix: c.idCardPrefix ?? '',
    needsChildTicket: c.needsChildTicket ?? true,
    strollerWidthCm: c.strollerWidthCm != null ? String(c.strollerWidthCm) : '',
    comfortableTempLow: low ?? '',
    comfortableTempHigh: high ?? '',
    fearsAnimals: c.fearsAnimals ?? false,
    dietaryRestrictions: c.dietaryRestrictions ?? [],
  };
}

type Feeling = {
  childId: string;
  spotTypePreferences?: Record<string, number>;
  averageActiveStayMinutes?: number | null;
  cryingTriggers?: Record<string, number>;
  energyCurveByTimeOfDay?: Record<string, number>;
  totalDataPoints?: number;
};

export default function MyChildrenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">加载中…</div>}>
      <MyChildrenInner />
    </Suspense>
  );
}

function MyChildrenInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 用户答复 2026-07-30：从 /wizard 跳过来时带 returnTo=/wizard，登录后回到 wizard 继续
  const returnTo = searchParams?.get('returnTo') ?? '';
  const safeReturnTo = (returnTo.startsWith('/') && !returnTo.startsWith('//')) ? returnTo : '';
  const [children, setChildren] = useState<Child[]>([]);
  const [feelings, setFeelings] = useState<Record<string, Feeling>>({});
  const [activeId, setActiveId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; nickname: string; avatar: string | null } | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<ChildForm>(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  // 编辑模式（复用 ChildFormModal）
  const [editTarget, setEditTarget] = useState<Child | null>(null);
  const [editForm, setEditForm] = useState<ChildForm>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const token = typeof window !== 'undefined' ? getToken() : null;

  useEffect(() => {
    if (!token) {
      const loginRedirect = safeReturnTo
        ? `/login?redirect=${encodeURIComponent(safeReturnTo)}`
        : '/login?redirect=/profile/children';
      router.push(loginRedirect);
      return;
    }
    authedFetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d?.data ?? d?.user ?? d))
      .catch(() => {});
  }, [router, token]);

  const loadChildren = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const r = await authedFetch(`/api/user/children?userId=${uid}`, { userId: uid });
      const j = await r.json();
      const items: Child[] = j?.data?.items ?? j?.items ?? [];
      setChildren(items);
      if (items.length && !activeId) setActiveId(items[0].childId);
      // 拉所有孩子的感受画像
      const feelingMap: Record<string, Feeling> = {};
      await Promise.all(items.map(async c => {
        try {
          const fr = await authedFetch(`/api/user/children/${c.childId}/feeling`, { userId: uid });
          if (fr.ok) {
            const fj = await fr.json();
            feelingMap[c.childId] = fj?.data ?? fj;
          }
        } catch { /* skip */ }
      }));
      setFeelings(feelingMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, activeId]);

  useEffect(() => {
    if (user?.id && token) loadChildren(user.id);
  }, [user?.id, token, loadChildren]);

  const openAdd = () => {
    setAddForm(EMPTY_FORM);
    setAddError('');
    setShowAdd(true);
  };

  const submitAdd = async () => {
    if (!addForm.nickname.trim()) {
      setAddError('请填写孩子昵称');
      return;
    }
    if (!token) {
      setAddError('登录已过期，请重新登录');
      return;
    }
    setAddSaving(true);
    setAddError('');
    try {
      await createChildFromClient({
        nickname: addForm.nickname.trim(),
        gender: addForm.gender || undefined,
        birthday: addForm.birthDate || undefined,
        // Phase A 7 新字段透传
        heightCm: addForm.heightCm ? Number(addForm.heightCm) : undefined,
        weightKg: addForm.weightKg ? Number(addForm.weightKg) : undefined,
        likes: addForm.likes,
        activities: addForm.activities,
        dislikes: addForm.dislikes,
        allergies: addForm.allergies,
        activeHoursPerDay: addForm.activeHoursPerDay ? Number(addForm.activeHoursPerDay) : undefined,
        needNap: addForm.needNap as 'required' | 'optional' | 'none',
        earlyOrLate: addForm.earlyOrLate as 'early_bird' | 'night_owl',
        hasMotionSickness: addForm.hasMotionSickness,
        isShyWithStrangers: addForm.isShyWithStrangers,
        healthNotes: addForm.healthNotes || undefined,
        hasStudentCard: addForm.hasStudentCard,
        idCardPrefix: addForm.idCardPrefix || undefined,
        needsChildTicket: addForm.needsChildTicket,
        strollerWidthCm: addForm.strollerWidthCm ? Number(addForm.strollerWidthCm) : undefined,
        comfortableTempC:
          addForm.comfortableTempLow && addForm.comfortableTempHigh
            ? `${addForm.comfortableTempLow}-${addForm.comfortableTempHigh}`
            : undefined,
        fearsAnimals: addForm.fearsAnimals,
        dietaryRestrictions: addForm.dietaryRestrictions,
      });
      setShowAdd(false);
      if (user?.id) await loadChildren(user.id);

      // P-bug-fix：从 /wizard 跳过来时，添加完成后回到 wizard 继续填表
      if (safeReturnTo) {
        alert('添加成功，正在回到原来的页面继续操作');
        router.push(safeReturnTo);
        return;
      }
    } catch (e: any) {
      setAddError(e?.message || '添加失败，请稍后重试');
    } finally {
      setAddSaving(false);
    }
  };

  const openEdit = (child: Child) => {
    setEditTarget(child);
    setEditForm(childToForm(child));
    setEditError('');
  };

  const submitEdit = async () => {
    if (!editTarget || !user?.id) return;
    if (!editForm.nickname.trim()) {
      setEditError('请填写孩子昵称');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const res = await authedFetch(`/api/travel/children/${editTarget.childId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          heightCm: editForm.heightCm ? Number(editForm.heightCm) : null,
          weightKg: editForm.weightKg ? Number(editForm.weightKg) : null,
          likes: editForm.likes,
          activities: editForm.activities,
          dislikes: editForm.dislikes,
          allergies: editForm.allergies,
          activeHoursPerDay: editForm.activeHoursPerDay ? Number(editForm.activeHoursPerDay) : null,
          needNap: editForm.needNap,
          earlyOrLate: editForm.earlyOrLate,
          hasMotionSickness: editForm.hasMotionSickness,
          isShyWithStrangers: editForm.isShyWithStrangers,
          healthNotes: editForm.healthNotes,
          // Phase A 7 新字段
          hasStudentCard: editForm.hasStudentCard,
          idCardPrefix: editForm.idCardPrefix || null,
          needsChildTicket: editForm.needsChildTicket,
          strollerWidthCm: editForm.strollerWidthCm ? Number(editForm.strollerWidthCm) : null,
          comfortableTempC:
            editForm.comfortableTempLow && editForm.comfortableTempHigh
              ? `${editForm.comfortableTempLow}-${editForm.comfortableTempHigh}`
              : null,
          fearsAnimals: editForm.fearsAnimals,
          dietaryRestrictions: editForm.dietaryRestrictions,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message ?? `HTTP ${res.status}`);
      }
      setEditTarget(null);
      await loadChildren(user.id);
    } catch (e: any) {
      setEditError(e?.message || '更新失败，请稍后重试');
    } finally {
      setEditSaving(false);
    }
  };

  const active = children.find(c => c.childId === activeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ProfileSidebar user={user} counts={{
        guides: 0,
        children: children.length,
        sayings: 0,
        badges: 0,
      }} />
      <div className="space-y-4 min-w-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-extrabold text-gray-900">孩子档案</h1>
            <button
              onClick={openAdd}
              className="text-sm px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-medium"
            >
              + 添加孩子
            </button>
          </div>
          {loading ? (
            <p className="text-gray-400 py-8 text-center">加载中…</p>
          ) : children.length === 0 ? (
            <EmptyChildren />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {children.map(c => {
                const initials = (c.nickname ?? c.name ?? '宝')[0];
                return (
                  <button
                    key={c.childId}
                    onClick={() => setActiveId(c.childId)}
                    className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition flex-shrink-0 ${
                      activeId === c.childId ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${
                      activeId === c.childId
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                        : 'bg-gradient-to-br from-pink-100 to-amber-100 text-gray-700'
                    }`}>
                      {c.avatar ? <img src={c.avatar} alt="" className="w-14 h-14 rounded-full object-cover" /> : initials}
                    </span>
                    <span className="text-xs text-gray-700 max-w-[60px] truncate">{c.nickname ?? c.name ?? '未命名'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {active && <ChildDetail child={active} feeling={feelings[active.childId]} onEdit={() => openEdit(active)} />}

        {showAdd && (
          <ChildFormModal
            mode="create"
            form={addForm}
            setForm={setAddForm}
            saving={addSaving}
            error={addError}
            onClose={() => setShowAdd(false)}
            onSubmit={submitAdd}
          />
        )}

        {editTarget && (
          <ChildFormModal
            mode="edit"
            childId={editTarget.childId}
            form={editForm}
            setForm={setEditForm}
            saving={editSaving}
            error={editError}
            onClose={() => setEditTarget(null)}
            onSubmit={submitEdit}
          />
        )}
      </div>
    </div>
  );
}

function ChildFormModal({
  mode,
  childId,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  childId?: string;
  form: ChildForm;
  setForm: (f: ChildForm) => void;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const isCreate = mode === 'create';
  const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          aria-label="关闭"
        >
          <CloseIcon size={18} />
        </button>
        <h2 className="text-lg font-extrabold text-gray-900 mb-1">
          {isCreate ? '添加孩子' : '编辑孩子档案'}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          {isCreate
            ? '基础信息会同步到主站童慧行账号，两边都能用'
            : '只保存扩展字段；基础字段需到主站修改'}
        </p>

        <div className="space-y-4">
          {/* 基础（必填） */}
          <details open className="border border-gray-100 rounded-lg p-3">
            <summary className="text-sm font-bold text-gray-900 cursor-pointer">基础（必填）</summary>
            <div className="mt-3 space-y-3">
              <div>
                <FieldLabel required>昵称</FieldLabel>
                <input
                  type="text"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  placeholder="如：朵朵、小宝"
                  maxLength={20}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <FieldLabel>性别</FieldLabel>
                <ChipGroup
                  value={form.gender}
                  onChange={(v) => setForm({ ...form, gender: v })}
                  options={[
                    { value: 'male', label: '男宝' },
                    { value: 'female', label: '女宝' },
                  ]}
                />
              </div>
              <div>
                <FieldLabel>生日</FieldLabel>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </details>

          {/* 体格 */}
          <details open className="border border-gray-100 rounded-lg p-3">
            <summary className="text-sm font-bold text-gray-900 cursor-pointer">体格</summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>身高 (cm)</FieldLabel>
                <input
                  type="number"
                  min="40" max="200" step="0.5"
                  value={form.heightCm}
                  onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                  placeholder="如 95"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <FieldLabel>体重 (kg)</FieldLabel>
                <input
                  type="number"
                  min="3" max="100" step="0.1"
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                  placeholder="如 14"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </details>

          {/* 兴趣 */}
          <details open className="border border-gray-100 rounded-lg p-3">
            <summary className="text-sm font-bold text-gray-900 cursor-pointer">兴趣 / 讨厌 / 过敏</summary>
            <div className="mt-3 space-y-3">
              <div>
                <FieldLabel>喜欢</FieldLabel>
                <TagInput value={form.likes} onChange={(v) => setForm({ ...form, likes: v })} placeholder="如：动物、恐龙、积木" />
              </div>
              <div>
                <FieldLabel>活动偏好</FieldLabel>
                <TagInput value={form.activities} onChange={(v) => setForm({ ...form, activities: v })} placeholder="如：游泳、滑梯、画画" />
              </div>
              <div>
                <FieldLabel>讨厌</FieldLabel>
                <TagInput value={form.dislikes} onChange={(v) => setForm({ ...form, dislikes: v })} placeholder="如：黑暗、打雷" />
              </div>
              <div>
                <FieldLabel>过敏</FieldLabel>
                <TagInput value={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} placeholder="如：花生、海鲜" />
              </div>
            </div>
          </details>

          {/* 作息 */}
          <details open className="border border-gray-100 rounded-lg p-3">
            <summary className="text-sm font-bold text-gray-900 cursor-pointer">作息</summary>
            <div className="mt-3 space-y-3">
              <div>
                <FieldLabel>每天活跃时长（小时）</FieldLabel>
                <input
                  type="number" min="1" max="12" step="0.5"
                  value={form.activeHoursPerDay}
                  onChange={(e) => setForm({ ...form, activeHoursPerDay: e.target.value })}
                  placeholder="默认 6"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <FieldLabel>午休</FieldLabel>
                <ChipGroup
                  value={form.needNap}
                  onChange={(v) => setForm({ ...form, needNap: v })}
                  options={[
                    { value: 'required', label: '必午休', desc: '强制 12:30-14:00 休息' },
                    { value: 'optional', label: '可午休', desc: '软建议' },
                    { value: 'none', label: '不午休' },
                  ]}
                />
              </div>
              <div>
                <FieldLabel>早起 / 晚起</FieldLabel>
                <ChipGroup
                  value={form.earlyOrLate}
                  onChange={(v) => setForm({ ...form, earlyOrLate: v })}
                  options={[
                    { value: 'early_bird', label: '早起型', desc: '07:00-18:00' },
                    { value: 'night_owl', label: '晚起型', desc: '10:00-21:00' },
                  ]}
                />
              </div>
            </div>
          </details>

          {/* 健康 */}
          <details className="border border-gray-100 rounded-lg p-3">
            <summary className="text-sm font-bold text-gray-900 cursor-pointer">健康</summary>
            <div className="mt-3 space-y-3">
              <ToggleField
                label="容易晕车"
                desc="长途优先高铁/飞机"
                checked={form.hasMotionSickness}
                onChange={(v) => setForm({ ...form, hasMotionSickness: v })}
              />
              <div>
                <FieldLabel>饮食限制</FieldLabel>
                <TagInput
                  value={form.dietaryRestrictions}
                  onChange={(v) => setForm({ ...form, dietaryRestrictions: v })}
                  placeholder="如：素食、清真、无糖"
                  presets={['素食', '清真', '无糖', '无麸质', '无乳制品']}
                />
              </div>
              <div>
                <FieldLabel>健康备注</FieldLabel>
                <textarea
                  value={form.healthNotes}
                  onChange={(e) => setForm({ ...form, healthNotes: e.target.value })}
                  maxLength={200}
                  rows={2}
                  placeholder="如：哮喘、慢性鼻炎"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </details>

          {/* 性格 */}
          <details className="border border-gray-100 rounded-lg p-3">
            <summary className="text-sm font-bold text-gray-900 cursor-pointer">性格</summary>
            <div className="mt-3 space-y-3">
              <ToggleField
                label="怕生"
                desc="避开人挤、高峰景点"
                checked={form.isShyWithStrangers}
                onChange={(v) => setForm({ ...form, isShyWithStrangers: v })}
              />
              <ToggleField
                label="怕动物"
                desc="避开动物园、宠物互动"
                checked={form.fearsAnimals}
                onChange={(v) => setForm({ ...form, fearsAnimals: v })}
              />
              <div>
                <FieldLabel>最适宜温度（°C）</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="40"
                    value={form.comfortableTempLow}
                    onChange={(e) => setForm({ ...form, comfortableTempLow: e.target.value })}
                    placeholder="如 20"
                    className="w-20 px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-400">至</span>
                  <input
                    type="number" min="0" max="40"
                    value={form.comfortableTempHigh}
                    onChange={(e) => setForm({ ...form, comfortableTempHigh: e.target.value })}
                    placeholder="如 28"
                    className="w-20 px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-xs text-gray-400">空 = 不限</span>
                </div>
              </div>
            </div>
          </details>

          {/* 票务 */}
          <details className="border border-gray-100 rounded-lg p-3">
            <summary className="text-sm font-bold text-gray-900 cursor-pointer">票务</summary>
            <div className="mt-3 space-y-3">
              <ToggleField
                label="有学生证"
                desc="景区门票半价"
                checked={form.hasStudentCard}
                onChange={(v) => setForm({ ...form, hasStudentCard: v })}
                recommended="半价"
              />
              <ToggleField
                label="适用儿童票规则"
                desc="1.2m 以上但仍可购儿童票的景区自动匹配"
                checked={form.needsChildTicket}
                onChange={(v) => setForm({ ...form, needsChildTicket: v })}
              />
              <div>
                <FieldLabel>身份证号前 6 位（脱敏）</FieldLabel>
                <input
                  type="text" maxLength={6} pattern="[0-9]{6}"
                  value={form.idCardPrefix}
                  onChange={(e) => setForm({ ...form, idCardPrefix: e.target.value.replace(/\D/g, '') })}
                  placeholder="如 110108（北京海淀区）"
                  className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">仅用于购票年龄段参考，不会泄露完整证件号</p>
              </div>
            </div>
          </details>

          {/* 推车 */}
          <details className="border border-gray-100 rounded-lg p-3">
            <summary className="text-sm font-bold text-gray-900 cursor-pointer">推车</summary>
            <div className="mt-3">
              <FieldLabel>推车宽度 (cm)</FieldLabel>
              <input
                type="number" min="20" max="120"
                value={form.strollerWidthCm}
                onChange={(e) => setForm({ ...form, strollerWidthCm: e.target.value })}
                placeholder="如 55（标准推车）"
                className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">景区闸机宽度若小于此值会自动提示受限</p>
            </div>
          </details>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={saving || !form.nickname.trim()}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white disabled:opacity-50"
          >
            {saving ? '保存中…' : isCreate ? '保存' : '更新'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyChildren() {
  return (
    <div className="text-center py-8">
      <BabyIcon size={40} className="mx-auto text-gray-300 mb-3" />
      <p className="text-gray-700 font-medium">还没有添加孩子</p>
      <p className="text-sm text-gray-400 mt-1 mb-4">孩子档案会同步到主站童慧行账号</p>
      <a href="https://grandand.com/personal-center" target="_blank" rel="noopener" className="inline-block px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold">
        去主站添加
      </a>
      <p className="text-xs text-gray-400 mt-3">或在上方直接点击"+ 添加孩子"在线添加</p>
    </div>
  );
}

function ChildDetail({ child, feeling, onEdit }: { child: Child; feeling?: Feeling; onEdit?: () => void }) {
  const age = child.birthDate ? computeAge(child.birthDate) : null;
  const genderLabel = child.gender === 'male' ? '♂ 男宝' : child.gender === 'female' ? '♀ 女宝' : '';
  const topSpots = feeling?.spotTypePreferences
    ? Object.entries(feeling.spotTypePreferences).sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [];
  const topTriggers = feeling?.cryingTriggers
    ? Object.entries(feeling.cryingTriggers).sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [];

  return (
    <>
      {/* 基本信息 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold">
            {child.avatar ? <img src={child.avatar} alt="" className="w-20 h-20 rounded-full object-cover" /> : (child.nickname ?? child.name ?? '宝')[0]}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-extrabold text-gray-900">{child.nickname ?? child.name ?? '未命名'}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {genderLabel}
              {age && <span className="ml-2">{age}</span>}
            </p>
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium"
              aria-label="编辑孩子档案"
            >
              <EditIcon size={14} />
              编辑
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {child.birthDate && <Info label="生日" value={child.birthDate} />}
          {child.heightCm != null && <Info label="身高" value={`${child.heightCm} cm`} />}
          {child.weightKg != null && <Info label="体重" value={`${child.weightKg} kg`} />}
          {child.needNap && <Info label="午休" value={child.needNap === 'required' ? '必午休' : child.needNap === 'optional' ? '可午休' : '不午休'} />}
          {child.earlyOrLate && <Info label="作息" value={child.earlyOrLate === 'early_bird' ? '早起型' : '晚起型'} />}
          {child.activeHoursPerDay !== undefined && child.activeHoursPerDay != null && <Info label="活跃时长" value={`${child.activeHoursPerDay} 小时/天`} />}
          {child.hasMotionSickness !== undefined && <Info label="晕车" value={child.hasMotionSickness ? '是' : '否'} />}
          {child.isShyWithStrangers !== undefined && <Info label="怕生" value={child.isShyWithStrangers ? '是' : '否'} />}
          {child.fearsAnimals !== undefined && <Info label="怕动物" value={child.fearsAnimals ? '是' : '否'} />}
        </div>
        {/* Phase A 新字段 chip 区 */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
          {child.hasStudentCard && <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">🎓 学生证</span>}
          {child.needsChildTicket !== false && <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">🎫 儿童票</span>}
          {child.strollerWidthCm != null && <span className="text-[10px] px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full">🚼 推车 {child.strollerWidthCm}cm</span>}
          {child.comfortableTempC && <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">🌡 适宜 {child.comfortableTempC}°C</span>}
          {!!child.dietaryRestrictions?.length && (
            <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
              🍱 {child.dietaryRestrictions.slice(0, 3).join(' / ')}{child.dietaryRestrictions.length > 3 ? '…' : ''}
            </span>
          )}
        </div>
      </div>

      {/* 兴趣/活动/讨厌/过敏 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TagBlock icon={<ThumbsUpIcon size={16} className="text-pink-500" />} title="喜欢" tags={child.likes ?? []} empty="暂未填写" />
        <TagBlock icon={<SparklesIcon size={16} className="text-indigo-500" />} title="活动偏好" tags={child.activities ?? []} empty="暂未填写" />
        <TagBlock icon={<AlertIcon size={16} className="text-orange-500" />} title="讨厌" tags={child.dislikes ?? []} empty="暂未填写" />
        <TagBlock icon={<AlertIcon size={16} className="text-red-500" />} title="过敏" tags={child.allergies ?? []} empty="暂未填写" />
      </div>

      {/* 感受画像摘要 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-3 inline-flex items-center gap-2">
          <ClockIcon size={16} className="text-blue-600" /> 感受画像
        </h3>
        {feeling?.totalDataPoints === 0 || !feeling ? (
          <p className="text-sm text-gray-400">暂无数据。等孩子去过几个景点后会自动汇总最爱景点、哭闹触发、活跃时段。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">最爱景点类型</p>
              {topSpots.length === 0 ? <p className="text-gray-400">—</p> : (
                <ul className="space-y-1">
                  {topSpots.map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="text-blue-600 font-medium">{v} 次</span></li>)}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">哭闹触发</p>
              {topTriggers.length === 0 ? <p className="text-gray-400">—</p> : (
                <ul className="space-y-1">
                  {topTriggers.map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="text-orange-600 font-medium">{v} 次</span></li>)}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">平均停留</p>
              <p className="text-2xl font-extrabold text-gray-900">{feeling?.averageActiveStayMinutes ?? '—'} <span className="text-sm text-gray-500">分钟</span></p>
              <p className="text-xs text-gray-400 mt-2">数据点 {feeling?.totalDataPoints ?? 0}</p>
            </div>
          </div>
        )}
      </div>

      {child.healthNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
          <strong>健康备注：</strong>{child.healthNotes}
        </div>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-gray-900 font-medium mt-0.5">{value}</div>
    </div>
  );
}

function TagBlock({ icon, title, tags, empty }: { icon: React.ReactNode; title: string; tags: string[]; empty: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 className="font-bold text-gray-900 mb-2 inline-flex items-center gap-1.5">{icon}{title}</h3>
      {tags.length === 0 ? (
        <p className="text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => <span key={t} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">{t}</span>)}
        </div>
      )}
    </div>
  );
}

function computeAge(birthDate: string): string {
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return '';
  const now = new Date();
  const months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (months < 24) return `${months} 月`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} 岁` : `${years} 岁 ${rest} 月`;
}