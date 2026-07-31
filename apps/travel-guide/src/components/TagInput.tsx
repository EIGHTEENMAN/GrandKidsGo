// 通用 Tag 输入组件（受控）
// 用于 likes / dislikes / allergies / activities / dietaryRestrictions
// 输入框回车添加，× 按钮删除
'use client';
import { useState } from 'react';
import { CloseIcon } from './Icons';

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  presets?: string[];      // 预设 tag chip（如 dietaryRestrictions: 素食/清真/无糖）
  presetsRemovable?: boolean; // 预设 chip 是否允许删除（默认 true）
}

export function TagInput({
  value,
  onChange,
  placeholder = '输入后回车',
  maxTags = 20,
  presets = [],
  presetsRemovable = true,
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const t = draft.trim();
    if (!t) return;
    if (value.includes(t)) { setDraft(''); return; }
    if (value.length >= maxTags) { setDraft(''); return; }
    onChange([...value, t]);
    setDraft('');
  };

  const remove = (tag: string) => onChange(value.filter(v => v !== tag));

  const togglePreset = (tag: string) => {
    if (value.includes(tag)) {
      if (presetsRemovable) remove(tag);
    } else {
      if (value.length >= maxTags) return;
      onChange([...value, tag]);
    }
  };

  // 计算还未选的预设
  const availablePresets = presets.filter(p => !value.includes(p));

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="hover:bg-blue-100 rounded-full p-0.5"
              aria-label={`删除 ${tag}`}
            >
              <CloseIcon size={10} />
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span className="text-xs text-gray-400 self-center">暂未添加</span>
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
              // backspace 删除最后一个
              remove(value[value.length - 1]!);
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
          maxLength={20}
          className="flex-1 min-w-0 px-2.5 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={commit}
          disabled={!draft.trim()}
          className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-40"
        >
          添加
        </button>
      </div>
      {presets.length > 0 && availablePresets.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          <span className="text-[10px] text-gray-400 self-center mr-1">常用：</span>
          {availablePresets.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => togglePreset(tag)}
              className="text-[11px] px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full border border-gray-200 hover:border-blue-300 hover:text-blue-600"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
