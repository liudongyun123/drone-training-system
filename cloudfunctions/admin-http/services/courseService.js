/**
 * 课程服务 - 符合生产规范的课程管理
 */

const Validator = require('../lib/validator')
const ApiResponse = require('../lib/response')

class CourseService {
  constructor(db, _) {
    this.db = db
    this._ = _
  }

  /**
   * 获取课程列表
   */
  async list(options = {}) {
    const { page = 1, pageSize = 20, status, category, keyword, orderBy = 'createdAt', order = 'desc' } = options
    
    // 参数校验
    const paginationResult = Validator.pagination({ page, pageSize })
    if (!paginationResult.valid) {
      return ApiResponse.error(400, paginationResult.error)
    }

    let query = {}
    
    // 状态筛选
    if (status && status !== 'all') {
      query.status = status
    }
    
    // 分类筛选
    if (category && category !== 'all') {
      query.category = category
    }
    
    // 关键字搜索
    if (keyword) {
      query.title = { $regex: keyword }
    }

    const skip = (paginationResult.page - 1) * paginationResult.pageSize
    
    const result = await this.db.collection('courses')
      .where(query)
      .orderBy(orderBy, order)
      .skip(skip)
      .limit(paginationResult.pageSize)
      .get()
    
    // 获取总数
    const countResult = await this.db.collection('courses')
      .where(query)
      .count()

    return ApiResponse.paginated(
      result.data,
      countResult.total,
      paginationResult.page,
      paginationResult.pageSize,
      '查询成功'
    )
  }

  /**
   * 获取课程详情
   */
  async get(courseId) {
    // 参数校验
    const idValidation = Validator.id(courseId)
    if (!idValidation.valid) {
      return ApiResponse.error(400, idValidation.error)
    }

    const result = await this.db.collection('courses')
      .doc(courseId)
      .get()

    if (!result.data || result.data.length === 0) {
      return ApiResponse.error(404, '课程不存在')
    }

    return ApiResponse.success(result.data[0], '查询成功')
  }

  /**
   * 创建课程
   */
  async create(data, userId) {
    // 参数校验
    const validation = Validator.validate(data, {
      title: { required: true, min: 2, max: 100 },
      category: { required: true },
      level: { required: true, enum: ['beginner', 'intermediate', 'advanced'] },
      price: { required: true, type: 'number' },
      duration: { type: 'number' }
    })

    if (!validation.valid) {
      return ApiResponse.error(400, validation.errors.join('; '))
    }

    const now = new Date().toISOString()
    const courseData = {
      ...Validator.sanitize(data, ['title', 'category', 'level', 'price', 'duration', 'description', 'coverImage', 'syllabus', 'requirements']),
      _openid: '{admin}',
      createdBy: userId,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }

    const result = await this.db.collection('courses').add(courseData)

    return ApiResponse.success({
      id: result.id,
      ...courseData
    }, '课程创建成功')
  }

  /**
   * 更新课程
   */
  async update(courseId, data, userId) {
    // 参数校验
    const idValidation = Validator.id(courseId)
    if (!idValidation.valid) {
      return ApiResponse.error(400, idValidation.error)
    }

    const updateData = {
      ...Validator.sanitize(data, ['title', 'category', 'level', 'price', 'duration', 'description', 'coverImage', 'syllabus', 'requirements', 'status']),
      updatedBy: userId,
      updatedAt: new Date().toISOString()
    }

    delete updateData._id
    delete updateData.createdAt
    delete updateData.createdBy

    const result = await this.db.collection('courses')
      .doc(courseId)
      .update(updateData)

    if (result.code) {
      return ApiResponse.error(500, result.message || '更新失败')
    }

    return ApiResponse.success({ id: courseId, ...updateData }, '课程更新成功')
  }

  /**
   * 删除课程
   */
  async delete(courseId) {
    const idValidation = Validator.id(courseId)
    if (!idValidation.valid) {
      return ApiResponse.error(400, idValidation.error)
    }

    const result = await this.db.collection('courses')
      .doc(courseId)
      .remove()

    if (result.deleted === 0) {
      return ApiResponse.error(404, '课程不存在')
    }

    return ApiResponse.success({ deleted: result.deleted }, '课程删除成功')
  }
}

module.exports = CourseService
