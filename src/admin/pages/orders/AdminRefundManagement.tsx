// ============================================================================
// 管理后台 - 退款管理（统一入口）
// 功能：
//   1. 退款申请列表（待处理/已退款/已拒绝） + 审核弹窗（共享 RefundReviewModal）
//   2. 退款规则设置入口（培训班固定比例 / 班级单独比例 / 课程阶梯规则）
// 数据来源：refundRequests 集合（列表）+ refundConfig 集合（规则概览）
// ============================================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/admin/hooks/useConfirm';
import {
  RefreshCw, AlertCircle, CheckCircle, XCircle, Percent,
  Settings, ArrowRight, Search
} from 'lucide-react';
import { financeService } from '@/services/financeService';
import { refundConfigService } from '@/services/refundConfigService';
import RefundReviewModal from '@/components/admin/RefundReviewModal';

type RefundStatus = 'all' | 'pending' | 'approved' | 'rejected';

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

export default function AdminRefundManagement() {
  const { ConfirmDialog } = useConfirm();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [refundList, setRefundList] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<RefundStatus>('all');
  const [keyword, setKeyword] = useState('');
  const [refundPage, setRefundPage] = useState(1);
  const [refundPageSize] = useState(10);

  // 退款规则概览
  const [config, setConfig] = useState<{
    classFeeRate: number;
    tierCount: number;
    overrideCount: number;
  } | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  // 审核弹窗
  const [refundModal, setRefundModal] = useState<{ isOpen: boolean; refund: any | null }>({
    isOpen: false,
    refund: null,
  });

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const result: any = await financeService.getRefundList({
        page: refundPage,
        pageSize: refundPageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
        keyword: keyword.trim() || undefined,
      });
      if (result.code === 0) {
        setRefundList(result.data?.list || []);
      } else {
        setRefundList([]);
      }
    } catch (error) {
      console.error('加载退款列表失败:', error);
      setRefundList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const res: any = await refundConfigService.getConfig();
      if (res.code === 0 && res.data) {
        const cfg = res.data;
        setConfig({
          classFeeRate: Number(cfg.classFeeRate ?? 0.1),
          tierCount: Array.isArray(cfg.courseTiers) ? cfg.courseTiers.length : 0,
          overrideCount: cfg.classOverrides ? Object.keys(cfg.classOverrides).length : 0,
        });
      }
    } catch (error) {
      console.error('加载退款规则概览失败:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refundPage, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setRefundPage(1);
    loadRefunds();
  };

  const openReview = (refund: any) => setRefundModal({ isOpen: true, refund });

  const getStatusBadge = (status: string) => {
    if (status === 'pending')
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <AlertCircle size={12} /> 待处理
        </span>
      );
    if (status === 'approved')
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle size={12} /> 已退款
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        <XCircle size={12} /> 已拒绝
      </span>
    );
  };

  const pendingCount = refundList.filter((r) => r.status === 'pending').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">退款管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            处理用户退款申请、审核退款，并管理退款手续费规则
          </p>
        </div>
        <button
          onClick={() => { loadRefunds(); loadConfig(); }}
          disabled={loading || configLoading}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} /> 刷新
        </button>
      </div>

      {/* 退款规则概览卡片 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
              <Percent size={22} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">退款规则设置</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                配置培训班固定手续费比例、班级单独比例与课程阶梯退款规则
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/refund-config')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Settings size={16} /> 前往设置
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="bg-white rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-gray-500">培训班默认手续费比例</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {configLoading ? '—' : `${((config?.classFeeRate ?? 0.1) * 100).toFixed(0)}%`}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-gray-500">课程阶梯规则数</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {configLoading ? '—' : config?.tierCount ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-gray-500">班级单独比例数</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {configLoading ? '—' : config?.overrideCount ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* 退款申请列表 */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="text-red-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">退款申请</h3>
              <p className="text-xs text-gray-500">
                {pendingCount > 0 ? `有 ${pendingCount} 笔待处理` : '暂无待处理申请'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="搜索订单号/手机号"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as RefundStatus); setRefundPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">全部状态</option>
              <option value="pending">待处理</option>
              <option value="approved">已退款</option>
              <option value="rejected">已拒绝</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              查询
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : refundList.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <CheckCircle className="mx-auto mb-4 text-gray-300" size={56} />
            <p>暂无退款记录</p>
            <p className="text-sm text-gray-400 mt-1">
              小程序端发起或管理员代发起的退款申请会显示在这里
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">订单号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">手机号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">申请金额</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">原因</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">申请时间</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {refundList.map((refund) => (
                  <tr key={refund._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{refund.orderNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{refund.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600">
                      {formatMoney(refund.amount ?? refund.requestAmount ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                      {refund.reason || '-'}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(refund.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {refund.createdAt ? new Date(refund.createdAt).toLocaleString('zh-CN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {refund.status === 'pending' ? (
                        <button
                          onClick={() => openReview(refund)}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
                        >
                          审核
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">已处理</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && refundList.length > 0 && (
          <div className="flex justify-between items-center px-6 py-4 border-t">
            <span className="text-sm text-gray-500">共 {refundList.length} 条记录</span>
            <div className="flex gap-2">
              <button
                onClick={() => setRefundPage((p) => Math.max(1, p - 1))}
                disabled={refundPage === 1}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setRefundPage((p) => p + 1)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog />

      {/* 退款审核弹窗（与财务统计、课程订单共用同一管线） */}
      <RefundReviewModal
        isOpen={refundModal.isOpen}
        refund={refundModal.refund}
        onClose={() => setRefundModal({ isOpen: false, refund: null })}
        onDone={() => {
          setRefundModal({ isOpen: false, refund: null });
          loadRefunds();
        }}
      />
    </div>
  );
}
