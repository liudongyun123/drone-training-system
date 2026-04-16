/**
 * 权限工具函数
 */

import { Permission, UserRole, ROLE_PERMISSIONS } from '../store/authStore';

/**
 * 获取角色的所有权限
 */
export const getPermissionsByRole = (role: UserRole): Permission[] => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * 检查角色是否有权限
 */
export const roleHasPermission = (role: UserRole, permission: Permission): boolean => {
  if (role === 'admin') return true;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.includes(permission) ?? false;
};

/**
 * 获取角色层级
 * 数字越大权限越高
 */
export const getRoleLevel = (role: UserRole): number => {
  const levels: Record<UserRole, number> = {
    anonymous: 0,
    visitor: 1,
    student: 2,
    teacher: 3,
    admin: 4,
  };
  return levels[role] ?? 0;
};

/**
 * 比较两个角色的权限等级
 * @returns 负数表示roleA等级低，正数表示roleA等级高，0表示相等
 */
export const compareRoleLevel = (roleA: UserRole, roleB: UserRole): number => {
  return getRoleLevel(roleA) - getRoleLevel(roleB);
};

/**
 * 检查角色A是否包含角色B的所有权限
 */
export const roleContains = (roleA: UserRole, roleB: UserRole): boolean => {
  return getRoleLevel(roleA) >= getRoleLevel(roleB);
};

/**
 * 权限分组
 */
export const PERMISSION_GROUPS = {
  course: {
    label: '课程权限',
    permissions: ['course:view', 'course:buy'] as Permission[],
  },
  exam: {
    label: '考试权限',
    permissions: ['exam:view', 'exam:take'] as Permission[],
  },
  practice: {
    label: '练习权限',
    permissions: ['practice:view', 'practice:do'] as Permission[],
  },
  admin: {
    label: '后台权限',
    permissions: [
      'admin:dashboard',
      'admin:course',
      'admin:exam',
      'admin:student',
      'admin:teacher',
      'admin:schedule',
      'admin:finance',
      'admin:order',
      'admin:certificate',
      'admin:banner',
      'admin:notice',
      'admin:system',
      'admin:all',
    ] as Permission[],
  },
};

/**
 * 检查权限是否属于某个分组
 */
export const getPermissionGroup = (permission: Permission): string | null => {
  for (const [key, group] of Object.entries(PERMISSION_GROUPS)) {
    if (group.permissions.includes(permission)) {
      return group.label;
    }
  }
  return null;
};

/**
 * 权限描述映射
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'course:view': '查看课程',
  'course:buy': '购买课程',
  'exam:view': '查看考试',
  'exam:take': '参加考试',
  'practice:view': '查看题库',
  'practice:do': '练习题库',
  'certificate:view': '查看证书',
  'profile:edit': '编辑个人资料',
  'admin:dashboard': '管理仪表盘',
  'admin:course': '课程管理',
  'admin:exam': '考试题库管理',
  'admin:student': '学员管理',
  'admin:teacher': '教师管理',
  'admin:schedule': '排课管理',
  'admin:finance': '财务管理',
  'admin:order': '订单管理',
  'admin:certificate': '证书管理',
  'admin:banner': '轮播图管理',
  'admin:notice': '公告管理',
  'admin:system': '系统设置',
  'admin:all': '所有管理权限',
};

/**
 * 角色描述映射
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, { label: string; description: string }> = {
  anonymous: {
    label: '游客',
    description: '仅可浏览公开课程信息',
  },
  visitor: {
    label: '访客',
    description: '可浏览课程、考试、题库信息',
  },
  student: {
    label: '学员',
    description: '可学习课程、参加考试、练习题库',
  },
  teacher: {
    label: '教师',
    description: '可管理课程、学员、排课',
  },
  admin: {
    label: '管理员',
    description: '拥有所有管理权限',
  },
};

/**
 * 验证权限字符串是否有效
 */
export const isValidPermission = (permission: string): permission is Permission => {
  return permission in PERMISSION_DESCRIPTIONS;
};

/**
 * 验证角色字符串是否有效
 */
export const isValidRole = (role: string): role is UserRole => {
  return role in ROLE_DESCRIPTIONS;
};

/**
 * 获取角色升级路径
 */
export const getRoleUpgradePath = (currentRole: UserRole): UserRole[] => {
  const roles: UserRole[] = ['anonymous', 'visitor', 'student', 'teacher', 'admin'];
  const currentIndex = roles.indexOf(currentRole);
  return roles.slice(currentIndex + 1);
};

/**
 * 默认导出
 */
export default {
  getPermissionsByRole,
  roleHasPermission,
  getRoleLevel,
  compareRoleLevel,
  roleContains,
  getPermissionGroup,
  isValidPermission,
  isValidRole,
  getRoleUpgradePath,
  PERMISSION_GROUPS,
  PERMISSION_DESCRIPTIONS,
  ROLE_DESCRIPTIONS,
};
