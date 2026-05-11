/**
 * 首页配置服务 - Web端
 * 从统一的 page_configs 集合读取配置
 */
import { dbService } from './cloudBaseService'

// page_configs 集合的 section 名称（与小程序端统一）
export const PAGE_SECTIONS = {
  HOT_COURSES: 'courses',
  ENROLLING_CLASSES: 'classes',
  FEATURED_PATHS: 'learningPaths',
} as const

/**
 * 获取首页热门课程配置
 * @returns 课程ID列表
 */
export async function getFeaturedCourses(): Promise<string[]> {
  try {
    // 查询 section = 'hotCourses' 的配置
    const result = await dbService.where('page_configs', { section: PAGE_SECTIONS.HOT_COURSES })

    if (result && result.length > 0) {
      const config = result[0]
      return config.data?.items?.map((item: any) => item.courseId || item.id).filter(Boolean) || []
    }
    return []
  } catch (error) {
    console.error('[featuredCourseService] 获取热门课程配置失败:', error)
    return []
  }
}

/**
 * 获取首页招生班级配置
 * @returns 班级ID列表
 */
export async function getFeaturedClasses(): Promise<string[]> {
  try {
    const result = await dbService.where('page_configs', { section: PAGE_SECTIONS.ENROLLING_CLASSES })

    if (result && result.length > 0) {
      const config = result[0]
      return config.data?.items?.map((item: any) => item.classId || item.id).filter(Boolean) || []
    }
    return []
  } catch (error) {
    console.error('[featuredClassService] 获取招生班级配置失败:', error)
    return []
  }
}

/**
 * 获取首页学习路径配置
 * @returns 路径ID列表
 */
export async function getFeaturedPaths(): Promise<string[]> {
  try {
    const result = await dbService.where('page_configs', { section: PAGE_SECTIONS.FEATURED_PATHS })

    if (result && result.length > 0) {
      const config = result[0]
      return config.data?.items?.map((item: any) => item.pathId || item.id).filter(Boolean) || []
    }
    return []
  } catch (error) {
    console.error('[featuredPathService] 获取学习路径配置失败:', error)
    return []
  }
}

/**
 * 设置首页热门课程配置
 * @param courseIds 课程ID列表
 */
export async function setFeaturedCourses(courseIds: string[]): Promise<boolean> {
  try {
    const items = courseIds.map((id, index) => ({ courseId: id, order: index }))
    
    // 先查询是否存在
    const existing = await dbService.where('page_configs', { section: PAGE_SECTIONS.HOT_COURSES })
    
    if (existing && existing.length > 0) {
      // 更新
      return await dbService.update('page_configs', existing[0]._id, {
        data: { items },
      })
    } else {
      // 创建
      const result = await dbService.add('page_configs', {
        section: PAGE_SECTIONS.HOT_COURSES,
        data: { items },
      })
      return !!result
    }
  } catch (error) {
    console.error('[featuredCourseService] 设置热门课程配置失败:', error)
    return false
  }
}

/**
 * 设置首页招生班级配置
 * @param classIds 班级ID列表
 */
export async function setFeaturedClasses(classIds: string[]): Promise<boolean> {
  try {
    const items = classIds.map((id, index) => ({ classId: id, order: index }))
    
    const existing = await dbService.where('page_configs', { section: PAGE_SECTIONS.ENROLLING_CLASSES })
    
    if (existing && existing.length > 0) {
      return await dbService.update('page_configs', existing[0]._id, {
        data: { items },
      })
    } else {
      const result = await dbService.add('page_configs', {
        section: PAGE_SECTIONS.ENROLLING_CLASSES,
        data: { items },
      })
      return !!result
    }
  } catch (error) {
    console.error('[featuredClassService] 设置招生班级配置失败:', error)
    return false
  }
}

/**
 * 设置首页学习路径配置
 * @param pathIds 路径ID列表
 */
export async function setFeaturedPaths(pathIds: string[]): Promise<boolean> {
  try {
    const items = pathIds.map((id, index) => ({ pathId: id, order: index }))
    
    const existing = await dbService.where('page_configs', { section: PAGE_SECTIONS.FEATURED_PATHS })
    
    if (existing && existing.length > 0) {
      return await dbService.update('page_configs', existing[0]._id, {
        data: { items },
      })
    } else {
      const result = await dbService.add('page_configs', {
        section: PAGE_SECTIONS.FEATURED_PATHS,
        data: { items },
      })
      return !!result
    }
  } catch (error) {
    console.error('[featuredPathService] 设置学习路径配置失败:', error)
    return false
  }
}

// 导出服务
export const featuredCourseService = {
  getFeaturedCourses,
  setFeaturedCourses,
}

export const featuredClassService = {
  getFeaturedClasses,
  setFeaturedClasses,
}

export const featuredPathService = {
  getFeaturedPaths,
  setFeaturedPaths,
}
