/**
 * 通用数据变更 Hook
 * 处理增删改操作，提供加载状态和错误处理
 */

import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import app from '../config/tcb'
import { AppError, convertTcbError, getErrorMessage } from '../utils/errors'

export interface MutationOptions {
  onSuccess?: (data: any) => void
  onError?: (error: AppError) => void
}

export interface MutationResult<T> {
  loading: boolean
  error: string | null
  execute: (data: T) => Promise<any>
  reset: () => void
}

/**
 * 创建文档
 */
export function useAdd<T>(
  collectionName: string,
  options: MutationOptions = {}
): MutationResult<T> {
  const { isLoggedIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (data: T) => {
    if (!isLoggedIn) {
      setError('请先登录')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const db = app.database()
      const result = await db.collection(collectionName).add(data)

      if (result.code) {
        const appError = convertTcbError(result)
        setError(getErrorMessage(appError))
        console.error(`[useAdd] 添加到 ${collectionName} 失败:`, appError)
        options.onError?.(appError)
        return null
      }

      console.log(`[useAdd] 成功添加到 ${collectionName}:`, result.id)
      options.onSuccess?.(result)
      return result
    } catch (err: any) {
      const appError = convertTcbError(err)
      setError(getErrorMessage(appError))
      console.error(`[useAdd] 添加到 ${collectionName} 异常:`, err)
      options.onError?.(appError)
      return null
    } finally {
      setLoading(false)
    }
  }, [collectionName, isLoggedIn, options])

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return { loading, error, execute, reset }
}

/**
 * 更新文档
 */
export function useUpdate<T>(
  collectionName: string,
  options: MutationOptions = {}
): MutationResult<{ id: string; data: Partial<T> }> {
  const { isLoggedIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async ({ id, data }: { id: string; data: Partial<T> }) => {
    if (!isLoggedIn) {
      setError('请先登录')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const db = app.database()
      const result = await db.collection(collectionName).doc(id).update(data)

      if (result.code) {
        const appError = convertTcbError(result)
        setError(getErrorMessage(appError))
        console.error(`[useUpdate] 更新 ${collectionName}/${id} 失败:`, appError)
        options.onError?.(appError)
        return null
      }

      console.log(`[useUpdate] 成功更新 ${collectionName}/${id}`)
      options.onSuccess?.(result)
      return result
    } catch (err: any) {
      const appError = convertTcbError(err)
      setError(getErrorMessage(appError))
      console.error(`[useUpdate] 更新 ${collectionName}/${id} 异常:`, err)
      options.onError?.(appError)
      return null
    } finally {
      setLoading(false)
    }
  }, [collectionName, isLoggedIn, options])

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return { loading, error, execute, reset }
}

/**
 * 删除文档
 */
export function useDelete(
  collectionName: string,
  options: MutationOptions = {}
): MutationResult<string> {
  const { isLoggedIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (id: string) => {
    if (!isLoggedIn) {
      setError('请先登录')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const db = app.database()
      const result = await db.collection(collectionName).doc(id).remove()

      if (result.code) {
        const appError = convertTcbError(result)
        setError(getErrorMessage(appError))
        console.error(`[useDelete] 删除 ${collectionName}/${id} 失败:`, appError)
        options.onError?.(appError)
        return null
      }

      console.log(`[useDelete] 成功删除 ${collectionName}/${id}`)
      options.onSuccess?.(result)
      return result
    } catch (err: any) {
      const appError = convertTcbError(err)
      setError(getErrorMessage(appError))
      console.error(`[useDelete] 删除 ${collectionName}/${id} 异常:`, err)
      options.onError?.(appError)
      return null
    } finally {
      setLoading(false)
    }
  }, [collectionName, isLoggedIn, options])

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return { loading, error, execute, reset }
}
