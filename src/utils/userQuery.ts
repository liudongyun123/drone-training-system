/**
 * 统一用户查询工具
 * 数据库已统一使用 phone 作为用户标识
 */

import { useAuthStore } from '@/store/authStore';

/**
 * 获取当前用户标识
 * @returns { phone: string, userId: string }
 */
export function getCurrentUserIdentifier() {
  const user = useAuthStore.getState().user;
  
  // 主要标识：phone（数据库统一使用）
  const phone = user?.phone || localStorage.getItem('user_phone') || '';
  
  // 兼容：userId（内部使用，不用于数据库查询）
  const userId = user?.uid || user?.id || (user as any)?._openid || '';

  return { phone, userId };
}

/**
 * 构建用户查询条件（统一使用 phone）
 * @param phone - 手机号
 * @returns 查询对象
 */
export function buildUserQuery(phone: string): Record<string, any> {
  if (!phone) return {};
  return { phone };
}

/**
 * 构建用户 OR 查询条件
 * @param phone - 手机号
 * @returns 带 $or 的查询对象
 */
export function buildUserOrQuery(phone: string): Record<string, any> {
  if (!phone) return {};
  return {
    phone,
    // 兼容旧数据的其他字段（按优先级）
    // userId: 内部标识，不用于主查询
    // _openid: 微信标识，不用于主查询
  };
}

/**
 * 获取用户手机号（主标识）
 * @returns phone 或空字符串
 */
export function getUserPhone(): string {
  const user = useAuthStore.getState().user;
  return user?.phone || localStorage.getItem('user_phone') || '';
}
