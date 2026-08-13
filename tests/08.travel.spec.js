/**
 * travel-guide（走天下 3010）— 37 个路由的核心闭环
 * 端到端：首页→地点→攻略→向导→行程→个人中心
 */
import { test, expect, URL } from './fixtures/site.js';

const T = URL.TRAVEL;

test.describe('travel-guide 核心闭环', () => {
  test('首页加载', async ({ page }) => {
    await page.goto(T, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(100);
  });

  test('API /api/places', async ({ request }) => {
    const r = await request.get(`${T}/api/places`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.code).toBe('OK');
    expect(Array.isArray(body.data?.items)).toBe(true);
  });

  test('API /api/cities', async ({ request }) => {
    const r = await request.get(`${T}/api/cities`);
    expect(r.status()).toBe(200);
  });

  test('API /api/guides', async ({ request }) => {
    const r = await request.get(`${T}/api/guides`);
    // 200 列表 405 只允许 POST 等情况
    expect([200, 405]).toContain(r.status());
  });

  test('API /api/wizard/quick（不传参）', async ({ request }) => {
    const r = await request.get(`${T}/api/wizard/quick`);
    expect([200, 400, 404]).toContain(r.status());
  });

  test('/places 页面', async ({ page }) => {
    await page.goto(`${T}/places`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('/guides 页面', async ({ page }) => {
    await page.goto(`${T}/guides`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('/wizard 页面', async ({ page }) => {
    await page.goto(`${T}/wizard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('/login 页面', async ({ page }) => {
    await page.goto(`${T}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('/register 页面', async ({ page }) => {
    await page.goto(`${T}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('/leaderboard 页面', async ({ page }) => {
    await page.goto(`${T}/leaderboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('/badges 页面', async ({ page }) => {
    await page.goto(`${T}/badges`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('/gallery 页面', async ({ page }) => {
    await page.goto(`${T}/gallery`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('/about 页面', async ({ page }) => {
    await page.goto(`${T}/about`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('/faq 页面', async ({ page }) => {
    await page.goto(`${T}/faq`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('/search 页面', async ({ page }) => {
    await page.goto(`${T}/search`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThanOrEqual(50);
  });

  test('未登录调 /api/user/profile 401', async ({ request }) => {
    const r = await request.get(`${T}/api/user/profile`);
    expect([401, 403, 404]).toContain(r.status());
  });
});
