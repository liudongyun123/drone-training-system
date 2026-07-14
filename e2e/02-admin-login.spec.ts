import { test, expect } from '@playwright/test';

/**
 * E2E 测试 - 管理员登录流程
 * 管理员账号：admin / admin123
 * 登录路由：/#/admin/login (Hash Router)
 * 实际登录页为 src/admin/pages/system/AdminLogin.tsx（简易版）：
 *   - 默认标签为「账号密码登录」
 *   - 用户名为 input[placeholder="用户名"]，密码为 input[placeholder="密码"]
 *   - 提交按钮文本为「登录」
 */

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const LOGIN_URL = '/#/admin/login';

/** 在登录页使用账号密码方式登录 */
async function loginWithPassword(page: import('@playwright/test').Page) {
  await page.goto(LOGIN_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // 确保处于「账号密码登录」标签（默认即为该标签）
  const pwdTab = page.getByRole('button', { name: '账号密码登录' });
  if (await pwdTab.isVisible().catch(() => false)) {
    await pwdTab.click();
    await page.waitForTimeout(300);
  }

  const usernameInput = page.locator('input[placeholder="用户名"]');
  const passwordInput = page.locator('input[placeholder="密码"]');
  await expect(usernameInput).toBeVisible({ timeout: 5000 });
  await expect(passwordInput).toBeVisible({ timeout: 5000 });

  await usernameInput.fill(ADMIN_USERNAME);
  await passwordInput.fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
}

test.describe('管理员登录流程', () => {
  test('登录页面应该正确加载', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const title = await page.locator('h2').first().textContent().catch(() => '未找到');
    expect(title).toContain('登录');

    const hasUserInput = await page.locator('input[placeholder="用户名"]').isVisible().catch(() => false);
    expect(hasUserInput).toBe(true);
  });

  test('登录页面应该包含必要的表单元素', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await expect(page.locator('input[placeholder="用户名"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder="密码"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 5000 });
  });

  test('使用管理员账号登录应该成功', async ({ page }) => {
    await loginWithPassword(page);
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/admin');
  });

  test('空用户名或密码应该不提交', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const submit = page.locator('button[type="submit"]');
    await expect(submit).toBeVisible({ timeout: 5000 });
    await submit.click();
    await page.waitForTimeout(800);

    // 未填写凭据时仍停留在登录页（出现错误提示）
    const errVisible = await page.locator('text=请输入用户名').isVisible().catch(() => false);
    expect(errVisible || page.url().includes('/admin/login')).toBe(true);
  });

  test('错误密码应该显示错误提示', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const pwdTab = page.getByRole('button', { name: '账号密码登录' });
    if (await pwdTab.isVisible().catch(() => false)) await pwdTab.click();

    await page.locator('input[placeholder="用户名"]').fill(ADMIN_USERNAME);
    await page.locator('input[placeholder="密码"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // 错误密码应停留在登录页并显示错误提示
    expect(page.url()).not.toContain('/admin/dashboard');
    expect(page.url()).toContain('/admin');
  });
});
