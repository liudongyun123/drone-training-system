/**
 * Learning Feature - 学习模块
 * 
 * 功能模块：
 * - 学习进度管理
 * - 学习路径
 * - 证书管理
 * 
 * @example
 * // 使用 Hooks
 * import { useMyLearning, useCertificate } from '@/features/learning';
 * 
 * // 使用组件
 * import { ProgressCard, LearningStats } from '@/features/learning';
 * 
 * // 使用页面
 * import { MyLearningPage } from '@/features/learning';
 */

// Types
export * from './types';

// API
export { learningApi } from './api';

// Hooks
export {
  useMyLearning,
  useLearningPath,
  useCertificate,
} from './hooks';

// Components
export {
  ProgressCard,
  LearningPathCard,
  CertificateCard,
  LearningStats,
  ProgressRing,
} from './components';

// Pages
export {
  MyLearningPage,
  LearningPathPage,
} from './pages';
