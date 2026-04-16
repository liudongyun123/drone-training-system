/**
 * 我的优惠券页面 - 查看和管理已领取的优惠券
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ticket, Clock, CheckCircle, XCircle, Gift,
  Tag, AlertCircle, ChevronRight, Copy
} from 'lucide-react';
import Loading from '../components/Loading';
import { useAuthStore } from '../store/authStore';

interface Coupon {
  _id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  minAmount: number;
  maxDiscount?: number;
  description?: string;
  validFrom: string;
  validTo: string;
  status: 'active' | 'used' | 'expired';
  usedAt?: string;
}

// 模拟用户优惠券数据
const MOCK_MY_COUPONS: Coupon[] = [
  {
    _id: 'uc_1',
    code: 'WELCOME2024',
    type: 'fixed',
    value: 100,
    minAmount: 500,
    description: '新用户专享优惠券',
    validFrom: '2024-01-01T00:00:00.000Z',
    validTo: '2024-12-31T23:59:59.000Z',
    status: 'active',
  },
  {
    _id: 'uc_2',
    code: 'NEWYEAR20',
    type: 'percent',
    value: 20,
    minAmount: 1000,
    maxDiscount: 300,
    description: '新年特惠8折券',
    validFrom: '2024-01-01T00:00:00.000Z',
    validTo: '2024-06-30T23:59:59.000Z',
    status: 'active',
  },
  {
    _id: 'uc_3',
    code: 'FLASH50',
    type: 'fixed',
    value: 50,
    minAmount: 200,
    description: '限时闪购优惠券',
    validFrom: '2024-01-01T00:00:00.000Z',
    validTo: '2024-03-15T23:59:59.000Z',
    status: 'expired',
  },
  {
    _id: 'uc_4',
    code: 'BIRTHDAY100',
    type: 'fixed',
    value: 100,
    minAmount: 300,
    description: '生日专属优惠券',
    validFrom: '2024-01-01T00:00:00.000Z',
    validTo: '2024-12-31T23:59:59.000Z',
    status: 'used',
    usedAt: '2024-02-15T10:30:00.000Z',
  },
];

export default function MyCouponsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'used' | 'expired'>('available');
  const [copiedCode, setCopiedCode] = useState('');

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
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      setCoupons(MOCK_MY_COUPONS);
    } catch (error) {
      console.error('加载优惠券失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 筛选优惠券
  const filteredCoupons = coupons.filter(c => {
    switch (activeTab) {
      case 'available':
        return c.status === 'active' && new Date(c.validTo) > new Date();
      case 'used':
        return c.status === 'used';
      case 'expired':
        return c.status === 'expired' || (c.status === 'active' && new Date(c.validTo) <= new Date());
      default:
        return true;
    }
  });

  // 复制券码
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  // 获取优惠显示文本
  const getDiscountText = (coupon: Coupon): string => {
    if (coupon.type === 'fixed') {
      return `¥${coupon.value}`;
    } else {
      return `${coupon.value}%`;
    }
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'used':
        return 'bg-gray-100 text-gray-600';
      case 'expired':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // 获取状态文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '可使用';
      case 'used':
        return '已使用';
      case 'expired':
        return '已过期';
      default:
        return '未知';
    }
  };

  // 计算剩余天数
  const getRemainingDays = (validTo: string): number => {
    const end = new Date(validTo);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
            <Ticket className="w-8 h-8 mr-3 text-blue-600" />
            我的优惠券
          </h1>
          <p className="mt-2 text-gray-600">管理和使用您的优惠券</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { 
              label: '可使用', 
              count: coupons.filter(c => c.status === 'active' && new Date(c.validTo) > new Date()).length,
              color: 'green',
              icon: CheckCircle 
            },
            { 
              label: '已使用', 
              count: coupons.filter(c => c.status === 'used').length,
              color: 'gray',
              icon: Ticket 
            },
            { 
              label: '已过期', 
              count: coupons.filter(c => c.status === 'expired' || (c.status === 'active' && new Date(c.validTo) <= new Date())).length,
              color: 'red',
              icon: XCircle 
            },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className={`w-10 h-10 bg-${stat.color}-100 rounded-full flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 领取优惠券入口 */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center text-white">
            <Gift className="w-6 h-6 mr-3" />
            <div>
              <p className="font-medium">发现更多优惠券</p>
              <p className="text-sm text-blue-100">领取优惠券，享受更多折扣</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/coupons/center')}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            去领取
            <ChevronRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>

        {/* 标签切换 */}
        <div className="bg-white rounded-xl shadow-sm p-1 mb-6">
          <div className="flex">
            {[
              { id: 'available', label: '可使用' },
              { id: 'used', label: '已使用' },
              { id: 'expired', label: '已过期' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 优惠券列表 */}
        <div className="space-y-4">
          {filteredCoupons.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                暂无{activeTab === 'available' ? '可使用' : activeTab === 'used' ? '已使用' : '已过期'}的优惠券
              </h3>
              <p className="text-gray-500 mb-4">
                {activeTab === 'available' ? '快去领取优惠券，享受课程折扣吧！' : ''}
              </p>
              {activeTab === 'available' && (
                <button
                  onClick={() => navigate('/coupons/center')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  去领取
                </button>
              )}
            </div>
          ) : (
            filteredCoupons.map((coupon) => {
              const isAvailable = activeTab === 'available';
              const remainingDays = getRemainingDays(coupon.validTo);
              
              return (
                <div
                  key={coupon._id}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                    !isAvailable ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex">
                    {/* 左侧金额区 */}
                    <div className={`w-32 flex-shrink-0 flex flex-col items-center justify-center p-4 ${
                      isAvailable ? 'bg-blue-50' : 'bg-gray-100'
                    }`}>
                      <div className={`text-3xl font-bold ${isAvailable ? 'text-red-600' : 'text-gray-500'}`}>
                        {getDiscountText(coupon)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {coupon.type === 'fixed' ? '减免' : '折扣'}
                      </div>
                    </div>

                    {/* 右侧信息区 */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{coupon.description}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusStyle(coupon.status)}`}>
                              {getStatusText(coupon.status)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mb-2">
                            满¥{coupon.minAmount}可用
                            {coupon.maxDiscount && ` · 最高减¥${coupon.maxDiscount}`}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {isAvailable && remainingDays <= 7 ? (
                                <span className="text-orange-500">{remainingDays}天后过期</span>
                              ) : (
                                <span>有效期至 {new Date(coupon.validTo).toLocaleDateString()}</span>
                              )}
                            </div>
                            {coupon.usedAt && (
                              <span>使用于 {new Date(coupon.usedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="ml-4">
                          {isAvailable ? (
                            <button
                              onClick={() => navigate('/courses')}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              去使用
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCopyCode(coupon.code)}
                              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                              {copiedCode === coupon.code ? '已复制' : '复制券码'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 券码 */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-gray-400" />
                          <code className="text-sm text-gray-600">{coupon.code}</code>
                        </div>
                        {isAvailable && (
                          <span className="text-xs text-orange-500 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            请及时使用
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 使用提示 */}
        <div className="mt-8 bg-blue-50 rounded-xl p-4">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            使用说明
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 每张优惠券只能使用一次，不可叠加使用</li>
            <li>• 请在有效期内使用，过期优惠券将自动失效</li>
            <li>• 部分优惠券仅限指定课程使用，请仔细查看使用条件</li>
            <li>• 优惠券不可兑换现金，不设找零</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
