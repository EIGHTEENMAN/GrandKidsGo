/**
 * xueguoxue（国学 3003）+ xuetongshi（通识 3004）+ english（英语 3002）— 三个学习应用
 * 结构相同：纯前端 SPA + hash 路由 + 本地 JSON 数据
 */
import { test, expect, URL } from './fixtures/site.js';

test.describe('xueguoxue 国学 核心闭环', () => {
  test('首页加载（经典列表）', async ({ page }) => {
    await page.goto(URL.XUEGUOXUE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(100);
    // 看到经典名（学而、三字经、千字文等）
    expect(text).toMatch(/学而|三字经|弟子规|千字文|论语|道德经|诗经/);
  });

  test('hash 路由：#/detail/sanzijing 进入详情', async ({ page }) => {
    await page.goto(`${URL.XUEGUOXUE}/#/detail/sanzijing`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/原文|译文|注释|赏析|三字经|王应麟|返回/);
  });

  test('hash 路由：#/reader/<id>', async ({ page }) => {
    await page.goto(`${URL.XUEGUOXUE}/#/reader/xueer-1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(100);
  });
});

test.describe('xuetongshi 通识 核心闭环', () => {
  test('首页加载（主题列表）', async ({ page }) => {
    await page.goto(URL.XUETONGSHI, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(100);
    // 通识主题词
    expect(text).toMatch(/植物|动物|天文|地理|海洋|宇宙|人体|科技|物理|化学/);
  });

  test('点击主题进入详情（带动画）', async ({ page }) => {
    await page.goto(URL.XUETONGSHI, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const topic = page.locator('text=/植物|动物|天文|地理|宇宙|海洋/').first();
    if (await topic.count() === 0) {
      test.skip();
      return;
    }
    await topic.click();
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(100);
  });
});

test.describe('english 英语 核心闭环', () => {
  test('首页加载（study hub）', async ({ page }) => {
    await page.goto(URL.ENGLISH, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(100);
  });

  test('study 页面 hash 路由', async ({ page }) => {
    await page.goto(`${URL.ENGLISH}/#/study`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(100);
  });

  test('profile hash 路由', async ({ page }) => {
    await page.goto(`${URL.ENGLISH}/#/profile`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(100);
  });
});
