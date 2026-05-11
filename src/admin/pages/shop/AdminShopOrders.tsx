// ============================================================================
// 商城订单管理 - 后台（Tailwind + 自定义组件）
// ============================================================================

import { useState, useEffect } from 'react'
import { Button, Input, Modal } from '@/components'
import { Eye, Truck } from 'lucide-react'
import { unifiedOrderApi } from '@/shared/services/unifiedOrderApi'
import type { UnifiedOrder } from '@/shared/types/unifiedOrder'

export default function AdminShopOrders() {
  const [orders, setOrders] = useState<UnifiedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [shipDialogOpen, setShipDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null)
  const [shipData, setShipData] = useState({ company: '', trackingNumber: '' })

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const filters = statusFilter !== 'all' ? { orderType: 'shop', status: statusFilter } : { orderType: 'shop' }
      // @ts-ignore
      const data = await unifiedOrderApi.getList(filters)
      setOrders(data.orders)
    } catch (err) {
      console.error('加载订单失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (order: UnifiedOrder) => {
    setSelectedOrder(order)
    setDetailDialogOpen(true)
  }

  const handleOpenShipDialog = (order: UnifiedOrder) => {
    setSelectedOrder(order)
    setShipData({ company: '', trackingNumber: '' })
    setShipDialogOpen(true)
  }

  const handleShip = async () => {
    if (!selectedOrder) return
    try {
      await unifiedOrderApi.shipOrder(selectedOrder._id, shipData)
      setShipDialogOpen(false)
      loadOrders()
    } catch (err) {
      console.error('发货失败:', err)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-600',
      paid: 'bg-blue-100 text-blue-700',
      shipped: 'bg-amber-100 text-amber-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      refunded: 'bg-red-100 text-red-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-600'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待付款',
      paid: '已付款',
      shipped: '已发货',
      delivered: '已签收',
      cancelled: '已取消',
      refunded: '已退款'
    }
    return labels[status] || status
  }

  return (
    <div className="p-6">
      {/* 标题 */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">商城订单管理</h1>

      {/* 状态筛选 */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
        >
          <option value="all">全部</option>
          <option value="pending">待付款</option>
          <option value="paid">已付款</option>
          <option value="shipped">已发货</option>
          <option value="delivered">已签收</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      {/* 订单表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">订单号</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">商品</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">金额</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">暂无订单</td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">{order.orderNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{order.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {order.shopItems?.map(item => item.productName).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">¥{order.finalAmount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetail(order)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {order.status === 'paid' && (
                        <button
                          onClick={() => handleOpenShipDialog(order)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="发货"
                        >
                          <Truck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 详情对话框 */}
      <Modal
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        title="订单详情"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">订单号</p>
                <p className="font-mono">{selectedOrder.orderNo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">用户手机</p>
                <p>{selectedOrder.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">订单金额</p>
                <p className="font-medium">¥{selectedOrder.finalAmount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">订单状态</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusLabel(selectedOrder.status)}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">商品列表</p>
              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                {selectedOrder.shopItems?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span>{item.productName} x {item.quantity}</span>
                    <span className="text-gray-500">¥{item.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedOrder.shippingAddress && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">收货地址</p>
                <p className="text-gray-600">
                  {selectedOrder.shippingAddress.province} {selectedOrder.shippingAddress.city} {selectedOrder.shippingAddress.detail}
                </p>
              </div>
            )}

            {selectedOrder.shippingInfo && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">物流信息</p>
                <p className="text-gray-600">快递公司: {selectedOrder.shippingInfo.company}</p>
                <p className="text-gray-600">快递单号: {selectedOrder.shippingInfo.trackingNumber}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
            关闭
          </Button>
        </div>
      </Modal>

      {/* 发货对话框 */}
      <Modal
        open={shipDialogOpen}
        onClose={() => setShipDialogOpen(false)}
        title="发货"
      >
        <div className="space-y-4">
          <Input
            label="快递公司"
            value={shipData.company}
            onChange={e => setShipData({ ...shipData, company: e.target.value })}
            placeholder="请输入快递公司名称"
          />
          <Input
            label="快递单号"
            value={shipData.trackingNumber}
            onChange={e => setShipData({ ...shipData, trackingNumber: e.target.value })}
            placeholder="请输入快递单号"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setShipDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={handleShip}>
            确认发货
          </Button>
        </div>
      </Modal>
    </div>
  )
}
