/**
 * Course Types - 课程类型定义
 */

// ============================================================================
// 课程
// ============================================================================

export interface Course {
  /** 课程 ID */
  _id: string;
  /** 课程标题 */
  title: string;
  /** 课程描述 */
  description: string;
  /** 封面图片 */
  coverImage: string;
  /** 价格 */
  price: number;
  /** 原价 */
  originalPrice?: number;
  /** 课程分类 */
  category: string;
  /** 分类名称 */
  categoryName?: string;
  /** 体系 ID (RENSHE/CAAC) */
  sourceId: string;
  /** 体系名称 */
  sourceName?: string;
  /** 等级 */
  level: string;
  /** 总时长(分钟) */
  duration: number;
  /** 章节列表 */
  sections: CourseSection[];
  /** 已学习人数 */
  enrolledCount: number;
  /** 评分 */
  rating: number;
  /** 讲师信息 */
  teacher: Teacher;
  /** 课程状态 */
  status: CourseStatus;
  /** 是否推荐 */
  isFeatured?: boolean;
  /** 是否免费 */
  isFree?: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

export type CourseStatus = 'draft' | 'published' | 'archived';

export interface CourseSection {
  /** 章节 ID */
  _id: string;
  /** 章节标题 */
  title: string;
  /** 章节描述 */
  description?: string;
  /** 课时列表 */
  lessons: CourseLesson[];
  /** 章节顺序 */
  order: number;
}

export interface CourseLesson {
  /** 课时 ID */
  _id: string;
  /** 课时标题 */
  title: string;
  /** 课时描述 */
  description?: string;
  /** 视频 URL */
  videoUrl: string;
  /** 视频封面 */
  videoCover?: string;
  /** 时长(秒) */
  duration: number;
  /** 顺序 */
  order: number;
  /** 是否免费试看 */
  isFree: boolean;
  /** 是否已学习 */
  isCompleted?: boolean;
  /** 学习进度(百分比) */
  progress?: number;
}

// ============================================================================
// 讲师
// ============================================================================

export interface Teacher {
  /** 讲师 ID */
  _id: string;
  /** 讲师名称 */
  name: string;
  /** 讲师头像 */
  avatar: string;
  /** 讲师职称 */
  title?: string;
  /** 讲师简介 */
  bio?: string;
  /** 授课数量 */
  courseCount?: number;
  /** 学员数量 */
  studentCount?: number;
}

// ============================================================================
// 学习记录
// ============================================================================

export interface LearningProgress {
  /** 课程 ID */
  courseId: string;
  /** 用户 ID */
  userId: string;
  /** 课程进度(百分比) */
  progress: number;
  /** 已学习课时数 */
  completedLessons: number;
  /** 总课时数 */
  totalLessons: number;
  /** 最后学习时间 */
  lastStudyTime: string;
  /** 学习时长(分钟) */
  studyDuration: number;
  /** 是否完成 */
  isCompleted: boolean;
  /** 完成时间 */
  completedAt?: string;
}

export interface LessonProgress {
  /** 课时 ID */
  lessonId: string;
  /** 用户 ID */
  userId: string;
  /** 观看进度(秒) */
  watchProgress: number;
  /** 总时长(秒) */
  duration: number;
  /** 是否完成 */
  isCompleted: boolean;
  /** 最后观看时间 */
  lastWatchTime: string;
}

// ============================================================================
// 课程查询参数
// ============================================================================

export interface CourseListParams {
  /** 分类 ID */
  categoryId?: string;
  /** 体系 ID */
  sourceId?: string;
  /** 等级 */
  level?: string;
  /** 搜索关键词 */
  keyword?: string;
  /** 排序字段 */
  orderBy?: 'createdAt' | 'enrolledCount' | 'price' | 'rating';
  /** 排序方向 */
  orderDir?: 'asc' | 'desc';
  /** 页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 是否仅显示推荐 */
  featured?: boolean;
  /** 是否仅显示免费 */
  free?: boolean;
}

export interface CourseDetailParams {
  /** 课程 ID */
  courseId: string;
  /** 是否包含章节详情 */
  includeSections?: boolean;
}

// ============================================================================
// 课程操作
// ============================================================================

export interface EnrollCourseParams {
  /** 课程 ID */
  courseId: string;
  /** 支付方式 */
  paymentMethod?: 'wechat' | 'offline';
}

export interface UpdateProgressParams {
  /** 课程 ID */
  courseId: string;
  /** 课时 ID */
  lessonId: string;
  /** 观看进度(秒) */
  progress: number;
}

// ============================================================================
// 导出
// ============================================================================

export type {
  Course,
  CourseSection,
  CourseLesson,
  Teacher,
  LearningProgress,
  LessonProgress,
  CourseListParams,
  CourseDetailParams,
  EnrollCourseParams,
  UpdateProgressParams,
};
