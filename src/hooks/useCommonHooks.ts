/**
 * 通用自定义 Hooks 库
 * 提供可复用的业务逻辑封装
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { serviceCache } from '@/services/core/BaseService';

// ============================================================================
// 异步数据获取 Hooks
// ============================================================================

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseAsyncOptions {
  manual?: boolean;
  defaultLoading?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

/**
 * 异步数据获取 Hook
 * 支持缓存、自动重试、错误处理
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseAsyncOptions = {}
): UseAsyncState<T> {
  const {
    manual = false,
    defaultLoading = !manual,
    cacheKey,
    cacheTTL = 60000,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(defaultLoading);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result: T;

      // 检查缓存
      if (cacheKey) {
        const cached = serviceCache.get<T>(cacheKey);
        if (cached !== null) {
          setData(cached);
          setLoading(false);
          onSuccess?.(cached);
          return;
        }

        result = await asyncFn();
        serviceCache.set(cacheKey, result, cacheTTL);
      } else {
        result = await asyncFn();
      }

      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [asyncFn, cacheKey, cacheTTL, onSuccess, onError]);

  useEffect(() => {
    if (!manual) {
      fetchData();
    }
  }, [...deps]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================================================
// 分页 Hook
// ============================================================================

interface UsePaginationOptions<T> {
  fetchFn: (params: { page: number; pageSize: number }) => Promise<{ list: T[]; total: number }>;
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * 分页数据获取 Hook
 */
export function usePagination<T>({
  fetchFn,
  pageSize = 20,
  initialPage = 1
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isLoadingMore = useRef(false);

  const fetchData = useCallback(async (pageNum: number, append = false) => {
    if (isLoadingMore.current && append) return;
    
    if (append) {
      isLoadingMore.current = true;
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetchFn({ page: pageNum, pageSize });
      
      if (append) {
        setData(prev => [...prev, ...result.list]);
      } else {
        setData(result.list);
      }
      
      setTotal(result.total);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
      isLoadingMore.current = false;
    }
  }, [fetchFn, pageSize]);

  const loadMore = useCallback(async () => {
    if (!hasMore && !loading) {
      await fetchData(page + 1, true);
    }
  }, [fetchData, page, loading, hasMore]);

  const goToPage = useCallback(async (pageNum: number) => {
    await fetchData(pageNum, false);
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData(1, false);
  }, [fetchData]);

  const hasMore = useMemo(() => {
    return data.length < total;
  }, [data.length, total]);

  useEffect(() => {
    fetchData(initialPage, false);
  }, []);

  return {
    data,
    total,
    page,
    pageSize,
    loading,
    error,
    hasMore,
    loadMore,
    goToPage,
    refresh
  };
}

// ============================================================================
// 表单处理 Hook
// ============================================================================

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Record<string, string>;
  onSubmit?: (values: T) => Promise<void>;
}

interface UseFormResult<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isDirty: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setFieldValue: (field: string, value: any) => void;
  setFieldError: (field: string, error: string) => void;
  reset: () => void;
  validateField: (field: string) => boolean;
}

/**
 * 表单处理 Hook
 */
export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit
}: UseFormOptions<T>): UseFormResult<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    if (validate) {
      const validationErrors = validate(values);
      if (validationErrors[name]) {
        setErrors(prev => ({ ...prev, [name]: validationErrors[name] }));
      } else {
        setErrors(prev => {
          const { [name]: _, ...rest } = prev;
          return rest;
        });
      }
    }
  }, [validate, values]);

  const setFieldValue = useCallback((field: string, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const setFieldError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const validateField = useCallback((field: string): boolean => {
    if (!validate) return true;
    
    const validationErrors = validate(values);
    const fieldError = validationErrors[field];
    
    if (fieldError) {
      setErrors(prev => ({ ...prev, [field]: fieldError }));
      return false;
    } else {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
      return true;
    }
  }, [validate, values]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);
      
      if (Object.keys(validationErrors).length > 0) {
        // 标记所有字段为已触碰
        const allTouched: Record<string, boolean> = {};
        Object.keys(values).forEach(key => {
          allTouched[key] = true;
        });
        setTouched(allTouched);
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit?.(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, values, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    reset,
    validateField
  };
}

// ============================================================================
// 防抖 & 节流 Hooks
// ============================================================================

/**
 * 防抖 Hook
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖回调 Hook
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    ((...args: any[]) => {
      const handler = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
      
      return () => clearTimeout(handler);
    }) as T,
    [delay]
  );

  return debouncedCallback;
}

/**
 * 节流 Hook
 */
export function useThrottle<T>(value: T, limit: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => clearTimeout(handler);
  }, [value, limit]);

  return throttledValue;
}

// ============================================================================
// 媒体查询 Hook
// ============================================================================

/**
 * 响应式断点 Hook
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'>('lg');

  useEffect(() => {
    const getBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) return 'xs';
      if (width < 768) return 'sm';
      if (width < 1024) return 'md';
      if (width < 1280) return 'lg';
      if (width < 1536) return 'xl';
      return 'xxl';
    };

    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    breakpoint,
    isXs: breakpoint === 'xs',
    isSm: breakpoint === 'sm',
    isMd: breakpoint === 'md',
    isLg: breakpoint === 'lg',
    isXl: breakpoint === 'xl',
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === 'xxl'
  };
}

/**
 * 移动端检测 Hook
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// ============================================================================
// 本地存储 Hook
// ============================================================================

/**
 * 本地存储 Hook
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// ============================================================================
// 设备信息 Hook
// ============================================================================

/**
 * 设备信息 Hook
 */
export function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isIOS: false,
    isAndroid: false,
    isWechat: false,
    isChrome: false,
    isSafari: false,
    isFirefox: false,
    isEdge: false
  });

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    setDeviceInfo({
      isMobile: /mobile|android|iphone|ipad|ipod/i.test(userAgent),
      isTablet: /tablet|ipad/i.test(userAgent),
      isDesktop: !/mobile|android|iphone|ipad|ipod/i.test(userAgent),
      isIOS: /iphone|ipad|ipod/i.test(userAgent),
      isAndroid: /android/i.test(userAgent),
      isWechat: /micromessenger/i.test(userAgent),
      isChrome: /chrome/i.test(userAgent) && !/edge/i.test(userAgent),
      isSafari: /safari/i.test(userAgent) && !/chrome/i.test(userAgent),
      isFirefox: /firefox/i.test(userAgent),
      isEdge: /edge/i.test(userAgent)
    });
  }, []);

  return deviceInfo;
}

// ============================================================================
// 滚动位置 Hook
// ============================================================================

/**
 * 滚动位置 Hook
 */
export function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState({
    x: 0,
    y: 0,
    isScrolled: false,
    isAtTop: true,
    isAtBottom: false
  });

  useEffect(() => {
    const handleScroll = () => {
      const { scrollX, scrollY } = window;
      const isScrolled = scrollY > 0;
      const isAtTop = scrollY < 100;
      const isAtBottom = scrollY + window.innerHeight >= document.documentElement.scrollHeight - 100;

      setScrollPosition({ x: scrollX, y: scrollY, isScrolled, isAtTop, isAtBottom });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollPosition;
}

// ============================================================================
// 复制到剪贴板 Hook
// ============================================================================

/**
 * 复制到剪贴板 Hook
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);
      
      setTimeout(() => setCopied(false), 2000);
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('复制失败');
      setError(error);
      setCopied(false);
      
      return false;
    }
  }, []);

  return { copy, copied, error };
}

// ============================================================================
// 倒计时 Hook
// ============================================================================

interface UseCountdownOptions {
  autoStart?: boolean;
  onComplete?: () => void;
}

/**
 * 倒计时 Hook
 */
export function useCountdown(
  seconds: number,
  options: UseCountdownOptions = {}
): {
  count: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
} {
  const { autoStart = false, onComplete } = options;
  
  const [count, setCount] = useState(seconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && count > 0) {
      intervalRef.current = setInterval(() => {
        setCount(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, count, onComplete]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setCount(seconds);
    setIsRunning(false);
  }, [seconds]);

  return { count, isRunning, start, pause, reset };
}

// ============================================================================
// 导出
// ============================================================================

export default {
  useAsync,
  usePagination,
  useForm,
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useBreakpoint,
  useIsMobile,
  useLocalStorage,
  useDeviceInfo,
  useScrollPosition,
  useCopyToClipboard,
  useCountdown
};
