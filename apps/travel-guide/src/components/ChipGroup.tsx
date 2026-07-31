// Chip 单选/多选组件（受控）
// 用于 gender / needNap / earlyOrLate 等枚举字段
'use client';

export interface ChipOption {
  value: string;
  label: string;
  desc?: string;
}

export interface ChipGroupProps {
  options: ChipOption[];
  value: string;
  onChange: (v: string) => void;
  multi?: boolean; // 多选模式
}

export function ChipGroup({ options, value, onChange, multi = false }: ChipGroupProps) {
  const selected = multi ? (value ? value.split(',') : []) : value ? [value] : [];

  const toggle = (v: string) => {
    if (multi) {
      const set = new Set(selected);
      if (set.has(v)) set.delete(v); else set.add(v);
      onChange(Array.from(set).join(','));
    } else {
      onChange(value === v ? '' : v);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`flex-1 min-w-[80px] py-2 px-2 rounded-lg text-sm font-medium border transition ${
              isSelected
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <div>{opt.label}</div>
            {opt.desc && <div className="text-[10px] text-gray-500 mt-0.5 font-normal">{opt.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}
