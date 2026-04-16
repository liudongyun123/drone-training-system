// ============================================================================
// 优惠券服务
// ============================================================================
import { app } from '@/utils/cloudbase';

export interface Coupon {
  _id: string;
  code: string; // 优惠券码
  type: 'fixed' | 'percentage'; // 固定金额或百分比折扣
  value: number; // 折扣值
  minAmount?: number; // 最小使用金额
  maxDiscount?: number; // 最大折扣金额（百分比券时使用）
  totalCount: number; // 总发行数量
  usedCount: number; // 已使用数量
  startDate: string; // 开始日期
  endDate: string; // 结束日期
  status: 'active' | 'expired' | 'disabled'; // 状态
  applicableCourses?: string[]; // 适用课程ID列表（空数组表示适用所有课程）
  description?: string; // 优惠券描述
  createdBy?: string; // 创建者
  createdAt: string;
  updatedAt: string;
}

export interface UserCoupon {
  _id: string;
  userId: string;
  couponId: string;
  couponCode: string;
  coupon: Coupon; // 优惠券详情
  status: 'unused' | 'used' | 'expired'; // 用户优惠券状态
  orderId?: string; // 使用的订单ID
  obtainedAt: string; // 获取时间
  usedAt?: string; // 使用时间
  expiresAt: string; // 过期时间
  createdAt: string;
}

const COUPON_COLLECTION = 'coupons';
const USER_COUPON_COLLECTION = 'userCoupons';

export const couponService = {
  /**
   * 获取所有优惠券（管理员）
   */
  async getAllCoupons(): Promise<Coupon[]> {
    try {
      console.log('[CouponDB] 开始查询集合:', COUPON_COLLECTION);
      const db = app.database();
      const collection = db.collection(COUPON_COLLECTION);
      
      console.log('[CouponDB] collection对象:', collection);
      
      // 使用 Promise 方式获取结果
      const queryResult = await new Promise((resolve, reject) => {
        collection.get().then(resolve).catch(reject);
      });
      
      console.log('[CouponDB] 查询原始结果类型:', typeof queryResult);
      console.log('[CouponDB] 查询原始结果:', queryResult);
      
      // 尝试不同的数据结构
      let coupons: Coupon[] = [];
      if (queryResult && typeof queryResult === 'object') {
        // CloudBase SDK 可能返回 { data: [...] } 或直接是数组
        if ('data' in queryResult) {
          coupons = (queryResult as any).data || [];
        } else if (Array.isArray(queryResult)) {
          coupons = queryResult as Coupon[];
        } else {
          // 可能是 { list: [...] } 或其他格式
          const resultAny = queryResult as any;
          coupons = resultAny.list || resultAny.data || [];
        }
      }
      
      console.log('[CouponDB] 最终 coupons 数组:', coupons);
      console.log('[CouponDB] coupons 长度:', coupons.length);
      
      return coupons;
    } catch (error) {
      console.error('[CouponDB] 查询失败:', error);
      return [];
    }
  },

  /**
   * 获取活跃优惠券
   */
  async getActiveCoupons(): Promise<Coupon[]> {
    try {
      const db = app.database();
      const now = new Date().toISOString();
      const result = await db
        .collection(COUPON_COLLECTION)
        .where({
          status: 'active',
        })
        .get();
      
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result || [];
      
      // 过滤出在有效期内的优惠券
      const coupons = data as Coupon[];
      return Array.isArray(coupons) ? coupons.filter(
        coupon => coupon.startDate <= now && coupon.endDate >= now
      ) : [];
    } catch (error) {
      console.error('[CouponDB] getActiveCoupons 失败:', error);
      return [];
    }
  },

  /**
   * 根据ID获取优惠券
   */
  async getCouponById(couponId: string): Promise<Coupon | null> {
    try {
      const db = app.database();
      const result = await db.collection(COUPON_COLLECTION).doc(couponId).get();
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result;
      return data ? (data as Coupon) : null;
    } catch (error) {
      console.error('[CouponDB] getCouponById 失败:', error);
      return null;
    }
  },

  /**
   * 根据优惠券码获取优惠券
   */
  async getCouponByCode(code: string): Promise<Coupon | null> {
    try {
      const db = app.database();
      const result = await db.collection(COUPON_COLLECTION).where({ code }).get();
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result;
      return data?.length > 0 ? (data[0] as Coupon) : null;
    } catch (error) {
      console.error('[CouponDB] getCouponByCode 失败:', error);
      return null;
    }
  },

  /**
   * 创建优惠券（管理员）
   */
  async createCoupon(coupon: Omit<Coupon, '_id' | 'createdAt' | 'updatedAt' | 'usedCount'>): Promise<Coupon> {
    const db = app.database();
    const now = new Date().toISOString();
    
    const doc = {
      ...coupon,
      usedCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    const { data: result } = await db.collection(COUPON_COLLECTION).add(doc);
    return { _id: result.id, ...doc } as Coupon;
  },

  /**
   * 更新优惠券（管理员）
   */
  async updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<boolean> {
    const db = app.database();
    const now = new Date().toISOString();
    
    await db
      .collection(COUPON_COLLECTION)
      .doc(couponId)
      .update({
        ...updates,
        updatedAt: now,
      });
    
    return true;
  },

  /**
   * 删除优惠券（管理员）
   */
  async deleteCoupon(couponId: string): Promise<boolean> {
    const db = app.database();
    await db.collection(COUPON_COLLECTION).doc(couponId).remove();
    return true;
  },

  /**
   * 验证优惠券
   */
  async validateCoupon(
    code: string,
    totalAmount: number,
    courseId?: string
  ): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> {
    // 获取优惠券
    const coupon = await this.getCouponByCode(code);
    
    if (!coupon) {
      return { valid: false, error: '优惠券不存在' };
    }

    // 检查状态
    if (coupon.status !== 'active') {
      return { valid: false, error: '优惠券已失效' };
    }

    // 检查有效期
    const now = new Date().toISOString();
    if (coupon.startDate > now) {
      return { valid: false, error: '优惠券尚未生效' };
    }
    if (coupon.endDate < now) {
      return { valid: false, error: '优惠券已过期' };
    }

    // 检查发行数量
    if (coupon.usedCount >= coupon.totalCount) {
      return { valid: false, error: '优惠券已发放完毕' };
    }

    // 检查最小使用金额
    if (coupon.minAmount && totalAmount < coupon.minAmount) {
      return { valid: false, error: `订单金额需达到¥${coupon.minAmount}才能使用` };
    }

    // 检查适用课程
    if (coupon.applicableCourses && coupon.applicableCourses.length > 0 && courseId) {
      if (!coupon.applicableCourses.includes(courseId)) {
        return { valid: false, error: '该优惠券不适用于此课程' };
      }
    }

    return { valid: true, coupon };
  },

  /**
   * 计算折扣金额
   */
  calculateDiscount(coupon: Coupon, amount: number): number {
    if (coupon.type === 'fixed') {
      return Math.min(coupon.value, amount);
    } else {
      // 百分比折扣
      const discount = amount * (coupon.value / 100);
      // 应用最大折扣限制
      if (coupon.maxDiscount) {
        return Math.min(discount, coupon.maxDiscount);
      }
      return discount;
    }
  },

  /**
   * 获取用户的优惠券列表
   */
  async getUserCoupons(userId: string): Promise<UserCoupon[]> {
    try {
      const db = app.database();
      const now = new Date().toISOString();
      const result = await db.collection(USER_COUPON_COLLECTION).where({ userId }).get();
      
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result || [];
      const userCoupons = Array.isArray(data) ? data as UserCoupon[] : [];
      
      // 更新过期状态
      for (const userCoupon of userCoupons) {
        if (userCoupon.status === 'unused' && userCoupon.expiresAt < now) {
          await db.collection(USER_COUPON_COLLECTION).doc(userCoupon._id).update({
            status: 'expired',
          });
        }
      }
      
      return userCoupons;
    } catch (error) {
      console.error('[CouponDB] getUserCoupons 失败:', error);
      return [];
    }
  },

  /**
   * 获取用户的可用优惠券
   */
  async getUserAvailableCoupons(userId: string): Promise<UserCoupon[]> {
    const userCoupons = await this.getUserCoupons(userId);
    const now = new Date().toISOString();
    
    return userCoupons.filter(
      uc => uc.status === 'unused' && uc.expiresAt > now
    );
  },

  /**
   * 发放优惠券给用户
   */
  async issueCouponToUser(
    userId: string,
    couponId: string
  ): Promise<UserCoupon> {
    const db = app.database();
    const now = new Date().toISOString();
    
    // 获取优惠券信息
    const coupon = await this.getCouponById(couponId);
    if (!coupon) {
      throw new Error('优惠券不存在');
    }

    // 检查是否已经领取
    const { data: existing } = await db
      .collection(USER_COUPON_COLLECTION)
      .where({ userId, couponId })
      .get();
    
    if (existing.length > 0) {
      throw new Error('您已领取过该优惠券');
    }

    // 检查优惠券数量
    if (coupon.usedCount >= coupon.totalCount) {
      throw new Error('优惠券已发放完毕');
    }

    // 创建用户优惠券
    const userCoupon = {
      userId,
      couponId,
      couponCode: coupon.code,
      coupon,
      status: 'unused' as const,
      obtainedAt: now,
      expiresAt: coupon.endDate,
      createdAt: now,
    };
    
    const { data: result } = await db.collection(USER_COUPON_COLLECTION).add(userCoupon);
    
    // 更新优惠券使用数量
    await db.collection(COUPON_COLLECTION).doc(couponId).update({
      usedCount: coupon.usedCount + 1,
      updatedAt: now,
    });
    
    return { _id: result.id, ...userCoupon } as UserCoupon;
  },

  /**
   * 使用优惠券
   */
  async useCoupon(userCouponId: string, orderId: string): Promise<boolean> {
    const db = app.database();
    const now = new Date().toISOString();
    
    // 获取用户优惠券
    const { data: userCouponData } = await db
      .collection(USER_COUPON_COLLECTION)
      .doc(userCouponId)
      .get();
    
    if (!userCouponData) {
      throw new Error('优惠券不存在');
    }
    
    const userCoupon = userCouponData as UserCoupon;
    
    // 检查状态
    if (userCoupon.status !== 'unused') {
      throw new Error('优惠券已被使用或已过期');
    }
    
    // 更新状态
    await db.collection(USER_COUPON_COLLECTION).doc(userCouponId).update({
      status: 'used',
      orderId,
      usedAt: now,
    });
    
    return true;
  },

  /**
   * 批量发放优惠券
   */
  async bulkIssueCoupons(
    couponId: string,
    userIds: string[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const userId of userIds) {
      try {
        await this.issueCouponToUser(userId, couponId);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`${userId}: ${error.message}`);
      }
    }
    
    return { success, failed, errors };
  },

  /**
   * 统计优惠券使用情况
   */
  async getCouponStatistics(couponId: string): Promise<{
    totalIssued: number;
    totalUsed: number;
    unused: number;
    expired: number;
  }> {
    try {
      const db = app.database();
      const result = await db
        .collection(USER_COUPON_COLLECTION)
        .where({ couponId })
        .get();
      
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result || [];
      const coupons = Array.isArray(data) ? data as UserCoupon[] : [];
      
      return {
        totalIssued: coupons.length,
        totalUsed: coupons.filter(c => c.status === 'used').length,
        unused: coupons.filter(c => c.status === 'unused').length,
        expired: coupons.filter(c => c.status === 'expired').length,
      };
    } catch (error) {
      console.error('[CouponDB] getCouponStatistics 失败:', error);
      return { totalIssued: 0, totalUsed: 0, unused: 0, expired: 0 };
    }
  },

  /**
   * 自动更新过期优惠券状态（定时任务）
   */
  async updateExpiredCoupons(): Promise<number> {
    try {
      const db = app.database();
      const now = new Date().toISOString();
      
      // 更新优惠券状态
      const expiredResult = await db
        .collection(COUPON_COLLECTION)
        .where({
          status: 'active',
          endDate: db.command.lt(now),
        })
        .get();
      
      const expiredCoupons = (expiredResult as any)?.data || expiredResult || [];
      
      for (const coupon of expiredCoupons) {
        await db
          .collection(COUPON_COLLECTION)
          .doc(coupon._id)
          .update({
            status: 'expired',
            updatedAt: now,
          });
      }
      
      // 更新用户优惠券状态
      const userExpiredResult = await db
        .collection(USER_COUPON_COLLECTION)
        .where({
          status: 'unused',
          expiresAt: db.command.lt(now),
        })
        .get();
      
      const expiredUserCoupons = (userExpiredResult as any)?.data || userExpiredResult || [];
      
      for (const userCoupon of expiredUserCoupons) {
        await db
          .collection(USER_COUPON_COLLECTION)
          .doc(userCoupon._id)
          .update({
            status: 'expired',
            updatedAt: now,
          });
      }
      
      return expiredCoupons.length + expiredUserCoupons.length;
    } catch (error) {
      console.error('[CouponDB] updateExpiredCoupons 失败:', error);
      return 0;
    }
  },
};

export default couponService;
