/**
 * 用户角色服务
 * 管理 user_roles 集合的增删改查
 */

import tcb from '@/config/tcb'
import type { UserRoleRecord, SystemRole } from '@/types/userRole'

const COLLECTION_NAME = 'user_roles'

// 获取集合引用
const getCollection = () => tcb.database().collection(COLLECTION_NAME)

/**
 * 根据手机号查询用户角色
 */
export async function getUserRoleByPhone(phone: string): Promise<UserRoleRecord | null> {
  try {
    const res = await getCollection()
      .where({ phone })
      .limit(1)
      .get()
    
    if (res.data && res.data.length > 0) {
      return res.data[0] as UserRoleRecord
    }
    return null
  } catch (error) {
    console.error('查询用户角色失败:', error)
    return null
  }
}

/**
 * 根据openid查询用户角色
 */
export async function getUserRoleByOpenid(openid: string): Promise<UserRoleRecord | null> {
  try {
    const res = await getCollection()
      .where({ openid })
      .limit(1)
      .get()
    
    if (res.data && res.data.length > 0) {
      return res.data[0] as UserRoleRecord
    }
    return null
  } catch (error) {
    console.error('查询用户角色失败:', error)
    return null
  }
}

/**
 * 根据手机号或openid查询用户角色
 */
export async function getUserRole(phone?: string, openid?: string): Promise<UserRoleRecord | null> {
  if (phone) {
    return getUserRoleByPhone(phone)
  }
  if (openid) {
    return getUserRoleByOpenid(openid)
  }
  return null
}

/**
 * 创建用户角色记录
 */
export async function createUserRole(data: {
  phone: string
  name: string
  role: SystemRole
  roleName: string
  description?: string
  permissions?: string[]
  openid?: string
  createdBy?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // 检查手机号是否已存在
    const existing = await getUserRoleByPhone(data.phone)
    if (existing) {
      return { success: false, error: '该手机号已被注册' }
    }

    const now = new Date().toISOString()
    const record: UserRoleRecord = {
      phone: data.phone,
      openid: data.openid,
      name: data.name,
      role: data.role,
      roleName: data.roleName,
      permissions: data.permissions || [],
      description: data.description,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
    }

    const res = await getCollection().add(record)
    
    if (res.id) {
      return { success: true, id: res.id }
    }
    return { success: false, error: '创建失败，请检查集合是否存在' }
  } catch (error: any) {
    console.error('创建用户角色失败:', error)
    // 提供更详细的错误信息
    let errorMsg = error.message || '创建失败'
    if (errorMsg.includes('collection') || errorMsg.includes('集合')) {
      errorMsg = '集合不存在，请先在数据库中创建 user_roles 集合'
    } else if (errorMsg.includes('permission') || errorMsg.includes('权限')) {
      errorMsg = '没有写入权限，请检查数据库安全规则'
    }
    return { success: false, error: errorMsg }
  }
}

/**
 * 更新用户角色
 */
export async function updateUserRole(
  id: string,
  data: Partial<{
    name: string
    role: SystemRole
    roleName: string
    permissions: string[]
    description: string
    status: 'active' | 'disabled'
    openid: string
    lastLoginAt: string
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }

    await getCollection().doc(id).update(updateData)
    return { success: true }
  } catch (error: any) {
    console.error('更新用户角色失败:', error)
    return { success: false, error: error.message || '更新失败' }
  }
}

/**
 * 删除用户角色
 */
export async function deleteUserRole(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await getCollection().doc(id).remove()
    return { success: true }
  } catch (error: any) {
    console.error('删除用户角色失败:', error)
    return { success: false, error: error.message || '删除失败' }
  }
}

/**
 * 查询所有用户角色（分页）
 */
export async function getAllUserRoles(params?: {
  page?: number
  pageSize?: number
  role?: SystemRole
  keyword?: string
  status?: string
}): Promise<{
  success: boolean
  data: UserRoleRecord[]
  total: number
  error?: string
}> {
  try {
    const { page = 1, pageSize = 20, role, keyword, status } = params || {}

    let query = getCollection()

    // 条件筛选
    if (role) {
      query = query.where({ role })
    }
    if (status) {
      query = query.where({ status })
    }
    if (keyword) {
      // 手机号或姓名模糊搜索
      const db = tcb.database()
      query = query.where({
        $or: [
          { phone: db.RegExp({ regex: keyword, options: 'i' }) },
          { name: db.RegExp({ regex: keyword, options: 'i' }) },
        ]
      })
    }

    // 获取总数
    const countRes = await query.count()
    const total = countRes.total

    // 分页查询
    const skip = (page - 1) * pageSize
    const res = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: res.data as UserRoleRecord[],
      total,
    }
  } catch (error: any) {
    console.error('查询用户角色列表失败:', error)
    return { success: false, data: [], total: 0, error: error.message }
  }
}

/**
 * 统计各角色人数
 */
export async function getRoleStatistics(): Promise<Record<SystemRole, number>> {
  try {
    const stats: Record<string, number> = {}

    for (const role of ['super_admin', 'admin', 'teacher', 'student'] as SystemRole[]) {
      const res = await getCollection()
        .where({ role, status: 'active' })
        .count()
      stats[role] = res.total
    }

    return stats as Record<SystemRole, number>
  } catch (error) {
    console.error('统计角色人数失败:', error)
    return { super_admin: 0, admin: 0, teacher: 0, student: 0, visitor: 0, anonymous: 0 }
  }
}

/**
 * 验证用户是否为管理员
 */
export async function isAdmin(phone?: string, openid?: string): Promise<boolean> {
  const userRole = await getUserRole(phone, openid)
  if (!userRole) return false
  return ['super_admin', 'admin'].includes(userRole.role)
}

/**
 * 验证用户是否为超级管理员
 */
export async function isSuperAdmin(phone?: string, openid?: string): Promise<boolean> {
  const userRole = await getUserRole(phone, openid)
  if (!userRole) return false
  return userRole.role === 'super_admin'
}

/**
 * 验证用户是否为教师
 */
export async function isTeacher(phone?: string, openid?: string): Promise<boolean> {
  const userRole = await getUserRole(phone, openid)
  if (!userRole) return false
  return userRole.role === 'teacher'
}

/**
 * 获取用户权限列表
 */
export async function getUserPermissions(phone?: string, openid?: string): Promise<string[]> {
  const userRole = await getUserRole(phone, openid)
  if (!userRole) return []
  
  // 如果有自定义权限，使用自定义权限
  if (userRole.permissions && userRole.permissions.length > 0) {
    return userRole.permissions
  }
  
  // 否则使用角色默认权限
  return []
}

export default {
  getUserRoleByPhone,
  getUserRoleByOpenid,
  getUserRole,
  createUserRole,
  updateUserRole,
  deleteUserRole,
  getAllUserRoles,
  getRoleStatistics,
  isAdmin,
  isSuperAdmin,
  isTeacher,
  getUserPermissions,
}
