// 候选卡片的孩子画像提示 chip 区
// 三色：customization 蓝 / warning 橙 / info 灰
// 2026-07-31 v1.0 Phase A
'use client';

interface ChildProfileHint {
  type: 'customization' | 'warning' | 'info';
  icon: '🎯' | '⚠️' | '📐';
  text: string;
}

const COLOR_MAP: Record<ChildProfileHint['type'], string> = {
  customization: 'bg-blue-50 text-blue-700 border-blue-100',
  warning: 'bg-orange-50 text-orange-700 border-orange-100',
  info: 'bg-gray-50 text-gray-700 border-gray-200',
};

export function ChildProfileHints({ hints, max = 4 }: { hints?: ChildProfileHint[]; max?: number }) {
  if (!hints || hints.length === 0) return null;
  const shown = hints.slice(0, max);
  const more = hints.length - max;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {shown.map((h, i) => (
        <span
          key={i}
          className={`text-[11px] sm:text-xs px-2 py-0.5 rounded-full border ${COLOR_MAP[h.type]} inline-flex items-center gap-1`}
          title={h.text}
        >
          <span aria-hidden>{h.icon}</span>
          <span className="truncate max-w-[200px]">{h.text}</span>
        </span>
      ))}
      {more > 0 && (
        <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-500 border-gray-200">
          +{more} 条
        </span>
      )}
    </div>
  );
}
