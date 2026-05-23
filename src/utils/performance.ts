/**
 * 性能监控工具 - 生产环境优化
 * 监控页面性能指标、LCP、FID、CLS 等核心 Web Vitals
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface PerformanceMetrics {
  // 页面加载时间
  pageLoadTime: number;
  // 首屏渲染时间
  firstPaint: number;
  // 首内容绘制时间
  firstContentfulPaint: number;
  // 最大内容绘制时间
  largestContentfulPaint: number;
  // 首次输入延迟
  firstInputDelay: number;
  // 累积布局偏移
  cumulativeLayoutShift: number;
  // DOM 完全加载时间
  domContentLoaded: number;
  // DOM 完全加载时间（包括资源）
  domComplete: number;
  // 页面完全加载时间
  loadComplete: number;
  // JS 堆大小
  jsHeapSize: number;
  // 用户感知性能评分 (0-100)
  score: number;
}

interface MetricEntry {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

// ============================================================================
// 性能指标计算
// ============================================================================

/**
 * 获取 Performance 指标
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');
  
  // 首屏渲染时间
  const firstPaint = paint.find((p) => p.name === 'first-paint')?.startTime || 0;
  
  // 首内容绘制时间
  const firstContentfulPaint = paint.find((p) => p.name === 'first-contentful-paint')?.startTime || 0;
  
  // 最大内容绘制时间
  const lcpEntry = performance.getEntriesByType('largest-contentful-paint')[0] as LargestContentfulPaint;
  const largestContentfulPaint = lcpEntry?.startTime || 0;
  
  // 首次输入延迟
  const fidEntry = performance.getEntriesByType('first-input')[0] as PerformanceEventTiming;
  const firstInputDelay = fidEntry?.processingStart - fidEntry?.startTime || 0;
  
  // 累积布局偏移
  const clsEntry = (performance as any).getEntriesByType('layout-shift') as LayoutShift[];
  const cumulativeLayoutShift = clsEntry?.reduce((sum, entry) => sum + entry.value, 0) || 0;
  
  // 页面加载时间
  const pageLoadTime = timing?.loadEventEnd - timing?.startTime || 0;
  const domContentLoaded = timing?.domContentLoadedEventEnd - timing?.startTime || 0;
  const domComplete = timing?.domComplete - timing?.startTime || 0;
  const loadComplete = timing?.loadEventEnd - timing?.startTime || 0;
  
  // JS 堆大小
  const jsHeapSize = (performance as any).memory?.usedJSHeapSize || 0;
  
  // 计算评分
  const score = calculateScore([
    { name: 'LCP', value: largestContentfulPaint },
    { name: 'FID', value: firstInputDelay },
    { name: 'CLS', value: cumulativeLayoutShift },
    { name: 'FCP', value: firstContentfulPaint },
    { name: 'TTI', value: pageLoadTime },
  ]);

  return {
    pageLoadTime,
    firstPaint,
    firstContentfulPaint,
    largestContentfulPaint,
    firstInputDelay,
    cumulativeLayoutShift,
    domContentLoaded,
    domComplete,
    loadComplete,
    jsHeapSize,
    score,
  };
}

/**
 * 计算性能评分
 */
function calculateScore(metrics: { name: string; value: number }[]): number {
  const weights = {
    LCP: 0.3,
    FID: 0.2,
    CLS: 0.2,
    FCP: 0.15,
    TTI: 0.15,
  };

  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTI: { good: 3800, poor: 7300 },
  };

  let totalScore = 0;

  metrics.forEach((metric) => {
    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (!threshold) return;

    let score: number;
    if (metric.value <= threshold.good) {
      score = 100;
    } else if (metric.value <= threshold.poor) {
      score = 50;
    } else {
      score = 0;
    }

    totalScore += score * (weights[metric.name as keyof typeof weights] || 0.2);
  });

  return Math.round(totalScore);
}

/**
 * 获取指标评分
 */
export function getMetricRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, { good: number; poor: number }> = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 },
    INP: { good: 200, poor: 500 },
  };

  const threshold = thresholds[name];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * 格式化指标值
 */
export function formatMetricValue(name: string, value: number): string {
  if (name === 'CLS') {
    return value.toFixed(3);
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }
  return `${Math.round(value)}ms`;
}

// ============================================================================
// 性能观察器
// ============================================================================

type PerformanceCallback = (metrics: PerformanceMetrics) => void;

class PerformanceMonitor {
  private callbacks: PerformanceCallback[] = [];
  private observers: PerformanceObserver[] = [];
  private metrics: Partial<PerformanceMetrics> = {};

  /**
   * 开始监控
   */
  start(): void {
    // 监控 LCP
    this.observe('largest-contentful-paint', (entries) => {
      const entry = entries[entries.length - 1] as LargestContentfulPaint;
      this.metrics.largestContentfulPaint = entry.startTime;
    });

    // 监控 FID
    this.observe('first-input', (entries) => {
      const entry = entries[0] as PerformanceEventTiming;
      const fid = entry.processingStart - entry.startTime;
      this.metrics.firstInputDelay = fid;
    });

    // 监控 CLS
    this.observe('layout-shift', (entries) => {
      const cls = entries.reduce((sum, entry) => sum + (entry as LayoutShift).value, 0);
      this.metrics.cumulativeLayoutShift = cls;
    });

    // 页面加载完成后报告
    window.addEventListener('load', () => {
      setTimeout(() => {
        const fullMetrics = this.getMetrics();
        this.callbacks.forEach((cb) => cb(fullMetrics));
        
        // 生产环境输出到控制台
        if (import.meta.env.PROD) {
          console.log('[Performance]', fullMetrics);
        }
      }, 0);
    });
  }

  /**
   * 添加观察器
   */
  private observe(entryType: string, callback: (entries: PerformanceEntryList) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type: entryType, buffered: true });
      this.observers.push(observer);
    } catch {
      // 不支持的观察类型
    }
  }

  /**
   * 获取指标
   */
  getMetrics(): PerformanceMetrics {
    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      pageLoadTime: this.metrics.pageLoadTime || 0,
      firstPaint: this.metrics.firstPaint || 0,
      firstContentfulPaint: this.metrics.firstContentfulPaint || 0,
      largestContentfulPaint: this.metrics.largestContentfulPaint || 0,
      firstInputDelay: this.metrics.firstInputDelay || 0,
      cumulativeLayoutShift: this.metrics.cumulativeLayoutShift || 0,
      domContentLoaded: timing?.domContentLoadedEventEnd - timing?.startTime || 0,
      domComplete: timing?.domComplete - timing?.startTime || 0,
      loadComplete: timing?.loadEventEnd - timing?.startTime || 0,
      jsHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
      score: 0,
    };
  }

  /**
   * 添加回调
   */
  onReport(callback: PerformanceCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * 停止监控
   */
  stop(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor();

// 自动启动（开发环境禁用）
if (import.meta.env.DEV) {
  // 开发环境手动启用：performanceMonitor.start()
}

export default performanceMonitor;
