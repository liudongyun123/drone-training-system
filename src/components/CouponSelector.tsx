/**
 * 优惠券选择组件 - 用于结算页面
 */
import { useState, useEffect } from 'react';
import { 
  Ticket, Tag, ChevronDown, ChevronUp, 
  CheckCircle, X, Gift
} from 'lucide-react';
import { couponService } from '@/services/couponService';
import { formatDateStr, parseDate } from '@/utils/dateUtils';

interface Coupon {
  _id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  minAmount: number;
  maxDiscount?: number;
  description?: string;
  validTo: string;
}

interface CouponSelectorProps {
  orderAmount: number;
  courseIds?: string[];
  onSelect: (coupon: Coupon | null, discount: number) => void;
  selectedCouponCode?: string;
}

export default function CouponSelector({ 
  orderAmount, 
  courseIds,
  onSelect, 
  selectedCouponCode 
}: CouponSelectorProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  // 加载可用优惠券
  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await couponService.getList({ status: 'active' });
      // 过滤出满足条件的优惠券
      // @ts-ignore
      const validCoupons = res.data.filter((c: Coupon) => {
        // 检查最低金额
        if (orderAmount < c.minAmount) return false;
        // 检查有效期
        const validToDate = parseDate(c.validTo);
        if (!validToDate || validToDate < new Date()) return false;
        // 检查课程限制
        // @ts-ignore
        if (courseIds && c.courseIds && c.courseIds.length > 0) {
          // @ts-ignore
          return courseIds.some(id => c.courseIds?.includes(id));
        }
        return true;
      });
      setCoupons(validCoupons);
    } catch (err) {
      console.error('加载优惠券失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 计算优惠金额
  const calculateDiscount = (coupon: Coupon): number => {
    let discount = 0;
    if (coupon.type === 'fixed') {
      discount = coupon.value;
    } else {
      discount = Math.floor(orderAmount * coupon.value / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    }
    // 优惠金额不能超过订单金额
    return Math.min(discount, orderAmount);
  };

  // 选择优惠券
  const handleSelect = (coupon: Coupon) => {
    if (selectedCoupon?._id === coupon._id) {
      // 取消选择
      setSelectedCoupon(null);
      onSelect(null, 0);
    } else {
      setSelectedCoupon(coupon);
      const discount = calculateDiscount(coupon);
      onSelect(coupon, discount);
    }
  };

  // 手动输入优惠券码
  const handleManualApply = async () => {
    if (!manualCode.trim()) return;
    
    setError('');
    setLoading(true);
    
    try {
      const res = await couponService.validate(manualCode, undefined, orderAmount);
      if (res.success && res.data.valid) {
        const coupon = res.data.coupon!;
        setSelectedCoupon(coupon);
        onSelect(coupon, res.data.discount);
        setManualCode('');
      } else {
        setError(res.message || '优惠券无效');
      }
    } catch (err: any) {
      setError(err.message || '验证失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取优惠显示文本
  const getDiscountText = (coupon: Coupon): string => {
    if (coupon.type === 'fixed') {
      return `¥${coupon.value}`;
    } else {
      return `${coupon.value}%`;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <Ticket className="w-5 h-5 text-blue-600 mr-2" />
          <span className="font-medium text-gray-900">
            {selectedCoupon ? '已使用优惠券' : '使用优惠券'}
          </span>
          {selectedCoupon && (
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded text-sm font-medium">
              -¥{calculateDiscount(selectedCoupon)}
            </span>
          )}
        </div>
        <div className="flex items-center text-gray-500">
          {selectedCoupon ? (
            <span className="text-sm text-blue-600 mr-2">{selectedCoupon.code}</span>
          ) : (
            <span className="text-sm text-gray-400 mr-2">
              {coupons.length} 张可用
            </span>
          )}
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div className="p-4 border-t border-gray-100">
          {/* 手动输入 */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="输入优惠券码"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={handleManualApply}
              disabled={!manualCode.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              应用
            </button>
          </div>
          {error && (
            <div className="text-red-500 text-sm mb-3">{error}</div>
          )}

          {/* 优惠券列表 */}
          {loading ? (
            <div className="text-center py-4 text-gray-500">加载中...</div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无可用优惠券</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {coupons.map((coupon) => {
                const isSelected = selectedCoupon?._id === coupon._id;
                const discount = calculateDiscount(coupon);
                
                return (
                  <div
                    key={coupon._id}
                    onClick={() => handleSelect(coupon)}
                    className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-900">
                            {coupon.description || '优惠券'}
                          </span>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-lg font-bold text-red-600">
                            {getDiscountText(coupon)}
                          </span>
                          <span className="text-sm text-gray-500">
                            满¥{coupon.minAmount}可用
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          有效期至 {formatDateStr(coupon.validTo)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">
                          -¥{discount}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 取消选择 */}
          {selectedCoupon && (
            <button
              onClick={() => {
                setSelectedCoupon(null);
                onSelect(null, 0);
              }}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              不使用优惠券
            </button>
          )}
        </div>
      )}
    </div>
  );
}
