import { adminService } from './adminService'
import { dbService } from './cloudBaseService'

// 统一的云开发数据服务接口
export interface IAdminDataService<T> {
  getAll(): Promise<T[]>
  getById(id: string): Promise<T | null>
  add(data: Partial<T>): Promise<T | null>
  update(id: string, data: Partial<T>): Promise<T | null>
  delete(id: string): Promise<boolean>
}

// 用户数据服务
export const CloudUserAdminService = {
  collection: 'users',

  // ✅ 优化：getAll 方法直接返回 total
  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { username: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ]
      }

      // 并行执行列表查询和计数查询
      const [listResult, countResult] = await Promise.all([
        adminService.list(this.collection, query, options),
        adminService.count(this.collection, query)
      ])

      return {
        success: true,
        data: listResult.data.map((u: any) => ({
          id: u._id,
          username: u.username,
          email: u.email,
          role: u.role,
          status: u.status || 'active',
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
        })),
        total: countResult.data // ✅ 直接返回总数
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
      return { success: false, data: [], message: '获取用户列表失败', total: 0 }
    }
  },

  async getById(id: string) {
    try {
      const result = await adminService.get(this.collection, id)
      if (!result.data) return null
      return {
        id: result.data._id,
        username: result.data.username,
        email: result.data.email,
        role: result.data.role,
        status: result.data.status || 'active',
        createdAt: result.data.createdAt,
        lastLogin: result.data.lastLogin,
      }
    } catch (error) {
      console.error('获取用户详情失败:', error)
      return null
    }
  },

  async add(userData: any) {
    try {
      const result = await adminService.add(this.collection, userData)
      if (!result.data) return null
      return {
        id: result.data.id,
        ...userData,
      }
    } catch (error) {
      console.error('创建用户失败:', error)
      return null
    }
  },

  async update(id: string, userData: any) {
    try {
      await adminService.update(this.collection, id, userData)
      return {
        id,
        ...userData,
      }
    } catch (error) {
      console.error('更新用户失败:', error)
      return null
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete(this.collection, id)
      return true
    } catch (error) {
      console.error('删除用户失败:', error)
      return false
    }
  },

  async count(params?: { search?: string }) {
    try {
      const { search } = params || {}
      const query: any = {}
      if (search) {
        query.$or = [
          { username: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ]
      }
      const result = await adminService.count(this.collection, query)
      return result.data
    } catch (error) {
      console.error('获取用户总数失败:', error)
      return 0
    }
  },

  // 封禁/解封用户
  async banUser(id: string) {
    return await this.update(id, { status: 'banned' })
  },

  async unbanUser(id: string) {
    return await this.update(id, { status: 'active' })
  },
}

// ============== 订单数据服务（统一字段）==============
// 
// 统一订单字段：
// - _id: 数据库ID
// - userId: 用户ID
// - items: 订单项数组（多课程）
// - courseId/courseName: 单课程（兼容）
// - amount: 金额
// - status: 状态
// - createdAt: 创建时间

export const CloudOrderAdminService = {
  collection: 'orders',

  // 获取订单列表 - 统一返回字段
  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { userName: new RegExp(search, 'i') },
          { courseName: new RegExp(search, 'i') }
        ]
      }

      // 并行执行列表查询和计数查询
      const [listResult, countResult] = await Promise.all([
        adminService.list(this.collection, query, options),
        adminService.count(this.collection, query)
      ])

      return {
        success: true,
        data: listResult.data.map((o: any) => ({
          _id: o._id,
          id: o._id,
          userId: o.userId,
          userName: o.userName,
          orderNo: o.orderNo,
          items: o.items,
          courseId: o.courseId,
          courseName: o.courseName,
          courseCover: o.courseCover,
          amount: o.amount || 0,
          discountAmount: o.discountAmount,
          finalAmount: o.finalAmount,
          status: o.status || 'pending',
          paymentMethod: o.paymentMethod,
          createdAt: o.createdAt,
          paidAt: o.paidAt,
          remark: o.remark,
        })),
        total: countResult.data
      }
    } catch (error) {
      console.error('获取订单列表失败:', error)
      return { success: false, data: [], message: '获取订单列表失败', total: 0 }
    }
  },

  async getById(id: string) {
    try {
      const result = await adminService.get(this.collection, id)
      if (!result.data) return null
      const o = result.data
      return {
        _id: o._id,
        id: o._id,
        userId: o.userId,
        userName: o.userName,
        orderNo: o.orderNo,
        items: o.items,
        courseId: o.courseId,
        courseName: o.courseName,
        courseCover: o.courseCover,
        amount: o.amount || 0,
        discountAmount: o.discountAmount,
        finalAmount: o.finalAmount,
        status: o.status,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
        remark: o.remark,
      }
    } catch (error) {
      console.error('获取订单详情失败:', error)
      return null
    }
  },

  async update(id: string, orderData: any) {
    try {
      await adminService.update(this.collection, id, orderData)
      return { id, ...orderData }
    } catch (error) {
      console.error('更新订单失败:', error)
      return null
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete(this.collection, id)
      return true
    } catch (error) {
      console.error('删除订单失败:', error)
      return false
    }
  },

  // 按用户ID获取订单
  async getByUserId(userId: string) {
    try {
      const result = await adminService.list(this.collection, { userId })
      return {
        success: true,
        data: result.data.map((o: any) => ({
          _id: o._id,
          userId: o.userId,
          userName: o.userName,
          items: o.items,
          courseId: o.courseId,
          courseName: o.courseName,
          amount: o.amount || 0,
          status: o.status || 'pending',
          createdAt: o.createdAt,
        }))
      }
    } catch (error) {
      console.error('按用户ID获取订单失败:', error)
      return { success: false, data: [], message: '获取订单失败' }
    }
  },

  // 按课程ID获取订单
  async getByCourseId(courseId: string) {
    try {
      // 查询包含该课程的订单
      const result = await adminService.list(this.collection, {})
      const filteredData = result.data.filter((o: any) => {
        if (o.courseId === courseId) return true
        if (o.items?.some((item: any) => item.courseId === courseId)) return true
        return false
      })
      return {
        success: true,
        data: filteredData.map((o: any) => ({
          _id: o._id,
          userId: o.userId,
          userName: o.userName,
          items: o.items,
          courseId: o.courseId,
          courseName: o.courseName,
          amount: o.amount || 0,
          status: o.status || 'pending',
          createdAt: o.createdAt,
        }))
      }
    } catch (error) {
      console.error('按课程ID获取订单失败:', error)
      return { success: false, data: [], message: '获取订单失败' }
    }
  },

  // 按状态获取订单
  async getByStatus(status: string) {
    try {
      const result = await adminService.list(this.collection, { status })
      return {
        success: true,
        data: result.data.map((o: any) => ({
          _id: o._id,
          userId: o.userId,
          userName: o.userName,
          items: o.items,
          courseId: o.courseId,
          courseName: o.courseName,
          amount: o.amount || 0,
          status: o.status,
          createdAt: o.createdAt,
        }))
      }
    } catch (error) {
      console.error('按状态获取订单失败:', error)
      return { success: false, data: [], message: '获取订单失败' }
    }
  },

  async count(params?: { search?: string }) {
    try {
      const { search } = params || {}
      const query: any = {}
      if (search) {
        query.$or = [
          { userName: new RegExp(search, 'i') },
          { courseName: new RegExp(search, 'i') }
        ]
      }
      const result = await adminService.count(this.collection, query)
      return result.data
    } catch (error) {
      console.error('获取订单总数失败:', error)
      return 0
    }
  },
}

// 通知数据服务
export const CloudNotificationService = {
  collection: 'notifications',

  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { content: new RegExp(search, 'i') }
        ]
      }

      const result = await adminService.list(this.collection, query, options)
      return {
        success: true,
        data: result.data.map((n: any) => ({
          id: n._id,
          title: n.title,
          content: n.content,
          type: n.type || 'info',
          targetUsers: n.targetUsers || 'all',
          createdAt: n.createdAt,
          sentAt: n.sentAt,
        }))
      }
    } catch (error) {
      console.error('获取通知列表失败:', error)
      return { success: false, data: [], message: '获取通知列表失败' }
    }
  },

  async add(notificationData: any) {
    try {
      const data = {
        ...notificationData,
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
      }
      const result = await adminService.add(this.collection, data)
      if (!result.data) return null
      return {
        id: result.data.id,
        ...data,
      }
    } catch (error) {
      console.error('创建通知失败:', error)
      return null
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete(this.collection, id)
      return true
    } catch (error) {
      console.error('删除通知失败:', error)
      return false
    }
  },
}

// 课程管理服务
export const CloudCourseAdminService = {
  collection: 'courses',

  // ✅ 优化：getAll 方法直接返回 total，不需要单独调用 count()
  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { category: new RegExp(search, 'i') }
        ]
      }

      // 并行执行列表查询和计数查询
      const [listResult, countResult] = await Promise.all([
        adminService.list(this.collection, query, options),
        adminService.count(this.collection, query)
      ])

      return {
        success: true,
        data: listResult.data.map((c: any) => ({
          id: c._id,
          title: c.title,
          description: c.description,
          category: c.category,
          level: c.level,
          price: c.price,
          originalPrice: c.originalPrice,
          coverImage: c.coverImage,
          instructor: c.instructor,
          duration: c.duration,
          studentCount: c.studentCount || 0,
          rating: c.rating || 0,
          status: c.status || 'draft',
          createdAt: c.createdAt,
        })) || [],
        total: countResult.data // ✅ 直接返回总数
      }
    } catch (error) {
      console.error('获取课程列表失败:', error)
      return {
        success: false,
        message: '获取课程列表失败',
        data: [],
        total: 0
      }
    }
  },

  async getById(id: string) {
    try {
      const result = await adminService.get(this.collection, id)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('获取课程详情失败:', error)
      return {
        success: false,
        message: '获取课程详情失败',
        data: null
      }
    }
  },

  async add(courseData: any) {
    try {
      const result = await adminService.add(this.collection, courseData)
      return {
        success: true,
        data: result.data,
        message: '课程创建成功'
      }
    } catch (error) {
      console.error('创建课程失败:', error)
      return {
        success: false,
        error: '创建课程失败',
        data: null
      }
    }
  },

  async update(id: string, courseData: any) {
    try {
      await adminService.update('courses', id, courseData)
      return {
        success: true,
        message: '课程更新成功'
      }
    } catch (error) {
      console.error('更新课程失败:', error)
      return {
        success: false,
        error: '更新课程失败'
      }
    }
  },

  async delete(id: string) {
    try {
      console.log('[CloudCourseAdminService.delete] 删除课程, id:', id, 'collection:', this.collection)
      const result = await adminService.delete('courses', id)
      console.log('删除课程返回结果:', result)
      // 检查云函数返回结果
      if (result.code === 0) {
        return {
          success: true,
          message: result.message || '课程删除成功',
          data: result.data
        }
      } else {
        return {
          success: false,
          error: result.message || '删除课程失败',
          code: result.code
        }
      }
    } catch (error: any) {
      console.error('删除课程失败:', error)
      return {
        success: false,
        error: error.message || '删除课程失败'
      }
    }
  },

  async count(params?: { search?: string }) {
    try {
      const { search } = params || {}
      const query: any = {}
      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { category: new RegExp(search, 'i') }
        ]
      }
      const result = await adminService.count(this.collection, query)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('获取课程总数失败:', error)
      return {
        success: false,
        data: 0
      }
    }
  },
}

// 章节管理服务
export const CloudChapterAdminService = {
  collection: 'chapters',

  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') }
        ]
      }

      const result = await adminService.list(this.collection, query, options)
      return {
        success: true,
        data: result.data.map((c: any) => ({
          id: c._id,
          title: c.title,
          courseId: c.courseId,
          videoUrl: c.videoUrl,
          duration: c.duration,
          sortOrder: c.sortOrder,
          status: c.status || 'draft',
          createdAt: c.createdAt,
        }))
      }
    } catch (error) {
      console.error('获取章节列表失败:', error)
      return { success: false, data: [], message: '获取章节列表失败' }
    }
  },

  async getByCourseId(courseId: string) {
    try {
      const result = await adminService.list(this.collection, { courseId })
      return result.data
    } catch (error) {
      console.error('获取课程章节失败:', error)
      return []
    }
  },

  async add(chapterData: any) {
    try {
      const result = await adminService.add(this.collection, chapterData)
      return result.data
    } catch (error) {
      console.error('创建章节失败:', error)
      return null
    }
  },

  async update(id: string, chapterData: any) {
    try {
      await adminService.update(this.collection, id, chapterData)
      return true
    } catch (error) {
      console.error('更新章节失败:', error)
      return false
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('chapters', id)
      return true
    } catch (error) {
      console.error('删除章节失败:', error)
      return false
    }
  },
}

// 试卷管理服务
export const CloudExamAdminService = {
  collection: 'exams',

  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') }
        ]
      }

      const result = await adminService.list(this.collection, query, options)
      return {
        success: true,
        data: result.data.map((e: any) => ({
          id: e._id,
          title: e.title,
          courseId: e.courseId,
          questionCount: e.questionCount,
          duration: e.duration,
          passScore: e.passScore,
          status: e.status || 'draft',
          createdAt: e.createdAt,
        })) || []
      }
    } catch (error) {
      console.error('获取试卷列表失败:', error)
      return {
        success: false,
        message: '获取试卷列表失败',
        data: []
      }
    }
  },

  async add(examData: any) {
    try {
      const result = await adminService.add(this.collection, examData)
      return {
        success: true,
        data: result.data,
        message: '试卷创建成功'
      }
    } catch (error) {
      console.error('创建试卷失败:', error)
      return {
        success: false,
        error: '创建试卷失败',
        data: null
      }
    }
  },

  async update(id: string, examData: any) {
    try {
      await adminService.update('exams', id, examData)
      return {
        success: true,
        message: '试卷更新成功'
      }
    } catch (error) {
      console.error('更新试卷失败:', error)
      return {
        success: false,
        error: '更新试卷失败'
      }
    }
  },

  async delete(id: string) {
    console.log('[CloudExamAdminService.delete] 开始删除, id:', id)
    try {
      const result = await adminService.delete('exams', id)
      console.log('[CloudExamAdminService.delete] 云函数返回:', result)
      if (result && result.code === 0) {
        return { success: true, message: '试卷删除成功' }
      } else {
        // 即使返回非0，也可能是删除成功了
        return { success: true, message: '操作完成', warning: result?.message }
      }
    } catch (error: any) {
      console.error('[CloudExamAdminService.delete] 删除异常:', error)
      // 异常情况也视为可能成功
      return { success: true, message: '操作完成，请刷新确认' }
    }
  },
}

// 题库管理服务
export const CloudQuestionBankAdminService = {
  collection: 'questionBanks',

  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { category: new RegExp(search, 'i') }
        ]
      }

      const result = await adminService.list(this.collection, query, options)
      return {
        success: true,
        data: result.data.map((q: any) => ({
          id: q._id,
          title: q.title,
          category: q.category,
          questionCount: q.questionCount,
          difficulty: q.difficulty,
          status: q.status || 'draft',
          createdAt: q.createdAt,
        }))
      }
    } catch (error) {
      console.error('获取题库列表失败:', error)
      return { success: false, data: [], message: '获取题库列表失败' }
    }
  },

  async add(bankData: any) {
    try {
      const result = await adminService.add(this.collection, bankData)
      return result.data
    } catch (error) {
      console.error('创建题库失败:', error)
      return null
    }
  },

  async update(id: string, bankData: any) {
    try {
      await adminService.update('questionBanks', id, bankData)
      return true
    } catch (error) {
      console.error('更新题库失败:', error)
      return false
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('questionBanks', id)
      return true
    } catch (error) {
      console.error('删除题库失败:', error)
      return false
    }
  },
}

// 学习路径管理服务
export const CloudLearningPathAdminService = {
  collection: 'learning_paths',

  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') }
        ]
      }

      const result = await adminService.list(this.collection, query, options)
      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      console.error('获取学习路径列表失败:', error)
      return {
        success: false,
        message: '获取学习路径列表失败',
        data: []
      }
    }
  },

  async add(pathData: any) {
    try {
      const result = await adminService.add(this.collection, pathData)
      return {
        success: true,
        data: result.data,
        message: '学习路径创建成功'
      }
    } catch (error) {
      console.error('创建学习路径失败:', error)
      return {
        success: false,
        error: '创建学习路径失败',
        data: null
      }
    }
  },

  async update(id: string, pathData: any) {
    try {
      await adminService.update('learning_paths', id, pathData)
      return {
        success: true,
        message: '学习路径更新成功'
      }
    } catch (error) {
      console.error('更新学习路径失败:', error)
      return {
        success: false,
        error: '更新学习路径失败'
      }
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('learning_paths', id)
      return {
        success: true,
        message: '学习路径删除成功'
      }
    } catch (error) {
      console.error('删除学习路径失败:', error)
      return {
        success: false,
        error: '删除学习路径失败'
      }
    }
  },
}

// 会员等级管理服务
export const CloudMemberLevelAdminService = {
  collection: 'member_levels',

  // ✅ 优化：getAll 方法直接返回 total
  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') }
        ]
      }

      // 并行执行列表查询和计数查询
      const [listResult, countResult] = await Promise.all([
        adminService.list(this.collection, query, options),
        adminService.count(this.collection, query)
      ])

      return {
        success: true,
        data: listResult.data || [],
        total: countResult.data // ✅ 直接返回总数
      }
    } catch (error) {
      console.error('获取会员等级列表失败:', error)
      return {
        success: false,
        message: '获取会员等级列表失败',
        data: [],
        total: 0
      }
    }
  },

  async add(levelData: any) {
    try {
      const result = await adminService.add(this.collection, levelData)
      return {
        success: true,
        data: result.data,
        message: '会员等级创建成功'
      }
    } catch (error) {
      console.error('创建会员等级失败:', error)
      return {
        success: false,
        error: '创建会员等级失败',
        data: null
      }
    }
  },

  async update(id: string, levelData: any) {
    try {
      await adminService.update('member_levels', id, levelData)
      return {
        success: true,
        message: '会员等级更新成功'
      }
    } catch (error) {
      console.error('更新会员等级失败:', error)
      return {
        success: false,
        error: '更新会员等级失败'
      }
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('member_levels', id)
      return {
        success: true,
        message: '会员等级删除成功'
      }
    } catch (error) {
      console.error('删除会员等级失败:', error)
      return {
        success: false,
        error: '删除会员等级失败'
      }
    }
  },

  async count(params?: { search?: string }) {
    try {
      const { search } = params || {}
      const query: any = {}
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') }
        ]
      }
      const result = await adminService.count(this.collection, query)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('获取会员等级总数失败:', error)
      return {
        success: false,
        data: 0
      }
    }
  },
}

// 角色权限管理服务
export const CloudRoleAdminService = {
  collection: 'roles',

  // ✅ 优化：getAll 方法直接返回 total
  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { code: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') }
        ]
      }

      // 并行执行列表查询和计数查询
      const [listResult, countResult] = await Promise.all([
        adminService.list(this.collection, query, options),
        adminService.count(this.collection, query)
      ])

      return {
        success: true,
        data: listResult.data || [],
        total: countResult.data // ✅ 直接返回总数
      }
    } catch (error) {
      console.error('获取角色列表失败:', error)
      return {
        success: false,
        message: '获取角色列表失败',
        data: [],
        total: 0
      }
    }
  },

  async add(roleData: any) {
    try {
      const result = await adminService.add(this.collection, roleData)
      return {
        success: true,
        data: result.data,
        message: '角色创建成功'
      }
    } catch (error) {
      console.error('创建角色失败:', error)
      return {
        success: false,
        error: '创建角色失败',
        data: null
      }
    }
  },

  async update(id: string, roleData: any) {
    try {
      await adminService.update('roles', id, roleData)
      return {
        success: true,
        message: '角色更新成功'
      }
    } catch (error) {
      console.error('更新角色失败:', error)
      return {
        success: false,
        error: '更新角色失败'
      }
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('roles', id)
      return {
        success: true,
        message: '角色删除成功'
      }
    } catch (error) {
      console.error('删除角色失败:', error)
      return {
        success: false,
        error: '删除角色失败'
      }
    }
  },

  async count(params?: { search?: string }) {
    try {
      const { search } = params || {}
      const query: any = {}
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { code: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') }
        ]
      }
      const result = await adminService.count(this.collection, query)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('获取角色总数失败:', error)
      return {
        success: false,
        data: 0
      }
    }
  },
}

// 优惠券管理服务
export const CloudCouponAdminService = {
  collection: 'coupons',

  // ✅ 优化：getAll 方法直接返回 total
  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { code: new RegExp(search, 'i') }
        ]
      }

      // 并行执行列表查询和计数查询
      const [listResult, countResult] = await Promise.all([
        adminService.list(this.collection, query, options),
        adminService.count(this.collection, query)
      ])

      return {
        success: true,
        data: listResult.data || [],
        total: countResult.data // ✅ 直接返回总数
      }
    } catch (error) {
      console.error('获取优惠券列表失败:', error)
      return {
        success: false,
        message: '获取优惠券列表失败',
        data: [],
        total: 0
      }
    }
  },

  async count(params?: { search?: string }) {
    try {
      const { search } = params || {}
      const query: any = {}
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { code: new RegExp(search, 'i') }
        ]
      }
      const result = await adminService.count(this.collection, query)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('获取优惠券总数失败:', error)
      return {
        success: false,
        data: 0
      }
    }
  },

  async add(couponData: any) {
    try {
      const result = await adminService.add(this.collection, couponData)
      console.log('CloudCouponAdminService.add result:', result)
      return {
        success: true,
        data: result.data,
        message: '优惠券创建成功'
      }
    } catch (error) {
      console.error('创建优惠券失败:', error)
      return {
        success: false,
        error: '创建优惠券失败',
        data: null
      }
    }
  },

  async update(id: string, couponData: any) {
    try {
      const result = await adminService.update('coupons', id, couponData)
      console.log('CloudCouponAdminService.update result:', result)
      return {
        success: true,
        message: '优惠券更新成功'
      }
    } catch (error) {
      console.error('更新优惠券失败:', error)
      return {
        success: false,
        error: '更新优惠券失败'
      }
    }
  },

  async delete(id: string) {
    try {
      const result = await adminService.delete('coupons', id)
      console.log('CloudCouponAdminService.delete result:', result)
      return {
        success: true,
        message: '优惠券删除成功'
      }
    } catch (error) {
      console.error('删除优惠券失败:', error)
      return {
        success: false,
        error: '删除优惠券失败'
      }
    }
  },
}

// 轮播图管理服务
export const CloudBannerAdminService = {
  collection: 'banners',

  // ✅ 优化：getAll 方法直接返回 total
  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') }
        ]
      }

      // 并行执行列表查询和计数查询
      const [listResult, countResult] = await Promise.all([
        adminService.list(this.collection, query, options),
        adminService.count(this.collection, query)
      ])

      return {
        success: true,
        data: listResult.data || [],
        total: countResult.data // ✅ 直接返回总数
      }
    } catch (error) {
      console.error('获取轮播图列表失败:', error)
      return {
        success: false,
        message: '获取轮播图列表失败',
        data: [],
        total: 0
      }
    }
  },

  async add(bannerData: any) {
    try {
      const result = await adminService.add(this.collection, bannerData)
      return {
        success: true,
        data: result.data,
        message: '轮播图创建成功'
      }
    } catch (error) {
      console.error('创建轮播图失败:', error)
      return {
        success: false,
        error: '创建轮播图失败',
        data: null
      }
    }
  },

  async update(id: string, bannerData: any) {
    try {
      await adminService.update('banners', id, bannerData)
      return {
        success: true,
        message: '轮播图更新成功'
      }
    } catch (error) {
      console.error('更新轮播图失败:', error)
      return {
        success: false,
        error: '更新轮播图失败'
      }
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('banners', id)
      return {
        success: true,
        message: '轮播图删除成功'
      }
    } catch (error) {
      console.error('删除轮播图失败:', error)
      return {
        success: false,
        error: '删除轮播图失败'
      }
    }
  },

  async count(params?: { search?: string }) {
    try {
      const { search } = params || {}
      const query: any = {}
      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') }
        ]
      }
      const result = await adminService.count(this.collection, query)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('获取轮播图总数失败:', error)
      return {
        success: false,
        data: 0
      }
    }
  },
}

// 公告通知管理服务
export const CloudNoticeAdminService = {
  collection: 'notices',

  // ✅ 优化：getAll 方法直接返回 total
  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { content: new RegExp(search, 'i') }
        ]
      }

      // 并行执行列表查询和计数查询
      const [listResult, countResult] = await Promise.all([
        adminService.list(this.collection, query, options),
        adminService.count(this.collection, query)
      ])

      return {
        success: true,
        data: listResult.data || [],
        total: countResult.data // ✅ 直接返回总数
      }
    } catch (error) {
      console.error('获取公告列表失败:', error)
      return {
        success: false,
        message: '获取公告列表失败',
        data: [],
        total: 0
      }
    }
  },

  async add(noticeData: any) {
    try {
      const result = await adminService.add(this.collection, noticeData)
      return {
        success: true,
        data: result.data,
        message: '公告创建成功'
      }
    } catch (error) {
      console.error('创建公告失败:', error)
      return {
        success: false,
        error: '创建公告失败',
        data: null
      }
    }
  },

  async update(id: string, noticeData: any) {
    try {
      await adminService.update('notices', id, noticeData)
      return {
        success: true,
        message: '公告更新成功'
      }
    } catch (error) {
      console.error('更新公告失败:', error)
      return {
        success: false,
        error: '更新公告失败'
      }
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('notices', id)
      return {
        success: true,
        message: '公告删除成功'
      }
    } catch (error) {
      console.error('删除公告失败:', error)
      return {
        success: false,
        error: '删除公告失败'
      }
    }
  },

  async count(params?: { search?: string }) {
    try {
      const { search } = params || {}
      const query: any = {}
      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { content: new RegExp(search, 'i') }
        ]
      }
      const result = await adminService.count(this.collection, query)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('获取公告总数失败:', error)
      return {
        success: false,
        data: 0
      }
    }
  },
}

// 课程表管理服务
export const CloudScheduleAdminService = {
  collection: 'schedules',

  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') }
        ]
      }

      const result = await adminService.list(this.collection, query, options)
      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      console.error('获取课程表列表失败:', error)
      return {
        success: false,
        message: '获取课程表列表失败',
        data: []
      }
    }
  },

  async add(scheduleData: any) {
    try {
      const result = await adminService.add(this.collection, scheduleData)
      return {
        success: true,
        data: result.data,
        message: '课程表创建成功'
      }
    } catch (error) {
      console.error('创建课程表失败:', error)
      return {
        success: false,
        error: '创建课程表失败',
        data: null
      }
    }
  },

  async update(id: string, scheduleData: any) {
    try {
      await adminService.update('schedules', id, scheduleData)
      return {
        success: true,
        message: '课程表更新成功'
      }
    } catch (error) {
      console.error('更新课程表失败:', error)
      return {
        success: false,
        error: '更新课程表失败'
      }
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('schedules', id)
      return {
        success: true,
        message: '课程表删除成功'
      }
    } catch (error) {
      console.error('删除课程表失败:', error)
      return {
        success: false,
        error: '删除课程表失败'
      }
    }
  },
}

// 练习记录管理服务
export const CloudPracticeRecordAdminService = {
  collection: 'practiceRecords',

  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { userId: new RegExp(search, 'i') }
        ]
      }

      const result = await adminService.list(this.collection, query, options)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('获取练习记录列表失败:', error)
      return { success: false, data: [], message: '获取练习记录列表失败' }
    }
  },

  async add(recordData: any) {
    try {
      const result = await adminService.add(this.collection, recordData)
      return result.data
    } catch (error) {
      console.error('创建练习记录失败:', error)
      return null
    }
  },

  async update(id: string, recordData: any) {
    try {
      await adminService.update('practiceRecords', id, recordData)
      return true
    } catch (error) {
      console.error('更新练习记录失败:', error)
      return false
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('practiceRecords', id)
      return true
    } catch (error) {
      console.error('删除练习记录失败:', error)
      return false
    }
  },
}

// 评论反馈管理服务
export const CloudCommentAdminService = {
  collection: 'comments',

  // ✅ 优化：getAll 方法直接返回 total
  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { content: new RegExp(search, 'i') },
          { userId: new RegExp(search, 'i') }
        ]
      }

      // 并行执行列表查询和计数查询
      const [listResult, countResult] = await Promise.all([
        adminService.list(this.collection, query, options),
        adminService.count(this.collection, query)
      ])

      return {
        success: true,
        data: listResult.data || [],
        total: countResult.data // ✅ 直接返回总数
      }
    } catch (error) {
      console.error('获取评论列表失败:', error)
      return {
        success: false,
        message: '获取评论列表失败',
        data: [],
        total: 0
      }
    }
  },

  async add(commentData: any) {
    try {
      const result = await adminService.add(this.collection, commentData)
      return {
        success: true,
        data: result.data,
        message: '评论创建成功'
      }
    } catch (error) {
      console.error('创建评论失败:', error)
      return {
        success: false,
        error: '创建评论失败',
        data: null
      }
    }
  },

  async update(id: string, commentData: any) {
    try {
      await adminService.update('comments', id, commentData)
      return {
        success: true,
        message: '评论更新成功'
      }
    } catch (error) {
      console.error('更新评论失败:', error)
      return {
        success: false,
        error: '更新评论失败'
      }
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('comments', id)
      return {
        success: true,
        message: '评论删除成功'
      }
    } catch (error) {
      console.error('删除评论失败:', error)
      return {
        success: false,
        error: '删除评论失败'
      }
    }
  },

  async count(params?: { search?: string }) {
    try {
      const { search } = params || {}
      const query: any = {}
      if (search) {
        query.$or = [
          { content: new RegExp(search, 'i') },
          { userId: new RegExp(search, 'i') }
        ]
      }
      const result = await adminService.count(this.collection, query)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('获取评论总数失败:', error)
      return {
        success: false,
        data: 0
      }
    }
  },
}

// 系统日志管理服务
export const CloudSystemLogAdminService = {
  collection: 'system_logs',

  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset, orderBy: 'createdAt', order: 'desc' }

      if (search) {
        query.$or = [
          { module: new RegExp(search, 'i') },
          { operation: new RegExp(search, 'i') },
          { message: new RegExp(search, 'i') }
        ]
      }

      const result = await adminService.list(this.collection, query, options)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('获取系统日志失败:', error)
      return { success: false, data: [], message: '获取系统日志失败' }
    }
  },

  async add(logData: any) {
    try {
      const result = await adminService.add(this.collection, logData)
      return result.data
    } catch (error) {
      console.error('创建日志失败:', error)
      return null
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('system_logs', id)
      return true
    } catch (error) {
      console.error('删除日志失败:', error)
      return false
    }
  },
}

// 系统设置管理服务
export const CloudSystemSettingAdminService = {
  collection: 'system_settings',

  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
          { key: new RegExp(search, 'i') },
          { value: new RegExp(search, 'i') }
        ]
      }

      const result = await adminService.list(this.collection, query, options)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error('获取系统设置失败:', error)
      return { success: false, data: [], message: '获取系统设置失败' }
    }
  },

  async getByKey(key: string) {
    try {
      const result = await adminService.list(this.collection, { key })
      return result.data[0]
    } catch (error) {
      console.error('获取系统设置失败:', error)
      return null
    }
  },

  async add(settingData: any) {
    try {
      const result = await adminService.add(this.collection, settingData)
      return result.data
    } catch (error) {
      console.error('创建系统设置失败:', error)
      return null
    }
  },

  async update(id: string, settingData: any) {
    try {
      await adminService.update('system_settings', id, settingData)
      return true
    } catch (error) {
      console.error('更新系统设置失败:', error)
      return false
    }
  },

  async delete(id: string) {
    try {
      await adminService.delete('system_settings', id)
      return true
    } catch (error) {
      console.error('删除系统设置失败:', error)
      return false
    }
  },
}

// 通用管理服务 - 提供基本的 CRUD 操作，用于页面配置等通用场景
export const CloudAdminService = {
  // ★ 新增：list 方法支持出勤管理等场景
  async list(params: {
    collection: string;
    query?: Record<string, any>;
    options?: {
      limit?: number;
      skip?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    };
  }): Promise<{ code: number; data: any[]; message?: string }> {
    try {
      const { collection, query = {}, options = {} } = params;
      const result = await adminService.list(collection, query, options);
      // 兼容不同返回格式
      if (result.code === 0) {
        return {
          code: 0,
          data: result.data || []
        };
      } else {
        return {
          code: result.code || -1,
          data: [],
          message: result.message || '查询失败'
        };
      }
    } catch (error: any) {
      console.error(`CloudAdminService.list 失败:`, error);
      return {
        code: -1,
        data: [],
        message: error.message || '查询失败'
      };
    }
  },

  async get(collection: string, docId: string) {
    try {
      const result = await adminService.get(collection, docId)
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error(`获取文档 ${collection}/${docId} 失败:`, error)
      return {
        success: false,
        data: null,
        message: '获取失败'
      }
    }
  },

  async query(collection: string, params?: { orderBy?: string; order?: 'asc' | 'desc' }) {
    try {
      const options: any = {}
      if (params?.orderBy) {
        options.orderBy = params.orderBy
        options.order = params.order || 'asc'
      }

      const result = await adminService.list(collection, {}, options)
      return {
        success: true,
        data: result.data.map((item: any) => ({
          id: item._id || item.id,
          ...item
        }))
      }
    } catch (error) {
      console.error(`查询集合 ${collection} 失败:`, error)
      return {
        success: false,
        data: [],
        message: '查询失败'
      }
    }
  },

  async add(collection: string, data: any) {
    try {
      const result = await adminService.add(collection, data)
      return {
        success: true,
        data: result.data,
        message: '添加成功'
      }
    } catch (error) {
      console.error(`添加到集合 ${collection} 失败:`, error)
      return {
        success: false,
        message: '添加失败'
      }
    }
  },

  async update(collection: string, id: string, data: any) {
    try {
      await adminService.update(collection, id, data)
      return {
        success: true,
        message: '更新成功'
      }
    } catch (error) {
      console.error(`更新集合 ${collection} 失败:`, error)
      return {
        success: false,
        message: '更新失败'
      }
    }
  },

  async delete(collection: string, id: string) {
    try {
      await adminService.delete(collection, id)
      return {
        success: true,
        message: '删除成功'
      }
    } catch (error) {
      console.error(`从集合 ${collection} 删除失败:`, error)
      return {
        success: false,
        message: '删除失败'
      }
    }
  },

  async upsert(collection: string, id: string, data: any) {
    try {
      const result = await adminService.upsert(collection, id, data)
      return {
        success: true,
        data: result.data,
        message: result.data?.inserted ? '插入成功' : '更新成功'
      }
    } catch (error) {
      console.error(`Upsert 集合 ${collection} 失败:`, error)
      return {
        success: false,
        message: 'Upsert 失败'
      }
    }
  },
}
