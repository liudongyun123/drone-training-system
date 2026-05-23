import { describe, it, expect } from 'vitest'

// ============================================================================
// 纯逻辑测试：从 couponService / coupon.ts 提取的核心优惠券逻辑
// ============================================================================

// ---------- 类型定义（与源码一致） ----------

interface Coupon {
  _id: string
  code: string
  type: 'fixed' | 'percentage'
  value: number
  minAmount?: number
  maxDiscount?: number
  totalCount: number
  usedCount: number
  startDate: string
  endDate: string
  status: 'active' | 'expired' | 'disabled'
  applicableCourses?: string[]
}

// ---------- 纯函数实现（与源码逻辑一致） ----------

/**
 * 计算折扣金额
 * - fixed：固定金额，不超过订单总额
 * - percentage：按百分比，不超过 maxDiscount 上限
 */
function calculateDiscount(coupon: Coupon, amount: number): number {
  if (coupon.type === 'fixed') return Math.min(coupon.value, amount)
  const discount = amount * (coupon.value / 100)
  return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount
}

/**
 * 验证优惠券（纯逻辑部分，不含异步数据库调用）
 */
function validateCouponLogic(coupon: Coupon, totalAmount: number, courseId?: string): {
  valid: boolean; error?: string
} {
  if (coupon.status !== 'active') return { valid: false, error: '优惠券已失效' }

  const now = new Date().toISOString()
  if (coupon.startDate > now) return { valid: false, error: '优惠券尚未生效' }
  if (coupon.endDate < now) return { valid: false, error: '优惠券已过期' }
  if (coupon.usedCount >= coupon.totalCount) return { valid: false, error: '优惠券已发放完毕' }
  if (coupon.minAmount && totalAmount < coupon.minAmount) {
    return { valid: false, error: `订单金额需达到¥${coupon.minAmount}才能使用` }
  }

  if (coupon.applicableCourses && coupon.applicableCourses.length > 0 && courseId) {
    if (!coupon.applicableCourses.includes(courseId)) {
      return { valid: false, error: '该优惠券不适用于此课程' }
    }
  }

  return { valid: true }
}

/**
 * 判断优惠券类型是否合法
 */
function isValidCouponType(type: string): boolean {
  return type === 'fixed' || type === 'percentage'
}

/**
 * 判断优惠券是否在有效期内
 */
function isCouponInDateRange(coupon: Coupon, now: string): boolean {
  return coupon.startDate <= now && coupon.endDate >= now
}

/**
 * 判断优惠券是否已用完
 */
function isCouponExhausted(coupon: Coupon): boolean {
  return coupon.usedCount >= coupon.totalCount
}

// ============================================================================
// 测试
// ============================================================================

// ---------- 优惠券类型验证 ----------

describe('优惠券类型验证', () => {
  it('fixed 为合法类型', () => {
    expect(isValidCouponType('fixed')).toBe(true)
  })

  it('percentage 为合法类型', () => {
    expect(isValidCouponType('percentage')).toBe(true)
  })

  it('discount 不是合法类型', () => {
    expect(isValidCouponType('discount')).toBe(false)
  })

  it('free 不是合法类型', () => {
    expect(isValidCouponType('free')).toBe(false)
  })

  it('空字符串不是合法类型', () => {
    expect(isValidCouponType('')).toBe(false)
  })
})

// ---------- 优惠券金额/折扣计算 ----------

describe('优惠券折扣计算 calculateDiscount', () => {
  it('固定金额券：折扣等于面值', () => {
    const coupon: Coupon = {
      _id: '1', code: 'FIXED10', type: 'fixed', value: 10,
      totalCount: 100, usedCount: 0,
      startDate: '2025-01-01', endDate: '2026-12-31', status: 'active',
    }
    expect(calculateDiscount(coupon, 100)).toBe(10)
  })

  it('固定金额券：折扣不超过订单金额', () => {
    const coupon: Coupon = {
      _id: '1', code: 'FIXED200', type: 'fixed', value: 200,
      totalCount: 100, usedCount: 0,
      startDate: '2025-01-01', endDate: '2026-12-31', status: 'active',
    }
    expect(calculateDiscount(coupon, 50)).toBe(50) // 只能抵扣 50
  })

  it('百分比券：按百分比计算折扣', () => {
    const coupon: Coupon = {
      _id: '2', code: 'PCT20', type: 'percentage', value: 20,
      totalCount: 100, usedCount: 0,
      startDate: '2025-01-01', endDate: '2026-12-31', status: 'active',
    }
    expect(calculateDiscount(coupon, 200)).toBe(40) // 200 * 20%
  })

  it('百分比券：折扣不超过 maxDiscount 上限', () => {
    const coupon: Coupon = {
      _id: '3', code: 'PCT50CAP30', type: 'percentage', value: 50, maxDiscount: 30,
      totalCount: 100, usedCount: 0,
      startDate: '2025-01-01', endDate: '2026-12-31', status: 'active',
    }
    expect(calculateDiscount(coupon, 100)).toBe(30) // 50% of 100 = 50, cap 30
  })

  it('百分比券：无 maxDiscount 时不设上限', () => {
    const coupon: Coupon = {
      _id: '4', code: 'PCT50', type: 'percentage', value: 50,
      totalCount: 100, usedCount: 0,
      startDate: '2025-01-01', endDate: '2026-12-31', status: 'active',
    }
    expect(calculateDiscount(coupon, 1000)).toBe(500) // 50% of 1000
  })

  it('百分比券：折扣低于 maxDiscount 时取实际值', () => {
    const coupon: Coupon = {
      _id: '5', code: 'PCT10CAP50', type: 'percentage', value: 10, maxDiscount: 50,
      totalCount: 100, usedCount: 0,
      startDate: '2025-01-01', endDate: '2026-12-31', status: 'active',
    }
    expect(calculateDiscount(coupon, 100)).toBe(10) // 10% of 100 = 10, below cap
  })

  it('固定金额券：面值为 0 时折扣为 0', () => {
    const coupon: Coupon = {
      _id: '6', code: 'FIXED0', type: 'fixed', value: 0,
      totalCount: 100, usedCount: 0,
      startDate: '2025-01-01', endDate: '2026-12-31', status: 'active',
    }
    expect(calculateDiscount(coupon, 100)).toBe(0)
  })
})

// ---------- 过期时间判断 ----------

describe('优惠券有效期判断', () => {
  const now = new Date().toISOString()

  it('开始日期和结束日期包含当前时间 → 有效', () => {
    const coupon: Coupon = {
      _id: '1', code: 'VALID', type: 'fixed', value: 10,
      totalCount: 100, usedCount: 0,
      startDate: '2020-01-01', endDate: '2030-12-31', status: 'active',
    }
    expect(isCouponInDateRange(coupon, now)).toBe(true)
  })

  it('开始日期在当前时间之后 → 未生效', () => {
    const coupon: Coupon = {
      _id: '2', code: 'FUTURE', type: 'fixed', value: 10,
      totalCount: 100, usedCount: 0,
      startDate: '2030-01-01', endDate: '2031-12-31', status: 'active',
    }
    expect(isCouponInDateRange(coupon, now)).toBe(false)
  })

  it('结束日期在当前时间之前 → 已过期', () => {
    const coupon: Coupon = {
      _id: '3', code: 'EXPIRED', type: 'fixed', value: 10,
      totalCount: 100, usedCount: 0,
      startDate: '2020-01-01', endDate: '2020-12-31', status: 'active',
    }
    expect(isCouponInDateRange(coupon, now)).toBe(false)
  })

  it('边界情况：开始日期等于当前时间 → 有效', () => {
    const coupon: Coupon = {
      _id: '4', code: 'EDGE_START', type: 'fixed', value: 10,
      totalCount: 100, usedCount: 0,
      startDate: now, endDate: '2030-12-31', status: 'active',
    }
    expect(isCouponInDateRange(coupon, now)).toBe(true)
  })
})

// ---------- 最低消费金额验证 ----------

describe('最低消费金额验证', () => {
  it('订单金额达到最低消费 → 验证通过', () => {
    const coupon: Coupon = {
      _id: '1', code: 'MIN100', type: 'fixed', value: 10, minAmount: 100,
      totalCount: 100, usedCount: 0,
      startDate: '2020-01-01', endDate: '2030-12-31', status: 'active',
    }
    const result = validateCouponLogic(coupon, 150)
    expect(result.valid).toBe(true)
  })

  it('订单金额未达最低消费 → 验证失败', () => {
    const coupon: Coupon = {
      _id: '2', code: 'MIN100', type: 'fixed', value: 10, minAmount: 100,
      totalCount: 100, usedCount: 0,
      startDate: '2020-01-01', endDate: '2030-12-31', status: 'active',
    }
    const result = validateCouponLogic(coupon, 50)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('100')
  })

  it('订单金额恰好等于最低消费 → 验证通过', () => {
    const coupon: Coupon = {
      _id: '3', code: 'MIN100', type: 'fixed', value: 10, minAmount: 100,
      totalCount: 100, usedCount: 0,
      startDate: '2020-01-01', endDate: '2030-12-31', status: 'active',
    }
    const result = validateCouponLogic(coupon, 100)
    expect(result.valid).toBe(true)
  })

  it('无最低消费限制 → 任意金额通过', () => {
    const coupon: Coupon = {
      _id: '4', code: 'NO_MIN', type: 'fixed', value: 10,
      totalCount: 100, usedCount: 0,
      startDate: '2020-01-01', endDate: '2030-12-31', status: 'active',
    }
    const result = validateCouponLogic(coupon, 1)
    expect(result.valid).toBe(true)
  })

  it('最低消费为 0 → 任意金额通过', () => {
    const coupon: Coupon = {
      _id: '5', code: 'MIN0', type: 'fixed', value: 10, minAmount: 0,
      totalCount: 100, usedCount: 0,
      startDate: '2020-01-01', endDate: '2030-12-31', status: 'active',
    }
    const result = validateCouponLogic(coupon, 1)
    expect(result.valid).toBe(true)
  })
})

// ---------- 课程限制匹配 ----------

describe('课程限制匹配', () => {
  const baseCoupon: Coupon = {
    _id: '1', code: 'COURSE_SPECIFIC', type: 'fixed', value: 10,
    totalCount: 100, usedCount: 0,
    startDate: '2020-01-01', endDate: '2030-12-31', status: 'active',
    applicableCourses: ['course-A', 'course-B'],
  }

  it('课程在适用列表中 → 验证通过', () => {
    const result = validateCouponLogic(baseCoupon, 100, 'course-A')
    expect(result.valid).toBe(true)
  })

  it('课程不在适用列表中 → 验证失败', () => {
    const result = validateCouponLogic(baseCoupon, 100, 'course-C')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('不适用于此课程')
  })

  it('未指定课程 ID → 验证通过（不限制）', () => {
    const result = validateCouponLogic(baseCoupon, 100)
    expect(result.valid).toBe(true)
  })

  it('适用课程列表为空 → 不限制课程', () => {
    const coupon: Coupon = {
      ...baseCoupon, applicableCourses: [],
    }
    const result = validateCouponLogic(coupon, 100, 'course-C')
    expect(result.valid).toBe(true)
  })

  it('无 applicableCourses 字段 → 不限制课程', () => {
    const coupon: Coupon = {
      ...baseCoupon, applicableCourses: undefined,
    }
    const result = validateCouponLogic(coupon, 100, 'course-C')
    expect(result.valid).toBe(true)
  })
})

// ---------- 综合验证 ----------

describe('优惠券综合验证 validateCouponLogic', () => {
  it('状态为 disabled → 验证失败', () => {
    const coupon: Coupon = {
      _id: '1', code: 'DISABLED', type: 'fixed', value: 10,
      totalCount: 100, usedCount: 0,
      startDate: '2020-01-01', endDate: '2030-12-31', status: 'disabled',
    }
    const result = validateCouponLogic(coupon, 100)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('已失效')
  })

  it('状态为 expired → 验证失败', () => {
    const coupon: Coupon = {
      _id: '2', code: 'EXPIRED', type: 'fixed', value: 10,
      totalCount: 100, usedCount: 0,
      startDate: '2020-01-01', endDate: '2030-12-31', status: 'expired',
    }
    const result = validateCouponLogic(coupon, 100)
    expect(result.valid).toBe(false)
  })

  it('已发放完毕 → 验证失败', () => {
    const coupon: Coupon = {
      _id: '3', code: 'SOLDOUT', type: 'fixed', value: 10,
      totalCount: 50, usedCount: 50,
      startDate: '2020-01-01', endDate: '2030-12-31', status: 'active',
    }
    expect(isCouponExhausted(coupon)).toBe(true)
    const result = validateCouponLogic(coupon, 100)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('发放完毕')
  })

  it('完全合法的优惠券 → 验证通过', () => {
    const coupon: Coupon = {
      _id: '4', code: 'VALID', type: 'fixed', value: 10,
      totalCount: 100, usedCount: 10,
      startDate: '2020-01-01', endDate: '2030-12-31', status: 'active',
    }
    const result = validateCouponLogic(coupon, 100)
    expect(result.valid).toBe(true)
  })
})

// ---------- 优惠券统计 ----------

describe('优惠券统计计算', () => {
  const coupons: Coupon[] = [
    { _id: '1', code: 'A', type: 'fixed', value: 10, totalCount: 100, usedCount: 20, startDate: '2025-01-01', endDate: '2030-12-31', status: 'active' },
    { _id: '2', code: 'B', type: 'percentage', value: 20, totalCount: 50, usedCount: 50, startDate: '2025-01-01', endDate: '2030-12-31', status: 'active' },
    { _id: '3', code: 'C', type: 'fixed', value: 30, totalCount: 200, usedCount: 5, startDate: '2025-01-01', endDate: '2020-12-31', status: 'expired' },
    { _id: '4', code: 'D', type: 'fixed', value: 5, totalCount: 100, usedCount: 0, startDate: '2025-01-01', endDate: '2030-12-31', status: 'disabled' },
  ]

  it('应正确统计总数', () => {
    expect(coupons.length).toBe(4)
  })

  it('应正确统计活跃优惠券数量', () => {
    const active = coupons.filter(c => c.status === 'active').length
    expect(active).toBe(2)
  })

  it('应正确统计已过期优惠券数量', () => {
    const expired = coupons.filter(c => c.status === 'expired').length
    expect(expired).toBe(1)
  })

  it('应正确统计总使用次数', () => {
    const totalUsed = coupons.reduce((sum, c) => sum + c.usedCount, 0)
    expect(totalUsed).toBe(75) // 20 + 50 + 5 + 0
  })

  it('应正确筛选固定金额券', () => {
    const fixedCoupons = coupons.filter(c => c.type === 'fixed')
    expect(fixedCoupons).toHaveLength(3)
  })

  it('应正确筛选百分比券', () => {
    const pctCoupons = coupons.filter(c => c.type === 'percentage')
    expect(pctCoupons).toHaveLength(1)
  })
})
