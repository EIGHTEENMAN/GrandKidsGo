/**
 * auth-service（3007）— 认证 + 用户 + 孩子档案 + 积分
 * 端到端：注册→登录→/me→孩子档案→积分加减→登出
 */
import { test, expect, URL } from './fixtures/site.js';

const A = URL.AUTH;
const ts = Date.now() % 100000000;  // 8 位以内
const TEST_USER = `tu${ts}`;
const TEST_PASSWORD = 'Test@2026';
const TEST_PHONE = `138${String(ts).slice(-8).padStart(8, '0')}`;

test.describe.serial('auth-service 核心闭环', () => {
  let token = '';

  test('健康检查', async ({ request }) => {
    const r = await request.get(`${A}/health`);
    expect(r.status()).toBe(200);
  });

  test('未登录 /api/auth/me 返回 401', async ({ request }) => {
    const r = await request.get(`${A}/api/auth/me`);
    expect(r.status()).toBe(401);
  });

  test('用户名注册（不传 phone）', async ({ request }) => {
    const r = await request.post(`${A}/api/auth/register`, {
      data: { username: TEST_USER, password: TEST_PASSWORD, nickname: '测试家长' },
    });
    expect([200, 201, 409]).toContain(r.status());
  });

  test('密码登录拿 token', async ({ request }) => {
    const r = await request.post(`${A}/api/auth/login`, {
      data: { username: TEST_USER, password: TEST_PASSWORD },
    });
    expect([200, 201]).toContain(r.status());
    const body = await r.json();
    expect(body.code).toBe('OK');
    token = body.data?.accessToken || body.data?.token || body.data?.access_token || '';
  });

  test('带 token 调 /me', async ({ request }) => {
    if (!token) test.skip();
    const r = await request.get(`${A}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.code).toBe('OK');
  });

  test('创建孩子档案', async ({ request }) => {
    if (!token) test.skip();
    const r = await request.post(`${A}/api/user/children`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nickname: '测试小明', age: 7, gender: 'male' },
    });
    // 200/201 创建成功，或 200 已存在
    expect([200, 201]).toContain(r.status());
    const body = await r.json();
    expect(body.code).toBe('OK');
  });

  test('查询孩子列表', async ({ request }) => {
    if (!token) test.skip();
    const r = await request.get(`${A}/api/user/children`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.code).toBe('OK');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('积分查询', async ({ request }) => {
    if (!token) test.skip();
    const r = await request.get(`${A}/api/user/points`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(200);
  });

  test('登出', async ({ request }) => {
    if (!token) test.skip();
    const r = await request.post(`${A}/api/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(r.status());
  });
});

test.describe('auth-service 错误路径', () => {
  test('错误密码登录 401', async ({ request }) => {
    const r = await request.post(`${A}/api/auth/login`, {
      data: { phone: TEST_PHONE, password: 'wrong-password' },
    });
    expect([400, 401, 403]).toContain(r.status());
  });

  test('无效 token /me 401', async ({ request }) => {
    const r = await request.get(`${A}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid-token-xxx' },
    });
    expect(r.status()).toBe(401);
  });

  test('缺字段注册 400', async ({ request }) => {
    const r = await request.post(`${A}/api/auth/register`, {
      data: { phone: '123' },  // 缺密码
    });
    expect([400, 422]).toContain(r.status());
  });
});
