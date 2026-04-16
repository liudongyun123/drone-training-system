/**
 * 管理后台 API 服务
 * 通过云函数调用数据库操作，解决前端 SDK 安全规则限制问题
 * 
 * 生产环境最佳实践：前端通过云函数访问数据库，而不是直接使用 SDK
 */

import { app, ensureAuthenticated } from '@/utils/cloudbase';
import { db } from './cloudBaseService';

/**
 * 云函数调用封装
 * 使用项目统一的 SDK 实例，确保认证状态
 */
async function callFunction<T = any>(params: {
  action: 'list' | 'get' | 'add' | 'update' | 'delete' | 'batchDelete' | 'count';
  collection: string;
  data?: Record<string, any>;
  query?: Record<string, any>;
  docId?: string;
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    field?: Record<string, boolean>;
  };
}): Promise<ApiResponse<T>> {
  try {
    // 确保用户已认证（匿名登录或已有会话）
    await ensureAuthenticated();

    const result = await app.callFunction({
      name: 'admin',
      data: params
    });

    console.log(`[adminApi] ${params.action} ${params.collection}:`, result.data);

    if (result.errCode === 0 && result.data) {
      if (result.data.code === 0) {
        return {
          success: true,
          data: result.data.data,
          message: result.data.message
        };
      } else {
        console.error(`API 调用失败 [${result.data.code}]:`, result.data.message);
        return {
          success: false,
          data: null,
          message: result.data.message || '操作失败'
        };
      }
    }

    throw new Error(`请求失败: ${result.errCode} - ${result.errMsg}`);
  } catch (error: any) {
    console.error('API 调用异常:', error);
    return {
      success: false,
      data: null,
      message: error.message || '网络请求失败'
    };
  }
}

/**
 * 分类管理 API
 */
export const categoryApi = {
  /**
   * 获取分类列表
   */
  async getList(params?: { status?: string }): Promise<ApiResponse<CourseCategory[]>> {
    const query: Record<string, any> = {};
    if (params?.status !== undefined && params.status !== '') {
      query.status = params.status === 'true' ? true : params.status === 'false' ? false : params.status;
    }

    return callFunction<CourseCategory[]>({
      action: 'list',
      collection: 'categories',
      options: {
        limit: 100,
        orderBy: 'order',
        order: 'asc'
      }
    });
  },

  /**
   * 获取单个分类
   */
  async getById(id: string): Promise<ApiResponse<CourseCategory>> {
    return callFunction<CourseCategory>({
      action: 'get',
      collection: 'categories',
      docId: id
    });
  },

  /**
   * 创建分类
   */
  async create(data: Partial<CourseCategory>): Promise<ApiResponse<CourseCategory>> {
    return callFunction<CourseCategory>({
      action: 'add',
      collection: 'categories',
      data
    });
  },

  /**
   * 更新分类
   */
  async update(id: string, data: Partial<CourseCategory>): Promise<ApiResponse<CourseCategory>> {
    return callFunction<CourseCategory>({
      action: 'update',
      collection: 'categories',
      docId: id,
      data
    });
  },

  /**
   * 删除分类
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return callFunction<void>({
      action: 'delete',
      collection: 'categories',
      docId: id
    });
  },

  /**
   * 批量删除
   */
  async batchDelete(ids: string[]): Promise<ApiResponse<void>> {
    return callFunction<void>({
      action: 'batchDelete',
      collection: 'categories',
      query: {
        _id: db.command.or(ids.map(id => db.command.eq(id)))
      }
    });
  }
};

/**
 * 热门课程管理 API
 */
export const featuredCourseApi = {
  /**
   * 获取首页热门课程列表
   */
  async getList(): Promise<ApiResponse<{courseIds?: string[]; _id?: string}>> {
    return callFunction<{courseIds?: string[]; _id?: string}>({
      action: 'get',
      collection: 'featuredCourses',
      docId: 'home-featured'
    });
  },

  /**
   * 设置热门课程
   */
  async setFeaturedCourses(courseIds: string[]): Promise<ApiResponse<void>> {
    return callFunction<void>({
      action: 'update',
      collection: 'featuredCourses',
      docId: 'home-featured',
      data: {
        courseIds,
        updatedAt: new Date().toISOString()
      }
    });
  },

  /**
   * 更新热门课程顺序
   */
  async reorder(courseIds: string[]): Promise<ApiResponse<void>> {
    return callFunction<void>({
      action: 'update',
      collection: 'featuredCourses',
      docId: 'home-featured',
      data: {
        courseIds,
        updatedAt: new Date().toISOString()
      }
    });
  },

  /**
   * 添加单个课程到热门列表
   */
  async addCourse(courseId: string): Promise<ApiResponse<void>> {
    const current = await this.getList();
    if (!current.success || !current.data) {
      return { success: false, data: null, message: '获取当前配置失败' };
    }
    
    const currentIds = current.data.courseIds || [];
    if (currentIds.length >= 8) {
      return { success: false, data: null, message: '热门课程已达上限(8个)' };
    }
    
    if (currentIds.includes(courseId)) {
      return { success: false, data: null, message: '该课程已在热门列表中' };
    }
    
    return this.setFeaturedCourses([...currentIds, courseId]);
  },

  /**
   * 从热门列表移除课程
   */
  async removeCourse(courseId: string): Promise<ApiResponse<void>> {
    const current = await this.getList();
    if (!current.success || !current.data) {
      return { success: false, data: null, message: '获取当前配置失败' };
    }
    
    const currentIds = current.data.courseIds || [];
    const newIds = currentIds.filter(id => id !== courseId);
    
    return this.setFeaturedCourses(newIds);
  }
};

/**
 * 课程管理 API
 */
export const courseApi = {
  /**
   * 获取课程列表
   */
  async getList(params?: { 
    page?: number; 
    pageSize?: number; 
    category?: string;
    status?: string;
  }): Promise<ApiResponse<{list: Course[]; total: number}>> {
    const { page = 1, pageSize = 100 } = params || {};
    
    return callFunction<{list: Course[]; total: number}>({
      action: 'list',
      collection: 'courses',
      options: {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        orderBy: 'createdAt',
        order: 'desc'
      }
    });
  },

  /**
   * 获取单个课程
   */
  async getById(id: string): Promise<ApiResponse<Course>> {
    return callFunction<Course>({
      action: 'get',
      collection: 'courses',
      docId: id
    });
  },

  /**
   * 获取多个课程（根据ID列表）
   */
  async getByIds(ids: string[]): Promise<ApiResponse<Course[]>> {
    const results: Course[] = [];
    for (const id of ids) {
      const res = await this.getById(id);
      if (res.success && res.data) {
        results.push(res.data);
      }
    }
    return { success: true, data: results, message: '查询成功' };
  }
};
