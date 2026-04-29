// ============================================================================
// 统一订单 Hook - 共用层
// Web端、后台都可用
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { unifiedOrderApi } from '@/shared/services/unifiedOrderApi'
import type { UnifiedOrder, OrderFilters, OrderStatistics } from '@/shared/types/unifiedOrder'

interface UseUnifiedOrdersOptions {
  filters?: OrderFilters
  autoLoad?: boolean
}

interface UseUnifiedOrdersResult {
  orders: UnifiedOrder[]
  statistics: OrderStatistics | null
  currentOrder: UnifiedOrder | null
  total: number
  loading: boolean
  error: Error | null
  hasMore: boolean
  page: number
  
  // 方法
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  setFilters: (filters: OrderFilters) => void
  getDetail: (orderId: string) => Promise<UnifiedOrder | null>
  loadStatistics: (params?: { startDate?: string; endDate?: string }) => Promise<void>
  cancelOrder: (orderId: string) => Promise<boolean>
  refundOrder: (orderId: string, reason?: string) => Promise<boolean>
}

export function useUnifiedOrders(options: UseUnifiedOrdersOptions = {}): UseUnifiedOrdersResult {
  const { filters = {}, autoLoad = true } = options
  
  const [orders, setOrders] = useState<UnifiedOrder[]>([])
  const [statistics, setStatistics] = useState<OrderStatistics | null>(null)
  const [currentOrder, setCurrentOrder] = useState<UnifiedOrder | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<OrderFilters>(filters)
  
  // 加载订单列表
  const loadOrders = useCallback(async (pageNum: number, append = false) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await unifiedOrderApi.getList({
        ...currentFilters,
        page: pageNum,
        pageSize: currentFilters.pageSize || 10
      })
      
      if (append) {
        setOrders(prev => [...prev, ...result.orders])
      } else {
        setOrders(result.orders)
      }
      
      setTotal(result.total)
      setHasMore(result.hasMore)
      setPage(pageNum)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [currentFilters])
  
  // 初始加载
  useEffect(() => {
    if (autoLoad) {
      loadOrders(1)
    }
  }, [autoLoad, loadOrders])
  
  // 加载更多
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await loadOrders(page + 1, true)
  }, [hasMore, loading, page, loadOrders])
  
  // 刷新
  const refresh = useCallback(async () => {
    setPage(1)
    await loadOrders(1)
  }, [loadOrders])
  
  // 设置筛选条件
  const setFilters = useCallback((newFilters: OrderFilters) => {
    setCurrentFilters(newFilters)
    setPage(1)
  }, [])
  
  // 获取订单详情
  const getDetail = useCallback(async (orderId: string): Promise<UnifiedOrder | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const order = await unifiedOrderApi.getDetail(orderId)
      setCurrentOrder(order)
      return order
    } catch (err) {
      setError(err as Error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 加载统计数据
  const loadStatistics = useCallback(async (params?: { startDate?: string; endDate?: string }) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await unifiedOrderApi.getStatistics(params)
      setStatistics(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 取消订单
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      await unifiedOrderApi.cancelOrder(orderId)
      
      // 更新本地状态
      setOrders(prev => prev.map(o => {
        if (o._id === orderId) {
          return { ...o, status: 'cancelled' as const }
        }
        return o
      }))
      
      return true
    } catch (err) {
      setError(err as Error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 退款
  const refundOrder = useCallback(async (orderId: string, reason?: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      await unifiedOrderApi.refundOrder(orderId, reason)
      
      // 更新本地状态
      setOrders(prev => prev.map(o => {
        if (o._id === orderId) {
          return { ...o, status: 'refunded' as const }
        }
        return o
      }))
      
      return true
    } catch (err) {
      setError(err as Error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])
  
  return {
    orders,
    statistics,
    currentOrder,
    total,
    loading,
    error,
    hasMore,
    page,
    loadMore,
    refresh,
    setFilters,
    getDetail,
    loadStatistics,
    cancelOrder,
    refundOrder
  }
}
