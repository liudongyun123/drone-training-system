/**
 * 响应式布局自定义 Hooks
 */

import { useState, useEffect, useCallback } from 'react';

// 断点定义（与 Tailwind 一致）
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * 获取当前视口尺寸
 */
export const useViewport = () => {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return size;
};

/**
 * 检查是否匹配断点
 */
export const useBreakpoint = (breakpoint: Breakpoint) => {
  const { width } = useViewport();
  return width >= BREAKPOINTS[breakpoint];
};

/**
 * 检查是否在断点范围内
 */
export const useBreakpointBetween = (min: Breakpoint, max: Breakpoint) => {
  const { width } = useViewport();
  return width >= BREAKPOINTS[min] && width < BREAKPOINTS[max];
};

/**
 * 响应式状态 Hook
 * 提供各类设备类型的判断
 */
export const useResponsive = () => {
  const { width } = useViewport();

  return {
    // 断点判断
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isLargeDesktop: width >= BREAKPOINTS.xl,

    // 断点函数
    up: useCallback((bp: Breakpoint) => width >= BREAKPOINTS[bp], [width]),
    down: useCallback((bp: Breakpoint) => width < BREAKPOINTS[bp], [width]),
    between: useCallback(
      (min: Breakpoint, max: Breakpoint) =>
        width >= BREAKPOINTS[min] && width < BREAKPOINTS[max],
      [width]
    ),

    // 当前断点
    breakpoint:
      width < BREAKPOINTS.sm
        ? 'xs'
        : width < BREAKPOINTS.md
        ? 'sm'
        : width < BREAKPOINTS.lg
        ? 'md'
        : width < BREAKPOINTS.xl
        ? 'lg'
        : width < BREAKPOINTS['2xl']
        ? 'xl'
        : '2xl',

    // 宽度
    width,
  };
};

/**
 * 检测设备类型
 */
export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isTouch, setIsTouch] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent.toLowerCase();

      // 设备类型
      if (width < BREAKPOINTS.md) {
        setDeviceType('mobile');
      } else if (width < BREAKPOINTS.lg) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }

      // 触摸设备
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);

      // iOS
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));

      // Android
      setIsAndroid(/android/.test(userAgent));
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return {
    deviceType,
    isTouch,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isIOS,
    isAndroid,
  };
};

/**
 * 方向检测
 */
export const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    if (typeof window === 'undefined') return 'portrait';
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
  };
};

/**
 * 滚动位置检测
 */
export const useScrollPosition = () => {
  const [scrollY, setScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    let lastScrollY = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;

      setScrollY(currentScrollY);
      setScrollDirection(currentScrollY > lastScrollY ? 'down' : 'up');
      setIsAtTop(currentScrollY < 10);
      setIsAtBottom(currentScrollY + winHeight >= docHeight - 10);

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return {
    scrollY,
    scrollDirection,
    isAtTop,
    isAtBottom,
    scrollProgress:
      typeof window !== 'undefined'
        ? scrollY / (document.documentElement.scrollHeight - window.innerHeight)
        : 0,
  };
};

/**
 * 安全区域 Hook（用于 iPhone 刘海屏等）
 */
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    // 检查是否支持 env()
    const checkSafeArea = () => {
      const styles = getComputedStyle(document.documentElement);
      const top = parseInt(styles.getPropertyValue('--sat') || '0', 10);
      const bottom = parseInt(styles.getPropertyValue('--sab') || '0', 10);
      const left = parseInt(styles.getPropertyValue('--sal') || '0', 10);
      const right = parseInt(styles.getPropertyValue('--sar') || '0', 10);

      setSafeArea({ top, bottom, left, right });
    };

    checkSafeArea();
  }, []);

  return {
    ...safeArea,
    insetTop: `env(safe-area-inset-top, ${safeArea.top}px)`,
    insetBottom: `env(safe-area-inset-bottom, ${safeArea.bottom}px)`,
    insetLeft: `env(safe-area-inset-left, ${safeArea.left}px)`,
    insetRight: `env(safe-area-inset-right, ${safeArea.right}px)`,
  };
};

export default useResponsive;
