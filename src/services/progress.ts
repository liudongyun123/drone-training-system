// @ts-nocheck
// ============================================================================
// 学习进度服务
// ============================================================================
import { adminService } from '@/services/adminService';

// 统一使用 user_progress 集合（与 CloudProgressService 一致）
const PROGRESS_COLLECTION = 'user_progress';

/** 辅助：将 adminService.list 的结果转为数组 */
function extractList(result: any): any[] {
  return result?.data?.list || result?.data || [];
}

export interface StudyProgress {
  _id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  watchedDuration: number; // 已观看时长（秒）
  totalDuration: number; // 总时长（秒）
  watchProgress: number; // 观看进度（0-100）
  completed: boolean;
  lastWatchTime: string; // 最后观看时间
  createdAt: string;
  updatedAt: string;
}

export const progressService = {
  /**
   * 获取用户的学习进度
   */
  async getUserProgress(userId: string): Promise<StudyProgress[]> {
    const result = await adminService.list(PROGRESS_COLLECTION, { userId }, { limit: 999 });
    return extractList(result) as StudyProgress[];
  },

  /**
   * 获取特定课程的学习进度
   */
  async getCourseProgress(userId: string, courseId: string): Promise<StudyProgress[]> {
    const result = await adminService.list(PROGRESS_COLLECTION, { userId, courseId }, { limit: 999 });
    return extractList(result) as StudyProgress[];
  },

  /**
   * 获取特定章节的学习进度
   */
  async getLessonProgress(userId: string, lessonId: string): Promise<StudyProgress | null> {
    const result = await adminService.list(PROGRESS_COLLECTION, { userId, lessonId }, { limit: 1 });
    const data = extractList(result);
    return data.length > 0 ? (data[0] as StudyProgress) : null;
  },

  /**
   * 保存学习进度
   */
  async saveProgress(progress: Omit<StudyProgress, '_id' | 'createdAt' | 'updatedAt'>): Promise<StudyProgress> {
    const now = new Date().toISOString();

    // 检查是否已存在进度记录
    const result = await adminService.list(PROGRESS_COLLECTION, { userId: progress.userId, lessonId: progress.lessonId }, { limit: 1 });
    const existing = extractList(result);

    if (existing.length > 0) {
      // 更新现有记录
      await adminService.update(PROGRESS_COLLECTION, existing[0]._id, {
        ...progress,
        updatedAt: now,
      });
      return { ...progress, _id: existing[0]._id, updatedAt: now } as StudyProgress;
    } else {
      // 创建新记录
      const doc = {
        ...progress,
        createdAt: now,
        updatedAt: now,
      };
      const addResult = await adminService.add(PROGRESS_COLLECTION, doc);
      return { _id: addResult.data?.id || '', ...doc } as StudyProgress;
    }
  },

  /**
   * 标记章节为已完成
   */
  async markAsCompleted(userId: string, lessonId: string): Promise<boolean> {
    const now = new Date().toISOString();

    const result = await adminService.list(PROGRESS_COLLECTION, { userId, lessonId }, { limit: 1 });
    const existing = extractList(result);

    if (existing.length > 0) {
      await adminService.update(PROGRESS_COLLECTION, existing[0]._id, {
        completed: true,
        watchProgress: 100,
        updatedAt: now,
      });
      return true;
    }
    return false;
  },

  /**
   * 计算课程整体进度
   */
  async calculateCourseProgress(userId: string, courseId: string): Promise<number> {
    const progress = await this.getCourseProgress(userId, courseId);
    if (progress.length === 0) return 0;

    const totalProgress = progress.reduce((sum, p) => sum + p.watchProgress, 0);
    return Math.round(totalProgress / progress.length);
  },

  /**
   * 获取用户已购课程的进度
   */
  async getPurchasedCoursesProgress(userId: string): Promise<
    {
      courseId: string;
      courseTitle: string;
      progress: number;
      completed: boolean;
    }[]
  > {
    const progress = await this.getUserProgress(userId);
    
    // 按课程分组
    const grouped = progress.reduce((acc, p) => {
      if (!acc[p.courseId]) {
        acc[p.courseId] = {
          courseId: p.courseId,
          courseTitle: p.courseTitle || `课程${p.courseId}`,
          lessons: [],
        };
      }
      acc[p.courseId].lessons.push(p);
      return acc;
    }, {} as any);

    // 计算每个课程的进度
    return Object.values(grouped).map((group: any) => {
      const totalProgress = group.lessons.reduce((sum: number, p: StudyProgress) => sum + p.watchProgress, 0);
      const progress = Math.round(totalProgress / group.lessons.length);
      const completed = group.lessons.every((l: StudyProgress) => l.completed);

      return {
        courseId: group.courseId,
        courseTitle: group.courseTitle,
        progress,
        completed,
      };
    });
  },
};

export default progressService;
