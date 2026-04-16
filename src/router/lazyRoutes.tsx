// ============================================================================
// 懒加载路由配置 - 性能优化版本
// ============================================================================
import { lazy } from 'react';

// 公共页面
export const HomePage = lazy(() => import('@/routes/HomePage'));
export const CourseListPage = lazy(() => import('@/routes/CourseListPage'));
export const CourseDetailPage = lazy(() => import('@/routes/CourseDetailPage'));
export const OpenClassesPage = lazy(() => import('@/routes/OpenClassesPage')); // 开班信息列表
export const CartPage = lazy(() => import('@/routes/CartPage'));
export const CheckoutPage = lazy(() => import('@/routes/CheckoutPage'));
export const TeachersPage = lazy(() => import('@/routes/TeachersPage'));

// 认证相关
export const LoginPage = lazy(() => import('@/routes/LoginPage'));
export const RegisterPage = lazy(() => import('@/routes/RegisterPage'));
export const BindPhonePage = lazy(() => import('@/routes/BindPhonePage')); // 绑定手机页面

// 学习相关
export const MyLearningPage = lazy(() => import('@/routes/MyLearningPage'));
export const LessonPlayerPage = lazy(() => import('@/routes/LessonPlayerPage'));
export const MySchedulePage = lazy(() => import('@/routes/MySchedulePage'));
export const ExamPage = lazy(() => import('@/routes/ExamPage'));
export const ExamCenterPage = lazy(() => import('@/pages/ExamCenter'));
export const ExamResultPage = lazy(() => import('@/pages/ExamResult'));
export const QuestionBankListPage = lazy(() => import('@/pages/QuestionBankList'));
export const QuestionBankPracticePage = lazy(() => import('@/pages/QuestionBankPractice'));
export const CertificateCenterPage = lazy(() => import('@/pages/CertificateCenter'));
export const MarketingCenterPage = lazy(() => import('@/pages/MarketingCenter'));

// 用户中心
export const MyOrdersPage = lazy(() => import('@/routes/MyOrdersPage'));
export const MyCouponsPage = lazy(() => import('@/pages/MyCouponsPage'));
export const CouponCenterPage = lazy(() => import('@/pages/CouponCenterPage'));

// 管理后台 - 按模块懒加载
export const AdminDashboard = lazy(() => import('@/routes/admin/AdminDashboard'));
export const AdminCourses = lazy(() => import('@/routes/admin/AdminCourses'));
export const AdminTeachers = lazy(() => import('@/routes/admin/AdminTeachers'));
export const AdminMembers = lazy(() => import('@/components/admin/MemberManagement')); // 统一成员管理入口

export const AdminFinance = lazy(() => import('@/routes/admin/AdminFinance'));
export const AdminExamsUnited = lazy(() => import('@/routes/admin/AdminExamsUnited'));
export const AdminPageConfig = lazy(() => import('@/routes/admin/AdminPageConfigNew')); // 统一内容配置入口
export const AdminCertificates = lazy(() => import('@/routes/admin/AdminCertificates'));
export const AdminMarketing = lazy(() => import('@/routes/admin/AdminMarketing'));
export const AdminCategories = lazy(() => import('@/routes/admin/AdminCategories'));
export const AdminLogin = lazy(() => import('@/components/admin/AdminLogin'));

// 新增管理模块
export const AdminComments = lazy(() => import('@/routes/admin/AdminComments'));
export const AdminLogs = lazy(() => import('@/routes/admin/AdminLogs'));
export const AdminPracticeRecords = lazy(() => import('@/routes/admin/AdminPracticeRecords'));
export const AdminMemberLevels = lazy(() => import('@/routes/admin/AdminMemberLevels'));
export const AdminRoles = lazy(() => import('@/routes/admin/AdminRoles'));
export const AdminUserRoles = lazy(() => import('@/routes/admin/AdminUserRoles')); // 管理员账号管理
export const AdminNoticeManagement = lazy(() => import('@/components/admin/NoticeManagement')); // 公告管理
export const AdminMessageManagement = lazy(() => import('@/components/admin/MessageManagement')); // 消息管理

// 数据修复
export const AdminDataFix = lazy(() => import('@/routes/admin/AdminDataFix'));

// 系统诊断
export const AdminDiagnostics = lazy(() => import('@/routes/admin/AdminDiagnostics'));

// 系统设置
export const AdminAuthConfig = lazy(() => import('@/components/admin/AuthConfig')); // 系统设置（登录方式/角色权限）

// 调课管理
export const TransferRequestPage = lazy(() => import('@/routes/user/TransferRequestPage')); // 学员端调课申请
export const AdminTransfers = lazy(() => import('@/routes/admin/AdminTransfers')); // 管理端调课审核

// 前台新增功能页面
export const NoticesPage = lazy(() => import('@/routes/NoticesPage')); // 公告列表
export const LearningPathsPage = lazy(() => import('@/routes/LearningPathsPage')); // 学习路径
export const MyPracticePage = lazy(() => import('@/routes/MyPracticePage')); // 我的练习
export const MessagesPage = lazy(() => import('@/pages/MessagesPage')); // 消息中心

// 班级与报名管理（新业务流 v20260410）
export const AdminClasses = lazy(() => import('@/routes/admin/AdminClasses')); // 班级管理
export const AdminClassSchedules = lazy(() => import('@/routes/admin/AdminClassSchedules')); // 班级排课
export const AdminRegistrations = lazy(() => import('@/routes/admin/AdminRegistrations')); // 报名审核
export const PermissionManagement = lazy(() => import('@/components/admin/PermissionManagement')); // 权限管理

// 订单管理（新业务流 v20260413）
export const AdminCourseOrders = lazy(() => import('@/routes/admin/AdminCourseOrders')); // 课程订单（type='course'）
export const AdminClassOrders = lazy(() => import('@/routes/admin/AdminClassOrders')); // 培训班订单（type='class'）
export const AdminOfflineEnrollment = lazy(() => import('@/routes/admin/AdminOfflineEnrollment')); // 线下报名

// 学员端 - 我的班级
export const MyClassesPage = lazy(() => import('@/routes/user/MyClassesPage')); // 我的班级
export const MyTrainingPage = lazy(() => import('@/routes/user/MyTrainingPage')); // 我的培训（合并班级+课表）

// 前台报名页面
export const RegistrationPage = lazy(() => import('@/routes/RegistrationPage')); // 独立报名入口
