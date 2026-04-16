import React, { useState, useRef, useEffect } from 'react';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  placeholder?: string;
  loadingType?: 'lazy' | 'eager';
  threshold?: number;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 图片懒加载组件
 * 使用 Intersection Observer API 实现图片懒加载
 */
export default function LazyImage({
  src,
  alt = '',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3C/svg%3E',
  loadingType = 'lazy',
  threshold = 0.1,
  className = '',
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loadingType === 'eager');
  const [imageSrc, setImageSrc] = useState(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // 如果 eager 模式，直接加载
    if (loadingType === 'eager') {
      setImageSrc(src);
      return;
    }

    // 创建 Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin: '50px'
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, loadingType, threshold, placeholder]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageSrc(placeholder);
    onError?.();
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      onLoad={handleLoad}
      onError={handleError}
      className={`transition-opacity duration-300 ${!isLoaded ? 'opacity-0' : 'opacity-100'} ${className}`}
      loading={loadingType}
      {...props}
    />
  );
}

/**
 * 响应式图片组件
 * 自动根据设备选择合适的图片尺寸
 */
export function ResponsiveImage({
  src,
  alt = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  className = '',
  ...props
}: LazyImageProps & { sizes?: string }) {
  // 假设有不同尺寸的图片
  const imageSizes = {
    small: src.replace(/(\.[^.]+)$/, '_small$1'),
    medium: src.replace(/(\.[^.]+)$/, '_medium$1'),
    large: src.replace(/(\.[^.]+)$/, '_large$1'),
    original: src
  };

  return (
    <picture>
      <source
        media="(max-width: 768px)"
        srcSet={imageSizes.small}
      />
      <source
        media="(max-width: 1200px)"
        srcSet={imageSizes.medium}
      />
      <LazyImage
        src={imageSizes.large}
        alt={alt}
        sizes={sizes}
        className={className}
        {...props}
      />
    </picture>
  );
}

/**
 * 渐进式图片加载组件
 * 先显示低质量占位图，再加载高清图
 */
export function ProgressiveImage({
  src,
  placeholder,
  alt = '',
  className = '',
  ...props
}: LazyImageProps & { placeholder: string }) {
  const [imgSrc, setImgSrc] = useState(placeholder);

  return (
    <div className="relative overflow-hidden">
      {/* 低质量占位图 */}
      <img
        src={placeholder}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          imgSrc === src ? 'opacity-0' : 'opacity-100'
        }`}
        {...props}
      />

      {/* 高清图 */}
      <img
        src={imgSrc}
        alt={alt}
        onLoad={() => setImgSrc(src)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          imgSrc === src ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        {...props}
      />
    </div>
  );
}

/**
 * 图片加载状态组件
 * 显示加载中、加载失败等状态
 */
export function ImageWithStatus({
  src,
  alt = '',
  className = '',
  loadingContent,
  errorContent,
  ...props
}: LazyImageProps & {
  loadingContent?: React.ReactNode;
  errorContent?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* 加载中状态 */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          {loadingContent || (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          )}
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          {errorContent || (
            <div className="text-center text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm">图片加载失败</p>
            </div>
          )}
        </div>
      )}

      {/* 图片 */}
      <LazyImage
        src={src}
        alt={alt}
        onLoad={() => {
          setLoading(false);
          setError(false);
        }}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        className={`w-full h-full ${error ? 'hidden' : ''}`}
        {...props}
      />
    </div>
  );
}
