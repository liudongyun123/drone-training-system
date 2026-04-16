// ============================================================================
// 图片懒加载组件
// 使用 Intersection Observer API 实现图片延迟加载
// ============================================================================
import { useState, useEffect, useRef, type CSSProperties, type ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  /** 图片加载失败时显示的回退图 */
  fallbackSrc?: string;
  /** 是否启用懒加载（默认true） */
  lazy?: boolean;
  /** 占位背景色 */
  placeholderColor?: string;
  /** 加载动画类型 */
  placeholderType?: 'spinner' | 'skeleton' | 'blur';
  /** 根容器的类名 */
  wrapperClassName?: string;
  /** 根容器的样式 */
  wrapperStyle?: CSSProperties;
  /** 回调：图片开始加载 */
  onLoadStart?: () => void;
  /** 回调：图片加载完成 */
  onLoaded?: () => void;
  /** 回调：图片加载失败 */
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=300&fit=crop';

/**
 * 懒加载图片组件
 * - 使用 Intersection Observer 实现延迟加载
 * - 支持占位符动画
 * - 支持错误回退
 * - 支持多种加载状态
 */
export default function LazyImage({
  src,
  alt,
  className = '',
  fallbackSrc = DEFAULT_FALLBACK,
  lazy = true,
  placeholderColor = 'bg-gray-200',
  placeholderType = 'skeleton',
  wrapperClassName = '',
  wrapperStyle,
  onLoadStart,
  onLoaded,
  onError,
  style,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy); // 非懒加载时直接显示
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer 实现懒加载
  useEffect(() => {
    if (!lazy) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px 0px', // 提前50px开始加载
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy]);

  // 当进入视图区域时，开始加载图片
  useEffect(() => {
    if (isInView && src && !currentSrc) {
      onLoadStart?.();
      // 使用一个小延迟模拟渐进加载
      const timer = setTimeout(() => {
        setCurrentSrc(src);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isInView, src, currentSrc, onLoadStart]);

  // 图片加载完成
  const handleLoad = () => {
    setIsLoaded(true);
    onLoaded?.();
  };

  // 图片加载失败
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setIsLoaded(true);
    onError?.(e);
  };

  // 确定最终显示的图片
  const displaySrc = hasError ? fallbackSrc : currentSrc;

  // 渲染占位符
  const renderPlaceholder = () => {
    if (placeholderType === 'spinner') {
      return (
        <div className={`absolute inset-0 flex items-center justify-center ${placeholderColor}`}>
          <span className="loading loading-spinner loading-sm text-gray-400"></span>
        </div>
      );
    }

    if (placeholderType === 'blur' && displaySrc) {
      return (
        <div 
          className={`absolute inset-0 transition-opacity duration-500 ${isLoaded ? 'opacity-0' : 'opacity-100'} ${placeholderColor}`}
          style={{
            backgroundImage: `url(${displaySrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)',
            transform: 'scale(1.1)', // 稍微放大以隐藏模糊边缘
          }}
        />
      );
    }

    // 默认 skeleton
    return (
      <div className={`absolute inset-0 animate-pulse ${placeholderColor}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${wrapperClassName}`}
      style={wrapperStyle}
    >
      {/* 占位符 */}
      {!isLoaded && renderPlaceholder()}

      {/* 实际图片 */}
      {displaySrc && (
        <img
          ref={imgRef}
          src={displaySrc}
          alt={alt || ''}
          className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={style}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {/* 图片加载失败图标 */}
      {hasError && !displaySrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <ImageOff className="w-8 h-8 text-gray-400" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 自定义 hook：批量图片懒加载管理
// ============================================================================
interface UseLazyImagesOptions {
  /** 懒加载根 margin */
  rootMargin?: string;
  /** 初始加载数量 */
  initialLoadCount?: number;
  /** 是否启用懒加载 */
  enabled?: boolean;
}

interface LazyImageEntry {
  id: string;
  src: string;
  isLoaded: boolean;
  isInView: boolean;
}

export function useLazyImages(
  items: Array<{ id: string; src: string }>,
  options: UseLazyImagesOptions = {}
) {
  const { rootMargin = '50px 0px', initialLoadCount = 10, enabled = true } = options;
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const [inViewIds, setInViewIds] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 初始化 Observer
  useEffect(() => {
    if (!enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-lazy-id');
          if (!id) return;

          if (entry.isIntersecting) {
            setInViewIds((prev) => new Set(prev).add(id));
          }
        });
      },
      { rootMargin }
    );

    return () => observerRef.current?.disconnect();
  }, [enabled, rootMargin]);

  // 批量注册观察元素
  const observeElement = (id: string, element: HTMLElement | null) => {
    if (!element || !observerRef.current) return;
    element.setAttribute('data-lazy-id', id);
    observerRef.current.observe(element);
  };

  // 标记图片已加载
  const markLoaded = (id: string) => {
    setLoadedIds((prev) => new Set(prev).add(id));
  };

  // 获取图片状态
  const getImageState = (id: string): LazyImageEntry => {
    const item = items.find((i) => i.id === id);
    return {
      id,
      src: item?.src || '',
      isLoaded: loadedIds.has(id),
      isInView: inViewIds.has(id),
    };
  };

  // 预加载指定 ID 的图片
  const preloadImage = (id: string) => {
    setInViewIds((prev) => new Set(prev).add(id));
  };

  // 预加载前 N 个图片
  const preloadFirst = (count: number = initialLoadCount) => {
    const firstIds = items.slice(0, count).map((i) => i.id);
    setInViewIds(new Set(firstIds));
  };

  return {
    observeElement,
    markLoaded,
    getImageState,
    preloadImage,
    preloadFirst,
    loadedCount: loadedIds.size,
    totalCount: items.length,
  };
}

// 导出占位符样式（可在全局 CSS 中使用）
export const shimmerKeyframes = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.animate-shimmer {
  animation: shimmer 1.5s infinite;
}
`;
