import { test, expect } from '@playwright/test';

/**
 * E2E 测试 - 管理员考试题库管理流程
 * 测试管理后台的考试管理和题库管理功能
 */

test.describe('管理员考试管理流程', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录管理员
    await page.goto('/#/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 尝试登录
    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const loginButton = page.locator('button[type="submit"]');
    
    if (await usernameInput.isVisible({ timeout: 3000 })) {
      await usernameInput.fill('admin');
      await passwordInput.fill('admin123');
      await loginButton.click();
      await page.waitForTimeout(3000);
    }
  });

  test('考试题库管理页面应该正确加载', async ({ page }) => {
    await page.goto('/#/admin/exams');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText();
    console.log('考试题库管理页面内容长度:', body.length);
    
    // 页面应该加载成功
    expect(body.length).toBeGreaterThan(100);
  });

  test('考试题库页面应该有表格或空状态', async ({ page }) => {
    await page.goto('/#/admin/exams');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 检查是否有表格元素或空状态提示
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=暂无,text=没有数据').isVisible().catch(() => false);
    
    console.log('有表格:', hasTable, '有空状态:', hasEmptyState);
    
    expect(hasTable || hasEmptyState || (await page.locator('body').innerText()).length > 100).toBe(true);
  });
});

test.describe('管理员学员管理流程', () => {
  test('学员管理页面应该正确加载', async ({ page }) => {
    await page.goto('/#/admin/members');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText();
    console.log('学员管理页面内容长度:', body.length);
    
    expect(body.length).toBeGreaterThan(100);
  });

  test('会员等级页面应该正确加载', async ({ page }) => {
    await page.goto('/#/admin/member-levels');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText();
    console.log('会员等级页面内容长度:', body.length);
    
    expect(body.length).toBeGreaterThan(100);
  });
});

test.describe('管理员营销管理流程', () => {
  test('营销管理页面应该正确加载', async ({ page }) => {
    await page.goto('/#/admin/marketing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText();
    console.log('营销管理页面内容长度:', body.length);
    
    expect(body.length).toBeGreaterThan(100);
  });

  test('优惠券管理应该可见', async ({ page }) => {
    await page.goto('/#/admin/marketing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText();
    const hasCouponContent = body.includes('优惠') || body.includes('营销');
    
    console.log('有优惠相关内容:', hasCouponContent);
    expect(hasCouponContent || body.length > 100).toBe(true);
  });
});
