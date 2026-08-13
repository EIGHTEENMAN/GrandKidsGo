/**
 * 童慧行整站测试 — 公共 fixture
 * 端口映射必须与 CLAUDE.md "运行中服务" 表一致：
 *   main-site:3000 | auth-service:3007 | travel-guide:3010 | admin:3099
 *   xueshici:3008 | xueguoxue:3003 | xuetongshi:3004 | english:3002
 *   tiaozhan:3001(后端)+3011(前端) | forum:3005 | store:3006 | moderation:3020
 */
export const PORTS = {
  MAIN_SITE: 3000,
  AUTH: 3007,
  TRAVEL: 3010,
  ADMIN: 3099,
  XUESHICI: 3008,
  XUEGUOXUE: 3003,
  XUETONGSHI: 3004,
  ENGLISH: 3002,
  TIAOZHAN_API: 3001,
  TIAOZHAN_WEB: 3011,
  FORUM: 3005,
  STORE: 3006,
  MODERATION: 3020,
};

export const URL = Object.fromEntries(
  Object.entries(PORTS).map(([k, v]) => [k, `http://localhost:${v}`])
);

/**
 * 基础浏览器 fixture：每个 case 一个新 context，自动收集 console + 网络错误 + 失败截图。
 */
export const test = base.extend({
  context: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      locale: 'zh-CN',
      viewport: { width: 1280, height: 800 },
    });
    const consoleErrors = [];
    const failedRequests = [];

    ctx.on('weberror', (e) => consoleErrors.push(`[weberror] ${e.error()}`));

    const page = await ctx.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[console.${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`));
    page.on('requestfailed', (req) => {
      const url = req.url();
      // 忽略常见的 favicon / 字体失败
      if (/\.ico$|\.woff2?$/.test(url)) return;
      failedRequests.push(`[reqfail] ${req.method()} ${url} :: ${req.failure()?.errorText}`);
    });

    ctx.consoleErrors = consoleErrors;
    ctx.failedRequests = failedRequests;

    await use(ctx);

    // 收尾：把 console 错误写到 test info（外部可读）
    if (consoleErrors.length) {
      console.warn('=== console errors ===\n' + consoleErrors.join('\n'));
    }
    if (failedRequests.length) {
      console.warn('=== failed requests ===\n' + failedRequests.join('\n'));
    }
    await ctx.close();
  },
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
  },
});

export { expect } from '@playwright/test';
import { test as base } from '@playwright/test';
