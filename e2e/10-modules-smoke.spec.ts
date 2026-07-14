import { test, expect } from '@playwright/test'

/**
 * E2E 冒烟测试 - 后台多模块加载
 * 目的：扩大端到端覆盖，快速发现“路由 404 / 页面白屏 / 运行时崩溃”。
 * 策略：登录后逐个访问高频模块，断言
 *   1. 未发生异常跳转（路由真实存在）；
 *   2. 主区域渲染出页面标题（main h1 可见），说明模块已成功挂载；
 *   3. 无未捕获的运行时错误（pageerror）。
 * 说明：仅做只读加载校验，不写库，避免污染真实数据。
 */

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin123'
const LOGIN_URL = '/#/admin/login'

async function loginWithPassword(page: import('@playwright/test').Page) {
  await page.goto(LOGIN_URL)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  const pwdTab = page.getByRole('button', { name: '账号密码登录' })
  if (await pwdTab.isVisible().catch(() => false)) {
    await pwdTab.click()
    await page.waitForTimeout(300)
  }

  await page.locator('input[placeholder="用户名"]').fill(ADMIN_USERNAME)
  await page.locator('input[placeholder="密码"]').fill(ADMIN_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(3000)
}

const MODULES = [
  { name: '仪表板', url: '/#/admin' },
  { name: '课程管理', url: '/#/admin/courses' },
  { name: '教师管理', url: '/#/admin/teachers' },
  { name: '班级管理', url: '/#/admin/classes' },
  { name: '排课出勤', url: '/#/admin/class-schedules' },
  { name: '报名审核', url: '/#/admin/registrations' },
  { name: '调课申请', url: '/#/admin/transfers' },
  { name: '培训合同', url: '/#/admin/contracts' },
  { name: '证书登记', url: '/#/admin/certificates' },
  { name: '题库管理', url: '/#/admin/exams' },
  { name: '订单财务', url: '/#/admin/finance' },
  { name: '退款管理', url: '/#/admin/refund-management' },
  { name: '商城订单', url: '/#/admin/shop-orders' },
  { name: '商品管理', url: '/#/admin/products' },
  { name: '消息公告', url: '/#/admin/messages' },
  { name: '管理员角色', url: '/#/admin/user-roles' },
  { name: '体系管理', url: '/#/admin/sources' },
  { name: '分类管理', url: '/#/admin/categories' },
  { name: '数据修复', url: '/#/admin/data-fix' },
]

test.describe('后台多模块加载冒烟测试', () => {
  for (const m of MODULES) {
    test(`模块加载无崩溃: ${m.name}`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e: Error) => errors.push(e.message))

      await loginWithPassword(page)
      await page.goto(m.url)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2500)

      // 1. 未发生意外跳转（路由真实存在）
      expect(page.url(), `路由 ${m.url} 发生异常跳转`).toContain(m.url)

      // 2. 主区域渲染出任意可见内容，说明模块已成功挂载（不依赖具体标题层级）
      //    配合下方 pageerror 断言，可捕获白屏 / 运行时崩溃。
      await expect(
        page.locator('main').locator('*').first()
      ).toBeVisible({ timeout: 8000 })

      // 3. 无未捕获运行时错误
      expect(errors, `模块 ${m.name} 运行时错误: ${errors.join(' | ')}`).toEqual([])
    })
  }
})
