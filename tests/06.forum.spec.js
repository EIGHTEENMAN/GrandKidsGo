/**
 * forum（论坛 3005）— 帖子+评论+点赞
 * 端到端：板块→帖子列表→帖子详情→评论
 */
import { test, expect, URL } from './fixtures/site.js';

const F = URL.FORUM;

test.describe('forum 核心闭环', () => {
  test('首页加载', async ({ page }) => {
    await page.goto(F, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('板块列表 API', async ({ request }) => {
    const r = await request.get(`${F}/api/boards`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    // boards 直接返 array
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('帖子列表 API', async ({ request }) => {
    const r = await request.get(`${F}/api/posts`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty('posts');
    expect(Array.isArray(body.posts)).toBe(true);
  });

  test('未登录发帖子 401', async ({ request }) => {
    const r = await request.post(`${F}/api/posts`, {
      data: { boardId: 'test', title: '测试标题', content: '测试内容' },
    });
    expect([401, 403]).toContain(r.status());
  });

  test('未登录点赞 401', async ({ request }) => {
    const r = await request.post(`${F}/api/like`, {
      data: { targetId: 'test', targetType: 'post' },
    });
    expect([401, 403]).toContain(r.status());
  });

  test('未登录举报 401', async ({ request }) => {
    const r = await request.post(`${F}/api/reports`, {
      data: { targetId: 'test', reason: '测试举报' },
    });
    expect([401, 403]).toContain(r.status());
  });

  test('通知 API（未登录）401', async ({ request }) => {
    const r = await request.get(`${F}/api/notifications`);
    expect([401, 403]).toContain(r.status());
  });

  test('auth POST 无 token 401', async ({ request }) => {
    const r = await request.post(`${F}/api/auth`, { data: {} });
    expect([400, 401]).toContain(r.status());
  });

  test('搜索 API（带 q）', async ({ request }) => {
    const r = await request.get(`${F}/api/search?q=test`);
    expect(r.status()).toBe(200);
  });
});
