/**
 * mobile (m.grandand.com) — 童慧行移动端 uni-app H5
 * 端到端验证：页面加载 / tab 切换 / challenge 自渲染路径
 *
 * 注意事项：
 * - m.grandand.com 是生产域名，受阿里云 ICP 影响（来自外网的 curl 可能 RST）
 * - 服务端验证已通过（curl https://m.grandand.com 200）；Playwright 从本机访问可能受 ICP 拦截
 * - 如果 ICP 拦截，本测试会被 skip
 */

import { test, expect } from '@playwright/test';

const MOBILE_URL = 'https://m.grandand.com';
const XIAODADA_API = 'https://tiaozhan.grandand.com';

test.describe('mobile H5 主页', () => {
  test('页面能加载', async ({ page }) => {
    const response = await page.goto(MOBILE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
    if (!response) {
      test.skip(true, 'm.grandand.com 从本机不可达（可能是阿里云 ICP 拦截或网络问题）');
      return;
    }
    const status = response.status();
    if (status >= 400) {
      test.skip(true, `m.grandand.com 返回 ${status}`);
      return;
    }
    await page.waitForTimeout(2000); // 等 SPA 渲染
    const title = await page.title();
    expect(title).toMatch(/童慧行/);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(10);
  });

  test('5 个 tab 可见', async ({ page }) => {
    await page.goto(MOBILE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(3000);
    const text = await page.locator('body').innerText();
    // 5 tab: 首页 / 学习 / 挑战 / 走天下 / 我的
    expect(text).toMatch(/首页/);
    expect(text).toMatch(/学习/);
    expect(text).toMatch(/挑战/);
    expect(text).toMatch(/走天下/);
    expect(text).toMatch(/我的/);
  });
});

test.describe('challenge 自渲染路径', () => {
  test('直接访问 /pages/challenge/index 返回 SPA fallback', async ({ page }) => {
    const response = await page.goto(`${MOBILE_URL}/pages/challenge/index`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
    if (!response) {
      test.skip(true, 'm.grandand.com 不可达');
      return;
    }
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toMatch(/童慧行/); // SPA fallback 返回 index.html
  });
});

test.describe('mobile → xiaodada API 跨子域可达性', () => {
  test('GET /api/auth/check', async ({ request }) => {
    const r = await request.get(`${XIAODADA_API}/api/auth/check`);
    expect([200]).toContain(r.status());
  });

  test('GET /api/quiz/leaderboard', async ({ request }) => {
    const r = await request.get(`${XIAODADA_API}/api/quiz/leaderboard`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty('list');
    expect(body).toHaveProperty('total');
  });

  test('GET /api/quiz/leaderboard/solo', async ({ request }) => {
    const r = await request.get(`${XIAODADA_API}/api/quiz/leaderboard/solo?category=mixed`);
    expect(r.status()).toBe(200);
  });

  test('GET /api/quiz/solo 取题', async ({ request }) => {
    const r = await request.get(`${XIAODADA_API}/api/quiz/solo?subjects=chinese&difficulty=1&limit=5`);
    expect(r.status()).toBe(200);
    const qs = await r.json();
    expect(Array.isArray(qs)).toBe(true);
    if (qs.length > 0) {
      expect(qs[0]).toHaveProperty('question');
      expect(qs[0]).toHaveProperty('options');
      expect(qs[0]).toHaveProperty('answer');
    }
  });

  test('POST /api/quiz/solo/record 未授权返回 401', async ({ request }) => {
    const r = await request.post(`${XIAODADA_API}/api/quiz/solo/record`, {
      data: { totalQuestions: 5, totalCorrect: 3, bestStreak: 3, category: 'mixed' },
    });
    expect([401, 403]).toContain(r.status());
  });
});