// ============================================================================
// SourceService - 体系数据统一服务 (生产级优化版)
// 特性：缓存策略、错误处理、请求去重、类型安全
// ============================================================================
import { dbGetList, dbQuery, dbAdd, dbUpdate } from './http'
import logger from './logger'

// ============================================================================
// 类型定义
// ============================================================================

export interface Source {
  _id: string
  code: string
  name: string
  icon?: string
  coverImage?: string  // 新增：封面图
  description?: string
  status: 'active' | 'disabled'
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface Category {
  _id: string
  code: string
  name: string
  sourceId: string
  icon?: string
  coverImage?: string  // 新增：封面图
  status: string
  sortOrder: number
  level?: string  // 关联等级
  description?: string
}

export interface Course {
  _id: string
  title: string
  category: string
  categoryId: string
  sourceId: string
  status: string
  price: number
  coverImage?: string
  level?: string
  levelText?: string
  salesCount?: number
  lessonCount?: number
}

export interface ClassItem {
  _id: string
  name: string
  category: string
  categoryId: string
  sourceId: string
  status: string
  level?: string
  levelText?: string
  startDate?: string
  endDate?: string
  price?: number
}

export interface PageConfig {
  _id: string
  section: string
  order: number
  enabled: boolean
  data: {
    sourceId: string
    items?: ConfigItem[]
    [key: string]: any
  }
  createdAt?: string
  updatedAt?: string
}

export interface ConfigItem {
  id: string
  name: string
  order: number
  visible: boolean
  type?: 'course' | 'class' | 'category'
  [key: string]: any
}

// ============================================================================
// 缓存管理
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SourceCache {
  private cache = new Map<string, CacheEntry<any>>()
  private pending = new Map<string, Promise<any>>()  // 请求去重

  // 默认缓存时间（毫秒）
  private readonly DEFAULT_TTL = 5 * 60 * 1000  // 5分钟

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // 请求去重 - 防止同一请求并发发送
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    // 如果已有缓存，直接返回
    const cached = this.get<T>(key)
    if (cached !== null) {
      logger.info('[SourceCache] 命中缓存', { key })
      return cached
    }

    // 如果有 pending 的请求，等待它完成
    const pending = this.pending.get(key)
    if (pending) {
      logger.info('[SourceCache] 等待进行中的请求', { key })
      return pending as Promise<T>
    }

    // 创建新请求
    const promise = factory().then(data => {
      this.set(key, data, ttl)
      this.pending.delete(key)
      return data
    }).catch(error => {
      this.pending.delete(key)
      throw error
    })

    this.pending.set(key, promise)
    logger.info('[SourceCache] 新建请求', { key })
    
    return promise
  }
}

// 全局缓存实例
const sourceCache = new SourceCache()

// 分类代码到中文名称的映射
const CATEGORY_CODE_MAP: Record<string, string> = {
  'PLANT_PROTECTION': '植保无人机',
  'AERIAL_PHOTOGRAPHY': '航拍',
  'INSPECTION': '巡检',
  'MULTI_ROTOR': '多旋翼',
  'FIXED_WING': '固定翼',
  'HELICOPTER': '直升机',
  'DRONE_RACING': '竞速无人机',
  'OTHER': '其他'
}

// 分类代码转换为中文名称
function codeToName(code: string): string {
  if (!code) return ''
  const upperCode = code.toUpperCase()
  return CATEGORY_CODE_MAP[upperCode] || code
}

// 缓存 Key 生成
const cacheKeys = {
  sources: () => 'sources:all',
  source: (id: string) => `source:${id}`,
  categories: (sourceId: string) => `categories:${sourceId}`,
  courses: (sourceId: string, categoryId?: string) => 
    categoryId ? `courses:${sourceId}:${categoryId}` : `courses:${sourceId}:all`,
  classes: (sourceId: string, categoryId?: string) => 
    categoryId ? `classes:${sourceId}:${categoryId}` : `classes:${sourceId}:all`,
  pageConfig: (sourceId: string, section: string) => `config:${sourceId}:${section}`,
}

// ============================================================================
// 错误类型定义
// ============================================================================

export class SourceServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any
  ) {
    super(message)
    this.name = 'SourceServiceError'
  }
}

const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  INVALID_PARAMS: 'INVALID_PARAMS',
  CACHE_ERROR: 'CACHE_ERROR',
} as const

// ============================================================================
// 体系服务
// ============================================================================

export const SourceService = {
  /**
   * 获取所有启用的体系列表（带缓存）
   */
  async getSources(options?: { 
    forceRefresh?: boolean 
    limit?: number 
  }): Promise<Source[]> {
    const cacheKey = cacheKeys.sources()
    
    // 检查缓存（除非强制刷新）
    if (!options?.forceRefresh) {
      const cached = sourceCache.get<Source[]>(cacheKey)
      if (cached) return cached
    }

    try {
      const result = await dbGetList('sources', {
        where: { status: 'active' },
        orderBy: 'sortOrder asc',
        limit: options?.limit || 50
      })
      
      const sources = (result.data || []) as Source[]
      
      // 存入缓存
      sourceCache.set(cacheKey, sources)
      
      logger.info('[SourceService] getSources', { 
        count: sources.length,
        fromCache: false 
      })
      
      return sources
    } catch (error) {
      logger.error('[SourceService] getSources failed', error)
      // 缓存失败时返回空数组而不是抛出异常
      return []
    }
  },

  /**
   * 根据 sourceId 获取体系信息
   */
  async getSourceById(sourceId: string): Promise<Source | null> {
    if (!sourceId) {
      throw new SourceServiceError('sourceId 不能为空', ErrorCodes.INVALID_PARAMS)
    }

    const cacheKey = cacheKeys.source(sourceId)
    const cached = sourceCache.get<Source>(cacheKey)
    if (cached) return cached

    try {
      const result = await dbQuery('sources', { _id: sourceId })
      const source = (result.data?.[0] || null) as Source | null
      
      if (source) {
        sourceCache.set(cacheKey, source)
      }
      
      return source
    } catch (error) {
      logger.error('[SourceService] getSourceById failed', error)
      return null
    }
  },

  /**
   * 获取指定体系的分类列表
   */
  async getCategories(sourceId: string, options?: {
    forceRefresh?: boolean
    includeDisabled?: boolean
  }): Promise<Category[]> {
    if (!sourceId) {
      throw new SourceServiceError('sourceId 不能为空', ErrorCodes.INVALID_PARAMS)
    }

    const cacheKey = cacheKeys.categories(sourceId)
    
    if (!options?.forceRefresh) {
      const cached = sourceCache.get<Category[]>(cacheKey)
      if (cached) return cached
    }

    try {
      const where: any = {}
      if (!options?.includeDisabled) {
        where.status = 'active'
      }
      
      const result = await dbGetList('categories', {
        where: { ...where, sourceId },
        orderBy: 'sortOrder asc'
      })
      
      const categories = (result.data || []) as Category[]
      sourceCache.set(cacheKey, categories)
      
      logger.info('[SourceService] getCategories', { 
        sourceId, 
        count: categories.length 
      })
      
      return categories
    } catch (error) {
      logger.error('[SourceService] getCategories failed', error)
      return []
    }
  },

  /**
   * 获取指定体系的课程列表
   * @param sourceId - 体系ID（可选，如果传入则作为过滤条件）
   * @param options - 查询选项
   * @param options.categoryId - 分类ID（格式：{SOURCE}:{CATEGORY}，如 "CAAC:MULTI_ROTOR"）
   */
  async getCourses(sourceId: string, options?: { 
    categoryId?: string
    category?: string
    status?: string
    limit?: number
    forceRefresh?: boolean
  }): Promise<Course[]> {
    // 优先使用 categoryId 作为缓存 key
    const cacheKey = cacheKeys.courses(sourceId || 'auto', options?.categoryId)
    
    if (!options?.forceRefresh) {
      const cached = sourceCache.get<Course[]>(cacheKey)
      if (cached) return cached
    }

    try {
      let courses: Course[] = []
      
      // 构建查询条件 - 优先使用 categoryId
      const where: any = {}
      if (sourceId) where.sourceId = sourceId
      if (options?.categoryId) {
        where.categoryId = options.categoryId  // 直接使用 categoryId 过滤
      } else if (options?.category) {
        where.category = options.category  // 回退使用 category 名称
      }
      if (options?.status) where.status = options.status
      
      const result = await dbGetList('courses', {
        where,
        orderBy: 'createdAt desc',
        limit: options?.limit || 100
      })
      courses = (result.data || []) as Course[]
      
      sourceCache.set(cacheKey, courses)
      
      logger.info('[SourceService] getCourses', { 
        sourceId, 
        categoryId: options?.categoryId,
        count: courses.length 
      })
      
      return courses
    } catch (error) {
      logger.error('[SourceService] getCourses failed', error)
      return []
    }
  },

  /**
   * 获取指定体系的培训班列表
   * @param sourceId - 体系ID（可选，如果传入则作为过滤条件）
   * @param options - 查询选项
   * @param options.categoryId - 分类ID（格式：{SOURCE}:{CATEGORY}，如 "CAAC:MULTI_ROTOR"）
   * @param options.category - 分类名称（如 "植保无人机"）
   */
  async getClasses(sourceId: string, options?: {
    categoryId?: string
    category?: string
    status?: string
    limit?: number
    forceRefresh?: boolean
  }): Promise<ClassItem[]> {
    // 优先使用 categoryId 作为缓存 key
    const cacheKey = cacheKeys.classes(sourceId || 'auto', options?.categoryId)
    
    if (!options?.forceRefresh) {
      const cached = sourceCache.get<ClassItem[]>(cacheKey)
      if (cached) return cached
    }

    try {
      let classes: ClassItem[] = []
      
      // 构建查询条件 - 优先使用 categoryId
      const where: any = {}
      if (sourceId) where.sourceId = sourceId
      if (options?.categoryId) {
        where.categoryId = options.categoryId  // 直接使用 categoryId 过滤
      } else if (options?.category) {
        where.category = options.category  // 回退使用 category 名称
      }
      if (options?.status) where.status = options.status
      
      const result = await dbGetList('classes', {
        where,
        orderBy: 'startDate asc',
        limit: options?.limit || 100
      })
      classes = (result.data || []) as ClassItem[]
      
      sourceCache.set(cacheKey, classes)
      
      logger.info('[SourceService] getClasses', { 
        sourceId, 
        categoryId: options?.categoryId,
        count: classes.length 
      })
      
      return classes
    } catch (error) {
      logger.error('[SourceService] getClasses failed', error)
      return []
    }
  },

  /**
   * 获取热门课程（按销量排序）
   */
  async getHotCourses(sourceId: string, limit: number = 6): Promise<Course[]> {
    if (!sourceId) {
      throw new SourceServiceError('sourceId 不能为空', ErrorCodes.INVALID_PARAMS)
    }

    try {
      // 尝试多种状态查询策略
      const statusOptions = ['published', 'active', '']
      
      for (const status of statusOptions) {
        const where: any = { sourceId }
        if (status) where.status = status
        
        const result = await dbGetList('courses', {
          where,
          orderBy: 'salesCount desc',
          limit
        })
        
        if (result.data && result.data.length > 0) {
          logger.info('[SourceService] getHotCourses', { 
            sourceId, 
            status,
            count: result.data.length 
          })
          return result.data as Course[]
        }
      }
      
      // 完全回退：查询所有
      const fallbackResult = await dbGetList('courses', {
        where: { sourceId },
        orderBy: 'createdAt desc',
        limit
      })
      
      return (fallbackResult.data || []) as Course[]
    } catch (error) {
      logger.error('[SourceService] getHotCourses failed', error)
      return []
    }
  },

  /**
   * 获取正在招生的培训班
   */
  async getEnrollingClasses(sourceId: string, limit: number = 6): Promise<ClassItem[]> {
    if (!sourceId) {
      throw new SourceServiceError('sourceId 不能为空', ErrorCodes.INVALID_PARAMS)
    }

    try {
      const statusOptions = ['enrolling', 'published', 'active', '']
      
      for (const status of statusOptions) {
        const where: any = { sourceId }
        if (status) where.status = status
        
        const result = await dbGetList('classes', {
          where,
          orderBy: 'startDate asc',
          limit
        })
        
        if (result.data && result.data.length > 0) {
          return result.data as ClassItem[]
        }
      }
      
      return []
    } catch (error) {
      logger.error('[SourceService] getEnrollingClasses failed', error)
      return []
    }
  },

  /**
   * 获取体系页面配置
   */
  async getPageConfig(sourceId: string, section: string): Promise<PageConfig | null> {
    if (!sourceId || !section) {
      throw new SourceServiceError('sourceId 和 section 不能为空', ErrorCodes.INVALID_PARAMS)
    }

    const cacheKey = cacheKeys.pageConfig(sourceId, section)
    const cached = sourceCache.get<PageConfig>(cacheKey)
    if (cached) return cached

    try {
      // 先查询该 section 的所有配置
      const result = await dbGetList('page_configs', {
        where: { section },
        limit: 100
      })
      
      if (!result.data || result.data.length === 0) {
        return null
      }
      
      // 在代码层面过滤 sourceId
      const matchedConfig = (result.data as PageConfig[]).find((config: any) => {
        return config.data && config.data.sourceId === sourceId
      })
      
      if (matchedConfig) {
        sourceCache.set(cacheKey, matchedConfig)
        return matchedConfig
      }
      
      // 没有找到匹配的配置，返回 null，让调用方使用回退逻辑
      logger.warn('[SourceService] getPageConfig 未找到匹配配置', { sourceId, section })
      return null
    } catch (error) {
      logger.error('[SourceService] getPageConfig failed', error)
      return null
    }
  },

  /**
   * 获取首页学习路径配置
   * 逻辑：
   * 1. 有 page_config 配置时：按配置的 order 排序，过滤 visible: false，返回配置项
   * 2. 无配置时：直接查询 categories 表，按 sortOrder 排序
   */
  async getLearningPathConfig(sourceId: string): Promise<Category[]> {
    if (!sourceId) {
      throw new SourceServiceError('sourceId 不能为空', ErrorCodes.INVALID_PARAMS)
    }

    try {
      // 1. 尝试从 page_configs 读取配置
      const pageConfig = await this.getPageConfig(sourceId, 'learningPaths')
      
      if (pageConfig && pageConfig.data?.items && pageConfig.data.items.length > 0) {
        // 按配置的 order 排序，并过滤掉 visible: false 的项
        const items = pageConfig.data.items
          .filter((item: ConfigItem) => item.visible !== false)
          .sort((a: ConfigItem, b: ConfigItem) => (a.order || 0) - (b.order || 0))
        
        // 获取 categories 表数据，用于匹配正确的 categoryId
        const categories = await this.getCategories(sourceId, { includeDisabled: false })
        const categoryMap = new Map(categories.map(c => [c.name, c]))
        
        // 为每个 item 补充正确的 _id
        // 直接使用 categories 表的实际 _id，用于过滤课程和培训班
        const enrichedItems = items.map((item: any) => {
          const matchedCategory = categoryMap.get(item.name)
          // 使用 categories 表的实际 _id（可能是 hash 或新格式）
          const categoryId = matchedCategory?._id || matchedCategory?.id || item.name
          
          return {
            ...item,
            _id: categoryId,  // categories 表的实际 _id，用于跳转和过滤
            categoryId: categoryId,  // 明确标注
            sourceId: sourceId
          } as Category
        })
        
        logger.info('[SourceService] getLearningPathConfig from page_config', { 
          sourceId, 
          count: enrichedItems.length,
          items: enrichedItems.map(i => ({ _id: i._id, name: i.name }))
        })
        return enrichedItems
      }
      
      // 2. 配置不存在，回退到直接查询 categories 集合（按 sortOrder 排序）
      const categories = await this.getCategories(sourceId, { includeDisabled: false })
      
      logger.info('[SourceService] getLearningPathConfig fallback to categories', { 
        sourceId, 
        count: categories.length 
      })
      
      return categories
    } catch (error) {
      logger.error('[SourceService] getLearningPathConfig failed', error)
      return []
    }
  },

  /**
   * 获取热门课程配置
   */
  async getHotCoursesConfig(sourceId: string, limit: number = 6): Promise<Course[]> {
    if (!sourceId) {
      throw new SourceServiceError('sourceId 不能为空', ErrorCodes.INVALID_PARAMS)
    }

    try {
      // 1. 尝试从 page_configs 读取配置
      const pageConfig = await this.getPageConfig(sourceId, 'hotCourses')
      
      if (pageConfig && pageConfig.data?.items && pageConfig.data.items.length > 0) {
        const items = pageConfig.data.items
          .filter((item: ConfigItem) => item.visible !== false)
          .sort((a: ConfigItem, b: ConfigItem) => (a.order || 0) - (b.order || 0))
          .slice(0, limit)
        logger.info('[SourceService] getHotCoursesConfig from page_config', { 
          sourceId, 
          count: items.length 
        })
        return items as unknown as Course[]
      }
      
      // 2. 配置不存在，回退到直接查询 courses 集合
      const courses = await this.getHotCourses(sourceId, limit)
      logger.info('[SourceService] getHotCoursesConfig fallback to getHotCourses', { 
        sourceId, 
        count: courses.length 
      })
      return courses
    } catch (error) {
      logger.error('[SourceService] getHotCoursesConfig failed', error)
      return []
    }
  },

  /**
   * 获取培训班配置
   */
  async getClassesConfig(sourceId: string, limit: number = 6): Promise<ClassItem[]> {
    if (!sourceId) {
      throw new SourceServiceError('sourceId 不能为空', ErrorCodes.INVALID_PARAMS)
    }

    try {
      // 1. 尝试从 page_configs 读取配置
      const pageConfig = await this.getPageConfig(sourceId, 'classes')
      
      if (pageConfig && pageConfig.data?.items && pageConfig.data.items.length > 0) {
        const items = pageConfig.data.items
          .filter((item: ConfigItem) => item.visible !== false)
          .sort((a: ConfigItem, b: ConfigItem) => (a.order || 0) - (b.order || 0))
          .slice(0, limit)
        logger.info('[SourceService] getClassesConfig from page_config', { 
          sourceId, 
          count: items.length 
        })
        return items as unknown as ClassItem[]
      }
      
      // 2. 配置不存在，回退到直接查询 classes 集合
      const classes = await this.getEnrollingClasses(sourceId, limit)
      logger.info('[SourceService] getClassesConfig fallback to getEnrollingClasses', { 
        sourceId, 
        count: classes.length 
      })
      return classes
    } catch (error) {
      logger.error('[SourceService] getClassesConfig failed', error)
      return []
    }
  },

  /**
   * 保存体系页面配置
   */
  async savePageConfig(
    sourceId: string,
    section: string,
    configData: any
  ): Promise<{ success: boolean; id?: string; message?: string }> {
    if (!sourceId || !section) {
      throw new SourceServiceError('sourceId 和 section 不能为空', ErrorCodes.INVALID_PARAMS)
    }

    try {
      // 1. 查询该 section 的所有配置
      const allConfigs = await dbGetList('page_configs', {
        where: { section },
        limit: 100
      })
      
      // 2. 在代码层面过滤 sourceId
      const existing = allConfigs.data?.find((config: any) => {
        return config.data && config.data.sourceId === sourceId
      })
      
      const now = new Date().toISOString()
      
      if (existing) {
        // 3. 已存在 → 更新
        const configId = existing._id
        
        await dbUpdate('page_configs', configId, {
          'data': { sourceId, ...configData },
          updatedAt: now
        })
        
        // 清除缓存
        sourceCache.delete(cacheKeys.pageConfig(sourceId, section))
        
        return { success: true, id: configId, message: '配置已更新' }
      } else {
        // 4. 不存在 → 创建
        const result = await dbAdd('page_configs', {
          section,
          order: this.getSectionOrder(section),
          enabled: true,
          data: { sourceId, ...configData },
          createdAt: now,
          updatedAt: now
        })
        
        return { success: true, id: result.id, message: '配置已创建' }
      }
    } catch (error) {
      logger.error('[SourceService] savePageConfig failed', error)
      return { success: false, message: '保存配置失败' }
    }
  },

  /**
   * 批量保存配置项（支持排序和显示/隐藏）
   */
  async saveConfigItems(
    sourceId: string,
    section: string,
    items: ConfigItem[]
  ): Promise<{ success: boolean; message?: string }> {
    if (!sourceId || !section) {
      throw new SourceServiceError('sourceId 和 section 不能为空', ErrorCodes.INVALID_PARAMS)
    }

    try {
      // 处理每个配置项：更新排序和可见性
      const processedItems = items.map((item, index) => ({
        ...item,
        order: item.order || index + 1,
        visible: item.visible !== false
      }))

      return await this.savePageConfig(sourceId, section, {
        items: processedItems
      })
    } catch (error) {
      logger.error('[SourceService] saveConfigItems failed', error)
      return { success: false, message: '保存配置失败' }
    }
  },

  /**
   * 获取 section 排序号
   */
  getSectionOrder(section: string): number {
    const orders: Record<string, number> = {
      hero: 1,
      stats: 2,
      features: 3,
      learningPaths: 4,
      hotCourses: 5,
      classes: 6,
      contact: 7,
      footer: 8
    }
    return orders[section] || 99
  },

  /**
   * 清除指定体系的缓存
   */
  clearCache(sourceId?: string): void {
    if (sourceId) {
      // 清除该体系相关的所有缓存
      sourceCache.delete(cacheKeys.categories(sourceId))
      sourceCache.delete(cacheKeys.courses(sourceId))
      sourceCache.delete(cacheKeys.classes(sourceId))
      logger.info('[SourceService] 清除体系缓存', { sourceId })
    } else {
      // 清除所有缓存
      sourceCache.clear()
      logger.info('[SourceService] 清除所有缓存')
    }
  },

  /**
   * 刷新指定体系的数据
   */
  async refreshSourceData(sourceId: string): Promise<void> {
    // 清除缓存
    this.clearCache(sourceId)
    
    // 重新获取数据（强制刷新）
    await Promise.all([
      this.getCategories(sourceId, { forceRefresh: true }),
      this.getCourses(sourceId, { forceRefresh: true }),
      this.getClasses(sourceId, { forceRefresh: true }),
    ])
    
    logger.info('[SourceService] 刷新体系数据完成', { sourceId })
  },

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const sources = await this.getSources({ forceRefresh: true })
      
      return {
        healthy: true,
        details: {
          sourcesCount: sources.length,
          cacheSize: 'N/A' // 内部实现
        }
      }
    } catch (error) {
      return {
        healthy: false,
        details: { error: String(error) }
      }
    }
  }
}

// 导出类型
export type { SourceServiceError }

// 导出默认对象
export default SourceService
