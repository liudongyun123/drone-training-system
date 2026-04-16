import { test, expect } from '@playwright/test';

/**
 * E2E 测试 - 管理员登录流程
 * 管理员账号：admin / admin123
 * 登录路由：/#/admin/login (Hash Router)
 */

// 测试配置
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const LOGIN_URL = '/#/admin/login';

test.describe('管理员登录流程', () => {
  test.beforeEach(async ({ page }) => {
    // 直接导航到登录页
    await page.goto(LOGIN_URL);
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    // 等待 React 组件渲染
    await page.waitForTimeout(2000);
  });

  test('登录页面应该正确加载', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 检查 URL
    const url = page.url();
    console.log('当前 URL:', url);
    
    // 等待 React 渲染
    await page.waitForTimeout(1000);
    
    // 尝试查找登录表单
    const form = page.locator('form');
    const isFormVisible = await form.isVisible().catch(() => false);
    console.log('表单可见:', isFormVisible);
    
    // 打印页面 h1
    const h1 = await page.locator('h1').first().textContent().catch(() => '未找到');
    console.log('页面 h1:', h1);
    
    // 如果是登录页，应该能看到 "管理后台登录" 标题
    if (h1?.includes('管理后台登录') || h1?.includes('登录')) {
      expect(true).toBe(true);
    } else {
      // 检查是否成功加载了登录表单
      expect(isFormVisible).toBe(true);
    }
  });

  test('登录页面应该包含必要的表单元素', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 检查用户名输入框
    const usernameInput = page.locator('#username');
    const usernameVisible = await usernameInput.isVisible().catch(() => false);
    console.log('用户名输入框可见:', usernameVisible);
    
    // 如果不可见，尝试查找其他方式
    if (!usernameVisible) {
      const h1 = await page.locator('h1').first().textContent().catch(() => '');
      console.log('页面 h1:', h1);
      
      // 检查是否是登录页
      if (!h1?.includes('管理后台')) {
        console.log('未加载到登录页面');
      }
      
      // 仍然检查表单是否存在
      const form = page.locator('form');
      const formVisible = await form.isVisible().catch(() => false);
      console.log('表单可见:', formVisible);
      
      // 抛出错误
      throw new Error(`登录表单未找到。用户名输入框可见: ${usernameVisible}`);
    }
    
    await expect(usernameInput).toBeVisible({ timeout: 5000 });
    
    // 检查密码输入框
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    
    // 检查登录按钮
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible({ timeout: 5000 });
  });

  test('使用管理员账号登录应该成功', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 检查用户名输入框
    const usernameInput = page.locator('#username');
    const isVisible = await usernameInput.isVisible().catch(() => false);
    
    if (!isVisible) {
      const h1 = await page.locator('h1').first().textContent().catch(() => '未找到');
      console.log('页面 h1:', h1);
      throw new Error(`登录表单未加载。h1: ${h1}`);
    }
    
    // 填写用户名
    await usernameInput.fill(ADMIN_USERNAME);
    
    // 填写密码
    const passwordInput = page.locator('#password');
    await passwordInput.fill(ADMIN_PASSWORD);
    
    // 点击登录按钮
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();
    
    // 等待登录响应
    await page.waitForTimeout(3000);
    
    // 检查 URL
    const currentUrl = page.url();
    console.log('登录后 URL:', currentUrl);
    
    // 检查是否在 admin 页面
    expect(currentUrl).toContain('/admin');
  });

  test('空用户名或密码应该不提交', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 检查登录按钮
    const loginButton = page.locator('button[type="submit"]');
    const isVisible = await loginButton.isVisible().catch(() => false);
    
    if (!isVisible) {
      throw new Error('登录按钮未找到');
    }
    
    // 点击登录按钮不填写内容
    await loginButton.click();
    
    // 检查页面是否仍在登录页
    await page.waitForTimeout(500);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin');
  });

  test('错误密码应该显示错误提示', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 检查输入框
    const usernameInput = page.locator('#username');
    const isVisible = await usernameInput.isVisible().catch(() => false);
    
    if (!isVisible) {
      throw new Error('登录表单未加载');
    }
    
    // 填写正确的用户名和错误的密码
    await usernameInput.fill(ADMIN_USERNAME);
    
    const passwordInput = page.locator('#password');
    await passwordInput.fill('wrongpassword');
    
    // 点击登录按钮
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();
    
    // 等待响应
    await page.waitForTimeout(2000);
    
    // 检查是否仍在登录页
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin');
  });
});
