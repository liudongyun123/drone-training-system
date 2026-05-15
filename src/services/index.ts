/**
 * 服务层统一导出
 */

// 统一数据访问服务（所有端通用）
export { CloudDBService, db, type QueryOptions, type ListResponse, type DBResponse } from './CloudDBService'

// 认证服务
export { authService, LoginMethod, type AuthUser } from './authService'
export { useAuthStore, type User, type UserRole } from '../store/authStore'

// 原有服务
export * from './cloudBaseService'
export * from './database'
export * from './adminAuthService'
export * from './adminService'

// 业务服务
export * from './cart'
// coupon 和 groupBuy 在 database.ts 中已有导出，这里使用显式导出避免重复
export { couponService as couponServiceFromCoupon } from './coupon'
// @ts-ignore
export * from './enrollmentService'
export * from './flashSale'
export { groupBuyService as groupBuyServiceFromGroupBuy } from './groupBuy'
// @ts-ignore
export * from './marketing'
export * from './progress'

// teacherService 在 database.ts 中已有导出
export { teacherService as teacherServiceFromTeacher } from './teacherService'
export * from './membersService'

// 报名服务（新增）
export { registrationService } from './registrationService'

// 班级管理 v2.0（重构）
export { default as classService } from './classService'

// 章节服务
export { ChapterService } from './ChapterService'

// Feature API 服务（新云函数）
export { featureApi, adminUserApi, adminOrderApi, adminLearningApi } from './featureApi'
