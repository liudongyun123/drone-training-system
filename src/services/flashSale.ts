// ============================================================================
// 限时优惠服务
// ★ Stage 3 迁移：数据库操作统一走 HTTP → adminService → db-init 云函数
// ============================================================================
import { adminService } from './adminService';

export interface FlashSale {
  _id: string;
  courseId: string;
  courseTitle: string;
  originalPrice: number;
  salePrice: number;
  stock: number;
  soldCount: number;
  startTime: string;
  endTime: string;
  status: 'pending' | 'active' | 'ended';
  description?: string;
  tags?: string[];
  priority: number;
  createdAt: string;
  updatedAt: string;
}

const FLASH_SALE_COLLECTION = 'flashSales';

const extractList = <T>(result: any): T[] => result?.data?.list || result?.data || [];

export const flashSaleService = {
  /**
   * 获取所有限时优惠（管理员）
   */
  async getAllFlashSales(): Promise<FlashSale[]> {
    const result = await adminService.list(FLASH_SALE_COLLECTION, {}, { limit: 200 });
    return extractList<FlashSale>(result);
  },

  /**
   * 获取当前活跃的限时优惠
   */
  async getActiveFlashSales(): Promise<FlashSale[]> {
    const now = new Date().toISOString();
    const result = await adminService.listWithOps(FLASH_SALE_COLLECTION, {
      status: 'active',
      startTime: { '$lte': now },
      endTime: { '$gte': now },
    }, { orderBy: 'priority', order: 'desc', limit: 100 });
    return extractList<FlashSale>(result);
  },

  /**
   * 获取即将开始的限时优惠
   */
  async getUpcomingFlashSales(): Promise<FlashSale[]> {
    const now = new Date().toISOString();
    const result = await adminService.listWithOps(FLASH_SALE_COLLECTION, {
      status: 'pending',
      startTime: { '$gt': now },
    }, { orderBy: 'startTime', order: 'asc', limit: 100 });
    return extractList<FlashSale>(result);
  },

  /**
   * 根据课程ID获取限时优惠
   */
  async getFlashSaleByCourseId(courseId: string): Promise<FlashSale | null> {
    const now = new Date().toISOString();
    const result = await adminService.listWithOps(FLASH_SALE_COLLECTION, {
      courseId,
      status: 'active',
      startTime: { '$lte': now },
      endTime: { '$gte': now },
    }, { limit: 1 });
    const list = extractList<FlashSale>(result);
    return list.length > 0 ? list[0] : null;
  },

  /**
   * 根据ID获取限时优惠
   */
  async getFlashSaleById(saleId: string): Promise<FlashSale | null> {
    const res = await adminService.get(FLASH_SALE_COLLECTION, saleId);
    return res?.data as FlashSale || null;
  },

  /**
   * 创建限时优惠（管理员）
   */
  async createFlashSale(
    sale: Omit<FlashSale, '_id' | 'soldCount' | 'createdAt' | 'updatedAt'>
  ): Promise<FlashSale> {
    const now = new Date().toISOString();
    const status = new Date(sale.startTime) > new Date(now) ? 'pending' : 'active';
    
    const doc = { ...sale, status, soldCount: 0, createdAt: now, updatedAt: now };
    const { data: result } = await adminService.add(FLASH_SALE_COLLECTION, doc);
    return { _id: result.id, ...doc } as FlashSale;
  },

  /**
   * 更新限时优惠（管理员）
   */
  async updateFlashSale(saleId: string, updates: Partial<FlashSale>): Promise<boolean> {
    await adminService.update(FLASH_SALE_COLLECTION, saleId, { ...updates, updatedAt: new Date().toISOString() });
    return true;
  },

  /**
   * 删除限时优惠（管理员）
   */
  async deleteFlashSale(saleId: string): Promise<boolean> {
    await adminService.delete(FLASH_SALE_COLLECTION, saleId);
    return true;
  },

  /**
   * 验证限时优惠
   */
  async validateFlashSale(saleId: string): Promise<{
    valid: boolean; sale?: FlashSale; error?: string;
  }> {
    const sale = await this.getFlashSaleById(saleId);
    if (!sale) return { valid: false, error: '限时优惠不存在' };
    if (sale.status !== 'active') return { valid: false, error: '限时优惠未开始或已结束' };
    if (sale.soldCount >= sale.stock) return { valid: false, error: '限时优惠已售罄' };
    
    const now = new Date().toISOString();
    if (sale.startTime > now) return { valid: false, error: '限时优惠尚未开始' };
    if (sale.endTime < now) return { valid: false, error: '限时优惠已结束' };
    
    return { valid: true, sale };
  },

  /**
   * 购买限时优惠（更新库存）
   */
  async purchaseFlashSale(saleId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const validation = await this.validateFlashSale(saleId);
    if (!validation.valid || !validation.sale) throw new Error(validation.error || '限时优惠无效');
    
    const sale = validation.sale;
    if (sale.soldCount >= sale.stock) throw new Error('限时优惠已售罄');
    
    const newSoldCount = sale.soldCount + 1;
    const updates: any = { soldCount: newSoldCount, updatedAt: now };
    if (newSoldCount >= sale.stock) updates.status = 'ended';
    
    await adminService.update(FLASH_SALE_COLLECTION, saleId, updates);
    return true;
  },

  /**
   * 取消购买（回滚库存）
   */
  async cancelPurchase(saleId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const sale = await this.getFlashSaleById(saleId);
    if (!sale) throw new Error('限时优惠不存在');
    if (sale.soldCount <= 0) throw new Error('没有可取消的购买记录');
    
    await adminService.update(FLASH_SALE_COLLECTION, saleId, {
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
    days: number; hours: number; minutes: number; seconds: number; isExpired: boolean;
  } {
    const now = new Date().getTime();
    const end = new Date(sale.endTime).getTime();
    const remaining = end - now;
    
    if (remaining <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    
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
    if (remaining.isExpired) return '已结束';
    
    const parts: string[] = [];
    if (remaining.days > 0) parts.push(`${remaining.days}天`);
    if (remaining.hours > 0 || remaining.days > 0) parts.push(`${remaining.hours}小时`);
    if (remaining.minutes > 0 || remaining.days > 0 || remaining.hours > 0) parts.push(`${remaining.minutes}分`);
    parts.push(`${remaining.seconds}秒`);
    
    return parts.join('');
  },

  /**
   * 计算折扣百分比
   */
  getDiscountPercentage(sale: FlashSale): number {
    const discount = sale.originalPrice - sale.salePrice;
    return Math.round((discount / sale.originalPrice) * 100);
  },

  /**
   * 自动更新过期限时优惠状态（定时任务）
   */
  async updateExpiredFlashSales(): Promise<number> {
    const now = new Date().toISOString();
    
    // 更新待开始的活动为进行中
    const startingResult = await adminService.listWithOps(FLASH_SALE_COLLECTION, {
      status: 'pending',
      startTime: { '$lte': now },
      endTime: { '$gte': now },
    }, { limit: 100 });
    const startingSales = extractList<FlashSale>(startingResult);
    
    for (const sale of startingSales) {
      await adminService.update(FLASH_SALE_COLLECTION, sale._id, { status: 'active', updatedAt: now });
    }
    
    // 更新已结束的活动
    const endedResult = await adminService.listWithOps(FLASH_SALE_COLLECTION, {
      status: 'active',
      endTime: { '$lt': now },
    }, { limit: 100 });
    const endedSales = extractList<FlashSale>(endedResult);
    
    for (const sale of endedSales) {
      await adminService.update(FLASH_SALE_COLLECTION, sale._id, { status: 'ended', updatedAt: now });
    }
    
    return startingSales.length + endedSales.length;
  },

  /**
   * 获取限时优惠统计数据（管理员）
   */
  async getStatistics(saleId?: string): Promise<{
    totalSales: FlashSale[]; totalSold: number; totalRevenue: number; bestSelling?: FlashSale;
  }> {
    if (saleId) {
      const sale = await this.getFlashSaleById(saleId);
      if (!sale) throw new Error('限时优惠不存在');
      
      return {
        totalSales: [sale],
        totalSold: sale.soldCount,
        totalRevenue: sale.soldCount * sale.salePrice,
        bestSelling: sale,
      };
    }
    
    const result = await adminService.list(FLASH_SALE_COLLECTION, {}, { limit: 200 });
    const salesData = extractList<FlashSale>(result);
    
    const totalSold = salesData.reduce((sum, sale) => sum + sale.soldCount, 0);
    const totalRevenue = salesData.reduce((sum, sale) => sum + sale.soldCount * sale.salePrice, 0);
    const bestSelling = salesData.reduce((best, sale) => sale.soldCount > (best?.soldCount || 0) ? sale : best, undefined as FlashSale | undefined);
    
    return { totalSales: salesData, totalSold, totalRevenue, bestSelling };
  },
};

export default flashSaleService;
