import Link from 'next/link';

export const metadata = { title: '隐私政策 - 童慧行走天下', description: '童慧行走天下隐私政策，说明我们如何收集、使用和保护您的个人信息' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 prose prose-green">
        <Link href="/" className="text-green-600 hover:text-green-800 text-sm no-underline mb-6 block">← 返回首页</Link>
        <h1>隐私政策</h1>
        <p className="text-gray-500">最后更新：2026年5月</p>

        <h2>1. 信息收集</h2>
        <p>我们收集以下信息：</p>
        <ul>
          <li><strong>注册信息</strong>：用户名、密码（加密存储）</li>
          <li><strong>个人资料</strong>：昵称、头像（可选）</li>
          <li><strong>使用数据</strong>：页面访问记录、浏览行为（用于优化服务）</li>
          <li><strong>用户内容</strong>：发布的攻略、评论、照片、签到记录等</li>
        </ul>

        <h2>2. 信息使用</h2>
        <p>我们收集的信息用于：</p>
        <ul>
          <li>提供和维护平台服务</li>
          <li>改善用户体验和优化内容</li>
          <li>内容审核，确保社区安全</li>
          <li>统计分析，了解平台使用情况</li>
        </ul>

        <h2>3. 信息保护</h2>
        <p>我们采取合理的技术措施保护您的个人信息：</p>
        <ul>
          <li>密码使用bcrypt加密存储</li>
          <li>数据传输使用HTTPS加密</li>
          <li>服务器部署在境内，数据不出境</li>
          <li>定期安全审计</li>
        </ul>

        <h2>4. 信息共享</h2>
        <p>我们不会与任何第三方共享您的个人信息，除非：</p>
        <ul>
          <li>获得您的明确同意</li>
          <li>法律法规要求</li>
          <li>保护平台权益（如防止欺诈）</li>
        </ul>

        <h2>5. 儿童隐私</h2>
        <p>我们的平台面向家庭用户。儿童使用本平台应在父母或监护人的指导下进行。我们不会故意收集14岁以下儿童的额外个人信息。</p>

        <h2>6. Cookie</h2>
        <p>我们使用必要的Cookie来维持登录状态和基本功能。我们不使用第三方跟踪Cookie。</p>

        <h2>7. 用户权利</h2>
        <p>您有权：</p>
        <ul>
          <li>查看和修改您的个人资料</li>
          <li>删除您的账号和关联数据</li>
          <li>导出您的数据</li>
          <li>拒绝Cookie（可能影响部分功能）</li>
        </ul>

        <h2>8. 联系我们</h2>
        <p>如对隐私政策有任何疑问，请在攻略详情页留言反馈。</p>
      </div>
    </main>
  );
}
