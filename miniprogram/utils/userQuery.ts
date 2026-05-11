/**
 * 统一用户查询工具 - 小程序端
 * 数据库已统一使用 phone 作为用户标识
 */

/**
 * 获取当前用户手机号（主标识）
 * 优先从 phone 获取，兼容从 userId 获取（历史遗留）
 */
export function getUserPhone(): string {
  // 优先使用正确的 phone key
  const phone = wx.getStorageSync('phone') || '';
  if (phone) return phone;
  
  // 兼容旧数据：userId 实际存的是 phone
  const userId = wx.getStorageSync('userId') || '';
  return userId;
}

/**
 * 检查登录状态
 */
export function checkLogin(): boolean {
  return !!getUserPhone();
}

/**
 * 获取用户 ID（内部使用，不用于数据库查询）
 */
export function getUserId(): string | null {
  // 注意：这里返回的是内部ID，不是数据库查询用的 phone
  return wx.getStorageSync('userId') || null;
}

/**
 * 获取用户手机号（明确用于数据库查询）
 */
export function getPhone(): string | null {
  return getUserPhone() || null;
}
