/**
 * 学员/成员服务
 * 统一管理用户、学员、毕业学员的数据
 */

import { app, ensureAuthenticated } from '@/utils/cloudbase'
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

const db = app.database()

// API 响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

// 获取集合引用
const getCollection = () => db.collection('members')

// 确保已认证的辅助函数 - 每次都真正等待认证完成
const ensureAuth = async () => {
  try {
    await ensureAuthenticated()
    console.log('[membersService] 认证检查完成')
  } catch (error) {
    console.error('[membersService] 认证失败:', error)
    throw new Error('认证失败，无法访问数据库')
  }
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
      // 确保已认证
      await ensureAuth()
      
      console.log('[membersService.getAll] 开始查询, query:', query, 'page:', page, 'pageSize:', pageSize)
      
      // 简化：直接用空条件查询，不做任何过滤
      console.log('[membersService.getAll] 执行无条件查询...')
      
      // 获取集合
      const collection = getCollection()
      console.log('[membersService.getAll] collection 对象:', collection)
      
      // 执行无条件查询
      const res = await collection
        .where({})
        .limit(pageSize)
        .get()
      
      console.log('[membersService.getAll] 查询成功, res:', res)
      console.log('[membersService.getAll] res 类型:', typeof res)
      console.log('[membersService.getAll] res.keys:', Object.keys(res || {}))
      console.log('[membersService.getAll] res.data:', res?.data)
      console.log('[membersService.getAll] res.requestId:', res?.requestId)
      console.log('[membersService.getAll] res.code:', res?.code)
      
      // CloudBase SDK 返回的数据可能在 res.data 或 res 本身
      // SDK 返回格式可能是 { data: [...] } 或 { data: { data: [...] } }
      let dataList: any[] = []
      if (Array.isArray(res?.data)) {
        dataList = res.data
      } else if (Array.isArray(res)) {
        dataList = res
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        dataList = res.data.data
      }
      console.log('[membersService.getAll] 数据条数:', dataList?.length || 0)
      console.log('[membersService.getAll] 实际数据:', JSON.stringify(dataList.slice(0, 2)))
      
      // 获取总数
      let totalCount = 0
      try {
        const countRes = await getCollection().where({}).count()
        console.log('[membersService.getAll] countRes:', countRes)
        // countRes 格式可能是 { total: 4 } 或直接是 4
        totalCount = countRes?.total || countRes?.data?.total || countRes || dataList.length
      } catch (countErr) {
        console.log('[membersService.getAll] count 查询失败:', countErr)
        totalCount = dataList.length
      }
      console.log('[membersService.getAll] 总数:', totalCount)
      
      return {
        success: true,
        data: {
          list: dataList as Member[],
          total: totalCount
        }
      }
    } catch (error: any) {
      console.error('[membersService.getAll] 查询失败:', error)
      console.error('[membersService.getAll] 错误详情:', error?.message, error?.code)
      return {
        success: false,
        message: error?.message || '获取学员列表失败',
        data: { list: [], total: 0 }
      }
    }
  },

  /**
   * 获取所有学员（无分页限制，用于关联查询缓存）
   * 适用于需要将所有学员数据加载到前端进行本地关联的场景
   */
  async getAllForCache(): Promise<ApiResponse<{ list: Member[]; total: number }>> {
    try {
      await ensureAuth()
      
      console.log('[membersService.getAllForCache] 开始查询所有学员...')
      
      // 分批获取所有数据
      const batchSize = 500
      let allData: any[] = []
      let hasMore = true
      let lastId = ''
      
      while (hasMore) {
        const query = lastId 
          ? getCollection().where({ _id: db.command.gt(lastId) }).orderBy('_id', 'asc').limit(batchSize)
          : getCollection().where({}).orderBy('_id', 'asc').limit(batchSize)
        
        const res = await query.get()
        const batch = Array.isArray(res?.data) ? res.data : (res?.data?.data || [])
        
        if (batch.length === 0) {
          hasMore = false
        } else {
          allData = [...allData, ...batch]
          lastId = batch[batch.length - 1]._id
          hasMore = batch.length === batchSize
          console.log(`[membersService.getAllForCache] 已获取 ${allData.length} 条`)
        }
      }
      
      console.log('[membersService.getAllForCache] 查询完成，总计:', allData.length, '条')
      
      return {
        success: true,
        data: {
          list: allData as Member[],
          total: allData.length
        }
      }
    } catch (error: any) {
      console.error('[membersService.getAllForCache] 查询失败:', error)
      return {
        success: false,
        message: error?.message || '获取学员列表失败',
        data: { list: [], total: 0 }
      }
    }
  },
  
  /**
   * 测试用 - 简单查询所有数据
   */
  async testQuery(): Promise<ApiResponse<any>> {
    try {
      console.log('[membersService.testQuery] 开始测试查询...')
      const res = await getCollection().where({}).limit(100).get()
      console.log('[membersService.testQuery] 结果:', res)
      return {
        success: true,
        data: res.data
      }
    } catch (error: any) {
      console.error('[membersService.testQuery] 失败:', error)
      return {
        success: false,
        message: error?.message,
        data: []
      }
    }
  },
  
  /**
   * 获取单个学员详情
   */
  async getById(id: string): Promise<ApiResponse<Member>> {
    try {
      const res = await getCollection().doc(id).get()
      if (!res.data) {
        return { success: false, message: '学员不存在' }
      }
      return { success: true, data: res.data as Member }
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
      const res = await getCollection()
        .where({ phone: db.command.eq(phone) })
        .get()
      
      if (res.data.length === 0) {
        return { success: false, message: '学员不存在' }
      }
      return { success: true, data: res.data[0] as Member }
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
        type: data.type || 'user',  // 默认普通用户，未购买课程
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
      
      const res = await getCollection().add(member)
      
      return {
        success: true,
        data: { ...member, _id: res.id } as Member
      }
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
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString()
      }
      
      await getCollection().doc(id).update(updateData)
      
      // 返回更新后的数据
      const res = await getCollection().doc(id).get()
      return { success: true, data: res.data as Member }
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
      await getCollection().doc(id).remove()
      return { success: true, data: true }
    } catch (error) {
      console.error('删除学员失败:', error)
      return { success: false, message: '删除学员失败' }
    }
  },
  
  // ============ 业务方法 ============
  
  /**
   * 注册新用户（自动创建 members 记录）
   * 由 authService 在登录成功后调用
   */
  async registerIfNotExists(uid: string, data: {
    name?: string
    phone?: string
    email?: string
  }): Promise<ApiResponse<Member>> {
    try {
      // 检查是否已存在
      const existing = await getCollection().doc(uid).get()
      
      if (existing.data) {
        return { success: true, data: existing.data as Member }
      }
      
      // 不存在则创建
      return await this.create({
        name: data.name || '新用户',
        phone: data.phone,
        email: data.email,
        type: 'user',  // 默认 user，等待购买课程后升级
        role: 'student'
      })
    } catch (error) {
      console.error('注册用户失败:', error)
      return { success: false, message: '注册用户失败' }
    }
  },

  /**
   * 授予课程权限（新）- 通过手机号
   * 支付成功或报名成功后调用
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
      const memberRes = await getCollection().where({ phone }).get()
      if (!memberRes.data || memberRes.data.length === 0) {
        console.error('[membersService] 未找到用户:', phone)
        return { success: false, message: '未找到用户' }
      }

      const member = memberRes.data[0] as Member
      const memberId = (member as any)._id || member._id

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
        // 支持新旧两种格式
        if (typeof item === 'string') {
          return item === courseId
        }
        return item.courseId === courseId
      })

      if (isAlreadyEnrolled) {
        console.log('[membersService] 用户已有该课程权限:', courseId)
        return { success: true, data: true }
      }

      // 5. 更新 enrolledCourses
      const updatedCourses = [...existingCourses, newCourseItem]

      // 6. 构建更新数据
      const updates: any = {
        enrolledCourses: updatedCourses,
        type: 'student',  // 升级为学员
        updatedAt: new Date().toISOString()
      }

      // 如果是首次购买/报名，设置 firstPurchaseAt
      if (!member.firstPurchaseAt) {
        updates.firstPurchaseAt = new Date().toISOString()
      }

      await getCollection().doc(memberId).update(updates)

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
      const memberRes = await getCollection().where({ phone }).get()
      if (!memberRes.data || memberRes.data.length === 0) {
        return { success: true, data: [] }
      }

      const member = memberRes.data[0] as Member
      const enrolledCourses = member.enrolledCourses || []

      // 统一转换为标准格式
      const permissions = enrolledCourses.map((item: any) => {
        if (typeof item === 'string') {
          // 旧格式：只存 courseId
          return { courseId: item, source: 'unknown', grantedAt: '' }
        }
        // 新格式
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
      
      const updates: any = {
        type: 'student',
        updatedAt: now
      }
      
      // 如果之前没有首次购买时间，设置它
      const existing = await getCollection().doc(uid).get()
      if (existing.data && !existing.data.firstPurchaseAt) {
        updates.firstPurchaseAt = now
      }
      
      // 添加课程到已购列表
      if (courseId) {
        updates.enrolledCourses = db.command.addToSet(courseId)
      }
      
      await getCollection().doc(uid).update(updates)
      
      const res = await getCollection().doc(uid).get()
      return { success: true, data: res.data as Member }
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
      await getCollection().doc(uid).update({
        enrolledCourses: db.command.addToSet(courseId),
        // 如果是 user 类型，升级为 student
        type: 'student',
        firstPurchaseAt: db.command.missing()._op === 'missing' 
          ? new Date().toISOString() 
          : undefined,
        updatedAt: new Date().toISOString()
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
      const member = await getCollection().doc(uid).get()
      if (!member.data) {
        return { success: false, message: '学员不存在' }
      }
      
      const updates: any = {
        'stats.completedCourses': db.command.inc(1),
        completedCourses: db.command.addToSet(courseId),
        updatedAt: new Date().toISOString()
      }
      
      // 更新平均分
      if (score !== undefined) {
        const current = member.data.stats || {}
        const total = current.totalOrders || 0
        const currentAvg = current.avgScore || 0
        const newAvg = total === 0 ? score : (currentAvg * total + score) / (total + 1)
        updates['stats.avgScore'] = Math.round(newAvg)
      }
      
      // 如果完成全部课程，升级为 graduate
      const data = member.data as Member
      if (data.completedCourses.length + 1 >= data.enrolledCourses.length) {
        updates.type = 'graduate'
        updates.graduatedAt = new Date().toISOString()
      }
      
      await getCollection().doc(uid).update(updates)
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
        getCollection().where({ type: 'user' }).count(),
        getCollection().where({ type: 'student' }).count(),
        getCollection().where({ type: 'graduate' }).count(),
        getCollection().where({ type: 'student', status: 'active' }).count()
      ])
      
      return {
        success: true,
        data: {
          totalUsers: usersRes.total,
          totalStudents: studentsRes.total,
          totalGraduates: graduatesRes.total,
          activeStudents: activeRes.total
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
        getCollection().doc(uid).get(),
        db.collection('enrollments').where({ userId: uid }).get(),
        db.collection('orders').where({ userId: uid }).get(),
        db.collection('examAttempts').where({ userId: uid }).get()
      ])
      
      if (!memberRes.data) {
        return { success: false, message: '学员不存在' }
      }
      
      return {
        success: true,
        data: {
          member: memberRes.data as Member,
          enrollments: enrollmentsRes.data,
          orders: ordersRes.data,
          examAttempts: examsRes.data
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
      const offset = (page - 1) * pageSize

      // 强制筛选 type=student
      const conditions: any[] = [db.command.eq('type', 'student')]

      // 关键词搜索
      if (keyword) {
        conditions.push(
          db.command.or(
            db.command.regexp({ regexp: keyword, options: 'i' })._path('name'),
            db.command.regexp({ regexp: keyword, options: 'i' })._path('phone'),
            db.command.regexp({ regexp: keyword, options: 'i' })._path('email')
          )
        )
      }

      const where = db.command.and(...conditions)

      // 获取总数
      const countRes = await getCollection().where(where).count()

      // 获取数据
      const res = await getCollection()
        .where(where)
        .orderBy('createdAt', 'desc')
        .skip(offset)
        .limit(pageSize)
        .get()

      return {
        code: 0,
        data: {
          list: res.data as Member[],
          total: countRes.total
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
      const res = await getCollection().doc(id).get()
      if (!res.data) {
        return { code: -1, data: null, message: '学员不存在' }
      }
      // 确保是学员类型
      if ((res.data as Member).type !== 'student') {
        return { code: -1, data: null, message: '该成员不是学员' }
      }
      return { code: 0, data: res.data as Member }
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
      
      // 生成学员ID
      const studentId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

      const member: Partial<Member> = {
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

      const res = await getCollection().add(member)
      return {
        code: 0,
        data: { ...member, _id: res.id } as Member
      }
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
      // 获取当前学员
      const current = await getCollection().doc(id).get()
      if (!current.data) {
        return { code: -1, message: '学员不存在' }
      }

      const updateData: any = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        updatedAt: new Date().toISOString()
      }

      // 更新档案信息
      if (current.data.profile) {
        updateData.profile = {
          ...current.data.profile,
          idCard: data.idCard,
          gender: data.gender,
          address: data.address,
          education: data.education,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone
        }
      } else {
        updateData.profile = {
          idCard: data.idCard,
          gender: data.gender,
          address: data.address,
          education: data.education,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone
        }
      }

      await getCollection().doc(id).update(updateData)
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
      await getCollection().doc(id).remove()
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
      const res = await db.collection('enrollments')
        .where({ userId })
        .orderBy('createdAt', 'desc')
        .get()
      return { code: 0, data: res.data || [] }
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
      const res = await db.collection('attendance_records')
        .where({ userId })
        .orderBy('createdAt', 'desc')
        .get()
      return { code: 0, data: res.data || [] }
    } catch (error) {
      console.error('获取出勤记录失败:', error)
      return { code: -1, data: [], message: '获取出勤记录失败' }
    }
  },

  // ============ 微信登录 + 手机绑定核心方法 ============

  /**
   * ★ 通过微信 code 获取手机号
   * 微信登录后，调用此方法获取绑定手机号
   * @param wechatCode 微信授权码（前端通过 wx.login 获取）
   * @returns 手机号或 null
   */
  async getPhoneByWechatCode(wechatCode: string): Promise<{ success: boolean; phone?: string; error?: string }> {
    try {
      // 调用云函数获取手机号（需要在云函数中实现）
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
   * 流程：微信登录 -> 获取手机号 -> 查找/创建会员 -> 关联 openid
   * 
   * @param openid 微信 openid
   * @param phone 要绑定的手机号
   * @param code 短信验证码
   * @param userName 用户姓名（可选）
   */
  async bindPhoneForWechat(
    openid: string,
    phone: string,
    code: string,
    userName?: string
  ): Promise<{ success: boolean; member?: Member; needCreate?: boolean; error?: string }> {
    try {
      console.log('[membersService] 绑定手机号:', { openid, phone })
      
      // 1. 验证短信验证码
      const verifyResult = await app.auth().verifyOtp({ phone, code })
      if (!verifyResult.success) {
        return { success: false, error: '验证码错误或已过期' }
      }

      // 2. 查询手机号是否已有会员记录
      const existingByPhone = await getCollection().where({ phone }).get()
      
      if (existingByPhone.data && existingByPhone.data.length > 0) {
        // 手机号已存在，需要合并
        const existingMember = existingByPhone.data[0] as Member
        
        // 检查是否已有 openid
        if (existingMember.openid && existingMember.openid !== openid) {
          // 已有其他 openid，记录关联
          await getCollection().doc(existingMember._id).update({
            relatedOpenids: db.command.addToSet(openid),
            lastLoginAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        } else {
          // 更新 openid 关联
          await getCollection().doc(existingMember._id).update({
            openid: openid,
            lastLoginAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        }
        
        // 保存手机号到 localStorage
        localStorage.setItem('user_phone', phone)
        
        console.log('[membersService] 合并会员成功:', existingMember._id)
        return { success: true, member: existingMember }
      }
      
      // 3. 手机号不存在，创建新会员
      const now = new Date().toISOString()
      const newMember: Partial<Member> = {
        name: userName || '微信用户',
        phone: phone,
        openid: openid,
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
      
      const res = await getCollection().add(newMember)
      
      // 保存手机号到 localStorage
      localStorage.setItem('user_phone', phone)
      
      const createdMember = { ...newMember, _id: res.id } as Member
      console.log('[membersService] 创建新会员成功:', res.id)
      return { success: true, member: createdMember, needCreate: true }
    } catch (error: any) {
      console.error('[membersService] 绑定手机号失败:', error)
      return { success: false, error: error.message || '绑定失败' }
    }
  },

  /**
   * ★ 微信登录自动关联会员（静默合并）
   * 如果用户之前通过手机号注册过，现在用微信登录，自动关联
   * 
   * @param openid 微信 openid
   * @returns 会员信息或 null
   */
  async autoLinkWechatMember(openid: string): Promise<Member | null> {
    try {
      // 1. 先通过 openid 查询
      const byOpenid = await getCollection().where({ openid }).get()
      if (byOpenid.data && byOpenid.data.length > 0) {
        console.log('[membersService] 找到 openid 对应会员:', byOpenid.data[0]._id)
        return byOpenid.data[0] as Member
      }
      
      // 2. 查询 relatedOpenids 中是否包含此 openid
      const byRelated = await getCollection().where({
        relatedOpenids: db.command.eq(openid)
      }).get()
      if (byRelated.data && byRelated.data.length > 0) {
        console.log('[membersService] 找到 relatedOpenids 对应会员:', byRelated.data[0]._id)
        return byRelated.data[0] as Member
      }
      
      return null
    } catch (error: any) {
      console.error('[membersService] 自动关联失败:', error)
      return null
    }
  },

  /**
   * ★ 获取用户完整数据（我的学习 + 我的培训）
   * 统一查询用户的所有数据
   */
  async getMyData(phone: string): Promise<{
    success: boolean
    data?: {
      member: Member
      courses: any[]       // 已购课程（视频）
      enrollments: any[]   // 报名记录（培训）
      orders: any[]       // 订单
      permissions: any[]  // 权限
    }
    error?: string
  }> {
    try {
      // 1. 获取会员信息
      const memberRes = await getCollection().where({ phone }).get()
      if (!memberRes.data || memberRes.data.length === 0) {
        return { success: false, error: '未找到用户' }
      }
      const member = memberRes.data[0] as Member

      // 2. 获取已购课程（通过订单）
      const ordersRes = await db.collection('orders')
        .where({
          phone: db.command.eq(phone),
          status: db.command.in(['paid', 'completed', 'paid_offline'])
        })
        .get()
      
      const courseIds: string[] = []
      ordersRes.data.forEach((order: any) => {
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
        const coursesRes = await db.collection('courses')
          .where(db.command.or(courseIds.map(id => ({ _id: id }))))
          .get()
        courses = coursesRes.data || []
      }

      // 3. 获取报名记录
      const enrollmentsRes = await db.collection('enrollments')
        .where({ phone })
        .get()

      // 4. 获取所有订单
      const allOrdersRes = await db.collection('orders')
        .where({ phone })
        .get()

      // 5. 获取课程权限
      const permsRes = await db.collection('course_permissions')
        .where({ userId: member._id })
        .get()

      return {
        success: true,
        data: {
          member,
          courses,
          enrollments: enrollmentsRes.data || [],
          orders: allOrdersRes.data || [],
          permissions: permsRes.data || []
        }
      }
    } catch (error: any) {
      console.error('[membersService] 获取用户数据失败:', error)
      return { success: false, error: error.message || '获取数据失败' }
    }
  },

  /**
   * ★ 换手机号时保留旧号记录
   * 用户更换手机号时，保留旧号关联
   */
  async changePhone(
    userId: string,
    oldPhone: string,
    newPhone: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. 验证新手机号验证码
      const verifyResult = await app.auth().verifyOtp({ phone: newPhone, code })
      if (!verifyResult.success) {
        return { success: false, error: '验证码错误或已过期' }
      }

      // 2. 检查新手机号是否已被使用
      const existingNew = await getCollection().where({ phone: newPhone }).get()
      if (existingNew.data && existingNew.data.length > 0) {
        return { success: false, error: '此手机号已被其他账号使用' }
      }

      // 3. 更新会员记录，保留旧手机号
      await getCollection().doc(userId).update({
        relatedPhones: db.command.addToSet(oldPhone),
        phone: newPhone,
        updatedAt: new Date().toISOString()
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
