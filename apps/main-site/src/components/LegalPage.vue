<script setup lang="ts">
import { ref, onMounted } from 'vue'

const activeSection = ref('')

const sections = [
  { id: 'terms', label: '服务条款' },
  { id: 'privacy', label: '隐私政策' },
  { id: 'children', label: '儿童个人信息保护' },
  { id: 'youth', label: '青少年模式' },
  { id: 'deletion', label: '账号注销' },
  { id: 'complaint', label: '侵权投诉' },
  { id: 'contact', label: '联系我们' },
]

onMounted(() => {
  const hash = window.location.hash.replace('#', '')
  if (hash && sections.some(s => s.id === hash)) {
    activeSection.value = hash
    setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }
})

function scrollTo(id: string) {
  activeSection.value = id
  window.location.hash = '#' + id
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <div class="legal-page">
    <header class="legal-header">
      <div class="legal-header-inner">
        <a href="https://grandand.com" class="legal-logo">童慧行</a>
        <a href="https://grandand.com" class="legal-home">← 返回首页</a>
      </div>
    </header>

    <div class="legal-layout">
      <nav class="legal-nav">
        <a
          v-for="s in sections"
          :key="s.id"
          :href="'#' + s.id"
          class="legal-nav-item"
          :class="{ active: activeSection === s.id }"
          @click.prevent="scrollTo(s.id)"
        >{{ s.label }}</a>
      </nav>

      <main class="legal-content">
        <!-- ===== 服务条款 ===== -->
        <section id="terms" class="legal-section">
          <h1>服务条款</h1>
          <p class="legal-update">最后更新：2026 年 5 月 20 日</p>

          <h2>1. 接受条款</h2>
          <p>欢迎使用童慧行（grandand.com）。以下条款适用于您对本网站的访问和使用。通过访问或使用本网站，您同意受这些条款的约束。如果您不同意，请停止使用本网站。</p>

          <h2>2. 服务说明</h2>
          <p>童慧行是一个专为儿童和父母打造的成长陪伴平台，提供国学经典学习、诗词学习、通识百科阅读、英语单词学习、益智答题挑战、亲子旅行攻略分享等服务。</p>

          <h2>3. 用户注册与账户</h2>
          <p>您可以选择通过手机号验证码或用户名密码注册账号。注册时需提供手机号、用户名、出生年份等信息。未满 14 周岁的用户需经家长同意后方可使用。</p>
          <p>您对账户下所有活动负责。如发现未经授权使用您账户的情况，请立即联系我们。</p>

          <h2>4. 用户行为规范</h2>
          <p>使用本平台时，您同意不发布、传播任何违法、骚扰、侮辱、威胁、色情或不当内容。论坛和社区功能受 AI 审核系统监控，违规内容将被自动处理，严重违规可能导致账号暂停或封禁。</p>

          <h2>5. 知识产权</h2>
          <p>本平台上的所有内容（包括但不限于文本、图片、音频、视频、题库等）的知识产权归童慧行或其内容提供者所有。未经授权，不得复制、传播、修改或用于商业目的。平台内容整理和部分推荐功能运用了人工智能技术辅助实现。</p>

          <h2>6. 免责声明</h2>
          <p>本平台内容仅供参考和学习使用，不构成任何专业建议。我们尽力保证内容的准确性和完整性，但不对此作出任何保证。平台部分功能借助 AI 技术提供辅助，AI 处理结果可能存在偏差，仅供参考，不构成最终判断依据。因使用本平台内容而产生的任何损失，我们不承担责任。</p>

          <h2>7. 条款变更</h2>
          <p>我们可能不时更新这些条款。重大变更将通过网站公告或弹窗通知您。继续使用本平台即表示您接受更新后的条款。</p>

          <h2>8. 积分商城规则</h2>
          <p>童慧行商城（store.grandand.com）提供的商品均为虚拟商品（包括但不限于徽章、头像、主题皮肤、功能特权等），仅限使用平台积分兑换，不涉及真实货币交易。</p>
          <p>积分兑换规则如下：</p>
          <ul>
            <li>积分通过平台学习、挑战、签到等活动获得，具体获取方式以各应用内说明为准</li>
            <li>积分兑换一经完成，不可撤销或退款</li>
            <li>虚拟商品不可转让、不可兑换为现金</li>
            <li>平台有权根据运营需要对商品价格和种类进行调整</li>
            <li>如发现作弊或违规获取积分的行为，平台有权收回积分及相关商品</li>
            <li>平台保留对积分商城的最终解释权</li>
          </ul>
        </section>

        <!-- ===== 隐私政策 ===== -->
        <section id="privacy" class="legal-section">
          <h1>隐私政策</h1>
          <p class="legal-update">最后更新：2026 年 5 月 20 日</p>

          <h2>1. 信息收集</h2>
          <p>我们收集以下类型的信息：</p>
          <ul>
            <li><strong>注册信息：</strong>手机号、用户名、昵称、出生年份等注册时提供的信息</li>
            <li><strong>个人资料：</strong>头像、性别、生日等您自愿填写的个人资料</li>
            <li><strong>学习数据：</strong>阅读记录、答题记录、学习时间、游戏进度等学习活动数据</li>
            <li><strong>使用数据：</strong>页面访问记录、功能使用频率等匿名使用统计数据（通过 PostHog 收集）</li>
          </ul>

          <h2>2. 信息使用</h2>
          <p>我们使用收集的信息用于：</p>
          <ul>
            <li>提供和维护平台服务</li>
            <li>个性化学习体验和建议</li>
            <li>改进产品功能和服务质量</li>
            <li>保障平台安全和用户权益</li>
            <li>遵守法律法规要求</li>
          </ul>

          <h2>3. Cookie 使用说明</h2>
          <p>本平台使用必要的 Cookie 以保持登录状态和正常使用。具体包括：</p>
          <ul>
            <li><strong>登录凭据：</strong>用于维持登录会话，关闭浏览器后自动过期</li>
            <li><strong>用户偏好：</strong>存储您的一些偏好设置（如语言、主题等）</li>
          </ul>
          <p>我们不会使用 Cookie 追踪您的浏览行为或投放广告。您可以通过浏览器设置管理 Cookie 偏好，但禁用必要 Cookie 可能导致部分功能无法正常使用。</p>

          <h2>4. 数据保留</h2>
          <p>我们按照以下期限保留您的个人信息：</p>
          <ul>
            <li><strong>账户数据：</strong>在您的账户保持活跃期间持续保留</li>
            <li><strong>学习数据：</strong>用于学习分析和进度跟踪，在账户注销时一并删除</li>
            <li><strong>使用统计数据：</strong>匿名化汇总数据无限期保留用于平台改进</li>
            <li><strong>日志数据：</strong>服务器访问日志保留 90 天后自动删除</li>
            <li><strong>已注销账户数据：</strong>注销后 30 天内从生产数据库完全清除</li>
          </ul>

          <h2>5. 数据保护</h2>
          <p>我们采取以下措施保护您的信息安全：</p>
          <ul>
            <li>全程 HTTPS 加密传输</li>
            <li>密码使用 bcrypt 加密存储</li>
            <li>JWT 令牌短期有效（15 分钟），刷新令牌使用后失效</li>
            <li>服务器部署在国内知名云服务商，数据存储在国内</li>
            <li>定期安全审计和漏洞扫描</li>
            <li>严格限制内部数据访问权限</li>
          </ul>

          <h2>6. 数据共享</h2>
          <p>我们不会将您的个人信息出售给第三方。我们仅在以下情况下共享必要信息：</p>
          <ul>
            <li>法律法规要求</li>
            <li>保护用户或公众安全</li>
            <li>与授权服务提供商合作（如云服务提供商），但仅限于提供服务所需</li>
          </ul>

          <h2>7. 您的权利</h2>
          <p>根据适用法律，您享有以下权利：</p>
          <ul>
            <li><strong>访问权：</strong>查阅我们持有的您的个人信息</li>
            <li><strong>更正权：</strong>修改不准确或不完整的个人信息</li>
            <li><strong>删除权：</strong>要求删除您的账户和相关数据（见"账号注销"章节）</li>
            <li><strong>限制处理权：</strong>在特定情况下限制我们对您信息的处理</li>
            <li><strong>数据可携带权：</strong>以结构化格式获取您的数据副本</li>
          </ul>
          <p>如需行使上述权利，请通过下方的联系方式与我们取得联系。</p>
        </section>

        <!-- ===== 儿童个人信息保护 ===== -->
        <section id="children" class="legal-section">
          <h1>儿童个人信息保护政策</h1>
          <p class="legal-update">最后更新：2026 年 5 月 20 日</p>

          <h2>1. 适用范围</h2>
          <p>本政策适用于未满 14 周岁的儿童用户。我们极为重视儿童个人信息保护，严格遵守《中华人民共和国个人信息保护法》《中华人民共和国未成年人保护法》等相关法律法规。</p>

          <h2>2. 儿童信息的收集和使用</h2>
          <p>对于未满 14 周岁的儿童，我们仅收集为提供服务所必需的最小限度的信息：</p>
          <ul>
            <li>出生年份（用于年龄判断和内容适配）</li>
            <li>学习数据（阅读记录、答题记录等）</li>
            <li>家长同意的手机号和家长姓名</li>
          </ul>
          <p>我们不会收集儿童的位置信息、生物识别信息或通讯录信息。</p>

          <h2>3. 家长同意</h2>
          <p>未满 14 周岁的儿童在注册时，需要提供家长的手机号进行验证，并获得家长同意后方可使用本平台。家长同意流程如下：</p>
          <ol>
            <li>儿童选择出生年份，系统判断是否未满 14 周岁</li>
            <li>系统提示需要家长同意，展示家长信息填写页面</li>
            <li>家长填写姓名、手机号并接收验证码</li>
            <li>家长验证通过后，同意并启用青少年模式</li>
            <li>儿童即可在青少年模式下使用本平台</li>
          </ol>

          <h2>4. 家长权利</h2>
          <p>家长有权：</p>
          <ul>
            <li>查看和管理孩子的学习数据和使用情况</li>
            <li>修改青少年模式设置（使用时长、夜间限制等）</li>
            <li>要求删除孩子的个人信息和账户</li>
            <li>撤回之前的同意授权</li>
          </ul>
          <p>家长可以通过登录个人中心或联系我们行使上述权利。</p>

          <h2>5. 安全保障</h2>
          <p>我们已采取额外的技术和组织安全措施保护儿童个人信息，包括限制数据访问权限、加密存储、定期安全审查等。</p>
        </section>

        <!-- ===== 青少年模式 ===== -->
        <section id="youth" class="legal-section">
          <h1>青少年模式说明</h1>
          <p class="legal-update">最后更新：2026 年 5 月 20 日</p>

          <h2>1. 什么是青少年模式</h2>
          <p>青少年模式是童慧行为未满 14 周岁用户提供的特殊保护模式。根据相关法律法规要求，所有未满 14 周岁的用户在获得家长同意后自动启用青少年模式。</p>

          <h2>2. 功能限制</h2>
          <p>青少年模式下，平台应用以下保护措施：</p>
          <ul>
            <li><strong>每日使用时长限制：</strong>默认每天最长使用 40 分钟，家长可调整（15~120 分钟）</li>
            <li><strong>夜间禁用：</strong>晚上 22:00 至次日早上 06:00 无法使用平台</li>
            <li><strong>内容过滤：</strong>仅展示适合儿童的教育内容和功能</li>
            <li><strong>社交限制：</strong>论坛和社区功能受更严格的内容审核</li>
          </ul>

          <h2>3. 时效提醒</h2>
          <p>当接近使用时长的限制时，平台会提醒用户。使用时长的限制后将继续被锁定，直到次日重置。</p>

          <h2>4. 家长管理</h2>
          <p>家长可以随时登录个人中心查看孩子的使用情况，调整青少年模式设置，包括修改每日使用时长、开启或关闭夜间模式等。</p>
        </section>

        <!-- ===== 账号注销 ===== -->
        <section id="deletion" class="legal-section">
          <h1>账号注销说明</h1>
          <p class="legal-update">最后更新：2026 年 5 月 20 日</p>

          <h2>1. 注销方式</h2>
          <p>您可以通过以下方式注销账号：</p>
          <ul>
            <li><strong>自助注销：</strong>登录后前往<a href="https://grandand.com/personal-center" target="_blank">个人中心</a>，点击"注销账号"按钮，按照提示操作即可</li>
            <li><strong>联系注销：</strong>通过下方联系方式联系我们，由客服协助完成注销</li>
          </ul>

          <h2>2. 注销后果</h2>
          <p>账号注销后，以下数据将被永久删除且不可恢复：</p>
          <ul>
            <li>个人资料（用户名、昵称、头像、生日等）</li>
            <li>所有学习记录（阅读进度、答题记录、游戏数据等）</li>
            <li>孩子账户及其所有数据</li>
            <li>积分余额和交易记录</li>
            <li>活跃会话（所有设备将自动退出登录）</li>
          </ul>
          <p>注销操作不可撤销，请在操作前确认。</p>

          <h2>3. 数据清除时间</h2>
          <p>提交注销请求后，系统将在 30 天内完成所有数据的完全清除。在此期间，如果您重新登录，注销请求将自动取消。</p>
        </section>

        <!-- ===== 侵权投诉 ===== -->
        <section id="complaint" class="legal-section">
          <h1>侵权投诉与举报</h1>
          <p class="legal-update">最后更新：2026 年 5 月 22 日</p>

          <h2>1. 知识产权侵权投诉（通知-删除）</h2>
          <p>童慧行尊重他人的知识产权。如果您认为本平台上的任何内容侵犯了您的著作权或其他合法权益，请按照以下流程向我们提交书面通知。</p>

          <h3>通知（Notice）</h3>
          <p>权利人发现侵权内容后，应提交包含以下材料的书面通知：</p>
          <ul>
            <li><strong>权利人信息：</strong>姓名（名称）、联系方式（电话、邮箱）、地址</li>
            <li><strong>权属证明：</strong>证明权利人拥有或有权行使相关权利的材料（如著作权登记证书、首次公开发表证明、授权书等）</li>
            <li><strong>侵权内容定位：</strong>足以准确定位侵权内容的信息（如 URL 链接、页面截图等）</li>
            <li><strong>侵权说明：</strong>说明侵权事实及法律依据</li>
            <li><strong>保证声明：</strong>通知中的陈述真实、准确，权利人愿承担因通知不实所导致的法律责任</li>
            <li><strong>签名/盖章：</strong>权利人或其授权代理人的亲笔签名或单位盖章</li>
          </ul>
          <p>我们将收到完整材料后在 <strong>7 个工作日内</strong> 作出处理，包括删除侵权内容或断开链接，并通知发布者。</p>

          <h3>反通知（Counter-Notice）</h3>
          <p>被投诉的内容发布者如认为其内容未侵权，可以提交反通知。反通知应包含与上述通知类似的材料（发布者信息、权属证明、不侵权说明等）。我们收到反通知后，将转送权利人，并在 <strong>7 个工作日内</strong> 决定是否恢复已删除的内容。</p>

          <h2>2. 违法违规不良信息举报</h2>
          <p>用户如发现本平台存在以下类型的不良信息，可通过下方渠道举报：</p>
          <ul>
            <li>涉未成年人违法犯罪内容</li>
            <li>色情低俗、暴力恐怖信息</li>
            <li>网络诈骗、赌博信息</li>
            <li>侵犯他人合法权益的言论</li>
            <li>其他违法违规信息</li>
          </ul>
          <p>我们承诺对举报信息及时处理，并对举报人信息严格保密。同时，用户也可直接向以下监管机构举报：</p>
          <ul>
            <li><strong>中国互联网违法和不良信息举报中心：</strong><a href="https://www.12377.cn" target="_blank" rel="noopener noreferrer">www.12377.cn</a>（电话：12377）</li>
          </ul>

          <h2>3. 平台内容版权说明</h2>
          <p>童慧行平台上的内容来源包括以下几类：</p>
          <ul>
            <li><strong>公有领域作品：</strong>古典诗词、国学经典等已进入公有领域的作品，平台进行数字化整理和分类展示</li>
            <li><strong>原创内容：</strong>平台自行创作的翻译、赏析、解读、插画等内容</li>
            <li><strong>用户生成内容：</strong>用户在论坛、攻略等社区功能中发布的内容，版权归用户所有</li>
            <li><strong>引用内容：</strong>为教学目的合理引用的现代作品片段</li>
          </ul>
          <p>如您发现本平台内容涉嫌侵犯您的合法权益，请按上述流程提交通知，我们将在收到后尽快核实处理。</p>
        </section>

        <!-- ===== 联系我们 ===== -->
        <section id="contact" class="legal-section">
          <h1>联系我们</h1>

          <p>如果您对这些条款、隐私政策或您的个人信息有任何疑问、意见或请求，请通过以下方式与我们联系：</p>

          <div class="legal-contact-card">
            <div class="contact-row">
              <span class="contact-label">📧 电子邮箱</span>
              <a href="mailto:grandand@shibaxia.com" class="contact-value">grandand@shibaxia.com</a>
            </div>
            <div class="contact-row">
              <span class="contact-label">🌐 网站</span>
              <a href="https://grandand.com" class="contact-value">grandand.com</a>
            </div>
          </div>

          <p>我们将在收到您的请求后 15 个工作日内回复。如涉及儿童个人信息相关请求，我们将在 7 个工作日内处理。</p>
        </section>

        <!-- Footer -->
        <footer class="legal-footer">
          <p>&copy; 2026 童慧行 &mdash; 儿童免费学习乐园</p>
        </footer>
      </main>
    </div>
  </div>
</template>

<style scoped>
.legal-page {
  min-height: 100vh;
  background: #f8fafc;
}

.legal-header {
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 40;
}

.legal-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.legal-logo {
  font-size: 24px;
  font-weight: 800;
  color: #2563eb;
  text-decoration: none;
}

.legal-home {
  font-size: 14px;
  color: #64748b;
  text-decoration: none;
  padding: 6px 14px;
  border-radius: 8px;
  transition: background 0.2s;
}

.legal-home:hover {
  background: #f1f5f9;
  color: #2563eb;
}

.legal-layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

/* Sidebar nav */
.legal-nav {
  position: sticky;
  top: 80px;
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.legal-nav-item {
  display: block;
  padding: 10px 14px;
  font-size: 14px;
  color: #64748b;
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.15s;
  font-weight: 500;
}

.legal-nav-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.legal-nav-item.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

/* Content */
.legal-content {
  flex: 1;
  min-width: 0;
}

.legal-section {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 32px 36px;
  margin-bottom: 20px;
  scroll-margin-top: 88px;
}

.legal-section h1 {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 4px;
}

.legal-update {
  font-size: 13px;
  color: #94a3b8;
  margin: 0 0 20px;
}

.legal-section h2 {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin: 24px 0 10px;
}

.legal-section h2:first-of-type {
  margin-top: 0;
}

.legal-section p {
  font-size: 14px;
  color: #475569;
  line-height: 1.8;
  margin: 0 0 12px;
}

.legal-section p:last-child {
  margin-bottom: 0;
}

.legal-section ul,
.legal-section ol {
  margin: 0 0 12px;
  padding-left: 20px;
}

.legal-section li {
  font-size: 14px;
  color: #475569;
  line-height: 1.8;
  margin-bottom: 4px;
}

.legal-section a {
  color: #2563eb;
  text-decoration: none;
}

.legal-section a:hover {
  text-decoration: underline;
}

.legal-contact-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 24px;
  margin: 16px 0;
}

.contact-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.contact-row + .contact-row {
  border-top: 1px solid #f1f5f9;
}

.contact-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  min-width: 80px;
}

.contact-value {
  font-size: 14px;
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
}

.contact-value:hover {
  text-decoration: underline;
}

.legal-footer {
  text-align: center;
  padding: 16px 0;
  font-size: 12px;
  color: #cbd5e1;
}

/* Mobile */
@media (max-width: 768px) {
  .legal-layout {
    flex-direction: column;
    padding: 16px;
  }

  .legal-nav {
    position: static;
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
  }

  .legal-nav-item {
    font-size: 13px;
    padding: 6px 12px;
  }

  .legal-section {
    padding: 20px 18px;
  }

  .legal-section h1 {
    font-size: 20px;
  }

  .legal-section h2 {
    font-size: 15px;
  }

  .legal-contact-card {
    padding: 16px;
  }

  .contact-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}
</style>
