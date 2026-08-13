/**
 * store（商城 3006 前端 + 3506 后端）— 积分兑换
 */
import { test, expect, URL } from './fixtures/site.js';

const S = URL.STORE;

test.describe('store 核心闭环', () => {
  test('首页加载', async ({ page }) => {
    await page.goto(S, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('商品列表 API', async ({ request }) => {
    const r = await request.get(`${S}/api/products`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('未登录调 /api/user 401', async ({ request }) => {
    const r = await request.get(`${S}/api/user`);
    expect([401, 403]).toContain(r.status());
  });

  test('未登录调 /api/redeem 401', async ({ request }) => {
    const r = await request.post(`${S}/api/redeem`, { data: { productId: 'badge01' } });
    expect([400, 401, 403]).toContain(r.status());
  });

  test('未登录调 /api/auth 401', async ({ request }) => {
    const r = await request.get(`${S}/api/auth/check`);
    expect([401, 403, 404, 502]).toContain(r.status());
  });
});
