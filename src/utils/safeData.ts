/**
 * 安全数据处理工具
 */

// ============================================================================
// CloudBase 响应处理
// ============================================================================

/**
 * 解析云函数列表响应
 * 支持多种返回格式，统一返回 { list, total } 对象：
 * - admin云函数: { code:0, data: [...], total:N }
 * - 原生SDK:    { list: [], requestId: "" }
 * - 直接数组:    [...]
 */
export function parseCloudFunctionListResponse(response: any, page?: number, pageSize?: number): { list: any[]; total: number } {
  if (!response) return { list: [], total: 0 };
  // 直接数组
  if (Array.isArray(response)) return { list: response, total: response.length };
  // admin云函数 handleList 返回格式: { code, data: [...], total }
  if (response.data) {
    const arr = Array.isArray(response.data) ? response.data : [];
    return {
      list: arr,
      total: typeof response.total === 'number' ? response.total : arr.length
    };
  }
  // 原生 SDK 返回格式
  if (response.list && Array.isArray(response.list)) {
    return {
      list: response.list,
      total: typeof response.total === 'number' ? response.total : response.list.length
    };
  }
  return { list: [], total: 0 };
}

// ============================================================================
// 列表数据安全获取
// ============================================================================

/**
 * 安全获取列表数据
 */
export function safeGetList(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.data) {
    return Array.isArray(data.data) ? data.data : [];
  }
  if (data.list) {
    return Array.isArray(data.list) ? data.list : [];
  }
  return [];
}

/**
 * 安全获取总数
 */
export function safeGetTotal(data: any): number {
  if (!data) return 0;
  if (typeof data === 'number') return data;
  if (typeof data.total === 'number') return data.total;
  if (typeof data.total_count === 'number') return data.total_count;
  if (Array.isArray(data)) return data.length;
  return 0;
}

/**
 * 安全获取嵌套属性
 */
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current ?? defaultValue;
}

/**
 * 安全解析 JSON
 */
export function safeJsonParse<T = any>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * 空值检查
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 格式化日期
 */
export function formatDate(date: any, format: string = 'YYYY-MM-DD'): string {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj == null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (obj instanceof Object) {
    const copy = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        copy[key] = deepClone(obj[key]);
      }
    }
    return copy;
  }
  return obj;
}
