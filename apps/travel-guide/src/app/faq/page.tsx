import Link from 'next/link';

export const metadata = { title: '常见问题 - 童慧行走天下', description: '关于童慧行走天下的常见问题解答' };

export default function FAQPage() {
  const faqs = [
    { q: '童慧行走天下是什么？', a: '童慧行走天下是一个专注于亲子旅行的攻略平台，汇集千万真实家庭的旅行经验，帮助父母轻松规划亲子出行。' },
    { q: '如何发布攻略？', a: '注册并登录后，点击首页或攻略详情页的"发布攻略"按钮，填写标题、目的地、内容等信息即可发布。' },
    { q: '攻略内容可以使用富文本吗？', a: '可以。发布攻略时，内容编辑器支持富文本排版，包括标题、粗体、列表、引用、链接等多种格式。' },
    { q: '如何修改已发布的攻略？', a: '目前暂不支持编辑已发布的攻略，如需修改请联系管理员。' },
    { q: '亲子评分有什么用？', a: '亲子评分帮助其他家长了解一个目的地或攻略的亲子友好程度，评分越高表示越适合带孩子去。' },
    { q: '什么是"足迹地图"？', a: '足迹地图是让孩子记录去过的地方的功能，每到一个新地方可以打卡签到，收集属于自己的旅行地图。' },
    { q: '什么是"儿童画廊"？', a: '儿童画廊是专门为孩子设计的照片展示区，孩子可以上传旅行中的照片并配上说明。' },
    { q: '什么是"孩子说"？', a: '"孩子说"记录孩子在旅行中的童言趣语，保存这些珍贵的成长瞬间。' },
    { q: '我的数据安全吗？', a: '我们非常重视隐私保护。所有数据存储在国内服务器，不会与第三方共享个人信息。详情请查看隐私政策。' },
    { q: '如何联系管理员？', a: '如有任何问题或建议，请在游记详情页留言，或通过管理员后台联系我们。' },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="text-green-600 hover:text-green-800 text-sm mb-6 block">← 返回首页</Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">常见问题</h1>
        <p className="text-gray-500 mb-8">关于童慧行走天下的常见问题解答</p>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <summary className="px-5 py-4 cursor-pointer font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                {faq.q}
              </summary>
              <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{faq.a}</div>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
