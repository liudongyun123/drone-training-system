// ============================================================================
// 商城商品 Hook - 共用层
// Web端、后台都可用
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { productApi, categoryApi } from '@/shared/services/shopApi'
import type { Product, ProductCategory } from '@/shared/types/shop'

interface ProductFilters {
  categoryId?: string
  status?: Product['status']
  keyword?: string
  page?: number
  pageSize?: number
}

interface UseShopProductsOptions {
  filters?: ProductFilters
  autoLoad?: boolean
}

interface UseShopProductsResult {
  products: Product[]
  categories: ProductCategory[]
  featuredProducts: Product[]
  currentProduct: Product | null
  total: number
  loading: boolean
  error: Error | null
  hasMore: boolean
  page: number
  
  // 方法
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  setFilters: (filters: ProductFilters) => void
  getDetail: (productId: string) => Promise<Product | null>
  loadFeatured: (limit?: number) => Promise<void>
  loadCategories: () => Promise<void>
}

export function useShopProducts(options: UseShopProductsOptions = {}): UseShopProductsResult {
  const { filters = {}, autoLoad = true } = options
  
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<ProductFilters>(filters)
  
  // 加载商品列表
  const loadProducts = useCallback(async (pageNum: number, append = false) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await productApi.getList({
        ...currentFilters,
        page: pageNum,
        pageSize: currentFilters.pageSize || 10
      })
      
      if (append) {
        setProducts(prev => [...prev, ...result.products])
      } else {
        setProducts(result.products)
      }
      
      setTotal(result.total)
      setHasMore((pageNum * (currentFilters.pageSize || 10)) < result.total)
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
      loadProducts(1)
    }
  }, [autoLoad, loadProducts])
  
  // 加载更多
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await loadProducts(page + 1, true)
  }, [hasMore, loading, page, loadProducts])
  
  // 刷新
  const refresh = useCallback(async () => {
    setPage(1)
    await loadProducts(1)
  }, [loadProducts])
  
  // 设置筛选条件
  const setFilters = useCallback((newFilters: ProductFilters) => {
    setCurrentFilters(newFilters)
    setPage(1)
  }, [])
  
  // 获取商品详情
  const getDetail = useCallback(async (productId: string): Promise<Product | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const product = await productApi.getDetail(productId)
      setCurrentProduct(product)
      return product
    } catch (err) {
      setError(err as Error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 加载推荐商品
  const loadFeatured = useCallback(async (limit: number = 6) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await productApi.getFeatured(limit)
      setFeaturedProducts(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 加载分类
  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await categoryApi.getList()
      setCategories(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  return {
    products,
    categories,
    featuredProducts,
    currentProduct,
    total,
    loading,
    error,
    hasMore,
    page,
    loadMore,
    refresh,
    setFilters,
    getDetail,
    loadFeatured,
    loadCategories
  }
}
