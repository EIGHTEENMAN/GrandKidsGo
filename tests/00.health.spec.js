/**
 * 健康检查 — 一键验证 12 个 dev 服务都在跑
 * 用法：npx playwright test tests/00.health.spec.js
 */
import { test, expect, URL } from './fixtures/site.js';

const CHECKS = [
  { name: 'main-site',      port: URL.MAIN_SITE,      path: '/' },
  { name: 'auth-service',   port: URL.AUTH,           path: '/health' },
  { name: 'travel-guide',   port: URL.TRAVEL,         path: '/' },
  { name: 'admin',          port: URL.ADMIN,          path: '/' },
  { name: 'xueshici',       port: URL.XUESHICI,       path: '/' },
  { name: 'xueguoxue',      port: URL.XUEGUOXUE,      path: '/' },
  { name: 'xuetongshi',     port: URL.XUETONGSHI,     path: '/' },
  { name: 'english',        port: URL.ENGLISH,        path: '/' },
  { name: 'tiaozhan-api',   port: URL.TIAOZHAN_API,   path: '/' },
  { name: 'tiaozhan-web',   port: URL.TIAOZHAN_WEB,   path: '/' },
  { name: 'forum',          port: URL.FORUM,          path: '/' },
  { name: 'store',          port: URL.STORE,          path: '/' },
  { name: 'moderation',     port: URL.MODERATION,     path: '/' },
];

for (const c of CHECKS) {
  test(`health: ${c.name} ${c.port}${c.path}`, async ({ request }) => {
    const res = await request.get(`${c.port}${c.path}`, { timeout: 10000 });
    // 200 / 404 都可以（404 = 服务活了但根路径没路由）
    expect([200, 301, 302, 404]).toContain(res.status());
  });
}
