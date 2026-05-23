// ============================================================================
// 优惠券服务
// ★ Stage 3 迁移：数据库操作统一走 HTTP → adminService → db-init 云函数
// ============================================================================
import { adminService } from './adminService';

export interface Coupon {
  _id: string;
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  minAmount?: number;
  maxDiscount?: number;
  totalCount: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'disabled';
  applicableCourses?: string[];
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCoupon {
  _id: string;
  userId: string;
  couponId: string;
  couponCode: string;
  coupon: Coupon;
  status: 'unused' | 'used' | 'expired';
  orderId?: string;
  obtainedAt: string;
  usedAt?: string;
  expiresAt: string;
  createdAt: string;
}

const COUPON_COLLECTION = 'coupons';
const USER_COUPON_COLLECTION = 'userCoupons';

const extractList = <T>(result: any): T[] => result?.data?.list || result?.data || [];

export const couponService = {
  /**
   * 获取所有优惠券（管理员）
   */
  async getAllCoupons(): Promise<Coupon[]> {
    try {
      console.log('[CouponDB] 开始查询集合:', COUPON_COLLECTION);
      const result = await adminService.list(COUPON_COLLECTION, {}, { limit: 200 });
      const coupons = extractList<Coupon>(result);
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
      const now = new Date().toISOString();
      const result = await adminService.list(COUPON_COLLECTION, { status: 'active' }, { limit: 200 });
      const coupons = extractList<Coupon>(result);
      // 客户端过滤有效期
      return coupons.filter(coupon => coupon.startDate <= now && coupon.endDate >= now);
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
      const res = await adminService.get(COUPON_COLLECTION, couponId);
      return res?.data as Coupon || null;
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
      const res = await adminService.list(COUPON_COLLECTION, { code }, { limit: 1 });
      const list = extractList<Coupon>(res);
      return list.length > 0 ? list[0] : null;
    } catch (error) {
      console.error('[CouponDB] getCouponByCode 失败:', error);
      return null;
    }
  },

  /**
   * 创建优惠券（管理员）
   */
  async createCoupon(coupon: Omit<Coupon, '_id' | 'createdAt' | 'updatedAt' | 'usedCount'>): Promise<Coupon> {
    const now = new Date().toISOString();
    const doc = { ...coupon, usedCount: 0, createdAt: now, updatedAt: now };
    const res = await adminService.add(COUPON_COLLECTION, doc);
    return { _id: res.data.id, ...doc } as Coupon;
  },

  /**
   * 更新优惠券（管理员）
   */
  async updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<boolean> {
    await adminService.update(COUPON_COLLECTION, couponId, { ...updates, updatedAt: new Date().toISOString() });
    return true;
  },

  /**
   * 删除优惠券（管理员）
   */
  async deleteCoupon(couponId: string): Promise<boolean> {
    await adminService.delete(COUPON_COLLECTION, couponId);
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
    const coupon = await this.getCouponByCode(code);
    if (!coupon) return { valid: false, error: '优惠券不存在' };
    if (coupon.status !== 'active') return { valid: false, error: '优惠券已失效' };

    const now = new Date().toISOString();
    if (coupon.startDate > now) return { valid: false, error: '优惠券尚未生效' };
    if (coupon.endDate < now) return { valid: false, error: '优惠券已过期' };
    if (coupon.usedCount >= coupon.totalCount) return { valid: false, error: '优惠券已发放完毕' };
    if (coupon.minAmount && totalAmount < coupon.minAmount) return { valid: false, error: `订单金额需达到¥${coupon.minAmount}才能使用` };

    if (coupon.applicableCourses && coupon.applicableCourses.length > 0 && courseId) {
      if (!coupon.applicableCourses.includes(courseId)) return { valid: false, error: '该优惠券不适用于此课程' };
    }

    return { valid: true, coupon };
  },

  /**
   * 计算折扣金额
   */
  calculateDiscount(coupon: Coupon, amount: number): number {
    if (coupon.type === 'fixed') return Math.min(coupon.value, amount);
    const discount = amount * (coupon.value / 100);
    return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount;
  },

  /**
   * 获取用户的优惠券列表
   */
  async getUserCoupons(userId: string): Promise<UserCoupon[]> {
    try {
      const now = new Date().toISOString();
      const result = await adminService.list(USER_COUPON_COLLECTION, { userId }, { limit: 200 });
      const userCoupons = extractList<UserCoupon>(result);
      
      // 更新过期状态（批量处理）
      for (const uc of userCoupons) {
        if (uc.status === 'unused' && uc.expiresAt < now) {
          await adminService.update(USER_COUPON_COLLECTION, uc._id, { status: 'expired' });
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
    return userCoupons.filter(uc => uc.status === 'unused' && uc.expiresAt > now);
  },

  /**
   * 发放优惠券给用户
   */
  async issueCouponToUser(userId: string, couponId: string): Promise<UserCoupon> {
    const now = new Date().toISOString();
    
    // 获取优惠券信息
    const coupon = await this.getCouponById(couponId);
    if (!coupon) throw new Error('优惠券不存在');

    // 检查是否已经领取
    const { data: existingRes } = await adminService.list(USER_COUPON_COLLECTION, { userId, couponId }, { limit: 1 });
    const existing = extractList(existingRes);
    if (existing.length > 0) throw new Error('您已领取过该优惠券');

    // 检查优惠券数量
    if (coupon.usedCount >= coupon.totalCount) throw new Error('优惠券已发放完毕');

    // 创建用户优惠券
    const userCoupon = {
      userId, couponId, couponCode: coupon.code, coupon,
      status: 'unused' as const, obtainedAt: now, expiresAt: coupon.endDate, createdAt: now,
    };
    
    const { data: result } = await adminService.add(USER_COUPON_COLLECTION, userCoupon);
    
    // 更新优惠券使用数量
    await adminService.update(COUPON_COLLECTION, couponId, {
      usedCount: coupon.usedCount + 1, updatedAt: now,
    });
    
    return { _id: result.id, ...userCoupon } as UserCoupon;
  },

  /**
   * 使用优惠券
   */
  async useCoupon(userCouponId: string, orderId: string): Promise<boolean> {
    const now = new Date().toISOString();
    
    const res = await adminService.get(USER_COUPON_COLLECTION, userCouponId);
    const userCoupon = res?.data as UserCoupon;
    if (!userCoupon) throw new Error('优惠券不存在');
    if (userCoupon.status !== 'unused') throw new Error('优惠券已被使用或已过期');
    
    await adminService.update(USER_COUPON_COLLECTION, userCouponId, { status: 'used', orderId, usedAt: now });
    return true;
  },

  /**
   * 批量发放优惠券
   */
  async bulkIssueCoupons(couponId: string, userIds: string[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0, failed = 0;
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
    totalIssued: number; totalUsed: number; unused: number; expired: number;
  }> {
    try {
      const result = await adminService.list(USER_COUPON_COLLECTION, { couponId }, { limit: 500 });
      const coupons = extractList<UserCoupon>(result);
      
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
      const now = new Date().toISOString();
      
      // 过期优惠券
      const expiredResult = await adminService.listWithOps(COUPON_COLLECTION, {
        status: 'active',
        endDate: { '$lt': now },
      }, { limit: 200 });
      const expiredCoupons = extractList<Coupon>(expiredResult);
      
      for (const coupon of expiredCoupons) {
        await adminService.update(COUPON_COLLECTION, coupon._id, { status: 'expired', updatedAt: now });
      }
      
      // 过期用户优惠券
      const userExpiredResult = await adminService.listWithOps(USER_COUPON_COLLECTION, {
        status: 'unused',
        expiresAt: { '$lt': now },
      }, { limit: 200 });
      const expiredUserCoupons = extractList<UserCoupon>(userExpiredResult);
      
      for (const uc of expiredUserCoupons) {
        await adminService.update(USER_COUPON_COLLECTION, uc._id, { status: 'expired', updatedAt: now });
      }
      
      return expiredCoupons.length + expiredUserCoupons.length;
    } catch (error) {
      console.error('[CouponDB] updateExpiredCoupons 失败:', error);
      return 0;
    }
  },
};

export default couponService;
