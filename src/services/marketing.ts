// ============================================================================
// 营销工具服务导出
// ============================================================================
export { couponService, default as coupon } from './coupon';
export { groupBuyService, default as groupBuy } from './groupBuy';
export { flashSaleService, default as flashSale } from './flashSale';

// 类型导出
export type { Coupon, UserCoupon } from './coupon';
export type { GroupBuyActivity, GroupBuyTeam, GroupBuyMember } from './groupBuy';
export type { FlashSale } from './flashSale';
