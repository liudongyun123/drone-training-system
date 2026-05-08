/**
 * Platform - 平台适配层统一导出
 * 
 * 提供统一的接口抽象，解耦业务代码与平台差异
 */

// Adapters
export * from './adapters/IRequestAdapter';
export * from './adapters/IRouterAdapter';
export * from './adapters/IStorageAdapter';

// Adapter Implementations
export { WebRequestAdapter } from './adapters/WebRequestAdapter';
export { LocalStorageAdapter, SessionStorageAdapter, MemoryStorageAdapter } from './adapters/StorageAdapter';
export { StorageAdapter, WebStorageAdapter } from './adapters/StorageAdapter';

// Context
export { PlatformContext, request, storage, memory, router, getEnv } from './context';
export type { PlatformContextConfig } from './context';
