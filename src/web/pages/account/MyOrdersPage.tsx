/**
 * 我的订单页面
 * 业务逻辑：用户购买课程 -> 创建订单 -> 支付成功后获得课程权限
 * 也包括线下报班记录
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, Clock, CheckCircle, XCircle, 
  ChevronRight, Package, CreditCard, Eye,
  Calendar, Gift
} from 'lucide-react';
import { CloudOrderService } from '@/services/CloudOrderService';
import { useAuthStore } from '@/store/authStore';
import { Loading, EmptyState } from '@/components';
import { app } from '@/utils/cloudbase';
import { getUserPhone } from '@/utils/userQuery';

interface OrderItem {
  courseId: string;
  title?: string;
  thumbnail?: string;
  price?: number;
}

interface Order {
  id: string;
  _id: string;
  orderNo?: string;
  courseId?: string;
  courseName?: string;
  courseCover?: string;
  items?: OrderItem[];
  price?: number;
  total?: number;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  paymentMethod?: string;
  createdAt: string;
  paidAt?: string;
  // 线下报班特有字段
  isEnrollment?: boolean;
  className?: string;
  studentName?: string;
  source?: string;
}

export default function MyOrdersPage() {
  console.log('[MyOrdersPage] 页面渲染，版本: v20260413-enrollment')
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'completed'>('all');

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [filter, user]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      console.log('[MyOrdersPage] 加载用户订单...');
      
      // ★ 统一使用 phone 作为用户标识
      const phone = getUserPhone();
      console.log('[MyOrdersPage] 用户手机号:', phone);
      
      if (!phone) {
        console.warn('[MyOrdersPage] 未获取到用户手机号');
        setOrders([]);
        setLoading(false);
        return;
      }
      
      // 1. 获取购买订单 - 统一使用 phone 查询
      const userOrders = await CloudOrderService.getUserOrders({
        phone: phone
      });
      console.log('[MyOrdersPage] 获取到购买订单:', userOrders.length, '条');
      
      // 处理订单数据，支持新旧格式
      const processedOrders: Order[] = userOrders.map(o => ({
        id: o.id || o._id,
        _id: o.id || o._id,
        orderNo: o.id || o._id,
        items: o.items,
        // @ts-ignore
        total: o.total || (o as any).totalAmount || (o as any).amount,
        courseId: (o as any).courseId,
        courseName: (o as any).courseName,
        courseCover: (o as any).courseCover,
        // @ts-ignore
        price: o.total || (o as any).price || (o as any).amount || 0,
        status: o.status,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
        isEnrollment: false,
      }));
      
      // 2. 获取线下报班记录 - 统一使用 phone 查询
      try {
        // ★ 统一使用 phone 查询
        const query = { phone: phone };
        
        const regResult: any = await new Promise((resolve, reject) => {
          app.callFunction({
            name: 'admin',
            data: {
              action: 'list',
              collection: 'registrations',
              query: query
            }
          }).then(res => resolve(res)).catch(reject);
        });
        
        const regResponse = regResult?.result || regResult;
        const registrations = regResponse?.data || [];
        console.log('[MyOrdersPage] 获取到报班记录:', registrations.length, '条', registrations);
        
        // 将报班记录转换为订单格式
        for (const reg of registrations) {
          // 通过 classId 查询班级详情，获取课程信息
          let courseId = reg.courseId;
          let courseName = reg.className || '培训班';
          const courseCover = reg.classCover;
          
          if (reg.classId) {
            try {
              const classResult: any = await new Promise((resolve, reject) => {
                app.callFunction({
                  name: 'admin',
                  data: {
                    action: 'get',
                    collection: 'classes',
                    docId: reg.classId
                  }
                }).then(res => resolve(res)).catch(reject);
              });
              
              const classResponse = classResult?.result || classResult;
              const classData = classResponse?.data;
              console.log('[MyOrdersPage] 班级详情:', classData);
              
              if (classData) {
                courseId = classData.courseId;
                courseName = reg.className || classData.name || '培训班';
              }
            } catch (e) {
              console.error('[MyOrdersPage] 查询班级详情失败:', e);
            }
          }
          
          const enrollmentOrder: Order = {
            id: `enrollment_${reg._id}`,
            _id: `enrollment_${reg._id}`,
            orderNo: `报名-${reg._id.slice(-6).toUpperCase()}`,
            courseId: courseId,
            courseName: courseName,
            courseCover: courseCover,
            price: 0,
            total: 0,
            status: reg.status === 'confirmed' ? 'completed' : 'paid',
            createdAt: reg.createdAt,
            paidAt: reg.review?.reviewedAt,
            isEnrollment: true,
            className: reg.className,
            studentName: reg.studentName,
            source: reg.source,
          };
          processedOrders.push(enrollmentOrder);
          console.log('[MyOrdersPage] 添加报班订单:', enrollmentOrder);
        }
      } catch (e) {
        console.error('[MyOrdersPage] 查询报班记录失败:', e);
      }
      
      // 按时间排序（最新的在前）
      processedOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      
      console.log('[MyOrdersPage] 总订单数:', processedOrders.length);
      setOrders(processedOrders);
    } catch (error) {
      console.error('[MyOrdersPage] 加载订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: '待支付',
          color: 'bg-yellow-100 text-yellow-700',
          icon: Clock,
        };
      case 'paid':
        return {
          label: '已支付',
          color: 'bg-blue-100 text-blue-700',
          icon: CreditCard,
        };
      case 'processing':
        return {
          label: '处理中',
          color: 'bg-purple-100 text-purple-700',
          icon: Package,
        };
      case 'completed':
        return {
          label: '已完成',
          color: 'bg-green-100 text-green-700',
          icon: CheckCircle,
        };
      case 'cancelled':
        return {
          label: '已取消',
          color: 'bg-gray-100 text-gray-500',
          icon: XCircle,
        };
      case 'refunded':
        return {
          label: '已退款',
          color: 'bg-red-100 text-red-700',
          icon: XCircle,
        };
      default:
        return {
          label: '未知',
          color: 'bg-gray-100 text-gray-500',
          icon: Package,
        };
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(price);
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // 根据筛选状态过滤订单
  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter);

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">我的订单</h1>
          <p className="text-gray-600 mt-1">查看和管理您的所有订单</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '全部订单', value: orders.length, filter: 'all' as const },
            { label: '待支付', value: orders.filter(o => o.status === 'pending').length, filter: 'pending' as const },
            { label: '已完成', value: orders.filter(o => o.status === 'completed').length, filter: 'completed' as const },
            { label: '已取消', value: orders.filter(o => o.status === 'cancelled').length, filter: 'cancelled' as const },
          ].map((stat) => (
            <button
              key={stat.label}
              // @ts-ignore
              onClick={() => setFilter(stat.filter)}
              className={`p-4 rounded-xl text-left transition-all ${
                filter === stat.filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              }`}
            >
              <p className="text-sm opacity-80">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </button>
          ))}
        </div>

        {/* 订单列表 */}
        {filteredOrders.length === 0 ? (
          // @ts-ignore
          <EmptyState 
            message="暂无订单" 
            description="您还没有购买任何课程，快去浏览课程吧"
          >
            <Link 
              to="/courses"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              浏览课程
            </Link>
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
              
              // 统一处理 items 数组 - 兼容新旧字段名
              const orderItems = (order.items || []).map((item: any) => ({
                courseId: item.courseId,
                title: item.title || item.courseTitle || '未知课程',  // 兼容新旧字段
                thumbnail: item.thumbnail || item.coverImage || item.courseCover, // 兼容新旧字段
                price: item.price || 0,
              }));
              
              // 如果没有 items，使用 courseId/courseName
              if (orderItems.length === 0 && order.courseId) {
                orderItems.push({
                  courseId: order.courseId,
                  title: order.courseName || '未知课程',
                  thumbnail: order.courseCover,
                  price: order.price || 0,
                });
              }
              
              // 计算订单总金额
              const totalAmount = orderItems.reduce((sum, item) => sum + (item.price || 0), 0) || order.total || order.price || 0;
              
              return (
                <div key={order._id} className={`rounded-xl shadow-sm p-6 ${
                  order.isEnrollment ? 'bg-amber-50 border-2 border-amber-200' : 'bg-white'
                }`}>
                  {/* 订单头部 */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                      {order.isEnrollment ? (
                        <>
                          <span className="px-2 py-1 bg-amber-500 text-white text-xs rounded-full flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            线下报班
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">订单号: {order.orderNo}</span>
                      )}
                      <span className="text-sm text-gray-400">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{statusConfig.label}</span>
                    </div>
                  </div>

                  {/* 订单内容 - 支持多课程 */}
                  <div className="space-y-4">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex items-start gap-4">
                        {/* 课程封面 */}
                        <div className="w-24 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.thumbnail ? (
                            <img 
                              src={item.thumbnail} 
                              alt={item.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            order.isEnrollment ? (
                              <Calendar className="w-8 h-8 text-amber-500" />
                            ) : (
                              <ShoppingBag className="w-8 h-8 text-gray-400" />
                            )
                          )}
                        </div>

                        {/* 课程信息 */}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900">{item.title || order.className || '培训班'}</h3>
                          {order.isEnrollment && order.studentName && (
                            <p className="text-amber-600 text-sm mt-1">学员: {order.studentName}</p>
                          )}
                          {item.price !== undefined && item.price > 0 && (
                            <p className="text-gray-500 text-sm mt-1">金额: {formatPrice(item.price)}</p>
                          )}
                          {order.isEnrollment && (
                            <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                              <Gift className="w-3 h-3" />
                              报班赠送课程
                            </p>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-3">
                          {order.status === 'pending' && (
                            <Link
                              to={`/checkout?orderId=${order._id}`}
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                              立即支付
                            </Link>
                          )}
                          {(order.status === 'paid' || order.status === 'completed') && item.courseId && (
                            <Link
                              to={`/courses/${item.courseId}`}
                              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              查看课程
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 订单底部：总价和支付时间 */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <p className="text-gray-500 text-sm">
                      订单总价: <span className="font-bold text-lg text-gray-900">{formatPrice(totalAmount)}</span>
                    </p>
                    {order.paidAt && (
                      <p className="text-gray-400 text-xs">
                        支付时间: {formatDate(order.paidAt)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
