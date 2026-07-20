// Wizard 入口 - PC 端
'use client';
import Link from 'next/link';

const STEPS = [
  { n: 1, t: '选城市', d: '3 城起步：北京 / 上海 / 广州', e: '🏙️' },
  { n: 2, t: '基本信息', d: '出行日期 / 旅行人 / 孩子月龄', e: '📋' },
  { n: 3, t: '偏好', d: '风格 / 预算 / 节奏 / 必避事项', e: '🎯' },
  { n: 4, t: '引擎 A 自动拼装', d: '3 档候选（省时 / 省钱 / 舒服），100ms 出方案', e: '⚡' },
];

export default function WizardLanding() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">✈️ 我也要做计划</h1>
          <p className="text-blue-100 mt-1">4 步完成亲子旅行规划 · 引擎 A 自动拼装</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📋 必填基础：孩子画像</h2>
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
            走天下的核心：基于孩子真实感受数据（不是 GPS/热门排行）。引擎 A 必须基于孩子月龄 + 偏好 + 体力来拼装，<strong className="text-green-700">这是 v1.5 钉死的承诺二</strong>。
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            💡 推荐使用童慧行 APP 进入，扫码登录自动带入孩子画像。
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{s.e}</div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400">第 {s.n} 步</div>
                  <h3 className="text-lg font-bold text-gray-900 mt-1">{s.t}</h3>
                  <p className="text-sm text-gray-600 mt-1">{s.d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/wizard/step1-city"
            className="inline-block px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-lg rounded-full shadow-lg transition"
          >
            开始制作计划 →
          </Link>
          <p className="text-xs text-gray-400 mt-3">移动端打开童慧行 APP → 走天下 tab，体验更佳</p>
        </div>
      </div>
    </main>
  );
}
