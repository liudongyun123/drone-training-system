/**
 * 性能监控面板
 * 
 * 特性：
 * - 实时性能指标显示
 * - API调用统计
 * - 缓存命中率
 * - 慢查询警告
 */

import { useEffect, useState, useCallback } from 'react'
import { serviceCache, perfMonitor, CacheItem } from './BaseService'
import { apiRateLimiter } from './ApiClient'

// ============================================================================
// 性能指标Hook
// ============================================================================

interface PerformanceMetrics {
  apiCalls: {
    total: number
    success: number
    errors: number
    avgDuration: number
    slowestCall: { method: string; endpoint: string; duration: number } | null
  }
  cache: {
    hits: number
    misses: number
    size: number
    hitRate: number
  }
  rateLimit: {
    remaining: number
    maxRequests: number
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  network: {
    online: boolean
    effectiveType: string
    downlink: number
  }
}

export function usePerformanceMetrics(): {
  metrics: PerformanceMetrics
  refresh: () => void
  clearCache: () => void
} {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    apiCalls: { total: 0, success: 0, errors: 0, avgDuration: 0, slowestCall: null },
    cache: { hits: 0, misses: 0, size: 0, hitRate: 0 },
    rateLimit: { remaining: 100, maxRequests: 100 },
    memory: { used: 0, total: 0, percentage: 0 },
    network: { online: true, effectiveType: 'unknown', downlink: 0 }
  })

  const refresh = useCallback(() => {
    // API调用统计
    const apiStats = perfMonitor.getStats()
    const slowQueries = perfMonitor.getSlowQueries()
    
    // 缓存统计（通过内部计数器）
    const cacheInfo = getCacheStats()
    
    // 限流统计
    const rateLimitInfo = {
      remaining: apiRateLimiter.getRemaining('default'),
      maxRequests: 100
    }
    
    // 内存信息（如果支持）
    const memoryInfo = getMemoryInfo()
    
    // 网络信息
    const networkInfo = getNetworkInfo()
    
    setMetrics({
      apiCalls: {
        total: apiStats.totalCalls,
        success: apiStats.totalCalls - Math.floor(apiStats.totalCalls * apiStats.errorRate),
        errors: Math.floor(apiStats.totalCalls * apiStats.errorRate),
        avgDuration: apiStats.avgDuration,
        slowestCall: slowQueries.length > 0 ? {
          method: slowQueries[0].method,
          endpoint: slowQueries[0].endpoint,
          duration: slowQueries[0].duration
        } : null
      },
      cache: cacheInfo,
      rateLimit: rateLimitInfo,
      memory: memoryInfo,
      network: networkInfo
    })
  }, [])

  const clearCache = useCallback(() => {
    serviceCache.clear()
    refresh()
  }, [refresh])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  return { metrics, refresh, clearCache }
}

// ============================================================================
// 工具函数
// ============================================================================

function getCacheStats() {
  // 由于缓存实现是内部的，这里提供估算
  // 实际应该暴露缓存命中/未命中计数器
  return {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0
  }
}

function getMemoryInfo() {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
    }
  }
  return { used: 0, total: 0, percentage: 0 }
}

function getNetworkInfo() {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  
  if (connection) {
    return {
      online: navigator.onLine,
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0
    }
  }
  
  return {
    online: navigator.onLine,
    effectiveType: 'unknown',
    downlink: 0
  }
}

// ============================================================================
// 性能监控面板组件
// ============================================================================

interface PerformanceMonitorProps {
  enabled?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  expanded?: boolean
}

export function PerformanceMonitor({ 
  enabled = true,
  position = 'bottom-right',
  expanded = false
}: PerformanceMonitorProps) {
  const { metrics, refresh, clearCache } = usePerformanceMetrics()
  const [isExpanded, setIsExpanded] = useState(expanded)
  const [isVisible, setIsVisible] = useState(enabled)

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 w-10 h-10 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors z-50"
      >
        ⚡
      </button>
    )
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  return (
    <div 
      className={`fixed ${positionClasses[position]} bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700 text-white text-xs font-mono z-50 transition-all ${
        isExpanded ? 'w-80' : 'w-48'
      }`}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-2 border-b border-gray-700 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">⚡</span>
          <span className="text-gray-300">性能监控</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); refresh(); }}
            className="p-1 hover:bg-gray-700 rounded"
            title="刷新"
          >
            🔄
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
            className="p-1 hover:bg-gray-700 rounded"
            title="关闭"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* API调用 */}
        <div>
          <div className="text-gray-400 mb-1">API 调用</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-500">总数</div>
              <div className="text-lg text-blue-400">{metrics.apiCalls.total}</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-500">平均</div>
              <div className="text-lg text-green-400">{metrics.apiCalls.avgDuration.toFixed(0)}ms</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-500">成功</div>
              <div className="text-lg text-emerald-400">{metrics.apiCalls.success}</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-500">错误</div>
              <div className="text-lg text-red-400">{metrics.apiCalls.errors}</div>
            </div>
          </div>
        </div>

        {/* 展开详情 */}
        {isExpanded && (
          <>
            {/* 缓存 */}
            <div>
              <div className="text-gray-400 mb-1">缓存</div>
              <div className="bg-gray-800 rounded p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">命中率</span>
                  <span className="text-cyan-400">{metrics.cache.hitRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">条目数</span>
                  <span className="text-gray-300">{metrics.cache.size}</span>
                </div>
                <button
                  onClick={clearCache}
                  className="w-full mt-1 py-1 bg-red-900/50 hover:bg-red-800/50 rounded text-red-400 text-center"
                >
                  清除缓存
                </button>
              </div>
            </div>

            {/* 限流 */}
            <div>
              <div className="text-gray-400 mb-1">API限流</div>
              <div className="bg-gray-800 rounded p-2">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">剩余</span>
                  <span className={metrics.rateLimit.remaining < 20 ? 'text-red-400' : 'text-green-400'}>
                    {metrics.rateLimit.remaining}/{metrics.rateLimit.maxRequests}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      metrics.rateLimit.remaining < 20 ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics.rateLimit.remaining}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 内存 */}
            <div>
              <div className="text-gray-400 mb-1">内存</div>
              <div className="bg-gray-800 rounded p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">使用</span>
                  <span className={metrics.memory.percentage > 80 ? 'text-red-400' : 'text-gray-300'}>
                    {metrics.memory.used}MB / {metrics.memory.total}MB
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      metrics.memory.percentage > 80 ? 'bg-red-500' : 
                      metrics.memory.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics.memory.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 网络 */}
            <div>
              <div className="text-gray-400 mb-1">网络</div>
              <div className="bg-gray-800 rounded p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">状态</span>
                  <span className={metrics.network.online ? 'text-green-400' : 'text-red-400'}>
                    {metrics.network.online ? '在线' : '离线'}
                  </span>
                </div>
                {metrics.network.effectiveType !== 'unknown' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">类型</span>
                    <span className="text-blue-400">{metrics.network.effectiveType}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 慢查询警告 */}
            {metrics.apiCalls.slowestCall && (
              <div className="bg-red-900/30 border border-red-800 rounded p-2">
                <div className="text-red-400 font-bold mb-1">⚠️ 慢查询</div>
                <div className="text-red-300">
                  {metrics.apiCalls.slowestCall.method} {metrics.apiCalls.slowestCall.endpoint}
                </div>
                <div className="text-red-200 text-right">
                  {metrics.apiCalls.slowestCall.duration.toFixed(0)}ms
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default PerformanceMonitor
