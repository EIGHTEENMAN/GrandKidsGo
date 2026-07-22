// 关于我们 - 走天下 PC 端
// 内容来源：项目建设方案/about-travel.md
// 设计：长文阅读体验 + 大段落 + 强调句

'use client';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <Link href="/" className="text-blue-100 text-sm hover:text-white">← 返回首页</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-3">关于童慧行走天下</h1>
          <p className="text-blue-100 mt-2 text-sm md:text-base">孩子说好才是真的好</p>
        </div>
      </header>

      <article className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 leading-relaxed text-gray-800">
          <p className="text-lg mb-6 font-medium text-gray-900">
            童慧行走天下是一个专为亲子家庭打造的旅行攻略平台。
          </p>

          <p className="mb-8 text-gray-700">
            我们相信，带孩子看世界，不该是一场冒险，而是一段简单而温暖的旅程。童慧行走天下由此而生——汇聚千万真实家庭的亲子旅行经验，让每一次出行都有迹可循，让每一次陪伴都成为成长的记忆。
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-10">
            我们和其他旅行攻略有什么不同
          </h2>

          <p className="mb-6 text-gray-700">
            大多数旅行攻略关注的是"怎么玩最爽"，而童慧行走天下关注的是"孩子怎么玩最开心"。每一篇攻略都带着孩子的视角：
          </p>

          <ul className="space-y-3 mb-8 pl-4 border-l-2 border-green-200">
            <li className="text-gray-700">这里适合多大的孩子？推车方便吗？有母婴室吗？</li>
            <li className="text-gray-700">餐厅有儿童餐吗？排队太久孩子会不会闹？</li>
            <li className="text-gray-700">酒店有没有儿童游乐区？周边有没有药店和医院？</li>
            <li className="text-gray-700">雨天备选方案是什么？孩子体力跟得上吗？</li>
          </ul>

          <p className="mb-6 text-gray-700">
            我们不看滤镜下的网红打卡，只看真实的带娃体验——哪个海滩孩子能挖一下午沙，哪个博物馆孩子愿意主动走完，哪条徒步路线孩子不会喊累。
          </p>

          <p className="mb-8 text-gray-700">
            从海边挖沙到草原追星，从博物馆探宝到山野徒步，每一次出行都有真实的经验可循。因为我们深知，好的亲子旅行，不是去了多远的地方，而是孩子笑了，一家人就都笑了。
          </p>

          <p className="text-2xl font-extrabold text-blue-700 text-center py-6 border-t border-b border-blue-100">
            童慧行走天下，孩子说好才是真的好。
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-full shadow-md hover:shadow-lg transition"
          >
            开始探索亲子宝典 →
          </Link>
        </div>
      </article>
    </main>
  );
}
