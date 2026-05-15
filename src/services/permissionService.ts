/**
 * 权限服务 v3.0
 * 版本: v20260515-unified
 * 统一使用 CloudDBService (HTTP → db-init)
 */
import { CloudDBService } from './CloudDBService'
import type { CoursePermission, ClassMember, VideoAccess, MemberSource } from '../types/permission'

export const permissionService = {
  /**
   * 检查视频权限
   */
  async checkVideoAccess(userId: string, courseId: string) {
    try {
      const directPermission = await this.getCoursePermission(userId, courseId)
      if (directPermission && directPermission.status === 'active') {
        const now = new Date()
        const validUntil = new Date(directPermission.videoAccess.validUntil)
        if (directPermission.videoAccess.enabled && validUntil > now) {
          return { allowed: true, source: directPermission.source, validUntil: directPermission.videoAccess.validUntil }
        }
      }
      return { allowed: false, message: '您尚未购买此课程或权限已过期' }
    } catch (error: any) {
      return { allowed: false, message: error.message || '权限检查失败' }
    }
  },

  /**
   * 获取课程权限
   */
  async getCoursePermission(userId: string, courseId: string): Promise<CoursePermission | null> {
    const result = await CloudDBService.query<CoursePermission>('course_permissions', {
      where: { userId, courseId },
      limit: 1
    })
    return result.data?.[0] || null
  },

  /**
   * 获取用户的所有课程权限
   */
  async getUserPermissions(userId: string, options: { status?: string; limit?: number } = {}) {
    const query: Record<string, any> = { userId }
    if (options.status) query.status = options.status
    const result = await CloudDBService.query<CoursePermission>('course_permissions', {
      where: query,
      orderBy: 'createdAt',
      order: 'desc',
      limit: options.limit || 100
    })
    return result.data
  },

  /**
   * 创建课程权限
   */
  async createCoursePermission(data: any) {
    const permissionData = { ...data, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    const existing = await this.getCoursePermission(data.userId, data.courseId)
    if (existing) {
      await CloudDBService.update('course_permissions', existing._id, { ...data, status: 'active', updatedAt: new Date().toISOString() })
      return { code: 0, data: { id: existing._id } }
    }
    const result = await CloudDBService.add('course_permissions', permissionData)
    return { code: 0, data: { id: result?.id } }
  },

  /**
   * 更新视频权限
   */
  async updateVideoAccess(permissionId: string, videoAccess: VideoAccess) {
    await CloudDBService.update('course_permissions', permissionId, { videoAccess, updatedAt: new Date().toISOString() })
    return { code: 0 }
  },

  /**
   * 撤销课程权限
   */
  async revokePermission(permissionId: string) {
    await CloudDBService.update('course_permissions', permissionId, { status: 'revoked', updatedAt: new Date().toISOString() })
    return { code: 0 }
  },

  /**
   * 获取课程权限统计
   */
  async getPermissionStats() {
    const [total, active, expired] = await Promise.all([
      CloudDBService.count('course_permissions'),
      CloudDBService.count('course_permissions', { status: 'active' }),
      CloudDBService.count('course_permissions', { status: 'expired' })
    ])
    return { code: 0, data: { totalPermissions: total, activePermissions: active, expiredPermissions: expired } }
  },

  // 班级成员服务
  async checkClassAccess(userId: string, classId: string) {
    const member = await this.getClassMember(classId, userId)
    if (member && ['enrolled', 'learning'].includes(member.status)) {
      return { allowed: true, source: member.source, memberId: member._id }
    }
    return { allowed: false, message: '您尚未报名此班级' }
  },

  async getClassMember(classId: string, userId: string): Promise<ClassMember | null> {
    const result = await CloudDBService.query<ClassMember>('class_members', { where: { classId, userId }, limit: 1 })
    return result.data?.[0] || null
  },

  async getClassMembers(classId: string, options: { status?: string; limit?: number } = {}) {
    const query: Record<string, any> = { classId }
    if (options.status) query.status = options.status
    const result = await CloudDBService.query<ClassMember>('class_members', {
      where: query,
      orderBy: 'enrolledAt',
      order: 'desc',
      limit: options.limit || 100
    })
    return result.data
  },

  async getUserClasses(userId: string, options: { status?: string } = {}) {
    const query: Record<string, any> = { userId }
    if (options.status) query.status = options.status
    const result = await CloudDBService.query<ClassMember>('class_members', {
      where: query,
      orderBy: 'enrolledAt',
      order: 'desc',
      limit: 100
    })
    return result.data
  },

  async addClassMember(data: any) {
    const existing = await this.getClassMember(data.classId, data.userId)
    if (existing) {
      await CloudDBService.update('class_members', existing._id, {
        status: 'enrolled',
        userName: data.userName || existing.userName,
        userPhone: data.userPhone || existing.userPhone,
        updatedAt: new Date().toISOString()
      })
      return { code: 0, data: { id: existing._id }, message: '该用户已在班级中' }
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
    const result = await CloudDBService.add('class_members', memberData)
    return { code: 0, data: { id: result?.id } }
  },

  async updateClassMemberStatus(memberId: string, status: 'enrolled' | 'learning' | 'completed' | 'dropped') {
    await CloudDBService.update('class_members', memberId, { status, updatedAt: new Date().toISOString() })
    return { code: 0 }
  },

  async removeClassMember(memberId: string) {
    await CloudDBService.update('class_members', memberId, { status: 'dropped', updatedAt: new Date().toISOString() })
    return { code: 0 }
  },

  async getClassMemberStats(classId: string) {
    const [total, enrolled, learning, completed, dropped] = await Promise.all([
      CloudDBService.count('class_members', { classId }),
      CloudDBService.count('class_members', { classId, status: 'enrolled' }),
      CloudDBService.count('class_members', { classId, status: 'learning' }),
      CloudDBService.count('class_members', { classId, status: 'completed' }),
      CloudDBService.count('class_members', { classId, status: 'dropped' })
    ])
    return { code: 0, data: { totalMembers: total, enrolled, learning, completed, dropped } }
  },

  async grantAfterPurchase(userId: string, userName: string, courseId: string, courseName: string) {
    await this.createCoursePermission({
      userId, userName, courseId, courseName, source: 'purchase',
      videoAccess: { enabled: true, validFrom: new Date().toISOString(), validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }
    })
  },

  async grantAfterRegistration(userId: string, userName: string, userPhone: string, courseId: string, courseName: string, classId: string, className: string, registrationId: string) {
    await this.addClassMember({ classId, userId, source: 'offline', registrationId })
    await this.createCoursePermission({
      userId, userName, courseId, courseName, source: 'registration', registrationId, classId, className,
      videoAccess: { enabled: true, validFrom: new Date().toISOString(), validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }
    })
  }
}

export default permissionService
