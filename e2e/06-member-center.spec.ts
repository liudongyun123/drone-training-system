import { test, expect } from '@playwright/test';

/**
 * E2E 测试 - 会员学习中心流程
 * 1. 我的学习页面
 * 2. 我的课程页面
 * 3. 学习路径页面
 */

test.describe('会员学习中心流程', () => {
  test('我的学习页面应该正确加载', async ({ page }) => {
    await page.goto('/#/learning');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText();
    console.log('我的学习页面内容长度:', body.length);
    
    // 页面应该加载成功
    expect(body.length).toBeGreaterThan(50);
  });

  test('我的课程页面应该正确加载', async ({ page }) => {
    await page.goto('/#/my-classes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText();
    console.log('我的课程页面内容长度:', body.length);
    
    expect(body.length).toBeGreaterThan(50);
  });

  test('学习路径页面应该正确加载', async ({ page }) => {
    await page.goto('/#/learning-paths');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText();
    console.log('学习路径页面内容长度:', body.length);
    
    expect(body.length).toBeGreaterThan(50);
  });

  test('证书中心页面应该正确加载', async ({ page }) => {
    await page.goto('/#/certificates');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText();
    console.log('证书中心页面内容长度:', body.length);
    
    expect(body.length).toBeGreaterThan(50);
  });
});

test.describe('用户订单流程', () => {
  test('我的订单页面应该正确加载', async ({ page }) => {
    await page.goto('/#/orders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText();
    console.log('我的订单页面内容长度:', body.length);
    
    expect(body.length).toBeGreaterThan(50);
  });

  test('优惠券中心页面应该正确加载', async ({ page }) => {
    await page.goto('/#/coupons');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText();
    console.log('优惠券中心页面内容长度:', body.length);
    
    expect(body.length).toBeGreaterThan(50);
  });
});
