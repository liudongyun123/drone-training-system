/**
 * 学员/成员服务
 * 统一管理用户、学员、毕业学员的数据
 * 
 * ★ Stage 3 迁移：数据库操作统一走 HTTP → adminService → db-init 云函数
 * ★ Auth 操作（verifyOtp/callFunction）保留 CloudBase SDK
 */

import { app } from '@/utils/cloudbase'
import { adminService } from './adminService'
import type { 
  Member, 
  MemberType, 
  MemberRole, 
  MemberStatus,
  MemberProfile,
  CreateMemberRequest, 
  UpdateMemberRequest,
  MemberQuery
} from '@/types/member'

// API 响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

// ==================== 辅助函数 ====================

const extractList = <T>(result: any): T[] => {
  return result?.data?.list || result?.data || []
}

const extractTotal = (result: any): number => {
  return result?.data?.total || result?.data?.length || 0
}

const extractSingle = <T>(result: any): T | null => {
  if (result?.code === 404) return null
  return result?.data || null
}

/**
 * 学员服务
 */
export const membersService = {
  
  // ============ 基础 CRUD ============
  
  /**
   * 获取所有学员（支持分页和筛选）
   */
  async getAll(query: MemberQuery = {}, page = 1, pageSize = 20): Promise<ApiResponse<{ list: Member[]; total: number }>> {
    try {
      console.log('[membersService.getAll] 查询, query:', query, 'page:', page, 'pageSize:', pageSize)
      
      const result = await adminService.list('members', query, { page, pageSize })
      const dataList = extractList(result) as Member[]
      const totalCount = extractTotal(result)
      
      console.log('[membersService.getAll] 数据条数:', dataList.length, '总数:', totalCount)
      
      return { success: true, data: { list: dataList, total: totalCount } }
    } catch (error: any) {
      console.error('[membersService.getAll] 查询失败:', error)
      return { success: false, message: error?.message || '获取学员列表失败', data: { list: [], total: 0 } }
    }
  },

  /**
   * 获取所有学员（无分页限制，用于关联查询缓存）
   */
  async getAllForCache(): Promise<ApiResponse<{ list: Member[]; total: number }>> {
    try {
      console.log('[membersService.getAllForCache] 开始查询所有学员...')
      
      const batchSize = 500
      let allData: any[] = []
      let hasMore = true
      let page = 1
      
      while (hasMore) {
        const result = await adminService.list('members', {}, { page, pageSize: batchSize, orderBy: '_id', order: 'asc' })
        const batch = result?.data?.list || []
        
        if (batch.length === 0) {
          hasMore = false
        } else {
          allData = [...allData, ...batch]
          page++
          hasMore = batch.length === batchSize
          console.log(`[membersService.getAllForCache] 已获取 ${allData.length} 条`)
        }
      }
      
      console.log('[membersService.getAllForCache] 查询完成，总计:', allData.length, '条')
      
      return { success: true, data: { list: allData as Member[], total: allData.length } }
    } catch (error: any) {
      console.error('[membersService.getAllForCache] 查询失败:', error)
      return { success: false, message: error?.message || '获取学员列表失败', data: { list: [], total: 0 } }
    }
  },
  
  /**
   * 测试用 - 简单查询所有数据
   */
  async testQuery(): Promise<ApiResponse<any>> {
    try {
      console.log('[membersService.testQuery] 开始测试查询...')
      const result = await adminService.list('members', {}, { limit: 100 })
      return { success: true, data: extractList(result) }
    } catch (error: any) {
      console.error('[membersService.testQuery] 失败:', error)
      return { success: false, message: error?.message, data: [] }
    }
  },
  
  /**
   * 获取单个学员详情
   */
  async getById(id: string): Promise<ApiResponse<Member>> {
    try {
      const res = await adminService.get('members', id)
      const member = extractSingle(res)
      if (!member) {
        return { success: false, message: '学员不存在' }
      }
      return { success: true, data: member as Member }
    } catch (error) {
      console.error('获取学员详情失败:', error)
      return { success: false, message: '获取学员详情失败' }
    }
  },
  
  /**
   * 通过手机号查询
   */
  async getByPhone(phone: string): Promise<ApiResponse<Member>> {
    try {
      const res = await adminService.list('members', { phone }, { limit: 1 })
      const list = extractList(res)
      
      if (list.length === 0) {
        return { success: false, message: '学员不存在' }
      }
      return { success: true, data: list[0] as Member }
    } catch (error) {
      console.error('通过手机号查询失败:', error)
      return { success: false, message: '查询失败' }
    }
  },
  
  /**
   * 创建学员（注册）
   */
  async create(data: CreateMemberRequest): Promise<ApiResponse<Member>> {
    try {
      const now = new Date().toISOString()
      
      const member: Partial<Member> = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        type: data.type || 'user',
        role: data.role || 'student',
        profile: data.profile || {},
        stats: {
          totalHours: 0,
          completedCourses: 0,
          examAttempts: 0,
          totalOrders: 0,
          totalSpent: 0
        },
        enrolledCourses: [],
        completedCourses: [],
        status: 'active',
        createdAt: now,
        updatedAt: now
      }
      
      const res = await adminService.add('members', member)
      
      return { success: true, data: { ...member, _id: res.data.id } as Member }
    } catch (error) {
      console.error('创建学员失败:', error)
      return { success: false, message: '创建学员失败' }
    }
  },
  
  /**
   * 更新学员信息
   */
  async update(id: string, data: UpdateMemberRequest): Promise<ApiResponse<Member>> {
    try {
      await adminService.update('members', id, { ...data, updatedAt: new Date().toISOString() })
      
      // 返回更新后的数据
      const res = await adminService.get('members', id)
      return { success: true, data: extractSingle(res) as Member }
    } catch (error) {
      console.error('更新学员失败:', error)
      return { success: false, message: '更新学员失败' }
    }
  },
  
  /**
   * 删除学员
   */
  async delete(id: string): Promise<ApiResponse<boolean>> {
    try {
      await adminService.delete('members', id)
      return { success: true, data: true }
    } catch (error) {
      console.error('删除学员失败:', error)
      return { success: false, message: '删除学员失败' }
    }
  },
  
  // ============ 业务方法 ============
  
  /**
   * 注册新用户（自动创建 members 记录）
   */
  async registerIfNotExists(uid: string, data: {
    name?: string
    phone?: string
    email?: string
  }): Promise<ApiResponse<Member>> {
    try {
      // 检查是否已存在
      const existing = await adminService.get('members', uid)
      const existingMember = extractSingle(existing)
      
      if (existingMember) {
        return { success: true, data: existingMember as Member }
      }
      
      // 不存在则创建
      return await this.create({
        name: data.name || '新用户',
        phone: data.phone,
        email: data.email,
        type: 'user',
        role: 'student'
      })
    } catch (error) {
      console.error('注册用户失败:', error)
      return { success: false, message: '注册用户失败' }
    }
  },

  /**
   * 授予课程权限（新）- 通过手机号
   */
  async grantCoursePermission(
    phone: string,
    courseId: string,
    options: {
      source: 'purchase' | 'enrollment' | 'grant'
      orderId?: string
      enrollmentId?: string
      expiresAt?: string
    }
  ): Promise<ApiResponse<boolean>> {
    try {
      console.log('[membersService] 授予课程权限:', { phone, courseId, source: options.source })

      // 1. 查找用户
      const memberRes = await adminService.list('members', { phone }, { limit: 1 })
      const memberList = extractList(memberRes) as Member[]
      if (memberList.length === 0) {
        console.error('[membersService] 未找到用户:', phone)
        return { success: false, message: '未找到用户' }
      }

      const member = memberList[0]
      const memberId = (member as any)._id

      // 2. 构建新课程项
      const newCourseItem = {
        courseId,
        source: options.source,
        orderId: options.orderId,
        enrollmentId: options.enrollmentId,
        grantedAt: new Date().toISOString(),
        expiresAt: options.expiresAt
      }

      // 3. 获取现有的 enrolledCourses
      const existingCourses = member.enrolledCourses || []

      // 4. 检查是否已存在（避免重复）
      const isAlreadyEnrolled = existingCourses.some((item: any) => {
        if (typeof item === 'string') return item === courseId
        return item.courseId === courseId
      })

      if (isAlreadyEnrolled) {
        console.log('[membersService] 用户已有该课程权限:', courseId)
        return { success: true, data: true }
      }

      // 5. 构建更新数据
      const updatedCourses = [...existingCourses, newCourseItem]
      const updates: any = {
        enrolledCourses: updatedCourses,
        type: 'student',
        updatedAt: new Date().toISOString()
      }

      if (!member.firstPurchaseAt) {
        updates.firstPurchaseAt = new Date().toISOString()
      }

      await adminService.update('members', memberId, updates)

      console.log('[membersService] 课程权限授予成功:', { phone, courseId })
      return { success: true, data: true }
    } catch (error) {
      console.error('[membersService] 授予课程权限失败:', error)
      return { success: false, message: '授予课程权限失败' }
    }
  },

  /**
   * 获取用户的所有课程权限 - 通过手机号
   */
  async getUserCoursePermissions(phone: string): Promise<ApiResponse<Array<{
    courseId: string
    source: string
    grantedAt: string
  }>>> {
    try {
      const memberRes = await adminService.list('members', { phone }, { limit: 1 })
      const memberList = extractList(memberRes) as Member[]
      if (memberList.length === 0) {
        return { success: true, data: [] }
      }

      const member = memberList[0]
      const enrolledCourses = member.enrolledCourses || []

      const permissions = enrolledCourses.map((item: any) => {
        if (typeof item === 'string') {
          return { courseId: item, source: 'unknown', grantedAt: '' }
        }
        return {
          courseId: item.courseId,
          source: item.source,
          grantedAt: item.grantedAt
        }
      })

      return { success: true, data: permissions }
    } catch (error) {
      console.error('[membersService] 获取用户课程权限失败:', error)
      return { success: false, message: '获取课程权限失败', data: [] }
    }
  },

  /**
   * 升级为正式学员（购买课程后调用）
   */
  async upgradeToStudent(uid: string, courseId?: string): Promise<ApiResponse<Member>> {
    try {
      const now = new Date().toISOString()
      
      // 获取当前数据
      const existing = await adminService.get('members', uid)
      const existingMember = extractSingle(existing)
      if (!existingMember) {
        return { success: false, message: '学员不存在' }
      }
      
      // 构建更新数据
      const updates: any = {
        type: 'student',
        updatedAt: now
      }
      
      // 如果之前没有首次购买时间，设置它
      if (!(existingMember as any).firstPurchaseAt) {
        updates.firstPurchaseAt = now
      }
      
      // 添加课程到已购列表（使用 $addToSet 操作符）
      if (courseId) {
        await adminService.updateWithOps('members', uid, {
          ...updates,
          '$addToSet': { enrolledCourses: courseId }
        })
      } else {
        await adminService.update('members', uid, updates)
      }
      
      const res = await adminService.get('members', uid)
      return { success: true, data: extractSingle(res) as Member }
    } catch (error) {
      console.error('升级为学员失败:', error)
      return { success: false, message: '升级失败' }
    }
  },
  
  /**
   * 添加已购课程
   */
  async addEnrolledCourse(uid: string, courseId: string): Promise<ApiResponse<boolean>> {
    try {
      // 先获取当前数据
      const current = await adminService.get('members', uid)
      const member = extractSingle(current) as any
      
      const updates: any = {
        type: 'student',
        updatedAt: new Date().toISOString()
      }
      
      if (!member?.firstPurchaseAt) {
        updates.firstPurchaseAt = new Date().toISOString()
      }
      
      // 使用 $addToSet 添加课程
      await adminService.updateWithOps('members', uid, {
        ...updates,
        '$addToSet': { enrolledCourses: courseId }
      })
      
      return { success: true, data: true }
    } catch (error) {
      console.error('添加已购课程失败:', error)
      return { success: false, message: '添加课程失败' }
    }
  },
  
  /**
   * 完成课程后更新统计
   */
  async completeCourse(uid: string, courseId: string, score?: number): Promise<ApiResponse<boolean>> {
    try {
      const memberRes = await adminService.get('members', uid)
      const member = extractSingle(memberRes) as any
      if (!member) {
        return { success: false, message: '学员不存在' }
      }
      
      // 使用更新操作符
      const updates: any = {
        '$inc': { 'stats.completedCourses': 1 },
        '$addToSet': { completedCourses: courseId },
        updatedAt: new Date().toISOString()
      }
      
      // 更新平均分
      if (score !== undefined) {
        const current = member.stats || {}
        const total = current.totalOrders || 0
        const currentAvg = current.avgScore || 0
        const newAvg = total === 0 ? score : (currentAvg * total + score) / (total + 1)
        updates['stats.avgScore'] = Math.round(newAvg)
      }
      
      // 如果完成全部课程，升级为 graduate
      if ((member.completedCourses?.length || 0) + 1 >= (member.enrolledCourses?.length || 0)) {
        updates.type = 'graduate'
        updates.graduatedAt = new Date().toISOString()
      }
      
      await adminService.updateWithOps('members', uid, updates)
      return { success: true, data: true }
    } catch (error) {
      console.error('完成课程更新失败:', error)
      return { success: false, message: '更新失败' }
    }
  },
  
  /**
   * 获取统计数据
   */
  async getStats(): Promise<ApiResponse<{
    totalUsers: number
    totalStudents: number
    totalGraduates: number
    activeStudents: number
  }>> {
    try {
      const [usersRes, studentsRes, graduatesRes, activeRes] = await Promise.all([
        adminService.count('members', { type: 'user' }),
        adminService.count('members', { type: 'student' }),
        adminService.count('members', { type: 'graduate' }),
        adminService.count('members', { type: 'student', status: 'active' })
      ])
      
      return {
        success: true,
        data: {
          totalUsers: usersRes.data,
          totalStudents: studentsRes.data,
          totalGraduates: graduatesRes.data,
          activeStudents: activeRes.data
        }
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
      return { success: false, message: '获取统计失败' }
    }
  },
  
  /**
   * 获取学员的学习进度（关联其他表）
   */
  async getStudentProgress(uid: string): Promise<ApiResponse<{
    member: Member
    enrollments: any[]
    orders: any[]
    examAttempts: any[]
  }>> {
    try {
      const [memberRes, enrollmentsRes, ordersRes, examsRes] = await Promise.all([
        adminService.get('members', uid),
        adminService.list('enrollments', { userId: uid }, { limit: 100 }),
        adminService.list('orders', { userId: uid }, { limit: 100 }),
        adminService.list('examAttempts', { userId: uid }, { limit: 100 })
      ])
      
      const member = extractSingle(memberRes)
      if (!member) {
        return { success: false, message: '学员不存在' }
      }
      
      return {
        success: true,
        data: {
          member: member as Member,
          enrollments: extractList(enrollmentsRes),
          orders: extractList(ordersRes),
          examAttempts: extractList(examsRes)
        }
      }
    } catch (error) {
      console.error('获取学员进度失败:', error)
      return { success: false, message: '获取进度失败' }
    }
  },

  // ============ 兼容旧 API（AdminStudents 使用）============

  /**
   * 获取学员列表（兼容旧版 studentService API）
   * 支持关键词搜索（name/phone/email）
   */
  async getStudentList(query: {
    keyword?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{
    code: number
    data: { list: Member[]; total: number }
    message?: string
  }> {
    try {
      const { page = 1, pageSize = 10, keyword } = query

      // 构建搜索条件（使用 MongoDB 风格操作符）
      const conditions: any = { type: 'student' }

      if (keyword) {
        conditions['$or'] = [
          { name: { '$regex': keyword } },
          { phone: { '$regex': keyword } },
          { email: { '$regex': keyword } }
        ]
      }

      const result = await adminService.listWithOps('members', conditions, { page, pageSize })

      return {
        code: 0,
        data: {
          list: extractList(result) as Member[],
          total: extractTotal(result)
        }
      }
    } catch (error) {
      console.error('获取学员列表失败:', error)
      return { code: -1, data: { list: [], total: 0 }, message: '获取学员列表失败' }
    }
  },

  /**
   * 获取学员详情（兼容旧版 API）
   */
  async getStudentDetail(id: string): Promise<{
    code: number
    data: Member | null
    message?: string
  }> {
    try {
      const res = await adminService.get('members', id)
      const member = extractSingle(res)
      if (!member) {
        return { code: -1, data: null, message: '学员不存在' }
      }
      if ((member as Member).type !== 'student') {
        return { code: -1, data: null, message: '该成员不是学员' }
      }
      return { code: 0, data: member as Member }
    } catch (error) {
      console.error('获取学员详情失败:', error)
      return { code: -1, data: null, message: '获取学员详情失败' }
    }
  },

  /**
   * 创建学员档案（兼容旧版 API）
   */
  async createStudent(data: {
    name: string
    phone?: string
    email?: string
    idCard?: string
    gender?: string
    address?: string
    education?: string
    emergencyContact?: string
    emergencyPhone?: string
    remarks?: string
  }): Promise<{
    code: number
    data: Member | null
    message?: string
  }> {
    try {
      const now = new Date().toISOString()
      const studentId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

      const member: any = {
        _id: studentId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        type: 'student',
        role: 'student',
        profile: {
          idCard: data.idCard,
          gender: data.gender as any,
          address: data.address,
          education: data.education,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone,
        },
        stats: {
          totalHours: 0,
          completedCourses: 0,
          examAttempts: 0,
          totalOrders: 0,
          totalSpent: 0
        },
        enrolledCourses: [],
        completedCourses: [],
        status: 'active',
        createdAt: now,
        updatedAt: now
      }

      const res = await adminService.add('members', member)
      return { code: 0, data: { ...member, _id: res.data.id } as Member }
    } catch (error) {
      console.error('创建学员失败:', error)
      return { code: -1, data: null, message: '创建学员失败' }
    }
  },

  /**
   * 更新学员档案（兼容旧版 API）
   */
  async updateStudent(
    id: string,
    data: {
      name?: string
      phone?: string
      email?: string
      idCard?: string
      gender?: string
      address?: string
      education?: string
      emergencyContact?: string
      emergencyPhone?: string
      remarks?: string
    }
  ): Promise<{
    code: number
    message: string
  }> {
    try {
      const currentRes = await adminService.get('members', id)
      const current = extractSingle(currentRes) as any
      if (!current) {
        return { code: -1, message: '学员不存在' }
      }

      const updateData: any = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        updatedAt: new Date().toISOString()
      }

      updateData.profile = {
        ...(current.profile || {}),
        idCard: data.idCard,
        gender: data.gender,
        address: data.address,
        education: data.education,
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone
      }

      await adminService.update('members', id, updateData)
      return { code: 0, message: '更新成功' }
    } catch (error) {
      console.error('更新学员失败:', error)
      return { code: -1, message: '更新学员失败' }
    }
  },

  /**
   * 删除学员（兼容旧版 API）
   */
  async deleteStudent(id: string): Promise<{
    code: number
    message: string
  }> {
    try {
      await adminService.delete('members', id)
      return { code: 0, message: '删除成功' }
    } catch (error) {
      console.error('删除学员失败:', error)
      return { code: -1, message: '删除学员失败' }
    }
  },

  /**
   * 获取学员的报名记录
   */
  async getStudentEnrollments(userId: string): Promise<{
    code: number
    data: any[]
    message?: string
  }> {
    try {
      const res = await adminService.list('enrollments', { userId }, { limit: 100, orderBy: 'createdAt', order: 'desc' })
      return { code: 0, data: extractList(res) }
    } catch (error) {
      console.error('获取报名记录失败:', error)
      return { code: -1, data: [], message: '获取报名记录失败' }
    }
  },

  /**
   * 获取学员的出勤记录
   */
  async getStudentAttendance(userId: string): Promise<{
    code: number
    data: any[]
    message?: string
  }> {
    try {
      const res = await adminService.list('attendance_records', { userId }, { limit: 100, orderBy: 'createdAt', order: 'desc' })
      return { code: 0, data: extractList(res) }
    } catch (error) {
      console.error('获取出勤记录失败:', error)
      return { code: -1, data: [], message: '获取出勤记录失败' }
    }
  },

  // ============ 微信登录 + 手机绑定核心方法 ============

  /**
   * ★ 通过微信 code 获取手机号
   * 保留 CloudBase SDK - 调用云函数
   */
  async getPhoneByWechatCode(wechatCode: string): Promise<{ success: boolean; phone?: string; error?: string }> {
    try {
      const result = await app.callFunction({
        name: 'mobile-auth',
        data: {
          action: 'getPhoneByCode',
          data: { code: wechatCode }
        }
      })
      
      if (result.result?.success && result.result?.phone) {
        return { success: true, phone: result.result.phone }
      }
      return { success: false, error: result.result?.error || '获取手机号失败' }
    } catch (error: any) {
      console.error('[membersService] 获取手机号失败:', error)
      return { success: false, error: error.message || '获取手机号失败' }
    }
  },

  /**
   * ★ 微信登录后绑定手机号（合并会员）
   * auth 操作保留 CloudBase SDK，数据库走 HTTP
   */
  async bindPhoneForWechat(
    openid: string,
    phone: string,
    code: string,
    userName?: string
  ): Promise<{ success: boolean; member?: Member; needCreate?: boolean; error?: string }> {
    try {
      console.log('[membersService] 绑定手机号:', { openid, phone })
      
      // 1. 验证短信验证码（保留 CloudBase SDK）
      const verifyResult = await app.auth().verifyOtp({ phone, token: code } as any)
      if ((verifyResult as any).error) {
        return { success: false, error: '验证码错误或已过期' }
      }

      // 2. 查询手机号是否已有会员记录
      const existingByPhone = await adminService.list('members', { phone }, { limit: 1 })
      const memberList = extractList(existingByPhone) as Member[]
      
      if (memberList.length > 0) {
        const existingMember = memberList[0]
        const memberId = (existingMember as any)._id
        
        if (existingMember.openid && existingMember.openid !== openid) {
          // 已有其他 openid，使用 $addToSet 操作符
          await adminService.updateWithOps('members', memberId, {
            '$addToSet': { relatedOpenids: openid },
            lastLoginAt: new Date().toISOString()
          })
        } else {
          await adminService.update('members', memberId, {
            openid,
            lastLoginAt: new Date().toISOString()
          })
        }
        
        localStorage.setItem('user_phone', phone)
        console.log('[membersService] 合并会员成功:', memberId)
        return { success: true, member: existingMember }
      }
      
      // 3. 手机号不存在，创建新会员
      const now = new Date().toISOString()
      const newMember: any = {
        name: userName || '微信用户',
        phone,
        openid,
        type: 'user',
        role: 'student',
        profile: {},
        stats: {
          totalHours: 0,
          completedCourses: 0,
          examAttempts: 0,
          totalOrders: 0,
          totalSpent: 0
        },
        enrolledCourses: [],
        completedCourses: [],
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      }
      
      const res = await adminService.add('members', newMember)
      localStorage.setItem('user_phone', phone)
      
      const createdMember = { ...newMember, _id: res.data.id } as Member
      console.log('[membersService] 创建新会员成功:', res.data.id)
      return { success: true, member: createdMember, needCreate: true }
    } catch (error: any) {
      console.error('[membersService] 绑定手机号失败:', error)
      return { success: false, error: error.message || '绑定失败' }
    }
  },

  /**
   * ★ 微信登录自动关联会员（静默合并）
   */
  async autoLinkWechatMember(openid: string): Promise<Member | null> {
    try {
      // 1. 先通过 openid 查询
      const byOpenid = await adminService.list('members', { openid }, { limit: 1 })
      const byOpenidList = extractList(byOpenid) as Member[]
      if (byOpenidList.length > 0) {
        console.log('[membersService] 找到 openid 对应会员:', (byOpenidList[0] as any)._id)
        return byOpenidList[0]
      }
      
      // 2. 查询 relatedOpenids 中是否包含此 openid
      const byRelated = await adminService.list('members', { relatedOpenids: { '$eq': openid } }, { limit: 1 })
      const byRelatedList = extractList(byRelated) as Member[]
      if (byRelatedList.length > 0) {
        console.log('[membersService] 找到 relatedOpenids 对应会员:', (byRelatedList[0] as any)._id)
        return byRelatedList[0]
      }
      
      return null
    } catch (error: any) {
      console.error('[membersService] 自动关联失败:', error)
      return null
    }
  },

  /**
   * ★ 获取用户完整数据（我的学习 + 我的培训）
   */
  async getMyData(phone: string): Promise<{
    success: boolean
    data?: {
      member: Member
      courses: any[]
      enrollments: any[]
      orders: any[]
      permissions: any[]
    }
    error?: string
  }> {
    try {
      // 1. 获取会员信息
      const memberRes = await adminService.list('members', { phone }, { limit: 1 })
      const memberList = extractList(memberRes) as Member[]
      if (memberList.length === 0) {
        return { success: false, error: '未找到用户' }
      }
      const member = memberList[0]
      const memberId = (member as any)._id

      // 2. 获取已支付订单（使用操作符查询）
      const ordersRes = await adminService.listWithOps('orders', {
        phone: { '$eq': phone },
        status: { '$in': ['paid', 'completed', 'paid_offline'] }
      }, { limit: 200 })
      
      const orders = extractList(ordersRes)
      const courseIds: string[] = []
      orders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (item.courseId && !courseIds.includes(item.courseId)) {
              courseIds.push(item.courseId)
            }
          })
        }
        if (order.courseId && !courseIds.includes(order.courseId)) {
          courseIds.push(order.courseId)
        }
      })
      
      // 获取课程详情
      let courses: any[] = []
      if (courseIds.length > 0) {
        // 用 $in 批量查询课程
        const coursesRes = await adminService.list('courses', {
          _id: { '$in': courseIds }
        }, { limit: 200 })
        courses = extractList(coursesRes)
      }

      // 3. 获取报名记录
      const enrollmentsRes = await adminService.list('enrollments', { phone }, { limit: 100 })
      const enrollments = extractList(enrollmentsRes)

      // 4. 获取所有订单
      const allOrdersRes = await adminService.list('orders', { phone }, { limit: 200 })
      const allOrders = extractList(allOrdersRes)

      // 5. 获取课程权限
      const permsRes = await adminService.list('course_permissions', { userId: memberId }, { limit: 100 })
      const permissions = extractList(permsRes)

      return {
        success: true,
        data: {
          member,
          courses,
          enrollments,
          orders: allOrders,
          permissions
        }
      }
    } catch (error: any) {
      console.error('[membersService] 获取用户数据失败:', error)
      return { success: false, error: error.message || '获取数据失败' }
    }
  },

  /**
   * ★ 换手机号时保留旧号记录
   */
  async changePhone(
    userId: string,
    oldPhone: string,
    newPhone: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. 验证新手机号验证码（保留 CloudBase SDK）
      const verifyResult = await app.auth().verifyOtp({ phone: newPhone, token: code } as any)
      if ((verifyResult as any).error) {
        return { success: false, error: '验证码错误或已过期' }
      }

      // 2. 检查新手机号是否已被使用
      const existingNew = await adminService.list('members', { phone: newPhone }, { limit: 1 })
      if (extractList(existingNew).length > 0) {
        return { success: false, error: '此手机号已被其他账号使用' }
      }

      // 3. 更新会员记录，保留旧手机号（使用 $addToSet 操作符）
      await adminService.updateWithOps('members', userId, {
        '$addToSet': { relatedPhones: oldPhone },
        phone: newPhone
      })

      // 4. 更新 localStorage
      localStorage.setItem('user_phone', newPhone)

      console.log('[membersService] 更换手机号成功:', { userId, oldPhone, newPhone })
      return { success: true }
    } catch (error: any) {
      console.error('[membersService] 更换手机号失败:', error)
      return { success: false, error: error.message || '更换手机号失败' }
    }
  }
}

export default membersService
