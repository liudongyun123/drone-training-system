/**
 * 数据库索引建议
 * 
 * 根据查询模式建议的数据库索引配置
 * 在 CloudBase 控制台或通过数据库管理工具创建这些索引
 */

export interface IndexRecommendation {
  collection: string
  indexes: Array<{
    fields: string[]
    type: 'single' | 'compound' | 'multikey'
    reason: string
    priority: 'high' | 'medium' | 'low'
  }>
}

// 高频查询索引建议
export const INDEX_RECOMMENDATIONS: IndexRecommendation[] = [
  // ========== 用户相关 ==========
  {
    collection: 'user_profiles',
    indexes: [
      {
        fields: ['openid'],
        type: 'single',
        reason: '微信登录时按openid查询用户',
        priority: 'high'
      },
      {
        fields: ['phone'],
        type: 'single',
        reason: '手机号快速查找用户',
        priority: 'high'
      },
      {
        fields: ['role', 'createdAt'],
        type: 'compound',
        reason: '按角色筛选用户并按创建时间排序',
        priority: 'medium'
      }
    ]
  },

  // ========== 课程相关 ==========
  {
    collection: 'courses',
    indexes: [
      {
        fields: ['status', 'category'],
        type: 'compound',
        reason: '筛选发布状态和分类的课程列表',
        priority: 'high'
      },
      {
        fields: ['teacherId'],
        type: 'single',
        reason: '按教师筛选其教授的课程',
        priority: 'high'
      },
      {
        fields: ['title'],
        type: 'multikey',
        reason: '课程标题模糊搜索',
        priority: 'medium'
      },
      {
        fields: ['studentCount', 'createdAt'],
        type: 'compound',
        reason: '按热门程度排序课程',
        priority: 'medium'
      }
    ]
  },

  // ========== 章节和课时 ==========
  {
    collection: 'chapters',
    indexes: [
      {
        fields: ['courseId', 'order'],
        type: 'compound',
        reason: '获取课程的章节列表（按顺序）',
        priority: 'high'
      }
    ]
  },
  {
    collection: 'lessons',
    indexes: [
      {
        fields: ['courseId', 'chapterId', 'order'],
        type: 'compound',
        reason: '获取章节的课时列表（按顺序）',
        priority: 'high'
      }
    ]
  },

  // ========== 订单相关 ==========
  {
    collection: 'orders',
    indexes: [
      {
        fields: ['userId', 'createdAt'],
        type: 'compound',
        reason: '获取用户的订单列表（按时间倒序）',
        priority: 'high'
      },
      {
        fields: ['status', 'createdAt'],
        type: 'compound',
        reason: '按状态筛选订单',
        priority: 'high'
      },
      {
        fields: ['orderNo'],
        type: 'single',
        reason: '订单号精确查询',
        priority: 'high'
      }
    ]
  },

  // ========== 报名相关 ==========
  {
    collection: 'enrollments',
    indexes: [
      {
        fields: ['userId', 'status'],
        type: 'compound',
        reason: '获取用户的所有报名记录',
        priority: 'high'
      },
      {
        fields: ['courseId', 'userId'],
        type: 'compound',
        reason: '检查用户是否已报名某课程',
        priority: 'high'
      }
    ]
  },

  // ========== 学习进度 ==========
  {
    collection: 'learning_progress',
    indexes: [
      {
        fields: ['userId', 'courseId'],
        type: 'compound',
        reason: '获取用户在某课程的学习进度',
        priority: 'high'
      }
    ]
  },

  // ========== 教师相关 ==========
  {
    collection: 'teacher_profiles',
    indexes: [
      {
        fields: ['userId'],
        type: 'single',
        reason: '通过用户ID查找教师信息',
        priority: 'high'
      },
      {
        fields: ['status', 'rating'],
        type: 'compound',
        reason: '筛选优秀教师',
        priority: 'medium'
      }
    ]
  },

  // ========== 排课相关 ==========
  {
    collection: 'schedules',
    indexes: [
      {
        fields: ['courseId', 'date'],
        type: 'compound',
        reason: '获取课程的排课计划',
        priority: 'high'
      },
      {
        fields: ['teacherId', 'date'],
        type: 'compound',
        reason: '获取教师的排课安排',
        priority: 'high'
      },
      {
        fields: ['date', 'status'],
        type: 'compound',
        reason: '按日期筛选排课',
        priority: 'medium'
      }
    ]
  },

  // ========== 出勤相关 ==========
  {
    collection: 'attendance',
    indexes: [
      {
        fields: ['scheduleId', 'userId'],
        type: 'compound',
        reason: '检查用户在某课程的出勤记录',
        priority: 'high'
      },
      {
        fields: ['userId', 'date'],
        type: 'compound',
        reason: '获取用户某日期的出勤记录',
        priority: 'medium'
      }
    ]
  },

  // ========== 考试相关 ==========
  {
    collection: 'exams',
    indexes: [
      {
        fields: ['courseId', 'status'],
        type: 'compound',
        reason: '获取课程的考试列表',
        priority: 'high'
      }
    ]
  },
  {
    collection: 'exam_attempts',
    indexes: [
      {
        fields: ['userId', 'examId', 'submitTime'],
        type: 'compound',
        reason: '获取用户的考试记录',
        priority: 'high'
      }
    ]
  },

  // ========== 题库相关 ==========
  {
    collection: 'question_banks',
    indexes: [
      {
        fields: ['courseId', 'status'],
        type: 'compound',
        reason: '获取课程关联的题库',
        priority: 'high'
      }
    ]
  },
  {
    collection: 'bank_questions',
    indexes: [
      {
        fields: ['bankId', 'createdAt'],
        type: 'compound',
        reason: '获取题库的题目列表',
        priority: 'high'
      },
      {
        fields: ['bankId', 'type'],
        type: 'compound',
        reason: '按类型筛选题目',
        priority: 'medium'
      }
    ]
  },

  // ========== 优惠券相关 ==========
  {
    collection: 'coupons',
    indexes: [
      {
        fields: ['code'],
        type: 'single',
        reason: '按券码精确查找',
        priority: 'high'
      },
      {
        fields: ['userId', 'status'],
        type: 'compound',
        reason: '获取用户的优惠券',
        priority: 'high'
      }
    ]
  },

  // ========== 收藏和错题 ==========
  {
    collection: 'favorite_questions',
    indexes: [
      {
        fields: ['userId', 'questionId'],
        type: 'compound',
        reason: '检查题目是否已收藏（唯一索引）',
        priority: 'high'
      }
    ]
  },
  {
    collection: 'wrong_questions',
    indexes: [
      {
        fields: ['userId', 'createdAt'],
        type: 'compound',
        reason: '获取用户错题本',
        priority: 'high'
      }
    ]
  },

  // ========== 练习记录 ==========
  {
    collection: 'practice_records',
    indexes: [
      {
        fields: ['userId', 'createdAt'],
        type: 'compound',
        reason: '获取用户练习历史',
        priority: 'high'
      }
    ]
  },

  // ========== 轮播图 ==========
  {
    collection: 'banners',
    indexes: [
      {
        fields: ['status', 'order'],
        type: 'compound',
        reason: '获取启用的轮播图（按顺序）',
        priority: 'high'
      }
    ]
  },

  // ========== 页面配置 ==========
  {
    collection: 'page_configs',
    indexes: [
      {
        fields: ['key'],
        type: 'single',
        reason: '按key精确查找配置',
        priority: 'high'
      }
    ]
  },

  // ========== 公告通知 ==========
  {
    collection: 'notices',
    indexes: [
      {
        fields: ['status', 'priority', 'createdAt'],
        type: 'compound',
        reason: '获取已发布公告（按优先级和时间排序）',
        priority: 'high'
      },
      {
        fields: ['target', 'status'],
        type: 'compound',
        reason: '按目标用户筛选公告',
        priority: 'medium'
      },
      {
        fields: ['type'],
        type: 'single',
        reason: '按类型筛选公告',
        priority: 'low'
      }
    ]
  },

  // ========== 课程评论 ==========
  {
    collection: 'comments',
    indexes: [
      {
        fields: ['courseId', 'status', 'createdAt'],
        type: 'compound',
        reason: '获取课程评论列表（审核通过，按时间排序）',
        priority: 'high'
      },
      {
        fields: ['userId', 'createdAt'],
        type: 'compound',
        reason: '获取用户的所有评论',
        priority: 'high'
      },
      {
        fields: ['status'],
        type: 'single',
        reason: '筛选待审核评论',
        priority: 'medium'
      }
    ]
  },

  // ========== 学习路径 ==========
  {
    collection: 'learning_paths',
    indexes: [
      {
        fields: ['status', 'category'],
        type: 'compound',
        reason: '获取可用的学习路径（按分类）',
        priority: 'high'
      },
      {
        fields: ['difficulty'],
        type: 'single',
        reason: '按难度筛选学习路径',
        priority: 'low'
      }
    ]
  },

  // ========== 学习进度 ==========
  {
    collection: 'learning_progress',
    indexes: [
      {
        fields: ['userId', 'pathId'],
        type: 'compound',
        reason: '获取用户特定路径的学习进度',
        priority: 'high'
      },
      {
        fields: ['userId', 'progress'],
        type: 'compound',
        reason: '获取用户的所有学习进度',
        priority: 'medium'
      }
    ]
  }
]

/**
 * 生成创建索引的SQL（用于MySQL）
 * 或索引定义（用于NoSQL）
 */
export function generateIndexDefinitions(): string {
  const definitions: string[] = []

  for (const rec of INDEX_RECOMMENDATIONS) {
    definitions.push(`\n// ${rec.collection}`)
    
    for (const idx of rec.indexes) {
      const fields = idx.fields.join('_')
      const priority = idx.priority === 'high' ? '🔴' : idx.priority === 'medium' ? '🟡' : '🟢'
      
      definitions.push(
        `// ${priority} ${idx.type} index: ${idx.fields.join(', ')}`,
        `// 原因: ${idx.reason}`,
        `{ fields: ${JSON.stringify(idx.fields)}, unique: false }`,
        ''
      )
    }
  }

  return definitions.join('\n')
}

/**
 * 获取高优先级索引（用于快速实施）
 */
export function getHighPriorityIndexes(): IndexRecommendation[] {
  return INDEX_RECOMMENDATIONS
    .map(rec => ({
      ...rec,
      indexes: rec.indexes.filter(idx => idx.priority === 'high')
    }))
    .filter(rec => rec.indexes.length > 0)
}

// 导出为Markdown格式的报告
export function generateIndexReport(): string {
  let report = '# 数据库索引建议报告\n\n'
  report += '> 生成时间: ' + new Date().toISOString() + '\n\n'
  report += '## 索引统计\n\n'

  const totalIndexes = INDEX_RECOMMENDATIONS.reduce((sum, r) => sum + r.indexes.length, 0)
  const highPriority = INDEX_RECOMMENDATIONS.reduce(
    (sum, r) => sum + r.indexes.filter(i => i.priority === 'high').length, 
    0
  )

  report += `- 集合数量: ${INDEX_RECOMMENDATIONS.length}\n`
  report += `- 索引总数: ${totalIndexes}\n`
  report += `- 高优先级: ${highPriority}\n\n`

  report += '## 实施建议\n\n'
  report += '1. **高优先级索引**应立即创建，可显著提升查询性能\n'
  report += '2. **中优先级索引**在系统稳定后逐步添加\n'
  report += '3. **低优先级索引**根据实际性能监控决定是否添加\n\n'
  report += '---\n\n'

  for (const rec of INDEX_RECOMMENDATIONS) {
    if (rec.indexes.length === 0) continue

    report += `## ${rec.collection}\n\n`
    
    for (const idx of rec.indexes) {
      const priorityIcon = idx.priority === 'high' ? '🔴' : idx.priority === 'medium' ? '🟡' : '🟢'
      report += `### ${priorityIcon} ${idx.type} 索引\n`
      report += `- **字段**: \`${idx.fields.join(', ')}\`\n`
      report += `- **类型**: ${idx.type}\n`
      report += `- **原因**: ${idx.reason}\n\n`
    }
  }

  return report
}
