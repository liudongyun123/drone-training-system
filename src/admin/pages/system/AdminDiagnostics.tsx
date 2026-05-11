// ============================================================================
// 管理后台 - 系统诊断工具 (完整版)
// 功能：一键检测所有模块的数据加载状态，包括前后端交互
// ============================================================================
import { useState, useEffect } from 'react';
import AdminPageTemplate from './_AdminPageTemplate';
import { adminService } from '@/services';
import {
  CheckCircle, XCircle, AlertCircle, RefreshCw, Database,
  BookOpen, Users, Calendar, GraduationCap, FileText,
  CreditCard, Award, ClipboardList, Shield, MessageSquare,
  ScrollText, Bell, Wrench, Image, Layers, ShoppingCart,
  Percent, ChevronDown, ChevronUp
} from 'lucide-react';

interface DiagnoseResult {
  name: string;
  icon: React.ReactNode;
  collection: string;
  status: 'pending' | 'checking' | 'success' | 'error';
  count: number;
  error?: string;
  category?: string;
}

// 完整的模块列表
const ALL_MODULES: Omit<DiagnoseResult, 'status' | 'count' | 'error'>[] = [
  // ===== 线上课程 =====
  { name: '课程', icon: <BookOpen size={20} />, collection: 'courses', category: '线上课程' },
  { name: '课程分类', icon: <Layers size={20} />, collection: 'categories', category: '线上课程' },
  { name: '章节', icon: <FileText size={20} />, collection: 'chapters', category: '线上课程' },
  { name: '课时', icon: <FileText size={20} />, collection: 'lessons', category: '线上课程' },
  { name: '评论', icon: <MessageSquare size={20} />, collection: 'comments', category: '线上课程' },
  { name: '课程权限', icon: <Shield size={20} />, collection: 'course_permissions', category: '线上课程' },

  // ===== 会员与用户 =====
  { name: '会员', icon: <Users size={20} />, collection: 'members', category: '会员与用户' },
  { name: '用户档案', icon: <Users size={20} />, collection: 'user_profiles', category: '会员与用户' },
  { name: '管理员账号', icon: <Shield size={20} />, collection: 'user_roles', category: '会员与用户' },
  { name: '学习进度', icon: <GraduationCap size={20} />, collection: 'user_progress', category: '会员与用户' },

  // ===== 线下培训 =====
  { name: '班级', icon: <Users size={20} />, collection: 'classes', category: '线下培训' },
  { name: '班级成员', icon: <Users size={20} />, collection: 'class_members', category: '线下培训' },
  { name: '排课', icon: <Calendar size={20} />, collection: 'schedules', category: '线下培训' },
  { name: '课程排课', icon: <Calendar size={20} />, collection: 'course_schedules', category: '线下培训' },
  { name: '班级排课', icon: <Calendar size={20} />, collection: 'class_schedules', category: '线下培训' },
  { name: '培训班报名', icon: <GraduationCap size={20} />, collection: 'enrollments', category: '线下培训' },
  { name: '报名审核', icon: <ClipboardList size={20} />, collection: 'registrations', category: '线下培训' },
  { name: '出勤记录', icon: <ClipboardList size={20} />, collection: 'attendance', category: '线下培训' },
  { name: '出勤明细', icon: <ClipboardList size={20} />, collection: 'attendance_records', category: '线下培训' },
  { name: '调课请求', icon: <Wrench size={20} />, collection: 'transferRequests', category: '线下培训' },
  { name: '调课记录', icon: <Wrench size={20} />, collection: 'schedule_changes', category: '线下培训' },

  // ===== 教师 =====
  { name: '教师', icon: <Users size={20} />, collection: 'teachers', category: '教师' },
  { name: '教师档案', icon: <GraduationCap size={20} />, collection: 'teacher_profiles', category: '教师' },

  // ===== 订单与财务 =====
  { name: '课程订单', icon: <CreditCard size={20} />, collection: 'orders', category: '订单与财务' },
  { name: '优惠券', icon: <Percent size={20} />, collection: 'coupons', category: '订单与财务' },

  // ===== 练习考试 =====
  { name: '题库', icon: <FileText size={20} />, collection: 'questionBanks', category: '练习考试' },
  { name: '考试', icon: <ClipboardList size={20} />, collection: 'exams', category: '练习考试' },
  { name: '考试记录', icon: <ClipboardList size={20} />, collection: 'examAttempts', category: '练习考试' },

  // ===== 证书 =====
  { name: '证书', icon: <Award size={20} />, collection: 'certificates', category: '证书' },

  // ===== 运营配置 =====
  { name: '轮播图', icon: <Image size={20} />, collection: 'banners', category: '运营配置' },
  { name: '公告', icon: <Bell size={20} />, collection: 'notices', category: '运营配置' },
  { name: '消息', icon: <Bell size={20} />, collection: 'messages', category: '运营配置' },
  { name: '购物车', icon: <ShoppingCart size={20} />, collection: 'cart', category: '运营配置' },

  // ===== 系统 =====
  { name: '系统日志', icon: <ScrollText size={20} />, collection: 'logs', category: '系统' },
  { name: '页面配置', icon: <Layers size={20} />, collection: 'page_configs', category: '系统' },
];

export default function AdminDiagnostics() {
  const [results, setResults] = useState<DiagnoseResult[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [cloudFunctionStatus, setCloudFunctionStatus] = useState<'pending' | 'checking' | 'success' | 'error'>('pending');
  const [cloudFunctionError, setCloudFunctionError] = useState<string>('');

  // 按分类分组
  const groupedModules = ALL_MODULES.reduce((acc, module) => {
    const category = module.category || '其他';
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {} as Record<string, typeof ALL_MODULES>);

  const runDiagnostics = async () => {
    setRunning(true);
    setCloudFunctionStatus('checking');
    setResults(ALL_MODULES.map(m => ({
      ...m,
      status: 'checking' as const,
      count: 0,
    })));

    // 先测试云函数是否可用
    try {
      const testResult = await adminService.list('courses', {}, { page: 1, limit: 1 });
      if (testResult.code === 0) {
        setCloudFunctionStatus('success');
      } else {
        setCloudFunctionStatus('error');
        setCloudFunctionError((testResult as { message?: string }).message || '云函数调用失败');
      }
    } catch (error: any) {
      setCloudFunctionStatus('error');
      setCloudFunctionError(error.message || '云函数连接失败');
    }

    // 批量检测所有模块
    const newResults: DiagnoseResult[] = [];

    for (const module of ALL_MODULES) {
      try {
        const result = await adminService.list(module.collection, {}, { page: 1, limit: 1 });
        if (result.code === 0) {
          const countResult = await adminService.count(module.collection, {});
          newResults.push({
            ...module,
            status: 'success',
            count: countResult.data || 0,
          });
        } else {
          newResults.push({
            ...module,
            status: 'error',
            count: 0,
            error: result.message || '加载失败',
          });
        }
      } catch (error: any) {
        newResults.push({
          ...module,
          status: 'error',
          count: 0,
          error: error.message || '调用失败',
        });
      }
      setResults([...newResults]);
    }

    setRunning(false);
    setLastRun(new Date());
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const zeroCount = results.filter(r => r.status === 'success' && r.count === 0).length;

  return (
    <AdminPageTemplate
      title="系统诊断（完整版）"
      description="检测所有模块的数据加载状态，快速定位前后端交互问题"
    >
      {/* 云函数状态 */}
      <div className={`rounded-xl border p-4 mb-6 ${cloudFunctionStatus === 'success' ? 'bg-green-50 border-green-200' : cloudFunctionStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {cloudFunctionStatus === 'success' && <CheckCircle size={24} className="text-green-600" />}
            {cloudFunctionStatus === 'error' && <XCircle size={24} className="text-red-600" />}
            {cloudFunctionStatus === 'checking' && <RefreshCw size={24} className="text-yellow-600 animate-spin" />}
            <div>
              <div className="font-medium">云函数状态</div>
              <div className="text-sm text-gray-500">
                {cloudFunctionStatus === 'success' && 'admin 云函数调用正常'}
                {cloudFunctionStatus === 'error' && cloudFunctionError}
                {cloudFunctionStatus === 'checking' && '检测中...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总模块数</p>
              <p className="text-2xl font-bold text-gray-900">{ALL_MODULES.length}</p>
            </div>
            <Database size={24} className="text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">正常</p>
              <p className="text-2xl font-bold text-green-600">{successCount}</p>
            </div>
            <CheckCircle size={24} className="text-green-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">异常</p>
              <p className="text-2xl font-bold text-red-600">{errorCount}</p>
            </div>
            <XCircle size={24} className="text-red-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">空数据</p>
              <p className="text-2xl font-bold text-yellow-600">{zeroCount}</p>
            </div>
            <AlertCircle size={24} className="text-yellow-400" />
          </div>
        </div>
      </div>

      {/* 诊断按钮 */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">立即诊断</h3>
            <p className="text-sm text-gray-500">
              点击按钮检测所有 {ALL_MODULES.length} 个模块的数据加载状态
              {lastRun && (
                <span> · 上次检测: {lastRun.toLocaleTimeString()}</span>
              )}
            </p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={running}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              running
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <RefreshCw size={18} className={running ? 'animate-spin' : ''} />
            {running ? '检测中...' : '开始诊断'}
          </button>
        </div>
      </div>

      {/* 分类显示诊断结果 */}
      {Object.entries(groupedModules).map(([category, modules]) => {
        const categoryResults = results.filter(r => r.category === category);
        const categorySuccess = categoryResults.filter(r => r.status === 'success').length;
        const categoryError = categoryResults.filter(r => r.status === 'error').length;
        const isExpanded = expandedCategory === category;

        return (
          <div key={category} className="mb-4">
            {/* 分类标题 */}
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : category)}
              className="w-full flex items-center justify-between bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">{category}</span>
                <span className="text-sm text-gray-500">({categorySuccess}/{modules.length})</span>
                {categoryError > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                    {categoryError} 个异常
                  </span>
                )}
              </div>
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {/* 分类内容 */}
            {isExpanded && (
              <div className="bg-white rounded-b-xl border border-t-0 overflow-hidden mt-1">
                <div className="divide-y">
                  {categoryResults.map((result, index) => (
                    <div key={index} className="px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded ${
                          result.status === 'success' ? 'bg-green-100 text-green-600' :
                          result.status === 'error' ? 'bg-red-100 text-red-600' :
                          result.status === 'checking' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {result.icon}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{result.name}</div>
                          <div className="text-xs text-gray-400">{result.collection}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {result.status === 'success' && (
                          <>
                            <span className={`font-medium text-sm ${result.count === 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {result.count} 条
                            </span>
                            <CheckCircle size={16} className="text-green-500" />
                          </>
                        )}
                        {result.status === 'error' && (
                          <>
                            <span className="text-red-600 text-xs max-w-32 truncate" title={result.error}>
                              {result.error}
                            </span>
                            <XCircle size={16} className="text-red-500" />
                          </>
                        )}
                        {result.status === 'checking' && (
                          <>
                            <RefreshCw size={14} className="text-yellow-500 animate-spin" />
                            <span className="text-yellow-600 text-xs">检测中...</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 常见问题提示 */}
      {(errorCount > 0 || cloudFunctionStatus === 'error') && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-medium text-red-900 mb-2 flex items-center gap-2">
            <AlertCircle size={18} />
            发现 {errorCount + (cloudFunctionStatus === 'error' ? 1 : 0)} 个问题
          </h3>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• 云函数异常：请检查 admin 云函数是否已部署</li>
            <li>• 模块调用失败：检查浏览器控制台（F12）的具体错误</li>
            <li>• 集合不存在：需要在数据库中创建对应集合</li>
            <li>• 权限问题：检查数据库安全规则是否允许访问</li>
            <li>• 清除浏览器缓存后重试</li>
          </ul>
        </div>
      )}
    </AdminPageTemplate>
  );
}
