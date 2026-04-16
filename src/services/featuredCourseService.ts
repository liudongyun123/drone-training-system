/**
 * 热门课程管理服务
 * 管理首页热门课程展示配置
 */
import { db } from './cloudBaseService';
import { ensureAuthenticated } from '../utils/cloudbase';

// 热门课程配置集合
const COLLECTION_NAME = 'featuredCourses';

/**
 * 获取首页热门课程列表
 */
export async function getFeaturedCourses(): Promise<string[]> {
  try {
    // 确保用户已认证（用于数据库安全规则验证）
    await ensureAuthenticated();
    
    const result = await db.collection(COLLECTION_NAME).doc('home-featured').get();
    
    if (result.code) {
      console.error('获取热门课程失败:', result.code, result.message);
      return [];
    }
    
    if (result.data && result.data.length > 0) {
      return result.data[0].courseIds || [];
    }
    return [];
  } catch (error) {
    console.error('获取热门课程失败:', error);
    return [];
  }
}

/**
 * 设置首页热门课程
 * @param courseIds 课程ID列表
 */
export async function setFeaturedCourses(courseIds: string[]): Promise<boolean> {
  try {
    // 确保用户已认证（用于数据库安全规则验证）
    await ensureAuthenticated();
    
    // 先尝试获取现有配置
    const existing = await db.collection(COLLECTION_NAME).doc('home-featured').get();
    
    if (existing.data && existing.data.length > 0) {
      // 更新现有配置
      const result = await db.collection(COLLECTION_NAME).doc('home-featured').update({
        data: {
          courseIds,
          updateTime: new Date().toISOString(),
        }
      });
      
      if (result.code) {
        console.error('更新热门课程失败:', result);
        return false;
      }
      return true;
    } else {
      // 创建新配置
      const result = await db.collection(COLLECTION_NAME).add({
        data: {
          _id: 'home-featured',
          courseIds,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
        }
      });
      
      if (result.code) {
        console.error('创建热门课程配置失败:', result);
        return false;
      }
      return true;
    }
  } catch (error) {
    console.error('设置热门课程失败:', error);
    return false;
  }
}

/**
 * 添加课程到热门列表
 * @param courseId 课程ID
 */
export async function addFeaturedCourse(courseId: string): Promise<boolean> {
  try {
    const currentIds = await getFeaturedCourses();
    if (currentIds.includes(courseId)) {
      return true; // 已经存在
    }
    if (currentIds.length >= 8) {
      console.warn('热门课程数量已达上限(8个)');
      return false;
    }
    return await setFeaturedCourses([...currentIds, courseId]);
  } catch (error) {
    console.error('添加热门课程失败:', error);
    return false;
  }
}

/**
 * 从热门列表移除课程
 * @param courseId 课程ID
 */
export async function removeFeaturedCourse(courseId: string): Promise<boolean> {
  try {
    const currentIds = await getFeaturedCourses();
    const newIds = currentIds.filter(id => id !== courseId);
    return await setFeaturedCourses(newIds);
  } catch (error) {
    console.error('移除热门课程失败:', error);
    return false;
  }
}

/**
 * 更新热门课程顺序
 * @param courseIds 新的课程ID顺序
 */
export async function reorderFeaturedCourses(courseIds: string[]): Promise<boolean> {
  try {
    // 确保用户已认证（用于数据库安全规则验证）
    await ensureAuthenticated();
    
    const result = await db.collection(COLLECTION_NAME).doc('home-featured').update({
      data: {
        courseIds,
        updateTime: new Date().toISOString(),
      }
    });
    
    if (result.code) {
      console.error('更新热门课程顺序失败:', result);
      return false;
    }
    return true;
  } catch (error) {
    console.error('更新热门课程顺序失败:', error);
    return false;
  }
}

// 导出服务对象
export const featuredCourseService = {
  getFeaturedCourses,
  setFeaturedCourses,
  addFeaturedCourse,
  removeFeaturedCourse,
  reorderFeaturedCourses,
};
