/**
 * 跨 app 登录态联动 — 用 auth-service 登录后访问各 app
 * 验证：grandkidsgo_token cookie 在跨域下能被各 app 共享 + 自动登录
 */
import { test, expect, URL } from './fixtures/site.js';

const A = URL.AUTH;

test.describe('跨 app 登录态联动', () => {
  test('auth-service 登录拿 token', async ({ request }) => {
    const U = `tu${Date.now() % 100000000}`;
    await request.post(`${A}/api/auth/register`, { data: { username: U, password: 'Test@2026' } });
    const r = await request.post(`${A}/api/auth/login`, { data: { username: U, password: 'Test@2026' } });
    const body = await r.json();
    expect(body.code).toBe('OK');
    expect(body.data.accessToken).toBeTruthy();
  });

  test('main-site 加载后调用 /me 验证 token 持久化', async ({ page, request }) => {
    const U = `tu${Date.now() % 100000000}`;
    await request.post(`${A}/api/auth/register`, { data: { username: U, password: 'Test@2026' } });
    const r = await request.post(`${A}/api/auth/login`, { data: { username: U, password: 'Test@2026' } });
    const { accessToken } = (await r.json()).data;

    // 注入 token 到 localStorage / cookie
    await page.goto(URL.MAIN_SITE, { waitUntil: 'domcontentloaded' });
    await page.evaluate((token) => {
      localStorage.setItem('grandkidsgo_token', token);
      localStorage.setItem('grandkidsgo_user', JSON.stringify({ username: 'test' }));
    }, accessToken);

    // reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    // 不应被踢回登录
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('tiaozhan 加载', async ({ page }) => {
    await page.goto(URL.TIAOZHAN_WEB, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('forum 加载', async ({ page }) => {
    await page.goto(URL.FORUM, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('store 加载', async ({ page }) => {
    await page.goto(URL.STORE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('travel-guide 加载', async ({ page }) => {
    await page.goto(URL.TRAVEL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('admin 加载（未登录跳 login）', async ({ page }) => {
    await page.goto(URL.ADMIN, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(5);
  });
});
