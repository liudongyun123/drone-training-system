// ============================================================================
// 管理后台 - 财务统计模块
// 功能：收入统计、订单管理、课程销售、教师业绩、数据导出
// ============================================================================
import { useState, useEffect } from 'react';
import { useConfirm } from '@/admin/hooks/useConfirm';
import { 
  DollarSign, ShoppingCart, TrendingUp, Users, Download,
  Search, ChevronLeft, ChevronRight,
  CreditCard, Package, Award, BarChart3, FileText
} from 'lucide-react';
import { financeService } from '@/services/financeService';
import type { Order } from '@/types';
import { formatDateStr } from '@/utils/dateUtils';

// 课程销售数据接口
interface CourseSales {
  courseId: string
  courseTitle: string
  salesCount: number
  revenue: number
}

// 教师业绩数据接口
interface TeacherPerformanceData {
  teacherId: string
  teacherName: string
  courseCount: number
  studentCount: number
  revenue: number
  orderCount?: number
  totalRevenue?: number
}

// 订单详情弹窗
interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, status: string) => void;
}

function OrderDetailModal({ order, isOpen, onClose, onStatusChange }: OrderDetailModalProps) {
  if (!isOpen || !order) return null;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; class: string }> = {
      pending: { text: '待支付', class: 'bg-yellow-100 text-yellow-700' },
      paid: { text: '已支付', class: 'bg-green-100 text-green-700' },
      cancelled: { text: '已取消', class: 'bg-gray-100 text-gray-700' },
      refunded: { text: '已退款', class: 'bg-red-100 text-red-700' },
    };
    const s = statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-700' };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.class}`}>{s.text}</span>;
  };

  const getPaymentMethodText = (method: string) => {
    const map: Record<string, string> = {
      wechat: '微信支付',
      alipay: '支付宝',
      balance: '余额支付',
    };
    return map[method] || method;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">订单详情</h2>
            <p className="text-sm text-gray-500 mt-1">订单号: {order.orderNo}</p>
          </div>
          {getStatusBadge(order.status)}
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 订单信息 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3">订单信息</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">创建时间:</span>
                  <p className="text-gray-800">{formatDateStr(order.createdAt, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
                <div>
                  <span className="text-gray-500">支付方式:</span>
                  <p className="text-gray-800">{getPaymentMethodText(order.paymentMethod ?? 'unknown')}</p>
                </div>
                {order.paidAt && (
                  <div>
                    <span className="text-gray-500">支付时间:</span>
                    <p className="text-gray-800">{formatDateStr(order.paidAt, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 商品列表 */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">商品信息</h3>
              <div className="space-y-3">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="text-gray-400" size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.instructor}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">¥{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 金额明细 */}
            <div className="border-t pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">商品总额</span>
                  <span className="text-gray-800">¥{order.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">优惠金额</span>
                  <span className="text-red-600">-¥{order.discountAmount}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold text-gray-800">实付金额</span>
                  <span className="font-bold text-xl text-blue-600">¥{order.finalAmount}</span>
                </div>
              </div>
            </div>

            {/* 状态操作 */}
            {order.status === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => { onStatusChange(order._id || order.id || '', 'paid'); onClose(); }}
                  className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  标记为已支付
                </button>
                <button
                  onClick={() => { onStatusChange(order._id || order.id || '', 'cancelled'); onClose(); }}
                  className="flex-1 py-2.5 border hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  取消订单
                </button>
              </div>
            )}
            {order.status === 'paid' && (
              <button
                onClick={() => { onStatusChange(order._id || order.id || '', 'refunded'); onClose(); }}
                className="w-full py-2.5 border hover:bg-gray-50 rounded-lg font-medium transition-colors text-red-600"
              >
                申请退款
              </button>
            )}
          </div>
        </div>

        {/* 关闭按钮 */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

// 主组件
export default function AdminFinance() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'courses' | 'teachers'>('overview');
  const [loading, setLoading] = useState(false);
  
  // 统计数据
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    todayRevenue: 0,
    todayOrders: 0,
    weekRevenue: 0,
    monthRevenue: 0,
  });
  
  // 订单数据
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize] = useState(10);
  const [orderKeyword, setOrderKeyword] = useState('');
  const [orderStatus, setOrderStatus] = useState<'all' | 'pending' | 'paid' | 'cancelled' | 'refunded'>('all');
  
  // 课程销售数据
  const [courseSales, setCourseSales] = useState<CourseSales[]>([]);
  
  // 教师业绩数据
  const [teacherPerformance, setTeacherPerformance] = useState<TeacherPerformanceData[]>([]);
  
  // 日期范围
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  
  // 弹窗状态
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // 用户订单统计（按手机号搜索时显示）
  const [userOrderStats, setUserOrderStats] = useState<{
    phone: string
    classOrdersCount: number
    classOrdersAmount: number
    courseOrdersCount: number
    courseOrdersAmount: number
    classOrders: Order[]
    courseOrders: Order[]
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // 检测是否为手机号格式
  const isPhoneNumber = (keyword: string) => /^1[3-9]\d{9}$/.test(keyword);

  // 加载用户订单统计
  const loadUserOrderStats = async (phone: string) => {
    setLoadingStats(true);
    try {
      const result = await financeService.getOrdersByPhone(phone);
      if (result.code === 0 && result.data) {
        const { classOrders, courseOrders } = result.data;
        
        // 计算各类订单金额
        const classAmount = classOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
        const courseAmount = courseOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
        
        setUserOrderStats({
          phone,
          classOrdersCount: classOrders.length,
          classOrdersAmount: classAmount,
          courseOrdersCount: courseOrders.length,
          courseOrdersAmount: courseAmount,
          classOrders,
          courseOrders
        });
      } else {
        setUserOrderStats(null);
      }
    } catch (error) {
      console.error('加载用户订单统计失败:', error);
      setUserOrderStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await financeService.getRevenueStats();
      if (result.data) {
        setStats(prev => ({
          ...prev,
          totalRevenue: result.data.totalRevenue,
          totalOrders: result.data.totalOrders,
          avgOrderValue: result.data.avgOrderValue,
        }));
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const query: any = {};
      if (orderStatus !== 'all') {
        query.status = orderStatus;
      }
      
      const result = await financeService.getOrders(query, {
        page: orderPage,
        pageSize: orderPageSize,
        keyword: orderKeyword || undefined,
        orderBy: 'createdAt',
        order: 'desc'
      });
      
      setOrders(result.data?.list || []);
      setOrdersTotal(result.data?.total || 0);
    } catch (error) {
      console.error('加载订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseSales = async () => {
    try {
      const result = await financeService.getCourseSalesStats();
      setCourseSales(result.data || []);
    } catch (error) {
      console.error('加载课程销售失败:', error);
    }
  };

  const loadTeacherPerformance = async () => {
    try {
      const result = await financeService.getTeacherPerformanceStats();
      // @ts-ignore
      setTeacherPerformance(result.data || []);
    } catch (error) {
      console.error('加载教师业绩失败:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    } else if (activeTab === 'courses') {
      loadCourseSales();
    } else if (activeTab === 'teachers') {
      loadTeacherPerformance();
    }
  }, [activeTab, orderPage, orderStatus]);

  const handleOrderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderPage(1);
    
    // 如果搜索关键词是手机号，加载该用户的订单统计
    if (isPhoneNumber(orderKeyword)) {
      loadUserOrderStats(orderKeyword);
    } else {
      setUserOrderStats(null);
    }
    
    loadOrders();
  };

  const handleOrderStatusChange = async (orderId: string, status: string) => {
    try {
      await financeService.updateOrderStatus(orderId, status);
      loadOrders();
      loadStats();
    } catch (error) {
      console.error('更新订单状态失败:', error);
      await confirm({ title: '提示', message: '更新失败，请重试', variant: 'info' });
    }
  };

  const handleExport = async () => {
    try {
      const result = await financeService.exportFinanceReport();
      // 创建并下载CSV文件
      const data = result.data;
      let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // BOM for Excel
      
      // 添加汇总数据
      csvContent += '财务汇总报表\n';
      csvContent += `总营收,${data.summary.totalRevenue}\n`;
      csvContent += `总订单数,${data.summary.totalOrders}\n`;
      csvContent += `平均订单金额,${data.summary.avgOrderValue}\n\n`;
      
      // 添加课程销售数据
      csvContent += '课程销售排行\n';
      csvContent += '课程名称,销售数量,销售金额\n';
      data.courseSales.forEach((course: any) => {
        csvContent += `${course.courseTitle},${course.salesCount},${course.revenue}\n`;
      });
      csvContent += '\n';
      
      // 添加教师业绩数据
      csvContent += '教师业绩排行\n';
      csvContent += '教师姓名,订单数,销售金额\n';
      data.teacherPerformance.forEach((teacher: any) => {
        csvContent += `${teacher.teacherName},${teacher.orderCount},${teacher.totalRevenue}\n`;
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `财务报表_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('导出失败:', error);
      await confirm({ title: '提示', message: '导出失败，请重试', variant: 'info' });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; class: string }> = {
      pending: { text: '待支付', class: 'bg-yellow-100 text-yellow-700' },
      paid: { text: '已支付', class: 'bg-green-100 text-green-700' },
      cancelled: { text: '已取消', class: 'bg-gray-100 text-gray-700' },
      refunded: { text: '已退款', class: 'bg-red-100 text-red-700' },
    };
    const s = statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.class}`}>{s.text}</span>;
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 面包屑 */}
        <nav className="text-sm text-gray-500 mb-6">
          <ol className="flex items-center gap-2">
            <li><a href="/admin" className="hover:text-blue-600 transition-colors">管理后台</a></li>
            <li>/</li>
            <li className="text-gray-800 font-medium">财务统计</li>
          </ol>
        </nav>

        {/* 标题区域 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">财务统计</h1>
            <p className="text-gray-500">查看收入统计、订单管理和业绩报表</p>
          </div>
          <button
            onClick={handleExport}
            className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download size={20} />
            导出报表
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="text-blue-600" size={24} />
              </div>
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">累计</span>
            </div>
            <p className="text-slate-500 text-sm mb-1">总营收</p>
            <p className="text-3xl font-bold text-slate-800">{formatMoney(stats.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="text-green-600" size={24} />
              </div>
            </div>
            <p className="text-slate-500 text-sm mb-1">总订单数</p>
            <p className="text-3xl font-bold text-slate-800">{stats.totalOrders}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-purple-600" size={24} />
              </div>
            </div>
            <p className="text-slate-500 text-sm mb-1">平均订单金额</p>
            <p className="text-3xl font-bold text-slate-800">{formatMoney(stats.avgOrderValue)}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Users className="text-amber-600" size={24} />
              </div>
            </div>
            <p className="text-slate-500 text-sm mb-1">付费学员</p>
            <p className="text-3xl font-bold text-slate-800">{Math.floor(stats.totalOrders * 0.8)}</p>
          </div>
        </div>

        {/* 标签页 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* 标签页头部 */}
          <div className="border-b">
            <div className="flex">
              {[
                { key: 'overview', label: '总览', icon: BarChart3 },
                { key: 'orders', label: '订单管理', icon: FileText },
                { key: 'courses', label: '课程销售', icon: Package },
                { key: 'teachers', label: '教师业绩', icon: Award },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 标签页内容 */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 日期范围选择 */}
                <div className="flex gap-2">
                  {[
                    { key: 'today', label: '今日' },
                    { key: 'week', label: '本周' },
                    { key: 'month', label: '本月' },
                    { key: 'year', label: '本年' },
                  ].map((range) => (
                    <button
                      key={range.key}
                      onClick={() => setDateRange(range.key as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        dateRange === range.key
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>

                {/* 趋势图表占位 */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 text-center border border-slate-200">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="text-blue-400" size={40} />
                  </div>
                  <p className="text-lg font-medium text-slate-700">收入趋势图表</p>
                  <p className="text-sm text-slate-400 mt-2">完成订单后将在此处展示收入变化趋势</p>
                  <div className="flex justify-center gap-8 mt-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-slate-600">{formatMoney(stats.todayRevenue || 0)}</p>
                      <p className="text-xs text-slate-400">今日</p>
                    </div>
                    <div className="border-l border-slate-200 pl-8">
                      <p className="text-2xl font-bold text-slate-600">{formatMoney(stats.weekRevenue || 0)}</p>
                      <p className="text-xs text-slate-400">本周</p>
                    </div>
                    <div className="border-l border-slate-200 pl-8">
                      <p className="text-2xl font-bold text-slate-600">{formatMoney(stats.monthRevenue || 0)}</p>
                      <p className="text-xs text-slate-400">本月</p>
                    </div>
                  </div>
                </div>

                {/* 快速统计 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                    <p className="text-sm text-gray-500 mb-1">今日收入</p>
                    <p className="text-2xl font-bold text-green-600">{formatMoney(stats.todayRevenue || 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">暂无数据</p>
                  </div>
                  <div className="border rounded-xl p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <p className="text-sm text-gray-500 mb-1">本周收入</p>
                    <p className="text-2xl font-bold text-blue-600">{formatMoney(stats.weekRevenue || 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">暂无数据</p>
                  </div>
                  <div className="border rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50">
                    <p className="text-sm text-gray-500 mb-1">本月收入</p>
                    <p className="text-2xl font-bold text-purple-600">{formatMoney(stats.monthRevenue || 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">暂无数据</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                {/* 搜索和筛选 */}
                <div className="flex flex-col md:flex-row gap-4">
                  <form onSubmit={handleOrderSearch} className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="搜索手机号、姓名或订单号..."
                        value={orderKeyword}
                        onChange={e => setOrderKeyword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </form>
                  <select
                    value={orderStatus}
                    onChange={e => { setOrderStatus(e.target.value as any); setOrderPage(1); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">全部状态</option>
                    <option value="pending">待支付</option>
                    <option value="paid">已支付</option>
                    <option value="cancelled">已取消</option>
                    <option value="refunded">已退款</option>
                  </select>
                </div>

                {/* 用户订单统计卡片 - 当搜索手机号时显示 */}
                {loadingStats && (
                  <div className="flex items-center justify-center py-4 bg-blue-50 rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                    <span className="text-blue-600">正在加载用户订单统计...</span>
                  </div>
                )}

                {!loadingStats && userOrderStats && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="text-blue-600" size={18} />
                      <span className="font-semibold text-gray-800">用户订单统计</span>
                      <span className="text-sm text-gray-500 ml-2">手机号: {userOrderStats.phone}</span>
                    </div>
                    
                    {/* 统计卡片 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      {/* 线下班订单 */}
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Package className="text-orange-600" size={16} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">线下班订单</p>
                              <p className="text-lg font-bold text-gray-800">{userOrderStats.classOrdersCount} 笔</p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-orange-600">
                            ¥{userOrderStats.classOrdersAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* 线上课程订单 */}
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <CreditCard className="text-purple-600" size={16} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">线上课程</p>
                              <p className="text-lg font-bold text-gray-800">{userOrderStats.courseOrdersCount} 笔</p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-purple-600">
                            ¥{userOrderStats.courseOrdersAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* 总计 */}
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-green-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <TrendingUp className="text-green-600" size={16} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">总计</p>
                              <p className="text-lg font-bold text-gray-800">
                                {userOrderStats.classOrdersCount + userOrderStats.courseOrdersCount} 笔
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-green-600">
                            ¥{(userOrderStats.classOrdersAmount + userOrderStats.courseOrdersAmount).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 订单详情展开 */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                        查看全部 {userOrderStats.classOrders.length + userOrderStats.courseOrders.length} 笔订单
                      </summary>
                      
                      <div className="mt-3 space-y-2">
                        {/* 线下班订单列表 */}
                        {userOrderStats.classOrders.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">线下班订单</p>
                            <div className="space-y-1">
                              {userOrderStats.classOrders.map(order => (
                                <div key={order._id} className="flex items-center justify-between bg-white rounded-lg p-2 text-sm border">
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-gray-500">{order.orderNo}</span>
                                    <span className="text-gray-700">
                                      // @ts-ignore
                                      {order.items?.[0]?.courseTitle || '-'}
                                    </span>
                                    {getStatusBadge(order.status)}
                                  </div>
                                  <span className="font-medium text-orange-600">¥{order.finalAmount}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 线上课程订单列表 */}
                        {userOrderStats.courseOrders.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 mb-2">线上课程订单</p>
                            <div className="space-y-1">
                              {userOrderStats.courseOrders.map(order => (
                                <div key={order._id} className="flex items-center justify-between bg-white rounded-lg p-2 text-sm border">
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-gray-500">{order.orderNo}</span>
                                    <span className="text-gray-700">
                                      // @ts-ignore
                                      {order.items?.[0]?.courseTitle || '-'}
                                    </span>
                                    {getStatusBadge(order.status)}
                                  </div>
                                  <span className="font-medium text-purple-600">¥{order.finalAmount}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {userOrderStats.classOrders.length === 0 && userOrderStats.courseOrders.length === 0 && (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            该用户暂无订单记录
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                {/* 订单列表 */}
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="mx-auto mb-4 text-gray-300" size={64} />
                    <p>暂无订单数据</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">订单号</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">商品</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">金额</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">时间</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {orders.map((order) => (
                          <tr key={order._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">{order.orderNo}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">
                              // @ts-ignore
                              {order.items?.[0]?.courseTitle}
                              {order.items && order.items.length > 1 && (
                                <span className="text-gray-500"> +{order.items.length - 1}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">¥{order.finalAmount}</td>
                            <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatDateStr(order.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => { setSelectedOrder(order); setIsOrderModalOpen(true); }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                详情
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 分页 */}
                {!loading && orders.length > 0 && ordersTotal > orderPageSize && (
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-sm text-gray-500">
                      共 {ordersTotal} 条记录，第 {orderPage} / {Math.ceil(ordersTotal / orderPageSize)} 页
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                        disabled={orderPage === 1}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setOrderPage(p => p + 1)}
                        disabled={orderPage >= Math.ceil(ordersTotal / orderPageSize)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'courses' && (
              <div className="space-y-4">
                {courseSales.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="mx-auto mb-4 text-gray-300" size={64} />
                    <p>暂无课程销售数据</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">排名</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">课程名称</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">销售数量</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">销售金额</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">占比</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {courseSales.map((course, idx) => (
                          <tr key={course.courseId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              {idx < 3 ? (
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                  idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                  idx === 1 ? 'bg-gray-100 text-gray-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {idx + 1}
                                </span>
                              ) : (
                                <span className="text-gray-500 text-sm">{idx + 1}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800">{course.courseTitle}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{course.salesCount} 单</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{formatMoney(course.revenue)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${(course.revenue / (Array.isArray(courseSales) && courseSales.length > 0 ? courseSales[0]?.revenue : 1)) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">
                                  {((course.revenue / stats.totalRevenue) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teachers' && (
              <div className="space-y-4">
                {teacherPerformance.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Award className="mx-auto mb-4 text-gray-300" size={64} />
                    <p>暂无教师业绩数据</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">排名</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">教师姓名</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">订单数</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">销售金额</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">学员数</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {teacherPerformance.map((teacher, idx) => (
                          <tr key={teacher.teacherId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              {idx < 3 ? (
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                  idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                  idx === 1 ? 'bg-gray-100 text-gray-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {idx + 1}
                                </span>
                              ) : (
                                <span className="text-gray-500 text-sm">{idx + 1}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                                  {teacher.teacherName?.charAt(0) || '?'}
                                </div>
                                <span className="text-sm text-gray-800">{teacher.teacherName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{teacher.orderCount} 单</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{formatMoney(teacher.totalRevenue)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{teacher.studentCount} 人</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog />

      {/* 订单详情弹窗 */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={isOrderModalOpen}
        onClose={() => { setIsOrderModalOpen(false); setSelectedOrder(null); }}
        onStatusChange={handleOrderStatusChange}
      />
    </div>
  );
}
