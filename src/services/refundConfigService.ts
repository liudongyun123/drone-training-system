// @ts-nocheck
/**
 * 退款规则配置服务
 * 配置存储在 refundConfig 集合（_id: 'refundConfig'），由管理后台设置页读写
 */
import { adminService } from './adminService'

export const refundConfigService = {
  // 获取退款配置（培训班固定比例 + 课程阶梯规则）
  async getConfig() {
    try {
      const res: any = await adminService.callFunction('api-order', { action: 'getRefundConfig' })
      return res
    } catch (error: any) {
      return { code: -1, message: error.message || '获取退款配置失败' }
    }
  },

  // 保存退款配置
  async saveConfig(cfg: { classFeeRate?: number; classOverrides?: Record<string, number>; courseTiers?: any[] }) {
    try {
      const res: any = await adminService.callFunction('api-order', { action: 'saveRefundConfig', data: cfg })
      return res
    } catch (error: any) {
      return { code: -1, message: error.message || '保存退款配置失败' }
    }
  }
}

export default refundConfigService
