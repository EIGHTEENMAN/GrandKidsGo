/**
 * admin（管理后台 3099）— 12 个页面 + 内部 API
 */
import { test, expect, URL } from './fixtures/site.js';

const A = URL.ADMIN;

test.describe('admin 核心闭环', () => {
  test('首页加载（跳 login）', async ({ page }) => {
    await page.goto(A, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThanOrEqual(10);
  });

  test('健康检查', async ({ request }) => {
    const r = await request.get(`${A}/api/health`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.status).toBe('ok');
  });

  test('未登录调 verify 401', async ({ request }) => {
    const r = await request.get(`${A}/api/verify`);
    expect([401, 403]).toContain(r.status());
  });

  test('未登录调 stats 401', async ({ request }) => {
    const r = await request.get(`${A}/api/stats`);
    expect([401, 403]).toContain(r.status());
  });

  test('未登录调 admin/users 401', async ({ request }) => {
    const r = await request.get(`${A}/api/admin/users`);
    expect([401, 403]).toContain(r.status());
  });

  test('未登录调 admin/questions 401', async ({ request }) => {
    const r = await request.get(`${A}/api/admin/questions`);
    expect([401, 403]).toContain(r.status());
  });

  test('未登录调 admin/forum/posts 401', async ({ request }) => {
    const r = await request.get(`${A}/api/admin/forum/posts`);
    expect([401, 403]).toContain(r.status());
  });

  test('未登录调 admin/analytics/overview 401', async ({ request }) => {
    const r = await request.get(`${A}/api/admin/analytics/overview`);
    expect([401, 403]).toContain(r.status());
  });

  test('未登录调 travel/guides/pending 401', async ({ request }) => {
    const r = await request.get(`${A}/api/travel/guides/pending`);
    expect([401, 403]).toContain(r.status());
  });

  test('未登录调 travel/spots/needs-review 401', async ({ request }) => {
    const r = await request.get(`${A}/api/travel/spots/needs-review`);
    expect([401, 403]).toContain(r.status());
  });

  test('login POST 错误密码 401', async ({ request }) => {
    const r = await request.post(`${A}/api/login`, {
      data: { username: 'admin', password: 'wrong-password' },
    });
    expect([400, 401]).toContain(r.status());
  });

  test('login POST 空 body 400', async ({ request }) => {
    const r = await request.post(`${A}/api/login`, { data: {} });
    expect([400, 401]).toContain(r.status());
  });
});
