import { test, expect } from '@playwright/test';

/**
 * E2E 功能测试 - 用户管理（成员管理）模块
 * 路径：/#/admin/members（旧 /admin/users、/admin/students 重定向到此）
 * 覆盖：页面加载与统计、Tab 筛选、搜索、来源筛选、权限详情弹窗、
 *       编辑弹窗交互、新建弹窗交互、升级为学员按钮。
 * 说明：本测试以"只读/打开弹窗"为主，不提交写库，避免污染真实成员数据。
 */

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const LOGIN_URL = '/#/admin/login';
const MODULE_URL = '/#/admin/members';

/** 在登录页使用账号密码方式登录 */
async function loginWithPassword(page: import('@playwright/test').Page) {
  await page.goto(LOGIN_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  const pwdTab = page.getByRole('button', { name: '账号密码登录' });
  if (await pwdTab.isVisible().catch(() => false)) {
    await pwdTab.click();
    await page.waitForTimeout(300);
  }

  await page.locator('input[placeholder="用户名"]').fill(ADMIN_USERNAME);
  await page.locator('input[placeholder="密码"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
}

/** 判断表格当前是否为空 */
async function isEmpty(page: import('@playwright/test').Page) {
  return (await page.getByText('暂无数据').isVisible().catch(() => false)) ||
    (await page.locator('tbody tr').count()) === 0;
}

test.describe('用户管理（成员管理）功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithPassword(page);
    await page.goto(MODULE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500); // 等待成员列表加载完成
  });

  test('页面加载与统计卡片', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '学员管理' })).toBeVisible();
    // 来源统计卡片
    await expect(page.getByText('总人数')).toBeVisible();
    // 角色统计卡片
    await expect(page.getByText('普通用户')).toBeVisible();
    await expect(page.getByText('正式学员')).toBeVisible();
    await expect(page.getByText('毕业学员')).toBeVisible();
    // 表格列头
    await expect(page.getByText('姓名', { exact: true })).toBeVisible();
    await expect(page.getByText('手机号')).toBeVisible();
    await expect(page.getByText('来源')).toBeVisible();
    await expect(page.getByText('操作')).toBeVisible();
  });

  test('Tab 筛选 - 用户（普通用户）', async ({ page }) => {
    await page.getByRole('tab', { name: /用户/ }).click();
    await page.waitForTimeout(500);
    if (!(await isEmpty(page))) {
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        // 类型列是第 5 列（td index 4）
        await expect(rows.nth(i).locator('td').nth(4)).toContainText('普通用户');
      }
    } else {
      await expect(page.getByText('暂无数据')).toBeVisible();
    }
    // 回到全部
    await page.getByRole('tab', { name: /全部/ }).click();
    await page.waitForTimeout(400);
  });

  test('Tab 筛选 - 学员（正式学员）', async ({ page }) => {
    await page.getByRole('tab', { name: /学员/ }).click();
    await page.waitForTimeout(500);
    if (!(await isEmpty(page))) {
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i).locator('td').nth(4)).toContainText('正式学员');
      }
    } else {
      await expect(page.getByText('暂无数据')).toBeVisible();
    }
    await page.getByRole('tab', { name: /全部/ }).click();
    await page.waitForTimeout(400);
  });

  test('搜索功能（按姓名过滤 + 空结果）', async ({ page }) => {
    if (!(await isEmpty(page))) {
      const firstName = (await page.locator('tbody tr').first().locator('td').nth(1).innerText()).trim();
      await page.getByPlaceholder('搜索姓名/手机/邮箱...').fill(firstName);
      await page.waitForTimeout(600);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toContainText(firstName);
      await page.getByPlaceholder('搜索姓名/手机/邮箱...').fill('');
      await page.waitForTimeout(400);
    }
    // 搜索不存在的关键词应显示空态
    await page.getByPlaceholder('搜索姓名/手机/邮箱...').fill('不存在的关键词zzz');
    await page.waitForTimeout(600);
    await expect(page.getByText('暂无数据')).toBeVisible();
    await page.getByPlaceholder('搜索姓名/手机/邮箱...').fill('');
    await page.waitForTimeout(300);
  });

  test('来源筛选 - 线上购买', async ({ page }) => {
    const sourceSelect = page.getByRole('combobox', { name: /来源/ }).first();
    await sourceSelect.click();
    await page.waitForTimeout(400);
    await page.getByRole('option', { name: '线上购买' }).click();
    await page.waitForTimeout(600);
    if (!(await isEmpty(page))) {
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        // 来源列是第 4 列（td index 3）
        await expect(rows.nth(i).locator('td').nth(3)).toContainText('线上购买');
      }
    } else {
      await expect(page.getByText('暂无数据')).toBeVisible();
    }
    // 重置为全部来源
    await page.getByRole('combobox', { name: /来源/ }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('option', { name: '全部来源' }).click();
    await page.waitForTimeout(300);
  });

  test('查看权限详情弹窗', async ({ page }) => {
    test.skip(await isEmpty(page), '无成员数据，跳过');
    const firstRow = page.locator('tbody tr').first();
    await firstRow.locator('button').nth(1).click(); // 第二个按钮 = 权限(ViewIcon)
    await page.waitForTimeout(800);
    await expect(page.getByText(/权限详情/)).toBeVisible();
    await expect(page.getByText('课程视频权限')).toBeVisible();
    await expect(page.getByText('班级报名记录')).toBeVisible();
    await page.getByRole('button', { name: '关闭' }).click();
    await page.waitForTimeout(300);
  });

  test('编辑成员弹窗交互', async ({ page }) => {
    test.skip(await isEmpty(page), '无成员数据，跳过');
    const firstRow = page.locator('tbody tr').first();
    await firstRow.locator('button').nth(0).click(); // 第一个按钮 = 编辑(EditIcon)
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('编辑成员信息')).toBeVisible();
    const nameInput = dialog.getByLabel('姓名');
    await expect(nameInput).toBeVisible();
    const emailInput = dialog.getByLabel('邮箱');
    await emailInput.fill('e2e-test@example.com');
    await expect(emailInput).toHaveValue('e2e-test@example.com');
    // 不保存，避免写库
    await dialog.getByRole('button', { name: '取消' }).click();
    await page.waitForTimeout(300);
  });

  test('新建成员弹窗交互', async ({ page }) => {
    await page.getByRole('button', { name: '新建成员' }).click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('新建成员')).toBeVisible();
    const nameInput = dialog.getByLabel('姓名 *');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('E2E测试成员');
    await expect(nameInput).toHaveValue('E2E测试成员');
    await expect(dialog.getByRole('button', { name: '创建' })).toBeVisible();
    // 不创建，避免写库
    await dialog.getByRole('button', { name: '取消' }).click();
    await page.waitForTimeout(300);
  });

  test('升级为学员按钮对普通用户显示', async ({ page }) => {
    test.skip(await isEmpty(page), '无成员数据，跳过');
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    let foundUser = false;
    for (let i = 0; i < count; i++) {
      const typeText = (await rows.nth(i).locator('td').nth(4).innerText()).trim();
      if (typeText.includes('普通用户')) {
        await expect(rows.nth(i).getByRole('button', { name: '升级' })).toBeVisible();
        foundUser = true;
        break;
      }
    }
    test.skip(foundUser, '当前页无普通用户行，跳过');
  });
});
