/**
 * 购物车页面
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, Gift, AlertCircle } from 'lucide-react';
import { cartService } from '@/services/cart';
import { couponService } from '@/services/coupon';
import { useAuthStore } from '@/store/authStore';
import type { CartItem as CartItemType } from '@/types/service';
import { Loading, EmptyState, Button, toast } from '@/components';

export default function CartPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [showCouponList, setShowCouponList] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [userCoupons, setUserCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadCart();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadCart = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const items = await cartService.getCart(user.id);
      setCartItems(items);
    } catch (error) {
      console.error('加载购物车失败:', error);
      toast.error('加载购物车失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUserCoupons = async () => {
    if (!user?.id) return;
    
    setLoadingCoupons(true);
    try {
      const coupons = await couponService.getUserAvailableCoupons(user.id);
      setUserCoupons(coupons);
    } catch (error) {
      console.error('加载优惠券失败:', error);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleRemove = async (courseId: string) => {
    if (!user?.id) return;

    try {
      await cartService.removeFromCart(user.id, courseId);
      toast.success('已从购物车移除');
      await loadCart();
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.warning('购物车为空');
      return;
    }
    navigate('/checkout', { 
      state: { 
        cartItems,
        selectedCoupon,
        couponDiscount,
        totalAmount,
        finalAmount,
      } 
    });
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);
  const finalAmount = totalAmount - couponDiscount;

  // 处理优惠券选择
  const handleCouponSelect = async (userCoupon: any) => {
    const coupon = userCoupon.coupon;
    setSelectedCoupon(coupon);
    setShowCouponList(false);

    // 计算折扣
    const discount = couponService.calculateDiscount(coupon, totalAmount);
    setCouponDiscount(discount);
    toast.success(`已使用优惠券，节省 ¥${discount.toFixed(2)}`);
  };

  // 移除优惠券
  const handleRemoveCoupon = () => {
    setSelectedCoupon(null);
    setCouponDiscount(0);
    toast.info('已移除优惠券');
  };

  // 显示优惠券列表
  const handleShowCoupons = () => {
    if (!showCouponList) {
      loadUserCoupons();
    }
    setShowCouponList(!showCouponList);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="container mx-auto px-4">
          <EmptyState
            type="default"
            title="请先登录"
            description="登录后查看您的购物车"
            action={
              <Link to="/login" className="btn btn-primary">
                去登录
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">购物车</h1>

        {cartItems.length === 0 ? (
          <EmptyState
            type="cart"
            title="购物车是空的"
            description="快去选购心仪的课程吧"
            action={
              <Link to="/courses" className="btn btn-primary">
                浏览课程
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 购物车列表 */}
            <div className="lg:col-span-2">
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body p-0">
                  {cartItems.map((item) => (
                    <div key={item.courseId} className="p-4 border-b last:border-b-0">
                      <div className="flex gap-4">
                        <div className="w-32 h-20 rounded overflow-hidden flex-shrink-0">
                          <img
                            src={item.courseCover || 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=128'}
                            alt={item.courseTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold mb-2 truncate">{item.courseTitle}</h3>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                              {'讲师'}
                            </div>
                            <div className="text-lg font-bold text-primary">
                              ¥{item.price}
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn btn-square btn-ghost text-red-500 hover:bg-red-50"
                          onClick={() => handleRemove(item.courseId)}
                          title="删除"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 结算信息 */}
            <div>
              <div className="card bg-base-100 shadow-xl sticky top-4">
                <div className="card-body">
                  <h2 className="card-title">订单信息</h2>

                  <div className="divider"></div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">商品数量</span>
                      <span>{cartItems.length} 件</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">商品总额</span>
                      <span>¥{totalAmount.toFixed(2)}</span>
                    </div>

                    {/* 优惠券 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Gift size={18} />
                        <span>优惠券</span>
                      </div>
                      {selectedCoupon ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-primary font-medium">
                            {selectedCoupon.type === 'fixed' 
                              ? `¥${selectedCoupon.value}` 
                              : `${selectedCoupon.value}%`} 
                            减免
                          </span>
                          <button
                            className="text-red-500 text-sm hover:underline"
                            onClick={handleRemoveCoupon}
                          >
                            移除
                          </button>
                        </div>
                      ) : (
                        <button
                          className="text-primary text-sm hover:underline"
                          onClick={handleShowCoupons}
                        >
                          {showCouponList ? '收起' : '选择优惠券'}
                        </button>
                      )}
                    </div>

                    {/* 优惠券列表 */}
                    {showCouponList && (
                      <div className="border border-base-300 rounded-lg p-3 mt-2 bg-base-50">
                        {loadingCoupons ? (
                          <div className="flex justify-center py-4">
                            <Loading size="sm" />
                          </div>
                        ) : userCoupons.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">暂无可用优惠券</p>
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {userCoupons.map((userCoupon) => (
                              <div
                                key={userCoupon._id}
                                className="p-3 border rounded-lg cursor-pointer hover:bg-base-200 transition-colors"
                                onClick={() => handleCouponSelect(userCoupon)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-primary">
                                      {userCoupon.coupon.type === 'fixed' 
                                        ? `¥${userCoupon.coupon.value}` 
                                        : `${userCoupon.coupon.value}%`}
                                      <span className="text-sm text-gray-600 ml-2">优惠</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      满 ¥{userCoupon.coupon.minAmount || 0} 可用
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    有效期至 {new Date(userCoupon.expiresAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 优惠金额 */}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>优惠金额</span>
                        <span>-¥{couponDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="divider"></div>
                    <div className="flex justify-between text-xl font-bold">
                      <span>应付金额</span>
                      <span className="text-primary">¥{finalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="card-actions flex-col gap-2 mt-6">
                    <Button 
                      variant="primary" 
                      block 
                      onClick={handleCheckout}
                      icon={<ArrowRight size={20} />}
                      iconPosition="right"
                    >
                      立即支付
                    </Button>
                    <Link to="/courses" className="btn btn-outline w-full">
                      继续购物
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
