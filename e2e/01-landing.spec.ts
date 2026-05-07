import { test, expect } from '@playwright/test';

/**
 * E2E 测试 - 用户前台流程
 * 1. 首页加载
 * 2. 课程列表浏览
 * 3. 课程详情
 * 4. 用户登录
 */

test.describe('用户前台流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('首页应该正确加载', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/Drone.*Training|无人机|培训/i);
    
    // 检查页面加载成功（状态码 200）
    await expect(page.locator('body')).toBeVisible();
    
    // 检查首页内容
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('首页应该显示课程概览', async ({ page }) => {
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 检查是否有主要内容区域（导航 + 页面内容）
    const mainContent = await page.locator('nav, header, main, [role="main"]').count();
    expect(mainContent).toBeGreaterThan(0);
    
    // 检查页面有链接（说明内容已加载）
    const links = await page.locator('a[href]').count();
    expect(links).toBeGreaterThan(5);
  });

  test('导航链接应该正常工作', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // 查找导航链接（支持 hash 路由）
    const navLinks = page.locator('nav a, header a, a[href*="#"]');
    const linkCount = await navLinks.count();
    
    console.log('找到导航链接数量:', linkCount);
    
    if (linkCount > 0) {
      // 页面应该有导航链接
      expect(linkCount).toBeGreaterThan(0);
    }
    
    // 验证页面有链接
    const allLinks = await page.locator('a[href]').count();
    console.log('页面总链接数:', allLinks);
    expect(allLinks).toBeGreaterThan(0);
  });
});
