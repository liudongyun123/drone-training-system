import { useState, useEffect } from 'react';
import { 
  Award, CheckCircle, XCircle, Clock, Search, Filter, 
  Download, Upload, Plus, Edit, Trash2, MoreHorizontal,
  FileText, Calendar, User, Check, X, AlertCircle,
  ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import type { Certificate } from '@/types';
import { certificateService } from '@/services/certificateService';
import Loading from '@/components/Loading';
import EmptyState from '@/components/EmptyState';
import { formatDateStr } from '@/utils/dateUtils';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [certsRes, statsRes] = await Promise.all([
        certificateService.getList(),
        certificateService.getStats()
      ]);
      
      if (certsRes.success && Array.isArray(certsRes.data)) {
        setCertificates(certsRes.data);
      } else {
        setCertificates([]);
        console.warn('证书数据格式不正确:', certsRes);
      }
      
      if (statsRes.success && statsRes.data) {
        const s = statsRes.data;
        setStats({
          total: typeof s.total === 'number' ? s.total : 0,
          issued: typeof s.issued === 'number' ? s.issued : 0,
          pending: typeof s.pending === 'number' ? s.pending : 0,
          revoked: typeof s.revoked === 'number' ? s.revoked : 0,
          thisMonth: typeof s.thisMonth === 'number' ? s.thisMonth : 0
        });
      } else {
        setStats({ total: 0, issued: 0, pending: 0, revoked: 0, thisMonth: 0 });
      }
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
      const res = await certificateService.issue(selectedCert._id, {
        certificateNo: certificateNo.trim()
      });
      
      if (res.success) {
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
      const res = await certificateService.revoke(id, '管理员撤销');
      if (res.success) {
        loadData();
      }
    } catch (err) {
      console.error('撤销证书失败', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await certificateService.delete(id);
      if (res.success) {
        setShowDeleteConfirm(null);
        loadData();
      }
    } catch (err) {
      console.error('删除失败', err);
    }
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
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string): React.ReactNode => {
    switch (status) {
      case 'issued':
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
                      <p className="text-sm text-gray-900">{String(cert.courseTitle || '-')}</p>
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
                      {formatDateStr(cert.issueDate)}
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
                        
                        {cert.status === 'issued' && (
                          <>
                            <button
                              onClick={() => handleRevoke(cert._id)}
                              className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="撤销证书"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
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
                <span className="font-medium">{String(selectedCert.courseTitle || '-')}</span>
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
                <span className="font-medium">{formatDateStr(selectedCert.issueDate)}</span>
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
    </div>
  );
}
