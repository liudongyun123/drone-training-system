/**
 * 课程分类服务
 * 提供分类数据的增删改查
 */
import { adminService } from './adminService';

export interface CourseCategory {
  _id?: string;
  id?: string;
  name: string;
  code: string;
  icon?: string;
  description?: string;
  sort?: number;
  status: 'active' | 'disabled';
  createdAt?: string;
  updatedAt?: string;
}

class CategoryService {
  /**
   * 获取所有启用的分类
   */
  async getAllActive(): Promise<{ success: boolean; data: CourseCategory[]; error?: string }> {
    try {
      console.log('[CategoryService] 开始获取分类...');
      const res = await adminService.list(
        'categories',
        { status: 'active' },
        { limit: 100, orderBy: 'sort', order: 'asc' }
      );
      
      console.log('[CategoryService] 云函数返回结果:', res);
      console.log('[CategoryService] res.data 类型:', typeof res.data, Array.isArray(res.data));

      if (res.code === 0 && Array.isArray(res.data)) {
        console.log('[CategoryService] 获取到分类数量:', res.data.length);
        console.log('[CategoryService] 分类数据:', res.data);
        return { success: true, data: res.data };
      }
      console.log('[CategoryService] 获取分类失败:', res.message);
      return { success: false, data: [], error: res.message || '获取分类失败' };
    } catch (error: any) {
      console.error('[CategoryService] 获取分类异常:', error);
      return { success: false, data: [], error: error.message || '获取分类失败' };
    }
  }

  /**
   * 根据编码获取分类
   */
  async getByCode(code: string): Promise<{ success: boolean; data: CourseCategory | null; error?: string }> {
    try {
      const res = await adminService.list(
        'categories',
        { code, status: 'active' },
        { limit: 1 }
      );

      if (res.code === 0 && Array.isArray(res.data) && res.data.length > 0) {
        return { success: true, data: res.data[0] };
      }
      return { success: false, data: null, error: '分类不存在' };
    } catch (error: any) {
      console.error('获取分类失败:', error);
      return { success: false, data: null, error: error.message || '获取分类失败' };
    }
  }
}

export const categoryService = new CategoryService();
