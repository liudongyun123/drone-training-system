// @ts-nocheck
/**
 * 学员人员管理（收口）服务
 * 版本: v20260714-class-members-hub
 *
 * 设计原则（单一真相源）：
 * - 班级名单 = enrollments（classId 有值，status 在读）
 * - 视频/课程权限 = course_permissions
 * - 不再独立写 class_members 集合（保留只读，逐步废弃）
 *
 * 调班 = 改 enrollments.classId + 两个班级计数 ±1（兼容 capacity / maxStudents 两种格式）
 */
import { CloudDBService } from './CloudDBService'

// 在读状态（出现在班级名单里）
const ROSTER_STATUSES = ['active', 'confirmed', 'learning']

// 计算班级已报/剩余（兼容 capacity 与 maxStudents 两种格式）
const classCountInfo = (cls) => {
  const cap = cls?.capacity || {}
  const enrolled = cap.confirmed ?? cap.enrolled ?? cls?.enrolledCount ?? 0
  const max = cap.max ?? cls?.maxStudents ?? 0
  return { enrolled, max, remaining: Math.max(0, max - enrolled) }
}

export const classMemberService = {
  // ===================== 班级名单 =====================

  // 班级列表（附剩余名额）
  async getClasses({ courseId, status } = {}) {
    const where = {}
    if (courseId) where.courseId = courseId
    if (status) where.status = status
    const res = await CloudDBService.query('classes', {
      where, orderBy: 'startDate', order: 'desc', limit: 200
    })
    return (res.data || []).map((c) => {
      const { enrolled, max, remaining } = classCountInfo(c)
      return { ...c, _enrolled: enrolled, _max: max, _remaining: remaining }
    })
  },

  // 班级在读名单
  async getClassRoster(classId, { keyword = '', statuses }: { keyword?: string; statuses?: string[] } = {}) {
    const where = { classId, status: statuses || { $in: ROSTER_STATUSES } }
    if (keyword) {
      where.$or = [
        { studentName: { $regex: keyword, $options: 'i' } },
        { userName: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } }
      ]
    }
    const res = await CloudDBService.query('enrollments', {
      where, orderBy: 'enrollmentTime', order: 'desc', limit: 500
    })
    return res.data || []
  },

  // 待审核报名（该班级）
  async getPendingEnrollments(classId) {
    const res = await CloudDBService.query('enrollments', {
      where: { classId, status: 'pending' },
      orderBy: 'enrollmentTime', order: 'desc', limit: 500
    })
    return res.data || []
  },

  // 确认入班（审核收口）
  async confirmEnrollment(enrollmentId, reviewer = {}) {
    const enr = await CloudDBService.get('enrollments', enrollmentId)
    if (!enr) return { code: -1, message: '报名记录不存在' }
    await CloudDBService.update('enrollments', enrollmentId, {
      status: 'confirmed',
      review: {
        reviewerId: reviewer.id || 'admin',
        reviewerName: reviewer.name || '管理员',
        reviewedAt: new Date().toISOString(),
        comment: '管理员确认入班'
      },
      updatedAt: new Date().toISOString()
    })
    if (enr.classId) {
      await this._adjustClassCount(enr.classId, +1)
      // 同步镜像到 class_members（小程序端班级成员/视频权限读取源）
      await this._mirrorConfirm(enr)
    }
    return { code: 0 }
  },

  // 调班：把学员从原班调到任意开班（允许跨课程）
  // 联动：enrollments 改班 + class_members 镜像同步 + 出勤迁移 + 学员消息通知
  //       + 视频权限干净切换（收回原班课程视频权限，按目标班所带课程重新授权）
  async moveMemberToClass(enrollmentId, toClassId) {
    const enr = await CloudDBService.get('enrollments', enrollmentId)
    if (!enr) return { code: -1, message: '报名记录不存在' }
    const fromClassId = enr.classId
    const fromClass = fromClassId ? await CloudDBService.get('classes', fromClassId) : null
    const toClass = await CloudDBService.get('classes', toClassId)
    if (!toClass) return { code: -1, message: '目标班级不存在' }
    const fromName = fromClass?.name || enr.className || ''
    const { phone, name } = this._memberBase(enr)
    // 调班前置校验：仅"付费在读且未过期"或"免费班未过期"允许调班；过期/已退/待付不可调
    const st = await this._getMemberClassState(enr)
    if (!st.canTransfer) {
      return {
        code: 403,
        message: st.expired
          ? '培训已过期，不可调班（付费学员过期后仅可结业清理，不能调班）'
          : (st.reason || '该学员当前状态不可调班')
      }
    }
    // 同步报名记录到新班（含课程归属）
    await CloudDBService.update('enrollments', enrollmentId, {
      classId: toClassId,
      className: toClass.name,
      // 调班允许跨课程：同步课程归属，保持报名记录与班级一致
      courseId: toClass.courseId || enr.courseId,
      courseName: toClass.courseName || enr.courseName,
      updatedAt: new Date().toISOString()
    })
    if (fromClassId && fromClassId !== toClassId) {
      await this._adjustClassCount(fromClassId, -1)
    }
    await this._adjustClassCount(toClassId, +1)
    // 视频权限干净切换：收回原班课程权限 → 按目标班课程重新授权
    if (phone && fromClassId && fromClassId !== toClassId) {
      await this._revokeClassPermissions(phone, fromClassId)
      await this._grantClassPermissions(phone, name, toClassId, toClass)
    }
    // 1. 同步镜像到 class_members（小程序端班级成员/视频权限读取源）
    await this._mirrorMove(enr, fromClassId, toClassId, toClass.name)
    // 1.1 同步班级订单（orders orderType=class），否则小程序合并班级列表时仍显示原班
    await this._mirrorMoveOrder(phone, fromClassId, toClassId, toClass.name)
    // 2. 迁移未来出勤记录到新班（attendance_records）
    await this._migrateAttendance(
      [enr.phone, enr.studentId, enr.userId].filter(Boolean),
      fromClassId, toClassId
    )
    // 3. 推送调班通知给学员（小程序消息中心）
    await this._notifyTransfer(enr, fromName, toClass.name)
    return { code: 0 }
  },

  // 收集班级关联的全部课程ID（主课程 + includedCourseIds + includedCourses）
  _collectClassCourseIds(cls) {
    const courseIds = []
    if (cls?.courseId) courseIds.push(cls.courseId)
    if (Array.isArray(cls?.includedCourseIds)) {
      for (const id of cls.includedCourseIds) {
        if (id && !courseIds.includes(id)) courseIds.push(id)
      }
    }
    if (Array.isArray(cls?.includedCourses)) {
      for (const item of cls.includedCourses) {
        if (typeof item === 'string' && /^[a-f0-9]{24}$/i.test(item) && !courseIds.includes(item)) {
          courseIds.push(item)
        }
      }
    }
    return courseIds
  },

  // 收回某学员在原班的所有课程视频权限
  // 按 classId 精确命中，避免误伤独立购课的权限（无 classId）
  async _revokeClassPermissions(phone, fromClassId) {
    try {
      const res = await CloudDBService.query('course_permissions', {
        where: { phone, classId: fromClassId }, limit: 200
      })
      for (const p of (res.data || [])) {
        await CloudDBService.update('course_permissions', p._id, {
          status: 'revoked',
          revokedAt: new Date().toISOString(),
          videoAccess: { ...(p.videoAccess || {}), enabled: false },
          updatedAt: new Date().toISOString()
        })
      }
    } catch (e) {
      console.error('[classMemberService] 收回原班课程权限失败:', e)
    }
  },

  // 按目标班所带课程重新给该学员授权
  // 幂等：已存在的课程权限（含独立购课）不重复创建
  async _grantClassPermissions(phone, name, toClassId, toClass) {
    try {
      const courseIds = this._collectClassCourseIds(toClass)
      const now = new Date().toISOString()
      const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      for (const courseId of courseIds) {
        const res = await CloudDBService.query('course_permissions', {
          where: { phone, courseId }, limit: 1
        })
        if ((res.data || []).length) continue
        await CloudDBService.add('course_permissions', {
          phone,
          userName: name,
          courseId,
          courseName: toClass.courseName || '',
          classId: toClassId,
          className: toClass.name,
          source: 'class_enrollment',
          videoAccess: { enabled: true, validFrom: now, validUntil },
          status: 'active',
          createdAt: now,
          updatedAt: now
        })
      }
    } catch (e) {
      console.error('[classMemberService] 按目标班授权课程权限失败:', e)
    }
  },

  // 移除学员（取消报名）
  // 前置：付费且培训未结束的学员禁止移除（必须调班，或等培训完成后由管理员清理结业）
  // 联动：enrollments→cancelled + class_members→dropped + 班级计数-1
  //       + 订单打 enrollmentCancelled 标记（小程序端过滤） + 收回班级视频权限 + 推送通知
  async removeMember(enrollmentId) {
    const enr = await CloudDBService.get('enrollments', enrollmentId)
    if (!enr) return { code: -1, message: '报名记录不存在' }
    const st = await this._getMemberClassState(enr)
    if (!st.canRemove) {
      return { code: 403, message: st.reason || '该学员当前不可移除' }
    }
    await CloudDBService.update('enrollments', enrollmentId, {
      status: 'cancelled',
      cancelReason: '管理员移除',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    if (enr.classId) {
      await this._adjustClassCount(enr.classId, -1)
      // 同步镜像到 class_members（置为 dropped）
      await this._mirrorRemove(enr)
      const { phone } = this._memberBase(enr)
      // 标记该班订单为已取消报名（保留财务记录，仅供小程序端过滤）
      if (phone) await this._mirrorCancelOrder(phone, enr.classId, true)
      // 收回该学员在该班的全部课程视频权限
      await this._revokeClassPermissions(phone, enr.classId)
    }
    await this._notifyRemove(enr)
    return { code: 0 }
  },

  // 重新加入班级（仅后台操作，移出/取消报名的逆操作）
  // 联动：enrollments→confirmed + class_members→active + 班级计数+1
  //       + 清除订单取消标记 + 恢复班级视频权限 + 推送通知
  async rejoinClass(enrollmentId) {
    const enr = await CloudDBService.get('enrollments', enrollmentId)
    if (!enr) return { code: -1, message: '报名记录不存在' }
    await CloudDBService.update('enrollments', enrollmentId, {
      status: 'confirmed',
      cancelReason: '',
      cancelledAt: '',
      rejoinAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    if (enr.classId) {
      await this._adjustClassCount(enr.classId, +1)
      await this._mirrorConfirm(enr)
      const { phone } = this._memberBase(enr)
      if (phone) {
        // 清除订单取消标记，使小程序端重新显示该班
        await this._mirrorCancelOrder(phone, enr.classId, false)
        // 恢复该班课程视频权限（仅恢复被收回的，不影响其它来源权限）
        await this._restoreClassPermissions(phone, enr.classId)
      }
    }
    await this._notifyRejoin(enr)
    return { code: 0 }
  },

  // 切换班级学员的视频权限（双写 enrollments.access + course_permissions）
  async toggleClassMemberVideo(enrollment, enabled, validUntil) {
    const enrId = enrollment._id || enrollment.id
    // 注意：db-init 普通更新走 .set() 合并，禁止使用 'access.videoEnabled' 这类点号字段名
    // （会被当作含点号的非法字段名，导致 set 报错、更新静默失败）。必须写完整嵌套对象。
    const ok = await CloudDBService.update('enrollments', enrId, {
      access: { ...(enrollment.access || {}), videoEnabled: enabled },
      updatedAt: new Date().toISOString()
    })
    // 视频权限校验按 phone 命中 course_permissions，故优先用 phone 查询（兼容无 phone 时回退 userId）
    const phone = enrollment.phone || enrollment.studentPhone
    const userId = enrollment.studentId || enrollment.userId
    if ((phone || userId) && enrollment.courseId) {
      const where: any = { courseId: enrollment.courseId }
      if (phone) where.phone = phone
      else if (userId) where.userId = userId
      const perms = await CloudDBService.query('course_permissions', { where, limit: 10 })
      for (const p of (perms.data || [])) {
        await CloudDBService.update('course_permissions', p._id, {
          videoAccess: {
            ...(p.videoAccess || {}),
            enabled,
            validUntil: validUntil || p.videoAccess?.validUntil
          },
          status: enabled ? 'active' : 'revoked',
          updatedAt: new Date().toISOString()
        })
      }
    }
    return { code: ok ? 0 : -1 }
  },

  // 所有开班的候选班级（调班不再限制同课程，可转到任意开班）
  async getOpenClasses(excludeClassId?: string) {
    const where: any = { status: { $in: ['enrolling', 'in_progress'] } }
    if (excludeClassId) where._id = { $ne: excludeClassId }
    const res = await CloudDBService.query('classes', {
      where, orderBy: 'startDate', order: 'desc', limit: 500
    })
    return (res.data || []).map((c) => {
      const { enrolled, max, remaining } = classCountInfo(c)
      return { ...c, _enrolled: enrolled, _max: max, _remaining: remaining }
    })
  },

  // ===================== 购课人员 =====================

  // 课程列表
  async getCourses() {
    const res = await CloudDBService.query('courses', {
      where: {}, orderBy: 'createdAt', order: 'desc', limit: 300
    })
    return res.data || []
  },

  // 购课人员（按课程，排除已分配班级的，即纯购课）
  async getCourseBuyers(courseId) {
    const res = await CloudDBService.query('course_permissions', {
      where: { courseId }, orderBy: 'createdAt', order: 'desc', limit: 500
    })
    const list = (res.data || []).filter((p) => !p.classId)
    // 补全学员名称：course_permissions 历史数据未存 userName/userId，按 phone 关联 members
    const phones = [...new Set(list.map((p) => p.phone).filter(Boolean))]
    if (phones.length) {
      try {
        const mRes = await CloudDBService.query('members', {
          where: { phone: { $in: phones } }, limit: 1000
        })
        const mMap = new Map()
        ;(mRes.data || []).forEach((m) => { if (m.phone) mMap.set(m.phone, m) })
        list.forEach((p) => {
          const m = mMap.get(p.phone)
          if (m) {
            p.userName = p.userName || m.name || ''
            p.userId = p.userId || m._id || ''
          }
        })
      } catch (e) {
        console.error('[classMemberService] 补全购课人员名称失败:', e)
      }
    }
    return list
  },

  // 切换购课人员视频权限
  async toggleCourseBuyerVideo(permissionId, enabled, validUntil) {
    const p = await CloudDBService.get('course_permissions', permissionId)
    const ok = await CloudDBService.update('course_permissions', permissionId, {
      videoAccess: {
        ...(p?.videoAccess || {}),
        enabled,
        validUntil: validUntil || p?.videoAccess?.validUntil
      },
      status: enabled ? 'active' : 'revoked',
      updatedAt: new Date().toISOString()
    })
    return { code: ok ? 0 : -1 }
  },

  // 编辑购课人员视频权限（有效期 + 状态）—— 收口自权限管理模块
  async updateCourseBuyerPermission(permissionId, { enabled, validDays, status }) {
    const p = await CloudDBService.get('course_permissions', permissionId)
    if (!p) return { code: -1, message: '权限记录不存在' }
    const validUntil = enabled && validDays > 0
      ? new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined
    const ok = await CloudDBService.update('course_permissions', permissionId, {
      videoAccess: {
        ...(p.videoAccess || {}),
        enabled,
        validUntil
      },
      status: status || (enabled ? 'active' : 'revoked'),
      updatedAt: new Date().toISOString()
    })
    return { code: ok ? 0 : -1 }
  },

  // 撤销购课人员视频权限 —— 收口自权限管理模块
  async revokeCourseBuyerPermission(permissionId) {
    const p = await CloudDBService.get('course_permissions', permissionId)
    const ok = await CloudDBService.update('course_permissions', permissionId, {
      status: 'revoked',
      revokedAt: new Date().toISOString(),
      videoAccess: { ...(p?.videoAccess || {}), enabled: false },
      updatedAt: new Date().toISOString()
    })
    return { code: ok ? 0 : -1 }
  },

  // 手动为某用户开通/更新课程视频权限（管理员授权）—— 收口自权限管理模块
  async grantCoursePermission({ phone, userId, name, courseId, courseName, enabled = true, validDays = 365 }) {
    if (!phone && !userId) return { code: -1, message: '缺少用户标识' }
    if (!courseId) return { code: -1, message: '缺少课程' }
    const validUntil = enabled && validDays > 0
      ? new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined
    const where = { courseId }
    if (phone) where.phone = phone
    else where.userId = userId
    const res = await CloudDBService.query('course_permissions', { where, limit: 1 })
    const data = {
      phone, userId,
      userName: name,
      courseId, courseName,
      source: 'admin_grant',
      videoAccess: { enabled, validFrom: new Date().toISOString(), validUntil },
      status: enabled ? 'active' : 'revoked',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    if ((res.data || []).length) {
      await CloudDBService.update('course_permissions', res.data[0]._id, data)
      return { code: 0, message: '已更新该用户已有课程权限' }
    }
    await CloudDBService.add('course_permissions', data)
    return { code: 0 }
  },

  // 班级学员的关联课程（报班主课程 + 赠送关联课程）
  // 数据来源：course_permissions 中 classId + phone 命中的记录（source: class_enrollment / class_gift）
  // 注意：纯购课人员（无 classId）不在此列，纯购课在"按课程"视图管理。
  async getClassMemberCourses(classId, phone) {
    if (!classId || !phone) return []
    const res = await CloudDBService.query('course_permissions', {
      where: { classId, phone },
      orderBy: 'createdAt', order: 'desc', limit: 50
    })
    const list = res.data || []
    // 补全课程名（enrollment 来源的权限可能未存 courseName）
    const courseIds = [...new Set(list.map((p) => p.courseId).filter(Boolean))]
    if (courseIds.length) {
      try {
        const cRes = await CloudDBService.query('courses', {
          where: { _id: { $in: courseIds } }, limit: 200
        })
        const cMap = new Map()
        ;(cRes.data || []).forEach((c) => cMap.set(c._id, c))
        list.forEach((p) => {
          const c = cMap.get(p.courseId)
          p.courseName = p.courseName || c?.name || c?.title || ''
        })
      } catch (e) {
        console.error('[classMemberService] 补全关联课程名失败:', e)
      }
    }
    return list
  },

  // 为班级学员添加"赠送关联课程"（写 course_permissions 并关联 classId）
  async grantClassMemberCourse({ classId, className, phone, userId, name, courseId, courseName, enabled = true, validDays = 365 }) {
    if (!phone && !userId) return { code: -1, message: '缺少用户标识' }
    if (!courseId) return { code: -1, message: '缺少课程' }
    const validUntil = enabled && validDays > 0
      ? new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined
    const where = { courseId, classId }
    if (phone) where.phone = phone
    else where.userId = userId
    const res = await CloudDBService.query('course_permissions', { where, limit: 1 })
    const data = {
      phone, userId,
      userName: name,
      courseId, courseName,
      classId, className,
      source: 'class_gift',
      videoAccess: { enabled, validFrom: new Date().toISOString(), validUntil },
      status: enabled ? 'active' : 'revoked',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    if ((res.data || []).length) {
      await CloudDBService.update('course_permissions', res.data[0]._id, data)
      return { code: 0, message: '已更新该学员的关联课程权限' }
    }
    await CloudDBService.add('course_permissions', data)
    return { code: 0 }
  },

  // 搜索成员（手动授权用）—— 收口自权限管理模块
  async searchMembers(keyword) {
    if (!keyword || !keyword.trim()) return []
    const res = await CloudDBService.query('members', {
      where: {
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { phone: { $regex: keyword, $options: 'i' } }
        ]
      },
      limit: 20
    })
    return res.data || []
  },

  // ===================== 内部：保持 class_members 与 enrollments 同步 =====================
  // enrollments 是后台唯一真相源；class_members 是小程序端班级成员/视频权限读取源。
  // 历史 class_members 字段不统一（phone / userPhone、studentId / userId），镜像时两个字段都写，
  // 以保证小程序按 classId+phone 查询时能正确命中。

  async _findClassMember(classId, phone) {
    if (!classId || !phone) return null
    const res = await CloudDBService.query('class_members', { where: { classId, phone }, limit: 1 })
    return res.data && res.data.length ? res.data[0] : null
  },

  _memberBase(enr) {
    const phone = enr.phone || enr.studentPhone || ''
    const userId = enr.studentId || enr.userId || phone
    const name = enr.studentName || enr.userName || ''
    return { phone, userId, name }
  },

  // 调班镜像：把原班的 class_members 记录迁到新班
  async _mirrorMove(enr, fromClassId, toClassId, toClassName) {
    const { phone, userId, name } = this._memberBase(enr)
    if (!phone) return
    const old = fromClassId ? await this._findClassMember(fromClassId, phone) : null
    const patch = {
      classId: toClassId,
      className: toClassName,
      userId, studentId: userId,
      userPhone: phone, phone,
      userName: name, studentName: name,
      source: ['online', 'offline'].includes(enr.source) ? enr.source : 'offline',
      status: 'active',
      updatedAt: new Date().toISOString()
    }
    if (old) {
      await CloudDBService.update('class_members', old._id, patch)
    } else {
      await CloudDBService.add('class_members', {
        ...patch,
        enrolledAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      })
    }
  },

  // 调班订单镜像：把该学员原班的 class 订单 classId 改挂到新班
  // 小程序 getMyEnrollments 会合并 orders 集合，不更新会导致仍显示原班
  async _mirrorMoveOrder(phone, fromClassId, toClassId, toClassName) {
    if (!phone || !fromClassId || !toClassId || fromClassId === toClassId) return
    try {
      const res = await CloudDBService.query('orders', {
        where: { phone, classId: fromClassId, orderType: 'class' }, limit: 50
      })
      for (const o of (res.data || [])) {
        await CloudDBService.update('orders', o._id, {
          classId: toClassId,
          className: toClassName,
          updatedAt: new Date().toISOString()
        })
      }
    } catch (e) {
      console.error('[classMemberService] 调班订单同步失败:', e)
    }
  },

  // 确认入班镜像：确保 class_members 有该生记录且状态有效
  async _mirrorConfirm(enr) {
    const { phone, userId, name } = this._memberBase(enr)
    if (!phone || !enr.classId) return
    const existing = await this._findClassMember(enr.classId, phone)
    if (existing) {
      await CloudDBService.update('class_members', existing._id, {
        status: 'active',
        userName: name, studentName: name,
        updatedAt: new Date().toISOString()
      })
    } else {
      await CloudDBService.add('class_members', {
        classId: enr.classId,
        className: enr.className,
        userId, studentId: userId,
        userPhone: phone, phone,
        userName: name, studentName: name,
        source: ['online', 'offline'].includes(enr.source) ? enr.source : 'offline',
        status: 'active',
        enrolledAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
  },

  // 移除镜像：class_members 记录置为 dropped
  async _mirrorRemove(enr) {
    const { phone } = this._memberBase(enr)
    if (!phone || !enr.classId) return
    const existing = await this._findClassMember(enr.classId, phone)
    if (existing) {
      await CloudDBService.update('class_members', existing._id, {
        status: 'dropped',
        updatedAt: new Date().toISOString()
      })
    }
  },

  // ===================== 内部：调班出勤迁移 =====================
  // 把学员在老班的出勤记录（attendance_records）改挂到新班，保证出勤随人走
  async _migrateAttendance(ids, fromClassId, toClassId) {
    if (!ids.length || !fromClassId || !toClassId || fromClassId === toClassId) return
    const ors = []
    ids.forEach((id) => { ors.push({ studentId: id }); ors.push({ userId: id }) })
    const recs = await CloudDBService.query('attendance_records', {
      where: { classId: fromClassId, $or: ors },
      limit: 500
    })
    for (const r of (recs.data || [])) {
      await CloudDBService.update('attendance_records', r._id, {
        classId: toClassId,
        updatedAt: new Date().toISOString()
      })
    }
  },

  // ===================== 内部：调班消息通知 =====================
  // 写 messages 集合，小程序消息中心按 phone 推送给学员
  async _notifyTransfer(enr, fromName, toName) {
    const { phone, userId } = this._memberBase(enr)
    if (!phone && !userId) return
    try {
      await CloudDBService.add('messages', {
        userId,
        phone,
        type: 'course',
        title: '调班通知',
        content: `您已从「${fromName}」调整至「${toName}」，相关课程与出勤安排已同步更新，请在"我的培训"中查看。`,
        priority: 'medium',
        status: 'unread',
        isSystem: false,
        relatedType: 'class',
        relatedId: enr.classId,
        link: '/my-training',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    } catch (e) {
      console.error('[classMemberService] 调班消息推送失败:', e)
    }
  },

  // 学员在某班的"资金/班期"状态 → 派生是否可移除 / 可调班
  // 依据：orders（phone+classId+orderType=class）的支付状态 + class 的 price/endDate
  // 规则（依业务约定）：
  //  - 付费(已付)且培训未结束  → 不可移除（须调班或等结业），可迁移（调班）
  //  - 付费且已过期            → 可移除（结业清理，不退费），不可调班
  //  - 已退款 / 免费班 / 待付款 → 可移除；免费班未过期可迁移
  async _getMemberClassState(enr) {
    const { phone } = this._memberBase(enr)
    const classId = enr.classId
    const cls = classId ? await CloudDBService.get('classes', classId) : null
    if (!cls) {
      return { paid: false, refunded: false, pending: false, freeClass: true, expired: false, canRemove: true, canTransfer: true, reason: '' }
    }
    const price = cls.enrollmentConfig?.price ?? cls.price ?? 0
    const freeClass = Number(price) === 0
    const now = new Date()
    const endDate = cls.endDate ? new Date(cls.endDate) : null
    const expired = !!endDate && !isNaN(endDate.getTime()) && now > endDate
    let paid = false, refunded = false, pending = false
    if (phone && classId) {
      const oRes = await CloudDBService.query('orders', {
        where: { phone, classId, orderType: 'class' }, limit: 20
      })
      for (const o of (oRes.data || [])) {
        if (o.status === 'refunded') refunded = true
        else if (o.status === 'pending') pending = true
        else if (['paid', 'completed', 'paid_offline'].includes(o.status)) paid = true
      }
    }
    let canRemove = true
    let canTransfer = false
    let reason = ''
    if (paid && !expired) {
      canRemove = false
      canTransfer = true
      reason = '该学员已付费且培训未结束，不能直接移除；请使用「调班」（仅限培训有效期内），或等培训完成后由管理员清理。'
    } else if (paid && expired) {
      canRemove = true
      canTransfer = false
      reason = '培训已结束，可直接移除（结业清理，不退费）。'
    } else if (freeClass) {
      canRemove = true
      canTransfer = !expired
    } else {
      // 待付款 / 已退款 / 无订单
      canRemove = true
      canTransfer = false
    }
    return { paid, refunded, pending, freeClass, expired, canRemove, canTransfer, reason }
  },

  // 对外暴露：供后台 UI 在渲染前判断按钮可用性
  async getMemberClassState(enrollmentId) {
    const enr = await CloudDBService.get('enrollments', enrollmentId)
    if (!enr) {
      return { code: -1, paid: false, freeClass: true, expired: false, canRemove: true, canTransfer: true, reason: '报名记录不存在' }
    }
    const st = await this._getMemberClassState(enr)
    return { code: 0, ...st }
  },

  // 订单"取消报名"软标记：保留财务记录，仅供小程序端 getMyEnrollments 过滤
  async _mirrorCancelOrder(phone, classId, cancelled) {
    if (!phone || !classId) return
    try {
      const res = await CloudDBService.query('orders', {
        where: { phone, classId, orderType: 'class' }, limit: 50
      })
      for (const o of (res.data || [])) {
        await CloudDBService.update('orders', o._id, {
          enrollmentCancelled: !!cancelled,
          updatedAt: new Date().toISOString()
        })
      }
    } catch (e) {
      console.error('[classMemberService] 订单取消标记失败:', e)
    }
  },

  // 恢复某班课程视频权限（移出后重新加入时调用）：仅把被收回的置为有效，不动其它来源权限
  async _restoreClassPermissions(phone, classId) {
    try {
      const res = await CloudDBService.query('course_permissions', {
        where: { phone, classId }, limit: 200
      })
      for (const p of (res.data || [])) {
        await CloudDBService.update('course_permissions', p._id, {
          status: 'active',
          videoAccess: { ...(p.videoAccess || {}), enabled: true },
          updatedAt: new Date().toISOString()
        })
      }
    } catch (e) {
      console.error('[classMemberService] 恢复班级视频权限失败:', e)
    }
  },

  // 移出班级消息通知（小程序消息中心）
  async _notifyRemove(enr) {
    const { phone, userId } = this._memberBase(enr)
    if (!phone && !userId) return
    try {
      await CloudDBService.add('messages', {
        userId,
        phone,
        type: 'course',
        title: '移出班级通知',
        content: `您已被移出「${enr.className || ''}」，相关课程视频权限已收回。如有疑问请联系管理员。`,
        priority: 'medium',
        status: 'unread',
        isSystem: false,
        relatedType: 'class',
        relatedId: enr.classId,
        link: '/my-training',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    } catch (e) {
      console.error('[classMemberService] 移出消息推送失败:', e)
    }
  },

  // 重新加入班级消息通知（小程序消息中心）
  async _notifyRejoin(enr) {
    const { phone, userId } = this._memberBase(enr)
    if (!phone && !userId) return
    try {
      await CloudDBService.add('messages', {
        userId,
        phone,
        type: 'course',
        title: '重新加入通知',
        content: `您已重新加入「${enr.className || ''}」，课程视频权限已恢复，请在"我的培训"中查看。`,
        priority: 'medium',
        status: 'unread',
        isSystem: false,
        relatedType: 'class',
        relatedId: enr.classId,
        link: '/my-training',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    } catch (e) {
      console.error('[classMemberService] 重新加入消息推送失败:', e)
    }
  },

  // ===================== 内部：班级计数调整 =====================
  // 兼容 capacity{max,enrolled,confirmed} 与 maxStudents/enrolledCount 两种格式
  async _adjustClassCount(classId, delta) {
    const cls = await CloudDBService.get('classes', classId)
    if (!cls) return
    const { enrolled, max } = classCountInfo(cls)
    const newEnrolled = enrolled + delta
    const newCap = { ...(cls.capacity || {}), enrolled: newEnrolled, confirmed: newEnrolled, max }
    const patch = {
      capacity: newCap,
      enrolledCount: newEnrolled,
      maxStudents: max,
      updatedAt: new Date().toISOString()
    }
    if (delta > 0 && newEnrolled >= max) patch.status = 'full'
    else if (delta < 0 && newEnrolled < max && cls.status === 'full') patch.status = 'enrolling'
    await CloudDBService.update('classes', classId, patch)
  }
}

export default classMemberService
