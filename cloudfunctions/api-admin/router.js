/**
 * 路由分发器 - 符合生产规范的请求路由
 */

const { Permission, ROLES } = require('./lib/permission')
const CourseService = require('./services/courseService')
const ScheduleService = require('./services/scheduleService')
const TransferService = require('./services/transferService')
const DashboardService = require('./services/dashboardService')
const ApiResponse = require('./lib/response')
const Validator = require('./lib/validator')

class Router {
  constructor(db, _) {
    this.db = db
    this._ = _
    
    // 初始化服务
    this.courseService = new CourseService(db, _)
    this.scheduleService = new ScheduleService(db, _)
    this.transferService = new TransferService(db, _)
    this.dashboardService = new DashboardService(db)
    
    // 路由映射
    this.routes = {
      // ========== 新版模块化 action ==========
      // 课程管理
      'course.list': { handler: this.handleCourseList.bind(this), permission: ['list'] },
      'course.get': { handler: this.handleCourseGet.bind(this), permission: ['get'] },
      'course.create': { handler: this.handleCourseCreate.bind(this), permission: ['add'] },
      'course.update': { handler: this.handleCourseUpdate.bind(this), permission: ['update'] },
      'course.delete': { handler: this.handleCourseDelete.bind(this), permission: ['delete'] },
      
      // 排课管理
      'schedule.list': { handler: this.handleScheduleList.bind(this), permission: ['list'] },
      'schedule.get': { handler: this.handleScheduleGet.bind(this), permission: ['get'] },
      'schedule.create': { handler: this.handleScheduleCreate.bind(this), permission: ['add'] },
      'schedule.update': { handler: this.handleScheduleUpdate.bind(this), permission: ['update'] },
      'schedule.delete': { handler: this.handleScheduleDelete.bind(this), permission: ['delete'] },
      
      // 调课申请
      'transfer.list': { handler: this.handleTransferList.bind(this), permission: ['list'] },
      'transfer.get': { handler: this.handleTransferGet.bind(this), permission: ['get'] },
      'transfer.create': { handler: this.handleTransferCreate.bind(this), permission: ['add'] },
      'transfer.review': { handler: this.handleTransferReview.bind(this), permission: ['update'] },
      'transfer.cancel': { handler: this.handleTransferCancel.bind(this), permission: ['update'] },
      'transfer.statistics': { handler: this.handleTransferStatistics.bind(this), permission: ['list'] },
      
      // 仪表板
      'dashboard.stats': { handler: this.handleDashboardStats.bind(this), permission: ['list'] },
      'dashboard.enrollmentTrend': { handler: this.handleEnrollmentTrend.bind(this), permission: ['list'] },
      'dashboard.courseRanking': { handler: this.handleCourseRanking.bind(this), permission: ['list'] },

      // ========== 旧版兼容 action ==========
      // 通用 CRUD（兼容前端旧代码）
      'list': { handler: this.handleLegacyList.bind(this), permission: ['list'] },
      'get': { handler: this.handleLegacyGet.bind(this), permission: ['get'] },
      'add': { handler: this.handleLegacyAdd.bind(this), permission: ['add'] },
      'update': { handler: this.handleLegacyUpdate.bind(this), permission: ['update'] },
      'delete': { handler: this.handleLegacyDelete.bind(this), permission: ['delete'] },
      'count': { handler: this.handleLegacyCount.bind(this), permission: ['list'] },
      'batchDelete': { handler: this.handleLegacyBatchDelete.bind(this), permission: ['delete'] },
      'upsert': { handler: this.handleLegacyUpsert.bind(this), permission: ['add', 'update'] },
      
      // 其他旧接口
      'listSchedules': { handler: this.handleScheduleList.bind(this), permission: ['list'] },
      'getScheduleWithDetails': { handler: this.handleScheduleGet.bind(this), permission: ['get'] },
      'listMyRequests': { handler: this.handleTransferList.bind(this), permission: ['list'] },
      'getRequestDetail': { handler: this.handleTransferGet.bind(this), permission: ['get'] },
      'createRequest': { handler: this.handleTransferCreate.bind(this), permission: ['add'] },
      'cancelRequest': { handler: this.handleTransferCancel.bind(this), permission: ['update'] },
      'getDashboardStats': { handler: this.handleDashboardStats.bind(this), permission: ['list'] }
    }
  }

  /**
   * 执行路由
   */
  async execute(action, params, authResult) {
    const route = this.routes[action]
    
    if (!route) {
      return ApiResponse.error(404, `未知的接口: ${action}`)
    }
    
    // 权限检查
    const roleInfo = Permission.getRoleInfo(authResult)
    
    // 获取集合名称（如果有）
    const collection = params.collection || this.getCollectionFromAction(action)
    
    if (collection) {
      // 检查集合权限
      const permissionCheck = Permission.check(roleInfo.role, route.permission[0], collection)
      if (!permissionCheck.allowed) {
        console.warn(`[Router] 权限拒绝: ${roleInfo.role} -> ${route.permission[0]} ${collection}`)
        return ApiResponse.error(403, permissionCheck.error || '权限不足')
      }
      
      // 获取数据过滤条件
      params._userFilter = Permission.getDataFilter(roleInfo.role, roleInfo.userId, collection)
    }
    
    // 添加用户信息到参数
    params._userId = roleInfo.userId
    params._role = roleInfo.role
    
    try {
      // 执行处理器
      const result = await route.handler(params)
      return result
    } catch (error) {
      console.error(`[Router] 执行 ${action} 失败:`, error)
      return ApiResponse.error(500, '服务器内部错误')
    }
  }

  /**
   * 从 action 获取集合名称
   */
  getCollectionFromAction(action) {
    const collectionMap = {
      'course': 'courses',
      'schedule': 'course_schedules',
      'transfer': 'transfer_requests',
      'teacher': 'teachers',
      'student': 'students',
      'enrollment': 'enrollments',
      'order': 'orders'
    }
    
    const prefix = action.split('.')[0]
    return collectionMap[prefix] || null
  }

  // ==================== 课程管理 ====================

  async handleCourseList(params) {
    return await this.courseService.list({
      page: params.page,
      pageSize: params.pageSize,
      status: params.status,
      category: params.category,
      keyword: params.keyword
    })
  }

  async handleCourseGet(params) {
    return await this.courseService.get(params.id || params.docId)
  }

  async handleCourseCreate(params) {
    return await this.courseService.create(params.data, params._userId)
  }

  async handleCourseUpdate(params) {
    return await this.courseService.update(params.id || params.docId, params.data, params._userId)
  }

  async handleCourseDelete(params) {
    return await this.courseService.delete(params.id || params.docId)
  }

  // ==================== 排课管理 ====================

  async handleScheduleList(params) {
    return await this.scheduleService.list({
      page: params.page,
      pageSize: params.pageSize,
      status: params.status,
      courseId: params.courseId,
      teacherId: params.teacherId,
      startDate: params.startDate,
      endDate: params.endDate
    })
  }

  async handleScheduleGet(params) {
    return await this.scheduleService.get(params.id || params.docId)
  }

  async handleScheduleCreate(params) {
    return await this.scheduleService.create(params.data, params._userId)
  }

  async handleScheduleUpdate(params) {
    return await this.scheduleService.update(params.id || params.docId, params.data, params._userId)
  }

  async handleScheduleDelete(params) {
    return await this.scheduleService.delete(params.id || params.docId)
  }

  // ==================== 调课申请 ====================

  async handleTransferList(params) {
    // 非管理员只能查看自己的申请
    const userFilter = params._role === ROLES.STUDENT 
      ? { studentId: params._userId }
      : {}
    
    return await this.transferService.list({
      page: params.page,
      pageSize: params.pageSize,
      status: params.status,
      transferType: params.transferType
    }, userFilter)
  }

  async handleTransferGet(params) {
    return await this.transferService.get(params.id || params.docId)
  }

  async handleTransferCreate(params) {
    return await this.transferService.create(params.data)
  }

  async handleTransferReview(params) {
    // 只有管理员可以审核
    if (params._role !== ROLES.ADMIN && params._role !== ROLES.SUPER_ADMIN) {
      return ApiResponse.error(403, '只有管理员可以审核调课申请')
    }
    
    return await this.transferService.review(params.id || params.docId, params.data, {
      userId: params._userId,
      userName: params.adminName
    })
  }

  async handleTransferCancel(params) {
    return await this.transferService.cancel(params.id || params.docId, params._userId)
  }

  async handleTransferStatistics(params) {
    return await this.transferService.statistics()
  }

  // ==================== 仪表板 ====================

  async handleDashboardStats(params) {
    return await this.dashboardService.getStats()
  }

  async handleEnrollmentTrend(params) {
    return await this.dashboardService.getEnrollmentTrend(params.days || 7)
  }

  async handleCourseRanking(params) {
    return await this.dashboardService.getCourseRanking(params.limit || 10)
  }

  // ==================== 旧版兼容处理 ====================

  /**
   * 通用列表查询（兼容旧版）
   */
  async handleLegacyList(params) {
    const collection = params.collection || 'courses'
    const page = params.page || 1
    const pageSize = Math.min(params.pageSize || 20, 100)
    const skip = (page - 1) * pageSize

    try {
      let query = this.db.collection(collection)
      
      // 应用查询条件
      if (params.query && Object.keys(params.query).length > 0) {
        query = query.where(params.query)
      }
      
      // 应用状态筛选
      if (params.status) {
        query = query.where({ status: params.status })
      }
      
      // 获取总数
      const countResult = await query.count()
      const total = countResult.total
      
      // 获取数据
      const dataResult = await query
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()
      
      return ApiResponse.paginated(dataResult.data, page, pageSize, total)
    } catch (error) {
      console.error(`[Router] handleLegacyList 失败:`, error)
      return ApiResponse.error(500, '查询失败: ' + error.message)
    }
  }

  /**
   * 通用获取单条记录（兼容旧版）
   */
  async handleLegacyGet(params) {
    const collection = params.collection || 'courses'
    const docId = params.docId || params.id
    
    if (!docId) {
      return ApiResponse.error(400, '缺少文档ID')
    }
    
    try {
      const result = await this.db.collection(collection).doc(docId).get()
      
      if (result.data && result.data.length > 0) {
        return ApiResponse.success(result.data[0])
      } else {
        return ApiResponse.error(404, '记录不存在')
      }
    } catch (error) {
      console.error(`[Router] handleLegacyGet 失败:`, error)
      return ApiResponse.error(500, '获取失败: ' + error.message)
    }
  }

  /**
   * 通用添加记录（兼容旧版）
   */
  async handleLegacyAdd(params) {
    const collection = params.collection || 'courses'
    const data = params.data || params
    
    if (!data || Object.keys(data).length === 0) {
      return ApiResponse.error(400, '缺少数据')
    }
    
    try {
      // 添加时间戳
      data.createdAt = new Date().toISOString()
      data.updatedAt = data.createdAt
      
      const result = await this.db.collection(collection).add({ data })
      
      return ApiResponse.success({ id: result.id }, '添加成功')
    } catch (error) {
      console.error(`[Router] handleLegacyAdd 失败:`, error)
      return ApiResponse.error(500, '添加失败: ' + error.message)
    }
  }

  /**
   * 通用更新记录（兼容旧版）
   */
  async handleLegacyUpdate(params) {
    const collection = params.collection || 'courses'
    const docId = params.docId || params.id
    const data = params.data
    
    if (!docId) {
      return ApiResponse.error(400, '缺少文档ID')
    }
    
    if (!data || Object.keys(data).length === 0) {
      return ApiResponse.error(400, '缺少更新数据')
    }
    
    try {
      // 更新时间戳
      data.updatedAt = new Date().toISOString()
      // 移除可能导致问题的字段
      delete data._id
      delete data._openid
      
      await this.db.collection(collection).doc(docId).update({ data })
      
      return ApiResponse.success({ id: docId }, '更新成功')
    } catch (error) {
      console.error(`[Router] handleLegacyUpdate 失败:`, error)
      return ApiResponse.error(500, '更新失败: ' + error.message)
    }
  }

  /**
   * 通用删除记录（兼容旧版）
   */
  async handleLegacyDelete(params) {
    const collection = params.collection || 'courses'
    const docId = params.docId || params.id
    
    if (!docId) {
      return ApiResponse.error(400, '缺少文档ID')
    }
    
    try {
      await this.db.collection(collection).doc(docId).remove()
      
      return ApiResponse.success({ id: docId }, '删除成功')
    } catch (error) {
      console.error(`[Router] handleLegacyDelete 失败:`, error)
      return ApiResponse.error(500, '删除失败: ' + error.message)
    }
  }

  /**
   * 通用统计数量（兼容旧版）
   */
  async handleLegacyCount(params) {
    const collection = params.collection || 'courses'
    
    try {
      let query = this.db.collection(collection)
      
      if (params.query && Object.keys(params.query).length > 0) {
        query = query.where(params.query)
      }
      
      const result = await query.count()
      
      return ApiResponse.success({ total: result.total })
    } catch (error) {
      console.error(`[Router] handleLegacyCount 失败:`, error)
      return ApiResponse.error(500, '统计失败: ' + error.message)
    }
  }

  /**
   * 通用批量删除（兼容旧版）
   */
  async handleLegacyBatchDelete(params) {
    const collection = params.collection || 'courses'
    const query = params.query
    
    if (!query || Object.keys(query).length === 0) {
      return ApiResponse.error(400, '缺少删除条件')
    }
    
    try {
      const result = await this.db.collection(collection).where(query).remove()
      
      return ApiResponse.success({ deleted: result.deleted }, `删除了 ${result.deleted} 条记录`)
    } catch (error) {
      console.error(`[Router] handleLegacyBatchDelete 失败:`, error)
      return ApiResponse.error(500, '批量删除失败: ' + error.message)
    }
  }

  /**
   * 通用 Upsert（存在则更新，不存在则创建）
   */
  async handleLegacyUpsert(params) {
    const collection = params.collection || 'courses'
    const docId = params.id || params.docId
    const data = params.data
    
    if (!docId) {
      return ApiResponse.error(400, '缺少文档ID')
    }
    
    if (!data || Object.keys(data).length === 0) {
      return ApiResponse.error(400, '缺少数据')
    }
    
    try {
      // 检查文档是否存在
      const existing = await this.db.collection(collection).doc(docId).get()
      
      if (existing.data && existing.data.length > 0) {
        // 存在则更新
        data.updatedAt = new Date().toISOString()
        delete data._id
        delete data._openid
        
        await this.db.collection(collection).doc(docId).update({ data })
        
        return ApiResponse.success({ id: docId, inserted: false }, '更新成功')
      } else {
        // 不存在则创建
        data._id = docId
        data.createdAt = new Date().toISOString()
        data.updatedAt = data.createdAt
        
        await this.db.collection(collection).add({ data })
        
        return ApiResponse.success({ id: docId, inserted: true }, '创建成功')
      }
    } catch (error) {
      console.error(`[Router] handleLegacyUpsert 失败:`, error)
      return ApiResponse.error(500, 'Upsert 失败: ' + error.message)
    }
  }
}

module.exports = Router
