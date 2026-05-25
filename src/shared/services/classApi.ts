// ============================================================================
// 培训班 API - 共用层（统一通过 adminService HTTP）
// ============================================================================

import { adminService } from '@/services/adminService'
import type { TrainingClass, ClassSchedule, Enrollment, Teacher } from '@/shared/types/class'
import type { Course } from '@/shared/types/course'

function extractList(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result.data)) return result.data;
  if (result.data?.list) return result.data.list;
  if (result.list) return result.list;
  return [];
}

function extractSingle(result: any): any | null {
  if (!result) return null;
  if (result.data && !Array.isArray(result.data) && typeof result.data === 'object') return result.data;
  if (Array.isArray(result.data) && result.data.length > 0) return result.data[0];
  return result.data || null;
}

/**
 * 培训班 API
 */
export const classApi = {
  /**
   * 获取培训班列表
   */
  async getList(filters: {
    status?: TrainingClass['status']
    teacherId?: string
    keyword?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ classes: TrainingClass[], total: number }> {
    const { status, teacherId, keyword, page = 1, pageSize = 10 } = filters
    
    const where: Record<string, any> = {}
    if (status) where.status = status
    if (teacherId) where.teacherId = teacherId
    if (keyword) {
      where.name = { '$regex': keyword }
    }
    
    const hasOperators = keyword !== undefined
    const listResult = hasOperators
      ? await adminService.listWithOps('classes', where, { orderBy: 'createdAt', order: 'desc', page, pageSize })
      : await adminService.list('classes', where, { orderBy: 'createdAt', order: 'desc', page, pageSize })
    
    const classes = extractList(listResult) as TrainingClass[]
    const total = listResult?.data?.total || classes.length

    return { classes, total }
  },

  /**
   * 获取培训班详情（含包含的课程信息）
   */
  async getDetail(classId: string): Promise<{
    class: TrainingClass
    includedCourses: Course[]
    teacher: Teacher | null
  } | null> {
    // 获取培训班信息
    const classResult = await adminService.get('classes', classId)
    const classData = extractSingle(classResult) as TrainingClass
    if (!classData) return null
    
    // 获取包含的课程
    let includedCourses: Course[] = []
    // 优先使用 includedCourseIds（ID数组，新格式）
    let courseIds = classData.includedCourseIds || []
    // 兼容：如果 includedCourseIds 为空但 courseId 存在，使用 courseId
    if (courseIds.length === 0 && classData.courseId) {
      courseIds = [classData.courseId]
    }
    // 兼容旧格式：includedCourses 可能是ID数组（某些旧数据的实际情况）
    if (courseIds.length === 0 && classData.includedCourses && classData.includedCourses.length > 0) {
      // 判断 includedCourses 是ID还是名称：ID通常是24位hex字符串
      const firstItem = classData.includedCourses[0]
      if (typeof firstItem === 'string' && /^[a-f0-9]{24}$/i.test(firstItem)) {
        courseIds = classData.includedCourses
      }
    }
    if (courseIds.length > 0) {
      const coursesResult = await adminService.listWithOps('courses', {
        _id: { '$in': courseIds }
      }, { limit: 100 })
      includedCourses = extractList(coursesResult) as Course[]
    }
    
    // 获取教师信息
    let teacher: Teacher | null = null
    if (classData.teacherId) {
      teacher = extractSingle(await adminService.get('teachers', classData.teacherId)) as Teacher || null
    }
    
    return {
      class: classData,
      includedCourses,
      teacher
    }
  },

  /**
   * 获取可报名的培训班（前台用）
   */
  async getEnrollingClasses(limit: number = 10): Promise<TrainingClass[]> {
    const result = await adminService.list('classes', { status: 'enrolling' }, { orderBy: 'startDate', order: 'asc', limit })
    return extractList(result) as TrainingClass[]
  },

  /**
   * 更新培训班报名人数（使用 $inc 操作符）
   */
  async updateStudentCount(classId: string, delta: number): Promise<void> {
    await adminService.updateWithOps('classes', classId, {
      $inc: { currentStudents: delta } as any,
      updatedAt: new Date().toISOString()
    } as any)
  }
}

/**
 * 排课 API
 */
export const scheduleApi = {
  /**
   * 获取培训班排课列表
   */
  async getByClassId(classId: string): Promise<ClassSchedule[]> {
    const result = await adminService.list('class_schedules', { classId }, { orderBy: 'date', order: 'asc', limit: 100 })
    return extractList(result) as ClassSchedule[]
  },

  /**
   * 获取用户的排课表（我的日程）
   */
  async getByUserId(userId: string): Promise<ClassSchedule[]> {
    // 先获取用户报名的班级
    const enrollmentsResult = await adminService.list('enrollments', { userId, status: 'confirmed' }, { limit: 100 })
    const enrollments = extractList(enrollmentsResult) as Enrollment[]
    const classIds = enrollments.map(e => e.classId)
    
    if (classIds.length === 0) return []
    
    // 获取这些班级的排课
    const schedulesResult = await adminService.listWithOps('class_schedules', {
      classId: { '$in': classIds }
    }, { orderBy: 'date', order: 'asc', limit: 200 })
    
    return extractList(schedulesResult) as ClassSchedule[]
  }
}

/**
 * 报名 API
 */
export const enrollmentApi = {
  /**
   * 创建报名记录
   */
  async create(params: {
    classId: string
    userId: string
    phone: string
    paymentMethod: 'online' | 'offline'
    classInfo: {
      name: string
      includedCourses: string[]
      price: number
    }
  }): Promise<Enrollment> {
    const enrollment: Omit<Enrollment, '_id'> = {
      classId: params.classId,
      className: params.classInfo.name,
      userId: params.userId,
      phone: params.phone,
      paymentMethod: params.paymentMethod,
      paymentStatus: 'pending',
      grantedCourses: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const result = await adminService.add('enrollments', enrollment)
    
    return {
      _id: result.data?.id || '',
      ...enrollment
    } as Enrollment
  },

  /**
   * 确认报名（支付成功后调用）
   */
  async confirmEnrollment(enrollmentId: string, grantedCourses: string[]): Promise<void> {
    await adminService.update('enrollments', enrollmentId, {
      paymentStatus: 'paid',
      status: 'confirmed',
      grantedCourses,
      updatedAt: new Date().toISOString()
    })
    
    // 更新培训班报名人数
    const enrollmentResult = await adminService.get('enrollments', enrollmentId)
    const enrollment = extractSingle(enrollmentResult) as Enrollment
    if (enrollment) {
      await classApi.updateStudentCount(enrollment.classId, 1)
    }
  },

  /**
   * 管理员确认线下缴费
   */
  async confirmOfflinePayment(enrollmentId: string, params: {
    confirmedBy: string
    remark?: string
  }): Promise<void> {
    const enrollmentResult = await adminService.get('enrollments', enrollmentId)
    const enrollmentData = extractSingle(enrollmentResult) as Enrollment
    if (!enrollmentData) throw new Error('报名记录不存在')
    
    // 获取培训班信息，拿到包含的课程
    const classDetail = await classApi.getDetail(enrollmentData.classId)
    const grantedCourses = classDetail?.class.includedCourses || []
    
    await adminService.update('enrollments', enrollmentId, {
      paymentStatus: 'confirmed',
      status: 'confirmed',
      grantedCourses,
      offlinePayment: {
        amount: classDetail?.class.price || 0,
        paidAt: new Date().toISOString(),
        confirmedBy: params.confirmedBy,
        confirmedAt: new Date().toISOString(),
        remark: params.remark
      },
      updatedAt: new Date().toISOString()
    })
    
    // 更新培训班报名人数
    await classApi.updateStudentCount(enrollmentData.classId, 1)
    
    // 授权课程
    for (const courseId of grantedCourses) {
      await adminService.add('course_permissions', {
        userId: enrollmentData.userId,
        courseId,
        source: 'class_enrollment',
        sourceId: enrollmentId,
        createdAt: new Date().toISOString()
      })
    }
  },

  /**
   * 获取用户的报名记录
   */
  async getByUserId(userId: string): Promise<Enrollment[]> {
    const result = await adminService.list('enrollments', { userId }, { orderBy: 'createdAt', order: 'desc', limit: 100 })
    return extractList(result) as Enrollment[]
  },

  /**
   * 获取培训班的报名列表（后台用）
   */
  async getByClassId(classId: string): Promise<Enrollment[]> {
    const result = await adminService.list('enrollments', { classId }, { orderBy: 'createdAt', order: 'desc', limit: 100 })
    return extractList(result) as Enrollment[]
  }
}

/**
 * 教师 API
 */
export const teacherApi = {
  /**
   * 获取教师列表
   */
  async getList(): Promise<Teacher[]> {
    const result = await adminService.list('teachers', { status: 'active' }, { orderBy: 'createdAt', order: 'desc', limit: 100 })
    return extractList(result) as Teacher[]
  },

  /**
   * 获取教师详情
   */
  async getDetail(teacherId: string): Promise<Teacher | null> {
    return extractSingle(await adminService.get('teachers', teacherId)) as Teacher || null
  }
}
