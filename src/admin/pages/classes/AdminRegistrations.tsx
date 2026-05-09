// ============================================================================
// 管理后台 - 报名管理
// 功能：课程选课记录管理
// 版本：v20260415-member-layout-fix
// 数据来源：enrollments 集合
// ============================================================================
import { useState, useEffect } from 'react';
import AdminPageTemplate from '@/admin/pages/system/_AdminPageTemplate';
import { enrollmentService } from '@/services';
import type { Registration as Enrollment } from '@/types/registration';
import {
  Search, User, Phone, BookOpen, CreditCard,
  ChevronLeft, ChevronRight, Plus, AlertCircle, Calendar, RefreshCw,
  TrendingUp
} from 'lucide-react';

// 状态标签
const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  active: { text: '正常', color: 'bg-green-100 text-green-700' },
  cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' },
  pending: { text: '待审核', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { text: '已确认', color: 'bg-blue-100 text-blue-700' },
};

// 支付状态标签
const PAYMENT_STATUS_LABELS: Record<string, { text: string; color: string }> = {
  unpaid: { text: '未支付', color: 'bg-yellow-100 text-yellow-700' },
  paid: { text: '已支付', color: 'bg-green-100 text-green-700' },
  refunded: { text: '已退款', color: 'bg-purple-100 text-purple-700' },
};

// 来源类型标签
const SOURCE_LABELS: Record<string, { text: string; color: string }> = {
  online_purchase: { text: '线上购买', color: 'bg-blue-100 text-blue-700' },
  online_enroll: { text: '线上报名', color: 'bg-cyan-100 text-cyan-700' },
  offline_enroll: { text: '线下报名', color: 'bg-orange-100 text-orange-700' },
  hybrid: { text: '混合用户', color: 'bg-purple-100 text-purple-700' },
};

export default function AdminRegistrations() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // 筛选状态
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    unpaid: 0,
    refunded: 0,
  });

  // 加载报名列表
  const loadRegistrations = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const query: Record<string, unknown> = {};
      if (filterStatus) query.status = filterStatus;
      if (filterPaymentStatus) query.paymentStatus = filterPaymentStatus;
      if (searchKeyword) {
        query.$or = [
          { userName: { $regex: searchKeyword, $options: 'i' } },
          { phone: { $regex: searchKeyword, $options: 'i' } },
          { userId: { $regex: searchKeyword, $options: 'i' } },
          { courseName: { $regex: searchKeyword, $options: 'i' } }
        ];
      }

      const result = await enrollmentService.getList(query, { page, pageSize });
      if (result.code === 0) {
        // @ts-ignore
        const safeList = result.data?.data?.list || result.data?.list || [];
        // @ts-ignore
        const safeTotal = result.data?.data?.total || result.data?.total || 0;
        setEnrollments(safeList);
        setTotal(safeTotal);

        // 计算统计数据
        const allResult = await enrollmentService.getList({}, { page: 1, pageSize: 1000 });
        if (allResult.code === 0) {
          // @ts-ignore
          const allList = allResult.data?.data?.list || allResult.data?.list || [];
          setStats({
            total: safeTotal,
            paid: allList.filter((e: any) => e.paymentStatus === 'paid').length,
            unpaid: allList.filter((e: any) => e.paymentStatus === 'unpaid').length,
            refunded: allList.filter((e: any) => e.paymentStatus === 'refunded').length,
          });
        }
      }
    } catch (error) {
      console.error('加载报名列表失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 刷新
  const handleRefresh = () => {
    setRefreshing(true);
    loadRegistrations(false);
  };

  useEffect(() => {
    loadRegistrations();
  }, [page, filterStatus, filterPaymentStatus, searchKeyword]);

  // 渲染来源标签
  const renderSourceBadge = (source: string) => {
    const label = SOURCE_LABELS[source];
    if (label) {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${label.color}`}>
          {label.text}
        </span>
      );
    }
    return source ? (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        {source}
      </span>
    ) : null;
  };

  return (
    <AdminPageTemplate
      title="报名管理"
      description="管理课程选课记录"
      // @ts-ignore
      icon={BookOpen}
    >
      {/* 统计卡片 - 优化的视觉层次 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stats-card group hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-blue-500/20 text-blue-500 group-hover:scale-110 transition-transform">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0">
              <p className="stat-label">总记录</p>
              <p className="stat-value text-2xl">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="stats-card group hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-green-500/20 text-green-500 group-hover:scale-110 transition-transform">
              <CreditCard size={20} />
            </div>
            <div className="min-w-0">
              <p className="stat-label">已支付</p>
              <p className="stat-value text-2xl text-green-600">{stats.paid}</p>
            </div>
            {stats.total > 0 && (
              <span className="ml-auto text-xs text-green-600 font-medium">
                {Math.round(stats.paid / stats.total * 100)}%
              </span>
            )}
          </div>
        </div>
        <div className="stats-card group hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-yellow-500/20 text-yellow-500 group-hover:scale-110 transition-transform">
              <AlertCircle size={20} />
            </div>
            <div className="min-w-0">
              <p className="stat-label">未支付</p>
              <p className="stat-value text-2xl text-yellow-600">{stats.unpaid}</p>
            </div>
            {stats.total > 0 && (
              <span className="ml-auto text-xs text-yellow-600 font-medium">
                {Math.round(stats.unpaid / stats.total * 100)}%
              </span>
            )}
          </div>
        </div>
        <div className="stats-card group hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-purple-500/20 text-purple-500 group-hover:scale-110 transition-transform">
              <TrendingUp size={20} />
            </div>
            <div className="min-w-0">
              <p className="stat-label">已退款</p>
              <p className="stat-value text-2xl">{stats.refunded}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 工具栏 - 优化对齐和间距 */}
      <div className="bg-base-100 rounded-xl shadow-sm border border-base-200 p-4 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* 左侧筛选区 */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="搜索学员姓名、手机号..."
                className="input input-bordered input-sm w-full pl-9"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              className="select select-bordered select-sm"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="cancelled">已取消</option>
              <option value="pending">待审核</option>
              <option value="confirmed">已确认</option>
            </select>

            <select
              className="select select-bordered select-sm"
              value={filterPaymentStatus}
              onChange={(e) => {
                setFilterPaymentStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">全部支付状态</option>
              <option value="paid">已支付</option>
              <option value="unpaid">未支付</option>
              <option value="refunded">已退款</option>
            </select>
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-2 lg:ml-auto">
            <button
              onClick={handleRefresh}
              className="btn btn-outline btn-sm"
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 表格 - 使用统一的 card 组件 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">暂无报名记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>学员信息</th>
                    <th>课程</th>
                    <th>来源</th>
                    <th>状态</th>
                    <th>支付状态</th>
                    <th>金额</th>
                    <th>报名时间</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment._id} className="hover:bg-base-200/50 transition-colors">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User size={18} className="text-blue-600" />
                          </div>
                          <div>
                            {/* @ts-expect-error - 兼容扩展字段 */}
                            <div className="font-medium">{(enrollment as { userName?: string }).userName || (enrollment as { userId?: string }).userId || '-'}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone size={12} />
                              {enrollment.phone || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-sm">{enrollment.courseName || enrollment.courseId || '-'}</div>
                      </td>
                      <td>
                        {renderSourceBadge(enrollment.source || '')}
                      </td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[enrollment.status || 'active']?.color || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[enrollment.status || 'active']?.text || enrollment.status || '-'}
                        </span>
                      </td>
                      <td>
                        {/* @ts-expect-error - 兼容扩展字段 */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_LABELS[(enrollment as { paymentStatus?: string }).paymentStatus || 'unpaid']?.color || 'bg-gray-100 text-gray-600'}`}>
                          {/* @ts-expect-error - 兼容扩展字段 */}
                          {PAYMENT_STATUS_LABELS[(enrollment as { paymentStatus?: string }).paymentStatus || 'unpaid']?.text || (enrollment as { paymentStatus?: string }).paymentStatus || '-'}
                        </span>
                      </td>
                      <td>
                        <span className="font-medium text-primary">¥{enrollment.amount || 0}</span>
                      </td>
                      <td>
                        <div className="text-sm text-gray-500">
                          {enrollment.enrollmentDate ? new Date(enrollment.enrollmentDate).toLocaleDateString('zh-CN') : '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 分页 */}
          {total > pageSize && (
            <div className="flex justify-center items-center gap-2 p-4 border-t">
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm">
                第 {page} / {Math.ceil(total / pageSize)} 页
              </span>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                disabled={page >= Math.ceil(total / pageSize)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminPageTemplate>
  );
}
