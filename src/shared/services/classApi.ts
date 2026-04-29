// ============================================================================
// 培训班 API - 共用层
// ============================================================================

import { app } from '@/utils/cloudbase'
import type { TrainingClass, ClassSchedule, Enrollment, Teacher } from '@/shared/types/class'
import type { Course } from '@/shared/types/course'

const db = app.database()
const _ = db.command

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
    
    const where: any = {}
    if (status) where.status = status
    if (teacherId) where.teacherId = teacherId
    if (keyword) {
      where.name = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    }
    
    const countResult = await db.collection('classes').where(where).count()
    const total = countResult.total
    
    const skip = (page - 1) * pageSize
    const result = await db.collection('classes')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    return {
      classes: result.data as TrainingClass[],
      total
    }
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
    const classResult = await db.collection('classes').doc(classId).get()
    if (!classResult.data) return null
    
    const classData = classResult.data as TrainingClass
    
    // 获取包含的课程
    let includedCourses: Course[] = []
    if (classData.includedCourses && classData.includedCourses.length > 0) {
      const coursesResult = await db.collection('courses')
        .where({ _id: _.in(classData.includedCourses) })
        .get()
      includedCourses = coursesResult.data as Course[]
    }
    
    // 获取教师信息
    let teacher: Teacher | null = null
    if (classData.teacherId) {
      const teacherResult = await db.collection('teachers').doc(classData.teacherId).get()
      teacher = teacherResult.data as Teacher || null
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
    const result = await db.collection('classes')
      .where({ status: 'enrolling' })
      .orderBy('startDate', 'asc')
      .limit(limit)
      .get()
    
    return result.data as TrainingClass[]
  },

  /**
   * 更新培训班报名人数
   */
  async updateStudentCount(classId: string, delta: number): Promise<void> {
    await db.collection('classes').doc(classId).update({
      currentStudents: _.inc(delta),
      updatedAt: new Date().toISOString()
    })
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
    const result = await db.collection('class_schedules')
      .where({ classId })
      .orderBy('date', 'asc')
      .orderBy('startTime', 'asc')
      .get()
    
    return result.data as ClassSchedule[]
  },

  /**
   * 获取用户的排课表（我的日程）
   */
  async getByUserId(userId: string): Promise<ClassSchedule[]> {
    // 先获取用户报名的班级
    const enrollmentsResult = await db.collection('enrollments')
      .where({ userId, status: 'confirmed' })
      .get()
    
    const classIds = enrollmentsResult.data.map((e: any) => e.classId)
    
    if (classIds.length === 0) return []
    
    // 获取这些班级的排课
    const schedulesResult = await db.collection('class_schedules')
      .where({ classId: _.in(classIds) })
      .orderBy('date', 'asc')
      .orderBy('startTime', 'asc')
      .get()
    
    return schedulesResult.data as ClassSchedule[]
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
      paymentStatus: params.paymentMethod === 'online' ? 'pending' : 'pending',
      grantedCourses: [], // 支付确认后授权
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const result = await db.collection('enrollments').add(enrollment)
    
    return {
      _id: result.id || result.insertedId as string,
      ...enrollment
    } as Enrollment
  },

  /**
   * 确认报名（支付成功后调用）
   */
  async confirmEnrollment(enrollmentId: string, grantedCourses: string[]): Promise<void> {
    await db.collection('enrollments').doc(enrollmentId).update({
      paymentStatus: 'paid',
      status: 'confirmed',
      grantedCourses,
      updatedAt: new Date().toISOString()
    })
    
    // 更新培训班报名人数
    const enrollment = await db.collection('enrollments').doc(enrollmentId).get()
    if (enrollment.data) {
      await classApi.updateStudentCount((enrollment.data as Enrollment).classId, 1)
    }
  },

  /**
   * 管理员确认线下缴费
   */
  async confirmOfflinePayment(enrollmentId: string, params: {
    confirmedBy: string
    remark?: string
  }): Promise<void> {
    const enrollment = await db.collection('enrollments').doc(enrollmentId).get()
    if (!enrollment.data) throw new Error('报名记录不存在')
    
    const enrollmentData = enrollment.data as Enrollment
    
    // 获取培训班信息，拿到包含的课程
    const classDetail = await classApi.getDetail(enrollmentData.classId)
    const grantedCourses = classDetail?.class.includedCourses || []
    
    await db.collection('enrollments').doc(enrollmentId).update({
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
      await db.collection('course_permissions').add({
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
    const result = await db.collection('enrollments')
      .where({ userId })
      .orderBy('createdAt', 'desc')
      .get()
    
    return result.data as Enrollment[]
  },

  /**
   * 获取培训班的报名列表（后台用）
   */
  async getByClassId(classId: string): Promise<Enrollment[]> {
    const result = await db.collection('enrollments')
      .where({ classId })
      .orderBy('createdAt', 'desc')
      .get()
    
    return result.data as Enrollment[]
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
    const result = await db.collection('teachers')
      .where({ status: 'active' })
      .orderBy('createdAt', 'desc')
      .get()
    
    return result.data as Teacher[]
  },

  /**
   * 获取教师详情
   */
  async getDetail(teacherId: string): Promise<Teacher | null> {
    const result = await db.collection('teachers').doc(teacherId).get()
    return result.data as Teacher || null
  }
}