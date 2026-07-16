// @ts-nocheck
// ============================================================================
// 数据库操作服务（统一通过 adminService HTTP → db-init 云函数）
// ============================================================================
import { adminService } from './adminService';
import type {
  Course,
  User,
  Order,
  Schedule,
  Attendance,
  Teacher,
  Exam,
  Question,
  Certificate,
  Coupon,
  GroupBuy,
  LiveStream,
  Lesson,
  PaginationParams,
  PaginatedResponse,
  FilterParams,
} from '@/types';

// ============================================================================
// 辅助函数
// ============================================================================

function extractList(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result.data)) return result.data;
  if (result.data?.list) return result.data.list;
  if (result.list) return result.list;
  return [];
}

function extractTotal(result: any): number {
  if (result?.data?.total !== undefined) return result.data.total;
  if (result?.total !== undefined) return result.total;
  return 0;
}

// ============================================================================
// 核心分页查询函数
// ============================================================================

async function paginatedQuery<T>(
  collectionName: string,
  params: PaginationParams & FilterParams = { page: 1, pageSize: 20 }
): Promise<PaginatedResponse<T>> {
  const { page = 1, pageSize = 20, title, category, level, status, ...filters } = params;

  try {
    console.log(`[paginatedQuery] 查询集合: ${collectionName}, 参数:`, params);

    // 构建查询条件
    const query: Record<string, any> = { ...filters };

    // 处理关键词搜索（模糊匹配 title 字段，使用 $regex 操作符）
    if (title) {
      query.title = { '$regex': title };
    }

    // 处理分类过滤
    if (category) {
      console.log(`[paginatedQuery] 添加分类过滤: category = "${category}"`);
      query.category = category;
    }

    // 处理等级过滤
    if (level) {
      query.level = level;
    }

    // 处理状态过滤
    if (status) {
      query.status = status;
    }

    console.log(`[paginatedQuery] 应用查询条件:`, query);

    // 判断是否需要操作符查询（$regex）
    const hasOperators = title !== undefined;

    const result = hasOperators
      ? await adminService.listWithOps(collectionName, query, { page, pageSize })
      : await adminService.list(collectionName, query, { page, pageSize });

    const data = extractList(result);
    const total = extractTotal(result);

    console.log(`[paginatedQuery] 查询到 ${data.length} 条数据, 总数:`, total);

    return {
      list: data as T[],
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error(`[paginatedQuery] 查询集合 ${collectionName} 失败:`, error);
    return {
      list: [],
      total: 0,
      page,
      pageSize,
    };
  }
}

async function findById<T>(collectionName: string, id: string): Promise<T | null> {
  try {
    const result = await adminService.get(collectionName, id);
    if (result?.data) {
      // adminService.get 返回 { code, data: { ... } }
      if (!Array.isArray(result.data) && typeof result.data === 'object') {
        return result.data as T;
      }
      // 兼容返回数组的情况
      if (Array.isArray(result.data) && result.data.length > 0) {
        return result.data[0] as T;
      }
    }
    return null;
  } catch (error) {
    console.error(`[findById] 查询 ${collectionName}/${id} 失败:`, error);
    return null;
  }
}

async function create<T>(collectionName: string, data: Partial<T>): Promise<T> {
  const doc = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const result = await adminService.add(collectionName, doc);
  return { _id: result.data?.id || '', ...doc } as T;
}

async function update<T>(collectionName: string, id: string, data: Partial<T>): Promise<boolean> {
  try {
    const doc = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await adminService.update(collectionName, id, doc);
    return true;
  } catch (error) {
    console.error(`更新 ${collectionName} 失败:`, error);
    throw error;
  }
}

async function remove(collectionName: string, id: string): Promise<boolean> {
  try {
    await adminService.delete(collectionName, id);
    return true;
  } catch (error) {
    console.error(`删除 ${collectionName}/${id} 失败:`, error);
    return false;
  }
}

// ============================================================================
// 课程相关操作
// ============================================================================

export const courseService = {
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Course>> {
    return paginatedQuery<Course>('courses', params);
  },

  async getById(id: string): Promise<Course | null> {
    return findById<Course>('courses', id);
  },

  async create(data: Partial<Course>): Promise<Course> {
    return create<Course>('courses', data);
  },

  async update(id: string, data: Partial<Course>): Promise<boolean> {
    return update<Course>('courses', id, data);
  },

  async delete(id: string): Promise<boolean> {
    return remove('courses', id);
  },

  async search(keyword: string): Promise<Course[]> {
    const result = await adminService.listWithOps('courses', {
      title: { '$regex': keyword }
    }, { limit: 50 });
    return extractList(result) as Course[];
  },

  // ============================================================================
  // 课程章节管理
  // ============================================================================

  async getLessons(courseId: string): Promise<Lesson[]> {
    const result = await adminService.list('lessons', { courseId }, { orderBy: 'order', order: 'asc', limit: 200 });
    return extractList(result) as Lesson[];
  },

  async getLessonById(lessonId: string): Promise<Lesson | null> {
    return findById<Lesson>('lessons', lessonId);
  },

  async createLesson(data: Partial<Lesson>): Promise<Lesson> {
    return create<Lesson>('lessons', data);
  },

  async updateLesson(lessonId: string, data: Partial<Lesson>): Promise<boolean> {
    return update<Lesson>('lessons', lessonId, data);
  },

  async deleteLesson(lessonId: string): Promise<boolean> {
    return remove('lessons', lessonId);
  },

  async reorderLessons(_courseId: string, lessonIds: string[]): Promise<boolean> {
    try {
      // 顺序更新每个章节的 order（不支持批次操作，改为顺序更新）
      for (let i = 0; i < lessonIds.length; i++) {
        await adminService.update('lessons', lessonIds[i], {
          order: i + 1,
          updatedAt: new Date().toISOString()
        });
      }
      return true;
    } catch (error) {
      console.error('[reorderLessons] 失败:', error);
      return false;
    }
  },
};

// ============================================================================
// 用户相关操作
// ============================================================================

export const userService = {
  async getById(id: string): Promise<User | null> {
    return findById<User>('user_profiles', id);
  },

  async getByOpenid(openid: string): Promise<User | null> {
    const result = await adminService.list('user_profiles', { openid }, { limit: 1 });
    const data = extractList(result);
    return data.length > 0 ? (data[0] as User) : null;
  },

  async create(data: Partial<User>): Promise<User> {
    return create<User>('user_profiles', data);
  },

  async update(id: string, data: Partial<User>): Promise<boolean> {
    return update<User>('user_profiles', id, data);
  },

  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<User>> {
    return paginatedQuery<User>('user_profiles', params);
  },
};

// ============================================================================
// 订单相关操作
// ============================================================================

export const orderService = {
  async list(query: Record<string, any> = {}, options: { page?: number; pageSize?: number; limit?: number } = {}) {
    const { page = 1, pageSize = 20, limit = pageSize } = options;
    return await adminService.list('orders', query, { page, limit });
  },

  async getById(id: string): Promise<any> {
    return await adminService.get('orders', id);
  },

  async create(data: Partial<Order>): Promise<any> {
    return await adminService.add('orders', data);
  },

  async update(id: string, data: Partial<Order>): Promise<any> {
    return await adminService.update('orders', id, data);
  },

  async updateStatus(id: string, status: Order['status']): Promise<boolean> {
    const result = await adminService.update('orders', id, { status, updatedAt: new Date().toISOString() });
    return result?.code === 0;
  },

  async delete(id: string): Promise<boolean> {
    const result = await adminService.delete('orders', id);
    return result?.code === 0;
  },

  async grantPermission(orderId: string): Promise<{ code: number; message: string }> {
    try {
      // 获取订单信息
      const orderResult = await adminService.get('orders', orderId);
      if (orderResult?.code !== 0 || !orderResult?.data) {
        return { code: -1, message: '订单不存在' };
      }
      const order = orderResult.data;

      // 检查是否已开放权限
      if (order.permissionGranted) {
        return { code: -1, message: '该订单已开放过权限' };
      }

      // 获取关联的手机号
      const phone = order.phone || order.buyerPhone || '';

      // 1. 获取或创建会员记录
      let memberId = order.memberId || '';
      if (phone && !memberId) {
        try {
          const membersService = (await import('./membersService')).membersService;
          const memberResult = await membersService.getByPhone(phone);
          if (memberResult?.success && memberResult.data) {
            memberId = (memberResult.data as any)._id || (memberResult.data as any).userId || '';
            console.log('[grantPermission] 找到会员:', memberId);
          } else {
            console.log('[grantPermission] 手机号未找到会员:', phone);
          }
        } catch (e) {
          console.error('[grantPermission] 查询会员失败:', e);
        }
      }

      // 2. 培训班订单：写入班级成员 + 逐课程授予学习权限（镜像 api-order enrollClass）
      if (order.type === 'class' && order.classId) {
        // 2a. 报名记录（enrollments，幂等去重）
        try {
          const existingEnrollment = await adminService.list('enrollments', {
            query: { orderId: orderId }
          });
          if (!(existingEnrollment?.code === 0 && existingEnrollment?.data?.list?.length > 0)) {
            await adminService.add('enrollments', {
              memberId: memberId || '',
              userId: order.userId || memberId || '',
              phone: phone,
              userName: order.userName || order.buyerName || '',
              classId: order.classId,
              className: order.className || '',
              source: order.paymentMethod === 'online' ? 'online_enroll' : 'offline_enroll',
              paymentStatus: 'paid',
              enrollmentTime: new Date().toISOString(),
              status: 'active',
              orderId: orderId,
              permissionGranted: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error('[grantPermission] 写入报名记录失败:', e);
        }

        // 2b. 写入/更新班级成员（class_members = 培训班权限）
        // 按 classId+phone（用户身份，即小程序「我的培训班」读取的键）幂等更新，
        // 确保审核通过后「我的培训班」与后台「报名管理」状态一致。
        try {
          const permissionService = (await import('./permissionService')).permissionService;
          const existingMember = await adminService.list('class_members', { classId: order.classId, phone }, { limit: 1 });
          const existingMemberList = (existingMember?.code === 0 && existingMember?.data?.list) ? (existingMember.data.list as any[]) : [];
          if (existingMemberList.length > 0) {
            await adminService.update('class_members', existingMemberList[0]._id, {
              status: 'enrolled',
              userName: order.userName || order.buyerName || '',
              userPhone: phone,
              updatedAt: new Date().toISOString(),
            });
          } else {
            await permissionService.addClassMember({
              classId: order.classId,
              userId: memberId || '',
              userName: order.userName || order.buyerName || '',
              userPhone: phone,
              className: order.className || '',
              courseId: '',
              source: order.paymentMethod === 'online' ? 'online_enroll' : 'offline_enroll',
              status: 'enrolled',
              videoEnabled: true,
            });
          }
        } catch (e) {
          console.error('[grantPermission] 写入班级成员失败:', e);
        }

        // 2c. 收集班级关联的全部课程ID（courseId / includedCourseIds / includedCourses）
        let classDoc: any = null;
        try {
          const classRes = await adminService.get('classes', order.classId);
          classDoc = classRes?.data || null;
        } catch (e) {
          console.error('[grantPermission] 获取班级信息失败:', e);
        }
        const courseIds: string[] = [];
        if (classDoc?.courseId) courseIds.push(classDoc.courseId);
        if (Array.isArray(classDoc?.includedCourseIds)) {
          for (const id of classDoc.includedCourseIds) {
            if (id && !courseIds.includes(id)) courseIds.push(id);
          }
        }
        if (Array.isArray(classDoc?.includedCourses)) {
          const nameItems: string[] = []
          for (const item of classDoc.includedCourses) {
            if (typeof item === 'string') {
              if (/^[a-f0-9]{24}$/i.test(item)) {
                if (!courseIds.includes(item)) courseIds.push(item)
              } else if (item.trim()) {
                nameItems.push(item.trim())
              }
            }
          }
          // 名称数组：按课程标题解析为课程ID（best-effort），避免名称格式 includedCourses 被静默丢弃
          if (nameItems.length > 0) {
            try {
              const courseRes = await adminService.listWithOps('courses', { title: { $in: nameItems } }, { limit: 100 })
              for (const c of (courseRes?.data?.list || []) as any[]) {
                if (c._id && !courseIds.includes(c._id)) courseIds.push(c._id)
              }
            } catch (e) {
              console.error('[grantPermission] includedCourses 名称解析失败:', e)
            }
          }
        }

        // 2d. 逐课程写入 course_permissions 集合（小程序看课闸门实际读取的表，幂等去重）
        const membersService = (await import('./membersService')).membersService;
        for (const courseId of courseIds) {
          try {
            const exists = await adminService.list('course_permissions', { phone, courseId }, { limit: 1 });
            if (!(exists?.code === 0 && exists?.data?.list?.length > 0)) {
              await adminService.add('course_permissions', {
                phone,
                courseId,
                source: order.paymentMethod === 'online' ? 'online_enroll' : 'offline_enroll',
                classId: order.classId,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          } catch (e) {
            console.error('[grantPermission] 授予课程权限失败:', courseId, e);
          }
        }
        // 同步会员 enrolledCourses（供 Web 端展示，逐课幂等）
        if (courseIds.length > 0) {
          try {
            for (const courseId of courseIds) {
              await (membersService.grantCoursePermission as any)(
                phone,
                courseId,
                { source: order.paymentMethod === 'online' ? 'online_enroll' : 'offline_enroll', orderId }
              );
            }
          } catch (e) {
            console.error('[grantPermission] 同步会员课程失败:', e);
          }
        }
      }

      // 3. 纯课程订单：直接授予该课程权限
      if (order.courseId && phone) {
        const membersService = (await import('./membersService')).membersService;
        await (membersService.grantCoursePermission as any)(
          phone,
          order.courseId,
          { source: order.paymentMethod === 'online' ? 'online_purchase' : 'offline_enroll', orderId }
        );
      }

      // 4. 标记订单权限已开放
      await adminService.update('orders', orderId, {
        permissionGranted: true,
        permissionGrantedAt: new Date().toISOString(),
        memberId: memberId || undefined,
        updatedAt: new Date().toISOString(),
      });

      return { code: 0, message: '权限开放成功' };
    } catch (error: any) {
      console.error('[orderService.grantPermission] 错误:', error);
      return { code: -1, message: error.message || '操作失败' };
    }
  },
};

// ============================================================================
// 教师相关操作
// ============================================================================

export const teacherService = {
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Teacher>> {
    return paginatedQuery<Teacher>('teachers', params);
  },

  async getById(id: string): Promise<Teacher | null> {
    return findById<Teacher>('teachers', id);
  },

  async create(data: Partial<Teacher>): Promise<Teacher> {
    return create<Teacher>('teachers', data);
  },

  async update(id: string, data: Partial<Teacher>): Promise<boolean> {
    return update<Teacher>('teachers', id, data);
  },

  async delete(id: string): Promise<boolean> {
    return remove('teachers', id);
  },
};

// ============================================================================
// 出勤相关操作
// ============================================================================

export const attendanceService = {
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Attendance>> {
    return paginatedQuery<Attendance>('attendance_records', params);
  },

  async create(data: Partial<Attendance>): Promise<Attendance> {
    return create<Attendance>('attendance_records', data);
  },

  async update(id: string, data: Partial<Attendance>): Promise<boolean> {
    return update<Attendance>('attendance_records', id, data);
  },

  async delete(id: string): Promise<boolean> {
    return remove('attendance_records', id);
  },
};

// ============================================================================
// 考试相关操作
// ============================================================================

export const examService = {
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Exam>> {
    return paginatedQuery<Exam>('exams', params);
  },

  async getById(id: string): Promise<Exam | null> {
    return findById<Exam>('exams', id);
  },

  async create(data: Partial<Exam>): Promise<Exam> {
    return create<Exam>('exams', data);
  },

  async update(id: string, data: Partial<Exam>): Promise<boolean> {
    return update<Exam>('exams', id, data);
  },

  async delete(id: string): Promise<boolean> {
    return remove('exams', id);
  },

  async getQuestions(examId: string): Promise<Question[]> {
    const result = await adminService.list('questions', { examId }, { orderBy: 'order', order: 'asc', limit: 200 });
    return extractList(result) as Question[];
  },

  async addQuestion(data: Partial<Question>): Promise<Question> {
    return create<Question>('questions', data);
  },
};

// ============================================================================
// 证书相关操作
// ============================================================================

export const certificateService = {
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Certificate>> {
    return paginatedQuery<Certificate>('certificates', params);
  },

  async getUserCertificates(userId: string): Promise<Certificate[]> {
    const result = await adminService.list('certificates', { userId }, { limit: 100 });
    return extractList(result) as Certificate[];
  },

  async create(data: Partial<Certificate>): Promise<Certificate> {
    return create<Certificate>('certificates', data);
  },

  async updateStatus(id: string, status: Certificate['status']): Promise<boolean> {
    return update<Certificate>('certificates', id, { status });
  },
};

// ============================================================================
// 营销工具相关操作
// ============================================================================

export const couponService = {
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Coupon>> {
    return paginatedQuery<Coupon>('coupons', params);
  },

  async create(data: Partial<Coupon>): Promise<Coupon> {
    return create<Coupon>('coupons', data);
  },

  async update(id: string, data: Partial<Coupon>): Promise<boolean> {
    return update<Coupon>('coupons', id, data);
  },

  async delete(id: string): Promise<boolean> {
    return remove('coupons', id);
  },
};

export const groupBuyService = {
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<GroupBuy>> {
    return paginatedQuery<GroupBuy>('groupBuys', params);
  },

  async create(data: Partial<GroupBuy>): Promise<GroupBuy> {
    return create<GroupBuy>('groupBuys', data);
  },

  async update(id: string, data: Partial<GroupBuy>): Promise<boolean> {
    return update<GroupBuy>('groupBuys', id, data);
  },
};

// ============================================================================
// 直播相关操作
// ============================================================================

export const liveStreamService = {
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<LiveStream>> {
    return paginatedQuery<LiveStream>('liveStreams', params);
  },

  async getById(id: string): Promise<LiveStream | null> {
    return findById<LiveStream>('liveStreams', id);
  },

  async create(data: Partial<LiveStream>): Promise<LiveStream> {
    return create<LiveStream>('liveStreams', data);
  },

  async update(id: string, data: Partial<LiveStream>): Promise<boolean> {
    return update<LiveStream>('liveStreams', id, data);
  },

  async updateStatus(id: string, status: LiveStream['status']): Promise<boolean> {
    return update<LiveStream>('liveStreams', id, { status });
  },
};

// ============================================================================
// 题库相关操作
// ============================================================================

import type { QuestionBank, BankQuestion, PracticeRecord, FavoriteQuestion, WrongQuestion } from '@/types';

export const questionBankService = {
  // ========== 题库管理 ==========

  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<QuestionBank>> {
    return paginatedQuery<QuestionBank>('questionBanks', params);
  },

  async getById(id: string): Promise<QuestionBank | null> {
    return findById<QuestionBank>('questionBanks', id);
  },

  async create(data: Partial<QuestionBank>): Promise<QuestionBank> {
    return create<QuestionBank>('questionBanks', { ...data, questionCount: 0 });
  },

  async update(id: string, data: Partial<QuestionBank>): Promise<boolean> {
    return update<QuestionBank>('questionBanks', id, data);
  },

  async delete(id: string): Promise<boolean> {
    return remove('questionBanks', id);
  },

  async getByCourseId(courseId: string): Promise<QuestionBank[]> {
    const result = await adminService.list('questionBanks', { courseIds: courseId }, { limit: 50 });
    return extractList(result) as QuestionBank[];
  },

  // ========== 题目管理 ==========

  async getQuestions(bankId: string): Promise<BankQuestion[]> {
    const result = await adminService.list('questions', { bankId }, { orderBy: 'createdAt', order: 'asc', limit: 500 });
    return extractList(result) as BankQuestion[];
  },

  async getQuestionById(questionId: string): Promise<BankQuestion | null> {
    return findById<BankQuestion>('questions', questionId);
  },

  async createQuestion(data: Partial<BankQuestion>): Promise<BankQuestion> {
    const question = await create<BankQuestion>('questions', {
      ...data,
      usageCount: 0,
      correctRate: 0,
    });
    
    // 更新题库题目数量
    const bank = await this.getById(data.bankId!);
    if (bank) {
      await adminService.update('questionBanks', data.bankId!, {
        questionCount: (bank.questionCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
    }
    
    return question;
  },

  async updateQuestion(questionId: string, data: Partial<BankQuestion>): Promise<boolean> {
    return update<BankQuestion>('questions', questionId, data);
  },

  async deleteQuestion(questionId: string, bankId: string): Promise<boolean> {
    await remove('questions', questionId);
    
    // 更新题库题目数量
    const bank = await this.getById(bankId);
    if (bank && bank.questionCount > 0) {
      await adminService.update('questionBanks', bankId, {
        questionCount: bank.questionCount - 1,
        updatedAt: new Date().toISOString(),
      });
    }
    
    return true;
  },

  async getRandomQuestions(bankId: string, count: number): Promise<BankQuestion[]> {
    const result = await adminService.list('questions', { bankId }, { limit: 500 });
    const data = extractList(result) as BankQuestion[];
    
    // 随机打乱并取前count个
    const shuffled = [...data].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count) as BankQuestion[];
  },

  // ========== 练习记录 ==========

  async savePracticeRecord(data: Partial<PracticeRecord>): Promise<PracticeRecord> {
    return create<PracticeRecord>('practiceRecords', data);
  },

  async getUserPracticeRecords(userId: string, params: PaginationParams): Promise<PaginatedResponse<PracticeRecord>> {
    return paginatedQuery<PracticeRecord>('practiceRecords', { ...params, userId });
  },

  async getPracticeStats(userId: string): Promise<{
    totalPractices: number;
    totalQuestions: number;
    correctRate: number;
    totalDuration: number;
  }> {
    const result = await adminService.list('practiceRecords', { userId }, { limit: 500 });
    const records = extractList(result) as PracticeRecord[];
    
    const totalPractices = records.length;
    const totalQuestions = records.reduce((sum, r) => sum + r.questionCount, 0);
    const totalCorrect = records.reduce((sum, r) => sum + r.correctCount, 0);
    const correctRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    
    return { totalPractices, totalQuestions, correctRate, totalDuration };
  },

  // ========== 收藏题目 ==========

  async addToFavorites(data: Partial<FavoriteQuestion>): Promise<FavoriteQuestion> {
    // 检查是否已收藏
    const existingResult = await adminService.list('favoriteQuestions', { 
      userId: data.userId, 
      questionId: data.questionId 
    }, { limit: 1 });
    const existing = extractList(existingResult);
    
    if (existing.length > 0) {
      throw new Error('该题目已收藏');
    }
    
    return create<FavoriteQuestion>('favoriteQuestions', data);
  },

  async removeFromFavorites(userId: string, questionId: string): Promise<boolean> {
    const result = await adminService.list('favoriteQuestions', { userId, questionId }, { limit: 1 });
    const data = extractList(result);
    
    if (data.length > 0) {
      await adminService.delete('favoriteQuestions', data[0]._id);
      return true;
    }
    return false;
  },

  async getUserFavorites(userId: string, params: PaginationParams): Promise<PaginatedResponse<FavoriteQuestion>> {
    return paginatedQuery<FavoriteQuestion>('favoriteQuestions', { ...params, userId });
  },

  async isFavorite(userId: string, questionId: string): Promise<boolean> {
    const result = await adminService.list('favoriteQuestions', { userId, questionId }, { limit: 1 });
    const data = extractList(result);
    return data.length > 0;
  },

  // ========== 错题本 ==========

  async addToWrongQuestions(data: Partial<WrongQuestion>): Promise<WrongQuestion> {
    // 检查是否已存在
    const existingResult = await adminService.list('wrongQuestions', { 
      userId: data.userId, 
      questionId: data.questionId 
    }, { limit: 1 });
    const existing = extractList(existingResult);
    
    if (existing.length > 0) {
      // 更新错误次数
      const wrongQ = existing[0] as WrongQuestion;
      await adminService.updateWithOps('wrongQuestions', wrongQ._id, {
        $inc: { wrongCount: 1 },
        ...data.userAnswer ? { userAnswer: data.userAnswer } : {},
        lastWrongTime: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
      return { ...wrongQ, wrongCount: wrongQ.wrongCount + 1 } as WrongQuestion;
    }
    
    return create<WrongQuestion>('wrongQuestions', {
      ...data,
      wrongCount: 1,
      lastWrongTime: new Date().toISOString(),
    });
  },

  async getUserWrongQuestions(userId: string, params: PaginationParams): Promise<PaginatedResponse<WrongQuestion>> {
    return paginatedQuery<WrongQuestion>('wrongQuestions', { ...params, userId });
  },

  async removeFromWrongQuestions(userId: string, questionId: string): Promise<boolean> {
    const result = await adminService.list('wrongQuestions', { userId, questionId }, { limit: 1 });
    const data = extractList(result);
    
    if (data.length > 0) {
      await adminService.delete('wrongQuestions', data[0]._id);
      return true;
    }
    return false;
  },
};

// ============================================================================
// 考试记录相关操作（examAttempts 集合）
// ============================================================================

export interface ExamAttemptRecord {
  _id?: string;
  examId: string;
  userId: string;
  courseId?: string;
  score: number;
  passStatus: boolean;
  answers: {
    questionId: string;
    userAnswer: string | string[];
    isCorrect: boolean;
    score: number;
  }[];
  startTime: string;
  submitTime: string;
  duration: number;
  _openid?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const examAttemptService = {
  async getList(params: PaginationParams & FilterParams & { userId?: string; examId?: string }): Promise<PaginatedResponse<ExamAttemptRecord>> {
    const { page = 1, pageSize = 20, userId, examId, ...filters } = params;

    const query: Record<string, any> = { ...filters };
    if (userId) query.userId = userId;
    if (examId) query.examId = examId;

    const result = await adminService.list('examAttempts', query, { 
      page, 
      pageSize, 
      orderBy: 'submitTime', 
      order: 'desc' 
    });
    
    return {
      list: extractList(result) as ExamAttemptRecord[],
      total: extractTotal(result),
      page,
      pageSize,
    };
  },

  async getById(id: string): Promise<ExamAttemptRecord | null> {
    return findById<ExamAttemptRecord>('examAttempts', id);
  },

  async getByUserId(userId: string, examId?: string): Promise<ExamAttemptRecord[]> {
    const query: any = { userId };
    if (examId) {
      query.examId = examId;
    }
    const result = await adminService.list('examAttempts', query, { orderBy: 'submitTime', order: 'desc', limit: 100 });
    return extractList(result) as ExamAttemptRecord[];
  },

  async create(data: Partial<ExamAttemptRecord>): Promise<ExamAttemptRecord> {
    return create<ExamAttemptRecord>('examAttempts', data);
  },

  async update(id: string, data: Partial<ExamAttemptRecord>): Promise<boolean> {
    return update<ExamAttemptRecord>('examAttempts', id, data);
  },

  async delete(id: string): Promise<boolean> {
    return remove('examAttempts', id);
  },
};

// ============================================================================
// 导出所有服务
// ============================================================================

export default {
  course: courseService,
  user: userService,
  order: orderService,
  teacher: teacherService,
  attendance: attendanceService,
  exam: examService,
  certificate: certificateService,
  coupon: couponService,
  groupBuy: groupBuyService,
  liveStream: liveStreamService,
  questionBank: questionBankService,
  examAttempt: examAttemptService,
};
