// ============================================================================
// 我的学习页面
// 业务逻辑：
// 1. 用户购买线上课程 -> 订单支付 -> 获得课程权限（course_permissions）
// 2. 用户报名线下班级 -> 解锁对应线上课程权限（registrations -> classes -> courses）
// ============================================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlayCircle, CheckCircle, BookOpen,
  Award, TrendingUp, ChevronRight, Calendar,
  ShoppingBag, Gift
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Loading, EmptyState, Card } from '@/components';
import { formatDateStr } from '@/utils/dateUtils';

interface LearningCourse {
  _id: string;
  title: string;
  coverImage: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lastStudyTime?: string;
  nextLesson?: { id: string; title: string };
  currentStudyDesc?: string;
  completed: boolean;
  category: string;
  level: string;
  orderId?: string;
  purchaseTime?: string;
  source: 'purchase' | 'enrollment';
  enrollmentClassName?: string;
}

export default function MyLearningPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [courses, setCourses] = useState<LearningCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0, inProgress: 0, completed: 0,
    totalStudyHours: 0, purchasedCourses: 0, enrolledCourses: 0,
  });
  const [activeTab, setActiveTab] = useState<'all' | 'inProgress' | 'completed'>('all');
  const [sourceTab, setSourceTab] = useState<'all' | 'purchase' | 'enrollment'>('all');

  useEffect(() => {
    if (isAuthenticated) { loadLearningData(); } else { setLoading(false); }
  }, [isAuthenticated]);

  // ========================================
  // 从课程数据 + 进度数据构建 LearningCourse
  // ========================================
  const buildCourse = (
    course: any,
    source: LearningCourse['source'],
    extra: Record<string, any> = {},
    progressData: any[] = [],
  ): LearningCourse => {
    let chapters: any[] = [];
    if (course.chapters?.length) chapters = course.chapters;
    else if (course.lessons?.length) chapters = [{ _id: 'ch1', title: '第一章', lessons: course.lessons }];

    const cp = progressData.filter((p: any) => p.courseId === course._id);
    const done = cp.filter((p: any) => p.completed).length;
    const total = chapters.flatMap((c: any) => c.lessons || []).length || course.lessons || course.totalLessons || 1;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    // 当前学习位置描述
    let desc = '';
    if (done > 0 && done < total) {
      const all = chapters.flatMap((c: any, ci: number) =>
        (c.lessons || []).map((l: any, li: number) => ({ ...l, chapterIndex: ci, chapterTitle: c.title, lessonIndex: li }))
      );
      const lastDone = all.find((l: any) => cp.some((p: any) => p.lessonId === l._id && p.completed));
      if (lastDone) {
        const next = all.find((l: any, i: number) =>
          i > all.indexOf(lastDone) && !cp.some((p: any) => p.lessonId === l._id && p.completed)
        ) || lastDone;
        desc = `学到${lastDone.chapterTitle}—${next.title}`;
      }
    } else if (done === 0 && total > 0) {
      const first = chapters.flatMap((c: any) =>
        (c.lessons || []).map((l: any) => ({ ...l, chapterTitle: c.title }))
      )[0];
      if (first) desc = `即将学习${first.chapterTitle}—${first.title}`;
    }

    // 下一节课
    const allFlat = chapters.flatMap((c: any, ci: number) =>
      (c.lessons || []).map((l: any, li: number) => ({ ...l, chapterIndex: ci, chapterTitle: c.title }))
    );
    let nextLesson: { id: string; title: string } | undefined;
    if (done < total && allFlat.length > 0) {
      const nl = allFlat.find((l: any) => !cp.some((p: any) => p.lessonId === l._id && p.completed));
      if (nl) nextLesson = { id: nl._id, title: nl.title };
    }

    return {
      _id: course._id, title: course.title,
      coverImage: course.coverImage || course.thumbnail,
      progress: pct, totalLessons: total, completedLessons: done,
      lastStudyTime: cp.length > 0 ? cp[cp.length - 1]?.lastWatchTime : undefined,
      currentStudyDesc: desc, nextLesson: nextLesson,
      completed: pct >= 100,
      category: course.category || '未分类', level: course.level || '初级',
      source, ...extra,
    };
  };

  const loadLearningData = async () => {
    setLoading(true);
    try {
      console.log('[MyLearningPage] ========== 开始加载学习数据 ==========');

      const userId = user?.uid || user?.id || (user as any)?._openid || '';
      const userPhone = user?.phone || localStorage.getItem('user_phone') || '';
      console.log('[MyLearningPage] 用户身份:', { userId, userPhone });

      const { adminService } = await import('@/services/adminService');

      // ========================================
      // 1. 查询学习进度
      // ========================================
      let progressData: any[] = [];
      try {
        const pr = await adminService.list('user_progress', { userId }, { limit: 500 });
        progressData = Array.isArray(pr.data) ? pr.data : (pr.data?.list || []);
      } catch (e) {
        try {
          const pr2 = await adminService.list('learning_progress', { userId }, { limit: 500 });
          progressData = Array.isArray(pr2.data) ? pr2.data : (pr2.data?.list || []);
        } catch (e2) { /* skip */ }
      }
      console.log('[MyLearningPage] 学习进度:', progressData.length, '条');

      // ========================================
      // 2. 查询课程权限（已购买课程）
      //    ★ phone 为主键（最稳定），userId/openid 为补充
      //    ★ 三路数据源兜底：course_permissions → 已支付订单 → members.enrolledCourses
      // ========================================
      const purchasedCourses: LearningCourse[] = [];
      const seenCids = new Set<string>(); // 全局去重

      // --- 数据源 A: course_permissions 集合 ---
      try {
        // ★ phone 优先查询（新写入的数据都用 phone）
        if (userPhone) {
          const permByPhone = await adminService.list('course_permissions', { phone: userPhone }, { limit: 100 });
          const perms = Array.isArray(permByPhone.data) ? permByPhone.data : (permByPhone.data?.list || []);
          console.log('[MyLearningPage] A-phone 查到权限:', perms.length);
          for (const perm of perms) {
            const cid = perm.courseId || perm.targetId;
            if (!cid || seenCids.has(cid)) continue;
            seenCids.add(cid);
            try {
              const cr = await adminService.get('courses', cid);
              const course = cr.data;
              if (!course || course.status !== 'published') continue;
              purchasedCourses.push(buildCourse(course, 'purchase', {
                orderId: perm.orderId, purchaseTime: perm.purchaseTime || perm.createdAt,
              }, progressData));
            } catch (e) { console.warn('[MyLearningPage] 课程获取失败:', cid); }
          }
        }

        // userId 补充查询（兼容旧数据）
        if (userId) {
          const userIdQueries = [{ userId }, { studentId: userId }, { memberId: userId }, { _openid: userId }];
          for (const q of userIdQueries) {
            try {
              const r = await adminService.list('course_permissions', q, { limit: 100 });
              const arr = Array.isArray(r.data) ? r.data : (r.data?.list || []);
              for (const perm of arr) {
                const cid = perm.courseId || perm.targetId;
                if (!cid || seenCids.has(cid)) continue;
                seenCids.add(cid);
                try {
                  const cr = await adminService.get('courses', cid);
                  const course = cr.data;
                  if (!course || course.status !== 'published') continue;
                  purchasedCourses.push(buildCourse(course, 'purchase', {
                    orderId: perm.orderId, purchaseTime: perm.purchaseTime || perm.createdAt,
                  }, progressData));
                } catch (e) { /* skip */ }
              }
            } catch (e) { /* skip */ }
          }
        }
      } catch (e) {
        console.error('[MyLearningPage] course_permissions 查询失败:', e);
      }
      console.log('[MyLearningPage] A: course_permissions 购买课程数:', purchasedCourses.length);

      // --- 数据源 B: 已支付订单直接查询（兜底，防止 course_permissions 缺失） ---
      if (purchasedCourses.length === 0) {
        console.log('[MyLearningPage] course_permissions 为空，尝试从已支付订单兜底查询...');
        try {
          const orderQuery: any = {};
          if (userPhone) {
            orderQuery.$or = [{ phone: userPhone }];
          }
          if (userId) {
            orderQuery.$or = orderQuery.$or || [];
            orderQuery.$or.push({ userId }, { _openid: userId });
          }

          const orderResult = await adminService.list('orders', orderQuery, { limit: 100 });
          const paidOrders = (Array.isArray(orderResult.data) ? orderResult.data : (orderResult.data?.list || []))
            .filter((o: any) => ['paid', 'completed', 'paid_offline'].includes(o.status));

          console.log('[MyLearningPage] B: 已支付订单:', paidOrders.length);
          for (const order of paidOrders) {
            const cids: string[] = [];
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item: any) => { if (item.courseId) cids.push(item.courseId); });
            }
            if (order.courseId && !cids.includes(order.courseId)) cids.push(order.courseId);

            for (const cid of cids) {
              if (!cid || seenCids.has(cid)) continue;
              seenCids.add(cid);
              try {
                const cr = await adminService.get('courses', cid);
                const course = cr.data;
                if (!course || course.status !== 'published') continue;
                purchasedCourses.push(buildCourse(course, 'purchase', {
                  orderId: order._id, purchaseTime: order.paidAt || order.createdAt,
                }, progressData));
              } catch (e) { /* skip */ }
            }
          }
        } catch (e) {
          console.error('[MyLearningPage] 订单兜底查询失败:', e);
        }
        console.log('[MyLearningPage] B: 订单兜底后购买课程数:', purchasedCourses.length);
      }

      // ========================================
      // 3. 查询报班附赠的课程（registrations -> classes -> courses）
      //    ★ 兼容多种字段匹配：userId / studentId / phone / userPhone
      // ========================================
      const enrolledCourses: LearningCourse[] = [];
      try {
        const enrollQuery: any = {};
        if (userId) {
          enrollQuery.$or = [{ userId }, { studentId: userId }, { _openid: userId }];
        }
        if (userPhone) {
          enrollQuery.$or = enrollQuery.$or || [];
          enrollQuery.$or.push({ userPhone }, { phone: userPhone });
        }

        let enrollments: any[] = [];
        try {
          const er = await adminService.list('registrations', enrollQuery, { limit: 100 });
          enrollments = Array.isArray(er.data) ? er.data : (er.data?.list || []);
        } catch (e) {
          const er2 = await adminService.list('enrollments', enrollQuery, { limit: 100 });
          enrollments = Array.isArray(er2.data) ? er2.data : (er2.data?.list || []);
        }
        console.log('[MyLearningPage] 报名记录:', enrollments.length);

        // 按班级维度去重（同一用户报多个班级都展示各自课程）
        const processedClassIds = new Set<string>();
        const purchasedIds = new Set(purchasedCourses.map(c => c._id));

        for (const enroll of enrollments) {
          if (!enroll.classId || processedClassIds.has(enroll.classId)) continue;

          try {
            const cr = await adminService.get('classes', enroll.classId);
            const cls = cr.data;
            if (!cls) continue;
            processedClassIds.add(enroll.classId);

            // 收集班级关联的课程ID
            const cids: string[] = [];
            if (cls.courseId) cids.push(cls.courseId);
            if (cls.videoGrantCourseId && cls.videoGrantCourseId !== cls.courseId) cids.push(cls.videoGrantCourseId);

            for (const targetCid of cids) {
              if (purchasedIds.has(targetCid)) continue;
              if (enrolledCourses.some(c => c._id === targetCid)) continue;

              const courseR = await adminService.get('courses', targetCid);
              const course = courseR.data;
              if (!course) continue;

              const isGift = targetCid === cls.videoGrantCourseId && targetCid !== cls.courseId;
              enrolledCourses.push(buildCourse(course, 'enrollment', {
                enrollmentClassName: isGift ? `${cls.name}（赠送）` : (cls.name || '线下班级'),
              }, progressData));
            }
          } catch (e) { console.warn('[MyLearningPage] 班级处理失败:', enroll.classId); }
        }
      } catch (e) { console.error('[MyLearningPage] 报名查询失败:', e); }
      console.log('[MyLearningPage] 报班附赠课程数:', enrolledCourses.length);

      // ========================================
      // 合并 + 统计
      // ========================================
      const allCourses = [...purchasedCourses, ...enrolledCourses];
      console.log('[MyLearningPage] ========== 最终合计:', allCourses.length, '门课程 ==========');
      console.log('[MyLearningPage] 分布: 购买=', purchasedCourses.length, '报班=', enrolledCourses.length);

      setCourses(allCourses);

      const completed = allCourses.filter(c => c.completed).length;
      setStats({
        totalCourses: allCourses.length,
        inProgress: allCourses.filter(c => !c.completed && c.progress > 0).length,
        completed,
        totalStudyHours: Math.floor(progressData.reduce((s, p) => s + (p.watchedDuration || 0), 0) / 3600),
        purchasedCourses: purchasedCourses.length,
        enrolledCourses: enrolledCourses.length,
      });
    } catch (error) {
      console.error('[MyLearningPage] 加载失败:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // 过滤
  const safeCourses = Array.isArray(courses) ? courses : [];
  const filteredCourses = safeCourses.filter(course => {
    if (sourceTab === 'purchase') return course.source === 'purchase';
    if (sourceTab === 'enrollment') return course.source === 'enrollment';
    if (activeTab === 'inProgress') return !course.completed && course.progress > 0;
    if (activeTab === 'completed') return course.completed;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8"><Loading fullScreen text="加载学习数据..." /></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <EmptyState type="custom" icon={<BookOpen className="w-16 h-16" />}
            title="请先登录" description="登录后即可查看您的学习进度"
            action={<button onClick={() => navigate('/login')} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">去登录</button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">我的学习</h1>
          <p className="text-gray-500 mt-2">管理您的学习进度和课程</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg"><BookOpen className="w-5 h-5" /></div>
              <div><p className="text-white/80 text-xs">全部课程</p><p className="text-xl font-bold">{stats.totalCourses}</p></div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
              <div><p className="text-white/80 text-xs">学习中</p><p className="text-xl font-bold">{stats.inProgress}</p></div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg"><Award className="w-5 h-5" /></div>
              <div><p className="text-white/80 text-xs">已完成</p><p className="text-xl font-bold">{stats.completed}</p></div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg"><ShoppingBag className="w-5 h-5" /></div>
              <div><p className="text-white/80 text-xs">线上购买</p><p className="text-xl font-bold">{stats.purchasedCourses}</p></div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg"><Gift className="w-5 h-5" /></div>
              <div><p className="text-white/80 text-xs">报班附赠</p><p className="text-xl font-bold">{stats.enrolledCourses}</p></div>
            </div>
          </Card>
        </div>

        {/* 来源筛选标签 */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-4">
          <div className="flex gap-2">
            {[
              { key: 'all', label: '全部', count: stats.totalCourses, icon: BookOpen },
              { key: 'purchase', label: '线上购买', count: stats.purchasedCourses, icon: ShoppingBag },
              { key: 'enrollment', label: '报班附赠', count: stats.enrolledCourses, icon: Gift },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setSourceTab(tab.key as any)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  sourceTab === tab.key ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <tab.icon className="w-4 h-4" />{tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${sourceTab === tab.key ? 'bg-white/20' : 'bg-gray-200'}`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 状态标签页 */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6">
          <div className="flex gap-2">
            {[
              { key: 'all', label: '全部', count: filteredCourses.length },
              { key: 'inProgress', label: '学习中', count: stats.inProgress },
              { key: 'completed', label: '已完成', count: stats.completed },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key ? 'bg-green-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                {tab.label}<span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200'}`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 课程列表 */}
        {filteredCourses.length === 0 ? (
          <EmptyState type={activeTab === 'completed' ? 'empty' : 'course'}
            title={activeTab === 'completed' ? '还没有完成的课程' : '还没有课程'}
            description={activeTab === 'completed' ? '继续学习，完成课程获取证书' : '快去购买课程开始学习吧'}
            action={<button onClick={() => navigate('/courses')} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">浏览课程</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* 课程封面 */}
                <div className="relative aspect-video">
                  <img src={course.coverImage || 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400'} alt={course.title} className="w-full h-full object-cover" />
                  {course.completed && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle size={12} />已完成
                    </div>
                  )}
                  {/* 来源徽章 */}
                  <div className="absolute top-2 left-2">
                    {course.source === 'enrollment' ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-amber-500 text-white rounded text-xs font-medium"><Gift size={12} />报班附赠</span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 bg-cyan-500 text-white rounded text-xs font-medium"><ShoppingBag size={12} />线上购买</span>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <span className="text-white/90 text-xs px-2 py-1 bg-black/30 rounded">{course.category}</span>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{course.title}</h3>

                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      course.level === 'beginner' ? 'bg-green-100 text-green-700' :
                      course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {course.level === 'beginner' ? '入门' : course.level === 'intermediate' ? '进阶' : '高级'}
                    </span>
                    <span className="text-gray-400 text-xs">{course.completedLessons}/{course.totalLessons} 课时</span>
                  </div>

                  {/* 学习进度 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">学习进度</span>
                      <span className="text-sm font-medium text-blue-600">{course.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${course.completed ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${course.progress}%` }} />
                    </div>
                  </div>

                  {/* 当前学习位置 */}
                  {!course.completed && course.currentStudyDesc && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-lg"><TrendingUp size={16} className="text-blue-600" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-blue-600 font-medium mb-0.5">当前进度</p>
                          <p className="text-sm text-gray-700 font-medium truncate">{course.currentStudyDesc}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {course.lastStudyTime && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                      <Calendar size={12} /><span>最近学习: {formatDateStr(course.lastStudyTime)}</span>
                    </div>
                  )}

                  <button onClick={() => navigate(`/learning/lesson/${course._id}`)}
                    className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                    {course.completed ? (<><CheckCircle size={18} />复习课程</>) : course.progress > 0 ? (<><PlayCircle size={18} />继续学习</>) : (<><PlayCircle size={18} />开始学习</>)}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
