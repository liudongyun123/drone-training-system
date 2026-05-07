import { useState, useEffect } from 'react';
import { 
  Award, Download, Search, CheckCircle, Clock, XCircle, 
  FileText, AlertCircle, ChevronRight, QrCode, Share2,
  Shield, GraduationCap, Calendar
} from 'lucide-react';
import type { Certificate } from '@/types';
import { certificateService } from '@/services/certificateService';
import Loading from '@/components/Loading';
import EmptyState from '@/components/EmptyState';

export default function CertificateCenter() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'issued' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyNumber, setVerifyNumber] = useState('');
  const [verifyResult, setVerifyResult] = useState<Certificate | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const res = await certificateService.getList({ userId: 'user_001' });
      if (res.success) {
        setCertificates(res.data || []);
      }
    } catch (err) {
      console.error('加载证书失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (cert: Certificate) => {
    try {
      const res = await certificateService.download(cert._id);
      if (res.success) {
        // 模拟下载
        alert(`开始下载证书: ${res.data?.filename}`);
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error('下载失败', err);
    }
  };

  const handleVerify = async () => {
    if (!verifyNumber.trim()) return;
    
    try {
      setVerifyLoading(true);
      const res = await certificateService.verify(verifyNumber.trim());
      if (res.success) {
        setVerifyResult(res.data || null);
      } else {
        setVerifyResult(null);
        alert(res.message);
      }
    } catch (err) {
      console.error('验证失败', err);
    } finally {
      setVerifyLoading(false);
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesTab = activeTab === 'all' || cert.status === activeTab;
    const matchesSearch = cert.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cert.certificateNo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const issuedCount = certificates.filter(c => c.status === 'issued').length;
  const pendingCount = certificates.filter(c => c.status === 'pending').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            已发放
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            申请中
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            已撤销
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <Loading text="加载证书信息..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面标题 */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">证书中心</h1>
              <p className="text-amber-100">查看、下载和管理您的培训证书</p>
            </div>
            <Award className="w-16 h-16 text-amber-200 opacity-50" />
          </div>
          
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center">
                <Award className="w-8 h-8 text-amber-200 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{certificates.length}</p>
                  <p className="text-sm text-amber-100">证书总数</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-amber-200 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{issuedCount}</p>
                  <p className="text-sm text-amber-100">已发放</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-amber-200 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-amber-100">申请中</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 功能卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div 
            onClick={() => setShowVerifyModal(true)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">证书验证</h3>
                <p className="text-sm text-gray-500">输入证书编号验证真伪</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          
          <a 
            href="/exam-center"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow block"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">参加考试</h3>
                <p className="text-sm text-gray-500">通过考试获取证书</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </a>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索证书名称或编号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-2">
              {(['all', 'issued', 'pending'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab === 'all' && '全部'}
                  {tab === 'issued' && '已发放'}
                  {tab === 'pending' && '申请中'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 证书列表 */}
        {filteredCertificates.length === 0 ? (
          <EmptyState
            icon={<Award className="w-16 h-16 text-gray-300" />}
            title="暂无证书"
            description={searchQuery ? '没有找到匹配的证书' : '您还没有获得任何证书，参加考试获取证书吧'}
            // @ts-ignore
            actionText="去考试"
            onAction={() => window.location.href = '/exam-center'}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map(cert => (
              <div 
                key={cert._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* 证书封面 */}
                <div className="h-32 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center relative">
                  <Award className="w-16 h-16 text-white opacity-30" />
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(cert.status)}
                  </div>
                </div>
                
                {/* 证书信息 */}
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{cert.courseTitle}</h3>
                  
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    {cert.certificateNo && (
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        <span className="font-mono">{cert.certificateNo}</span>
                      </div>
                    )}
                    {cert.issueDate && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>颁发日期: {new Date(cert.issueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex space-x-2">
                    {cert.status === 'issued' ? (
                      <>
                        <button
                          onClick={() => handleDownload(cert)}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </button>
                        <button
                          onClick={() => setSelectedCert(cert)}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : cert.status === 'pending' ? (
                      <button
                        disabled
                        className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        审核中
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full flex items-center justify-center px-4 py-2 bg-red-50 text-red-400 rounded-lg cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        已撤销
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 证书验证弹窗 */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">证书验证</h3>
            <p className="text-gray-500 mb-4">输入证书编号验证证书真伪</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">证书编号</label>
                <input
                  type="text"
                  value={verifyNumber}
                  onChange={(e) => setVerifyNumber(e.target.value)}
                  placeholder="例如: UAV-2024-001256"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {verifyResult && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-900">验证成功</span>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>证书编号: {verifyResult.certificateNo}</p>
                    <p>持证人: {verifyResult.userName}</p>
                    <p>课程: {verifyResult.courseTitle}</p>
                    <p>颁发日期: {new Date(verifyResult.issueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerifyNumber('');
                  setVerifyResult(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={handleVerify}
                disabled={verifyLoading || !verifyNumber.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {verifyLoading ? '验证中...' : '验证'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 证书详情弹窗 */}
      {selectedCert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{selectedCert.courseTitle}</h3>
              <p className="text-gray-500">培训证书</p>
            </div>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">证书编号</span>
                <span className="font-medium font-mono">{selectedCert.certificateNo}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">持证人</span>
                <span className="font-medium">{selectedCert.userName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">颁发日期</span>
                <span className="font-medium">{new Date(selectedCert.issueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">状态</span>
                <span>{getStatusBadge(selectedCert.status)}</span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedCert(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => handleDownload(selectedCert)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 inline mr-2" />
                下载证书
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
