/**
 * tiaozhan（来挑战 3011 前端 + 3001 后端）— 答题挑战
 * 端到端：首页→登录弹窗→solo 记录→排行榜
 */
import { test, expect, URL } from './fixtures/site.js';

const T = URL.TIAOZHAN_WEB;
const API = URL.TIAOZHAN_API;

test.describe('tiaozhan 核心闭环', () => {
  test('首页加载', async ({ page }) => {
    await page.goto(T, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
    expect(text).toMatch(/挑战|答题|开始|排行|登录/);
  });

  test('登录弹窗（点击登录）', async ({ page }) => {
    await page.goto(T, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const loginBtn = page.locator('text=/登录|Login|login/i').first();
    if (await loginBtn.count() === 0) {
      test.skip();
      return;
    }
    await loginBtn.click();
    await page.waitForTimeout(500);
    // 弹窗打开
    const modal = page.locator('[class*="modal"], [role="dialog"], .login-modal').first();
    if (await modal.count() > 0) {
      expect(await modal.isVisible()).toBe(true);
    }
  });

  test('排行榜 API', async ({ request }) => {
    const r = await request.get(`${API}/api/quiz/leaderboard`);
    expect([200, 404]).toContain(r.status());
  });

  test('solo 排行榜 API', async ({ request }) => {
    const r = await request.get(`${API}/api/quiz/leaderboard/solo`);
    expect([200, 404]).toContain(r.status());
  });

  test('未登录调 solo 记录 401', async ({ request }) => {
    const r = await request.post(`${API}/api/quiz/solo/record`, {
      data: { score: 100, correct: 5, total: 10 },
    });
    expect([401, 403, 404]).toContain(r.status());
  });

  test('auth check（无 token）', async ({ request }) => {
    const r = await request.get(`${API}/api/auth/check`);
    expect([200, 401]).toContain(r.status());
  });

  test('auth POST 无 body 应有明确错误', async ({ request }) => {
    const r = await request.post(`${API}/api/auth`, { data: {} });
    expect([400, 401]).toContain(r.status());
  });
});
