/**
 * 性能监控面板 - 开发环境调试工具
 * 显示 Core Web Vitals 指标
 */

import React, { useEffect, useState } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { 
  getPerformanceMetrics, 
  getMetricRating, 
  formatMetricValue,
  performanceMonitor,
  PerformanceMetrics 
} from '@/utils/performance';

interface PerformancePanelProps {
  /** 是否默认展开 */
  defaultOpen?: boolean;
  /** 是否在生产环境显示 */
  showInProd?: boolean;
}

export default function PerformancePanel({ 
  defaultOpen = false,
  showInProd = false 
}: PerformancePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    // 开发环境才启用
    if (!import.meta.env.DEV && !showInProd) return;

    // 启动监控
    performanceMonitor.start();

    // 收集指标
    performanceMonitor.onReport((m) => {
      setMetrics(m);
    });

    return () => {
      performanceMonitor.stop();
    };
  }, [showInProd]);

  if (!import.meta.env.DEV && !showInProd) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-3 py-2 rounded-full shadow-lg hover:bg-gray-800 transition-colors text-sm"
        title="查看性能指标"
      >
        性能
      </button>
    );
  }

  const getRatingIcon = (rating: 'good' | 'needs-improvement' | 'poor') => {
    switch (rating) {
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'needs-improvement':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getRatingColor = (rating: 'good' | 'needs-improvement' | 'poor') => {
    switch (rating) {
      case 'good':
        return 'bg-green-50 border-green-200';
      case 'needs-improvement':
        return 'bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'bg-red-50 border-red-200';
    }
  };

  const metricsList = metrics ? [
    { name: 'LCP', label: '最大内容绘制', value: metrics.largestContentfulPaint },
    { name: 'FID', label: '首次输入延迟', value: metrics.firstInputDelay },
    { name: 'CLS', label: '累积布局偏移', value: metrics.cumulativeLayoutShift },
    { name: 'FCP', label: '首内容绘制', value: metrics.firstContentfulPaint },
    { name: 'TTI', label: '可交互时间', value: metrics.pageLoadTime },
    { name: 'DOM', label: 'DOM 完全加载', value: metrics.domComplete },
  ] : [];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span className="font-medium">性能指标</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              performanceMonitor.stop();
              performanceMonitor.start();
              setMetrics(null);
            }}
            className="p-1 hover:bg-gray-700 rounded"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 评分 */}
      {metrics && (
        <div className={`px-4 py-3 border-b ${getRatingColor(
          metrics.score >= 90 ? 'good' : metrics.score >= 50 ? 'needs-improvement' : 'poor'
        )}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">性能评分</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${
                metrics.score >= 90 ? 'text-green-600' : 
                metrics.score >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metrics.score}
              </span>
              <span className="text-sm text-gray-500">/100</span>
            </div>
          </div>
        </div>
      )}

      {/* 指标列表 */}
      <div className="max-h-80 overflow-y-auto">
        {metricsList.map((metric) => {
          const rating = getMetricRating(metric.name, metric.value);
          return (
            <div
              key={metric.name}
              className={`px-4 py-2 border-b border-gray-100 flex items-center justify-between ${getRatingColor(rating)}`}
            >
              <div className="flex items-center gap-2">
                {getRatingIcon(rating)}
                <div>
                  <div className="text-sm font-medium text-gray-700">{metric.label}</div>
                  <div className="text-xs text-gray-500">{metric.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  rating === 'good' ? 'text-green-600' : 
                  rating === 'needs-improvement' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {formatMetricValue(metric.name, metric.value)}
                </div>
              </div>
            </div>
          );
        })}

        {!metrics && (
          <div className="px-4 py-8 text-center text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
            <div className="text-sm">加载中...</div>
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 text-center">
        {import.meta.env.DEV ? '开发环境' : '生产环境'}
      </div>
    </div>
  );
}
