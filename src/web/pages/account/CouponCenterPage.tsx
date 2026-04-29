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

// 模拟可领取的优惠券
const MOCK_AVAILABLE_COUPONS: Coupon[] = [
  {
    _id: 'ac_1',
    code: 'NEWUSER100',
    type: 'fixed',
    value: 100,
    minAmount: 500,
    description: '新用户专享 · 首次购课立减100元',
    totalCount: 1000,
    usedCount: 456,
    validFrom: '2024-01-01T00:00:00.000Z',
    validTo: '2024-12-31T23:59:59.000Z',
    tags: ['新用户', '热门'],
  },
  {
    _id: 'ac_2',
    code: 'SPRING20',
    type: 'percent',
    value: 20,
    minAmount: 1000,
    maxDiscount: 500,
    description: '春季特惠 · 全场课程8折',
    totalCount: 500,
    usedCount: 328,
    validFrom: '2024-03-01T00:00:00.000Z',
    validTo: '2024-05-31T23:59:59.000Z',
    tags: ['限时', '全场通用'],
  },
  {
    _id: 'ac_3',
    code: 'CAAC200',
    type: 'fixed',
    value: 200,
    minAmount: 2000,
    description: 'CAAC执照课程专享 · 立减200元',
    totalCount: 200,
    usedCount: 89,
    validFrom: '2024-01-01T00:00:00.000Z',
    validTo: '2024-06-30T23:59:59.000Z',
    tags: ['CAAC', '执照课'],
  },
  {
    _id: 'ac_4',
    code: 'AOPA150',
    type: 'fixed',
    value: 150,
    minAmount: 1500,
    description: 'AOPA认证课程专享 · 立减150元',
    totalCount: 200,
    usedCount: 156,
    validFrom: '2024-01-01T00:00:00.000Z',
    validTo: '2024-06-30T23:59:59.000Z',
    tags: ['AOPA', '认证课'],
  },
  {
    _id: 'ac_5',
    code: 'STUDENT50',
    type: 'fixed',
    value: 50,
    minAmount: 300,
    description: '学生专享 · 凭学生证领取',
    totalCount: 300,
    usedCount: 245,
    validFrom: '2024-01-01T00:00:00.000Z',
    validTo: '2024-12-31T23:59:59.000Z',
    tags: ['学生', '专享'],
  },
  {
    _id: 'ac_6',
    code: 'GROUPBUY30',
    type: 'percent',
    value: 30,
    minAmount: 500,
    maxDiscount: 800,
    description: '拼团特惠 · 最高减800元',
    totalCount: 100,
    usedCount: 67,
    validFrom: '2024-01-01T00:00:00.000Z',
    validTo: '2024-12-31T23:59:59.000Z',
    tags: ['拼团', '限时'],
  },
];

export default function CouponCenterPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimedCoupons, setClaimedCoupons] = useState<string[]>([]);
  const [manualCode, setManualCode] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      setCoupons(MOCK_AVAILABLE_COUPONS);
    } catch (error) {
      console.error('加载优惠券失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 领取优惠券
  const handleClaim = async (coupon: Coupon) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setClaiming(coupon._id);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 800));
      setClaimedCoupons([...claimedCoupons, coupon._id]);
    } catch (error) {
      console.error('领取优惠券失败:', error);
    } finally {
      setClaiming(null);
    }
  };

  // 手动兑换
  const handleManualClaim = async () => {
    if (!manualCode.trim()) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // 模拟兑换
    alert(`兑换码 ${manualCode} 已提交`);
    setManualCode('');
  };

  // 复制券码
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopySuccess(code);
    setTimeout(() => setCopySuccess(''), 2000);
  };

  // 获取优惠显示文本
  const getDiscountText = (coupon: Coupon): string => {
    if (coupon.type === 'fixed') {
      return `¥${coupon.value}`;
    } else {
      return `${coupon.value}%`;
    }
  };

  // 获取剩余数量百分比
  const getRemainingPercent = (coupon: Coupon): number => {
    return Math.round(((coupon.totalCount - coupon.usedCount) / coupon.totalCount) * 100);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Gift className="w-8 h-8 mr-3 text-blue-600" />
            优惠券中心
          </h1>
          <p className="mt-2 text-gray-600">领取优惠券，享受课程折扣</p>
        </div>

        {/* 兑换码入口 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                有兑换码？
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="输入兑换码"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={handleManualClaim}
                  disabled={!manualCode.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  兑换
                </button>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => navigate('/my-coupons')}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                查看我的优惠券
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 优惠券列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.map((coupon) => {
            const isClaimed = claimedCoupons.includes(coupon._id);
            const remainingPercent = getRemainingPercent(coupon);
            const isLowStock = remainingPercent < 20;
            
            return (
              <div
                key={coupon._id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 transition-all ${
                  isClaimed ? 'border-green-400 bg-green-50' : 'border-transparent hover:border-blue-300'
                }`}
              >
                <div className="flex">
                  {/* 左侧金额区 */}
                  <div className={`w-28 flex-shrink-0 flex flex-col items-center justify-center p-4 ${
                    isClaimed ? 'bg-green-100' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  }`}>
                    <div className={`text-2xl font-bold ${isClaimed ? 'text-green-700' : 'text-white'}`}>
                      {getDiscountText(coupon)}
                    </div>
                    <div className={`text-xs mt-1 ${isClaimed ? 'text-green-600' : 'text-blue-100'}`}>
                      {coupon.type === 'fixed' ? '减免' : '折扣'}
                    </div>
                  </div>

                  {/* 右侧信息区 */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{coupon.description}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          满¥{coupon.minAmount}可用
                          {coupon.maxDiscount && ` · 最高减¥${coupon.maxDiscount}`}
                        </p>
                        
                        {/* 标签 */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {coupon.tags?.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* 有效期 */}
                        <div className="flex items-center text-xs text-gray-400 mt-2">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>有效期至 {new Date(coupon.validTo).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* 进度条和领取按钮 */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center text-sm">
                          <Users className="w-4 h-4 text-gray-400 mr-1" />
                          <span className={isLowStock ? 'text-red-500' : 'text-gray-500'}>
                            {isLowStock ? '仅剩' : '已领'}
                            {coupon.totalCount - coupon.usedCount}/{coupon.totalCount}
                          </span>
                        </div>
                        {isClaimed ? (
                          <span className="flex items-center text-green-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            已领取
                          </span>
                        ) : (
                          <button
                            onClick={() => handleClaim(coupon)}
                            disabled={claiming === coupon._id}
                            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {claiming === coupon._id ? '领取中...' : '立即领取'}
                          </button>
                        )}
                      </div>
                      
                      {/* 进度条 */}
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isLowStock ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ width: `${100 - remainingPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* 券码（领取后显示） */}
                    {isClaimed && (
                      <div className="mt-3 p-2 bg-white rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Tag className="w-4 h-4 text-gray-400 mr-2" />
                            <code className="text-sm font-medium text-gray-700">{coupon.code}</code>
                          </div>
                          <button
                            onClick={() => handleCopyCode(coupon.code)}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                          >
                            {copySuccess === coupon.code ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                已复制
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-1" />
                                复制
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 领取提示 */}
        <div className="mt-8 bg-amber-50 rounded-xl p-4 border border-amber-200">
          <h4 className="font-medium text-amber-900 mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            领取说明
          </h4>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• 每个用户每种优惠券限领一张</li>
            <li>• 请在有效期内使用，过期优惠券将自动失效</li>
            <li>• 部分优惠券仅限指定课程使用，请仔细查看使用条件</li>
            <li>• 如有疑问，请联系客服咨询</li>
          </ul>
        </div>

        {/* 底部引导 */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 mb-4">已经领取了优惠券？</p>
          <button
            onClick={() => navigate('/courses')}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            去选课使用
          </button>
        </div>
      </div>
    </div>
  );
}
