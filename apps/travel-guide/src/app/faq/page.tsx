import Link from 'next/link';

export const metadata = { title: '常见问题 - 童慧行走天下', description: '关于童慧行走天下的常见问题解答' };

export default function FAQPage() {
  const faqs = [
    { q: '童慧行走天下是什么？', a: '童慧行走天下是一个专注于亲子旅行的攻略平台，汇集千万真实家庭的旅行经验，帮助父母轻松规划亲子出行。' },
    { q: '如何发布攻略？', a: '注册并登录后，点击首页或攻略详情页的"发布攻略"按钮，填写标题、目的地、内容等信息即可发布。' },
    { q: '攻略内容可以使用富文本吗？', a: '可以。发布攻略时，内容编辑器支持富文本排版，包括标题、粗体、列表、引用、链接等多种格式。' },
    { q: '如何修改已发布的攻略？', a: '目前暂不支持编辑已发布的攻略，如需修改请联系管理员。' },
    { q: '亲子评分有什么用？', a: '亲子评分帮助其他家长了解一个目的地或攻略的亲子友好程度，评分越高表示越适合带孩子去。' },
    { q: '我的数据安全吗？', a: '我们非常重视隐私保护。所有数据存储在国内服务器，不会与第三方共享个人信息。详情请查看隐私政策。' },
    { q: '如何联系管理员？', a: '如有任何问题或建议，请在游记详情页留言，或通过管理员后台联系我们。' },
  ];

  // 免责声明（重要提示）
  const disclaimers = [
    {
      title: '⚠️ 内容仅供参考',
      content: '童慧行走天下所有攻略、评价、推荐内容均由用户发布，仅供家长参考。每个孩子的年龄、体质、兴趣不同，请家长结合自家情况做判断。',
    },
    {
      title: '⚠️ 实地安全自负',
      content: '平台不保证所有地点信息的实时准确性（开放时间、票价、设施变动等）。出行前请务必核实官方信息，注意孩子安全，对自己的孩子负责。',
    },
    {
      title: '⚠️ 隐私保护',
      content: '我们严格遵守《个人信息保护法》和《儿童个人信息网络保护规定》。孩子照片发布需监护人同意，您发布的任何内容均可随时撤回。',
    },
    {
      title: '⚠️ 商业免责',
      content: '平台为亲子旅行社区，不承担因第三方服务商、商家、景点变更等带来的任何损失。请在预订和消费前自行核实。',
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-6 block">← 返回首页</Link>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">常见问题</h1>
        <p className="text-gray-500 mb-8">关于童慧行走天下的常见问题解答</p>

        {/* 常见问题 */}
        <h2 className="text-lg font-bold text-gray-900 mb-3">常见问题</h2>
        <div className="space-y-3 mb-10">
          {faqs.map((faq, i) => (
            <details key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <summary className="px-5 py-4 cursor-pointer font-medium text-gray-900 hover:bg-blue-50 transition-colors">
                {faq.q}
              </summary>
              <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{faq.a}</div>
            </details>
          ))}
        </div>

        {/* 免责声明 */}
        <h2 className="text-lg font-bold text-gray-900 mb-3">免责声明</h2>
        <div className="space-y-3">
          {disclaimers.map((d, i) => (
            <div key={i} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-bold text-blue-900 mb-2 text-sm">{d.title}</h3>
              <p className="text-sm text-blue-800 leading-relaxed">{d.content}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
