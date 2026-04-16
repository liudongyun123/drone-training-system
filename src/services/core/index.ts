/**
 * 服务层核心模块
 * 
 * 统一的服务架构，提供：
 * - BaseService: 服务基类（缓存、重试、监控）
 * - ApiClient: API调用层（限流、拦截器）
 * - SecurityService: 安全服务（验证、加密、日志）
 * - DatabaseIndexes: 数据库索引建议
 * - PerformanceMonitor: 性能监控面板
 */

// BaseService - 服务基类
export { 
  BaseService, 
  serviceCache, 
  perfMonitor, 
  generateId, 
  formatDate, 
  debounce, 
  throttle 
} from './BaseService'

// ApiClient - API调用层
export { 
  apiClient, 
  apiRateLimiter, 
  callCloudFunction,
  addRequestInterceptor,
  addResponseInterceptor,
  type ApiError,
  type ApiRequest,
  type ApiResponse
} from './ApiClient'

// SecurityService - 安全服务
export { 
  escapeHtml,
  sanitizeHtml,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  validatePasswordStrength,
  generateSecureToken,
  VALIDATION_RULES,
  useValidation,
  useSecurityLog,
  generateCsrfToken,
  getCsrfToken,
  verifyCsrfToken,
  withCsrfToken
} from './SecurityService'

// DatabaseIndexes - 数据库索引
export { 
  INDEX_RECOMMENDATIONS,
  generateIndexDefinitions,
  getHighPriorityIndexes,
  generateIndexReport
} from './DatabaseIndexes'

// PerformanceMonitor - 性能监控
export { 
  usePerformanceMetrics, 
  PerformanceMonitor 
} from './PerformanceMonitor'
