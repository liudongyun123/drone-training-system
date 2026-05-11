/**
 * 营销工具 - 优惠券和拼团管理 (Tailwind CSS版本)
 */
import { useState, useEffect } from 'react';
import type { Coupon, GroupBuy } from '@/types';
import { couponService } from '@/services/couponService';
import { groupBuyService } from '@/services/groupBuyService';
import {
  TicketPercent, Users, Plus, Search, Edit2, Trash2, Ban, X, Save,
  Loader2, AlertTriangle
} from 'lucide-react';

// 状态标签配置
const StatusChip = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; class: string }> = {
    active: { label: '进行中', class: 'bg-green-100 text-green-700' },
    expired: { label: '已过期', class: 'bg-red-100 text-red-700' },
    disabled: { label: '已禁用', class: 'bg-slate-100 text-slate-500' },
    completed: { label: '已完成', class: 'bg-green-100 text-green-700' },
  };
  const conf = config[status] || { label: status, class: 'bg-slate-100 text-slate-500' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conf.class}`}>{conf.label}</span>;
};

// 优惠券表单弹窗
function CouponForm({ open, onClose, onSubmit, initialData }: {
  open: boolean; onClose: () => void; onSubmit: (data: any) => void; initialData?: Coupon | null;
}) {
  const [formData, setFormData] = useState({
    code: '', type: 'fixed' as 'fixed' | 'percent', value: 0, minAmount: 0,
    maxDiscount: undefined as number | undefined, totalCount: 100, validFrom: '', validTo: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '', type: initialData.type || 'fixed', value: initialData.value || 0,
        minAmount: initialData.minAmount || 0, maxDiscount: initialData.maxDiscount,
        totalCount: initialData.totalCount || 0,
        validFrom: (initialData.validFrom || '').slice(0, 10), validTo: (initialData.validTo || '').slice(0, 10),
      });
    } else {
      setFormData({ code: '', type: 'fixed', value: 0, minAmount: 0, maxDiscount: undefined, totalCount: 100, validFrom: '', validTo: '' });
    }
  }, [initialData, open]);

  const handleSubmit = () => {
    onSubmit({ ...formData, validFrom: new Date(formData.validFrom).toISOString(), validTo: new Date(formData.validTo).toISOString(), status: 'active' });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">{initialData ? '编辑优惠券' : '新建优惠券'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">优惠券码</label>
            <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
              placeholder="例如：WELCOME2024"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">优惠类型</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="fixed">固定金额</option><option value="percent">百分比折扣</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{formData.type === 'fixed' ? '优惠金额 (元)' : '折扣百分比 (%)'}</label>
              <input type="number" value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          {formData.type === 'percent' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">最大优惠金额 (元)</label>
              <input type="number" value={formData.maxDiscount || ''} onChange={e => setFormData({...formData, maxDiscount: Number(e.target.value) || undefined})}
                placeholder="不限制则不填"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">最低消费金额 (元)</label>
              <input type="number" value={formData.minAmount} onChange={e => setFormData({...formData, minAmount: Number(e.target.value)})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">发放数量</label>
              <input type="number" value={formData.totalCount} onChange={e => setFormData({...formData, totalCount: Number(e.target.value)})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">开始日期</label>
              <input type="date" value={formData.validFrom} onChange={e => setFormData({...formData, validFrom: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">结束日期</label>
              <input type="date" value={formData.validTo} onChange={e => setFormData({...formData, validTo: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-slate-100">取消</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
            <Save className="w-4 h-4" /> {initialData ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 拼团表单弹窗
function GroupBuyForm({ open, onClose, onSubmit, initialData }: {
  open: boolean; onClose: () => void; onSubmit: (data: any) => void; initialData?: GroupBuy | null;
}) {
  const [formData, setFormData] = useState({
    title: '', courseId: '', requiredCount: 3, price: 0, originalPrice: 0, validFrom: '', validTo: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '', courseId: initialData.courseId || '',
        requiredCount: initialData.requiredCount || 3, price: initialData.price || 0, originalPrice: initialData.originalPrice || 0,
        validFrom: (initialData.validFrom || '').slice(0, 10), validTo: (initialData.validTo || '').slice(0, 10),
      });
    } else {
      setFormData({ title: '', courseId: '', requiredCount: 3, price: 0, originalPrice: 0, validFrom: '', validTo: '' });
    }
  }, [initialData, open]);

  const handleSubmit = () => {
    onSubmit({ ...formData, validFrom: new Date(formData.validFrom).toISOString(), validTo: new Date(formData.validTo).toISOString(), status: 'active' });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">{initialData ? '编辑拼团' : '新建拼团'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">拼团标题</label>
            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="例如：CAAC执照 - 新春特惠拼团"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">课程ID</label>
            <input type="text" value={formData.courseId} onChange={e => setFormData({...formData, courseId: e.target.value})}
              placeholder="关联的课程ID"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">成团人数</label>
            <input type="number" value={formData.requiredCount} onChange={e => setFormData({...formData, requiredCount: Number(e.target.value)})}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">拼团价 (元)</label>
              <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">原价 (元)</label>
              <input type="number" value={formData.originalPrice} onChange={e => setFormData({...formData, originalPrice: Number(e.target.value)})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">开始日期</label>
              <input type="date" value={formData.validFrom} onChange={e => setFormData({...formData, validFrom: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">结束日期</label>
              <input type="date" value={formData.validTo} onChange={e => setFormData({...formData, validTo: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-slate-100">取消</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
            <Save className="w-4 h-4" /> {initialData ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 删除确认弹窗
function DeleteConfirm({ open, onClose, onConfirm, type }: {
  open: boolean; onClose: () => void; onConfirm: () => void; type: 'coupon' | 'groupbuy';
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">确认删除</h3>
          <p className="text-slate-500">确定要删除这个{type === 'coupon' ? '优惠券' : '拼团活动'}吗？此操作不可恢复。</p>
        </div>
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-slate-100">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">删除</button>
        </div>
      </div>
    </div>
  );
}

// 主组件
export default function AdminMarketing() {
  const [activeTab, setActiveTab] = useState('coupons');
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [couponStats, setCouponStats] = useState({ total: 0, active: 0, used: 0, expired: 0 });
  const [groupBuyStats, setGroupBuyStats] = useState({ total: 0, active: 0, completed: 0, expired: 0, totalParticipants: 0, totalSavings: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [groupBuyDialogOpen, setGroupBuyDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editingGroupBuy, setEditingGroupBuy] = useState<GroupBuy | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: 'coupon' | 'groupbuy'; id: string }>({ open: false, type: 'coupon', id: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [couponRes, groupBuyRes, couponStatRes, groupBuyStatRes] = await Promise.all([
        couponService.getList(), groupBuyService.getList(), couponService.getStats(), groupBuyService.getStats(),
      ]);
      // @ts-ignore
      setCoupons(couponRes.data || []);
      // @ts-ignore
      setGroupBuys(groupBuyRes.data || []);
      setCouponStats(couponStatRes.data || { total: 0, active: 0, used: 0, expired: 0 });
      setGroupBuyStats(groupBuyStatRes.data || { total: 0, active: 0, completed: 0, expired: 0, totalParticipants: 0, totalSavings: 0 });
    } catch (error) { console.error('[营销] 加载数据失败:', error); }
    finally { setLoading(false); }
  };

  const handleCreateCoupon = async (data: any) => {
    await couponService.create(data);
    setCouponDialogOpen(false);
    loadData();
  };

  const handleUpdateCoupon = async (data: any) => {
    if (!editingCoupon) return;
    await couponService.update(editingCoupon._id, data);
    setCouponDialogOpen(false);
    setEditingCoupon(null);
    loadData();
  };

  const handleCreateGroupBuy = async (data: any) => {
    await groupBuyService.create(data);
    setGroupBuyDialogOpen(false);
    loadData();
  };

  const handleUpdateGroupBuy = async (data: any) => {
    if (!editingGroupBuy) return;
    await groupBuyService.update(editingGroupBuy._id, data);
    setGroupBuyDialogOpen(false);
    setEditingGroupBuy(null);
    loadData();
  };

  const handleDelete = async () => {
    if (deleteConfirm.type === 'coupon') { await couponService.delete(deleteConfirm.id); }
    else { await groupBuyService.delete(deleteConfirm.id); }
    setDeleteConfirm({ ...deleteConfirm, open: false, id: '' });
    loadData();
  };

  const handleDisableCoupon = async (id: string) => { await couponService.disable(id); loadData(); };
  const handleEndGroupBuy = async (id: string) => { await groupBuyService.endGroupBuy(id); loadData(); };

  const filteredCoupons = coupons.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()) && (filterStatus === 'all' || c.status === filterStatus));
  const filteredGroupBuys = groupBuys.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()) && (filterStatus === 'all' || g.status === filterStatus));

  const openCreateDialog = () => {
    if (activeTab === 'coupons') { setEditingCoupon(null); setCouponDialogOpen(true); }
    else { setEditingGroupBuy(null); setGroupBuyDialogOpen(true); }
  };

  const openEditDialog = (item: any) => {
    if (activeTab === 'coupons') { setEditingCoupon(item); setCouponDialogOpen(true); }
    else { setEditingGroupBuy(item); setGroupBuyDialogOpen(true); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">营销工具</h2>
          <p className="text-sm text-slate-500 mt-1">管理优惠券和拼团活动</p>
        </div>
        <button onClick={openCreateDialog} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          <Plus className="w-4 h-4" /> {activeTab === 'coupons' ? '新建优惠券' : '新建拼团'}
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {activeTab === 'coupons' ? (
          <>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm text-center">
              <p className="text-3xl font-bold text-blue-600">{couponStats.total}</p>
              <p className="text-sm text-slate-500 mt-1">优惠券总数</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm text-center">
              <p className="text-3xl font-bold text-green-600">{couponStats.active}</p>
              <p className="text-sm text-slate-500 mt-1">进行中</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm text-center">
              <p className="text-3xl font-bold text-amber-600">{couponStats.used}</p>
              <p className="text-sm text-slate-500 mt-1">已使用</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm text-center">
              <p className="text-3xl font-bold text-red-600">{couponStats.expired}</p>
              <p className="text-sm text-slate-500 mt-1">已过期</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm text-center">
              <p className="text-3xl font-bold text-blue-600">{groupBuyStats.total}</p>
              <p className="text-sm text-slate-500 mt-1">拼团总数</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm text-center">
              <p className="text-3xl font-bold text-green-600">{groupBuyStats.active}</p>
              <p className="text-sm text-slate-500 mt-1">进行中</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm text-center">
              <p className="text-3xl font-bold text-purple-600">{groupBuyStats.totalParticipants}</p>
              <p className="text-sm text-slate-500 mt-1">参与人数</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm text-center">
              <p className="text-3xl font-bold text-emerald-600">{groupBuyStats.totalSavings}</p>
              <p className="text-sm text-slate-500 mt-1">累计优惠</p>
            </div>
          </>
        )}
      </div>

      {/* 标签页和内容 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* 标签页 */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'coupons' ? 'text-blue-600 border-blue-600 bg-white' : 'text-slate-600 border-transparent hover:text-blue-600'
            }`}>
            <TicketPercent className="w-4 h-4" /> 优惠券管理
          </button>
          <button onClick={() => setActiveTab('groupbuys')}
            className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === 'groupbuys' ? 'text-blue-600 border-blue-600 bg-white' : 'text-slate-600 border-transparent hover:text-blue-600'
            }`}>
            <Users className="w-4 h-4" /> 拼团管理
          </button>
        </div>

        {/* 搜索和筛选 */}
        <div className="p-4 flex gap-4 border-b border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder={activeTab === 'coupons' ? '搜索优惠券码...' : '搜索拼团标题...'}
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="all">全部</option><option value="active">进行中</option><option value="expired">已过期</option><option value="disabled">已禁用</option>
          </select>
        </div>

        {/* 优惠券列表 */}
        {activeTab === 'coupons' && (
          <div className="overflow-x-auto">
            {filteredCoupons.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <TicketPercent className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">暂无优惠券</p>
                <p className="text-sm mt-1">点击右上角按钮创建优惠券</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">优惠券码</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">优惠内容</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">使用条件</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">发放/使用</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">有效期</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">状态</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCoupons.map(coupon => (
                    <tr key={coupon._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono font-semibold text-slate-800">{coupon.code}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {coupon.type === 'fixed' ? `¥${coupon.value}` : `${coupon.value}%`}
                        {coupon.maxDiscount && ` (上限¥${coupon.maxDiscount})`}
                      </td>
                      <td className="px-6 py-4 text-slate-600">满¥{coupon.minAmount}可用</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{coupon.usedCount}/{coupon.totalCount}</span>
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(coupon.usedCount / coupon.totalCount) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(coupon.validFrom).toLocaleDateString()} - {new Date(coupon.validTo).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4"><StatusChip status={coupon.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEditDialog(coupon)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4 text-slate-600" /></button>
                          {coupon.status === 'active' && <button onClick={() => handleDisableCoupon(coupon._id)} className="p-1.5 hover:bg-amber-50 rounded"><Ban className="w-4 h-4 text-amber-500" /></button>}
                          <button onClick={() => setDeleteConfirm({ open: true, type: 'coupon', id: coupon._id })} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 拼团列表 */}
        {activeTab === 'groupbuys' && (
          <div className="overflow-x-auto">
            {filteredGroupBuys.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">暂无拼团活动</p>
                <p className="text-sm mt-1">点击右上角按钮创建拼团</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">拼团标题</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">拼团价格</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">成团进度</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">有效期</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">状态</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGroupBuys.map(groupBuy => (
                    <tr key={groupBuy._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{groupBuy.title}</p>
                        <p className="text-xs text-slate-400 mt-1">课程ID: {groupBuy.courseId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-red-600">¥{groupBuy.price}</p>
                        <p className="text-xs text-slate-400 line-through">¥{groupBuy.originalPrice}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm mb-1">{groupBuy.currentCount}/{groupBuy.requiredCount}人</p>
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${groupBuy.currentCount >= groupBuy.requiredCount ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min((groupBuy.currentCount / groupBuy.requiredCount) * 100, 100)}%` }} />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(groupBuy.validFrom).toLocaleDateString()} - {new Date(groupBuy.validTo).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4"><StatusChip status={groupBuy.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEditDialog(groupBuy)} className="p-1.5 hover:bg-slate-100 rounded"><Edit2 className="w-4 h-4 text-slate-600" /></button>
                          {groupBuy.status === 'active' && <button onClick={() => handleEndGroupBuy(groupBuy._id)} className="p-1.5 hover:bg-amber-50 rounded"><Ban className="w-4 h-4 text-amber-500" /></button>}
                          <button onClick={() => setDeleteConfirm({ open: true, type: 'groupbuy', id: groupBuy._id })} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 表单弹窗 */}
      <CouponForm open={couponDialogOpen} onClose={() => { setCouponDialogOpen(false); setEditingCoupon(null); }}
        onSubmit={editingCoupon ? handleUpdateCoupon : handleCreateCoupon} initialData={editingCoupon} />
      <GroupBuyForm open={groupBuyDialogOpen} onClose={() => { setGroupBuyDialogOpen(false); setEditingGroupBuy(null); }}
        onSubmit={editingGroupBuy ? handleUpdateGroupBuy : handleCreateGroupBuy} initialData={editingGroupBuy} />
      <DeleteConfirm open={deleteConfirm.open} onClose={() => setDeleteConfirm({ ...deleteConfirm, open: false, id: '' })}
        onConfirm={handleDelete} type={deleteConfirm.type} />
    </div>
  );
}
