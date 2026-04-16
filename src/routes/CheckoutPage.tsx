/**
 * 结账页面 - 支持渐进式绑定
 * 1. 已登录用户：直接下单
 * 2. 匿名用户：需要先绑定手机号
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, Smartphone, CheckCircle2, Gift, ArrowLeft, ShieldCheck } from 'lucide-react';
import { orderService } from '@/services/database';
import { cartService } from '@/services/cart';
import { couponService } from '@/services/coupon';
import { useAuthStore } from '@/store/authStore';
import type { CartItem } from '@/types';
import { Loading, Button, toast } from '@/components';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loginWithPhone, phone } = useAuthStore();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'bindPhone' | 'confirm' | 'paying' | 'success'>('confirm');
  const [orderNo, setOrderNo] = useState('');
  
  // 手机号绑定
  const [bindPhone, setBindPhone] = useState('');
  const [bindCode, setBindCode] = useState('');
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 检查是否需要绑定手机号
  const needsPhoneBind = isAuthenticated && !phone && user?.isAnonymous;

  useEffect(() => {
    if (!isAuthenticated) {
      toast.warning('请先登录');
      navigate('/login');
      return;
    }

    if (location.state) {
      setCartItems(location.state.cartItems || []);
      setSelectedCoupon(location.state.selectedCoupon || null);
      setCouponDiscount(location.state.couponDiscount || 0);
    } else {
      navigate('/cart');
    }

    // 如果需要绑定手机号，显示绑定页面
    if (needsPhoneBind) {
      setStep('bindPhone');
    }
  }, [isAuthenticated, location.state, navigate, needsPhoneBind]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!bindPhone || bindPhone.length !== 11) {
      toast.error('请输入正确的手机号');
      return;
    }
    
    setSending(true);
    try {
      await loginWithPhone(bindPhone, '');
      toast.success('验证码已发送');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  // 绑定手机号
  const handleBindPhone = async () => {
    if (!bindPhone || !bindCode) {
      toast.error('请填写完整信息');
      return;
    }
    
    setLoading(true);
    try {
      await loginWithPhone(bindPhone, bindCode);
      toast.success('绑定成功');
      setStep('confirm');
    } catch (err: any) {
      toast.error(err.message || '绑定失败');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);
  const finalAmount = totalAmount - couponDiscount;

  // 获取用户标识（优先使用手机号，其次使用 uid）
  const getUserIdentifier = () => {
    if (phone) return phone;
    if (user?.uid) return user.uid;
    if (user?.id) return user.id;
    return '';
  };

  const handleCreateOrder = async () => {
    const userId = getUserIdentifier();
    if (!userId || cartItems.length === 0) {
      toast.error('请先登录或选择商品');
      return;
    }

    setLoading(true);
    try {
      const newOrderNo = `ORD${Date.now()}`;
      setOrderNo(newOrderNo);

      const orderItems = cartItems.map(item => ({
        courseId: item.courseId,
        title: item.courseTitle,
        thumbnail: item.coverImage,
        price: item.price,
        instructor: item.teacherName,
        quantity: 1,
      }));

      const order = await orderService.create({
        userId,
        orderNo: newOrderNo,
        items: orderItems,
        total: totalAmount,
        discountAmount: couponDiscount,
        finalAmount,
        paymentMethod,
        status: 'pending',
        phone: phone || bindPhone,
      });

      // 如果使用了优惠券
      if (selectedCoupon && user) {
        try {
          const userCoupons = await couponService.getUserCoupons(userId);
          const userCoupon = userCoupons.find(
            (uc: any) => uc.coupon._id === selectedCoupon._id && uc.status === 'unused'
          );
          if (userCoupon) {
            await couponService.useCoupon(userCoupon._id, order._id as string);
          }
        } catch (error) {
          console.error('使用优惠券失败:', error);
        }
      }

      // 清空购物车
      for (const item of cartItems) {
        await cartService.removeFromCart(userId, item.courseId);
      }

      setStep('paying');
      
      // 模拟支付流程
      setTimeout(() => {
        handlePayment(order._id as string);
      }, 2000);
    } catch (error) {
      console.error('创建订单失败:', error);
      toast.error('创建订单失败');
      setLoading(false);
    }
  };

  const handlePayment = async (orderId: string) => {
    try {
      await orderService.updateStatus(orderId, 'paid');
      setStep('success');
      toast.success('支付成功！');
    } catch (error) {
      console.error('支付处理失败:', error);
      toast.error('支付处理失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/cart');
  };

  // 绑定手机号页面
  if (step === 'bindPhone') {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
        <div className="card bg-base-100 shadow-xl max-w-md w-full">
          <div className="card-body">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold">绑定手机号</h2>
              <p className="text-gray-500 mt-2">购买课程需要绑定手机号</p>
            </div>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">手机号</span>
                </label>
                <input
                  type="tel"
                  className="input input-bordered"
                  placeholder="请输入手机号"
                  value={bindPhone}
                  onChange={(e) => setBindPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">验证码</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    placeholder="请输入验证码"
                    value={bindCode}
                    onChange={(e) => setBindCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                  />
                  <button
                    className="btn btn-outline"
                    onClick={handleSendCode}
                    disabled={sending || countdown > 0}
                  >
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>

              <Button
                variant="primary"
                block
                size="lg"
                onClick={handleBindPhone}
                loading={loading}
                disabled={!bindPhone || !bindCode}
              >
                绑定并继续
              </Button>

              <button className="btn btn-ghost w-full" onClick={handleBack}>
                返回购物车
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 支付成功页面
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
        <div className="card bg-base-100 shadow-xl max-w-md w-full">
          <div className="card-body items-center text-center py-12">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="text-green-500 w-12 h-12" />
            </div>
            <h2 className="text-3xl font-bold mb-2">支付成功</h2>
            <p className="text-gray-600 mb-2">您的订单已创建</p>
            <p className="text-sm text-gray-500 mb-8">订单号：{orderNo}</p>
            <div className="space-y-3 w-full">
              <Button 
                variant="primary" 
                block 
                onClick={() => navigate('/learning')}
              >
                前往学习
              </Button>
              <Button 
                variant="outline" 
                block 
                onClick={() => navigate('/courses')}
              >
                继续选课
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 确认订单页面
  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={handleBack} icon={<ArrowLeft size={20} />}>
            返回购物车
          </Button>
          <h1 className="text-2xl font-bold">确认订单</h1>
          <div className="w-24"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 订单详情 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 商品列表 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">订单商品</h2>
                {cartItems.map((item) => (
                  <div key={item.courseId} className="flex gap-4 p-4 bg-base-200 rounded-lg mb-3 last:mb-0">
                    <div className="w-24 h-16 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={item.coverImage || 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=96'}
                        alt={item.courseTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold line-clamp-1">{item.courseTitle}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-sm text-gray-500">
                          {item.teacherName || '未知教师'}
                        </div>
                        <div className="text-lg font-bold text-primary">
                          ¥{item.price}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 支付方式 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">支付方式</h2>
                <div className="space-y-3">
                  <label
                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'wechat' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="radio radio-success"
                      checked={paymentMethod === 'wechat'}
                      onChange={() => setPaymentMethod('wechat')}
                    />
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">微信支付</div>
                      <div className="text-sm text-gray-500">推荐使用微信支付</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'alipay' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="radio radio-primary"
                      checked={paymentMethod === 'alipay'}
                      onChange={() => setPaymentMethod('alipay')}
                    />
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">支付宝</div>
                      <div className="text-sm text-gray-500">安全快捷支付</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 订单汇总 */}
          <div>
            <div className="card bg-base-100 shadow-xl sticky top-4">
              <div className="card-body">
                <h2 className="card-title">订单汇总</h2>

                <div className="divider"></div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">商品总额</span>
                    <span>¥{totalAmount.toFixed(2)}</span>
                  </div>

                  {/* 优惠券折扣 */}
                  {selectedCoupon && (
                    <div className="flex justify-between items-center text-green-600">
                      <div className="flex items-center gap-2">
                        <Gift size={16} />
                        <span className="text-sm">优惠券</span>
                      </div>
                      <span className="text-sm">
                        {selectedCoupon.type === 'fixed' 
                          ? `-¥${selectedCoupon.value}` 
                          : `-${selectedCoupon.value}%`}
                      </span>
                    </div>
                  )}

                  {/* 优惠金额 */}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
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

                <Button
                  variant="primary"
                  block
                  size="lg"
                  className="mt-6"
                  onClick={handleCreateOrder}
                  loading={loading}
                  loadingText="处理中..."
                >
                  确认支付
                </Button>

                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                  <ShieldCheck size={16} />
                  <span>安全支付保障</span>
                </div>

                <div className="text-center mt-2 text-xs text-gray-400">
                  点击支付即表示同意《用户协议》和《隐私政策》
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
