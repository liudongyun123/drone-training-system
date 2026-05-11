// ============================================================================
// 体系相关类型定义 - 统一管理
// ============================================================================

// ============================================================================
// 基础类型
// ============================================================================

/** 状态类型 */
export type StatusType = 'active' | 'disabled' | 'draft' | 'published';

/** 排序接口 */
export interface Sortable {
  sortOrder: number;
  order?: number;
}

/** 可视接口 */
export interface Visible {
  visible?: boolean;
  status?: StatusType;
}

/** 时间戳接口 */
export interface Timestamped {
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// 体系 (Source)
// ============================================================================

/**
 * 体系 - 顶层培训认证体系
 * 例如：人社培训、CAAC培训、国防教育等
 */
export interface Source extends Sortable, Visible, Timestamped {
  _id?: string;
  /** 体系代码 - 全局唯一，如 RENSHE, CAAC */
  code: string;
  /** 体系名称 */
  name: string;
  /** 图标 emoji */
  icon?: string;
  /** 封面图 */
  coverImage?: string;
  /** 描述 */
  description?: string;
  /** 扩展字段 */
  extend?: Record<string, any>;
}

/** 体系创建参数 */
export interface CreateSourceParams {
  code: string;
  name: string;
  icon?: string;
  coverImage?: string;
  description?: string;
  sortOrder?: number;
  status?: StatusType;
}

/** 体系更新参数 */
export interface UpdateSourceParams extends Partial<CreateSourceParams> {
  _id: string;
}

// ============================================================================
// 分类 (Category)
// ============================================================================

/**
 * 分类 - 无人机类型分类
 * 例如：多旋翼、固定翼、垂直起降等
 * 属于某个体系下的子分类
 */
export interface Category extends Sortable, Visible, Timestamped {
  _id?: string;
  /** 分类代码 */
  code: string;
  /** 分类名称 */
  name: string;
  /** 所属体系ID */
  sourceId: string;
  /** 所属体系代码 */
  sourceCode?: string;
  /** 所属体系名称 */
  sourceName?: string;
  /** 图标 */
  icon?: string;
  /** 封面图 */
  coverImage?: string;
  /** 描述 */
  description?: string;
  /** 关联等级代码 */
  level?: string;
}

/** 分类创建参数 */
export interface CreateCategoryParams {
  code: string;
  name: string;
  sourceId: string;
  sourceCode?: string;
  icon?: string;
  coverImage?: string;
  description?: string;
  sortOrder?: number;
  status?: StatusType;
  level?: string;
}

// ============================================================================
// 等级 (Level)
// ============================================================================

/**
 * 等级 - 认证级别
 * 例如：初级工/中级工/高级工 或 视距内驾驶员/超视距驾驶员
 */
export interface Level extends Sortable, Visible, Timestamped {
  _id?: string;
  /** 等级代码 - 全局唯一 */
  code: string;
  /** 等级名称 */
  name: string;
  /** 所属体系ID */
  sourceId?: string;
  /** 所属体系代码 */
  sourceCode: string;
  /** 描述 */
  description?: string;
  /** 类型：技能等级 / 证书等级 */
  type?: 'skill' | 'certificate';
}

/** 等级创建参数 */
export interface CreateLevelParams {
  code: string;
  name: string;
  sourceCode: string;
  sourceId?: string;
  description?: string;
  sortOrder?: number;
  status?: StatusType;
  type?: 'skill' | 'certificate';
}

// ============================================================================
// 页面配置 (PageConfig)
// ============================================================================

/**
 * 页面配置项
 * 用于管理首页各模块的显示内容
 */
export interface PageConfigItem extends Sortable, Visible {
  _id?: string;
  /** 关联ID（课程ID/班级ID/分类ID） */
  id: string;
  /** 名称 */
  name: string;
  /** 类型 */
  type?: 'course' | 'class' | 'category' | 'banner';
  /** 封面图 */
  coverImage?: string;
  /** 扩展数据 */
  data?: Record<string, any>;
}

/**
 * 页面配置
 */
export interface PageConfig extends Timestamped {
  _id?: string;
  /** 配置区块 */
  section: ConfigSection;
  /** 排序号 */
  order?: number;
  /** 是否启用 */
  enabled?: boolean;
  /** 配置数据 */
  data: {
    /** 关联体系ID */
    sourceId: string;
    /** 配置项列表 */
    items?: PageConfigItem[];
    /** 其他配置数据 */
    [key: string]: any;
  };
}

/** 配置区块类型 */
export type ConfigSection = 
  | 'hero'           // 首屏hero
  | 'stats'          // 统计数字
  | 'features'       // 特色介绍
  | 'learningPaths'  // 学习路径
  | 'hotCourses'     // 热门课程
  | 'classes'        // 培训班
  | 'contact'        // 联系方式
  | 'footer';        // 页脚

/** 保存配置参数 */
export interface SaveConfigParams {
  section: ConfigSection;
  sourceId: string;
  items: PageConfigItem[];
  enabled?: boolean;
}

// ============================================================================
// 课程 (Course)
// ============================================================================

/**
 * 课程
 */
export interface Course extends Timestamped {
  _id?: string;
  /** 课程标题 */
  title: string;
  /** 课程描述 */
  description?: string;
  /** 所属分类 */
  category: string;
  /** 所属分类ID */
  categoryId: string;
  /** 所属体系ID */
  sourceId: string;
  /** 所属体系代码 */
  sourceCode?: string;
  /** 所属体系名称 */
  sourceName?: string;
  /** 关联等级代码 */
  level?: string;
  /** 等级名称（显示用） */
  levelText?: string;
  /** 封面图 */
  coverImage?: string;
  /** 价格 */
  price?: number;
  /** 原价 */
  originalPrice?: number;
  /** 状态 */
  status?: 'draft' | 'published' | 'offline';
  /** 销量 */
  salesCount?: number;
  /** 课时数 */
  lessonCount?: number;
  /** 学习人数 */
  studentCount?: number;
  /** 评分 */
  rating?: number;
  /** 时长（分钟） */
  duration?: number;
  /** 是否推荐 */
  isFeatured?: boolean;
}

/** 课程创建参数 */
export interface CreateCourseParams extends Partial<Course> {
  title: string;
  sourceId: string;
  categoryId: string;
}

// ============================================================================
// 培训班 (Class)
// ============================================================================

/**
 * 培训班
 */
export interface TrainingClass extends Timestamped {
  _id?: string;
  /** 班级名称 */
  name: string;
  /** 班级描述 */
  description?: string;
  /** 所属分类 */
  category: string;
  /** 所属分类ID */
  categoryId: string;
  /** 所属体系ID */
  sourceId: string;
  /** 所属体系代码 */
  sourceCode?: string;
  /** 所属体系名称 */
  sourceName?: string;
  /** 关联等级代码 */
  level?: string;
  /** 等级名称（显示用） */
  levelText?: string;
  /** 封面图 */
  coverImage?: string;
  /** 价格 */
  price?: number;
  /** 原价 */
  originalPrice?: number;
  /** 状态 */
  status?: ClassStatus;
  /** 开班日期 */
  startDate?: string;
  /** 结束日期 */
  endDate?: string;
  /** 招生人数 */
  maxStudents?: number;
  /** 报名人数 */
  enrolledCount?: number;
  /** 上课地点 */
  location?: string;
  /** 上课时间 */
  schedule?: string;
  /** 是否推荐 */
  isFeatured?: boolean;
}

/** 班级状态 */
export type ClassStatus = 'draft' | 'enrolling' | 'in_progress' | 'completed' | 'cancelled';

/** 培训班创建参数 */
export interface CreateClassParams extends Partial<TrainingClass> {
  name: string;
  sourceId: string;
  categoryId: string;
}

// ============================================================================
// 学习路径 (LearningPath)
// ============================================================================

/**
 * 学习路径 - 按无人机类型组织的学习阶段
 */
export interface LearningPath extends Sortable, Visible, Timestamped {
  _id?: string;
  /** 路径名称 */
  name: string;
  /** 路径描述 */
  description?: string;
  /** 关联分类ID */
  categoryId?: string;
  /** 所属体系ID */
  sourceId?: string;
  /** 封面图 */
  coverImage?: string;
  /** 学习阶段列表 */
  stages?: LearningStage[];
}

/**
 * 学习阶段
 */
export interface LearningStage extends Sortable {
  /** 阶段名称 */
  level: string;
  /** 关联课程ID */
  courseId?: string;
  /** 关联课程名称 */
  courseTitle?: string;
  /** 关联班级ID */
  classId?: string;
  /** 关联班级名称 */
  className?: string;
}

/**
 * 学习路径进度
 */
export interface PathProgress extends Timestamped {
  _id?: string;
  /** 路径ID */
  pathId: string;
  /** 用户ID */
  userId: string;
  /** 已完成课程列表 */
  completedCourses: string[];
  /** 当前课程 */
  currentCourse?: string;
  /** 进度百分比 */
  progress: number;
  /** 开始时间 */
  startedAt: string;
  /** 完成时间 */
  completedAt?: string;
}

// ============================================================================
// 辅助类型
// ============================================================================

/**
 * API 响应格式
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T = any> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}

/**
 * 查询参数
 */
export interface QueryParams extends PaginationParams {
  [key: string]: any;
}

/**
 * 列表查询选项
 */
export interface ListOptions<T = any> extends PaginationParams {
  where?: T;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  includeDisabled?: boolean;
}

// ============================================================================
// 工具类型
// ============================================================================

/** 可选 ID */
export type WithOptionalId<T> = Omit<T, '_id'> & { _id?: string };

/** 必需 Id */
export type WithRequiredId<T> = T & { _id: string };

/** 创建时类型（无 Id） */
export type CreateInput<T> = Omit<T, '_id' | 'createdAt' | 'updatedAt'>;

/** 更新时类型 */
export type UpdateInput<T> = Partial<Omit<T, 'createdAt'>>;

// ============================================================================
// 常量定义
// ============================================================================

/** 体系代码 */
export const SOURCE_CODES = {
  RENSHE: 'RENSHE',           // 人社培训
  CAAC: 'CAAC',               // 民航局
  NATIONAL_DEFENSE: 'NATIONAL_DEFENSE', // 国防教育
} as const;

/** 体系名称映射 */
export const SOURCE_NAMES: Record<string, string> = {
  [SOURCE_CODES.RENSHE]: '人社培训',
  [SOURCE_CODES.CAAC]: 'CAAC培训',
  [SOURCE_CODES.NATIONAL_DEFENSE]: '国防教育',
};

/** 默认图标映射 */
export const SOURCE_ICONS: Record<string, string> = {
  [SOURCE_CODES.RENSHE]: '🏛️',
  [SOURCE_CODES.CAAC]: '✈️',
  [SOURCE_CODES.NATIONAL_DEFENSE]: '🎖️',
};

/** 班级等级（通用） */
export const CLASS_LEVELS = [
  '入门班',
  '基础班', 
  '进阶班',
  '高级班',
  '考证班',
] as const;

/** 等级映射表 */
export const LEVEL_DISPLAY_NAMES: Record<string, Record<string, string>> = {
  [SOURCE_CODES.RENSHE]: {
    beginner: '初级工',
    intermediate: '中级工',
    advanced: '高级工',
    technician: '技师',
    senior_technician: '高级技师',
  },
  [SOURCE_CODES.CAAC]: {
    vlos: '视距内驾驶员',
    bvlos: '超视距驾驶员',
    instructor: '教员',
  },
  [SOURCE_CODES.NATIONAL_DEFENSE]: {
    level1: '一级',
    level2: '二级',
    level3: '三级',
  },
};
