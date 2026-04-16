/**
 * 组件统一导出
 * 提供组件库的便捷导入
 */

// ============================================================================
// 基础组件
// ============================================================================
export { default as Loading, CardSkeleton, ListSkeleton } from './Loading';
export { default as Modal } from './Modal';
export { default as Button, IconButton } from './Button';
export { default as ConfirmDialog, useConfirmDialog } from './ConfirmDialog';
export { default as EmptyState, EmptySearchState, EmptyCartState, NoPermissionState } from './EmptyState';
export { default as Layout } from './Layout';
export { default as Footer } from './Footer';
export { default as Card, StatCard, InfoCard } from './Card';
export { default as Input, TextArea, Select } from './Input';
export { default as ThemeToggle, ThemeToggleWithLabel } from './ThemeToggle';
export { default as Navbar } from './Navbar';
export { default as VideoPlayer } from './VideoPlayer';
export { default as ErrorState, NotFoundState, NetworkErrorState } from './ErrorState';
export { default as CouponList } from './CouponList';
export { default as CouponSelector } from './CouponSelector';

// ============================================================================
// Toast
// ============================================================================
export { Toast, ToastContainer, toast } from './Toast';

// ============================================================================
// AuthGuard
// ============================================================================
export { default as AuthGuard } from './AuthGuard';
export { default as AuthGuardNew, AdminGuard, TeacherGuard, StudentGuard, UserGuard } from './AuthGuardNew';

// ============================================================================
// 骨架屏 & 懒加载（新增）
// ============================================================================
export { 
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  SkeletonContent,
  SkeletonBanner,
  SkeletonMedia,
  SkeletonForm,
  SkeletonSidebar,
  LazyPlaceholder,
  skeletonStyles
} from './Skeleton';

export {
  useLazyImport,
  preloadManager,
  LazyWrapper,
  useRoutePreloader,
  LazyImage,
  VirtualList,
  useInfiniteScroll
} from './LazyLoad';

// ============================================================================
// 错误处理（新增）
// ============================================================================
export {
  ErrorBoundary,
  useAsyncError,
  useErrorHandler,
  ErrorAlert
} from './ErrorBoundary';

// ============================================================================
// 管理后台组件（新增/增强）
// ============================================================================
export { ImageUploader } from './admin/ImageUploader';
export { BannerManagement } from './admin/BannerManagement';
export { QuestionImport } from './admin/QuestionImport';
