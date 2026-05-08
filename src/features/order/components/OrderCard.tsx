/**
 * OrderCard - 订单卡片组件
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import type { Order } from '../types/Order';

// ============================================================================
// Props
// ============================================================================

export interface OrderCardProps {
  /** 订单信息 */
  order: Order;
  /** 点击事件 */
  onClick?: () => void;
  /** 操作按钮 */
  actions?: React.ReactNode;
}

// ============================================================================
// 组件
// ============================================================================

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onClick,
  actions,
}) => {
  // 获取状态颜色和图标
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'text-orange-500 bg-orange-50',
          icon: Clock,
          text: '待支付',
        };
      case 'paid':
        return {
          color: 'text-green-500 bg-green-50',
          icon: CheckCircle,
          text: '已支付',
        };
      case 'cancelled':
      case 'expired':
        return {
          color: 'text-gray-500 bg-gray-50',
          icon: XCircle,
          text: status === 'cancelled' ? '已取消' : '已过期',
        };
      case 'refunded':
        return {
          color: 'text-red-500 bg-red-50',
          icon: XCircle,
          text: '已退款',
        };
      default:
        return {
          color: 'text-gray-500 bg-gray-50',
          icon: Clock,
          text: status,
        };
    }
  };

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'course':
        return '课程';
      case 'class':
        return '班级';
      case 'product':
        return '商品';
      default:
        return type;
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
            {getTypeLabel(order.type)}
          </span>
          <span className="text-sm text-gray-500">
            订单号：{order.orderNo}
          </span>
        </div>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${statusInfo.color}`}>
          <StatusIcon className="w-3 h-3" />
          {statusInfo.text}
        </span>
      </div>

      {/* 商品信息 */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* 封面图 */}
          {order.targetCover && (
            <img
              src={order.targetCover}
              alt={order.targetName}
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
          )}
          
          {/* 商品详情 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 line-clamp-2">
              {order.targetName}
            </h3>
            
            {/* 订单金额 */}
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                ¥{order.paidAmount || order.amount}
              </span>
              {order.discountAmount && order.discountAmount > 0 && (
                <span className="text-sm text-green-500">
                  已优惠 ¥{order.discountAmount}
                </span>
              )}
            </div>

            {/* 时间 */}
            <div className="mt-1 text-xs text-gray-400">
              {order.status === 'pending' && order.expiredAt && (
                <>支付剩余时间：{formatTime(order.expiredAt)}</>
              )}
              {order.status !== 'pending' && order.paidAt && (
                <>支付时间：{formatTime(order.paidAt)}</>
              )}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        {actions && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 导出
// ============================================================================

export default OrderCard;
