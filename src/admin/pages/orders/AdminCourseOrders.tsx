// ============================================================================
// 管理后台 - 课程订单管理
// 功能：管理线上购买视频课程的订单
// 数据来源：orders 集合，type='course'
// ============================================================================
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConfirm } from '@/admin/hooks/useConfirm';
import AdminPageTemplate from '@/admin/pages/system/_AdminPageTemplate';
import { orderService } from '@/services';
import { toast } from '@/components/Toast';
import {
  Search, Filter, Download, RefreshCw, Eye, CheckCircle,
  XCircle, Clock, CreditCard, BookOpen, ChevronLeft, ChevronRight
} from 'lucide-react';

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '待支付', color: 'bg-yellow-100 text-yellow-700' },
  paid: { text: '已支付', color: 'bg-green-100 text-green-700' },
  completed: { text: '已完成', color: 'bg-blue-100 text-blue-700' },
  cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' },
  refunded: { text: '已退款', color: 'bg-purple-100 text-purple-700' },
};

export default function AdminCourseOrders() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  const [filterStatus, setFilterStatus] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    totalAmount: 0,
    paidAmount: 0,
  });

  const loadOrders = async () => {
    setLoading(true);
    try {
      // 课程订单：获取所有订单（课程订单有 courseId 或 items）
      const query: Record<string, any> = {};
      if (filterStatus) query.status = filterStatus;
      
      const result = await orderService.list(query, { page, pageSize });
      if (result.code === 0) {
        // 过滤出课程订单（有 courseId 或 items）
        // 云函数返回: { data: [...数组], total, page, pageSize }
        let list = Array.isArray(result.data) ? result.data : (result.data?.data || result.data?.list || []);
        list = list.filter((o: any) => o.courseId || o.items);
        
        // 搜索筛选
        if (searchKeyword) {
          const kw = searchKeyword.toLowerCase();
          list = list.filter((o: any) => 
            (o.orderNo || '').toLowerCase().includes(kw) ||
            (o.userName || '').toLowerCase().includes(kw) ||
            (o.buyerName || '').toLowerCase().includes(kw) ||
            (o.phone || '').includes(kw) ||
            (o.buyerPhone || '').includes(kw) ||
            (o.courseName || '').toLowerCase().includes(kw)
          );
        }
        
        const safeTotal = list.length;
        setOrders(list.slice(0, pageSize));
        setTotal(safeTotal);

        // 计算统计数据（所有订单中筛选课程订单）
        const paidList = list.filter((o: any) => o.status === 'paid' || o.status === 'completed');
        setStats({
          total: safeTotal,
          paid: paidList.length,
          pending: list.filter((o: any) => o.status === 'pending').length,
          totalAmount: list.reduce((sum: number, o: any) => sum + (o.totalAmount || o.amount || o.total || 0), 0),
          paidAmount: paidList.reduce((sum: number, o: any) => sum + (o.totalAmount || o.amount || o.total || 0), 0),
        });
      }
    } catch (error) {
      console.error('加载订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, filterStatus, searchKeyword]);

  // 确认支付
  const handleConfirmPayment = async (order: any) => {
    const ok = await confirm({ title: '支付确认', message: `确定要确认订单 ${order.orderNo || order._id} 的支付吗？`, variant: 'danger' });
    if (!ok) return;
    try {
      const result = await orderService.updateStatus(order._id, 'paid');
      if (result.code === 0) {
        toast.success('支付确认成功');
        loadOrders();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('确认支付失败:', error);
      toast.error('操作失败，请重试');
    }
  };

  // 取消订单
  const handleCancelOrder = async (order: any) => {
    const ok = await confirm({ title: '取消确认', message: `确定要取消订单 ${order.orderNo || order._id} 吗？`, variant: 'danger' });
    if (!ok) return;
    try {
      const result = await orderService.updateStatus(order._id, 'cancelled');
      if (result.code === 0) {
        toast.success('订单已取消');
        loadOrders();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('取消订单失败:', error);
      toast.error('操作失败，请重试');
    }
  };

  // 退款
  const handleRefund = async (order: any) => {
    const ok = await confirm({ title: '退款确认', message: `确定要为订单 ${order.orderNo || order._id} 退款吗？`, variant: 'danger' });
    if (!ok) return;
    try {
      const result = await orderService.refund(order._id);
      if (result.code === 0) {
        toast.success('退款成功');
        loadOrders();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('退款失败:', error);
      toast.error('操作失败，请重试');
    }
  };

  // 渲染订单行
  const renderOrderRow = (order: any) => (
    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="font-medium text-gray-900">{order.orderNo || order._id}</div>
          <div className="text-xs text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <BookOpen size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{order.userName || order.buyerName || '-'}</div>
            <div className="text-xs text-gray-500">{order.phone || order.buyerPhone || '-'}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">
          {order.courseName || order.items?.[0]?.title || '视频课程'}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[order.status || 'pending']?.color || 'bg-gray-100'}`}>
          {STATUS_LABELS[order.status || 'pending']?.text || order.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="font-medium text-gray-900">¥{order.totalAmount || order.amount || 0}</div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-500">
          {order.paidAt ? new Date(order.paidAt).toLocaleString() : '-'}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSelectedOrder(order); setDetailModalOpen(true); }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="查看详情"
          >
            <Eye size={18} className="text-gray-600" />
          </button>
          {order.status === 'pending' && (
            <button
              onClick={() => handleConfirmPayment(order)}
              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
              title="确认支付"
            >
              <CheckCircle size={18} className="text-green-600" />
            </button>
          )}
          {order.status === 'pending' && (
            <button
              onClick={() => handleCancelOrder(order)}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              title="取消订单"
            >
              <XCircle size={18} className="text-red-600" />
            </button>
          )}
          {(order.status === 'paid' || order.status === 'completed') && (
            <button
              onClick={() => handleRefund(order)}
              className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
              title="退款"
            >
              <CreditCard size={18} className="text-purple-600" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <AdminPageTemplate
      title="课程订单"
      description="管理线上购买视频课程的订单"
    >
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总订单</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <BookOpen size={24} className="text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已支付</p>
              <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            </div>
            <CheckCircle size={24} className="text-green-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待支付</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock size={24} className="text-yellow-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">订单总额</p>
              <p className="text-2xl font-bold text-gray-900">¥{stats.totalAmount.toFixed(2)}</p>
            </div>
            <CreditCard size={24} className="text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">实收金额</p>
              <p className="text-2xl font-bold text-green-600">¥{stats.paidAmount.toFixed(2)}</p>
            </div>
            <CheckCircle size={24} className="text-green-400" />
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索订单号、用户姓名、手机号..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">全部状态</option>
            <option value="pending">待支付</option>
            <option value="paid">已支付</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
            <option value="refunded">已退款</option>
          </select>

          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      </div>

      {/* 订单列表 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">暂无课程订单</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">订单信息</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">用户信息</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">课程</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">金额</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">支付时间</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(renderOrderRow)}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {!loading && total > pageSize && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              第 {page} 页
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={orders.length < pageSize}
              className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 订单详情弹窗 */}
      {detailModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">订单详情</h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">订单号</label>
                  <p className="font-medium">{selectedOrder.orderNo || selectedOrder._id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">订单状态</label>
                  <p className="font-medium">
                    <span className={`px-2 py-1 rounded-full text-xs ${STATUS_LABELS[selectedOrder.status]?.color}`}>
                      {STATUS_LABELS[selectedOrder.status]?.text}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">用户姓名</label>
                  <p className="font-medium">{selectedOrder.userName || selectedOrder.buyerName || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">手机号</label>
                  <p className="font-medium">{selectedOrder.phone || selectedOrder.buyerPhone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">课程名称</label>
                  <p className="font-medium">{selectedOrder.courseName || selectedOrder.items?.[0]?.title || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">订单金额</label>
                  <p className="font-medium text-lg">¥{selectedOrder.totalAmount || selectedOrder.amount || 0}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">创建时间</label>
                  <p className="font-medium">{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">支付时间</label>
                  <p className="font-medium">{selectedOrder.paidAt ? new Date(selectedOrder.paidAt).toLocaleString() : '-'}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <label className="text-sm text-gray-500">原始数据</label>
                <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-xs overflow-auto max-h-40">
                  {JSON.stringify(selectedOrder, null, 2)}
                </pre>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </AdminPageTemplate>
  );
}
