// @ts-nocheck
// ============================================================================
// 学习进度服务
// 身份字段统一说明：
//  - 全系统以「手机号」为主键；小程序与云函数 api-course 写 user_progress 时均使用 phone。
//  - 本服务原先使用 userId(=uid)，导致 Web 与小程序 / 云函数的进度记录无法互通。
//  - 现统一为：写入时同时记录 phone(主) 与 userId(兼容键)；读取时用 $or 同时匹配
//    phone 与 userId，从而三端进度互通，且历史 uid 记录不会被漏读（无需数据迁移）。
// ============================================================================
import { adminService } from '@/services/adminService';
import { authService } from './cloudBaseService';
import { useAuthStore } from '@/store/authStore';

// 统一使用 user_progress 集合（与小程序 / api-course 一致）
const PROGRESS_COLLECTION = 'user_progress';

/** 辅助：将 adminService.list / listWithOps 的结果转为数组 */
function extractList(result: any): any[] {
  return result?.data?.list || result?.data || [];
}

export interface StudyProgress {
  _id: string;
  userId: string;
  phone?: string; // 统一身份字段（与小程序 / 云函数一致）
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

// 解析当前用户身份：phone 为主，userId(uid) 为兼容键。
// 同时读取 authStore（登录态的权威来源，phone 必存在）与 authService.getCurrentUser，
// 任一来源有 phone/uid 即可，保证读取身份可靠（不依赖 api-auth 返回结构）。
function readStoreUser(): { phone: string; uid: string; id: string } {
  const s = useAuthStore.getState().user;
  if (!s) return { phone: '', uid: '', id: '' };
  return { phone: s.phone || '', uid: s.uid || '', id: s.id || '' };
}

async function resolveIdentity(): Promise<{ phone: string; userId: string }> {
  let svcPhone = '';
  let svcUid = '';
  try {
    const user = await authService.getCurrentUser();
    svcPhone = (user as any)?.phone || '';
    svcUid = (user as any)?.uid || (user as any)?.id || '';
  } catch {
    /* ignore */
  }
  const store = readStoreUser();
  const phone = svcPhone || store.phone || '';
  const userId = svcUid || store.uid || store.id || '';
  return { phone, userId };
}

// 构造按身份匹配的 $or 条件（空值不参与，避免误匹配空字段记录）
function buildIdentityOr(phone: string, userId: string): any[] {
  const or: any[] = [];
  if (phone) or.push({ phone });
  if (userId) or.push({ userId });
  return or;
}

export const progressService = {
  /**
   * 获取用户的学习进度
   */
  async getUserProgress(): Promise<StudyProgress[]> {
    const { phone, userId } = await resolveIdentity();
    const or = buildIdentityOr(phone, userId);
    if (or.length === 0) return [];
    const result = await adminService.listWithOps(PROGRESS_COLLECTION, { $or: or }, { limit: 999 });
    return extractList(result) as StudyProgress[];
  },

  /**
   * 获取特定课程的学习进度（按当前用户身份：phone 优先，兼容 userId）
   */
  async getCourseProgress(courseId: string): Promise<StudyProgress[]> {
    const { phone, userId } = await resolveIdentity();
    const or = buildIdentityOr(phone, userId);
    if (or.length === 0) return [];
    const result = await adminService.listWithOps(PROGRESS_COLLECTION, { $or: or, courseId }, { limit: 999 });
    return extractList(result) as StudyProgress[];
  },

  /**
   * 获取特定章节的学习进度
   */
  async getLessonProgress(lessonId: string): Promise<StudyProgress | null> {
    const { phone, userId } = await resolveIdentity();
    const or = buildIdentityOr(phone, userId);
    if (or.length === 0) return null;
    const result = await adminService.listWithOps(PROGRESS_COLLECTION, { $or: or, lessonId }, { limit: 1 });
    const data = extractList(result);
    return data.length > 0 ? (data[0] as StudyProgress) : null;
  },

  /**
   * 保存学习进度（写入时同时记录 phone 与 userId，确保三端互通）
   */
  async saveProgress(progress: Omit<StudyProgress, '_id' | 'createdAt' | 'updatedAt'>): Promise<StudyProgress> {
    const now = new Date().toISOString();
    const { phone: curPhone, userId: curUid } = await resolveIdentity();

    const phone = progress.phone || curPhone || '';
    const userId = progress.userId || curUid || '';

    // 查找是否已存在进度记录（按身份 + 课时匹配）
    const or = buildIdentityOr(phone, userId);
    let existing: any[] = [];
    if (or.length > 0) {
      const res = await adminService.listWithOps(PROGRESS_COLLECTION, { $or: or, lessonId: progress.lessonId }, { limit: 1 });
      existing = extractList(res);
    }

    if (existing.length > 0) {
      // 更新现有记录
      await adminService.update(PROGRESS_COLLECTION, existing[0]._id, {
        ...progress,
        phone,
        userId,
        updatedAt: now,
      });
      return { ...progress, phone, userId, _id: existing[0]._id, updatedAt: now } as StudyProgress;
    } else {
      // 创建新记录
      const doc = {
        ...progress,
        phone,
        userId,
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
  async markAsCompleted(lessonId: string): Promise<boolean> {
    const { phone, userId } = await resolveIdentity();
    const or = buildIdentityOr(phone, userId);
    if (or.length === 0) return false;

    const result = await adminService.listWithOps(PROGRESS_COLLECTION, { $or: or, lessonId }, { limit: 1 });
    const existing = extractList(result);

    if (existing.length > 0) {
      await adminService.update(PROGRESS_COLLECTION, existing[0]._id, {
        completed: true,
        watchProgress: 100,
        updatedAt: new Date().toISOString(),
      });
      return true;
    }
    return false;
  },

  /**
   * 计算课程整体进度
   */
  async calculateCourseProgress(courseId: string): Promise<number> {
    const progress = await this.getCourseProgress(courseId);
    if (progress.length === 0) return 0;

    const totalProgress = progress.reduce((sum, p) => sum + p.watchProgress, 0);
    return Math.round(totalProgress / progress.length);
  },

  /**
   * 获取用户已购课程的进度
   */
  async getPurchasedCoursesProgress(): Promise<
    {
      courseId: string;
      courseTitle: string;
      progress: number;
      completed: boolean;
    }[]
  > {
    const progress = await this.getUserProgress();

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
