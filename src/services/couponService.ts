/**
 * 优惠券服务 - 管理后台适配层
 * 对接真实数据库 (coupon.ts)，保持对外接口不变
 */
import type { Coupon, CouponUsage, ApiResponse, PaginatedResponse } from '../types';
import { couponService as dbCouponService } from './coupon';

export const couponService = {
  // 获取优惠券列表
  getList: async (params?: { status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Coupon>> => {
    try {
      console.log('[CouponService] 开始获取优惠券列表');
      const coupons = await dbCouponService.getAllCoupons();
      console.log('[CouponService] 数据库返回:', coupons);
      
      if (!Array.isArray(coupons)) {
        console.error('[CouponService] 返回数据不是数组:', coupons);
        // @ts-ignore
        return { data: [], total: 0, page: 1, limit: 10 };
      }
      
      let filtered = coupons.map(c => ({
        _id: c._id,
        code: c.code,
        type: c.type as 'fixed' | 'percent',
        value: c.value,
        minAmount: c.minAmount || 0,
        maxDiscount: c.maxDiscount,
        totalCount: c.totalCount,
        usedCount: c.usedCount,
        validFrom: c.startDate,
        validTo: c.endDate,
        status: c.status as Coupon['status'],
        courseIds: c.applicableCourses,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      if (params?.status && params.status !== 'all') {
        filtered = filtered.filter(c => c.status === params.status);
      }

      return {
        // @ts-ignore
        data: filtered,
        total: filtered.length,
        page: params?.page || 1,
        limit: params?.limit || 10,
      };
    } catch (error) {
      console.error('获取优惠券列表失败:', error);
      // @ts-ignore
      return { data: [], total: 0, page: 1, limit: 10 };
    }
  },

  // 获取优惠券详情
  getDetail: async (id: string): Promise<ApiResponse<Coupon>> => {
    try {
      const coupon = await dbCouponService.getCouponById(id);
      if (!coupon) {
        return { data: null as any, success: false, message: '优惠券不存在' };
      }

      return {
        data: {
          _id: coupon._id,
          code: coupon.code,
          type: coupon.type as 'fixed' | 'percent',
          value: coupon.value,
          minAmount: coupon.minAmount || 0,
          maxDiscount: coupon.maxDiscount,
          totalCount: coupon.totalCount,
          usedCount: coupon.usedCount,
          validFrom: coupon.startDate,
          validTo: coupon.endDate,
          status: coupon.status as Coupon['status'],
          courseIds: coupon.applicableCourses,
          createdAt: coupon.createdAt,
          updatedAt: coupon.updatedAt,
        },
        success: true,
      };
    } catch (error) {
      console.error('获取优惠券详情失败:', error);
      return { data: null as any, success: false, message: '获取优惠券详情失败' };
    }
  },

  // 验证优惠券
  validate: async (code: string, courseId?: string, amount?: number): Promise<ApiResponse<{ valid: boolean; discount: number; coupon?: Coupon }>> => {
    try {
      const result = await dbCouponService.validateCoupon(code, amount || 0, courseId);
      if (!result.valid) {
        return { data: { valid: false, discount: 0 }, success: false, message: result.error };
      }
      const coupon = result.coupon!;
      const discount = dbCouponService.calculateDiscount(coupon, amount || 0);
      return {
        data: { valid: true, discount, coupon: coupon as any },
        success: true,
      };
    } catch (error: any) {
      return { data: { valid: false, discount: 0 }, success: false, message: error.message || '验证失败' };
    }
  },

  // 使用优惠券
  useCoupon: async (code: string, orderId: string): Promise<ApiResponse<CouponUsage>> => {
    try {
      // @ts-ignore
      const { data: userCoupons } = await import('./coupon').then(m => m.couponService.getUserCoupons('current_user'));
      const userCoupon = userCoupons.find((uc: any) => uc.couponCode === code && uc.status === 'unused');
      if (!userCoupon) {
        return { data: null as any, success: false, message: '未找到可用的优惠券' };
      }
      await dbCouponService.useCoupon(userCoupon._id, orderId);
      return {
        data: {
          _id: userCoupon._id,
          couponId: userCoupon.couponId,
          userId: 'current_user',
          orderId,
          discountAmount: 0,
          usedAt: new Date().toISOString(),
        },
        success: true,
      };
    } catch (error: any) {
      return { data: null as any, success: false, message: error.message || '使用优惠券失败' };
    }
  },

  // 获取使用记录
  getUsages: async (couponId?: string): Promise<ApiResponse<CouponUsage[]>> => {
    try {
      // @ts-ignore
      const { data: allUserCoupons } = await import('./coupon').then(m => m.couponService.getUserCoupons('current_user'));
      const usages = allUserCoupons
        .filter((uc: any) => uc.status === 'used' && (!couponId || uc.couponId === couponId))
        .map((uc: any) => ({
          _id: uc._id,
          couponId: uc.couponId,
          userId: uc.userId,
          orderId: uc.orderId || '',
          discountAmount: 0,
          usedAt: uc.usedAt,
        }));
      return { data: usages, success: true };
    } catch (error) {
      return { data: [], success: true };
    }
  },

  // 创建优惠券（管理员）
  create: async (data: Omit<Coupon, '_id' | 'usedCount' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Coupon>> => {
    try {
      const coupon = await dbCouponService.createCoupon({
        code: data.code,
        // @ts-ignore
        type: data.type,
        value: data.value,
        minAmount: data.minAmount,
        maxDiscount: data.maxDiscount,
        totalCount: data.totalCount,
        startDate: data.validFrom,
        endDate: data.validTo,
        status: data.status,
        applicableCourses: data.courseIds,
        // @ts-ignore
        description: data.description,
      });

      return {
        data: {
          _id: coupon._id,
          code: coupon.code,
          type: coupon.type as 'fixed' | 'percent',
          value: coupon.value,
          minAmount: coupon.minAmount || 0,
          maxDiscount: coupon.maxDiscount,
          totalCount: coupon.totalCount,
          usedCount: coupon.usedCount,
          validFrom: coupon.startDate,
          validTo: coupon.endDate,
          status: coupon.status as Coupon['status'],
          courseIds: coupon.applicableCourses,
          createdAt: coupon.createdAt,
          updatedAt: coupon.updatedAt,
        },
        success: true,
      };
    } catch (error: any) {
      console.error('创建优惠券失败:', error);
      return { data: null as any, success: false, message: error.message || '创建优惠券失败' };
    }
  },

  // 更新优惠券（管理员）
  update: async (id: string, data: Partial<Coupon>): Promise<ApiResponse<Coupon>> => {
    try {
      const updates: any = {};
      if (data.code !== undefined) updates.code = data.code;
      if (data.type !== undefined) updates.type = data.type;
      if (data.value !== undefined) updates.value = data.value;
      if (data.minAmount !== undefined) updates.minAmount = data.minAmount;
      if (data.maxDiscount !== undefined) updates.maxDiscount = data.maxDiscount;
      if (data.totalCount !== undefined) updates.totalCount = data.totalCount;
      if (data.status !== undefined) updates.status = data.status;
      if (data.courseIds !== undefined) updates.applicableCourses = data.courseIds;
      if (data.validFrom !== undefined) updates.startDate = data.validFrom;
      if (data.validTo !== undefined) updates.endDate = data.validTo;
      // @ts-ignore
      if (data.description !== undefined) updates.description = data.description;

      await dbCouponService.updateCoupon(id, updates);

      const updated = await dbCouponService.getCouponById(id);
      return {
        data: {
          _id: updated!._id,
          code: updated!.code,
          type: updated!.type as 'fixed' | 'percent',
          value: updated!.value,
          minAmount: updated!.minAmount || 0,
          maxDiscount: updated!.maxDiscount,
          totalCount: updated!.totalCount,
          usedCount: updated!.usedCount,
          validFrom: updated!.startDate,
          validTo: updated!.endDate,
          status: updated!.status as Coupon['status'],
          courseIds: updated!.applicableCourses,
          createdAt: updated!.createdAt,
          updatedAt: updated!.updatedAt,
        },
        success: true,
      };
    } catch (error: any) {
      console.error('更新优惠券失败:', error);
      return { data: null as any, success: false, message: error.message || '更新优惠券失败' };
    }
  },

  // 删除优惠券（管理员）
  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      await dbCouponService.deleteCoupon(id);
      return { success: true };
    } catch (error: any) {
      console.error('删除优惠券失败:', error);
      return { success: false, message: error.message || '删除优惠券失败' };
    }
  },

  // 禁用优惠券（管理员）
  disable: async (id: string): Promise<ApiResponse<Coupon>> => {
    return couponService.update(id, { status: 'disabled' });
  },

  // 获取统计
  getStats: async (): Promise<ApiResponse<{
    total: number;
    active: number;
    used: number;
    expired: number;
  }>> => {
    try {
      const coupons = await dbCouponService.getAllCoupons() || [];
      const couponList = Array.isArray(coupons) ? coupons : [];
      return {
        data: {
          total: couponList.length,
          active: couponList.filter(c => c?.status === 'active').length,
          used: couponList.reduce((sum, c) => sum + (c?.usedCount || 0), 0),
          expired: couponList.filter(c => c?.status === 'expired').length,
        },
        success: true,
      };
    } catch (error) {
      console.error('获取优惠券统计失败:', error);
      return { data: { total: 0, active: 0, used: 0, expired: 0 }, success: true };
    }
  },
};
