"use client";

/**
 * 「孩子最怕」预警横幅组件
 *
 * 在景点详情页 Hero 下方展示，提醒家长该类型景点同龄孩子的哭闹/烦躁率高。
 * 数据来自 API 返回的 childWarning 字段（computeChildWarning）。
 */

import { useState } from "react";
import type { ChildWarning } from "@/lib/compute-child-warnings";

interface Props {
  data: ChildWarning;
}

export default function ChildFearWarning({ data }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (!data.warning || dismissed) return null;

  const ratePct = Math.round(data.cryRate * 100);

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/90 px-5 py-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <span className="text-2xl shrink-0 mt-0.5">😰</span>

        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <h3 className="text-sm font-bold text-amber-800 mb-1">
            {data.message}
          </h3>

          {/* 详情 */}
          <p className="text-xs text-amber-700 leading-relaxed mb-2">
            {data.detail}
          </p>

          {/* 常见触发器标签 */}
          {data.commonTriggers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {data.commonTriggers.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-medium text-amber-800"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* 数据脚注 */}
          <div className="flex items-center gap-3 text-[10px] text-amber-600">
            <span>
              基于 {data.totalProfiles} 位孩子 · {ratePct}% 哭闹/烦躁率
            </span>
            <span className="opacity-40">|</span>
            <span>数据来源：走天下真实家庭反馈</span>
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors p-1 -mr-1"
          aria-label="关闭预警"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
