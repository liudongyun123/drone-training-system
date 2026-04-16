// ============================================================================
// 优惠券列表组件
// ============================================================================
import { useState, useEffect } from 'react';
import { Gift, Clock, CheckCircle, XCircle, Ticket } from 'lucide-react';
import { couponService, Coupon } from '@/services/coupon';
import type { Coupon as CouponType } from '@/types/service';

interface CouponListProps {
  userId?: string;
  mode?: 'available' | 'used' | 'expired' | 'all';
  onSelect?: (coupon: Coupon) => void;
  selectedCouponId?: string;
}

export default function CouponList({
  userId,
  mode = 'available',
  onSelect,
  selectedCouponId,
}: CouponListProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, [userId, mode]);

  const loadCoupons = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const userCoupons = await couponService.getUserCoupons(userId);
      
      let filteredCoupons: CouponType[] = [];
      
      switch (mode) {
        case 'available':
          filteredCoupons = userCoupons
            .filter(uc => uc.status === 'unused' && uc.expiresAt > new Date().toISOString())
            .map(uc => uc.coupon);
          break;
        case 'used':
          filteredCoupons = userCoupons
            .filter(uc => uc.status === 'used')
            .map(uc => uc.coupon);
          break;
        case 'expired':
          filteredCoupons = userCoupons
            .filter(uc => uc.status === 'expired' || uc.expiresAt < new Date().toISOString())
            .map(uc => uc.coupon);
          break;
        case 'all':
          filteredCoupons = userCoupons.map(uc => uc.coupon);
          break;
      }
      
      setCoupons(filteredCoupons);
    } catch (err: any) {
      console.error('加载优惠券失败:', err);
      setError(err.message || '加载优惠券失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="badge badge-success gap-1">
            <CheckCircle size={12} />
            可用
          </span>
        );
      case 'expired':
        return (
          <span className="badge badge-error gap-1">
            <XCircle size={12} />
            已过期
          </span>
        );
      case 'disabled':
        return (
          <span className="badge badge-ghost gap-1">
            <XCircle size={12} />
            已失效
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <XCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="text-center py-12 text-base-content/60">
        <Ticket size={48} className="mx-auto mb-4 opacity-50" />
        <p>暂无优惠券</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {coupons.map((coupon) => (
        <div
          key={coupon._id}
          className={`card bg-base-100 shadow-lg border-2 transition-all ${
            selectedCouponId === coupon._id
              ? 'border-primary'
              : 'border-base-300 hover:border-primary/50'
          } ${
            mode === 'expired' || coupon.status !== 'active'
              ? 'opacity-60'
              : 'cursor-pointer'
          }`}
          onClick={() =>
            mode === 'available' && onSelect && coupon.status === 'active'
              ? onSelect(coupon)
              : null
          }
        >
          <div className="card-body p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Gift className="text-primary" size={20} />
                    <h3 className="font-bold text-lg">{coupon.description || '优惠券'}</h3>
                  </div>
                  {getStatusBadge(coupon.status)}
                </div>
                
                <div className="mb-2">
                  <span className="text-2xl font-bold text-primary">
                    {coupon.type === 'fixed' ? `¥${coupon.value}` : `${coupon.value}%`}
                  </span>
                  <span className="text-sm text-base-content/60 ml-1">
                    {coupon.type === 'fixed' ? '减免' : '折扣'}
                  </span>
                  {coupon.minAmount && (
                    <span className="text-sm text-base-content/60 ml-2">
                      满¥{coupon.minAmount}可用
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-base-content/60">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>
                      {formatDate(coupon.startDate)} - {formatDate(coupon.endDate)}
                    </span>
                  </div>
                  {coupon.maxDiscount && (
                    <span>最高减¥{coupon.maxDiscount}</span>
                  )}
                </div>
              </div>

              {selectedCouponId === coupon._id && (
                <div className="ml-4">
                  <CheckCircle size={24} className="text-primary" />
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-base-200">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">券码：</span>
                <code className="bg-base-200 px-2 py-1 rounded text-sm">
                  {coupon.code}
                </code>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
