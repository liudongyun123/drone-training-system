// ============================================================================
// 首页学习路径配置服务 - 管理首页展示的学习路径
// ============================================================================
import { CloudAdminService } from './CloudAdminService';

const COLLECTION_NAME = 'featuredLearningPaths';
const CONFIG_ID = 'home-featured-paths';

export interface FeaturedPathConfig {
  pathIds: string[];
}

/**
 * 获取首页展示的学习路径列表
 */
export async function getFeaturedPaths(): Promise<string[]> {
  try {
    const result = await CloudAdminService.get(COLLECTION_NAME, CONFIG_ID);
    if (result.success && result.data && result.data.pathIds) {
      return result.data.pathIds;
    }
    return [];
  } catch (error) {
    console.error('获取首页展示学习路径失败:', error);
    return [];
  }
}

/**
 * 更新首页展示的学习路径列表
 */
export async function updateFeaturedPaths(pathIds: string[]): Promise<boolean> {
  try {
    // 使用 upsert 操作（插入或更新）
    const result = await CloudAdminService.upsert(COLLECTION_NAME, CONFIG_ID, { pathIds });
    return result.success;
  } catch (error) {
    console.error('更新首页展示学习路径失败:', error);
    return false;
  }
}

/**
 * 添加学习路径到首页展示列表
 */
export async function addFeaturedPath(pathId: string): Promise<boolean> {
  try {
    const currentIds = await getFeaturedPaths();
    if (currentIds.includes(pathId)) {
      console.log('学习路径已在首页展示列表中');
      return true;
    }
    const newIds = [...currentIds, pathId];
    return await updateFeaturedPaths(newIds);
  } catch (error) {
    console.error('添加学习路径到首页失败:', error);
    return false;
  }
}

/**
 * 从首页展示列表移除学习路径
 */
export async function removeFeaturedPath(pathId: string): Promise<boolean> {
  try {
    const currentIds = await getFeaturedPaths();
    const newIds = currentIds.filter(id => id !== pathId);
    return await updateFeaturedPaths(newIds);
  } catch (error) {
    console.error('从首页移除学习路径失败:', error);
    return false;
  }
}

/**
 * 移动学习路径排序（上移）
 */
export async function movePathUp(index: number): Promise<boolean> {
  try {
    const currentIds = await getFeaturedPaths();
    if (index === 0 || index >= currentIds.length) return false;
    const newIds = [...currentIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    return await updateFeaturedPaths(newIds);
  } catch (error) {
    console.error('学习路径上移失败:', error);
    return false;
  }
}

/**
 * 移动学习路径排序（下移）
 */
export async function movePathDown(index: number): Promise<boolean> {
  try {
    const currentIds = await getFeaturedPaths();
    if (index >= currentIds.length - 1) return false;
    const newIds = [...currentIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    return await updateFeaturedPaths(newIds);
  } catch (error) {
    console.error('学习路径下移失败:', error);
    return false;
  }
}

export const featuredPathService = {
  getFeaturedPaths,
  updateFeaturedPaths,
  addFeaturedPath,
  removeFeaturedPath,
  movePathUp,
  movePathDown
};
