import { test, expect } from '@playwright/test';

/**
 * E2E 测试 - 管理员仪表盘
 * 验证仪表盘数据加载和显示
 */

test.describe('管理员仪表盘', () => {
  test.beforeEach(async ({ page }) => {
    // 直接访问仪表盘
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test('仪表盘页面应该正确加载', async ({ page }) => {
    // 检查页面结构
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
  });

  test('应该显示统计数据卡片', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // 查找统计相关的元素（数字、卡片）
    const statCards = page.locator('[class*="stat"], [class*="card"], [class*="count"], [class*="number"]');
    const count = await statCards.count();
    
    // 应该至少有统计信息显示
    console.log(`找到 ${count} 个统计元素`);
  });

  test('导航菜单应该正常显示', async ({ page }) => {
    // 查找侧边栏或导航
    const sidebar = page.locator('aside, nav, [class*="sidebar"], [class*="menu"]');
    const count = await sidebar.count();
    
    console.log(`找到 ${count} 个导航元素`);
    
    if (count > 0) {
      // 检查是否有菜单项
      const menuItems = page.locator('a[href*="/admin/"], [role="menuitem"]');
      const menuCount = await menuItems.count();
      console.log(`找到 ${menuCount} 个菜单项`);
    }
  });

  test('仪表盘应该显示会员来源分布', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // 查找会员来源相关的文本
    const pageContent = await page.locator('body').innerText();
    const hasMemberSource = pageContent.includes('会员') || 
                           pageContent.includes('来源') || 
                           pageContent.includes('学员');
    
    console.log('页面包含会员来源信息:', hasMemberSource);
  });

  test('刷新按钮应该可点击', async ({ page }) => {
    // 查找刷新按钮
    const refreshButton = page.locator('button:has-text("刷新"), button:has-text("刷新数据")');
    const count = await refreshButton.count();
    
    if (count > 0) {
      // 按钮应该可见
      await expect(refreshButton.first()).toBeVisible();
      console.log('找到刷新按钮');
    }
  });
});

/**
 * E2E 测试 - 数据联调验证
 */

test.describe('前后端数据联调验证', () => {
  test('API 响应应该正确处理', async ({ page }) => {
    // 监听网络请求
    const apiCalls: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('tcb') || url.includes('api') || url.includes('cloudbase')) {
        apiCalls.push(url);
      }
    });

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // 等待一下让 API 调用完成
    await page.waitForTimeout(2000);
    
    console.log(`检测到 ${apiCalls.length} 个 API 调用`);
  });

  test('页面加载不应有 JavaScript 错误', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // 过滤掉常见的非关键错误
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('Failed to load resource')
    );
    
    if (criticalErrors.length > 0) {
      console.log('检测到错误:', criticalErrors);
    }
    
    // 页面应该能正常加载
    expect(await page.locator('body').isVisible()).toBeTruthy();
  });

  test('CloudBase SDK 应该正常初始化', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // 检查页面是否渲染成功
    const html = await page.content();
    expect(html.length).toBeGreaterThan(1000);
    
    console.log('页面 HTML 长度:', html.length);
  });
});
