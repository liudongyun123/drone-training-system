// ============================================================================
// 首页展示班级服务 - 管理首页"最新开班"区域显示的班级
// ============================================================================
import { CloudAdminService } from './CloudAdminService';

const COLLECTION_NAME = 'featuredClasses';
const CONFIG_ID = 'home-featured-classes';

export interface FeaturedClassConfig {
  classIds: string[];
}

/**
 * 获取首页展示的班级列表
 */
export async function getFeaturedClasses(): Promise<string[]> {
  try {
    const result = await CloudAdminService.get(COLLECTION_NAME, CONFIG_ID);
    // 处理记录不存在的情况
    if (!result.success) {
      console.log('[featuredClassService] 记录不存在，将创建默认记录');
      await CloudAdminService.upsert(COLLECTION_NAME, CONFIG_ID, { classIds: [] });
      return [];
    }
    if (result.data && result.data.classIds) {
      return result.data.classIds;
    }
    return [];
  } catch (error) {
    console.error('获取首页展示班级失败:', error);
    return [];
  }
}

/**
 * 更新首页展示的班级列表
 */
export async function updateFeaturedClasses(classIds: string[]): Promise<boolean> {
  try {
    // 使用 upsert 操作（插入或更新）
    const result = await CloudAdminService.upsert(COLLECTION_NAME, CONFIG_ID, { classIds });
    return result.success;
  } catch (error) {
    console.error('更新首页展示班级失败:', error);
    return false;
  }
}

/**
 * 添加班级到首页展示列表
 */
export async function addFeaturedClass(classId: string): Promise<boolean> {
  try {
    const currentIds = await getFeaturedClasses();
    if (currentIds.includes(classId)) {
      console.log('班级已在首页展示列表中');
      return true;
    }
    const newIds = [...currentIds, classId];
    return await updateFeaturedClasses(newIds);
  } catch (error) {
    console.error('添加班级到首页失败:', error);
    return false;
  }
}

/**
 * 从首页展示列表移除班级
 */
export async function removeFeaturedClass(classId: string): Promise<boolean> {
  try {
    const currentIds = await getFeaturedClasses();
    const newIds = currentIds.filter(id => id !== classId);
    return await updateFeaturedClasses(newIds);
  } catch (error) {
    console.error('从首页移除班级失败:', error);
    return false;
  }
}

/**
 * 移动班级排序（上移）
 */
export async function moveClassUp(index: number): Promise<boolean> {
  try {
    const currentIds = await getFeaturedClasses();
    if (index === 0 || index >= currentIds.length) return false;
    const newIds = [...currentIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    return await updateFeaturedClasses(newIds);
  } catch (error) {
    console.error('班级上移失败:', error);
    return false;
  }
}

/**
 * 移动班级排序（下移）
 */
export async function moveClassDown(index: number): Promise<boolean> {
  try {
    const currentIds = await getFeaturedClasses();
    if (index >= currentIds.length - 1) return false;
    const newIds = [...currentIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    return await updateFeaturedClasses(newIds);
  } catch (error) {
    console.error('班级下移失败:', error);
    return false;
  }
}

export const featuredClassService = {
  getFeaturedClasses,
  updateFeaturedClasses,
  addFeaturedClass,
  removeFeaturedClass,
  moveClassUp,
  moveClassDown
};
