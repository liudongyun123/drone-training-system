// ============================================================================
// 限时优惠服务
// ============================================================================
import { app } from '@/utils/cloudbase';

export interface FlashSale {
  _id: string;
  courseId: string; // 课程ID
  courseTitle: string; // 课程标题
  originalPrice: number; // 原价
  salePrice: number; // 限时价
  stock: number; // 库存数量
  soldCount: number; // 已售数量
  startTime: string; // 开始时间
  endTime: string; // 结束时间
  status: 'pending' | 'active' | 'ended'; // 状态
  description?: string; // 活动描述
  tags?: string[]; // 标签（如：热卖、推荐等）
  priority: number; // 优先级（用于排序）
  createdAt: string;
  updatedAt: string;
}

const FLASH_SALE_COLLECTION = 'flashSales';

export const flashSaleService = {
  /**
   * 获取所有限时优惠（管理员）
   */
  async getAllFlashSales(): Promise<FlashSale[]> {
    const db = app.database();
    const { data } = await db.collection(FLASH_SALE_COLLECTION).get();
    return data as FlashSale[];
  },

  /**
   * 获取当前活跃的限时优惠
   */
  async getActiveFlashSales(): Promise<FlashSale[]> {
    const db = app.database();
    const now = new Date().toISOString();
    const { data } = await db
      .collection(FLASH_SALE_COLLECTION)
      .where({
        status: 'active',
        startTime: db.command.lte(now),
        endTime: db.command.gte(now),
      })
      .orderBy('priority', 'desc')
      .get();
    
    return data as FlashSale[];
  },

  /**
   * 获取即将开始的限时优惠
   */
  async getUpcomingFlashSales(): Promise<FlashSale[]> {
    const db = app.database();
    const now = new Date().toISOString();
    const { data } = await db
      .collection(FLASH_SALE_COLLECTION)
      .where({
        status: 'pending',
        startTime: db.command.gt(now),
      })
      .orderBy('startTime', 'asc')
      .get();
    
    return data as FlashSale[];
  },

  /**
   * 根据课程ID获取限时优惠
   */
  async getFlashSaleByCourseId(courseId: string): Promise<FlashSale | null> {
    const db = app.database();
    const now = new Date().toISOString();
    const { data } = await db
      .collection(FLASH_SALE_COLLECTION)
      .where({
        courseId,
        status: 'active',
        startTime: db.command.lte(now),
        endTime: db.command.gte(now),
      })
      .get();
    
    return data.length > 0 ? (data[0] as FlashSale) : null;
  },

  /**
   * 根据ID获取限时优惠
   */
  async getFlashSaleById(saleId: string): Promise<FlashSale | null> {
    const db = app.database();
    const { data } = await db.collection(FLASH_SALE_COLLECTION).doc(saleId).get();
    return data ? (data as FlashSale) : null;
  },

  /**
   * 创建限时优惠（管理员）
   */
  async createFlashSale(
    sale: Omit<FlashSale, '_id' | 'soldCount' | 'createdAt' | 'updatedAt'>
  ): Promise<FlashSale> {
    const db = app.database();
    const now = new Date().toISOString();
    
    // 根据开始时间自动设置状态
    const status = new Date(sale.startTime) > new Date(now) ? 'pending' : 'active';
    
    const doc = {
      ...sale,
      status,
      soldCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    const { data: result } = await db.collection(FLASH_SALE_COLLECTION).add(doc);
    return { _id: result.id, ...doc } as FlashSale;
  },

  /**
   * 更新限时优惠（管理员）
   */
  async updateFlashSale(
    saleId: string,
    updates: Partial<FlashSale>
  ): Promise<boolean> {
    const db = app.database();
    const now = new Date().toISOString();
    
    await db.collection(FLASH_SALE_COLLECTION).doc(saleId).update({
      ...updates,
      updatedAt: now,
    });
    
    return true;
  },

  /**
   * 删除限时优惠（管理员）
   */
  async deleteFlashSale(saleId: string): Promise<boolean> {
    const db = app.database();
    await db.collection(FLASH_SALE_COLLECTION).doc(saleId).remove();
    return true;
  },

  /**
   * 验证限时优惠
   */
  async validateFlashSale(saleId: string): Promise<{
    valid: boolean;
    sale?: FlashSale;
    error?: string;
  }> {
    const sale = await this.getFlashSaleById(saleId);
    
    if (!sale) {
      return { valid: false, error: '限时优惠不存在' };
    }
    
    // 检查状态
    if (sale.status !== 'active') {
      return { valid: false, error: '限时优惠未开始或已结束' };
    }
    
    // 检查库存
    if (sale.soldCount >= sale.stock) {
      return { valid: false, error: '限时优惠已售罄' };
    }
    
    // 检查时间
    const now = new Date().toISOString();
    if (sale.startTime > now) {
      return { valid: false, error: '限时优惠尚未开始' };
    }
    if (sale.endTime < now) {
      return { valid: false, error: '限时优惠已结束' };
    }
    
    return { valid: true, sale };
  },

  /**
   * 购买限时优惠（更新库存）
   */
  async purchaseFlashSale(saleId: string): Promise<boolean> {
    const db = app.database();
    const now = new Date().toISOString();
    
    // 验证
    const validation = await this.validateFlashSale(saleId);
    if (!validation.valid || !validation.sale) {
      throw new Error(validation.error || '限时优惠无效');
    }
    
    const sale = validation.sale;
    
    // 检查库存
    if (sale.soldCount >= sale.stock) {
      throw new Error('限时优惠已售罄');
    }
    
    // 更新库存和销售数量
    await db.collection(FLASH_SALE_COLLECTION).doc(saleId).update({
      soldCount: sale.soldCount + 1,
      updatedAt: now,
    });
    
    // 检查是否售罄
    if (sale.soldCount + 1 >= sale.stock) {
      await db.collection(FLASH_SALE_COLLECTION).doc(saleId).update({
        status: 'ended',
        updatedAt: now,
      });
    }
    
    return true;
  },

  /**
   * 取消购买（回滚库存）
   */
  async cancelPurchase(saleId: string): Promise<boolean> {
    const db = app.database();
    const now = new Date().toISOString();
    
    const sale = await this.getFlashSaleById(saleId);
    if (!sale) {
      throw new Error('限时优惠不存在');
    }
    
    // 确保有销售记录
    if (sale.soldCount <= 0) {
      throw new Error('没有可取消的购买记录');
    }
    
    // 更新库存和销售数量
    await db.collection(FLASH_SALE_COLLECTION).doc(saleId).update({
      soldCount: sale.soldCount - 1,
      status: sale.status === 'ended' ? 'active' : sale.status,
      updatedAt: now,
    });
    
    return true;
  },

  /**
   * 计算剩余时间
   */
  getRemainingTime(sale: FlashSale): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } {
    const now = new Date().getTime();
    const end = new Date(sale.endTime).getTime();
    const remaining = end - now;
    
    if (remaining <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
      };
    }
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds, isExpired: false };
  },

  /**
   * 计算倒计时文本
   */
  getCountdownText(remaining: ReturnType<typeof flashSaleService.getRemainingTime>): string {
    if (remaining.isExpired) {
      return '已结束';
    }
    
    const parts: string[] = [];
    
    if (remaining.days > 0) {
      parts.push(`${remaining.days}天`);
    }
    if (remaining.hours > 0 || remaining.days > 0) {
      parts.push(`${remaining.hours}小时`);
    }
    if (remaining.minutes > 0 || remaining.days > 0 || remaining.hours > 0) {
      parts.push(`${remaining.minutes}分`);
    }
    parts.push(`${remaining.seconds}秒`);
    
    return parts.join('');
  },

  /**
   * 计算折扣百分比
   */
  getDiscountPercentage(sale: FlashSale): number {
    const discount = sale.originalPrice - sale.salePrice;
    const percentage = Math.round((discount / sale.originalPrice) * 100);
    return percentage;
  },

  /**
   * 自动更新过期限时优惠状态（定时任务）
   */
  async updateExpiredFlashSales(): Promise<number> {
    const db = app.database();
    const now = new Date().toISOString();
    
    // 更新待开始的活动为进行中
    const { data: startingSales } = await db
      .collection(FLASH_SALE_COLLECTION)
      .where({
        status: 'pending',
        startTime: db.command.lte(now),
        endTime: db.command.gte(now),
      })
      .get();
    
    for (const sale of startingSales) {
      await db.collection(FLASH_SALE_COLLECTION).doc(sale._id).update({
        status: 'active',
        updatedAt: now,
      });
    }
    
    // 更新已结束的活动
    const { data: endedSales } = await db
      .collection(FLASH_SALE_COLLECTION)
      .where({
        status: 'active',
        endTime: db.command.lt(now),
      })
      .get();
    
    for (const sale of endedSales) {
      await db.collection(FLASH_SALE_COLLECTION).doc(sale._id).update({
        status: 'ended',
        updatedAt: now,
      });
    }
    
    return startingSales.length + endedSales.length;
  },

  /**
   * 获取限时优惠统计数据（管理员）
   */
  async getStatistics(saleId?: string): Promise<{
    totalSales: FlashSale[];
    totalSold: number;
    totalRevenue: number;
    bestSelling?: FlashSale;
  }> {
    const db = app.database();
    
    if (saleId) {
      // 单个活动统计
      const sale = await this.getFlashSaleById(saleId);
      if (!sale) {
        throw new Error('限时优惠不存在');
      }
      
      return {
        totalSales: [sale],
        totalSold: sale.soldCount,
        totalRevenue: sale.soldCount * sale.salePrice,
        bestSelling: sale,
      };
    }
    
    // 所有活动统计
    const { data: sales } = await db.collection(FLASH_SALE_COLLECTION).get();
    const salesData = sales as FlashSale[];
    
    const totalSold = salesData.reduce((sum, sale) => sum + sale.soldCount, 0);
    const totalRevenue = salesData.reduce(
      (sum, sale) => sum + sale.soldCount * sale.salePrice,
      0
    );
    
    const bestSelling = salesData.reduce(
      (best, sale) =>
        sale.soldCount > (best?.soldCount || 0) ? sale : best,
      undefined
    );
    
    return {
      totalSales: salesData,
      totalSold,
      totalRevenue,
      bestSelling,
    };
  },
};

export default flashSaleService;
