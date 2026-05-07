// ============================================================================
// 共用类型 - 统一导出
// 所有端 import { Course, Order, User } from '@/shared/types'
// ============================================================================

export * from './common'        // 通用类型（分页、响应、学习进度等）
export * from './course'
export * from './order'
export * from './user'
export * from './class'         // 培训班 + 报名
export * from './shop'          // 商城
// @ts-ignore
export * from './unifiedOrder'  // 统一订单
