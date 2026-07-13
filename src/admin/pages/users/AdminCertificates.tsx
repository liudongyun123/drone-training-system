import { useState, useEffect } from 'react';
import { 
  Award, CheckCircle, XCircle, Clock, Search, 
  Download, Trash2,
  Calendar, User, Check, X,
  Eye, Palette, Save
} from 'lucide-react';
import type { Certificate } from '@/types';
import { adminService } from '@/services/adminService';
import Loading from '@/components/Loading';
import EmptyState from '@/components/EmptyState';
import { uploadFile } from '@/services/storageService';
import { formatDateStr } from '@/utils/dateUtils';

// 证书样式配置固定文档 _id（certificate_config 集合始终只有这一条）
const THEME_OPTIONS = [
  { key: 'gold', label: '金边（默认）', border: '#c9a227', accent: '#1e3a5f' },
  { key: 'red', label: '红边', border: '#c0392b', accent: '#8e1b1b' },
  { key: 'blue', label: '蓝边', border: '#2563eb', accent: '#1e3a5f' }
];

export default function AdminCertificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<{ total: number; issued: number; pending: number; revoked: number; thisMonth: number }>({ total: 0, issued: 0, pending: 0, revoked: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [certificateNo, setCertificateNo] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // 证书样式配置
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [styleLoading, setStyleLoading] = useState(false);
  const [styleSaving, setStyleSaving] = useState(false);
  const [styleDocId, setStyleDocId] = useState('');
  const [styleConfig, setStyleConfig] = useState({
    orgName: '无人机培训中心',
    subtitle: '',
    sealImage: '',
    themeColor: 'gold',
    bgPattern: true,
    qrVerify: false
  });

  // 颁发结业证书
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    phone: '',
    userName: '',
    courseTitle: '',
    courseId: '',
    type: 'completion',
    certificateNo: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  const TYPE_LABELS: Record<string, string> = {
    completion: '结业证书',
    training: '培训合格证书',
    official: 'CAAC执照证书'
  };

  const handleCreateCert = async () => {
    const phone = (createForm.phone || '').trim();
    const courseTitle = (createForm.courseTitle || '').trim();
    if (!phone) { alert('请填写学员手机号'); return; }
    if (!courseTitle) { alert('请填写课程名称'); return; }
      try {
        setCreating(true);
        const userName = (createForm.userName || '').trim();
        const now = new Date().toISOString();
        const certificateNo = (createForm.certificateNo || '').trim() ||
          `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        // 结业证书写入 training_certificates，统一以手机号（userId）为标识，
        // 与小程序「结业证明」Tab 现有读取逻辑（按手机号查 training_certificates）一致。
        // 不再依赖 members 的微信 _openid，避免绑定缺失导致小程序端不可见。
        const res = await adminService.add('training_certificates', {
          userId: phone,
          userName,
          name: `${courseTitle} ${TYPE_LABELS[createForm.type] || '证书'}`,
          className: courseTitle,
          courseId: (createForm.courseId || '').trim(),
          courseName: courseTitle,
          courseTitle,
          certificateNo,
          type: createForm.type,
          description: (createForm.description || '').trim(),
          pdfUrl: '',
          fileUrl: '',
          score: '',
          verified: false,
          status: 'active',
          issuedAt: now,
          issueDate: now,
          source: 'admin',
          createdAt: now,
          updatedAt: now
        });
        if (res.code === 0) {
          setShowCreateModal(false);
          setCreateForm({ phone: '', userName: '', courseTitle: '', courseId: '', type: 'completion', certificateNo: '', description: '' });
          loadData();
        } else {
          alert('颁发失败：' + (res.message || '未知错误'));
        }
      } catch (err) {
      console.error('颁发结业证书失败', err);
      alert('颁发失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const result = await adminService.list('training_certificates', {}, { limit: 100 }) as unknown as { data: { list: Certificate[] } };
      const certList: Certificate[] = result.data?.list || [];
      
      setCertificates(certList);
      
      // 处理统计
      // 'active' 为小程序端已发放状态，统计时与 'issued' 合并
      const isIssued = (s?: string) => s === 'issued' || s === 'active';
      const now = new Date();
      const thisMonthCount = certList.filter(c => {
        const d = c.issueDate || (c as any).issuedAt || c.createdAt;
        if (!d) return false;
        const dt = new Date(d);
        return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
      }).length;
      setStats({
        total: certList.length,
        issued: certList.filter(c => isIssued(c.status)).length,
        pending: certList.filter(c => c.status === 'pending').length,
        revoked: certList.filter(c => c.status === 'revoked').length,
        thisMonth: thisMonthCount
      });
    } catch (err) {
      console.error('加载数据失败', err);
      setCertificates([]);
      setStats({ total: 0, issued: 0, pending: 0, revoked: 0, thisMonth: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!selectedCert || !certificateNo.trim()) return;
    
    try {
      const res = await adminService.update('training_certificates', selectedCert._id, {
        status: 'issued',
        certificateNo: certificateNo.trim(),
        issueDate: new Date().toISOString()
      });
      
      if (res.code === 0) {
        setShowIssueModal(false);
        setCertificateNo('');
        loadData();
      }
    } catch (err) {
      console.error('发放证书失败', err);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await adminService.update('training_certificates', id, {
        status: 'revoked',
        revokedAt: new Date().toISOString()
      });
      if (res.code === 0) {
        loadData();
      }
    } catch (err) {
      console.error('撤销证书失败', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await adminService.delete('training_certificates', id);
      if (res.code === 0) {
        setShowDeleteConfirm(null);
        loadData();
      }
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  // 加载证书样式配置（单文档集合：永远取 list[0] 的真实 _id 读写同一条）
  const loadStyleConfig = async () => {
    try {
      setStyleLoading(true);
      const res = await adminService.list('certificate_config', {}, { limit: 1 }) as unknown as { data: { list: any[] } };
      const list = res.data?.list || [];
      const cfg = list[0];
      if (cfg && cfg._id) setStyleDocId(cfg._id);
      if (cfg) {
        setStyleConfig({
          orgName: cfg.orgName || '无人机培训中心',
          subtitle: cfg.subtitle || '',
          sealImage: cfg.sealImage || '',
          themeColor: cfg.themeColor || 'gold',
          bgPattern: cfg.bgPattern !== false,
          qrVerify: !!cfg.qrVerify
        });
      }
    } catch (err) {
      console.error('加载证书样式配置失败', err);
    } finally {
      setStyleLoading(false);
    }
  };

  // 同步机构名到 system_config.siteName（小程序旧读取键，保持两处一致）
  const syncSiteName = async (orgName: string) => {
    const SITE_NAME_ID = 'd2a254a36a50ac95008057420722d87e';
    try {
      await adminService.update('system_config', SITE_NAME_ID, {
        value: orgName,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('同步 siteName 失败（不影响证书样式保存）', err);
    }
  };

  // 保存证书样式配置
  const saveStyleConfig = async () => {
    try {
      setStyleSaving(true);
      const data = {
        orgName: (styleConfig.orgName || '无人机培训中心').trim(),
        subtitle: (styleConfig.subtitle || '').trim(),
        sealImage: styleConfig.sealImage || '',
        themeColor: styleConfig.themeColor || 'gold',
        bgPattern: !!styleConfig.bgPattern,
        qrVerify: !!styleConfig.qrVerify,
        updatedAt: new Date().toISOString()
      };
      // 单文档集合：有 styleDocId 则更新同一条，否则新建并记住真实 _id
      if (styleDocId) {
        await adminService.update('certificate_config', styleDocId, data);
      } else {
        const addRes = await adminService.add('certificate_config', { ...data, createdAt: new Date().toISOString() });
        if (addRes?.data?.id) setStyleDocId(addRes.data.id);
      }
      // 同步机构名到 system_config.siteName
      await syncSiteName(data.orgName);
      alert('证书样式已保存，小程序端立即生效');
      setShowStyleModal(false);
    } catch (err) {
      console.error('保存证书样式失败', err);
      alert('保存失败，请重试');
    } finally {
      setStyleSaving(false);
    }
  };

  const openStyleModal = () => {
    loadStyleConfig();
    setShowStyleModal(true);
  };

  // 上传电子印章（本地文件 -> 云存储，返回 URL）
  const uploadSeal = async (file: File) => {
    try {
      const res = await uploadFile(file, 'cert-seals', () => {});
      if (!res.success || !res.fileUrl) throw new Error(res.message || '上传失败');
      return res.fileUrl || res.fileID || '';
    } catch (err: any) {
      console.error('[印章上传] 失败:', err);
      throw new Error(err?.message || '上传失败');
    }
  };

  const currentTheme = THEME_OPTIONS.find(t => t.key === styleConfig.themeColor) || THEME_OPTIONS[0];

  const handleDownload = (cert: Certificate) => {
    // 兼容两端字段：管理后台用 fileUrl，小程序端用 pdfUrl
    const url = (cert as any).fileUrl || (cert as any).pdfUrl || '';
    if (!url) {
      alert('该证书暂无可下载的 PDF 文件');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cert.certificateNo || cert._id}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredCertificates = certificates.filter(cert => {
    if (!cert || typeof cert !== 'object') return false;
    const userName = String(cert.userName || '');
    const courseTitle = String(cert.courseTitle || '');
    const certificateNo = String(cert.certificateNo || '');
    const matchesSearch = 
      userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      certificateNo.toLowerCase().includes(searchQuery.toLowerCase());
    // 'active'（小程序端已发放）在筛选"已发放"时也应命中
    const normalizedStatus = cert.status === 'active' ? 'issued' : cert.status;
    const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string): React.ReactNode => {
    switch (status) {
      case 'issued':
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />已发放
        </span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />待发放
        </span>;
      case 'revoked':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />已撤销
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">未知</span>;
    }
  };

  if (loading) {
    return <Loading text="加载证书数据..." />;
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">证书管理</h1>
        <p className="text-gray-500 mt-1">管理学员培训证书的发放、撤销和查询</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{String(stats.total || 0)}</p>
              <p className="text-sm text-gray-500">证书总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{String(stats.issued || 0)}</p>
              <p className="text-sm text-gray-500">已发放</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-4">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{String(stats.pending || 0)}</p>
              <p className="text-sm text-gray-500">待发放</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{String(stats.revoked || 0)}</p>
              <p className="text-sm text-gray-500">已撤销</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{String(stats.thisMonth || 0)}</p>
              <p className="text-sm text-gray-500">本月新增</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索学员姓名、课程名称或证书编号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部状态</option>
            <option value="pending">待发放</option>
            <option value="issued">已发放</option>
            <option value="revoked">已撤销</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Award className="w-4 h-4 mr-1.5" />颁发证书
          </button>
          <button
            onClick={openStyleModal}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
          >
            <Palette className="w-4 h-4 mr-1.5" />证书样式
          </button>
        </div>
      </div>

      {/* 证书列表 */}
      {filteredCertificates.length === 0 ? (
        <EmptyState
          icon={<Award className="w-16 h-16 text-gray-300" />}
          title="暂无证书记录"
          description="没有找到符合条件的证书记录"
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学员信息</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">课程名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">证书编号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">颁发日期</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCertificates.map((cert, index) => (
                  <tr key={cert._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{String(cert.userName || '-')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{String(cert.courseTitle || (cert as any).courseName || '-')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono text-gray-600">
                        {cert.certificateNo ? String(cert.certificateNo) : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(cert.status || 'unknown')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDateStr(cert.issueDate || (cert as any).issuedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCert(cert);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {cert.status === 'pending' && (
                          <button
                            onClick={() => {
                              setSelectedCert(cert);
                              setShowIssueModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="发放证书"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        
                        {(cert.status === 'issued' || cert.status === 'active') && (
                          <>
                            <button
                              onClick={() => handleRevoke(cert._id)}
                              className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="撤销证书"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(cert)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="下载证书"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => setShowDeleteConfirm(cert._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 发放证书弹窗 */}
      {showIssueModal && selectedCert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">发放证书</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">学员: <span className="font-medium">{String(selectedCert.userName || '-')}</span></p>
              <p className="text-sm text-gray-600">课程: <span className="font-medium">{String(selectedCert.courseTitle || '-')}</span></p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">证书编号</label>
                <input
                  type="text"
                  value={certificateNo}
                  onChange={(e) => setCertificateNo(e.target.value)}
                  placeholder="例如: UAV-2024-001256"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">请输入唯一的证书编号</p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowIssueModal(false);
                  setCertificateNo('');
                  setSelectedCert(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleIssue}
                disabled={!certificateNo.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
              >
                确认发放
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 证书详情弹窗 */}
      {showDetailModal && selectedCert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">证书详情</h3>
            </div>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">证书ID</span>
                <span className="font-medium font-mono">{String(selectedCert._id || '-')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">学员姓名</span>
                <span className="font-medium">{String(selectedCert.userName || '-')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">课程名称</span>
                <span className="font-medium">{String(selectedCert.courseTitle || (selectedCert as any).courseName || '-')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">证书编号</span>
                <span className="font-medium font-mono">{selectedCert.certificateNo ? String(selectedCert.certificateNo) : '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">状态</span>
                <span>{getStatusBadge(selectedCert.status || 'unknown')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">颁发日期</span>
                <span className="font-medium">{formatDateStr(selectedCert.issueDate || (selectedCert as any).issuedAt)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">申请日期</span>
                <span className="font-medium">{formatDateStr(selectedCert.createdAt)}</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除</h3>
            <p className="text-gray-500 mb-6">删除后将无法恢复，是否确认删除？</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 颁发结业/培训证书弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">颁发证书</h3>
            <p className="text-sm text-gray-500 mb-4">为结业的学员手动发放证书（如结业证书、培训合格证书等）。</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学员手机号 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="例如: 13800001111"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学员姓名</label>
                  <input
                    type="text"
                    value={createForm.userName}
                    onChange={(e) => setCreateForm({ ...createForm, userName: e.target.value })}
                    placeholder="自动按手机号补全，可修改"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={createForm.courseTitle}
                  onChange={(e) => setCreateForm({ ...createForm, courseTitle: e.target.value })}
                  placeholder="例如: 多旋翼无人机驾驶员培训班"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">证书类型</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">课程ID</label>
                  <input
                    type="text"
                    value={createForm.courseId}
                    onChange={(e) => setCreateForm({ ...createForm, courseId: e.target.value })}
                    placeholder="可选，关联课程 _id"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">证书编号</label>
                <input
                  type="text"
                  value={createForm.certificateNo}
                  onChange={(e) => setCreateForm({ ...createForm, certificateNo: e.target.value })}
                  placeholder="留空将自动生成"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注 / 说明</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="可选，如成绩、评语等"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({ phone: '', userName: '', courseTitle: '', courseId: '', type: 'completion', certificateNo: '', description: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateCert}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {creating ? '颁发中...' : '确认颁发'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 证书样式配置弹窗 */}
      {showStyleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Palette className="w-5 h-5 mr-2 text-purple-600" />证书样式配置
              </h3>
              <button onClick={() => setShowStyleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {styleLoading ? (
              <div className="py-12 text-center text-gray-400">加载中...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左侧：配置表单 */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">证书机构名称</label>
                    <input
                      type="text"
                      value={styleConfig.orgName}
                      onChange={(e) => setStyleConfig({ ...styleConfig, orgName: e.target.value })}
                      placeholder="如：福建戎创未来教育咨询股份有限公司"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">将显示在结业证书抬头与印章位置</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">证书副标题文案</label>
                    <input
                      type="text"
                      value={styleConfig.subtitle}
                      onChange={(e) => setStyleConfig({ ...styleConfig, subtitle: e.target.value })}
                      placeholder="留空显示默认「结业证书」，可改为如「培训合格证明」"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">仅对结业证书生效，外部资质证书不受影响</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">电子印章图片</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={styleConfig.sealImage}
                        onChange={(e) => setStyleConfig({ ...styleConfig, sealImage: e.target.value })}
                        placeholder="可粘贴图片 URL，或点击下方上传"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                      <label className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer whitespace-nowrap">
                        上传
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = (e.target as any).files?.[0];
                            if (!f) return;
                            try { setStyleLoading(true); const url = await uploadSeal(f); setStyleConfig({ ...styleConfig, sealImage: url }); }
                            catch (err: any) { alert('印章上传失败：' + (err?.message || '')); }
                            finally { setStyleLoading(false); }
                          }}
                        />
                      </label>
                    </div>
                    {styleConfig.sealImage ? (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={styleConfig.sealImage.startsWith('cloud://') ? 'https://placeholder' : styleConfig.sealImage} alt="印章预览" className="w-12 h-12 rounded-full object-contain border border-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        <button onClick={() => setStyleConfig({ ...styleConfig, sealImage: '' })} className="text-xs text-red-500 hover:underline">移除</button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">不传则显示文字印章</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">主题配色</label>
                    <div className="flex gap-3">
                      {THEME_OPTIONS.map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setStyleConfig({ ...styleConfig, themeColor: t.key })}
                          className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${styleConfig.themeColor === t.key ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <span className="w-8 h-8 rounded-full border-4" style={{ borderColor: t.border, background: t.accent }} />
                          <span className="text-xs text-gray-600">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!styleConfig.bgPattern} onChange={(e) => setStyleConfig({ ...styleConfig, bgPattern: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm text-gray-700">启用证书底纹（米白纸张纹理）</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!styleConfig.qrVerify} onChange={(e) => setStyleConfig({ ...styleConfig, qrVerify: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm text-gray-700">启用二维码验真（扫码跳转小程序验证页）</span>
                    </label>
                  </div>
                </div>

                {/* 右侧：实时预览 */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">实时预览</p>
                  <div
                    className="relative rounded-xl p-1"
                    style={{ background: `linear-gradient(135deg, ${currentTheme.border}, #f5d98b, ${currentTheme.border})` }}
                  >
                    <div
                      className="rounded-lg p-6 relative overflow-hidden"
                      style={{
                        background: styleConfig.bgPattern
                          ? 'radial-gradient(circle at 20% 15%, rgba(201,162,39,0.06), transparent 40%), radial-gradient(circle at 85% 85%, rgba(30,58,95,0.05), transparent 40%), #fdfbf5'
                          : '#fdfbf5',
                        color: currentTheme.accent
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="text-4xl mb-1">🛸</div>
                        <div className="font-semibold tracking-widest text-sm" style={{ color: currentTheme.accent }}>{styleConfig.orgName || '无人机培训中心'}</div>
                        <div className="h-1 w-12 my-2" style={{ background: currentTheme.border }} />
                      </div>
                      <div className="text-center my-3">
                        <div className="text-2xl font-bold tracking-widest" style={{ color: currentTheme.accent }}>{styleConfig.subtitle || '结业证书'}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: currentTheme.border }}>CERTIFICATE</div>
                      </div>
                      <div className="text-center text-sm leading-relaxed text-gray-600">
                        <div>兹证明</div>
                        <div className="text-lg font-bold my-1" style={{ color: currentTheme.accent }}>张三</div>
                        <div>学员已完成</div>
                        <div className="font-semibold my-1" style={{ color: currentTheme.border }}>《多旋翼无人机培训班》</div>
                        <div>培训课程全部内容，考核合格，特发此证。</div>
                      </div>
                      <div className="flex items-end justify-between mt-6">
                        <div className="text-xs text-gray-500">
                          <div>证书编号</div>
                          <div className="text-gray-700 font-mono">CERT-DEMO-0001</div>
                        </div>
                        <div
                          className="w-16 h-16 rounded-full border-2 flex items-center justify-center text-center rotate-[-12deg] text-[10px] leading-tight px-1"
                          style={{ borderColor: 'rgba(196,30,58,0.7)', color: 'rgba(196,30,58,0.85)' }}
                        >
                          {styleConfig.sealImage
                            ? <img src={styleConfig.sealImage.startsWith('cloud://') ? 'https://placeholder' : styleConfig.sealImage} alt="印章" className="w-12 h-12 rounded-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            : (styleConfig.orgName || '培训中心').slice(0, 4)}
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                          <div>颁发日期</div>
                          <div className="text-gray-700">2026-07-10</div>
                        </div>
                      </div>
                      {styleConfig.qrVerify && (
                        <div className="mt-4 flex justify-center">
                          <div className="w-20 h-20 bg-white border border-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400">二维码</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">预览为示意，小程序端以实际渲染为准</p>
                </div>
              </div>
            )}

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowStyleModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveStyleConfig}
                disabled={styleSaving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-1.5" />{styleSaving ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
