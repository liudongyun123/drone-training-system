/**
 * Platform Adapter - 路由适配器接口定义
 * 定义跨平台统一的路由接口
 */

// ============================================================================
// 路由配置
// ============================================================================

export interface RouteConfig {
  /** 路由路径 */
  path: string;
  /** 路由名称 */
  name?: string;
  /** 路由参数 */
  params?: Record<string, string | number>;
  /** 查询参数 */
  query?: Record<string, string | number>;
  /** 是否replace模式 */
  replace?: boolean;
}

export interface RouteMeta {
  /** 页面标题 */
  title?: string;
  /** 是否需要登录 */
  requiresAuth?: boolean;
  /** 页面角色 */
  roles?: string[];
  /** 是否显示TabBar */
  showTabBar?: boolean;
  /** 是否缓存页面 */
  keepAlive?: boolean;
  /** 其他元数据 */
  [key: string]: any;
}

// ============================================================================
// 历史记录
// ============================================================================

export interface HistoryState {
  /** 路由路径 */
  pathname: string;
  /** 路由参数 */
  state?: Record<string, any>;
}

export interface History {
  /** 获取当前位置 */
  location: HistoryState;
  /** 导航到指定路由 */
  push(route: RouteConfig): void;
  /** 替换当前路由 */
  replace(route: RouteConfig): void;
  /** 后退 */
  back(): void;
  /** 前进 */
  forward(): void;
  /** 跳转到指定位置 */
  go(delta?: number): void;
  /** 监听路由变化 */
  listen(callback: (location: HistoryState) => void): () => void;
}

// ============================================================================
// 路由适配器接口
// ============================================================================

export interface IRouterAdapter {
  /** 获取路由历史 */
  readonly history: History;
  
  /** 获取当前路径 */
  getPath(): string;
  
  /** 获取路径参数 */
  getParams<T = Record<string, string>>(): T;
  
  /** 获取查询参数 */
  getQuery<T = Record<string, string>>(): T;
  
  /** 获取路由元数据 */
  getMeta(): RouteMeta;
  
  /** 导航到指定路由 */
  push(route: RouteConfig): void;
  
  /** 替换当前路由 */
  replace(route: RouteConfig): void;
  
  /** 后退 */
  back(): void;
  
  /** 前进 */
  forward(): void;
  
  /** 跳转到指定位置 */
  go(delta?: number): void;
  
  /** 路由跳转（Promise版本） */
  navigateTo(route: RouteConfig): Promise<void>;
  
  /** 关闭当前页面并返回 */
  navigateBack(delta?: number): Promise<void>;
  
  /** 重新加载当前页面 */
  reload(): void;
  
  /** 获取路由配置 */
  getRouteConfig(path: string): RouteConfig | undefined;
  
  /** 路由是否存在 */
  hasRoute(path: string): boolean;
  
  /** 获取所有路由 */
  getRoutes(): RouteConfig[];
}

// ============================================================================
// 小程序路由映射
// ============================================================================

export interface WechatPageConfig {
  /** 小程序页面路径 */
  pagePath: string;
  /** 是否为TabBar页面 */
  isTabBar?: boolean;
  /** 页面参数映射 */
  paramMapping?: Record<string, string>;
}

export interface IWechatRouterAdapter extends IRouterAdapter {
  /** 设置页面映射 */
  setPageMapping(routes: Record<string, WechatPageConfig>): void;
  
  /** 获取小程序页面配置 */
  getWechatPageConfig(path: string): WechatPageConfig | undefined;
  
  /** 微信小程序特定方法 */
  switchTab(path: string): Promise<void>;
  /** 微信小程序特定方法 */
  reLaunch(path: string): Promise<void>;
}

// ============================================================================
// 导出
// ============================================================================

export type {
  RouteConfig,
  RouteMeta,
  HistoryState,
  History,
  WechatPageConfig,
};
