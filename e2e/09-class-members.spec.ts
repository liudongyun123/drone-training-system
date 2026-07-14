import { test, expect } from '@playwright/test'

/**
 * E2E 功能测试 - 学员人员管理（学员管理）模块
 * 路径：/#/admin/class-members
 * 覆盖：
 *  1. 页面加载且无运行时错误（验证 TDZ 崩溃修复 v20260714-1958）
 *  2. Tab 切换（按班级 / 按课程）
 *  3. 打开学员“关联课程（报班赠送）”弹窗
 *  4. 添加/视频切换/撤销 班级学员赠送关联课程（写库闭环 + 清理）
 * 说明：写库操作均为可逆（撤销 = 标记 revoked），测试结束后学员状态恢复，不污染真实数据。
 */

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin123'
const LOGIN_URL = '/#/admin/login'
const MODULE_URL = '/#/admin/class-members'

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

/** 在所有班级里尝试找一个“有在读学员”的班级；返回是否找到 */
async function findClassWithStudents(page: import('@playwright/test').Page): Promise<boolean> {
  const classSelect = page.locator('select').first()
  const n = Math.min(await classSelect.locator('option').count(), 8)
  for (let i = 0; i < n; i++) {
    await classSelect.selectOption({ index: i })
    await page.waitForTimeout(1800)
    const has = await page.getByRole('button', { name: '关联课程' }).first().isVisible().catch(() => false)
    if (has) return true
  }
  return false
}

/** 读取“赠送关联课程（N）”中的 N */
async function getGiftCount(page: import('@playwright/test').Page): Promise<number> {
  const txt = await page.getByText(/赠送关联课程（\d+）/).innerText()
  const m = txt.match(/（(\d+)）/)
  return m ? Number(m[1]) : 0
}

/** 读取赠送关联课程列表中各卡片的课程名（用于避开已存在的课程） */
async function getGiftCourseNames(giftList: import('@playwright/test').Locator): Promise<string[]> {
  const cards = giftList.locator(':scope > div')
  const n = await cards.count()
  const names: string[] = []
  for (let i = 0; i < n; i++) {
    const t = await cards.nth(i).locator('span.font-medium').first().innerText().catch(() => '')
    names.push(t.trim())
  }
  return names
}

test.describe('学员人员管理（学员管理）模块功能测试', () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    ;(page as any)._errors = errors

    await loginWithPassword(page)
    await page.goto(MODULE_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
  })

  test('页面加载且无运行时错误（TDZ 崩溃已修复）', async ({ page }) => {
    await expect(page.getByText('学员人员管理')).toBeVisible()
    await expect(page.getByRole('button', { name: /按班级/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /按课程/ })).toBeVisible()

    const errors = (page as any)._errors as string[]
    expect(errors, `页面运行时错误: ${errors.join(' | ')}`).toEqual([])
  })

  test('Tab 切换：按班级 / 按课程', async ({ page }) => {
    // 默认按班级
    await expect(page.locator('select').first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '关联课程' })).toBeVisible()

    // 切换到按课程
    await page.getByRole('button', { name: /按课程/ }).click()
    await page.waitForTimeout(1500)
    await expect(page.getByText('总权限数')).toBeVisible()

    // 切回按班级
    await page.getByRole('button', { name: /按班级/ }).click()
    await page.waitForTimeout(1200)
    await expect(page.getByRole('columnheader', { name: '关联课程' })).toBeVisible()
  })

  test('打开学员“关联课程（报班赠送）”弹窗', async ({ page }) => {
    const found = await findClassWithStudents(page)
    test.skip(!found, '所有班级均无在读学员，跳过')

    await page.getByRole('button', { name: '关联课程' }).first().click()
    await page.waitForTimeout(1200)
    await expect(page.getByText('学员关联课程（报班赠送）')).toBeVisible()

    // 关闭（弹窗标题栏右侧 X 按钮 = 标题 h3 的父容器里第一个按钮）
    await page.getByText('学员关联课程（报班赠送）').locator('xpath=..').getByRole('button').first().click()
    await page.waitForTimeout(500)
    await expect(page.getByText('学员关联课程（报班赠送）')).toBeHidden()
  })

  test('添加并撤销班级学员赠送关联课程（含视频开关）', async ({ page }) => {
    // 撤销操作有 window.confirm，自动确认
    page.on('dialog', (d) => d.accept())

    const found = await findClassWithStudents(page)
    test.skip(!found, '所有班级均无在读学员，跳过')

    // 打开关联课程弹窗
    await page.getByRole('button', { name: '关联课程' }).first().click()
    await page.waitForTimeout(1200)
    await expect(page.getByText('学员关联课程（报班赠送）')).toBeVisible()

    const before = await getGiftCount(page)
    const giftListBefore = page.getByText(`赠送关联课程（${before}）`).locator('xpath=..').locator('xpath=following-sibling::div')
    const existingNames = await getGiftCourseNames(giftListBefore)

    // 添加赠送课程：从下拉中选一门“尚未存在”的课程，避免误操作已有赠课
    await page.getByRole('button', { name: '添加赠送课程' }).click()
    await page.waitForTimeout(500)
    const courseSelect = page.getByRole('combobox').filter({ has: page.getByRole('option', { name: '请选择课程' }) })
    const options = courseSelect.locator('option')
    const optCount = await options.count()
    let usedLabel = ''
    for (let i = 1; i < optCount; i++) {
      const label = (await options.nth(i).innerText()).trim()
      if (label && !existingNames.includes(label)) { usedLabel = label; break }
    }
    expect(usedLabel, '下拉中没有可添加的非已有课程').not.toBe('')
    await courseSelect.selectOption({ label: usedLabel })
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: '确认添加' }).click()
    await page.waitForTimeout(2000)
    // 提交后“添加赠送关联课程”弹窗保留结果不会自动关闭，必须手动关闭，
    // 否则它会作为遮罩盖住下方的关联课程列表，导致后续按钮点击被拦截。
    await page.getByRole('button', { name: '关闭' }).click()
    await page.waitForTimeout(500)

    const afterAdd = await getGiftCount(page)
    expect(afterAdd).toBe(before + 1)

    // 切换视频（刚添加的课程排在列表首位，取第一个卡片的视频按钮）
    const giftList = page.getByText(`赠送关联课程（${afterAdd}）`).locator('xpath=..').locator('xpath=following-sibling::div')
    const firstCard = giftList.locator(':scope > div').first()
    const vbtn = firstCard.getByRole('button', { name: /视频开|视频关/ })
    const vbefore = (await vbtn.innerText()).trim()
    await vbtn.click()
    await page.waitForTimeout(1500) // 等待列表重新加载
    const vafter = (await firstCard.getByRole('button', { name: /视频开|视频关/ }).innerText()).trim()
    expect(vafter, `视频开关未生效（切换前:${vbefore}）`).not.toBe(vbefore)

    // 撤销刚添加的赠送课程（列表首位即新建项）
    await giftList.getByRole('button', { name: '撤销' }).first().click()
    await page.waitForTimeout(1800)

    // 撤销在数据模型上=标记 status:'revoked'（列表仍保留该卡片，仅状态变“已撤销”），
    // getClassMemberCourses 不过滤状态，故验证“该课程卡片状态变为已撤销”即可证明撤销生效。
    const usedCard = giftList.locator(':scope > div', { hasText: usedLabel })
    await expect(usedCard.getByText('已撤销')).toBeVisible()
  })
})
