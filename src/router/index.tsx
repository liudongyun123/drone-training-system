// ============================================================================
// 路由配置 - 懒加载性能优化版
// ============================================================================
import { Suspense } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { Loading } from '@/components';
import {
  // 公共页面
  HomePage,
  CourseListPage,
  CourseDetailPage,
  CartPage,
  CheckoutPage,
  TeachersPage,
  ShopPage,
  ProductDetailPage,

  // 认证相关
  LoginPage,
  RegisterPage,
  BindPhonePage,

  // 学习相关
  MyLearningPage,
  LessonPlayerPage,
  MySchedulePage,
  ExamPage,
  ExamCenterPage,
  ExamResultPage,
  QuestionBankListPage,
  QuestionBankPracticePage,
  CertificateCenterPage,
  MarketingCenterPage,

  // 用户中心
  MyOrdersPage,
  MyCouponsPage,
  CouponCenterPage,

  // 前台功能页面
  NoticesPage,
  LearningPathsPage,
  MyPracticePage,
  MessagesPage,

  // 管理后台
  AdminDashboard,
  AdminCourses,
  AdminTeachers,
  AdminMembers,

  AdminFinance,
  AdminExamsUnited,
  AdminCertificates,
  AdminMarketing,
  AdminCategories,
  AdminLogin,
  AdminPageConfig,
  AdminComments,
  AdminLogs,
  AdminPracticeRecords,
  AdminRoles,
  AdminUserRoles,
  AdminNoticeManagement,
  AdminMessageManagement,
  AdminDataFix,
  AdminDiagnostics,
  AdminDictionaries,
  AdminSiteConfig,
  AdminSources,
  AdminLevels,
  TransferRequestPage,
  AdminTransfers,
  AdminClasses,
  AdminClassSchedules,
  AdminRegistrations,
  PermissionManagement,
  AdminCourseOrders,
  AdminClassOrders,
  AdminOfflineEnrollment,
  AdminAuthConfig,
  AdminProducts,
  AdminShopOrders,
  MyClassesPage,
  MyTrainingPage,
  OpenClassesPage,
  RegistrationPage,
} from '@/router/lazyRoutes';
import NoticeManagement from '@/components/admin/NoticeManagement';

// 辅助函数：包装懒加载组件
const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<Loading fullScreen />}>
    <Component />
  </Suspense>
);

// 辅助函数：包装受保护的路由（默认不需要管理员权限）
const protectedRoute = (Component: React.ComponentType) => (
  <AuthGuard requireAdmin={false}>
    <Suspense fallback={<Loading fullScreen />}>
      <Component />
    </Suspense>
  </AuthGuard>
);

// 辅助函数：包装管理员路由（需要管理员权限）
const adminRoute = (Component: React.ComponentType) => (
  <AuthGuard requireAdmin={true}>
    <Suspense fallback={<Loading fullScreen />}>
      <Component />
    </Suspense>
  </AuthGuard>
);

// 公共路由
const publicRoutes = [
  { path: '/', element: withSuspense(HomePage) },
  { path: '/courses', element: withSuspense(CourseListPage) },
  { path: '/courses/:id', element: withSuspense(CourseDetailPage) },
  { path: '/classes', element: withSuspense(OpenClassesPage) }, // 开班信息列表
  { path: '/teachers', element: withSuspense(TeachersPage) },
  { path: '/shop', element: withSuspense(ShopPage) }, // 商城列表
  { path: '/shop/:id', element: withSuspense(ProductDetailPage) }, // 商品详情
  { path: '/cart', element: withSuspense(CartPage) },
];

// 认证路由
const authRoutes = [
  { path: '/login', element: withSuspense(LoginPage) },
  { path: '/register', element: withSuspense(RegisterPage) },
  { path: '/bind-phone', element: withSuspense(BindPhonePage) }, // 绑定手机页面
];

// 需要登录的用户路由
const protectedRoutes = [
  { path: '/learning', element: protectedRoute(MyLearningPage) },
  { path: '/learning/lesson/:courseId', element: protectedRoute(LessonPlayerPage) },
  { path: '/learning/exam/:examId', element: protectedRoute(ExamPage) },
  { path: '/my-schedule', element: protectedRoute(MySchedulePage) },
  { path: '/my-orders', element: protectedRoute(MyOrdersPage) },
  { path: '/my-coupons', element: protectedRoute(MyCouponsPage) },
  { path: '/coupons/center', element: protectedRoute(CouponCenterPage) },
  { path: '/checkout', element: protectedRoute(CheckoutPage) },
  { path: '/exam-center', element: protectedRoute(ExamCenterPage) },
  { path: '/exam/:examId', element: protectedRoute(ExamCenterPage) },
  { path: '/exam/result/:attemptId', element: protectedRoute(ExamResultPage) },
  { path: '/question-banks', element: <Navigate to="/exam-center" replace /> },
  { path: '/practice/:bankId', element: protectedRoute(QuestionBankPracticePage) },
  { path: '/certificates', element: protectedRoute(CertificateCenterPage) },
  { path: '/marketing', element: protectedRoute(MarketingCenterPage) },
  // 前台功能页面
  { path: '/notices', element: withSuspense(NoticesPage) }, // 公告列表（公开）
  { path: '/messages', element: protectedRoute(MessagesPage) }, // 消息中心
  { path: '/learning-paths', element: withSuspense(LearningPathsPage) }, // 学习路径（公开）
  { path: '/my-practice', element: protectedRoute(MyPracticePage) }, // 我的练习（需登录）
  // 我的班级（新业务流 v20260410）
  { path: '/my-classes', element: protectedRoute(MyClassesPage) }, // 我的班级（需登录）
  { path: '/my-training', element: protectedRoute(MyTrainingPage) }, // 我的培训（合并班级+课表 v20260412）
  // 前台报名入口
  { path: '/registration', element: withSuspense(RegistrationPage) }, // 独立报名页面（公开）
  { path: '/registration/course/:courseId', element: withSuspense(RegistrationPage) }, // 指定课程报名
  { path: '/registration/class/:classId', element: withSuspense(RegistrationPage) }, // 班级专属报名页面
  { path: '/my-registrations', element: protectedRoute(RegistrationPage) }, // 我的报名记录（需登录）
];

// 管理后台路由（需要管理员权限）
const adminRoutes = [
  // 登录页（不需要权限保护）
  { path: '/admin/login', element: withSuspense(AdminLogin) },
  
  // 需要管理员权限的后台路由
  { path: '/admin', element: adminRoute(AdminDashboard) },
  { path: '/admin/courses', element: adminRoute(AdminCourses) },
  // 合并：/admin/students 重定向到 /admin/members
  { path: '/admin/students', element: <Navigate to="/admin/members" replace /> },
  { path: '/admin/teachers', element: adminRoute(AdminTeachers) },
  // 统一成员管理：旧路由重定向
  { path: '/admin/users', element: <Navigate to="/admin/members" replace /> },
  { path: '/admin/members', element: adminRoute(AdminMembers) }, // 统一成员管理入口
  // 排课管理统一使用班级排课（旧路由重定向）
  { path: '/admin/schedules', element: adminRoute(() => <Navigate to="/admin/class-schedules" replace />) },
  // 订单路由重定向（旧统一订单 → 新分类订单）
  { path: '/admin/orders', element: adminRoute(() => <Navigate to="/admin/course-orders" replace />) },
  { path: '/admin/exams', element: adminRoute(AdminExamsUnited) },
  { path: '/admin/page-config', element: adminRoute(AdminPageConfig) },
  // 热门课程管理已整合到内容配置中
  { path: '/admin/featured-courses', element: adminRoute(() => <Navigate to="/admin/page-config" replace />) },
  { path: '/admin/certificates', element: adminRoute(AdminCertificates) },
  { path: '/admin/marketing', element: adminRoute(AdminMarketing) },
  { path: '/admin/categories', element: adminRoute(AdminCategories) },

  // 新增管理模块
  { path: '/admin/comments', element: adminRoute(AdminComments) },
  { path: '/admin/logs', element: adminRoute(AdminLogs) },
  { path: '/admin/practice-records', element: adminRoute(AdminPracticeRecords) },
  { path: '/admin/roles', element: adminRoute(AdminRoles) },
  { path: '/admin/user-roles', element: adminRoute(AdminUserRoles) }, // 管理员账号管理

  // 数据修复
  { path: '/admin/data-fix', element: adminRoute(AdminDataFix) },

  // 系统诊断
  { path: '/admin/diagnostics', element: adminRoute(AdminDiagnostics) },

  // 系统配置中心
  { path: '/admin/dictionaries', element: adminRoute(AdminDictionaries) },
  { path: '/admin/site-config', element: adminRoute(AdminSiteConfig) },
  { path: '/admin/sources', element: adminRoute(AdminSources) },
  { path: '/admin/levels', element: adminRoute(AdminLevels) },

  // 系统设置
  { path: '/admin/auth-config', element: adminRoute(AdminAuthConfig) },

  // 调课管理
  { path: '/transfer-requests', element: protectedRoute(TransferRequestPage) }, // 学员端 - 调课申请
  { path: '/admin/transfers', element: adminRoute(AdminTransfers) }, // 管理端 - 调课审核

  // 班级与报名管理（新业务流 v20260410）
  { path: '/admin/classes', element: adminRoute(AdminClasses) }, // 班级管理
  { path: '/admin/class-schedules', element: adminRoute(AdminClassSchedules) }, // 班级排课
  { path: '/admin/registrations', element: adminRoute(AdminRegistrations) }, // 报名审核
  { path: '/admin/offline-enrollment', element: adminRoute(AdminOfflineEnrollment) }, // 线下报名（管理员帮用户报名）
  { path: '/admin/permissions', element: adminRoute(PermissionManagement) }, // 权限管理

  // 订单管理（新业务流 v20260413）
  { path: '/admin/course-orders', element: adminRoute(AdminCourseOrders) }, // 课程订单（视频课程购买）
  { path: '/admin/class-orders', element: adminRoute(AdminClassOrders) }, // 培训班订单（线上报名）

  // 商城管理
  { path: '/admin/products', element: adminRoute(AdminProducts) }, // 商品管理
  { path: '/admin/shop-orders', element: adminRoute(AdminShopOrders) }, // 商城订单

  // 旧路由重定向（模块合并后兼容）
  { path: '/admin/students', element: <Navigate to="/admin/members" replace /> }, // 旧学员管理 → 新成员管理
  { path: '/admin/users', element: <Navigate to="/admin/members" replace /> }, // 旧用户管理 → 新成员管理
  { path: '/admin/attendance', element: adminRoute(() => <Navigate to="/admin/class-schedules" replace />) }, // 旧出勤管理 → 新排课管理
  { path: '/admin/schedules', element: adminRoute(() => <Navigate to="/admin/class-schedules" replace />) }, // 旧排课管理 → 新排课管理
  { path: '/admin/finance', element: adminRoute(() => <Navigate to="/admin/orders" replace />) }, // 旧财务管理 → 新订单财务
  { path: '/admin/question-banks', element: adminRoute(() => <Navigate to="/admin/exams" replace />) }, // 旧题库管理 → 新考试题库
  { path: '/admin/offline-enrollment', element: adminRoute(() => <Navigate to="/admin/class-orders" replace />) }, // 线下报名 → 培训班订单
  { path: '/admin/banners', element: adminRoute(() => <Navigate to="/admin/page-config" replace />) }, // 旧轮播图 → 新内容配置
  { path: '/admin/featured-courses', element: adminRoute(() => <Navigate to="/admin/page-config" replace />) }, // 旧热门课程 → 新内容配置
  { path: '/admin/notices', element: adminRoute(() => <NoticeManagement />) }, // 公告管理
  { path: '/admin/messages', element: adminRoute(() => <AdminMessageManagement />) }, // 消息管理
  { path: '/admin/learning-paths', element: adminRoute(() => <Navigate to="/admin/page-config" replace />) }, // 旧学习路径 → 新内容配置
];

const router = createHashRouter([
  {
    path: '/',
    element: (
      <AuthProvider>
        <Layout />
      </AuthProvider>
    ),
    children: [
      ...publicRoutes,
      ...authRoutes,
      ...protectedRoutes,
      ...adminRoutes,
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default router;
