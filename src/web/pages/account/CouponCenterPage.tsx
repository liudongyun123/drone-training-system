/**
 * 优惠券领取中心 - 用户可以领取优惠券
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Gift, Ticket, Clock, Users, AlertCircle, 
  ChevronRight, Copy, CheckCircle, Percent, Tag
} from 'lucide-react';
import Loading from '@/components/Loading';
import { useAuthStore } from '@/store/authStore';
import { couponService } from '@/services/couponService';

interface Coupon {
  _id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  minAmount: number;
  maxDiscount?: number;
  description: string;
  totalCount: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  tags?: string[];
}

export default function CouponCenterPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadCoupons();
  }, [isAuthenticated, navigate]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      // 从数据库读取可领取的优惠券
      const result = await couponService.getAvailableCoupons();
      if (result && result.length > 0) {
        setCoupons(result);
      } else {
        setCoupons([]);
      }
    } catch (error) {
      console.error('加载优惠券失败:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimCoupon = async (couponId: string) => {
    setClaimingId(couponId);
    try {
      const success = await couponService.claimCoupon(couponId);
      if (success) {
        setClaimedIds(prev => new Set(prev).add(couponId));
      }
    } catch (error) {
      console.error('领取优惠券失败:', error);
    } finally {
      setClaimingId(null);
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

  // 计算剩余天数
  const getRemainingDays = (validTo: string): number => {
    const end = new Date(validTo);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // 计算剩余百分比
  const getRemainingPercent = (coupon: Coupon): number => {
    if (!coupon.totalCount) return 0;
    return Math.round(((coupon.totalCount - coupon.usedCount) / coupon.totalCount) * 100);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Gift className="w-8 h-8 mr-3 text-blue-600" />
            优惠券领取中心
          </h1>
          <p className="mt-2 text-gray-600">领取优惠券，享受课程折扣</p>
        </div>

        {/* 优惠券列表 */}
        {coupons.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Gift className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无可领取的优惠券</h3>
            <p className="text-gray-500 mb-4">管理员尚未发放优惠券，请耐心等待</p>
            <button
              onClick={() => navigate('/courses')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              浏览课程
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => {
              const isClaimed = claimedIds.has(coupon._id);
              const remainingPercent = getRemainingPercent(coupon);
              const remainingDays = getRemainingDays(coupon.validTo);
              const isLowStock = remainingPercent <= 20;
              
              return (
                <div
                  key={coupon._id}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                    isClaimed ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex">
                    {/* 左侧金额区 */}
                    <div className={`w-32 flex-shrink-0 flex flex-col items-center justify-center p-4 ${
                      isClaimed ? 'bg-gray-100' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    }`}>
                      <div className={`text-3xl font-bold ${isClaimed ? 'text-gray-500' : 'text-white'}`}>
                        {getDiscountText(coupon)}
                      </div>
                      <div className={`text-xs mt-1 ${isClaimed ? 'text-gray-500' : 'text-blue-100'}`}>
                        {coupon.type === 'fixed' ? '减免' : '折扣'}
                      </div>
                    </div>

                    {/* 右侧信息区 */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">{coupon.description}</span>
                            {coupon.tags?.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                          
                          <div className="text-sm text-gray-500 mb-2">
                            满¥{coupon.minAmount}可用
                            {coupon.maxDiscount && ` · 最高减¥${coupon.maxDiscount}`}
                          </div>
                          
                          {/* 进度条 */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  isLowStock ? 'bg-orange-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${remainingPercent}%` }}
                              />
                            </div>
                            <span className={`text-xs ${isLowStock ? 'text-orange-500' : 'text-gray-500'}`}>
                              剩余{remainingPercent}%
                            </span>
                          </div>
                          
                          {/* 有效期 */}
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {remainingDays > 30 ? (
                                <span>有效期至 {new Date(coupon.validTo).toLocaleDateString()}</span>
                              ) : (
                                <span className="text-orange-500">剩余{remainingDays}天</span>
                              )}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              已领{coupon.usedCount}张
                            </div>
                          </div>
                        </div>

                        {/* 领取按钮 */}
                        <div className="ml-4">
                          <button
                            onClick={() => handleClaimCoupon(coupon._id)}
                            disabled={isClaimed || claimingId === coupon._id}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isClaimed
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : claimingId === coupon._id
                                  ? 'bg-blue-400 text-white cursor-wait'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isClaimed ? (
                              <span className="flex items-center">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                已领取
                              </span>
                            ) : claimingId === coupon._id ? (
                              '领取中...'
                            ) : (
                              '立即领取'
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 券码 */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-gray-400" />
                          <code className="text-sm text-gray-600">{coupon.code}</code>
                        </div>
                        {isLowStock && !isClaimed && (
                          <span className="text-xs text-orange-500 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            数量有限，先到先得
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 使用提示 */}
        <div className="mt-8 bg-blue-50 rounded-xl p-4">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            领取说明
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 每人每种优惠券只能领取一次</li>
            <li>• 领取后的优惠券可在「我的优惠券」中查看</li>
            <li>• 优惠券数量有限，先到先得</li>
            <li>• 请在有效期内使用，过期将自动失效</li>
          </ul>
        </div>

        {/* 我的优惠券入口 */}
        <div className="mt-4">
          <button
            onClick={() => navigate('/coupons')}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            查看我的优惠券
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}