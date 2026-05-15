/**
 * 管理后台 API 服务 v2.0
 * 版本: v20260515-unified
 * 统一使用 CloudDBService (HTTP → db-init)
 */
import { CloudDBService } from './CloudDBService'
import type { ApiResponse, Course } from '@/types'

export const courseApi = {
  getList: (options?: { limit?: number; offset?: number; search?: string }) => 
    CloudDBService.query<Course>('courses', {
      where: options?.search ? { title: { $regex: options.search } } : {},
      orderBy: 'createdAt',
      order: 'desc',
      skip: options?.offset || 0,
      limit: options?.limit || 20
    }).then(result => ({ success: true, data: result.data })),

  getById: (docId: string) => 
    CloudDBService.get<Course>('courses', docId).then(data => ({ success: true, data })),

  add: (data: Partial<Course>) => 
    CloudDBService.add('courses', data).then(result => ({ success: true, data: result })),

  update: (docId: string, data: Partial<Course>) => 
    CloudDBService.update('courses', docId, data).then(() => ({ success: true })),

  delete: (docId: string) => 
    CloudDBService.delete('courses', docId).then(() => ({ success: true })),

  count: (search?: string) => 
    CloudDBService.count('courses', search ? { title: { $regex: search } } : {}).then(total => ({ success: true, data: total })),
}

export const userApi = {
  getList: (options?: { limit?: number; offset?: number }) => 
    CloudDBService.query('users', {
      orderBy: 'createdAt',
      order: 'desc',
      skip: options?.offset || 0,
      limit: options?.limit || 20
    }).then(result => ({ success: true, data: result.data })),

  getById: (docId: string) => 
    CloudDBService.get('users', docId).then(data => ({ success: true, data })),

  update: (docId: string, data: any) => 
    CloudDBService.update('users', docId, data).then(() => ({ success: true })),

  delete: (docId: string) => 
    CloudDBService.delete('users', docId).then(() => ({ success: true })),
}

export default { courseApi, userApi }
