// ============================================================================
// 数据库操作服务
// ============================================================================
import { app } from '@/utils/cloudbase';
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
// 工具函数
// ============================================================================

/**
 * 分页查询（支持过滤和搜索）
 */
async function paginatedQuery<T>(
  collectionName: string,
  params: PaginationParams & FilterParams = { page: 1, pageSize: 20 }
): Promise<PaginatedResponse<T>> {
  const { page = 1, pageSize = 20, title, category, level, status, ...filters } = params;
  const skip = (page - 1) * pageSize;

  try {
    const db = app.database();
    let collection = db.collection(collectionName);

    console.log(`[paginatedQuery] 查询集合: ${collectionName}, 参数:`, params);

    // 构建过滤条件
    const whereConditions: Record<string, any> = { ...filters };

    // 处理关键词搜索（模糊匹配 title 字段）
    if (title) {
      whereConditions.title = db.RegExp({
        regexp: title,
        options: 'i', // 不区分大小写
      });
    }

    // 处理分类过滤
    if (category) {
      console.log(`[paginatedQuery] 添加分类过滤: category = "${category}"`);
      whereConditions.category = category;
    }

    // 处理等级过滤
    if (level) {
      whereConditions.level = level;
    }

    // 处理状态过滤
    if (status) {
      whereConditions.status = status;
    }

    // 应用过滤条件
    if (Object.keys(whereConditions).length > 0) {
      collection = collection.where(whereConditions);
      console.log(`[paginatedQuery] 应用过滤条件:`, whereConditions);
    }

    // 获取总数
    const countResult = await collection.count();
    const total = countResult.total || 0;
    console.log(`[paginatedQuery] 集合 ${collectionName} 符合条件总数:`, total);

    // 获取分页数据
    const { data } = await collection.skip(skip).limit(pageSize).get();
    console.log(`[paginatedQuery] 查询到 ${data.length} 条数据:`, data);

    return {
      list: data as T[],
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error(`[paginatedQuery] 查询集合 ${collectionName} 失败:`, error);
    // 返回空结果，避免页面崩溃
    return {
      list: [],
      total: 0,
      page,
      pageSize,
    };
  }
}

/**
 * 单个查询
 */
async function findById<T>(collectionName: string, id: string): Promise<T | null> {
  const db = app.database();
  const { data } = await db.collection(collectionName).doc(id).get();
  // CloudBase 返回的 data 是数组，取第一个元素
  if (Array.isArray(data) && data.length > 0) {
    return data[0] as T;
  }
  return null;
}

/**
 * 创建记录
 */
async function create<T>(collectionName: string, data: Partial<T>): Promise<T> {
  const db = app.database();
  const doc = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const result = await db.collection(collectionName).add(doc);
  // CloudBase SDK add 方法返回的格式是 { id: string }
  return { _id: result.id || result._id, ...doc } as T;
}

/**
 * 更新记录
 */
async function update<T>(collectionName: string, id: string, data: Partial<T>): Promise<boolean> {
  const db = app.database();
  const doc = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  try {
    const result = await db.collection(collectionName).doc(id).update(doc);
    // CloudBase SDK 返回格式可能不同，兼容处理
    if (result && result.data) {
      return result.data.updated > 0;
    }
    // 如果没有返回 updated 字段，检查是否有错误
    return true;
  } catch (error) {
    console.error(`更新 ${collectionName} 失败:`, error);
    throw error;
  }
}

/**
 * 删除记录
 */
async function remove(collectionName: string, id: string): Promise<boolean> {
  const db = app.database();
  const { data: result } = await db.collection(collectionName).doc(id).remove();
  // CloudBase SDK 的 remove() 返回 { data }，data 中可能包含删除的信息
  // 如果有 data 返回说明操作成功
  return result ? true : false;
}

// ============================================================================
// 课程相关操作
// ============================================================================

export const courseService = {
  /**
   * 获取课程列表（分页）
   */
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Course>> {
    return paginatedQuery<Course>('courses', params);
  },

  /**
   * 获取课程详情
   */
  async getById(id: string): Promise<Course | null> {
    return findById<Course>('courses', id);
  },

  /**
   * 创建课程
   */
  async create(data: Partial<Course>): Promise<Course> {
    return create<Course>('courses', data);
  },

  /**
   * 更新课程
   */
  async update(id: string, data: Partial<Course>): Promise<boolean> {
    return update<Course>('courses', id, data);
  },

  /**
   * 删除课程
   */
  async delete(id: string): Promise<boolean> {
    return remove('courses', id);
  },

  /**
   * 搜索课程
   */
  async search(keyword: string): Promise<Course[]> {
    const db = app.database();
    const { data } = await db
      .collection('courses')
      .where({
        title: db.RegExp({
          regexp: keyword,
          options: 'i',
        }),
      })
      .get();
    return data as Course[];
  },

  // ============================================================================
  // 课程章节管理
  // ============================================================================

  /**
   * 获取课程的所有章节
   */
  async getLessons(courseId: string): Promise<Lesson[]> {
    const db = app.database();
    const { data } = await db
      .collection('lessons')
      .where({ courseId })
      .orderBy('order', 'asc')
      .get();
    return data as Lesson[];
  },

  /**
   * 获取单个章节详情
   */
  async getLessonById(lessonId: string): Promise<Lesson | null> {
    return findById<Lesson>('lessons', lessonId);
  },

  /**
   * 创建章节
   */
  async createLesson(data: Partial<Lesson>): Promise<Lesson> {
    return create<Lesson>('lessons', data);
  },

  /**
   * 更新章节
   */
  async updateLesson(lessonId: string, data: Partial<Lesson>): Promise<boolean> {
    return update<Lesson>('lessons', lessonId, data);
  },

  /**
   * 删除章节
   */
  async deleteLesson(lessonId: string): Promise<boolean> {
    return remove('lessons', lessonId);
  },

  /**
   * 批量更新章节排序
   */
  async reorderLessons(courseId: string, lessonIds: string[]): Promise<boolean> {
    const db = app.database();
    const batch = db.batch();

    lessonIds.forEach((lessonId, index) => {
      const doc = db.collection('lessons').doc(lessonId);
      batch.update(doc, { order: index + 1, updatedAt: new Date().toISOString() });
    });

    const result = await batch.commit();
    return result.ok;
  },
};

// ============================================================================
// 用户相关操作
// ============================================================================

export const userService = {
  /**
   * 获取用户信息
   */
  async getById(id: string): Promise<User | null> {
    return findById<User>('user_profiles', id);
  },

  /**
   * 根据openid获取用户
   */
  async getByOpenid(openid: string): Promise<User | null> {
    const db = app.database();
    const { data } = await db.collection('user_profiles').where({ openid }).get();
    return data.length > 0 ? (data[0] as User) : null;
  },

  /**
   * 创建用户
   */
  async create(data: Partial<User>): Promise<User> {
    return create<User>('user_profiles', data);
  },

  /**
   * 更新用户信息
   */
  async update(id: string, data: Partial<User>): Promise<boolean> {
    return update<User>('user_profiles', id, data);
  },

  /**
   * 获取用户列表（管理员）
   */
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<User>> {
    return paginatedQuery<User>('user_profiles', params);
  },
};

// ============================================================================
// 订单相关操作
// ============================================================================

export const orderService = {
  /**
   * 获取订单列表（通过云函数，支持筛选）
   */
  async list(query: Record<string, any> = {}, options: { page?: number; pageSize?: number; limit?: number } = {}) {
    const { page = 1, pageSize = 20, limit = pageSize } = options;
    return await adminService.list('orders', query, { page, limit });
  },

  /**
   * 获取订单详情
   */
  async getById(id: string): Promise<any> {
    return await adminService.get('orders', id);
  },

  /**
   * 创建订单
   */
  async create(data: Partial<Order>): Promise<any> {
    return await adminService.add('orders', data);
  },

  /**
   * 更新订单
   */
  async update(id: string, data: Partial<Order>): Promise<any> {
    return await adminService.update('orders', id, data);
  },

  /**
   * 更新订单状态
   */
  async updateStatus(id: string, status: Order['status']): Promise<boolean> {
    const result = await adminService.update('orders', id, { status, updatedAt: new Date().toISOString() });
    return result?.code === 0;
  },

  /**
   * 删除订单
   */
  async delete(id: string): Promise<boolean> {
    const result = await adminService.delete('orders', id);
    return result?.code === 0;
  },

  /**
   * 开放培训班权限（为订单创建报名记录和权限）
   */
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
            memberId = memberResult.data._id || memberResult.data.userId || '';
            console.log('[grantPermission] 找到会员:', memberId);
          } else {
            // 创建新会员
            console.log('[grantPermission] 手机号未找到会员:', phone);
            // 注意：这里不自动创建，因为可能是游客订单
          }
        } catch (e) {
          console.error('[grantPermission] 查询会员失败:', e);
        }
      }

      // 2. 创建报名记录（如果是培训班订单）- 添加防重复检查
      if (order.type === 'class' && order.classId) {
        // 检查是否已存在该订单的报名记录
        const existingEnrollment = await adminService.list('enrollments', {
          query: { orderId: orderId }
        });

        if (existingEnrollment?.code === 0 && existingEnrollment?.data?.length > 0) {
          console.log('[grantPermission] 该订单已有报名记录，跳过创建:', orderId);
          // 已存在，只更新权限标记，不重复创建
        } else {
          // 不存在才创建新记录
          await adminService.add('enrollments', {
            memberId: memberId || '',           // ★ 关联会员ID
            userId: order.userId || memberId || '',  // 兼容旧字段
            phone: phone,
            userName: order.userName || order.buyerName || '',
            classId: order.classId,
            className: order.className || '',
            source: order.paymentMethod === 'online' ? 'online_enroll' : 'offline_enroll',
            paymentStatus: 'paid',
            enrollmentTime: new Date().toISOString(),
            status: 'active',
            orderId: orderId,
            permissionGranted: true,  // 管理员手动开放权限
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. 如果有课程ID，授予视频课程权限
      if (order.courseId && phone) {
        const membersService = (await import('./membersService')).membersService;
        await membersService.grantCoursePermission(
          phone,
          order.courseId,
          { source: order.paymentMethod === 'online' ? 'online_purchase' : 'offline_enroll', orderId }
        );
      }

      // 4. 标记订单权限已开放
      await adminService.update('orders', orderId, {
        permissionGranted: true,
        permissionGrantedAt: new Date().toISOString(),
        memberId: memberId || undefined,  // ★ 保存关联的会员ID
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
  /**
   * 获取教师列表
   */
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Teacher>> {
    // 使用 teachers 集合（实际有 32 条数据）
    return paginatedQuery<Teacher>('teachers', params);
  },

  /**
   * 获取教师详情
   */
  async getById(id: string): Promise<Teacher | null> {
    return findById<Teacher>('teachers', id);
  },

  /**
   * 创建教师
   */
  async create(data: Partial<Teacher>): Promise<Teacher> {
    return create<Teacher>('teachers', data);
  },

  /**
   * 更新教师信息
   */
  async update(id: string, data: Partial<Teacher>): Promise<boolean> {
    return update<Teacher>('teachers', id, data);
  },

  /**
   * 删除教师
   */
  async delete(id: string): Promise<boolean> {
    return remove('teachers', id);
  },
};

// ============================================================================
// 出勤相关操作
// ============================================================================

export const attendanceService = {
  /**
   * 获取出勤记录列表
   */
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Attendance>> {
    // 使用 attendance_records 集合（实际有 5 条数据）
    return paginatedQuery<Attendance>('attendance_records', params);
  },

  /**
   * 创建出勤记录
   */
  async create(data: Partial<Attendance>): Promise<Attendance> {
    return create<Attendance>('attendance_records', data);
  },

  /**
   * 更新出勤记录
   */
  async update(id: string, data: Partial<Attendance>): Promise<boolean> {
    return update<Attendance>('attendance_records', id, data);
  },

  /**
   * 删除出勤记录
   */
  async delete(id: string): Promise<boolean> {
    return remove('attendance_records', id);
  },
};

// ============================================================================
// 考试相关操作
// ============================================================================

export const examService = {
  /**
   * 获取考试列表
   */
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Exam>> {
    return paginatedQuery<Exam>('exams', params);
  },

  /**
   * 获取考试详情
   */
  async getById(id: string): Promise<Exam | null> {
    return findById<Exam>('exams', id);
  },

  /**
   * 创建考试
   */
  async create(data: Partial<Exam>): Promise<Exam> {
    return create<Exam>('exams', data);
  },

  /**
   * 更新考试
   */
  async update(id: string, data: Partial<Exam>): Promise<boolean> {
    return update<Exam>('exams', id, data);
  },

  /**
   * 删除考试
   */
  async delete(id: string): Promise<boolean> {
    return remove('exams', id);
  },

  /**
   * 获取考试题目
   */
  async getQuestions(examId: string): Promise<Question[]> {
    const db = app.database();
    const { data } = await db.collection('questions').where({ examId }).orderBy('order', 'asc').get();
    return data as Question[];
  },

  /**
   * 添加题目
   */
  async addQuestion(data: Partial<Question>): Promise<Question> {
    return create<Question>('questions', data);
  },
};

// ============================================================================
// 证书相关操作
// ============================================================================

export const certificateService = {
  /**
   * 获取证书列表
   */
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Certificate>> {
    return paginatedQuery<Certificate>('certificates', params);
  },

  /**
   * 获取用户证书
   */
  async getUserCertificates(userId: string): Promise<Certificate[]> {
    const db = app.database();
    const { data } = await db.collection('certificates').where({ userId }).get();
    return data as Certificate[];
  },

  /**
   * 创建证书
   */
  async create(data: Partial<Certificate>): Promise<Certificate> {
    return create<Certificate>('certificates', data);
  },

  /**
   * 更新证书状态
   */
  async updateStatus(id: string, status: Certificate['status']): Promise<boolean> {
    return update<Certificate>('certificates', id, { status });
  },
};

// ============================================================================
// 营销工具相关操作
// ============================================================================

export const couponService = {
  /**
   * 获取优惠券列表
   */
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<Coupon>> {
    return paginatedQuery<Coupon>('coupons', params);
  },

  /**
   * 创建优惠券
   */
  async create(data: Partial<Coupon>): Promise<Coupon> {
    return create<Coupon>('coupons', data);
  },

  /**
   * 更新优惠券
   */
  async update(id: string, data: Partial<Coupon>): Promise<boolean> {
    return update<Coupon>('coupons', id, data);
  },

  /**
   * 删除优惠券
   */
  async delete(id: string): Promise<boolean> {
    return remove('coupons', id);
  },
};

export const groupBuyService = {
  /**
   * 获取拼团列表
   */
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<GroupBuy>> {
    return paginatedQuery<GroupBuy>('groupBuys', params);
  },

  /**
   * 创建拼团
   */
  async create(data: Partial<GroupBuy>): Promise<GroupBuy> {
    return create<GroupBuy>('groupBuys', data);
  },

  /**
   * 更新拼团
   */
  async update(id: string, data: Partial<GroupBuy>): Promise<boolean> {
    return update<GroupBuy>('groupBuys', id, data);
  },
};

// ============================================================================
// 直播相关操作
// ============================================================================

export const liveStreamService = {
  /**
   * 获取直播列表
   */
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<LiveStream>> {
    return paginatedQuery<LiveStream>('liveStreams', params);
  },

  /**
   * 获取直播详情
   */
  async getById(id: string): Promise<LiveStream | null> {
    return findById<LiveStream>('liveStreams', id);
  },

  /**
   * 创建直播
   */
  async create(data: Partial<LiveStream>): Promise<LiveStream> {
    return create<LiveStream>('liveStreams', data);
  },

  /**
   * 更新直播
   */
  async update(id: string, data: Partial<LiveStream>): Promise<boolean> {
    return update<LiveStream>('liveStreams', id, data);
  },

  /**
   * 更新直播状态
   */
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
  
  /**
   * 获取题库列表
   */
  async getList(params: PaginationParams & FilterParams): Promise<PaginatedResponse<QuestionBank>> {
    return paginatedQuery<QuestionBank>('questionBanks', params);
  },

  /**
   * 获取题库详情
   */
  async getById(id: string): Promise<QuestionBank | null> {
    return findById<QuestionBank>('questionBanks', id);
  },

  /**
   * 创建题库
   */
  async create(data: Partial<QuestionBank>): Promise<QuestionBank> {
    return create<QuestionBank>('questionBanks', { ...data, questionCount: 0 });
  },

  /**
   * 更新题库
   */
  async update(id: string, data: Partial<QuestionBank>): Promise<boolean> {
    return update<QuestionBank>('questionBanks', id, data);
  },

  /**
   * 删除题库
   */
  async delete(id: string): Promise<boolean> {
    return remove('questionBanks', id);
  },

  /**
   * 获取课程关联的题库
   */
  async getByCourseId(courseId: string): Promise<QuestionBank[]> {
    const db = app.database();
    const { data } = await db.collection('questionBanks').where({ courseIds: courseId }).get();
    return data as QuestionBank[];
  },

  // ========== 题目管理 ==========

  /**
   * 获取题库的所有题目
   */
  async getQuestions(bankId: string): Promise<BankQuestion[]> {
    const db = app.database();
    const { data } = await db.collection('bankQuestions').where({ bankId }).orderBy('createdAt', 'asc').get();
    return data as BankQuestion[];
  },

  /**
   * 获取题目详情
   */
  async getQuestionById(questionId: string): Promise<BankQuestion | null> {
    return findById<BankQuestion>('bankQuestions', questionId);
  },

  /**
   * 创建题目
   */
  async createQuestion(data: Partial<BankQuestion>): Promise<BankQuestion> {
    const question = await create<BankQuestion>('bankQuestions', {
      ...data,
      usageCount: 0,
      correctRate: 0,
    });
    
    // 更新题库题目数量
    const db = app.database();
    const bank = await this.getById(data.bankId!);
    if (bank) {
      await db.collection('questionBanks').doc(data.bankId!).update({
        questionCount: (bank.questionCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
    }
    
    return question;
  },

  /**
   * 更新题目
   */
  async updateQuestion(questionId: string, data: Partial<BankQuestion>): Promise<boolean> {
    return update<BankQuestion>('bankQuestions', questionId, data);
  },

  /**
   * 删除题目
   */
  async deleteQuestion(questionId: string, bankId: string): Promise<boolean> {
    await remove('bankQuestions', questionId);
    
    // 更新题库题目数量
    const db = app.database();
    const bank = await this.getById(bankId);
    if (bank && bank.questionCount > 0) {
      await db.collection('questionBanks').doc(bankId).update({
        questionCount: bank.questionCount - 1,
        updatedAt: new Date().toISOString(),
      });
    }
    
    return true;
  },

  /**
   * 随机获取练习题
   */
  async getRandomQuestions(bankId: string, count: number): Promise<BankQuestion[]> {
    const db = app.database();
    const { data } = await db.collection('bankQuestions').where({ bankId }).get();
    
    // 随机打乱并取前count个
    const shuffled = [...data].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count) as BankQuestion[];
  },

  // ========== 练习记录 ==========

  /**
   * 保存练习记录
   */
  async savePracticeRecord(data: Partial<PracticeRecord>): Promise<PracticeRecord> {
    return create<PracticeRecord>('practiceRecords', data);
  },

  /**
   * 获取用户的练习记录
   */
  async getUserPracticeRecords(userId: string, params: PaginationParams): Promise<PaginatedResponse<PracticeRecord>> {
    return paginatedQuery<PracticeRecord>('practiceRecords', { ...params, userId });
  },

  /**
   * 获取练习统计
   */
  async getPracticeStats(userId: string): Promise<{
    totalPractices: number;
    totalQuestions: number;
    correctRate: number;
    totalDuration: number;
  }> {
    const db = app.database();
    const { data } = await db.collection('practiceRecords').where({ userId }).get();
    
    const records = data as PracticeRecord[];
    const totalPractices = records.length;
    const totalQuestions = records.reduce((sum, r) => sum + r.questionCount, 0);
    const totalCorrect = records.reduce((sum, r) => sum + r.correctCount, 0);
    const correctRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    
    return { totalPractices, totalQuestions, correctRate, totalDuration };
  },

  // ========== 收藏题目 ==========

  /**
   * 收藏题目
   */
  async addToFavorites(data: Partial<FavoriteQuestion>): Promise<FavoriteQuestion> {
    const db = app.database();
    
    // 检查是否已收藏
    const { data: existing } = await db.collection('favoriteQuestions')
      .where({ userId: data.userId, questionId: data.questionId })
      .get();
    
    if (existing.length > 0) {
      throw new Error('该题目已收藏');
    }
    
    return create<FavoriteQuestion>('favoriteQuestions', data);
  },

  /**
   * 取消收藏
   */
  async removeFromFavorites(userId: string, questionId: string): Promise<boolean> {
    const db = app.database();
    const { data } = await db.collection('favoriteQuestions')
      .where({ userId, questionId })
      .get();
    
    if (data.length > 0) {
      await db.collection('favoriteQuestions').doc(data[0]._id).remove();
      return true;
    }
    return false;
  },

  /**
   * 获取用户收藏的题目
   */
  async getUserFavorites(userId: string, params: PaginationParams): Promise<PaginatedResponse<FavoriteQuestion>> {
    return paginatedQuery<FavoriteQuestion>('favoriteQuestions', { ...params, userId });
  },

  /**
   * 检查是否已收藏
   */
  async isFavorite(userId: string, questionId: string): Promise<boolean> {
    const db = app.database();
    const { data } = await db.collection('favoriteQuestions')
      .where({ userId, questionId })
      .get();
    return data.length > 0;
  },

  // ========== 错题本 ==========

  /**
   * 添加错题
   */
  async addToWrongQuestions(data: Partial<WrongQuestion>): Promise<WrongQuestion> {
    const db = app.database();
    
    // 检查是否已存在
    const { data: existing } = await db.collection('wrongQuestions')
      .where({ userId: data.userId, questionId: data.questionId })
      .get();
    
    if (existing.length > 0) {
      // 更新错误次数
      const wrongQ = existing[0] as WrongQuestion;
      await db.collection('wrongQuestions').doc(wrongQ._id).update({
        wrongCount: wrongQ.wrongCount + 1,
        userAnswer: data.userAnswer,
        lastWrongTime: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { ...wrongQ, wrongCount: wrongQ.wrongCount + 1 } as WrongQuestion;
    }
    
    return create<WrongQuestion>('wrongQuestions', {
      ...data,
      wrongCount: 1,
      lastWrongTime: new Date().toISOString(),
    });
  },

  /**
   * 获取用户错题本
   */
  async getUserWrongQuestions(userId: string, params: PaginationParams): Promise<PaginatedResponse<WrongQuestion>> {
    return paginatedQuery<WrongQuestion>('wrongQuestions', { ...params, userId });
  },

  /**
   * 从错题本移除
   */
  async removeFromWrongQuestions(userId: string, questionId: string): Promise<boolean> {
    const db = app.database();
    const { data } = await db.collection('wrongQuestions')
      .where({ userId, questionId })
      .get();
    
    if (data.length > 0) {
      await db.collection('wrongQuestions').doc(data[0]._id).remove();
      return true;
    }
    return false;
  },
};

// ============================================================================
// 考试记录相关操作（examAttempts 集合）
// ============================================================================

/**
 * 考试记录数据结构
 */
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
  /**
   * 获取考试记录列表
   */
  async getList(params: PaginationParams & FilterParams & { userId?: string; examId?: string }): Promise<PaginatedResponse<ExamAttemptRecord>> {
    const { page = 1, pageSize = 20, userId, examId, ...filters } = params;
    const skip = (page - 1) * pageSize;
    const db = app.database();
    let collection = db.collection('examAttempts');

    const whereConditions: Record<string, any> = { ...filters };
    if (userId) whereConditions.userId = userId;
    if (examId) whereConditions.examId = examId;

    if (Object.keys(whereConditions).length > 0) {
      collection = collection.where(whereConditions);
    }

    const countResult = await collection.count();
    const total = countResult.total || 0;
    const { data } = await collection.skip(skip).limit(pageSize).orderBy('submitTime', 'desc').get();

    return {
      list: data as ExamAttemptRecord[],
      total,
      page,
      pageSize,
    };
  },

  /**
   * 获取考试记录详情
   */
  async getById(id: string): Promise<ExamAttemptRecord | null> {
    return findById<ExamAttemptRecord>('examAttempts', id);
  },

  /**
   * 获取用户的考试记录
   */
  async getByUserId(userId: string, examId?: string): Promise<ExamAttemptRecord[]> {
    const db = app.database();
    let query = db.collection('examAttempts').where({ userId });
    if (examId) {
      query = query.where({ examId, userId });
    }
    const { data } = await query.orderBy('submitTime', 'desc').get();
    return data as ExamAttemptRecord[];
  },

  /**
   * 创建考试记录
   */
  async create(data: Partial<ExamAttemptRecord>): Promise<ExamAttemptRecord> {
    return create<ExamAttemptRecord>('examAttempts', data);
  },

  /**
   * 更新考试记录
   */
  async update(id: string, data: Partial<ExamAttemptRecord>): Promise<boolean> {
    return update<ExamAttemptRecord>('examAttempts', id, data);
  },

  /**
   * 删除考试记录
   */
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
