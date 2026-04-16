/**
 * 权限服务 v2.0 - 线上线下一体化版本
 * 
 * 统一管理视频观看权限和班级参与权限
 * 支持四种会员来源：
 * 1. online_purchase - 线上购买（纯视频学习）
 * 2. online_enroll - 线上报名（班级+考勤）
 * 3. offline_enroll - 线下报名（班级+考勤）
 * 4. hybrid - 混合用户（视频+班级）
 */

import app from '../config/tcb'
import type {
  CoursePermission,
  ClassMember,
  VideoAccessCheckResponse,
  ClassAccessCheckResponse,
  CreateCoursePermissionRequest,
  CreateClassMemberRequest,
  BatchAddClassMembersRequest,
  PermissionStats,
  ClassMemberStats,
  VideoAccess
} from '../types/permission'
import type { MemberSource } from '../types/member'

const CLOUD_FUNCTION_NAME = 'admin'

/**
 * 调用管理后台云函数
 */
async function callAdminFunction(action: string, params: Record<string, unknown> = {}) {
  const result = await app.callFunction({
    name: CLOUD_FUNCTION_NAME,
    data: { action, ...params }
  })
  return result.result as { code: number; message?: string; data?: unknown }
}

// ==================== 视频权限服务 ====================

export const permissionService = {
  
  // ========== 视频权限检查 ==========

  /**
   * 检查用户是否有权观看某课程视频
   * 
   * 检查顺序：
   * 1. course_permissions 表（直接权限）
   * 2. registrations 表（通过报名获得的权限）
   */
  async checkVideoAccess(userId: string, courseId: string): Promise<VideoAccessCheckResponse> {
    try {
      // 1. 检查直接权限
      const directPermission = await this.getCoursePermission(userId, courseId)
      if (directPermission && directPermission.status === 'active') {
        const now = new Date()
        const validUntil = new Date(directPermission.videoAccess.validUntil)
        
        if (directPermission.videoAccess.enabled && validUntil > now) {
          return {
            allowed: true,
            source: directPermission.source,
            validUntil: directPermission.videoAccess.validUntil
          }
        }
      }

      // 2. 检查报名权限
      const regResult = await callAdminFunction('list', {
        collection: 'registrations',
        query: {
          studentId: userId,
          courseId: courseId,
          status: { $in: ['confirmed', 'learning'] },
          'access.videoEnabled': true
        },
        options: { limit: 1 }
      }) as { code: number; data: any[] }

      if (regResult.code === 0 && regResult.data?.length > 0) {
        const reg = regResult.data[0]
        return {
          allowed: true,
          source: 'registration',
          validUntil: reg.access?.videoValidUntil
        }
      }

      return {
        allowed: false,
        message: '您尚未购买此课程或权限已过期'
      }
    } catch (error: any) {
      console.error('检查视频权限失败:', error)
      return {
        allowed: false,
        message: error.message || '权限检查失败'
      }
    }
  },

  /**
   * ★ 增强版：检查视频权限（支持会员来源）
   * 
   * 检查顺序（优先级从高到低）：
   * 1. 班级成员视频权限（线上/线下报名用户）
   * 2. 报名记录视频权限
   * 3. 课程购买权限
   * 4. 管理员授权
   */
  async checkVideoAccessEnhanced(
    userId: string, 
    courseId: string,
    options: { checkClass?: boolean; checkRegistration?: boolean } = {}
  ): Promise<VideoAccessCheckResponse & { memberSource?: MemberSource }> {
    try {
      const { checkClass = true, checkRegistration = true } = options
      
      // 1. 检查班级成员视频权限（优先级最高）
      if (checkClass) {
        // 获取用户所在的所有班级
        const classResult = await callAdminFunction('list', {
          collection: 'class_members',
          query: { 
            userId, 
            status: { $in: ['enrolled', 'learning'] },
            videoEnabled: true
          },
          options: { limit: 10 }
        }) as { code: number; data: any[] }

        if (classResult.code === 0 && classResult.data?.length > 0) {
          // 检查是否有班级关联到目标课程
          for (const member of classResult.data) {
            // 检查班级是否关联此课程
            const classResult2 = await callAdminFunction('list', {
              collection: 'classes',
              query: { _id: member.classId, courseId },
              options: { limit: 1 }
            }) as { code: number; data: any[] }

            if (classResult2.code === 0 && classResult2.data?.length > 0) {
              // 检查视频有效期
              if (member.videoValidUntil) {
                const validUntil = new Date(member.videoValidUntil)
                if (validUntil > new Date()) {
                  return {
                    allowed: true,
                    source: 'class',
                    validUntil: member.videoValidUntil,
                    memberSource: 'online_enroll' // 或 offline_enroll
                  }
                }
              } else {
                // 无有效期限制，永久有效
                return {
                  allowed: true,
                  source: 'class',
                  memberSource: 'online_enroll'
                }
              }
            }
          }
        }
      }

      // 2. 检查报名记录视频权限
      if (checkRegistration) {
        const regResult = await callAdminFunction('list', {
          collection: 'registrations',
          query: {
            studentId: userId,
            courseId: courseId,
            status: { $in: ['confirmed', 'learning'] },
            'access.videoEnabled': true
          },
          options: { limit: 1 }
        }) as { code: number; data: any[] }

        if (regResult.code === 0 && regResult.data?.length > 0) {
          const reg = regResult.data[0]
          return {
            allowed: true,
            source: 'registration',
            validUntil: reg.access?.videoValidUntil,
            memberSource: reg.source === 'online' ? 'online_enroll' : 'offline_enroll'
          }
        }
      }

      // 3. 检查课程购买权限
      const directPermission = await this.getCoursePermission(userId, courseId)
      if (directPermission && directPermission.status === 'active') {
        const now = new Date()
        const validUntil = new Date(directPermission.videoAccess.validUntil)
        
        if (directPermission.videoAccess.enabled && validUntil > now) {
          return {
            allowed: true,
            source: directPermission.source,
            validUntil: directPermission.videoAccess.validUntil,
            memberSource: 'online_purchase'
          }
        }
      }

      return {
        allowed: false,
        message: '您尚未购买此课程或权限已过期'
      }
    } catch (error: any) {
      console.error('增强版视频权限检查失败:', error)
      return {
        allowed: false,
        message: error.message || '权限检查失败'
      }
    }
  },

  /**
   * ★ 获取用户的完整权限状态（用于个人中心显示）
   */
  async getUserPermissionSummary(userId: string) {
    try {
      // 获取用户信息
      const memberResult = await callAdminFunction('list', {
        collection: 'members',
        query: { _id: userId },
        options: { limit: 1 }
      }) as { code: number; data: any[] }

      const member = memberResult.data?.[0]

      // 获取课程权限
      const coursePerms = await this.getUserPermissions(userId)

      // 获取班级成员
      const classResult = await callAdminFunction('list', {
        collection: 'class_members',
        query: { userId, status: { $in: ['enrolled', 'learning'] } },
        options: { limit: 50 }
      }) as { code: number; data: any[] }

      // 获取报名记录
      const regResult = await callAdminFunction('list', {
        collection: 'registrations',
        query: { studentId: userId, status: { $in: ['confirmed', 'learning'] } },
        options: { limit: 50 }
      }) as { code: number; data: any[] }

      return {
        code: 0,
        data: {
          memberSource: member?.source || 'unknown',
          coursePermissions: coursePerms,
          classMemberships: classResult.data || [],
          registrations: regResult.data || [],
          stats: {
            courseCount: coursePerms.filter(p => p.status === 'active').length,
            classCount: classResult.data?.length || 0,
            registrationCount: regResult.data?.length || 0
          }
        }
      }
    } catch (error: any) {
      console.error('获取用户权限摘要失败:', error)
      return { code: -1, message: error.message }
    }
  },

  /**
   * 获取用户对某课程的直接权限
   */
  async getCoursePermission(userId: string, courseId: string): Promise<CoursePermission | null> {
    const result = await callAdminFunction('list', {
      collection: 'course_permissions',
      query: { userId, courseId },
      options: { limit: 1 }
    }) as { code: number; data: CoursePermission[] }

    if (result.code === 0 && result.data?.length > 0) {
      return result.data[0]
    }
    return null
  },

  /**
   * 获取用户的所有课程权限
   */
  async getUserPermissions(userId: string, options: { status?: string; limit?: number } = {}): Promise<CoursePermission[]> {
    const query: Record<string, any> = { userId }
    if (options.status) {
      query.status = options.status
    }

    const result = await callAdminFunction('list', {
      collection: 'course_permissions',
      query,
      options: { limit: options.limit || 100, orderBy: 'createdAt', order: 'desc' }
    }) as { code: number; data: CoursePermission[] }

    return result.code === 0 ? result.data || [] : []
  },

  /**
   * 创建课程权限（购买/报名成功后调用）
   */
  async createCoursePermission(data: CreateCoursePermissionRequest): Promise<{ code: number; data?: { id: string } }> {
    const permissionData = {
      ...data,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // 检查是否已存在
    const existing = await this.getCoursePermission(data.userId, data.courseId)
    if (existing) {
      // 更新现有权限
      await callAdminFunction('update', {
        collection: 'course_permissions',
        docId: existing._id,
        data: {
          ...data,
          status: 'active',
          updatedAt: new Date().toISOString()
        }
      })
      return { code: 0, data: { id: existing._id } }
    }

    const result = await callAdminFunction('add', {
      collection: 'course_permissions',
      data: permissionData
    }) as { code: number; data: { id: string } }

    return result.code === 0 ? { code: 0, data: { id: result.data?.id } } : result
  },

  /**
   * 批量创建课程权限
   */
  async batchCreatePermissions(
    permissions: CreateCoursePermissionRequest[]
  ): Promise<{ code: number; data?: { inserted: number } }> {
    const batchData = permissions.map(p => ({
      ...p,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))

    const result = await callAdminFunction('batchAdd', {
      collection: 'course_permissions',
      batchData
    }) as { code: number; data: { inserted: number } }

    return result
  },

  /**
   * 更新视频权限有效期
   */
  async updateVideoAccess(
    permissionId: string,
    videoAccess: VideoAccess
  ): Promise<{ code: number }> {
    await callAdminFunction('update', {
      collection: 'course_permissions',
      docId: permissionId,
      data: {
        videoAccess,
        updatedAt: new Date().toISOString()
      }
    })
    return { code: 0 }
  },

  /**
   * 撤销课程权限
   */
  async revokePermission(permissionId: string): Promise<{ code: number }> {
    await callAdminFunction('update', {
      collection: 'course_permissions',
      docId: permissionId,
      data: {
        status: 'revoked',
        updatedAt: new Date().toISOString()
      }
    })
    return { code: 0 }
  },

  /**
   * 获取课程权限统计
   */
  async getPermissionStats(): Promise<{ code: number; data: PermissionStats }> {
    const [total, active, expired] = await Promise.all([
      callAdminFunction('count', { collection: 'course_permissions' }),
      callAdminFunction('count', { collection: 'course_permissions', query: { status: 'active' } }),
      callAdminFunction('count', { collection: 'course_permissions', query: { status: 'expired' } })
    ])

    return {
      code: 0,
      data: {
        totalPermissions: (total as any)?.data || 0,
        activePermissions: (active as any)?.data || 0,
        expiredPermissions: (expired as any)?.data || 0,
        bySource: {
          purchase: 0,
          registration: 0,
          gift: 0,
          trial: 0,
          admin_grant: 0
        }
      }
    }
  },

  // ========== 班级成员服务 ==========

  /**
   * 检查用户是否有权参与某班级
   */
  async checkClassAccess(userId: string, classId: string): Promise<ClassAccessCheckResponse> {
    try {
      const member = await this.getClassMember(classId, userId)
      if (member && ['enrolled', 'learning'].includes(member.status)) {
        return {
          allowed: true,
          source: member.source,
          memberId: member._id
        }
      }

      return {
        allowed: false,
        message: '您尚未报名此班级'
      }
    } catch (error: any) {
      console.error('检查班级权限失败:', error)
      return {
        allowed: false,
        message: error.message || '权限检查失败'
      }
    }
  },

  /**
   * 获取班级成员
   */
  async getClassMember(classId: string, userId: string): Promise<ClassMember | null> {
    const result = await callAdminFunction('list', {
      collection: 'class_members',
      query: { classId, userId },
      options: { limit: 1 }
    }) as { code: number; data: ClassMember[] }

    if (result.code === 0 && result.data?.length > 0) {
      return result.data[0]
    }
    return null
  },

  /**
   * 获取班级的所有成员
   */
  async getClassMembers(classId: string, options: { status?: string; limit?: number } = {}): Promise<ClassMember[]> {
    const query: Record<string, any> = { classId }
    if (options.status) {
      query.status = options.status
    }

    const result = await callAdminFunction('list', {
      collection: 'class_members',
      query,
      options: { limit: options.limit || 100, orderBy: 'enrolledAt', order: 'desc' }
    }) as { code: number; data: ClassMember[] }

    return result.code === 0 ? result.data || [] : []
  },

  /**
   * 获取用户参加的所有班级
   */
  async getUserClasses(userId: string, options: { status?: string } = {}): Promise<ClassMember[]> {
    const query: Record<string, any> = { userId }
    if (options.status) {
      query.status = options.status
    }

    const result = await callAdminFunction('list', {
      collection: 'class_members',
      query,
      options: { limit: 100, orderBy: 'enrolledAt', order: 'desc' }
    }) as { code: number; data: ClassMember[] }

    return result.code === 0 ? result.data || [] : []
  },

  /**
   * 添加班级成员（报名成功后调用）
   */
  async addClassMember(data: CreateClassMemberRequest): Promise<{ code: number; data?: { id: string }; message?: string }> {
    // 检查是否已存在
    const existing = await this.getClassMember(data.classId, data.userId)
    if (existing) {
      // 更新状态
      await callAdminFunction('update', {
        collection: 'class_members',
        docId: existing._id,
        data: {
          status: 'enrolled',
          userName: data.userName || existing.userName,
          userPhone: data.userPhone || existing.userPhone,
          videoEnabled: data.videoEnabled ?? existing.videoEnabled,
          videoValidUntil: data.videoValidUntil || existing.videoValidUntil,
          updatedAt: new Date().toISOString()
        }
      })
      return { code: 0, data: { id: existing._id }, message: '该用户已在班级中，已更新状态' }
    }

    const memberData = {
      classId: data.classId,
      userId: data.userId,
      userName: data.userName,
      userPhone: data.userPhone,
      className: data.className,
      courseId: data.courseId,
      source: data.source,
      registrationId: data.registrationId,
      status: 'enrolled' as const,
      attendance: { total: 0, present: 0, absent: 0, late: 0 },
      videoEnabled: data.videoEnabled ?? true,
      videoValidUntil: data.videoValidUntil,
      enrolledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await callAdminFunction('add', {
      collection: 'class_members',
      data: memberData
    }) as { code: number; data: { id: string } }

    return result.code === 0 ? { code: 0, data: { id: result.data?.id } } : result
  },

  /**
   * 批量添加班级成员
   */
  async batchAddClassMembers(data: BatchAddClassMembersRequest): Promise<{ code: number; data?: { inserted: number } }> {
    const batchData = data.members.map(m => ({
      classId: data.classId,
      userId: m.userId,
      source: m.source,
      status: 'enrolled' as const,
      attendance: { total: 0, present: 0, absent: 0, late: 0 },
      videoEnabled: m.videoEnabled ?? true,
      videoValidUntil: m.videoValidUntil,
      enrolledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))

    const result = await callAdminFunction('batchAdd', {
      collection: 'class_members',
      batchData
    }) as { code: number; data: { inserted: number } }

    return result
  },

  /**
   * 更新班级成员状态
   */
  async updateClassMemberStatus(
    memberId: string,
    status: 'enrolled' | 'learning' | 'completed' | 'dropped'
  ): Promise<{ code: number }> {
    await callAdminFunction('update', {
      collection: 'class_members',
      docId: memberId,
      data: { status, updatedAt: new Date().toISOString() }
    })
    return { code: 0 }
  },

  /**
   * 更新出勤统计
   */
  async updateAttendanceStats(
    memberId: string,
    attendance: { present?: number; absent?: number; late?: number }
  ): Promise<{ code: number }> {
    // 先获取当前统计
    const member = await callAdminFunction('get', {
      collection: 'class_members',
      docId: memberId
    }) as { code: number; data: ClassMember }

    if (member.code !== 0 || !member.data) {
      return { code: -1 }
    }

    const current = member.data.attendance
    await callAdminFunction('update', {
      collection: 'class_members',
      docId: memberId,
      data: {
        attendance: {
          total: current.total + (attendance.present ?? 0) + (attendance.absent ?? 0),
          present: current.present + (attendance.present ?? 0),
          absent: current.absent + (attendance.absent ?? 0),
          late: current.late + (attendance.late ?? 0)
        },
        updatedAt: new Date().toISOString()
      }
    })
    return { code: 0 }
  },

  /**
   * 移除班级成员
   */
  async removeClassMember(memberId: string): Promise<{ code: number }> {
    await callAdminFunction('update', {
      collection: 'class_members',
      docId: memberId,
      data: {
        status: 'dropped',
        updatedAt: new Date().toISOString()
      }
    })
    return { code: 0 }
  },

  /**
   * 获取班级成员统计
   */
  async getClassMemberStats(classId: string): Promise<{ code: number; data: ClassMemberStats }> {
    const [total, enrolled, learning, completed, dropped] = await Promise.all([
      callAdminFunction('count', { collection: 'class_members', query: { classId } }),
      callAdminFunction('count', { collection: 'class_members', query: { classId, status: 'enrolled' } }),
      callAdminFunction('count', { collection: 'class_members', query: { classId, status: 'learning' } }),
      callAdminFunction('count', { collection: 'class_members', query: { classId, status: 'completed' } }),
      callAdminFunction('count', { collection: 'class_members', query: { classId, status: 'dropped' } })
    ])

    return {
      code: 0,
      data: {
        totalMembers: (total as any)?.data || 0,
        enrolled: (enrolled as any)?.data || 0,
        learning: (learning as any)?.data || 0,
        completed: (completed as any)?.data || 0,
        dropped: (dropped as any)?.data || 0,
        averageAttendance: 0
      }
    }
  },

  // ========== 便捷方法 ==========

  /**
   * 购买课程后授权（自动创建权限）
   */
  async grantAfterPurchase(userId: string, userName: string, courseId: string, courseName: string): Promise<void> {
    await this.createCoursePermission({
      userId,
      userName,
      courseId,
      courseName,
      source: 'purchase',
      videoAccess: {
        enabled: true,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    })
  },

  /**
   * 报名班级后授权（自动创建班级成员 + 课程权限）
   */
  async grantAfterRegistration(
    userId: string,
    userName: string,
    userPhone: string,
    courseId: string,
    courseName: string,
    classId: string,
    className: string,
    registrationId: string
  ): Promise<void> {
    // 1. 添加班级成员
    await this.addClassMember({
      classId,
      userId,
      source: 'offline',
      registrationId
    })

    // 2. 创建课程权限
    await this.createCoursePermission({
      userId,
      userName,
      courseId,
      courseName,
      source: 'registration',
      registrationId,
      classId,
      className,
      videoAccess: {
        enabled: true,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    })
  }
}

export default permissionService
