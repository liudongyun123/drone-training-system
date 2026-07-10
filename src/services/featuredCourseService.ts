// @ts-nocheck
/**
 * 首页内容配置服务 v6.0
 * 
 * 统一管理首页展示的课程、班级、学习路径。
 * 全部通过 adminService → db-init 云函数。
 * 
 * @deprecated featuredClassService.ts 和 featuredPathService.ts 中的重复实现已被标记废弃，
 *   此文件为统一的首页配置入口。
 */

import { adminService } from './adminService'

// page_configs 集合的 section 名称
export const PAGE_SECTIONS = {
  HOT_COURSES: 'courses',
  ENROLLING_CLASSES: 'classes',
  FEATURED_PATHS: 'learningPaths',
} as const

// ==================== 辅助函数 ====================

async function getConfig<T = any>(section: string): Promise<{ doc: any; items: T[] }> {
  const result = await adminService.list('page_configs', { section }, { limit: 1 })
  const list = result?.data?.list || []
  if (list.length > 0) {
    const doc = list[0]
    return { doc, items: doc.data?.items || [] }
  }
  return { doc: null, items: [] }
}

async function setConfig(section: string, items: any[]): Promise<boolean> {
  try {
    const { doc } = await getConfig(section)
    if (doc?._id) {
      await adminService.update('page_configs', doc._id, { data: { items } })
    } else {
      await adminService.add('page_configs', { section, data: { items } })
    }
    return true
  } catch (error) {
    console.error(`[featuredCourse] setConfig(${section}) 失败:`, error)
    return false
  }
}

// ==================== 热门课程 ====================

export async function getFeaturedCourses(): Promise<string[]> {
  try {
    const { items } = await getConfig(PAGE_SECTIONS.HOT_COURSES)
    return items.map((item: any) => item.courseId || item.id).filter(Boolean)
  } catch (error) {
    console.error('[featuredCourseService] 获取热门课程配置失败:', error)
    return []
  }
}

export async function setFeaturedCourses(courseIds: string[]): Promise<boolean> {
  const items = courseIds.map((id, index) => ({ courseId: id, order: index }))
  return setConfig(PAGE_SECTIONS.HOT_COURSES, items)
}

// ==================== 招生班级 ====================

export async function getFeaturedClasses(): Promise<string[]> {
  try {
    const { items } = await getConfig(PAGE_SECTIONS.ENROLLING_CLASSES)
    return items.map((item: any) => item.classId || item.id).filter(Boolean)
  } catch (error) {
    console.error('[featuredCourseService] 获取招生班级配置失败:', error)
    return []
  }
}

export async function setFeaturedClasses(classIds: string[]): Promise<boolean> {
  const items = classIds.map((id, index) => ({ classId: id, order: index }))
  return setConfig(PAGE_SECTIONS.ENROLLING_CLASSES, items)
}

// ==================== 学习路径 ====================

export async function getFeaturedPaths(): Promise<string[]> {
  try {
    const { items } = await getConfig(PAGE_SECTIONS.FEATURED_PATHS)
    return items.map((item: any) => item.pathId || item.id).filter(Boolean)
  } catch (error) {
    console.error('[featuredCourseService] 获取学习路径配置失败:', error)
    return []
  }
}

export async function setFeaturedPaths(pathIds: string[]): Promise<boolean> {
  const items = pathIds.map((id, index) => ({ pathId: id, order: index }))
  return setConfig(PAGE_SECTIONS.FEATURED_PATHS, items)
}

// ==================== 排序操作（班级） ====================

export async function addFeaturedClass(classId: string): Promise<boolean> {
  const currentIds = await getFeaturedClasses()
  if (currentIds.includes(classId)) return true
  return setFeaturedClasses([...currentIds, classId])
}

export async function removeFeaturedClass(classId: string): Promise<boolean> {
  const currentIds = await getFeaturedClasses()
  return setFeaturedClasses(currentIds.filter(id => id !== classId))
}

export async function moveClassUp(index: number): Promise<boolean> {
  const currentIds = await getFeaturedClasses()
  if (index === 0 || index >= currentIds.length) return false
  const newIds = [...currentIds];
  [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]]
  return setFeaturedClasses(newIds)
}

export async function moveClassDown(index: number): Promise<boolean> {
  const currentIds = await getFeaturedClasses()
  if (index >= currentIds.length - 1) return false
  const newIds = [...currentIds];
  [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]]
  return setFeaturedClasses(newIds)
}

// ==================== 排序操作（学习路径） ====================

export async function addFeaturedPath(pathId: string): Promise<boolean> {
  const currentIds = await getFeaturedPaths()
  if (currentIds.includes(pathId)) return true
  return setFeaturedPaths([...currentIds, pathId])
}

export async function removeFeaturedPath(pathId: string): Promise<boolean> {
  const currentIds = await getFeaturedPaths()
  return setFeaturedPaths(currentIds.filter(id => id !== pathId))
}

export async function movePathUp(index: number): Promise<boolean> {
  const currentIds = await getFeaturedPaths()
  if (index === 0 || index >= currentIds.length) return false
  const newIds = [...currentIds];
  [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]]
  return setFeaturedPaths(newIds)
}

export async function movePathDown(index: number): Promise<boolean> {
  const currentIds = await getFeaturedPaths()
  if (index >= currentIds.length - 1) return false
  const newIds = [...currentIds];
  [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]]
  return setFeaturedPaths(newIds)
}

// ==================== 兼容导出 ====================

export const featuredCourseService = { getFeaturedCourses, setFeaturedCourses }
export const featuredClassService = { getFeaturedClasses, setFeaturedClasses, addFeaturedClass, removeFeaturedClass, moveClassUp, moveClassDown }
export const featuredPathService = { getFeaturedPaths, setFeaturedPaths, addFeaturedPath, removeFeaturedPath, movePathUp, movePathDown }
