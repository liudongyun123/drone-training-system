// ============================================================================
// 退款审核弹窗（共享组件）
// 财务统计页 / 课程订单页共用，统一走 refundRequests + approveRefund 管线
// ============================================================================
import { useState, useEffect } from 'react';
import { useConfirm } from '@/admin/hooks/useConfirm';
import { financeService } from '@/services/financeService';

interface RefundReviewModalProps {
  isOpen: boolean;
  refund: any | null;
  onClose: () => void;
  onDone?: () => void;
}

export default function RefundReviewModal({ isOpen, refund, onClose, onDone }: RefundReviewModalProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [reviewActualAmount, setReviewActualAmount] = useState(0);
  const [reviewFee, setReviewFee] = useState(0);
  const [reviewNote, setReviewNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (refund) {
      setReviewActualAmount(Number(refund?.actualAmount ?? refund?.amount ?? 0));
      setReviewFee(Number(refund?.fee ?? 0));
      setReviewNote('');
      setRejectReason('');
    }
  }, [refund]);

  if (!isOpen || !refund) return null;

  const close = () => {
    setSubmitting(false);
    onClose();
  };

  const handleApprove = async () => {
    const total = Number(refund.totalAmount ?? 0);
    const actual = Number(reviewActualAmount);
    const fee = Number(reviewFee);
    if (actual < 0 || fee < 0 || actual + fee > total + 0.001) {
      await confirm({
        title: '提示',
        message: '实退金额 + 手续费 不能超过订单总金额',
        variant: 'info'
      });
      return;
    }
    setSubmitting(true);
    try {
      const result: any = await financeService.approveRefund(refund._id, {
        actualAmount: actual,
        fee: fee,
        reviewNote
      });
      if (result.code === 0) {
        await confirm({ title: '操作成功', message: '已确认退款，正在执行退款', variant: 'success' });
        close();
        onDone && onDone();
      } else {
        await confirm({ title: '操作失败', message: result.message || '退款失败', variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      await confirm({ title: '提示', message: '请输入拒绝原因', variant: 'info' });
      return;
    }
    setSubmitting(true);
    try {
      const result: any = await financeService.rejectRefund(refund._id, rejectReason);
      if (result.code === 0) {
        await confirm({ title: '操作成功', message: '已拒绝退款申请', variant: 'success' });
        close();
        onDone && onDone();
      } else {
        await confirm({ title: '操作失败', message: result.message || '拒绝失败', variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const orderTypeLabel = refund.orderType === 'class' ? '培训班' : refund.orderType === 'shop' ? '商品' : '课程';

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">退款审核</h2>
          <p className="text-sm text-gray-500 mt-1">
            订单号: {refund.orderNo}
            {refund.phone ? ` · 手机号: ${refund.phone}` : ''}
            {refund.orderType ? ` · 类型: ${orderTypeLabel}` : ''}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">订单总金额</p>
              <p className="text-xl font-bold text-gray-800">
                ¥{Number(refund.totalAmount ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">计算规则</p>
              <p className="text-sm font-medium text-gray-800">{refund.rule || '管理员手填'}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户申请原因</label>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              {refund.reason || '（未填写）'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">实退金额（元）</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={reviewActualAmount}
                onChange={(e) => setReviewActualAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">手续费（元）</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={reviewFee}
                onChange={(e) => setReviewFee(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">审核备注</label>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              rows={2}
              placeholder="可选，将记录到退款单"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              拒绝原因（点"拒绝"时必填，将通知用户）
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              rows={2}
              placeholder="请输入拒绝原因"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex gap-3">
          <button
            onClick={close}
            disabled={submitting}
            className="flex-1 py-2.5 border hover:bg-gray-50 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            确认退款
          </button>
          <button
            onClick={handleReject}
            disabled={submitting}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            拒绝
          </button>
        </div>
      </div>
    </div>
    <ConfirmDialog />
    </>
  );
}
