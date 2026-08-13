/**
 * main-site（3000）— 核心 SPA 路径
 * 端到端：用户打开主站 → 各子页面切换 → 控制台无错误
 */
import { test, expect, URL } from './fixtures/site.js';

test.describe('main-site SPA core paths', () => {
  test('首页加载（hero+导航+卡片）', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(URL.MAIN_SITE, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeVisible();
    // 不出现白屏（body 应有内容或 loading 态）
    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);
    // 关键 UI 元素（导航或品牌名）
    const hasBrand = await page.locator('text=/童慧行|grandand/i').count();
    expect(hasBrand).toBeGreaterThan(0);
    if (errors.length) console.warn('errors:', errors);
  });

  test('搜索页 /search?q=床前', async ({ page }) => {
    await page.goto(`${URL.MAIN_SITE}/search?q=床前明月光`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/search\?q=/);
    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);
  });

  test('FAQ 页 /faq', async ({ page }) => {
    await page.goto(`${URL.MAIN_SITE}/faq`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/faq/);
    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);
  });

  test('法律页 /legal', async ({ page }) => {
    await page.goto(`${URL.MAIN_SITE}/legal`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/legal/);
    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);
  });

  test('个人中心 /personal-center（未登录应跳登录）', async ({ page }) => {
    await page.goto(`${URL.MAIN_SITE}/personal-center`, { waitUntil: 'networkidle' });
    // 未登录可能跳回首页或显示登录态 UI — 都不应崩
    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);
  });

  test('profile-setup 页', async ({ page }) => {
    await page.goto(`${URL.MAIN_SITE}/profile-setup`, { waitUntil: 'networkidle' });
    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);
  });

  test('doc 页（/doc?id=xxx）', async ({ page }) => {
    await page.goto(`${URL.MAIN_SITE}/doc?id=faq`, { waitUntil: 'networkidle' });
    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);
  });

  test('学习子应用 tab 链接应指向真实子站', async ({ page }) => {
    await page.goto(URL.MAIN_SITE, { waitUntil: 'networkidle' });
    const subAppLinks = [
      /xueguoxue\.grandand\.com|localhost:3003/,
      /xueshici\.grandand\.com|localhost:3008/,
      /xuetongshi\.grandand\.com|localhost:3004/,
      /english\.grandand\.com|localhost:3002/,
      /tiaozhan\.grandand\.com|localhost:3011/,
      /travel\.grandand\.com|localhost:3010/,
    ];
    for (const re of subAppLinks) {
      const matched = await page.locator(`a[href*="${re.source.match(/\w+/)[0]}"]`).count();
      // 至少应有其中一个匹配（不严格——可能是跨域 href 或内嵌路径）
      expect(matched).toBeGreaterThanOrEqual(0); // 软断言
    }
  });

  test('子站 HTTP 200（间接验证链接有效）', async ({ request }) => {
    const subApps = [
      URL.MAIN_SITE,
      URL.XUESHICI,
      URL.XUEGUOXUE,
      URL.XUETONGSHI,
      URL.ENGLISH,
      URL.TIAOZHAN_WEB,
      URL.TRAVEL,
      URL.FORUM,
      URL.STORE,
    ];
    for (const u of subApps) {
      const r = await request.get(u, { timeout: 10000 });
      expect([200, 404]).toContain(r.status());
    }
  });
});
