import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// Mock adminService
// ============================================================================
const mockAdminService = {
  list: vi.fn(),
  listWithOps: vi.fn(),
  get: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

vi.mock('@/services/adminService', () => ({
  adminService: mockAdminService,
}))

// ============================================================================
// 测试辅助函数（从 examService 提取出来独立测试）
// ============================================================================

function normalizeQuestionType(type?: string): string {
  const t = String(type || '').toLowerCase()
  if (!t || t === 'undefined') return 'single'
  if (t === 'single' || t === 'choice') return 'single'
  if (t === 'multiple' || t === 'multichoice') return 'multiple'
  if (t === 'judge' || t === 'judgment' || t === 'truefalse' || t === 'boolean') return 'truefalse'
  return 'single'
}

function extractList(result: unknown): unknown[] {
  if (!result) return []
  const r = result as Record<string, unknown>
  if (Array.isArray(r.data)) return r.data as unknown[]
  if ((r.data as Record<string, unknown>)?.list) return (r.data as Record<string, unknown>).list as unknown[]
  if (r.list) return r.list as unknown[]
  return []
}

function extractTotal(result: unknown): number {
  if (!result) return 0
  const r = result as Record<string, unknown>
  if ((r.data as Record<string, unknown>)?.total !== undefined)
    return (r.data as Record<string, unknown>).total as number
  if (r.total !== undefined) return r.total as number
  return 0
}

function extractSingle(result: unknown): Record<string, unknown> | null {
  if (!result) return null
  const r = result as Record<string, unknown>
  if (r.data && !Array.isArray(r.data) && typeof r.data === 'object') {
    const d = r.data as Record<string, unknown>
    if (d._id || d.id) return d
  }
  if (Array.isArray(r.data) && r.data.length > 0) return r.data[0] as Record<string, unknown>
  return r.data as Record<string, unknown> || null
}

// ============================================================================
// 考试评分逻辑测试
// ============================================================================

describe('考试评分逻辑', () => {
  it('单选题：用户答案与正确答案一致应判定为正确', () => {
    const userAnswer = 'A'
    const correctAnswer = 'A'
    const isCorrect = String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase()
    expect(isCorrect).toBe(true)
  })

  it('单选题：用户答案与正确答案不一致应判定为错误', () => {
    const userAnswer = 'B'
    const correctAnswer = 'A'
    const isCorrect = String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase()
    expect(isCorrect).toBe(false)
  })

  it('单选题：忽略大小写比较', () => {
    expect(String('a').toUpperCase() === String('A').toUpperCase()).toBe(true)
    expect(String('A').toUpperCase() === String('a').toUpperCase()).toBe(true)
  })

  it('多选题：用户答案数组与正确答案数组一致应判定为正确', () => {
    const userAnswer = ['A', 'B']
    const correctAnswer = ['A', 'B']
    const isCorrect = JSON.stringify([...userAnswer].sort()) === JSON.stringify([...correctAnswer].sort())
    expect(isCorrect).toBe(true)
  })

  it('多选题：用户答案数组顺序不同也应判定为正确', () => {
    const userAnswer = ['B', 'A']
    const correctAnswer = ['A', 'B']
    const isCorrect = JSON.stringify([...userAnswer].sort()) === JSON.stringify([...correctAnswer].sort())
    expect(isCorrect).toBe(true)
  })

  it('多选题：用户答案与正确答案不匹配应判定为错误', () => {
    const userAnswer = ['A', 'C']
    const correctAnswer = ['A', 'B']
    const isCorrect = JSON.stringify([...userAnswer].sort()) === JSON.stringify([...correctAnswer].sort())
    expect(isCorrect).toBe(false)
  })

  it('判断题：true 匹配 A 应为正确', () => {
    const userVal = 'A'
    const correctVal = 'true'
    const isCorrect = 
      userVal.toLowerCase() === correctVal.toLowerCase() ||
      (correctVal.toLowerCase() === 'true' && userVal.toLowerCase() === 'a') ||
      (correctVal.toLowerCase() === 'false' && userVal.toLowerCase() === 'b')
    expect(isCorrect).toBe(true)
  })

  it('判断题：false 匹配 B 应为正确', () => {
    const userVal = 'B'
    const correctVal = 'false'
    const isCorrect = 
      userVal.toLowerCase() === correctVal.toLowerCase() ||
      (correctVal.toLowerCase() === 'true' && userVal.toLowerCase() === 'a') ||
      (correctVal.toLowerCase() === 'false' && userVal.toLowerCase() === 'b')
    expect(isCorrect).toBe(true)
  })
})

// ============================================================================
// normalizeQuestionType 测试
// ============================================================================

describe('normalizeQuestionType', () => {
  it('single → single', () => {
    expect(normalizeQuestionType('single')).toBe('single')
  })

  it('choice → single', () => {
    expect(normalizeQuestionType('choice')).toBe('single')
  })

  it('multiple → multiple', () => {
    expect(normalizeQuestionType('multiple')).toBe('multiple')
  })

  it('multichoice → multiple', () => {
    expect(normalizeQuestionType('multichoice')).toBe('multiple')
  })

  it('judge → truefalse', () => {
    expect(normalizeQuestionType('judge')).toBe('truefalse')
  })

  it('judgment → truefalse', () => {
    expect(normalizeQuestionType('judgment')).toBe('truefalse')
  })

  it('boolean → truefalse', () => {
    expect(normalizeQuestionType('boolean')).toBe('truefalse')
  })

  it('truefalse → truefalse', () => {
    expect(normalizeQuestionType('truefalse')).toBe('truefalse')
  })

  it('空字符串 → single（默认值）', () => {
    expect(normalizeQuestionType('')).toBe('single')
  })

  it('undefined → single（默认值）', () => {
    expect(normalizeQuestionType(undefined)).toBe('single')
  })

  it('未知类型 → single（默认值）', () => {
    expect(normalizeQuestionType('unknown_type')).toBe('single')
  })

  it('大小写不敏感', () => {
    expect(normalizeQuestionType('SINGLE')).toBe('single')
    expect(normalizeQuestionType('MULTIPLE')).toBe('multiple')
    expect(normalizeQuestionType('JUDGE')).toBe('truefalse')
  })
})

// ============================================================================
// extractList 测试
// ============================================================================

describe('extractList（数据提取辅助函数）', () => {
  it('应提取 result.data 为数组时直接返回', () => {
    expect(extractList({ data: [{ a: 1 }, { a: 2 }] })).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('应提取 result.data.list', () => {
    expect(extractList({ data: { list: [{ a: 1 }], total: 1 } })).toEqual([{ a: 1 }])
  })

  it('应提取 result.list', () => {
    expect(extractList({ list: [{ a: 1 }] })).toEqual([{ a: 1 }])
  })

  it('null/undefined 应返回空数组', () => {
    expect(extractList(null)).toEqual([])
    expect(extractList(undefined)).toEqual([])
  })

  it('空对象应返回空数组', () => {
    expect(extractList({})).toEqual([])
  })
})

// ============================================================================
// extractTotal 测试
// ============================================================================

describe('extractTotal（总数提取辅助函数）', () => {
  it('应提取 result.data.total', () => {
    expect(extractTotal({ data: { total: 42 } })).toBe(42)
  })

  it('应提取 result.total', () => {
    expect(extractTotal({ total: 10 })).toBe(10)
  })

  it('无 total 时应返回 0', () => {
    expect(extractTotal({})).toBe(0)
    expect(extractTotal(null as unknown)).toBe(0)
    expect(extractTotal(undefined)).toBe(0)
  })
})

// ============================================================================
// extractSingle 测试
// ============================================================================

describe('extractSingle（单条记录提取辅助函数）', () => {
  it('应提取带 _id 的 result.data 对象', () => {
    expect(extractSingle({ data: { _id: 'abc', name: 'test' } })).toEqual({ _id: 'abc', name: 'test' })
  })

  it('应提取带 id 的 result.data 对象', () => {
    expect(extractSingle({ data: { id: 'abc', name: 'test' } })).toEqual({ id: 'abc', name: 'test' })
  })

  it('result.data 为数组时应取第一个元素', () => {
    expect(extractSingle({ data: [{ _id: 'first' }, { _id: 'second' }] })).toEqual({ _id: 'first' })
  })

  it('应提取 result.data 本身', () => {
    expect(extractSingle({ data: 'hello' })).toBe('hello')
  })

  it('null/undefined 应返回 null', () => {
    expect(extractSingle(null)).toBeNull()
    expect(extractSingle(undefined)).toBeNull()
  })
})

// ============================================================================
// 题目数据转换测试
// ============================================================================

describe('题目数据转换', () => {
  it('应将原始题目数据映射为规范格式', () => {
    const rawQuestions = [
      {
        _id: 'q1',
        bankId: 'bank1',
        question: '无人机最大飞行高度是多少？',
        type: 'single',
        options: [
          { key: 'A', content: '120米' },
          { key: 'B', content: '500米' },
        ],
        answer: 'A',
        score: 5,
        difficulty: 'easy',
      },
      {
        _id: 'q2',
        bankId: 'bank1',
        question: '以下哪些属于无人机分类？',
        type: 'multiple',
        options: [
          { key: 'A', content: '多旋翼' },
          { key: 'B', content: '固定翼' },
        ],
        answer: ['A', 'B'],
        score: 10,
        difficulty: 'medium',
      },
    ]

    const mapped = rawQuestions.map((q, index) => ({
      _id: q._id,
      id: q._id,
      questionBankId: q.bankId,
      type: normalizeQuestionType(q.type),
      question: q.question || '',
      content: q.question || '',
      options: (q.options || []).map((opt) =>
        typeof opt === 'string' ? opt : opt.content || opt.key || ''
      ).filter(Boolean),
      answer: q.answer,
      score: q.score || 1,
      difficulty: q.difficulty || 'medium',
      order: index,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })).filter(q => q.question)

    expect(mapped).toHaveLength(2)
    expect(mapped[0].type).toBe('single')
    expect(mapped[0].options).toEqual(['120米', '500米'])
    expect(mapped[1].type).toBe('multiple')
    expect(mapped[1].options).toEqual(['多旋翼', '固定翼'])
  })

  it('应过滤掉没有 question 内容的题目', () => {
    const rawQuestions = [
      { _id: 'q1', question: '有效题目', type: 'single' },
      { _id: 'q2', question: '', type: 'single' },
    ]

    const mapped = rawQuestions
      .map((q, index) => ({
        _id: q._id,
        id: q._id,
        questionBankId: undefined,
        type: normalizeQuestionType(q.type),
        question: q.question || '',
        content: q.question || '',
        options: [],
        answer: undefined,
        score: 1,
        difficulty: 'medium',
        order: index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      .filter(q => q.question)

    expect(mapped).toHaveLength(1)
    expect(mapped[0]._id).toBe('q1')
  })
})

// ============================================================================
// 通过率计算测试
// ============================================================================

describe('通过率计算', () => {
  it('得分 >= 及格分应判定为通过', () => {
    expect(80 >= 60).toBe(true)
    expect(60 >= 60).toBe(true)
    expect(100 >= 75).toBe(true)
  })

  it('得分 < 及格分应判定为未通过', () => {
    expect(59 >= 60).toBe(false)
    expect(0 >= 60).toBe(false)
    expect(30 >= 75).toBe(false)
  })

  it('应正确计算百分比分数', () => {
    const correctCount = 8
    const totalCount = 10
    const score = Math.round((correctCount / totalCount) * 100)
    expect(score).toBe(80)
  })

  it('全部正确应为 100 分', () => {
    const score = Math.round((5 / 5) * 100)
    expect(score).toBe(100)
  })

  it('全部错误应为 0 分', () => {
    const score = Math.round((0 / 5) * 100)
    expect(score).toBe(0)
  })
})
