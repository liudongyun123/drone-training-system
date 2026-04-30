// ============================================================================
// 懒加载路由配置 - 性能优化版本
// 目录重组后: 前台 → src/web/pages/, 后台 → src/admin/pages/
// ============================================================================
import { lazy } from 'react';

// ==================== 前台页面 (src/web/pages/) ====================

// 首页
export const HomePage = lazy(() => import('@/web/pages/home/HomePage'));
export const TeachersPage = lazy(() => import('@/web/pages/home/TeachersPage'));
export const NoticesPage = lazy(() => import('@/web/pages/home/NoticesPage'));
export const OpenClassesPage = lazy(() => import('@/web/pages/home/OpenClassesPage'));
export const RegistrationPage = lazy(() => import('@/web/pages/home/RegistrationPage'));

// 认证相关
export const LoginPage = lazy(() => import('@/web/pages/account/LoginPage'));
export const RegisterPage = lazy(() => import('@/web/pages/account/RegisterPage'));
export const BindPhonePage = lazy(() => import('@/web/pages/account/BindPhonePage'));

// 线上学习
export const CourseListPage = lazy(() => import('@/web/pages/learning/CourseListPage'));
export const CourseDetailPage = lazy(() => import('@/web/pages/learning/CourseDetailPage'));
export const LessonPlayerPage = lazy(() => import('@/web/pages/learning/LessonPlayerPage'));
export const MyLearningPage = lazy(() => import('@/web/pages/learning/MyLearningPage'));
export const LearningPathsPage = lazy(() => import('@/web/pages/learning/LearningPathsPage'));
export const CoursesPage = lazy(() => import('@/web/pages/learning/CoursesPage'));

// 线下培训
export const ClassEnrollmentPage = lazy(() => import('@/web/pages/training/ClassEnrollmentPage'));
export const MyClassesPage = lazy(() => import('@/web/pages/training/MyClassesPage'));
export const MySchedulePage = lazy(() => import('@/web/pages/training/MySchedulePage'));
export const MyTrainingPage = lazy(() => import('@/web/pages/training/MyTrainingPage'));
export const StudentScheduleChangePage = lazy(() => import('@/web/pages/training/StudentScheduleChangePage'));

// 练习/考试
export const ExamPage = lazy(() => import('@/web/pages/practice/ExamPage'));
export const MyPracticePage = lazy(() => import('@/web/pages/practice/MyPracticePage'));
export const ExamCenterPage = lazy(() => import('@/web/pages/practice/ExamCenterPage'));
export const ExamResultPage = lazy(() => import('@/web/pages/practice/ExamResultPage'));
export const QuestionBankListPage = lazy(() => import('@/web/pages/practice/QuestionBankListPage'));
export const QuestionBankPracticePage = lazy(() => import('@/web/pages/practice/QuestionBankPracticePage'));
export const CertificateCenterPage = lazy(() => import('@/web/pages/practice/CertificateCenterPage'));
export const MarketingCenterPage = lazy(() => import('@/web/pages/practice/MarketingCenterPage'));

// 账户/用户中心
export const CartPage = lazy(() => import('@/web/pages/account/CartPage'));
export const CheckoutPage = lazy(() => import('@/web/pages/account/CheckoutPage'));
export const MyOrdersPage = lazy(() => import('@/web/pages/account/MyOrdersPage'));
export const MyCouponsPage = lazy(() => import('@/web/pages/account/MyCouponsPage'));
export const CouponCenterPage = lazy(() => import('@/web/pages/account/CouponCenterPage'));
export const MessagesPage = lazy(() => import('@/web/pages/account/MessagesPage'));
export const TransferRequestPage = lazy(() => import('@/web/pages/account/TransferRequestPage'));

// 商城
export const ShopPage = lazy(() => import('@/web/pages/shop/ShopPage'));
export const ProductDetailPage = lazy(() => import('@/web/pages/shop/ProductDetailPage'));

// ==================== 管理后台 (src/admin/pages/) ====================

// 系统管理
export const AdminDashboard = lazy(() => import('@/admin/pages/system/AdminDashboard'));
export const AdminLogin = lazy(() => import('@/admin/pages/system/AdminLogin'));
export const AdminDataFix = lazy(() => import('@/admin/pages/system/AdminDataFix'));
export const AdminDiagnostics = lazy(() => import('@/admin/pages/system/AdminDiagnostics'));
export const AdminLogs = lazy(() => import('@/admin/pages/system/AdminLogs'));
export const AdminOfflineEnrollment = lazy(() => import('@/admin/pages/system/AdminOfflineEnrollment'));
export const AdminDictionaries = lazy(() => import('@/admin/pages/system/AdminDictionaries'));
export const AdminSiteConfig = lazy(() => import('@/admin/pages/system/AdminSiteConfig'));

// 课程管理
export const AdminCourses = lazy(() => import('@/admin/pages/courses/AdminCourses'));

// 班级管理
export const AdminClasses = lazy(() => import('@/admin/pages/classes/AdminClasses'));
export const AdminClassSchedules = lazy(() => import('@/admin/pages/classes/AdminClassSchedules'));
export const AdminClassOrders = lazy(() => import('@/admin/pages/classes/AdminClassOrders'));
export const AdminRegistrations = lazy(() => import('@/admin/pages/classes/AdminRegistrations'));

// 用户管理
export const AdminRoles = lazy(() => import('@/admin/pages/users/AdminRoles'));
export const AdminUserRoles = lazy(() => import('@/admin/pages/users/AdminUserRoles'));
export const AdminMemberLevels = lazy(() => import('@/admin/pages/users/AdminMemberLevels'));
export const AdminCertificates = lazy(() => import('@/admin/pages/users/AdminCertificates'));
export const AdminMembers = lazy(() => import('@/components/admin/MemberManagement')); // 统一成员管理入口（组件暂未移动）

// 订单财务
export const AdminCourseOrders = lazy(() => import('@/admin/pages/orders/AdminCourseOrders'));
export const AdminFinance = lazy(() => import('@/admin/pages/orders/AdminFinance'));
export const AdminTransfers = lazy(() => import('@/admin/pages/orders/AdminTransfers'));

// 考试管理
export const AdminExamsUnited = lazy(() => import('@/admin/pages/exams/AdminExamsUnited'));
export const AdminPracticeRecords = lazy(() => import('@/admin/pages/exams/AdminPracticeRecords'));

// 内容管理
export const AdminCategories = lazy(() => import('@/admin/pages/content/AdminCategories'));
export const AdminPageConfig = lazy(() => import('@/admin/pages/content/AdminPageConfigNew'));
export const AdminComments = lazy(() => import('@/admin/pages/content/AdminComments'));
export const AdminMarketing = lazy(() => import('@/admin/pages/content/AdminMarketing'));
export const AdminTeachers = lazy(() => import('@/admin/pages/content/AdminTeachers'));

// 商城管理
export const AdminProducts = lazy(() => import('@/admin/pages/shop/AdminProducts'));
export const AdminShopOrders = lazy(() => import('@/admin/pages/shop/AdminShopOrders'));

// ==================== 仍在 components/admin 中的组件 ====================
export const AdminNoticeManagement = lazy(() => import('@/components/admin/NoticeManagement'));
export const AdminMessageManagement = lazy(() => import('@/components/admin/MessageManagement'));
export const AdminAuthConfig = lazy(() => import('@/components/admin/AuthConfig'));
export const PermissionManagement = lazy(() => import('@/components/admin/PermissionManagement'));
