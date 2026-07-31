// 布尔 toggle 字段（受控）
// 用于 hasStudentCard / needsChildTicket / hasMotionSickness / isShyWithStrangers / fearsAnimals
'use client';

export interface ToggleFieldProps {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  recommended?: string; // 推荐文案（如「门票半价」）
}

export function ToggleField({ label, desc, checked, onChange, recommended }: ToggleFieldProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition mt-0.5 ${
          checked ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm text-gray-800 font-medium">{label}</span>
          {recommended && checked && (
            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {recommended}
            </span>
          )}
        </div>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
    </label>
  );
}
