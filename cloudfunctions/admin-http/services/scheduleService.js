/**
 * 排课服务 - 符合生产规范的排课管理
 */

const Validator = require('../lib/validator')
const ApiResponse = require('../lib/response')

class ScheduleService {
  constructor(db, _) {
    this.db = db
    this._ = _
  }

  /**
   * 获取排课列表
   */
  async list(options = {}) {
    const { 
      page = 1, 
      pageSize = 20, 
      status, 
      courseId, 
      teacherId,
      startDate,
      endDate,
      orderBy = 'date',
      order = 'desc'
    } = options

    const paginationResult = Validator.pagination({ page, pageSize })
    if (!paginationResult.valid) {
      return ApiResponse.error(400, paginationResult.error)
    }

    let query = {}

    // 状态筛选
    if (status && status !== 'all') {
      query.status = status
    }

    // 课程筛选
    if (courseId) {
      query.courseId = courseId
    }

    // 教师筛选
    if (teacherId) {
      query.teacherId = teacherId
    }

    // 日期范围
    if (startDate || endDate) {
      const dateResult = Validator.dateRange(startDate, endDate)
      if (!dateResult.valid) {
        return ApiResponse.error(400, dateResult.error)
      }
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }

    const skip = (paginationResult.page - 1) * paginationResult.pageSize

    const result = await this.db.collection('course_schedules')
      .where(query)
      .orderBy(orderBy, order)
      .skip(skip)
      .limit(paginationResult.pageSize)
      .get()

    // 获取关联数据
    const schedulesWithDetails = await this.enrichSchedules(result.data)

    // 获取总数
    const countResult = await this.db.collection('course_schedules')
      .where(query)
      .count()

    return ApiResponse.paginated(
      schedulesWithDetails,
      countResult.total,
      paginationResult.page,
      paginationResult.pageSize,
      '查询成功'
    )
  }

  /**
   * 获取排课详情
   */
  async get(scheduleId) {
    const idValidation = Validator.id(scheduleId)
    if (!idValidation.valid) {
      return ApiResponse.error(400, idValidation.error)
    }

    const result = await this.db.collection('course_schedules')
      .doc(scheduleId)
      .get()

    if (!result.data || result.data.length === 0) {
      return ApiResponse.error(404, '排课不存在')
    }

    const enriched = await this.enrichSchedules(result.data)
    return ApiResponse.success(enriched[0], '查询成功')
  }

  /**
   * 创建排课
   */
  async create(data, userId) {
    const validation = Validator.validate(data, {
      courseId: { required: true },
      teacherId: { required: true },
      date: { required: true },
      startTime: { required: true },
      endTime: { required: true },
      location: { required: true },
      maxStudents: { type: 'number' }
    })

    if (!validation.valid) {
      return ApiResponse.error(400, validation.errors.join('; '))
    }

    const now = new Date().toISOString()
    const scheduleData = {
      ...Validator.sanitize(data, ['courseId', 'courseName', 'teacherId', 'teacherName', 'date', 'startTime', 'endTime', 'location', 'maxStudents', 'description']),
      enrolledCount: 0,
      status: 'open',
      createdBy: userId,
      createdAt: now,
      updatedAt: now
    }

    delete scheduleData._id

    const result = await this.db.collection('course_schedules').add(scheduleData)

    return ApiResponse.success({
      id: result.id,
      ...scheduleData
    }, '排课创建成功')
  }

  /**
   * 更新排课
   */
  async update(scheduleId, data, userId) {
    const idValidation = Validator.id(scheduleId)
    if (!idValidation.valid) {
      return ApiResponse.error(400, idValidation.error)
    }

    const updateData = {
      ...Validator.sanitize(data, ['courseId', 'courseName', 'teacherId', 'teacherName', 'date', 'startTime', 'endTime', 'location', 'maxStudents', 'description', 'status']),
      updatedBy: userId,
      updatedAt: new Date().toISOString()
    }

    delete updateData._id
    delete updateData.createdAt

    const result = await this.db.collection('course_schedules')
      .doc(scheduleId)
      .update(updateData)

    if (result.code) {
      return ApiResponse.error(500, result.message || '更新失败')
    }

    return ApiResponse.success({ id: scheduleId, ...updateData }, '排课更新成功')
  }

  /**
   * 删除排课
   */
  async delete(scheduleId) {
    const idValidation = Validator.id(scheduleId)
    if (!idValidation.valid) {
      return ApiResponse.error(400, idValidation.error)
    }

    // 检查是否有已报名的学员
    const enrollmentCheck = await this.db.collection('enrollments')
      .where({ scheduleId, status: { $nin: ['cancelled', 'completed'] } })
      .count()

    if (enrollmentCheck.total > 0) {
      return ApiResponse.error(409, `该排课已有 ${enrollmentCheck.total} 名学员报名，无法删除`)
    }

    const result = await this.db.collection('course_schedules')
      .doc(scheduleId)
      .remove()

    if (result.deleted === 0) {
      return ApiResponse.error(404, '排课不存在')
    }

    return ApiResponse.success({ deleted: result.deleted }, '排课删除成功')
  }

  /**
   * 丰富排课数据（关联课程和教师信息）
   */
  async enrichSchedules(schedules) {
    if (!schedules || schedules.length === 0) {
      return []
    }

    // 收集关联 ID
    const courseIds = [...new Set(schedules.map(s => s.courseId).filter(Boolean))]
    const teacherIds = [...new Set(schedules.map(s => s.teacherId).filter(Boolean))]

    // 查询课程信息
    let coursesMap = {}
    if (courseIds.length > 0) {
      const courses = await this.db.collection('courses')
        .where({ _id: this._.in(courseIds) })
        .field({ _id: true, title: true, coverImage: true, price: true })
        .limit(100)
        .get()
      courses.data?.forEach(c => { coursesMap[c._id] = c })
    }

    // 查询教师信息
    let teachersMap = {}
    if (teacherIds.length > 0) {
      const teachers = await this.db.collection('teachers')
        .where({ _id: this._.in(teacherIds) })
        .field({ _id: true, name: true, avatar: true, phone: true })
        .limit(100)
        .get()
      teachers.data?.forEach(t => { teachersMap[t._id] = t })
    }

    // 合并数据
    return schedules.map(schedule => ({
      ...schedule,
      courseInfo: coursesMap[schedule.courseId] || null,
      teacherInfo: teachersMap[schedule.teacherId] || null
    }))
  }
}

module.exports = ScheduleService
