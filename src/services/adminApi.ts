import type { ApiResponse, Course } from '@/types';

// 云函数名称
const CLOUD_FUNCTION_NAME = 'admin-http';

// 环境ID
const ENV_ID = 'rcwljy-5ghmq2ex26764978';

// Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_PUBLISHABLE_KEY || '';

/**
 * 直接 HTTP 调用云函数 - 完全绕过 SDK
 */
async function httpCallFunction<T = any>(params: {
  action: 'list' | 'get' | 'add' | 'update' | 'delete' | 'batchDelete' | 'count';
  collection: string;
  data?: Record<string, any>;
  query?: Record<string, any>;
  docId?: string;
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    field?: Record<string, boolean>;
  };
}): Promise<ApiResponse<T>> {
  // 使用正确的环境域名
  const url = `https://${ENV_ID}.ap-shanghai.tcb-api.tencentcloudapi.com/${CLOUD_FUNCTION_NAME}`;
  
  console.log(`[adminApi] HTTP调用: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CloudBase-Environment': ENV_ID,
        'X-CloudBase-PublishableKey': PUBLISHABLE_KEY,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result && result.code === 0) {
      return {
        success: true,
        data: result.data,
        message: result.message
      };
    } else if (result && result.code !== 0) {
      return {
        success: false,
        data: undefined as T | undefined,
        message: result.message || '操作失败'
      };
    }

    throw new Error(`请求失败: ${JSON.stringify(result)}`);
  } catch (error: any) {
    console.error('[adminApi] 请求异常:', error);
    return {
      success: false,
      data: undefined as T | undefined,
      message: error.message || '网络请求失败'
    };
  }
}

async function callFunction<T = any>(params: {
  action: 'list' | 'get' | 'add' | 'update' | 'delete' | 'batchDelete' | 'count';
  collection: string;
  data?: Record<string, any>;
  query?: Record<string, any>;
  docId?: string;
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    field?: Record<string, boolean>;
  };
}): Promise<ApiResponse<T>> {
  return httpCallFunction<T>(params);
}

// 课程管理 API
export const courseApi = {
  getList: (options?: { limit?: number; offset?: number; search?: string }) => 
    callFunction<Course[]>({
      action: 'list',
      collection: 'courses',
      options
    }),

  getById: (docId: string) => 
    callFunction<Course>({
      action: 'get',
      collection: 'courses',
      docId
    }),

  add: (data: Partial<Course>) => 
    callFunction({
      action: 'add',
      collection: 'courses',
      data
    }),

  update: (docId: string, data: Partial<Course>) => 
    callFunction({
      action: 'update',
      collection: 'courses',
      docId,
      data
    }),

  delete: (docId: string) => 
    callFunction({
      action: 'delete',
      collection: 'courses',
      docId
    }),

  batchDelete: (docIds: string[]) => 
    callFunction({
      action: 'batchDelete',
      collection: 'courses',
      data: { ids: docIds }
    }),

  count: (search?: string) => 
    callFunction<number>({
      action: 'count',
      collection: 'courses',
      query: search ? { title: { $regex: search } } : undefined
    }),
};

// 用户管理 API
export const userApi = {
  getList: (options?: { limit?: number; offset?: number }) => 
    callFunction({
      action: 'list',
      collection: 'users',
      options
    }),

  getById: (docId: string) => 
    callFunction({
      action: 'get',
      collection: 'users',
      docId
    }),

  update: (docId: string, data: any) => 
    callFunction({
      action: 'update',
      collection: 'users',
      docId,
      data
    }),

  delete: (docId: string) => 
    callFunction({
      action: 'delete',
      collection: 'users',
      docId
    }),
};
