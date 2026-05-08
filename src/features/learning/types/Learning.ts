/**
 * Learning Types - 学习类型定义
 */

// ============================================================================
// 学习进度
// ============================================================================

export interface LearningProgress {
  /** 课程 ID */
  courseId: string;
  /** 课程名称 */
  courseName: string;
  /** 课程封面 */
  courseCover?: string;
  /** 学习进度(百分比) */
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
  /** 当前学习的课时 ID */
  currentLessonId?: string;
  /** 当前学习的课时名称 */
  currentLessonName?: string;
}

export interface LessonProgress {
  /** 课时 ID */
  lessonId: string;
  /** 课程 ID */
  courseId: string;
  /** 观看进度(秒) */
  watchProgress: number;
  /** 总时长(秒) */
  duration: number;
  /** 进度(百分比) */
  progress: number;
  /** 是否完成 */
  isCompleted: boolean;
  /** 最后观看时间 */
  lastWatchTime: string;
}

// ============================================================================
// 学习路径
// ============================================================================

export interface LearningPath {
  /** 路径 ID */
  _id: string;
  /** 路径名称 */
  name: string;
  /** 路径描述 */
  description?: string;
  /** 路径封面 */
  coverImage?: string;
  /** 体系 ID */
  sourceId: string;
  /** 体系名称 */
  sourceName?: string;
  /** 等级列表 */
  levels: LearningLevel[];
  /** 总课程数 */
  totalCourses: number;
  /** 总课时数 */
  totalLessons: number;
  /** 预计学习时长(小时) */
  estimatedHours: number;
}

export interface LearningLevel {
  /** 等级名称 */
  name: string;
  /** 等级描述 */
  description?: string;
  /** 课程列表 */
  courses: LearningPathCourse[];
  /** 是否可选修 */
  required: boolean;
}

export interface LearningPathCourse {
  /** 课程 ID */
  courseId: string;
  /** 课程名称 */
  courseName: string;
  /** 课程封面 */
  coverImage?: string;
  /** 课时数 */
  lessonCount: number;
  /** 预计时长(小时) */
  estimatedHours: number;
  /** 是否必修 */
  required: boolean;
  /** 是否已完成 */
  isCompleted: boolean;
  /** 学习进度 */
  progress?: number;
}

// ============================================================================
// 证书
// ============================================================================

export interface Certificate {
  /** 证书 ID */
  _id: string;
  /** 证书名称 */
  name: string;
  /** 证书描述 */
  description?: string;
  /** 证书图片 */
  imageUrl: string;
  /** 关联课程/班级名称 */
  sourceName?: string;
  /** 颁发日期 */
  issuedAt: string;
  /** 证书编号 */
  certificateNo?: string;
  /** 证书状态 */
  status: 'valid' | 'revoked';
  /** 下载链接 */
  downloadUrl?: string;
}

// ============================================================================
// 导出
// ============================================================================

export type {
  LearningProgress,
  LessonProgress,
  LearningPath,
  LearningLevel,
  LearningPathCourse,
  Certificate,
};
