'use client';

import Link from 'next/link';

export default function ComingSoon() {
  return (
    <div className="relative min-h-[calc(100vh-56px)] flex flex-col">
      {/* Full-screen background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=85')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/70 via-green-800/60 to-green-950/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-green-950/90 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Brand */}
        <div className="animate-fadeInUp">
          {/* Logo area */}
          <div className="mb-6 inline-flex items-center gap-3">
            <span className="text-6xl">✈️</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">
            童慧行走天下
          </h1>

          <p className="text-2xl md:text-3xl font-bold text-green-300 mb-8 drop-shadow">
            孩子说好才是真的好
          </p>

          {/* Divider */}
          <div className="w-24 h-1 bg-green-400/60 rounded-full mx-auto mb-8" />

          {/* Intro */}
          <div className="max-w-xl mx-auto space-y-3 mb-10">
            <p className="text-lg text-white/80 leading-relaxed">
              汇聚千万真实家庭的亲子旅行经验，从目的地精选、详细行程规划到儿童互动玩法——让每一次出行都有迹可循，让每一段旅程都成为孩子成长的美好记忆。
            </p>
            <p className="text-base text-white/50">
              我们将提供：目的地攻略 · 亲子游记 · 足迹地图 · 儿童画廊 · 主题挑战
            </p>
          </div>

          {/* Coming soon badge */}
          <div className="mb-10">
            <span className="inline-block px-8 py-3 bg-white/15 backdrop-blur-md border border-white/30 rounded-full text-lg font-semibold text-white/90 shadow-lg">
              敬请期待 · 即将上线
            </span>
          </div>

          {/* Back to main site */}
          <Link
            href="https://grandand.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white/80 hover:text-white rounded-full text-sm font-medium transition-all border border-white/20 hover:border-white/40"
          >
            ← 返回童慧行主站
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6">
        <p className="text-sm text-white/30">
          &copy; {new Date().getFullYear()} 童慧行走天下 &mdash; 童慧行旗下亲子旅行品牌
        </p>
      </footer>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out both;
        }
      `}</style>
    </div>
  );
}
