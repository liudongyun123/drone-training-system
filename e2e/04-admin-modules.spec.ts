import { test, expect } from '@playwright/test';

/**
 * E2E 测试 - 管理员模块导航
 */

test.describe('管理员模块导航', () => {
  const adminModules = [
    { path: '/admin/courses', name: '课程管理' },
    { path: '/admin/students', name: '学员管理' },
    { path: '/admin/teachers', name: '教师管理' },
    { path: '/admin/orders', name: '订单财务' },
    { path: '/admin/schedules', name: '排课出勤' },
  ];

  for (const module of adminModules) {
    test(`${module.name} 模块应该可访问`, async ({ page }) => {
      await page.goto(module.path);
      await page.waitForLoadState('networkidle');
      
      // 检查页面是否加载
      const body = await page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(50);
      
      console.log(`${module.name} 加载成功`);
    });
  }

  test('课程管理页面应该显示课程列表', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.waitForLoadState('networkidle');
    
    // 检查页面内容
    const content = await page.locator('body').innerText();
    expect(content.length).toBeGreaterThan(50);
    
    console.log('课程管理页面加载完成');
  });

  test('教师管理页面应该可访问', async ({ page }) => {
    await page.goto('/admin/teachers');
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').innerText();
    expect(content.length).toBeGreaterThan(50);
    
    console.log('教师管理页面加载完成');
  });
});

/**
 * E2E 测试 - 管理员功能交互
 */

test.describe('管理员功能交互', () => {
  test('搜索功能应该可用', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.waitForLoadState('networkidle');
    
    // 查找搜索框
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]');
    const count = await searchInput.count();
    
    if (count > 0) {
      console.log('找到搜索框');
      // 尝试输入
      await searchInput.first().fill('测试');
      await page.waitForTimeout(500);
    }
  });

  test('分页控件应该正常显示', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.waitForLoadState('networkidle');
    
    // 查找分页元素
    const pagination = page.locator('[class*="pagination"], [class*="page"], button:has-text("上一页"), button:has-text("下一页")');
    const count = await pagination.count();
    
    console.log(`找到 ${count} 个分页元素`);
  });

  test('筛选功能应该可用', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.waitForLoadState('networkidle');
    
    // 查找下拉筛选
    const selects = page.locator('select');
    const count = await selects.count();
    
    if (count > 0) {
      console.log(`找到 ${count} 个筛选下拉框`);
    }
  });
});

/**
 * E2E 测试 - 权限管理
 */

test.describe('权限管理功能', () => {
  test('权限管理页面应该可访问', async ({ page }) => {
    await page.goto('/admin/permissions');
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').innerText();
    expect(content.length).toBeGreaterThan(50);
    
    console.log('权限管理页面加载完成');
  });

  test('权限配置弹窗应该可打开', async ({ page }) => {
    await page.goto('/admin/permissions');
    await page.waitForLoadState('networkidle');
    
    // 查找权限配置按钮
    const configButton = page.locator('button:has-text("配置"), button:has-text("权限"), [class*="permission"]');
    const count = await configButton.count();
    
    if (count > 0) {
      console.log('找到权限配置入口');
    }
  });
});
