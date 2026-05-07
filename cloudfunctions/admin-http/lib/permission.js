/**
 * 权限控制模块 - 符合生产规范的 RBAC 权限系统
 */

// ============================================
// 角色定义
// ============================================

const ROLES = {
  SUPER_ADMIN: 'super_admin',      // 超级管理员 - 所有权限
  ADMIN: 'admin',                   // 管理员 - 大部分管理权限
  TEACHER: 'teacher',               // 教师 - 只能操作自己的数据
  STUDENT: 'student',               // 学员 - 只能操作自己的数据
  GUEST: 'guest'                    // 访客 - 只读权限
}

// ============================================
// 集合白名单 - 定义允许操作的集合
// ============================================

const ALLOWED_COLLECTIONS = {
  // 公开只读集合（所有人可查询）
  PUBLIC_READ: [
    'courses',           // 课程公开信息
    'teachers',          // 教师公开信息
    'announcements',     // 公告
    'question_banks',    // 题库
  ],
  
  // 管理员可写集合
  ADMIN_WRITE: [
    'courses',           // 课程管理
    'course_schedules',  // 排课管理
    'teachers',          // 教师管理
    'students',          // 学员管理
    'classes',           // 班级管理
    'announcements',     // 公告管理
    'system_settings',   // 系统设置
  ],
  
  // 教师可写集合
  TEACHER_WRITE: [
    'course_schedules',  // 排课（只能操作自己的课程）
    'attendance',       // 考勤记录
    'grades',           // 成绩记录
  ],
  
  // 学员可写集合
  STUDENT_WRITE: [
    'enrollments',      // 报名（自己的）
    'transfer_requests', // 调课申请（自己的）
    'feedback',         // 反馈
  ],
  
  // 敏感集合 - 只有超级管理员可操作
  SENSITIVE: [
    'admins',            // 管理员表
    'roles',             // 角色表
    'permissions',       // 权限表
    'audit_logs',        // 审计日志
    'system_config',     // 系统配置
  ]
}

// ============================================
// 操作权限矩阵
// ============================================

const PERMISSION_MATRIX = {
  // 基础 CRUD 操作
  'list': {
    [ROLES.SUPER_ADMIN]: ALLOWED_COLLECTIONS.PUBLIC_READ.concat(ALLOWED_COLLECTIONS.ADMIN_WRITE, ALLOWED_COLLECTIONS.SENSITIVE),
    [ROLES.ADMIN]: ALLOWED_COLLECTIONS.PUBLIC_READ.concat(ALLOWED_COLLECTIONS.ADMIN_WRITE),
    [ROLES.TEACHER]: ALLOWED_COLLECTIONS.PUBLIC_READ.concat(ALLOWED_COLLECTIONS.TEACHER_WRITE),
    [ROLES.STUDENT]: ALLOWED_COLLECTIONS.PUBLIC_READ.concat(ALLOWED_COLLECTIONS.STUDENT_WRITE),
    [ROLES.GUEST]: ALLOWED_COLLECTIONS.PUBLIC_READ
  },
  
  'get': {
    [ROLES.SUPER_ADMIN]: ALLOWED_COLLECTIONS.PUBLIC_READ.concat(ALLOWED_COLLECTIONS.ADMIN_WRITE, ALLOWED_COLLECTIONS.SENSITIVE),
    [ROLES.ADMIN]: ALLOWED_COLLECTIONS.PUBLIC_READ.concat(ALLOWED_COLLECTIONS.ADMIN_WRITE),
    [ROLES.TEACHER]: ALLOWED_COLLECTIONS.PUBLIC_READ.concat(ALLOWED_COLLECTIONS.TEACHER_WRITE),
    [ROLES.STUDENT]: ALLOWED_COLLECTIONS.PUBLIC_READ.concat(ALLOWED_COLLECTIONS.STUDENT_WRITE),
    [ROLES.GUEST]: ALLOWED_COLLECTIONS.PUBLIC_READ
  },
  
  'add': {
    [ROLES.SUPER_ADMIN]: ALLOWED_COLLECTIONS.ADMIN_WRITE.concat(ALLOWED_COLLECTIONS.SENSITIVE),
    [ROLES.ADMIN]: ALLOWED_COLLECTIONS.ADMIN_WRITE,
    [ROLES.TEACHER]: ALLOWED_COLLECTIONS.TEACHER_WRITE,
    [ROLES.STUDENT]: ALLOWED_COLLECTIONS.STUDENT_WRITE,
    [ROLES.GUEST]: []
  },
  
  'update': {
    [ROLES.SUPER_ADMIN]: ALLOWED_COLLECTIONS.ADMIN_WRITE.concat(ALLOWED_COLLECTIONS.SENSITIVE),
    [ROLES.ADMIN]: ALLOWED_COLLECTIONS.ADMIN_WRITE,
    [ROLES.TEACHER]: ALLOWED_COLLECTIONS.TEACHER_WRITE,
    [ROLES.STUDENT]: ALLOWED_COLLECTIONS.STUDENT_WRITE,
    [ROLES.GUEST]: []
  },
  
  'delete': {
    [ROLES.SUPER_ADMIN]: ALLOWED_COLLECTIONS.ADMIN_WRITE.concat(ALLOWED_COLLECTIONS.SENSITIVE),
    [ROLES.ADMIN]: ['course_schedules', 'announcements'], // 管理员只能删除部分数据
    [ROLES.TEACHER]: [],
    [ROLES.STUDENT]: [],
    [ROLES.GUEST]: []
  },
  
  // 批量操作 - 更严格的权限控制
  'batchAdd': {
    [ROLES.SUPER_ADMIN]: ALLOWED_COLLECTIONS.ADMIN_WRITE,
    [ROLES.ADMIN]: ['courses', 'teachers', 'students', 'course_schedules'],
    [ROLES.TEACHER]: [],
    [ROLES.STUDENT]: [],
    [ROLES.GUEST]: []
  },
  
  'batchDelete': {
    [ROLES.SUPER_ADMIN]: ALLOWED_COLLECTIONS.ADMIN_WRITE,
    [ROLES.ADMIN]: [], // 管理员不允许批量删除
    [ROLES.TEACHER]: [],
    [ROLES.STUDENT]: [],
    [ROLES.GUEST]: []
  },
  
  // 敏感操作
  'fixCourseRelations': {
    [ROLES.SUPER_ADMIN]: ['courses', 'course_schedules', 'enrollments', 'orders'],
    [ROLES.ADMIN]: [],
    [ROLES.TEACHER]: [],
    [ROLES.STUDENT]: [],
    [ROLES.GUEST]: []
  },
  
  'migrateMemberRelations': {
    [ROLES.SUPER_ADMIN]: ['members', 'class_members', 'enrollments', 'orders'],
    [ROLES.ADMIN]: [],
    [ROLES.TEACHER]: [],
    [ROLES.STUDENT]: [],
    [ROLES.GUEST]: []
  }
}

// ============================================
// 权限检查类
// ============================================

class Permission {
  /**
   * 检查用户是否有权限执行操作
   * @param {string} role - 用户角色
   * @param {string} action - 操作类型
   * @param {string} collection - 集合名称
   */
  static check(role, action, collection) {
    // 超级管理员拥有所有权限
    if (role === ROLES.SUPER_ADMIN) {
      return { allowed: true, role }
    }
    
    // 获取该操作允许的集合列表
    const allowedCollections = PERMISSION_MATRIX[action]
    
    if (!allowedCollections) {
      return { 
        allowed: false, 
        role,
        error: `未知的操作类型: ${action}` 
      }
    }
    
    // 获取该角色允许的集合
    const roleCollections = allowedCollections[role] || []
    
    // 检查是否在白名单中
    if (roleCollections.includes(collection)) {
      return { allowed: true, role }
    }
    
    return {
      allowed: false,
      role,
      error: `权限不足: ${role} 角色不允许对 ${collection} 执行 ${action} 操作`
    }
  }

  /**
   * 检查是否是受保护的集合
   * @param {string} collection - 集合名称
   */
  static isSensitive(collection) {
    return ALLOWED_COLLECTIONS.SENSITIVE.includes(collection)
  }

  /**
   * 获取角色可读的集合列表
   * @param {string} role - 角色
   */
  static getReadableCollections(role) {
    const collections = new Set()
    
    // 公开只读集合
    ALLOWED_COLLECTIONS.PUBLIC_READ.forEach(c => collections.add(c))
    
    // 根据角色添加可写集合的读权限
    const writeCollections = [
      { role: ROLES.SUPER_ADMIN, collections: ALLOWED_COLLECTIONS.ADMIN_WRITE.concat(ALLOWED_COLLECTIONS.SENSITIVE) },
      { role: ROLES.ADMIN, collections: ALLOWED_COLLECTIONS.ADMIN_WRITE },
      { role: ROLES.TEACHER, collections: ALLOWED_COLLECTIONS.TEACHER_WRITE },
      { role: ROLES.STUDENT, collections: ALLOWED_COLLECTIONS.STUDENT_WRITE }
    ]
    
    for (const { role: r, collections: c } of writeCollections) {
      if (role === r || role === ROLES.SUPER_ADMIN) {
        c.forEach(col => collections.add(col))
      }
    }
    
    return Array.from(collections)
  }

  /**
   * 根据角色生成数据过滤条件
   * @param {string} role - 角色
   * @param {string} userId - 用户ID
   * @param {string} collection - 集合名称
   */
  static getDataFilter(role, userId, collection) {
    // 管理员和超级管理员可以访问所有数据
    if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) {
      return {}
    }
    
    // 教师：只能访问自己创建的排课
    if (role === ROLES.TEACHER) {
      if (collection === 'course_schedules') {
        return { teacherId: userId }
      }
      if (collection === 'attendance' || collection === 'grades') {
        return { teacherId: userId }
      }
    }
    
    // 学员：只能访问自己的数据
    if (role === ROLES.STUDENT) {
      if (collection === 'enrollments' || collection === 'orders' || collection === 'transfer_requests') {
        return { studentId: userId }
      }
      if (collection === 'feedback') {
        return { userId: userId }
      }
    }
    
    // 访客：只能访问公开数据
    return {}
  }

  /**
   * 获取角色信息
   * @param {object} authResult - 鉴权结果
   */
  static getRoleInfo(authResult) {
    if (!authResult || !authResult.user) {
      return {
        role: ROLES.GUEST,
        userId: null,
        permissions: []
      }
    }
    
    const { user, scope } = authResult
    
    // 超级管理员标识
    if (user.isSuperAdmin || user.role === 'super_admin' || user.uid === 'admin') {
      return {
        role: ROLES.SUPER_ADMIN,
        userId: user.uid || user.openid,
        permissions: ['*']
      }
    }
    
    // 普通管理员
    if (user.isAdmin || user.role === 'admin' || scope === 'admin') {
      return {
        role: ROLES.ADMIN,
        userId: user.uid || user.openid,
        permissions: Permission.getReadableCollections(ROLES.ADMIN)
      }
    }
    
    // 教师
    if (user.role === 'teacher' || scope === 'teacher') {
      return {
        role: ROLES.TEACHER,
        userId: user.uid || user.openid,
        permissions: Permission.getReadableCollections(ROLES.TEACHER)
      }
    }
    
    // 学员
    if (user.role === 'student' || scope === 'student' || user.uid) {
      return {
        role: ROLES.STUDENT,
        userId: user.uid || user.openid,
        permissions: Permission.getReadableCollections(ROLES.STUDENT)
      }
    }
    
    // 默认访客
    return {
      role: ROLES.GUEST,
      userId: null,
      permissions: Permission.getReadableCollections(ROLES.GUEST)
    }
  }
}

module.exports = {
  ROLES,
  ALLOWED_COLLECTIONS,
  PERMISSION_MATRIX,
  Permission
}
