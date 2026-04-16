/**
 * 系统配置服务
 * 管理登录方式、角色权限等系统级配置
 */

import { app } from '@/utils/cloudbase';

const db = app.database();
const CONFIG_COLLECTION = 'systemConfig';

export interface LoginProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  configurable: boolean;
  config?: Record<string, any>;
}

export interface RolePermission {
  role: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

export interface SystemConfig {
  _id?: string;
  loginProviders: LoginProviderConfig[];
  roles: RolePermission[];
  wechatConfig?: {
    appId: string;
    appSecret: string;
    enabled: boolean;
  };
  updatedAt: Date;
  updatedBy?: string;
}

// 默认配置
const defaultConfig: SystemConfig = {
  loginProviders: [
    { id: 'phone', name: '手机验证码登录', enabled: true, configurable: true },
    { id: 'username', name: '账号密码登录', enabled: true, configurable: true },
    { id: 'anonymous', name: '匿名登录', enabled: true, configurable: true },
    { id: 'wechat', name: '微信登录', enabled: false, configurable: true },
  ],
  roles: [
    {
      role: 'anonymous',
      name: '访客',
      description: '仅浏览前台公开内容',
      permissions: ['view:courses', 'view:teachers'],
      isSystem: true
    },
    {
      role: 'visitor',
      name: '游客',
      description: '注册但未完善信息',
      permissions: ['view:courses', 'view:teachers', 'edit:profile'],
      isSystem: true
    },
    {
      role: 'student',
      name: '学员',
      description: '前台完整权限，仅可访问已购课程',
      permissions: ['view:courses', 'view:teachers', 'edit:profile', 'access:learning', 'access:exams', 'access:certificates'],
      isSystem: true
    },
    {
      role: 'teacher',
      name: '教师',
      description: '后台课程/题库/学员管理',
      permissions: ['admin:courses', 'admin:exams', 'admin:students', 'admin:schedules'],
      isSystem: true
    },
    {
      role: 'admin',
      name: '管理员',
      description: '所有后台权限',
      permissions: ['*'],
      isSystem: true
    },
  ],
  updatedAt: new Date(),
};

// 所有可用权限列表
export const ALL_PERMISSIONS = [
  { key: 'view:courses', label: '查看课程', category: '前台' },
  { key: 'view:teachers', label: '查看教师', category: '前台' },
  { key: 'edit:profile', label: '编辑个人资料', category: '前台' },
  { key: 'access:learning', label: '访问学习中心', category: '前台' },
  { key: 'access:exams', label: '访问考试中心', category: '前台' },
  { key: 'access:certificates', label: '访问证书中心', category: '前台' },
  { key: 'admin:courses', label: '管理课程', category: '后台' },
  { key: 'admin:students', label: '管理学员', category: '后台' },
  { key: 'admin:teachers', label: '管理教师', category: '后台' },
  { key: 'admin:schedules', label: '管理排课', category: '后台' },
  { key: 'admin:attendance', label: '管理出勤', category: '后台' },
  { key: 'admin:exams', label: '管理考试', category: '后台' },
  { key: 'admin:orders', label: '管理订单', category: '后台' },
  { key: 'admin:finance', label: '财务管理', category: '后台' },
  { key: 'admin:certificates', label: '管理证书', category: '后台' },
  { key: 'admin:marketing', label: '营销工具', category: '后台' },
  { key: 'admin:settings', label: '系统设置', category: '后台' },
];

/**
 * 获取系统配置
 */
export async function getSystemConfig(): Promise<SystemConfig> {
  try {
    const result = await db.collection(CONFIG_COLLECTION).limit(1).get();
    if (result.data && result.data.length > 0) {
      return result.data[0] as SystemConfig;
    }
    // 没有配置则创建默认配置
    return await initSystemConfig();
  } catch (error) {
    console.error('获取系统配置失败:', error);
    return defaultConfig;
  }
}

/**
 * 初始化系统配置
 */
export async function initSystemConfig(): Promise<SystemConfig> {
  try {
    const result = await db.collection(CONFIG_COLLECTION).add({
      ...defaultConfig,
      updatedAt: new Date(),
    });
    return { ...defaultConfig, _id: result.id };
  } catch (error) {
    console.error('初始化系统配置失败:', error);
    return defaultConfig;
  }
}

/**
 * 更新登录方式配置
 */
export async function updateLoginProvider(
  providerId: string,
  enabled: boolean
): Promise<boolean> {
  try {
    const config = await getSystemConfig();
    const updatedProviders = config.loginProviders.map(p =>
      p.id === providerId ? { ...p, enabled } : p
    );
    
    if (config._id) {
      await db.collection(CONFIG_COLLECTION).doc(config._id).update({
        loginProviders: updatedProviders,
        updatedAt: new Date(),
      });
    } else {
      await initSystemConfig();
    }
    return true;
  } catch (error) {
    console.error('更新登录方式失败:', error);
    return false;
  }
}

/**
 * 更新微信配置
 */
export async function updateWechatConfig(config: {
  appId: string;
  appSecret: string;
  enabled: boolean;
}): Promise<boolean> {
  try {
    const systemConfig = await getSystemConfig();
    const updatedProviders = systemConfig.loginProviders.map(p =>
      p.id === 'wechat' ? { ...p, enabled: config.enabled } : p
    );
    
    if (systemConfig._id) {
      await db.collection(CONFIG_COLLECTION).doc(systemConfig._id).update({
        wechatConfig: config,
        loginProviders: updatedProviders,
        updatedAt: new Date(),
      });
    } else {
      await db.collection(CONFIG_COLLECTION).add({
        ...defaultConfig,
        wechatConfig: config,
        loginProviders: updatedProviders,
        updatedAt: new Date(),
      });
    }
    return true;
  } catch (error) {
    console.error('更新微信配置失败:', error);
    return false;
  }
}

/**
 * 更新角色权限
 */
export async function updateRolePermissions(
  role: string,
  permissions: string[]
): Promise<boolean> {
  try {
    const config = await getSystemConfig();
    const updatedRoles = config.roles.map(r =>
      r.role === role ? { ...r, permissions } : r
    );
    
    if (config._id) {
      await db.collection(CONFIG_COLLECTION).doc(config._id).update({
        roles: updatedRoles,
        updatedAt: new Date(),
      });
    } else {
      await initSystemConfig();
    }
    return true;
  } catch (error) {
    console.error('更新角色权限失败:', error);
    return false;
  }
}

/**
 * 创建自定义角色
 */
export async function createCustomRole(roleData: Omit<RolePermission, 'isSystem'>): Promise<boolean> {
  try {
    const config = await getSystemConfig();
    const newRole: RolePermission = {
      ...roleData,
      isSystem: false,
    };
    
    const updatedRoles = [...config.roles, newRole];
    
    if (config._id) {
      await db.collection(CONFIG_COLLECTION).doc(config._id).update({
        roles: updatedRoles,
        updatedAt: new Date(),
      });
    } else {
      await initSystemConfig();
    }
    return true;
  } catch (error) {
    console.error('创建角色失败:', error);
    return false;
  }
}

/**
 * 删除自定义角色
 */
export async function deleteCustomRole(role: string): Promise<boolean> {
  try {
    const config = await getSystemConfig();
    const roleToDelete = config.roles.find(r => r.role === role);
    
    if (roleToDelete?.isSystem) {
      console.error('不能删除系统角色');
      return false;
    }
    
    const updatedRoles = config.roles.filter(r => r.role !== role);
    
    if (config._id) {
      await db.collection(CONFIG_COLLECTION).doc(config._id).update({
        roles: updatedRoles,
        updatedAt: new Date(),
      });
    }
    return true;
  } catch (error) {
    console.error('删除角色失败:', error);
    return false;
  }
}

/**
 * 检查用户是否有权限
 */
export function hasPermission(userRole: string, permission: string, config: SystemConfig): boolean {
  const role = config.roles.find(r => r.role === userRole);
  if (!role) return false;
  if (role.permissions.includes('*')) return true;
  return role.permissions.includes(permission);
}

export default {
  getSystemConfig,
  initSystemConfig,
  updateLoginProvider,
  updateWechatConfig,
  updateRolePermissions,
  createCustomRole,
  deleteCustomRole,
  hasPermission,
  ALL_PERMISSIONS,
};
