/**
 * 高级懒加载组件
 * 支持预加载、占位符、自定义加载逻辑
 */

import React, { Suspense, useState, useEffect, useCallback, lazy, ComponentType } from 'react';
import { SkeletonCard, LazyPlaceholder } from './Skeleton';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@mui/material';

// ============================================================================
// 懒加载 Hook
// ============================================================================

interface LazyOptions {
  fallback?: React.ReactNode;
  ssr?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 动态导入 Hook
 * 支持预加载和缓存
 */
export function useLazyImport<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyOptions = {}
) {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { onLoad, onError } = options;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const module = await importFn();
      setComponent(() => module.default);
      onLoad?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [importFn, onLoad, onError]);

  // 预加载函数
  const preload = useCallback(() => {
    importFn().then(module => {
      setComponent(() => module.default);
    }).catch(() => {});
  }, [importFn]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    Component,
    loading,
    error,
    reload: load,
    preload,
    isLoaded: !!Component
  };
}

// ============================================================================
// 预加载管理器
// ============================================================================

class PreloadManager {
  private preloadedModules = new Set<string>();
  private preloadingModules = new Map<string, Promise<any>>();

  /**
   * 预加载模块
   */
  preload(path: string): Promise<any> {
    // 已加载
    if (this.preloadedModules.has(path)) {
      return Promise.resolve();
    }

    // 正在加载
    const existing = this.preloadingModules.get(path);
    if (existing) {
      return existing;
    }

    // 开始加载
    const promise = import(/* @vite-ignore */ `./${path}`)
      .then(module => {
        this.preloadedModules.add(path);
        this.preloadingModules.delete(path);
        return module;
      })
      .catch(err => {
        this.preloadingModules.delete(path);
        throw err;
      });

    this.preloadingModules.set(path, promise);
    return promise;
  }

  /**
   * 批量预加载
   */
  preloadMany(paths: string[]): Promise<any[]> {
    return Promise.all(paths.map(path => this.preload(path)));
  }

  /**
   * 检查是否已预加载
   */
  isPreloaded(path: string): boolean {
    return this.preloadedModules.has(path);
  }
}

export const preloadManager = new PreloadManager();

// ============================================================================
// 懒加载包装器
// ============================================================================

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  onError?: (error: Error) => void;
  suspense?: boolean;
}

interface LazyWrapperState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 懒加载包装器组件
 * 提供错误边界和加载状态
 */
export class LazyWrapper extends React.Component<LazyWrapperProps, LazyWrapperState> {
  constructor(props: LazyWrapperProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): LazyWrapperState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('LazyWrapper caught error:', error, errorInfo);
    this.props.onError?.(error);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, errorFallback, suspense = true } = this.props;

    if (hasError) {
      if (errorFallback) {
        return errorFallback;
      }

      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#fef2f2',
          borderRadius: '12px',
          border: '1px solid #fecaca'
        }}>
          <AlertTriangle size={48} color="#dc2626" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#991b1b', marginBottom: '0.5rem' }}>加载失败</h3>
          <p style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error?.message || '未知错误'}
          </p>
          <Button
            size="small"
            startIcon={<RefreshCw size={16} />}
            onClick={this.handleRetry}
            sx={{ color: '#dc2626' }}
          >
            重试
          </Button>
        </div>
      );
    }

    if (suspense) {
      return (
        <Suspense fallback={fallback || <SkeletonCard />}>
          {children}
        </Suspense>
      );
    }

    return children;
  }
}

// ============================================================================
// 路由预加载 Hook
// ============================================================================

interface RoutePreloadConfig {
  path: string;
  importFn: () => Promise<any>;
  priority?: 'high' | 'low';
}

/**
 * 路由预加载 Hook
 * 基于路由配置预加载组件
 */
export function useRoutePreloader(routes: RoutePreloadConfig[]) {
  // 根据优先级排序
  const sortedRoutes = [...routes].sort((a, b) => {
    const priorityOrder = { high: 0, low: 1 };
    return priorityOrder[a.priority || 'low'] - priorityOrder[b.priority || 'low'];
  });

  // 预加载高优先级路由
  useEffect(() => {
    sortedRoutes
      .filter(route => route.priority === 'high')
      .forEach(route => {
        preloadManager.preload(route.path);
      });
  }, []);

  // 预加载函数
  const preloadRoute = useCallback((path: string) => {
    const route = routes.find(r => r.path === path);
    if (route) {
      preloadManager.preload(route.path);
    }
  }, [routes]);

  // 预加载所有路由
  const preloadAll = useCallback(() => {
    routes.forEach(route => {
      preloadManager.preload(route.path);
    });
  }, [routes]);

  return { preloadRoute, preloadAll };
}

// ============================================================================
// 图片懒加载组件
// ============================================================================

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  placeholder?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  threshold = 0.1,
  rootMargin = '50px',
  className,
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const handleLoad = (): void => {
    setIsLoaded(true);
  };

  return (
    <div
      ref={imgRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
        ...style
      }}
    >
      {/* 占位符 */}
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#e5e7eb'
          }}
        >
          {placeholder || (
            <div
              style={{
                width: '40%',
                height: '40%',
                backgroundColor: '#d1d5db',
                borderRadius: '8px',
                animation: 'pulse 1.5s infinite'
              }}
            />
          )}
        </div>
      )}

      {/* 实际图片 */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
          {...props}
        />
      )}
    </div>
  );
};

// ============================================================================
// 虚拟列表组件（大数据渲染优化）
// ============================================================================

interface VirtualListProps<T> {
  items: T[];
  height: number | string;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + (typeof height === 'number' ? height : 300)) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        overflow: 'auto',
        position: 'relative'
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 无限滚动 Hook
// ============================================================================

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll(
  callback: () => void,
  hasMore: boolean,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 0.1, rootMargin = '100px' } = options;
  const targetRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore) {
          callback();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [callback, hasMore, threshold, rootMargin]);

  return targetRef;
}

// ============================================================================
// 导出
// ============================================================================

export default {
  useLazyImport,
  preloadManager,
  LazyWrapper,
  useRoutePreloader,
  LazyImage,
  VirtualList,
  useInfiniteScroll
};
