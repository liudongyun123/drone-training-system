import { describe, it, expect } from 'vitest'

// ============================================================================
// 纯逻辑测试：从 authStore.ts 提取的核心认证逻辑
// ============================================================================

// ---------- 辅助类型与常量（与源码一致） ----------

type UserRole = 'anonymous' | 'visitor' | 'student' | 'teacher' | 'admin'
type Permission = string

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  anonymous: ['course:view'],
  visitor: ['course:view', 'exam:view', 'practice:view'],
  student: [
    'course:view', 'course:buy',
    'exam:view', 'exam:take',
    'practice:view', 'practice:do',
    'certificate:view',
    'profile:edit',
  ],
  teacher: [
    'course:view',
    'exam:view', 'exam:take',
    'practice:view', 'practice:do',
    'profile:edit',
    'admin:dashboard', 'admin:course', 'admin:exam', 'admin:student',
  ],
  admin: ['admin:all'],
}

interface User {
  id: string
  role: UserRole
  isAnonymous: boolean
  permissions: Permission[]
  loginType: 'anonymous' | 'wechat' | 'phone' | 'password'
  enrolledCourses?: string[]
}

// ---------- 纯函数实现（与源码逻辑一致） ----------

function isLoggedIn(user: User | null, isAuthenticated: boolean): boolean {
  return isAuthenticated && user !== null && !user.isAnonymous
}

function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return user.permissions.includes(permission)
}

function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return permissions.some(p => user.permissions.includes(p))
}

function hasRole(user: User | null, role: UserRole | UserRole[]): boolean {
  if (!user) return false
  if (Array.isArray(role)) return role.includes(user.role)
  return user.role === role
}

function hasCourseAccess(user: User | null, courseId: string): boolean {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'teacher') return true
  if (user.role === 'student' && user.enrolledCourses) {
    return user.enrolledCourses.includes(courseId)
  }
  return user.permissions.includes('course:view')
}

function canTakeExam(user: User | null): boolean {
  if (!user) return false
  return hasPermission(user, 'exam:take')
}

function canPracticeBank(user: User | null): boolean {
  if (!user) return false
  return hasPermission(user, 'practice:do')
}

function loginWithPasswordSuccess(username: string, password: string, customRole?: string): {
  success: boolean; user?: User
} {
  if (!username || !password) return { success: false }
  const role: UserRole = (customRole as UserRole) || 'student'
  return {
    success: true,
    user: {
      id: 'uid-123',
      role,
      isAnonymous: false,
      permissions: ROLE_PERMISSIONS[role],
      loginType: 'password',
    },
  }
}

function loginWithPhoneParams(phone: string, code: string): {
  valid: boolean; error?: string
} {
  if (!phone || !code) return { valid: false, error: '手机号和验证码不能为空' }
  if (!/^1\d{10}$/.test(phone)) return { valid: false, error: '手机号格式不正确' }
  if (code.length < 4) return { valid: false, error: '验证码长度不足' }
  return { valid: true }
}

function logoutState(): { user: null; isAuthenticated: boolean; isAdmin: boolean; loginError: null } {
  return { user: null, isAuthenticated: false, isAdmin: false, loginError: null }
}

function isTokenExpired(loginAt: string, maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): boolean {
  const loginTime = new Date(loginAt).getTime()
  return Date.now() - loginTime > maxAgeMs
}

// ============================================================================
// 测试
// ============================================================================

// ---------- loginWithPassword ----------

describe('loginWithPassword 账号密码登录', () => {
  it('成功登录返回用户信息', () => {
    const result = loginWithPasswordSuccess('admin@test.com', '123456')
    expect(result.success).toBe(true)
    expect(result.user).toBeDefined()
    expect(result.user!.loginType).toBe('password')
    expect(result.user!.isAnonymous).toBe(false)
  })

  it('默认角色为 student', () => {
    const result = loginWithPasswordSuccess('user@test.com', '123456')
    expect(result.success).toBe(true)
    expect(result.user!.role).toBe('student')
  })

  it('管理员角色应正确识别', () => {
    const result = loginWithPasswordSuccess('admin@test.com', '123456', 'admin')
    expect(result.success).toBe(true)
    expect(result.user!.role).toBe('admin')
    expect(result.user!.permissions).toEqual(['admin:all'])
  })

  it('用户名为空应登录失败', () => {
    const result = loginWithPasswordSuccess('', '123456')
    expect(result.success).toBe(false)
  })

  it('密码为空应登录失败', () => {
    const result = loginWithPasswordSuccess('admin@test.com', '')
    expect(result.success).toBe(false)
  })

  it('教师角色应包含管理权限', () => {
    const result = loginWithPasswordSuccess('teacher@test.com', '123456', 'teacher')
    expect(result.success).toBe(true)
    expect(result.user!.role).toBe('teacher')
    expect(result.user!.permissions).toContain('admin:dashboard')
    expect(result.user!.permissions).toContain('admin:course')
  })
})

// ---------- loginWithPhone 参数验证 ----------

describe('loginWithPhone 手机验证码参数验证', () => {
  it('合法手机号和验证码应通过验证', () => {
    const result = loginWithPhoneParams('13800138000', '1234')
    expect(result.valid).toBe(true)
  })

  it('手机号为空应拒绝', () => {
    const result = loginWithPhoneParams('', '1234')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('不能为空')
  })

  it('验证码为空应拒绝', () => {
    const result = loginWithPhoneParams('13800138000', '')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('不能为空')
  })

  it('手机号格式不正确应拒绝', () => {
    const result = loginWithPhoneParams('1234', '1234')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('格式不正确')
  })

  it('验证码长度不足应拒绝', () => {
    const result = loginWithPhoneParams('13800138000', '12')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('长度不足')
  })
})

// ---------- logout ----------

describe('logout 清除状态', () => {
  it('登出后用户应为 null', () => {
    const state = logoutState()
    expect(state.user).toBeNull()
  })

  it('登出后 isAuthenticated 应为 false', () => {
    const state = logoutState()
    expect(state.isAuthenticated).toBe(false)
  })

  it('登出后 isAdmin 应为 false', () => {
    const state = logoutState()
    expect(state.isAdmin).toBe(false)
  })

  it('登出后 loginError 应为 null', () => {
    const state = logoutState()
    expect(state.loginError).toBeNull()
  })
})

// ---------- Token 过期判断 ----------

describe('Token 过期判断', () => {
  it('刚登录的 token 未过期', () => {
    const loginAt = new Date().toISOString()
    expect(isTokenExpired(loginAt)).toBe(false)
  })

  it('8 天前的 token 已过期（默认 7 天）', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    expect(isTokenExpired(eightDaysAgo)).toBe(true)
  })

  it('6 天前的 token 未过期', () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    expect(isTokenExpired(sixDaysAgo)).toBe(false)
  })

  it('自定义过期时间应生效', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(isTokenExpired(oneHourAgo, 30 * 60 * 1000)).toBe(true)   // 30 分钟过期
    expect(isTokenExpired(oneHourAgo, 2 * 60 * 60 * 1000)).toBe(false) // 2 小时过期
  })

  it('恰好到期的边界情况', () => {
    const exactlyMaxAge = new Date(Date.now() - 7000).toISOString()
    expect(isTokenExpired(exactlyMaxAge, 7000)).toBe(false) // <= 未过期
    expect(isTokenExpired(exactlyMaxAge, 6999)).toBe(true)  // > 已过期
  })
})

// ---------- isAuthenticated / isLoggedIn 计算 ----------

describe('用户状态 isAuthenticated / isLoggedIn', () => {
  it('未登录用户 isLoggedIn 为 false', () => {
    expect(isLoggedIn(null, false)).toBe(false)
  })

  it('匿名用户已认证但 isLoggedIn 为 false', () => {
    const anonUser: User = {
      id: 'anon-1',
      role: 'anonymous',
      isAnonymous: true,
      permissions: ROLE_PERMISSIONS.anonymous,
      loginType: 'anonymous',
    }
    expect(isLoggedIn(anonUser, true)).toBe(false)
  })

  it('普通用户已认证且 isLoggedIn 为 true', () => {
    const student: User = {
      id: 'stu-1',
      role: 'student',
      isAnonymous: false,
      permissions: ROLE_PERMISSIONS.student,
      loginType: 'phone',
    }
    expect(isLoggedIn(student, true)).toBe(true)
  })

  it('isAuthenticated 为 false 时 isLoggedIn 为 false', () => {
    const student: User = {
      id: 'stu-1',
      role: 'student',
      isAnonymous: false,
      permissions: ROLE_PERMISSIONS.student,
      loginType: 'phone',
    }
    expect(isLoggedIn(student, false)).toBe(false)
  })

  it('管理员用户 isLoggedIn 为 true', () => {
    const admin: User = {
      id: 'admin-1',
      role: 'admin',
      isAnonymous: false,
      permissions: ROLE_PERMISSIONS.admin,
      loginType: 'password',
    }
    expect(isLoggedIn(admin, true)).toBe(true)
  })
})

// ---------- 权限检查 ----------

describe('权限检查 hasPermission / hasAnyPermission', () => {
  it('管理员拥有所有权限', () => {
    const admin: User = {
      id: 'admin-1', role: 'admin', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.admin, loginType: 'password',
    }
    expect(hasPermission(admin, 'course:view')).toBe(true)
    expect(hasPermission(admin, 'admin:system')).toBe(true)
    expect(hasPermission(admin, 'nonexistent:perm')).toBe(true)
  })

  it('学员拥有课程购买权限', () => {
    const student: User = {
      id: 'stu-1', role: 'student', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.student, loginType: 'phone',
    }
    expect(hasPermission(student, 'course:buy')).toBe(true)
  })

  it('学员没有后台管理权限', () => {
    const student: User = {
      id: 'stu-1', role: 'student', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.student, loginType: 'phone',
    }
    expect(hasPermission(student, 'admin:dashboard')).toBe(false)
  })

  it('匿名用户只有查看权限', () => {
    const anon: User = {
      id: 'anon-1', role: 'anonymous', isAnonymous: true,
      permissions: ROLE_PERMISSIONS.anonymous, loginType: 'anonymous',
    }
    expect(hasPermission(anon, 'course:view')).toBe(true)
    expect(hasPermission(anon, 'course:buy')).toBe(false)
    expect(hasPermission(anon, 'exam:take')).toBe(false)
  })

  it('hasAnyPermission 任一权限满足即可', () => {
    const visitor: User = {
      id: 'vis-1', role: 'visitor', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.visitor, loginType: 'wechat',
    }
    expect(hasAnyPermission(visitor, ['admin:dashboard', 'course:view'])).toBe(true)
    expect(hasAnyPermission(visitor, ['admin:dashboard', 'admin:course'])).toBe(false)
  })

  it('未登录用户没有任何权限', () => {
    expect(hasPermission(null, 'course:view')).toBe(false)
    expect(hasAnyPermission(null, ['course:view'])).toBe(false)
  })
})

// ---------- 角色检查 ----------

describe('角色检查 hasRole', () => {
  it('单角色匹配', () => {
    const student: User = {
      id: 'stu-1', role: 'student', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.student, loginType: 'phone',
    }
    expect(hasRole(student, 'student')).toBe(true)
    expect(hasRole(student, 'admin')).toBe(false)
  })

  it('多角色匹配', () => {
    const teacher: User = {
      id: 'tea-1', role: 'teacher', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.teacher, loginType: 'password',
    }
    expect(hasRole(teacher, ['admin', 'teacher'])).toBe(true)
    expect(hasRole(teacher, ['admin', 'student'])).toBe(false)
  })

  it('未登录用户无角色', () => {
    expect(hasRole(null, 'student')).toBe(false)
  })
})

// ---------- 课程访问权限 ----------

describe('课程访问权限 hasCourseAccess', () => {
  const enrolledCourseId = 'course-001'

  it('管理员可访问所有课程', () => {
    const admin: User = {
      id: 'admin-1', role: 'admin', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.admin, loginType: 'password',
    }
    expect(hasCourseAccess(admin, 'any-course')).toBe(true)
  })

  it('教师可访问所有课程', () => {
    const teacher: User = {
      id: 'tea-1', role: 'teacher', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.teacher, loginType: 'password',
    }
    expect(hasCourseAccess(teacher, 'any-course')).toBe(true)
  })

  it('学员可访问已报名课程', () => {
    const student: User = {
      id: 'stu-1', role: 'student', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.student, loginType: 'phone',
      enrolledCourses: [enrolledCourseId],
    }
    expect(hasCourseAccess(student, enrolledCourseId)).toBe(true)
  })

  it('学员不能访问未报名课程', () => {
    const student: User = {
      id: 'stu-1', role: 'student', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.student, loginType: 'phone',
      enrolledCourses: [enrolledCourseId],
    }
    expect(hasCourseAccess(student, 'course-999')).toBe(false)
  })

  it('未登录用户不能访问课程', () => {
    expect(hasCourseAccess(null, 'course-001')).toBe(false)
  })
})

// ---------- 考试与题库权限 ----------

describe('考试与题库权限', () => {
  it('学员可以参加考试', () => {
    const student: User = {
      id: 'stu-1', role: 'student', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.student, loginType: 'phone',
    }
    expect(canTakeExam(student)).toBe(true)
  })

  it('匿名用户不能参加考试', () => {
    const anon: User = {
      id: 'anon-1', role: 'anonymous', isAnonymous: true,
      permissions: ROLE_PERMISSIONS.anonymous, loginType: 'anonymous',
    }
    expect(canTakeExam(anon)).toBe(false)
  })

  it('学员可以练习题库', () => {
    const student: User = {
      id: 'stu-1', role: 'student', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.student, loginType: 'phone',
    }
    expect(canPracticeBank(student)).toBe(true)
  })

  it('访客不能练习题库', () => {
    const visitor: User = {
      id: 'vis-1', role: 'visitor', isAnonymous: false,
      permissions: ROLE_PERMISSIONS.visitor, loginType: 'wechat',
    }
    expect(canPracticeBank(visitor)).toBe(false)
  })
})
