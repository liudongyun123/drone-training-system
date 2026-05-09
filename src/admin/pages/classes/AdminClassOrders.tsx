// 管理后台 - 培训班订单管理
// 功能：管理线上报名培训班的订单
// 数据来源：orders 集合，type='class'
// 关联：通过 memberId 关联 members 表获取学员详细信息
import { useState, useEffect } from 'react';
import AdminPageTemplate from '@/admin/pages/system/_AdminPageTemplate';
import { useConfirm } from '@/admin/hooks/useConfirm';
import { orderService, adminService, membersService } from '@/services';
import {
  Search, RefreshCw, CheckCircle, Clock, CreditCard, 
  Users, ChevronLeft, ChevronRight, Plus, Key, User
} from 'lucide-react';
import { Modal } from '@/components';

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '待支付', color: 'bg-yellow-100 text-yellow-700' },
  paid: { text: '已支付', color: 'bg-green-100 text-green-700' },
  paid_offline: { text: '线下已付', color: 'bg-blue-100 text-blue-700' },
  completed: { text: '已完成', color: 'bg-green-100 text-green-700' },
  cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' },
  refunded: { text: '已退款', color: 'bg-purple-100 text-purple-700' },
};

export default function AdminClassOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    onlinePaid: 0,
    offlinePaid: 0,
    totalAmount: 0,
    paidAmount: 0,
  });

  // 学员信息缓存 { memberId: memberData }
  const [membersCache, setMembersCache] = useState<Record<string, unknown>>({});

  // 开放权限弹窗
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Record<string, unknown>>({});
  const [granting, setGranting] = useState(false);

  // 线下报名弹窗
  const [offlineEnrollModalOpen, setOfflineEnrollModalOpen] = useState(false);
  const [offlineEnrollLoading, setOfflineEnrollLoading] = useState(false);
  const [offlineEnrollForm, setOfflineEnrollForm] = useState({
    memberId: '',
    memberName: '',
    memberPhone: '',
    classId: '',
    className: '',
    amount: 0,
    notes: '',
  });
  const [availableClasses, setAvailableClasses] = useState<unknown[]>([]);
  const { confirm, ConfirmDialog } = useConfirm();

  // 加载所有学员信息用于关联查询
  const loadAllMembers = async () => {
    try {
      // 使用无分页限制的方法获取所有学员
      const result = await membersService.getAllForCache();
      if (result.success && result.data) {
        const cache: Record<string, unknown> = {};
        ((result.data as { list?: unknown[] }).list || []).forEach((m: unknown) => {
          const member = m as { _id?: string };
          if (member._id) {
            cache[member._id] = m;
          }
        });
        setMembersCache(cache);
      }
    } catch (error) {
      console.error('加载学员信息失败:', error);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      // 同时查询 enrollments 和 orders 集合（线下报名的订单存储在 orders 中）
      const query: Record<string, any> = {};
      if (filterStatus) query.status = filterStatus;
      if (filterPaymentMethod) query.paymentMethod = filterPaymentMethod;

      // 查询 enrollments 集合（线上报名）
      const enrollmentsResult = await adminService.list('enrollments', query, { page, limit: pageSize });
      // 查询 orders 集合中的培训班订单（线下报名，type='class'）
      const ordersQuery = { ...query, type: 'class' };
      const ordersResult = await adminService.list('orders', ordersQuery, { page, limit: pageSize });
      
      let list: any[] = [];
      
      // 合并两个集合的数据
      if (enrollmentsResult.code === 0) {
        const enrollmentsData = enrollmentsResult.data as { data?: unknown[]; list?: unknown[] } | undefined;
        const enrollmentsList = Array.isArray(enrollmentsResult.data) 
          ? enrollmentsResult.data 
          : ((enrollmentsData?.data as unknown[]) || (enrollmentsData?.list as unknown[]) || []);
        list = [...list, ...enrollmentsList];
      }
      
      if (ordersResult.code === 0) {
        const ordersData = ordersResult.data as { data?: unknown[]; list?: unknown[] } | undefined;
        const ordersList = Array.isArray(ordersResult.data) 
          ? ordersResult.data 
          : ((ordersData?.data as unknown[]) || (ordersData?.list as unknown[]) || []);
        // 标记为线下报名订单
        const markedOrders = ordersList.map((o: unknown) => ({ ...(o as object), _fromOffline: true }));
        list = [...list, ...markedOrders];
      }
      
      // 搜索筛选 - 增加 memberId 搜索支持
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        list = list.filter((o) => {
          const item = o as Record<string, unknown>;
          const member = item.memberId ? membersCache[item.memberId as string] as Record<string, unknown> | undefined : undefined;
          return (
            ((item.enrollmentId as string) || (item._id as string) || '').toLowerCase().includes(kw) ||
            ((item.userName as string) || (item.memberName as string) || '').toLowerCase().includes(kw) ||
            ((item.phone as string) || '').includes(kw) ||
            ((item.memberId as string) || '').toLowerCase().includes(kw) ||
            ((member?.name as string) || '').toLowerCase().includes(kw) ||
            ((member?.phone as string) || '').includes(kw) ||
            ((item.courseName as string) || '').toLowerCase().includes(kw) ||
            ((item.scheduleId as string) || '').toLowerCase().includes(kw)
          );
        });
      }
      
      const safeTotal = list.length;
      
      // 关联学员信息 - 为每个订单附加学员详细资料
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrichedList: any[] = list.map((o) => {
        const item = o as Record<string, unknown>;
        const member = item.memberId ? membersCache[item.memberId as string] as Record<string, unknown> | undefined : undefined;
        const memberProfile = member?.profile as Record<string, unknown> | undefined;
        return {
          ...item,
          // 优先使用关联的学员信息，否则使用原有字段
          memberName: (member?.name as string) || (item.memberName as string) || (item.userName as string) || '-',
          memberPhone: (member?.phone as string) || (item.phone as string) || '-',
          memberSource: (member?.source as string) || (item.source as string) || '-',
          memberType: (member?.type as string) || (item.memberType as string) || 'unknown',
          memberLevel: (memberProfile?.level as string) || (item.level as string) || '-',
        };
      });
      
      setOrders(enrichedList.slice(0, pageSize));
      setTotal(safeTotal);

      // 计算统计数据
      const paidList = enrichedList.filter((o) => 
        o.status === 'paid' || o.status === 'completed' || o.status === 'confirmed' || o.paymentStatus === 'paid'
      );
      const pendingList = enrichedList.filter((o) => 
        o.status === 'pending' || o.paymentStatus === 'pending'
      );
      setStats({
        total: safeTotal,
        paid: paidList.length,
        pending: pendingList.length,
        onlinePaid: paidList.filter((o) => !o._fromOffline).length,
        offlinePaid: paidList.filter((o) => o._fromOffline).length,
        totalAmount: enrichedList.reduce((sum: number, o) => sum + (o.amount || 0), 0),
        paidAmount: paidList.reduce((sum: number, o) => sum + (o.amount || 0), 0),
      });
    } catch (error) {
      console.error('加载订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 先加载学员缓存，再加载订单，同时预加载班级列表
    Promise.all([
      loadAllMembers(),
      loadAvailableClasses()
    ]).then(() => {
      loadOrders();
    });
  }, []);

  // 筛选条件变化时重新加载订单
  useEffect(() => {
    if (Object.keys(membersCache).length > 0) {
      loadOrders();
    }
  }, [page, filterStatus, filterPaymentMethod, searchKeyword, membersCache]);

  // 开放权限
  const handleGrantPermission = async () => {
    if (!selectedOrder) return;
    setGranting(true);
    try {
      const orderData = selectedOrder as { _id?: string };
      const result = await orderService.grantPermission(orderData._id || '');
      if (result.code === 0) {
        await confirm({ title: '提示', message: '权限开放成功！', variant: 'info' });
        setGrantModalOpen(false);
        loadOrders();
      } else {
        await confirm({ title: '提示', message: result.message || '操作失败', variant: 'info' });
      }
    } catch (error) {
      await confirm({ title: '提示', message: (error as Error).message || '操作失败', variant: 'info' });
    } finally {
      setGranting(false);
    }
  };

  // 加载可选班级列表
  const [classesLoading, setClassesLoading] = useState(false);
  
  const loadAvailableClasses = async () => {
    setClassesLoading(true);
    try {
      // 查询所有班级，不限制状态，确保能加载到数据
      const result = await adminService.list('classes', {}, { limit: 200 });
      if (result.code === 0) {
        const resultData = result.data as { data?: unknown[]; list?: unknown[] } | undefined;
        const list = Array.isArray(result.data) ? result.data : ((resultData?.data as unknown[]) || (resultData?.list as unknown[]) || []);
        setAvailableClasses(list as never[]);
      } else {
        console.error('[AdminClassOrders] 加载班级失败:', result.message);
      }
    } catch (error) {
      console.error('加载班级列表失败:', error);
    } finally {
      setClassesLoading(false);
    }
  };

  // 打开线下报名弹窗
  const openOfflineEnrollModal = () => {
    setOfflineEnrollForm({
      memberId: '',
      memberName: '',
      memberPhone: '',
      classId: '',
      className: '',
      amount: 0,
      notes: '',
    });
    loadAvailableClasses();
    setOfflineEnrollModalOpen(true);
  };

  // 搜索会员
  const searchMember = async () => {
    const phone = offlineEnrollForm.memberPhone.trim();
    if (!phone) {
      await confirm({ title: '提示', message: '请输入手机号', variant: 'info' });
      return;
    }
    try {
      const result = await membersService.getByPhone(phone);
      if (result.success && result.data) {
        const memberData = result.data as { _id?: string; name?: string };
        setOfflineEnrollForm(prev => ({
          ...prev,
          memberId: memberData._id || '',
          memberName: memberData.name || '',
        }));
      } else {
        await confirm({ title: '提示', message: '未找到该手机号对应的会员，请确认后重试', variant: 'info' });
      }
    } catch (error) {
      console.error('搜索会员失败:', error);
    }
  };

  // 处理线下报名
  const handleOfflineEnroll = async () => {
    const { memberPhone, classId, className, amount } = offlineEnrollForm;
    if (!memberPhone) {
      await confirm({ title: '提示', message: '请填写手机号', variant: 'info' });
      return;
    }
    if (!classId) {
      await confirm({ title: '提示', message: '请选择班级', variant: 'info' });
      return;
    }

    setOfflineEnrollLoading(true);
    try {
      // 1. 创建订单
      const orderData = {
        type: 'class',
        classId: classId,
        className: className,
        courseId: '', // 线下班不关联视频课程
        phone: memberPhone,
        buyerName: offlineEnrollForm.memberName || '',
        buyerPhone: memberPhone,
        userName: offlineEnrollForm.memberName || '',
        paymentMethod: 'offline',
        paymentStatus: 'paid',
        amount: amount || 0,
        status: 'paid',
        notes: offlineEnrollForm.notes,
      };

      const orderResult = await adminService.add('orders', {
        ...orderData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (orderResult.code !== 0) {
        throw new Error(orderResult.message || '创建订单失败');
      }

      const orderResultData = orderResult.data as { _id?: string; id?: string } | undefined;
      const orderId = orderResultData?._id || orderResultData?.id;

      // 2. 调用 grantPermission 开放权限（自动创建报名记录+授予权限）
      const grantResult = await orderService.grantPermission(orderId || '');

      if (grantResult.code === 0) {
        await confirm({ title: '提示', message: '线下报名成功！学员权限已自动开放。', variant: 'info' });
        setOfflineEnrollModalOpen(false);
        loadOrders();
      } else {
        // 订单已创建但权限开放失败，提示用户
        await confirm({ title: '提示', message: `订单已创建（${orderId}），但权限开放失败：${grantResult.message}。请手动开放权限。`, variant: 'info' });
        setOfflineEnrollModalOpen(false);
        loadOrders();
      }
    } catch (error) {
      console.error('线下报名失败:', error);
      await confirm({ title: '提示', message: (error as Error).message || '线下报名失败，请重试', variant: 'info' });
    } finally {
      setOfflineEnrollLoading(false);
    }
  };

  // 获取来源标签
  const getSourceBadge = (source?: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      'online_purchase': { text: '线上购买', color: 'bg-blue-100 text-blue-700' },
      'online_enroll': { text: '线上报名', color: 'bg-green-100 text-green-700' },
      'offline_enroll': { text: '线下报名', color: 'bg-orange-100 text-orange-700' },
      'hybrid': { text: '混合用户', color: 'bg-purple-100 text-purple-700' },
    };
    const badge = badges[source || ''] || { text: '未分类', color: 'bg-gray-100 text-gray-700' };
    return <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${badge.color}`}>{badge.text}</span>;
  };

  // 获取等级标签
  const getLevelBadge = (level?: string) => {
    const levels: Record<string, { text: string; color: string }> = {
      'beginner': { text: '初级', color: 'text-blue-600' },
      'intermediate': { text: '中级', color: 'text-yellow-600' },
      'advanced': { text: '高级', color: 'text-green-600' },
    };
    if (!level) return null;
    const lv = levels[level] || { text: level, color: 'text-gray-600' };
    return <span className={`text-xs ${lv.color}`}>{lv.text}</span>;
  };

  // 渲染订单行
  const renderOrderRow = (order: any) => (
    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="font-medium text-gray-900">{order._id.substring(0, 12)}...</div>
          <div className="text-xs text-gray-500">{order.enrolledAt || order.createdAt ? new Date(order.enrolledAt || order.createdAt).toLocaleString() : '-'}</div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <User size={18} className="text-green-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {order.memberName}
              {getSourceBadge(order.memberSource)}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              {order.memberPhone}
              {order.memberId && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs bg-gray-100 px-1 rounded" title="会员ID">{order.memberId.substring(0, 10)}...</span>
                </>
              )}
            </div>
            {order.memberLevel && getLevelBadge(order.memberLevel) && (
              <div className="mt-0.5">
                {getLevelBadge(order.memberLevel)}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="font-medium text-gray-900">{order.courseName || '培训班课程'}</div>
          <div className="text-xs text-gray-500">
            排课ID: {order.scheduleId || '-'}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[order.status || 'pending']?.color || 'bg-gray-100'}`}>
          {STATUS_LABELS[order.status || 'pending']?.text || order.status}
        </span>
        {order.permissionGranted && (
          <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
            权限已开
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="font-medium text-gray-900">¥{order.amount || 0}</div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm">
          {order.memberId ? (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span className="text-purple-600">关联会员</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-blue-600">游客订单</span>
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedOrder(order);
              setGrantModalOpen(true);
            }}
            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
            title="开放权限"
          >
            <Key size={18} className="text-green-600" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <AdminPageTemplate
      title="培训班订单"
      description="管理线上/线下报名培训班的订单，线下报名需手动开放权限"
    >
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总订单</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users size={24} className="text-gray-400" />
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
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">游客订单</p>
              <p className="text-2xl font-bold text-blue-600">{stats.onlinePaid}</p>
              <p className="text-xs text-gray-400">未关联会员</p>
            </div>
            <CreditCard size={24} className="text-blue-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-purple-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">会员订单</p>
              <p className="text-2xl font-bold text-purple-600">{stats.offlinePaid}</p>
              <p className="text-xs text-gray-400">已关联会员</p>
            </div>
            <Users size={24} className="text-purple-400" />
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
                placeholder="搜索订单号、用户姓名、手机号、班级..."
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
            <option value="paid_offline">线下已付</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>

          <select
            value={filterPaymentMethod}
            onChange={(e) => {
              setFilterPaymentMethod(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">全部支付方式</option>
            <option value="online">线上支付</option>
            <option value="offline">线下支付</option>
          </select>

          <button
            onClick={openOfflineEnrollModal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            新增线下报名
          </button>

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
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">暂无培训班订单</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">订单信息</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">学员信息</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">班级</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">金额</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">来源</th>
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

      <ConfirmDialog />

      {/* 开放权限弹窗 */}
      <Modal
        isOpen={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        title="开放培训权限"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">确认要为以下学员开放培训权限？</p>
            {/* @ts-expect-error selectedOrder 包含动态字段 */}
            <div className="font-medium text-gray-900 flex items-center gap-2">
              {selectedOrder?.memberName || (selectedOrder as { userName?: string }).userName || (selectedOrder as { buyerName?: string }).buyerName || '未知学员'}
              {/* @ts-expect-error selectedOrder 包含动态字段 */}
              {getSourceBadge((selectedOrder as { memberSource?: string }).memberSource)}
            </div>
            <div className="text-sm text-gray-500">
              {/* @ts-expect-error selectedOrder 包含动态字段 */}
              {selectedOrder?.memberPhone || (selectedOrder as { phone?: string }).phone || (selectedOrder as { buyerPhone?: string }).buyerPhone || '-'}
            </div>
            {/* @ts-expect-error selectedOrder 包含动态字段 */}
            {selectedOrder?.memberId && (
              <div className="text-xs text-gray-400 mt-1">
                {/* @ts-expect-error selectedOrder 包含动态字段 */}
                会员ID: {(selectedOrder as { memberId: string }).memberId}
              </div>
            )}
            <div className="text-sm text-gray-500 mt-1">
              {/* @ts-expect-error selectedOrder 包含动态字段 */}
              班级：{selectedOrder?.courseName || (selectedOrder as { className?: string }).className || '-'}
            </div>
            {/* @ts-expect-error selectedOrder 包含动态字段 */}
            {selectedOrder?.memberLevel && (
              <div className="text-sm mt-1">
                {/* @ts-expect-error selectedOrder 包含动态字段 */}
                学习等级：{getLevelBadge((selectedOrder as { memberLevel: string }).memberLevel)}
              </div>
            )}
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              开放权限后，用户将可以：
            </p>
            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
              <li>• 查看培训课表</li>
              <li>• 记录出勤签到</li>
              <li>• 申请调课</li>
              <li>• 如果班级赠送视频课程，也可学习视频</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setGrantModalOpen(false)}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleGrantPermission}
              disabled={granting}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {granting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  处理中...
                </>
              ) : (
                <>
                  <Key size={18} />
                  确认开放权限
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* 新增线下报名弹窗 */}
      <Modal
        isOpen={offlineEnrollModalOpen}
        onClose={() => setOfflineEnrollModalOpen(false)}
        title="新增线下报名"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              线下报名将自动创建订单并开放培训权限，学员可直接使用手机号登录学习。
            </p>
          </div>

          {/* 手机号查询 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学员手机号 *</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={offlineEnrollForm.memberPhone}
                onChange={(e) => setOfflineEnrollForm(prev => ({ ...prev, memberPhone: e.target.value }))}
                placeholder="请输入手机号"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={searchMember}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                查询
              </button>
            </div>
            {offlineEnrollForm.memberName && (
              <p className="text-sm text-green-600 mt-1">
                ✓ 找到会员：{offlineEnrollForm.memberName}
              </p>
            )}
          </div>

          {/* 选择班级 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择班级 *</label>
            <select
              value={offlineEnrollForm.classId}
              onChange={(e) => {
                const selected = availableClasses.find(c => c._id === e.target.value);
                setOfflineEnrollForm(prev => ({
                  ...prev,
                  classId: e.target.value,
                  className: selected?.name || '',
                }));
              }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={classesLoading}
            >
              <option value="">
                {classesLoading ? '加载中...' : availableClasses.length === 0 ? '暂无可用班级' : '请选择班级'}
              </option>
              {availableClasses.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name || cls.className || cls.title || `班级-${cls._id?.substring(0, 8)}`}
                  {cls.status !== 'active' ? ` (${cls.status === 'inactive' ? '已停用' : cls.status})` : ''}
                </option>
              ))}
            </select>
            {availableClasses.length === 0 && !classesLoading && (
              <p className="text-xs text-orange-500 mt-1">
                提示：当前没有可用班级，请在「班级管理」中添加班级
              </p>
            )}
          </div>

          {/* 缴费金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">缴费金额</label>
            <input
              type="number"
              value={offlineEnrollForm.amount}
              onChange={(e) => setOfflineEnrollForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={offlineEnrollForm.notes}
              onChange={(e) => setOfflineEnrollForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="可选，添加报名备注信息"
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setOfflineEnrollModalOpen(false)}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleOfflineEnroll}
              disabled={offlineEnrollLoading}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {offlineEnrollLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  处理中...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  确认报名
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </AdminPageTemplate>
  );
}
