// ============================================================================
// 用户类型定义 - 共用层
// ============================================================================

export type UserRole = 'student' | 'teacher' | 'admin'

export interface User {
  _id: string
  openid?: string
  name: string
  phone?: string
  email?: string
  avatar?: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

/**
 * 获取用户角色显示文本
 */
export function getRoleText(role: UserRole): string {
  const map: Record<UserRole, string> = {
    student: '学员',
    teacher: '教师',
    admin: '管理员'
  }
  return map[role] || role
}