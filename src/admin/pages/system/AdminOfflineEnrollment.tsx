// ============================================================================
// 管理后台 - 线下报名管理
// 功能：管理员帮助用户线下报名培训班，直接开放权限
// ============================================================================
import { useState, useEffect } from 'react';
import AdminPageTemplate from './_AdminPageTemplate';
import { orderService } from '@/services/database';
import { membersService } from '@/services/membersService';
import { adminService } from '@/services/adminService';
import {
  Search, RefreshCw, Plus, Users, CheckCircle, AlertCircle, Loader2, X
} from 'lucide-react';
import { Modal, Loading } from '@/components';

interface ClassInfo {
  _id: string;
  name: string;
  description?: string;
  price?: number;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  enrolled?: number;
}

interface UserInfo {
  phone: string;
  name?: string;
  memberId?: string;  // ★ 关联 members._id
}

export default function AdminOfflineEnrollment() {
  // 状态
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 搜索状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);

  // 报名表单状态
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [enrollmentForm, setEnrollmentForm] = useState({
    phone: '',
    userName: '',
    paymentMethod: 'offline' as 'offline' | 'cash' | 'transfer',
    amount: 0,
    remark: '',
  });

  // 用户信息（通过手机号查询）
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  // 历史记录
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // 加载最近的线下报名记录
  const loadRecentEnrollments = async () => {
    setHistoryLoading(true);
    try {
      const result = await orderService.list(
        { type: 'class', paymentMethod: { $in: ['offline', 'cash', 'transfer'] } },
        { page: 1, pageSize: 20 }
      );
      if (result?.code === 0) {
        const list = result.data?.data?.list || result.data?.list || [];
        setRecentEnrollments(list.slice(0, 10));
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadRecentEnrollments();
  }, []);

  // 搜索班级
  const handleSearchClasses = async () => {
    if (!searchKeyword.trim()) {
      setClasses([]);
      return;
    }

    setClassesLoading(true);
    try {
      // 使用 adminService 直接查询
      const result = await adminService.list('classes', {
        name: { $regex: searchKeyword }
      }, { limit: 20 });

      if (result?.code === 0) {
        const list = result.data?.data?.list || result.data?.list || result.data || [];
        setClasses(list);
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error('搜索班级失败:', error);
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  };

  // 通过手机号查询用户
  const handleSearchUser = async (phone: string) => {
    if (!phone || phone.length < 11) {
      setUserInfo(null);
      return;
    }

    setUserLoading(true);
    try {
      const result = await membersService.getByPhone(phone);
      if (result?.success && result.data) {
        // ★ 使用正确的 memberId 字段（对应 members._id）
        setUserInfo({
          phone: result.data.phone,
          name: result.data.name || (result.data as any).nickname || '',
          memberId: result.data._id || undefined,  // members._id 是 CloudBase 自动生成的 ID
        });
      } else {
        // 用户不存在，可以新建
        setUserInfo({ phone, name: '', memberId: undefined });
      }
    } catch (error) {
      console.error('查询用户失败:', error);
      // 允许手动输入
      setUserInfo({ phone, name: '', memberId: undefined });
    } finally {
      setUserLoading(false);
    }
  };

  // 选择班级
  const handleSelectClass = (cls: ClassInfo) => {
    setSelectedClass(cls);
    setEnrollmentForm(prev => ({
      ...prev,
      amount: cls.price || 0,
    }));
    setClasses([]);
    setSearchKeyword('');
  };

  // 提交报名
  const handleSubmitEnrollment = async () => {
    if (!selectedClass) {
      setErrorMessage('请选择培训班');
      return;
    }
    if (!enrollmentForm.phone) {
      setErrorMessage('请输入手机号');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      // 1. 创建订单
      const orderData = {
        type: 'class',
        classId: selectedClass._id,
        className: selectedClass.name,
        phone: enrollmentForm.phone,
        userName: enrollmentForm.userName || userInfo?.name || '线下报名用户',
        buyerPhone: enrollmentForm.phone,
        buyerName: enrollmentForm.userName || userInfo?.name || '线下报名用户',
        paymentMethod: enrollmentForm.paymentMethod,
        amount: enrollmentForm.amount,
        totalAmount: enrollmentForm.amount,
        status: 'paid_offline' as const,
        source: 'offline_enroll',
        remark: enrollmentForm.remark,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      };

      const orderResult = await orderService.create(orderData);
      
      if (!orderResult || orderResult.code !== 0) {
        throw new Error(orderResult?.message || '创建订单失败');
      }

      const orderId = orderResult.data?._id || orderResult.data?.id;

      // 2. 获取或创建会员记录，确保关联
      let memberId = userInfo?.memberId;  // ★ 使用正确的 memberId
      try {
        // 查询是否存在该手机号的会员
        const memberResult = await membersService.getByPhone(enrollmentForm.phone);
        if (memberResult?.success && memberResult.data) {
          // 会员已存在，获取 memberId（对应 members._id）
          memberId = memberResult.data._id;
        } else {
          // 会员不存在，创建新会员
          const newMember = await membersService.create({
            name: enrollmentForm.userName || userInfo?.name || '线下报名用户',
            phone: enrollmentForm.phone,
            type: 'student',
            source: 'offline_enroll',  // 来源标记为线下报名
          });
          if (newMember.success && newMember.data) {
            memberId = newMember.data._id;  // CloudBase 自动生成的 ID
          }
        }
      } catch (memberError) {
        console.error('获取/创建会员失败:', memberError);
      }

      // 3. 创建报名记录（现在包含正确的 memberId 关联）
      try {
        await import('@/services/adminService').then(async (m) => {
          await m.adminService.add('enrollments', {
            memberId: memberId || '',    // ★ 关联会员ID（对应 members._id）
            userId: memberId || '',      // 兼容旧字段，使用相同的 ID
            phone: enrollmentForm.phone,
            userName: enrollmentForm.userName || userInfo?.name || '线下报名用户',
            classId: selectedClass._id,
            className: selectedClass.name,
            source: 'offline_enroll',
            paymentStatus: 'paid',
            enrollmentTime: new Date().toISOString(),
            status: 'active',
            orderId: orderId,
            permissionGranted: true,  // 线下报名默认开放权限
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        });
      } catch (enrollError) {
        console.error('创建报名记录失败:', enrollError);
      }

      // 3. 开放权限
      await orderService.grantPermission(orderId);

      // 成功提示
      setSuccessMessage(`线下报名成功！用户 ${enrollmentForm.phone} 已报名 ${selectedClass.name}，权限已开放`);
      
      // 重置表单
      setShowEnrollmentModal(false);
      setSelectedClass(null);
      setEnrollmentForm({
        phone: '',
        userName: '',
        paymentMethod: 'offline',
        amount: 0,
        remark: '',
      });
      setUserInfo(null);

      // 刷新历史记录
      loadRecentEnrollments();

    } catch (error: any) {
      console.error('线下报名失败:', error);
      setErrorMessage(error.message || '报名失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPageTemplate
      title="线下报名"
      description="管理员帮助用户线下报名培训班，自动创建订单并开放学习权限"
    >
      {/* 成功/错误提示 */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <p className="text-green-700">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage('')}
            className="ml-auto text-green-400 hover:text-green-600"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-700">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage('')}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* 线下报名表单 */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={20} className="text-blue-600" />
          <h3 className="font-medium text-gray-900">新增线下报名</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 选择班级 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              选择培训班 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="输入培训班名称或ID搜索..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  if (!e.target.value) setClasses([]);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchClasses()}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                onClick={handleSearchClasses}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-lg"
                disabled={classesLoading}
              >
                {classesLoading ? (
                  <Loader2 size={18} className="text-gray-400 animate-spin" />
                ) : (
                  <Search size={18} className="text-gray-400" />
                )}
              </button>
            </div>

            {/* 搜索结果下拉 */}
            {classes.length > 0 && (
              <div className="mt-1 border rounded-lg shadow-lg max-h-48 overflow-y-auto bg-white">
                {classes.map((cls) => (
                  <button
                    key={cls._id}
                    onClick={() => handleSelectClass(cls)}
                    className="w-full px-4 py-2.5 text-left hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{cls.name}</div>
                    <div className="text-xs text-gray-500 flex gap-2">
                      {cls.price !== undefined && <span>¥{cls.price}</span>}
                      {cls.startDate && <span>{new Date(cls.startDate).toLocaleDateString()} 开课</span>}
                      {cls.enrolled !== undefined && cls.capacity !== undefined && (
                        <span>已报名 {cls.enrolled}/{cls.capacity}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 已选择的班级 */}
            {selectedClass && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-blue-900">{selectedClass.name}</div>
                    {selectedClass.price !== undefined && (
                      <div className="text-sm text-blue-600">价格: ¥{selectedClass.price}</div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedClass(null)}
                    className="p-1 hover:bg-blue-100 rounded"
                  >
                    <X size={16} className="text-blue-500" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 用户手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户手机号 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="输入用户手机号"
                value={enrollmentForm.phone}
                onChange={(e) => {
                  const phone = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setEnrollmentForm(prev => ({ ...prev, phone }));
                  if (phone.length === 11) {
                    handleSearchUser(phone);
                  } else {
                    setUserInfo(null);
                  }
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {userLoading && (
                <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
              )}
            </div>
            
            {/* 用户信息显示 */}
            {userInfo && !userLoading && (
              <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                <div className="flex items-center gap-1.5 text-green-700">
                  <CheckCircle size={14} />
                  <span>用户: {userInfo.name || '新用户'}</span>
                  <span className="text-green-500">({userInfo.phone})</span>
                </div>
              </div>
            )}
          </div>

          {/* 用户姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户姓名
            </label>
            <input
              type="text"
              placeholder="输入用户姓名（可选）"
              value={enrollmentForm.userName}
              onChange={(e) => setEnrollmentForm(prev => ({ ...prev, userName: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* 支付方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              支付方式
            </label>
            <select
              value={enrollmentForm.paymentMethod}
              onChange={(e) => setEnrollmentForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="offline">线下支付</option>
              <option value="cash">现金支付</option>
              <option value="transfer">转账支付</option>
            </select>
          </div>

          {/* 金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              缴费金额
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={enrollmentForm.amount}
              onChange={(e) => setEnrollmentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* 备注 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <input
              type="text"
              placeholder="备注信息（可选）"
              value={enrollmentForm.remark}
              onChange={(e) => setEnrollmentForm(prev => ({ ...prev, remark: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowEnrollmentModal(true)}
            disabled={!selectedClass || !enrollmentForm.phone || submitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Plus size={18} />
                确认线下报名
              </>
            )}
          </button>
        </div>
      </div>

      {/* 确认弹窗 */}
      <Modal
        isOpen={showEnrollmentModal}
        onClose={() => !submitting && setShowEnrollmentModal(false)}
        title="确认线下报名"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">报名信息确认</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">培训班：</span>
                <span className="font-medium">{selectedClass?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">用户手机：</span>
                <span className="font-medium">{enrollmentForm.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">用户姓名：</span>
                <span className="font-medium">{enrollmentForm.userName || userInfo?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">支付方式：</span>
                <span className="font-medium">
                  {enrollmentForm.paymentMethod === 'offline' ? '线下支付' : 
                   enrollmentForm.paymentMethod === 'cash' ? '现金支付' : '转账支付'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">缴费金额：</span>
                <span className="font-medium text-green-600">¥{enrollmentForm.amount}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              点击确认后，系统将：
            </p>
            <ul className="text-sm text-green-700 mt-1 space-y-0.5">
              <li>1. 创建线下报名订单</li>
              <li>2. 创建报名记录</li>
              <li>3. <strong>自动开放培训权限</strong></li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowEnrollmentModal(false)}
              disabled={submitting}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmitEnrollment}
              disabled={submitting}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  确认报名
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* 最近线下报名记录 */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-600" />
            <h3 className="font-medium text-gray-900">最近线下报名记录</h3>
          </div>
          <button
            onClick={loadRecentEnrollments}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新"
          >
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loading />
          </div>
        ) : recentEnrollments.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">暂无线下报名记录</p>
          </div>
        ) : (
          <div className="divide-y">
            {recentEnrollments.map((order) => (
              <div key={order._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {order.buyerName || order.userName || '未知用户'}
                      </span>
                      <span className="text-sm text-gray-500">{order.phone || order.buyerPhone}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      报名: {order.className || '培训班'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">
                      ¥{order.totalAmount || order.amount || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.paymentMethod === 'online' ? '线上' : '线下支付'}
                    </div>
                    {order.permissionGranted && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        权限已开
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPageTemplate>
  );
}
