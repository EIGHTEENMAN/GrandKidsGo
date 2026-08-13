/**
 * POST/PUT/DELETE 端点 — 带 token 但缺字段的防御测试
 * 验证所有改动接口在无 body / 缺关键字段时不会 500
 */
import { test, expect, URL } from './fixtures/site.js';

const A = URL.AUTH;
const F = URL.FORUM;
const T = URL.TIAOZHAN_API;
const S = URL.STORE;
const M = URL.MODERATION;

test.describe('防御测试：带 token POST/PUT/DELETE 缺字段', () => {
  let userToken = '';

  test('准备：注册并登录拿 token', async ({ request }) => {
    const U = `tu${Date.now() % 100000000}`;
    await request.post(`${A}/api/auth/register`, { data: { username: U, password: 'Test@2026' } });
    const r = await request.post(`${A}/api/auth/login`, { data: { username: U, password: 'Test@2026' } });
    const body = await r.json();
    userToken = body.data?.accessToken || '';
    expect(userToken).toBeTruthy();
  });

  test('forum /api/posts 无 body', async ({ request }) => {
    if (!userToken) test.skip();
    const r = await request.post(`${F}/api/posts`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    // 期望 400（缺字段）而非 500
    expect(r.status()).not.toBe(500);
  });

  test('forum /api/posts/123/comments 无 body', async ({ request }) => {
    if (!userToken) test.skip();
    const r = await request.post(`${F}/api/posts/abc/comments`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    expect(r.status()).not.toBe(500);
  });

  test('forum /api/like 无 body', async ({ request }) => {
    if (!userToken) test.skip();
    const r = await request.post(`${F}/api/like`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    expect(r.status()).not.toBe(500);
  });

  test('forum /api/reports 无 body', async ({ request }) => {
    if (!userToken) test.skip();
    const r = await request.post(`${F}/api/reports`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    expect(r.status()).not.toBe(500);
  });

  test('forum /api/auth 缺字段', async ({ request }) => {
    const r = await request.post(`${F}/api/auth`, { data: {} });
    // 期望 400
    expect(r.status()).not.toBe(500);
  });

  test('forum /api/auth POST 缺 userId', async ({ request }) => {
    const r = await request.post(`${F}/api/auth`, { data: { username: 'test' } });
    expect(r.status()).not.toBe(500);
  });

  test('forum /api/auth POST 缺 username', async ({ request }) => {
    const r = await request.post(`${F}/api/auth`, { data: { userId: 'u1' } });
    expect(r.status()).not.toBe(500);
  });

  test('forum /api/notifications/read 无 body', async ({ request }) => {
    if (!userToken) test.skip();
    const r = await request.post(`${F}/api/notifications/read`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    expect(r.status()).not.toBe(500);
  });

  test('moderation /api/moderation/check 无 body', async ({ request }) => {
    const r = await request.post(`${M}/api/moderation/check`, { data: {} });
    // P2: 应该 401 但实际 200
    expect(r.status()).not.toBe(500);
  });

  test('moderation /api/moderation/report 无 body', async ({ request }) => {
    if (!userToken) test.skip();
    const r = await request.post(`${M}/api/moderation/report`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    expect(r.status()).not.toBe(500);
  });

  test('moderation /api/moderation/appeal 无 body', async ({ request }) => {
    if (!userToken) test.skip();
    const r = await request.post(`${M}/api/moderation/appeal`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    expect(r.status()).not.toBe(500);
  });

  test('moderation /api/moderation/review 无 body', async ({ request }) => {
    if (!userToken) test.skip();
    const r = await request.post(`${M}/api/moderation/review`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    expect(r.status()).not.toBe(500);
  });

  test('moderation /api/moderation/appeal/review 无 body', async ({ request }) => {
    if (!userToken) test.skip();
    const r = await request.post(`${M}/api/moderation/appeal/review`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    expect(r.status()).not.toBe(500);
  });

  test('tiaozhan /api/quiz/solo/record 无 body', async ({ request }) => {
    if (!userToken) test.skip();
    const r = await request.post(`${T}/api/quiz/solo/record`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    expect(r.status()).not.toBe(500);
  });

  test('store /api/redeem 无 body', async ({ request }) => {
    if (!userToken) test.skip();
    const r = await request.post(`${S}/api/redeem`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {},
    });
    expect(r.status()).not.toBe(500);
  });

  test('store /api/auth 缺字段', async ({ request }) => {
    const r = await request.post(`${S}/api/auth`, { data: {} });
    expect(r.status()).not.toBe(500);
  });
});
