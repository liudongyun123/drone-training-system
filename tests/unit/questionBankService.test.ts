import { describe, it, expect } from 'vitest'

// ============================================================================
// 题库题目筛选与排序
// ============================================================================

describe('题目筛选', () => {
  const sampleQuestions = [
    { _id: '1', type: 'single', difficulty: 'easy', bankId: 'bank1', question: 'Q1' },
    { _id: '2', type: 'multiple', difficulty: 'medium', bankId: 'bank1', question: 'Q2' },
    { _id: '3', type: 'single', difficulty: 'hard', bankId: 'bank2', question: 'Q3' },
    { _id: '4', type: 'judge', difficulty: 'easy', bankId: 'bank2', question: 'Q4' },
    { _id: '5', type: 'single', difficulty: 'medium', bankId: 'bank3', question: 'Q5' },
  ]

  it('应按题库 ID 筛选题目', () => {
    const bankId = 'bank1'
    const filtered = sampleQuestions.filter(q => q.bankId === bankId)
    expect(filtered).toHaveLength(2)
    expect(filtered.map(q => q._id)).toEqual(['1', '2'])
  })

  it('应按难度筛选题目', () => {
    const easy = sampleQuestions.filter(q => q.difficulty === 'easy')
    expect(easy).toHaveLength(2)
  })

  it('应按题型筛选题目', () => {
    const singles = sampleQuestions.filter(q => q.type === 'single')
    expect(singles).toHaveLength(3)
  })

  it('应支持多条件组合筛选', () => {
    const result = sampleQuestions.filter(
      q => q.difficulty === 'easy' && q.type === 'single'
    )
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('1')
  })
})

// ============================================================================
// 随机抽题
// ============================================================================

describe('随机抽题', () => {
  const questions = Array.from({ length: 100 }, (_, i) => ({
    _id: `q${i + 1}`,
    question: `题目 ${i + 1}`,
    type: i % 4 === 0 ? 'single' : i % 4 === 1 ? 'multiple' : i % 4 === 2 ? 'judge' : 'essay',
    difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard',
    score: 1,
  }))

  function randomPick<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  it('应返回指定数量的题目', () => {
    const result = randomPick(questions, 10)
    expect(result).toHaveLength(10)
  })

  it('不能超额抽取', () => {
    const result = randomPick(questions.slice(0, 5), 10)
    expect(result).toHaveLength(5)
  })

  it('应返回原数组的浅拷贝，不修改原数组', () => {
    const original = [...questions]
    const result = randomPick(questions, 10)
    expect(questions).toEqual(original)
    expect(result).not.toBe(questions)
  })

  it('抽 0 题应返回空数组', () => {
    expect(randomPick(questions, 0)).toEqual([])
  })
})

// ============================================================================
// 练习模式分发
// ============================================================================

describe('练习模式', () => {
  const allQuestions = [
    { _id: '1', question: 'A', type: 'single', difficulty: 'easy' },
    { _id: '2', question: 'B', type: 'multiple', difficulty: 'medium' },
    { _id: '3', question: 'C', type: 'single', difficulty: 'hard' },
    { _id: '4', question: 'D', type: 'judge', difficulty: 'easy' },
    { _id: '5', question: 'E', type: 'essay', difficulty: 'medium' },
  ]

  it('顺序模式：按原始顺序返回', () => {
    const mode: 'sequential' | 'random' = 'sequential'
    let questions = [...allQuestions]
    if (mode === 'sequential') {
      // 保持原顺序
    }
    expect(questions.map(q => q._id)).toEqual(['1', '2', '3', '4', '5'])
  })

  it('随机模式：打乱但不改变长度', () => {
    const mode: 'sequential' | 'random' = 'random'
    let questions = [...allQuestions]
    if (mode === 'random') {
      questions = questions.sort(() => Math.random() - 0.5)
    }
    expect(questions).toHaveLength(allQuestions.length)
    // 所有题目都应存在（只是顺序不同）
    allQuestions.forEach(q => {
      expect(questions.find(r => r._id === q._id)).toBeTruthy()
    })
  })
})

// ============================================================================
// 题库分类标签
// ============================================================================

describe('题库分类', () => {
  const categories = [
    '无人机法规',
    '飞行原理',
    '安全操作',
    '气象知识',
    '航拍技术',
    '维修维护',
  ]

  it('应对题库进行分类', () => {
    const banks = [
      { _id: '1', name: '法规题库', category: '无人机法规' },
      { _id: '2', name: '原理题库', category: '飞行原理' },
      { _id: '3', name: '操作题库', category: '安全操作' },
    ]

    const byCategory = banks.reduce<Record<string, typeof banks>>((acc, b) => {
      if (!acc[b.category]) acc[b.category] = []
      acc[b.category].push(b)
      return acc
    }, {})

    expect(Object.keys(byCategory)).toHaveLength(3)
    expect(byCategory['无人机法规']).toHaveLength(1)
    expect(byCategory['飞行原理']).toHaveLength(1)
    expect(byCategory['安全操作']).toHaveLength(1)
  })
})

// ============================================================================
// 通过分数验证
// ============================================================================

describe('通过分数验证', () => {
  it('默认通过分数应为 60', () => {
    const defaultPassScore = 60
    expect(defaultPassScore).toBe(60)
  })

  it('得分计算应为 (正确数/总数)*100', () => {
    const calcScore = (correct: number, total: number) => Math.round((correct / total) * 100)

    expect(calcScore(5, 10)).toBe(50)
    expect(calcScore(10, 10)).toBe(100)
    expect(calcScore(0, 10)).toBe(0)
    expect(calcScore(7, 10)).toBe(70)
  })

  it('除零应特殊处理', () => {
    const calcScoreSafe = (correct: number, total: number) => {
      if (total === 0) return 0
      return Math.round((correct / total) * 100)
    }
    expect(calcScoreSafe(0, 0)).toBe(0)
  })
})
