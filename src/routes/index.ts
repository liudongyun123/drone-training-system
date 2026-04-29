// ============================================================================
// 页面组件导出 - Web 前端
// ============================================================================
// 注意：页面组件位于 src/web/pages 目录下
// ============================================================================

// 首页相关
export { default as HomePage } from '../web/pages/home/HomePage';
export { default as NoticesPage } from '../web/pages/home/NoticesPage';
export { default as TeachersPage } from '../web/pages/home/TeachersPage';
export { default as OpenClassesPage } from '../web/pages/home/OpenClassesPage';
export { default as RegistrationPage } from '../web/pages/home/RegistrationPage';

// 账户相关
export { default as LoginPage } from '../web/pages/account/LoginPage';
export { default as RegisterPage } from '../web/pages/account/RegisterPage';
export { default as CartPage } from '../web/pages/account/CartPage';
export { default as CheckoutPage } from '../web/pages/account/CheckoutPage';
export { default as MyOrdersPage } from '../web/pages/account/MyOrdersPage';
export { default as MyCouponsPage } from '../web/pages/account/MyCouponsPage';
export { default as CouponCenterPage } from '../web/pages/account/CouponCenterPage';
export { default as TransferRequestPage } from '../web/pages/account/TransferRequestPage';

// 学习相关
export { default as CourseListPage } from '../web/pages/learning/CourseListPage';
export { default as CourseDetailPage } from '../web/pages/learning/CourseDetailPage';
export { default as MyLearningPage } from '../web/pages/learning/MyLearningPage';
export { default as LessonPlayerPage } from '../web/pages/learning/LessonPlayerPage';
export { default as LearningPathsPage } from '../web/pages/learning/LearningPathsPage';

// 练习/考试相关
export { default as ExamPage } from '../web/pages/practice/ExamPage';
export { default as ExamCenterPage } from '../web/pages/practice/ExamCenterPage';
export { default as ExamResultPage } from '../web/pages/practice/ExamResultPage';
export { default as MyPracticePage } from '../web/pages/practice/MyPracticePage';
export { default as QuestionBankListPage } from '../web/pages/practice/QuestionBankListPage';
export { default as QuestionBankPracticePage } from '../web/pages/practice/QuestionBankPracticePage';
export { default as CertificateCenterPage } from '../web/pages/practice/CertificateCenterPage';
export { default as MarketingCenterPage } from '../web/pages/practice/MarketingCenterPage';

// 培训班相关
export { default as MyTrainingPage } from '../web/pages/training/MyTrainingPage';
export { default as MySchedulePage } from '../web/pages/training/MySchedulePage';
export { default as ClassEnrollmentPage } from '../web/pages/training/ClassEnrollmentPage';

// 商城相关
export { default as ShopPage } from '../web/pages/shop/ShopPage';
export { default as ProductDetailPage } from '../web/pages/shop/ProductDetailPage';

// 管理后台 - 从 src/admin/pages 导出
export { default as AdminDashboard } from '../admin/pages/system/AdminDashboard';
export { default as AdminCourses } from '../admin/pages/courses/AdminCourses';
export { default as AdminStudents } from '../admin/pages/users/AdminRoles';
export { default as AdminTeachers } from '../admin/pages/content/AdminTeachers';
export { default as AdminSchedules } from '../admin/pages/classes/AdminClassSchedules';
export { default as AdminAttendance } from '../admin/pages/classes/AdminRegistrations';
export { default as AdminFinance } from '../admin/pages/orders/AdminFinance';
export { default as AdminExamsUnited } from '../admin/pages/exams/AdminExamsUnited';
export { default as AdminBanners } from '../admin/pages/shop/AdminProducts';
export { default as AdminPageConfig } from '../admin/pages/content/AdminPageConfigNew';
export { default as AdminCertificates } from '../admin/pages/users/AdminCertificates';
export { default as AdminMarketing } from '../admin/pages/content/AdminMarketing';
export { default as AdminLogin } from '../admin/pages/system/AdminLogin';
export { default as AdminDataFix } from '../admin/pages/system/AdminDataFix';
export { default as AdminCourseOrders } from '../admin/pages/orders/AdminCourseOrders';
export { default as AdminClassOrders } from '../admin/pages/classes/AdminClassOrders';
export { default as AdminOfflineEnrollment } from '../admin/pages/system/AdminOfflineEnrollment';