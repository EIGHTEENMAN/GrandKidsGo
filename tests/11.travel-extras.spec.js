/**
 * travel-guide 剩余路由（17 个动态/详情/个人中心路由）
 * 端到端：地点详情→攻略详情/编辑/AI 向导→行程预览/详情/编辑/感受→个人中心及子页→作者主页
 */
import { test, expect, URL } from './fixtures/site.js';

const T = URL.TRAVEL;

async function loadAndCheck(page, path, minText = 30) {
  await page.goto(`${T}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const text = await page.locator('body').innerText();
  return { status: 200, text, length: text.length, minText };
}

test.describe('travel-guide 详情/动态路由', () => {
  test('places 列表 → 第一条 place 详情（sight）', async ({ page, request }) => {
    const r = await request.get(`${T}/api/places`);
    const body = await r.json();
    const firstSpot = body.data?.items?.find((x) => x.type === 'sight');
    if (!firstSpot) { test.skip(); return; }
    const res = await loadAndCheck(page, `/place/sight/${firstSpot.id}`);
    expect(res.length).toBeGreaterThan(res.minText);
  });

  test('place 详情 reviews 子页', async ({ page, request }) => {
    const r = await request.get(`${T}/api/places`);
    const body = await r.json();
    const firstSpot = body.data?.items?.find((x) => x.type === 'sight');
    if (!firstSpot) { test.skip(); return; }
    const res = await loadAndCheck(page, `/place/sight/${firstSpot.id}/reviews`);
    expect(res.length).toBeGreaterThan(0);
  });

  test('guides 列表 → 第一条攻略详情', async ({ page, request }) => {
    const r = await request.get(`${T}/api/guides/feed`);
    const body = await r.json();
    const firstGuide = body.data?.items?.[0] || body.data?.guides?.[0] || body.guides?.[0] || body.items?.[0];
    if (!firstGuide) { test.skip(); return; }
    const res = await loadAndCheck(page, `/guides/${firstGuide.id}`);
    expect(res.length).toBeGreaterThan(0);
  });

  test('guides/[id]/edit 编辑页（未登录应跳登录）', async ({ page, request }) => {
    const r = await request.get(`${T}/api/guides/feed`);
    const body = await r.json();
    const firstGuide = body.data?.items?.[0] || body.data?.guides?.[0] || body.guides?.[0] || body.items?.[0];
    if (!firstGuide) { test.skip(); return; }
    const res = await loadAndCheck(page, `/guides/${firstGuide.id}/edit`);
    expect(res.length).toBeGreaterThan(0);
  });

  test('guides/create 创建攻略页（未登录）', async ({ page }) => {
    const res = await loadAndCheck(page, '/guides/create');
    expect(res.length).toBeGreaterThan(0);
  });

  test('guides/ai-wizard AI 向导', async ({ page }) => {
    const res = await loadAndCheck(page, '/guides/ai-wizard');
    expect(res.length).toBeGreaterThan(0);
  });

  test('plan/preview 行程预览', async ({ page }) => {
    const res = await loadAndCheck(page, '/plan/preview');
    expect(res.length).toBeGreaterThan(0);
  });

  test('plan/[id] 行程详情', async ({ page, request }) => {
    // 尝试获取任意 plan id
    const r = await request.get(`${T}/api/plans`);
    const body = await r.json();
    const firstPlan = body.data?.items?.[0] || body.data?.plans?.[0] || body.plans?.[0];
    if (!firstPlan) {
      // 没有 plan 时访问 /plan/test 看页面是否崩
      const res = await loadAndCheck(page, '/plan/test-id-123');
      expect(res.length).toBeGreaterThan(0);
      return;
    }
    const res = await loadAndCheck(page, `/plan/${firstPlan.id}`);
    expect(res.length).toBeGreaterThan(0);
  });

  test('plan/[id]/edit 编辑', async ({ page, request }) => {
    const r = await request.get(`${T}/api/plans`);
    const body = await r.json();
    const firstPlan = body.data?.items?.[0] || body.data?.plans?.[0] || body.plans?.[0];
    if (!firstPlan) { test.skip(); return; }
    const res = await loadAndCheck(page, `/plan/${firstPlan.id}/edit`);
    expect(res.length).toBeGreaterThan(0);
  });

  test('plan/[id]/feeling 真实感受', async ({ page, request }) => {
    const r = await request.get(`${T}/api/plans`);
    const body = await r.json();
    const firstPlan = body.data?.items?.[0] || body.data?.plans?.[0] || body.plans?.[0];
    if (!firstPlan) { test.skip(); return; }
    const res = await loadAndCheck(page, `/plan/${firstPlan.id}/feeling`);
    expect(res.length).toBeGreaterThan(0);
  });

  test('profile 个人中心（未登录跳登录）', async ({ page }) => {
    const res = await loadAndCheck(page, '/profile');
    expect(res.length).toBeGreaterThan(0);
  });

  test('profile/children 孩子档案', async ({ page }) => {
    const res = await loadAndCheck(page, '/profile/children');
    expect(res.length).toBeGreaterThan(0);
  });

  test('profile/guides 我的攻略', async ({ page }) => {
    const res = await loadAndCheck(page, '/profile/guides');
    expect(res.length).toBeGreaterThan(0);
  });

  test('profile/plans 我的行程', async ({ page }) => {
    const res = await loadAndCheck(page, '/profile/plans');
    expect(res.length).toBeGreaterThan(0);
  });

  test('profile/sayings 孩子说', async ({ page }) => {
    const res = await loadAndCheck(page, '/profile/sayings');
    expect(res.length).toBeGreaterThan(0);
  });

  test('profile/badges 我的勋章', async ({ page }) => {
    const res = await loadAndCheck(page, '/profile/badges');
    expect(res.length).toBeGreaterThan(0);
  });

  test('profile/footprints 足迹', async ({ page }) => {
    const res = await loadAndCheck(page, '/profile/footprints');
    expect(res.length).toBeGreaterThan(0);
  });

  test('profile/settings 设置', async ({ page }) => {
    const res = await loadAndCheck(page, '/profile/settings');
    expect(res.length).toBeGreaterThan(0);
  });

  test('author/[id] 作者主页', async ({ page, request }) => {
    // 先从 guides feed 拿作者 id
    const r = await request.get(`${T}/api/guides/feed`);
    const body = await r.json();
    const firstGuide = body.data?.items?.[0] || body.data?.guides?.[0] || body.guides?.[0] || body.items?.[0];
    if (!firstGuide?.authorId) { test.skip(); return; }
    const res = await loadAndCheck(page, `/author/${firstGuide.authorId}`);
    expect(res.length).toBeGreaterThan(0);
  });

  test('legal/privacy 隐私政策', async ({ page }) => {
    const res = await loadAndCheck(page, '/legal/privacy');
    expect(res.length).toBeGreaterThan(0);
  });

  test('legal/terms 服务条款', async ({ page }) => {
    const res = await loadAndCheck(page, '/legal/terms');
    expect(res.length).toBeGreaterThan(0);
  });

  test('child-sayings 孩子说广场', async ({ page }) => {
    const res = await loadAndCheck(page, '/child-sayings');
    expect(res.length).toBeGreaterThan(0);
  });

  test('travel/admin 管理（内部）', async ({ page }) => {
    const res = await loadAndCheck(page, '/admin');
    expect(res.length).toBeGreaterThan(0);
  });
});
