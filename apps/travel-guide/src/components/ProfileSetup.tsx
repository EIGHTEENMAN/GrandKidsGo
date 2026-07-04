'use client';

import { useState } from 'react';
import { getToken } from '@/lib/auth';

type ProfileSetupProps = {
  open: boolean;
  onComplete: () => void;
};

const avatars = ['🦁', '🐯', '🐼', '🐨', '🐸', '🦊', '🐰', '🐙', '🦄', '🐲'];

export default function ProfileSetup({ open, onComplete }: ProfileSetupProps) {
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [children, setChildren] = useState([{ nickname: '', gender: '', age: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const updateChild = (idx: number, field: string, value: string) => {
    setChildren(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const addChild = () => {
    setChildren(prev => [...prev, { nickname: '', gender: '', age: '' }]);
  };

  const removeChild = (idx: number) => {
    setChildren(prev => prev.filter((_, i) => i !== idx));
  };

  const saveProfile = async () => {
    if (!nickname.trim()) { setError('请输入昵称'); return; }
    setError('');
    setSaving(true);
    const token = getToken();
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nickname: nickname.trim(), avatar }),
      });

      for (const child of children) {
        if (child.nickname.trim()) {
          await fetch('/api/user/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              nickname: child.nickname.trim(),
              gender: child.gender || undefined,
              age: child.age ? parseInt(child.age) : undefined,
            }),
          });
        }
      }

      localStorage.removeItem('isNewUser');
      onComplete();
    } catch { setError('保存失败'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 animate-fadeInUp">
        {/* Steps indicator */}
        <div className="flex gap-2 mb-6">
          <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
          <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-green-500' : 'bg-gray-200'}`} />
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">完善资料</h2>
            <p className="text-sm text-gray-500 mb-6">设置你的昵称和头像</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择头像</label>
              <div className="flex flex-wrap gap-2">
                {avatars.map(a => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`w-12 h-12 text-2xl flex items-center justify-center rounded-xl border-2 transition-all ${
                      avatar === a ? 'border-green-500 bg-green-50 scale-110' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">昵称 *</label>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="给自己取个好听的名字"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                maxLength={20}
              />
            </div>

            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

            <button
              onClick={() => { if (!nickname.trim()) { setError('请输入昵称'); return; } setError(''); setStep(2); }}
              className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-all"
            >
              下一步
            </button>
          </>
        )}

        {/* Step 2: Children */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">添加孩子信息</h2>
            <p className="text-sm text-gray-500 mb-6">填写孩子的昵称、性别和年龄（可跳过）</p>

            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {children.map((child, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 relative">
                  {children.length > 1 && (
                    <button
                      onClick={() => removeChild(i)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm"
                    >
                      ✕
                    </button>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">孩子昵称</label>
                      <input
                        value={child.nickname}
                        onChange={e => updateChild(i, 'nickname', e.target.value)}
                        placeholder="如：小明"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">性别</label>
                        <select
                          value={child.gender}
                          onChange={e => updateChild(i, 'gender', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        >
                          <option value="">保密</option>
                          <option value="boy">男孩</option>
                          <option value="girl">女孩</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">年龄</label>
                        <select
                          value={child.age}
                          onChange={e => updateChild(i, 'age', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        >
                          <option value="">请选择</option>
                          {Array.from({ length: 18 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}岁</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addChild}
              className="w-full py-2.5 mt-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-green-300 hover:text-green-600 transition-colors"
            >
              + 添加另一个孩子
            </button>

            {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
              >
                上一步
              </button>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-all"
              >
                {saving ? '保存中...' : '完成'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
