import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Clock, Award, TrendingUp, BookOpen, 
  AlertCircle, ChevronRight, Play, History, BarChart3,
  CheckCircle, XCircle, Timer, GraduationCap
} from 'lucide-react';
import type { Exam, ExamAttempt, QuestionBank } from '@/types';
import { examService, questionBankService } from '@/services/examService';
import { useAuthStore } from '@/store/authStore';
import Loading from '@/components/Loading';
import EmptyState from '@/components/EmptyState';

interface ExamCardProps {
  exam: Exam;
  attempts: ExamAttempt[];
  onStart: (exam: Exam) => void;
}

const ExamCard = ({ exam, attempts, onStart }: ExamCardProps) => {
  const examAttempts = attempts.filter(a => a.examId === exam._id);
  const bestScore = examAttempts.length > 0 ? Math.max(...examAttempts.map(a => a.score)) : null;
  const passCount = examAttempts.filter(a => a.passStatus).length;
  const remainingAttempts = (exam.attempts || 0) - examAttempts.length;
  
  // 安全转换字段为字符串
  const safeTitle = String(exam.title || '考试');
  const safeDesc = String(exam.description || '');
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{safeTitle}</h3>
            <p className="text-sm text-gray-500 line-clamp-2">{safeDesc}</p>
          </div>
          <div className="ml-4">
            {bestScore !== null && bestScore >= (exam.passScore || 60) ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                已通过
              </span>
            ) : bestScore !== null ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <XCircle className="w-3 h-3 mr-1" />
                未通过
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                未开始
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-xs text-gray-500">考试时长</p>
            <p className="text-sm font-semibold text-gray-900">{exam.duration || 60}分钟</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <FileText className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-xs text-gray-500">题目数量</p>
            <p className="text-sm font-semibold text-gray-900">{exam.questionCount || 0}题</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Award className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-xs text-gray-500">及格分数</p>
            <p className="text-sm font-semibold text-gray-900">{exam.passScore || 60}分</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-xs text-gray-500">满分</p>
            <p className="text-sm font-semibold text-gray-900">{exam.totalScore || 100}分</p>
          </div>
        </div>
        
        {examAttempts.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">已考次数: <span className="font-medium">{examAttempts.length}/{(exam.attempts || 0)}</span></span>
              <span className="text-gray-600">最佳成绩: 
                <span className={`font-medium ${bestScore && bestScore >= (exam.passScore || 60) ? 'text-green-600' : 'text-red-600'}`}>
                  {bestScore}分
                </span>
              </span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            剩余次数: <span className={`font-medium ${remainingAttempts > 0 ? 'text-blue-600' : 'text-red-600'}`}>{Math.max(0, remainingAttempts)}次</span>
          </div>
          <button
            onClick={() => onStart(exam)}
            disabled={remainingAttempts <= 0}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4 mr-2" />
            {examAttempts.length > 0 ? '重新考试' : '开始考试'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface QuestionBankCardProps {
  bank: QuestionBank;
  onPractice: (bank: QuestionBank) => void;
}

const QuestionBankCard = ({ bank, onPractice }: QuestionBankCardProps) => {
  const categoryLabels: Record<string, string> = {
    regulations: '法规政策',
    principles: '飞行原理',
    aerial: '航拍技术',
    safety: '安全操作'
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 mb-2">
              {categoryLabels[bank.category] || bank.category}
            </span>
            <h3 className="text-lg font-semibold text-gray-900">{bank.name}</h3>
          </div>
          <BookOpen className="w-8 h-8 text-blue-500" />
        </div>
        
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{bank.description}</p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <FileText className="w-4 h-4 mr-1 text-gray-400" />
            <span>{bank.questionCount}道题目</span>
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            bank.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {bank.status === 'active' ? '可用' : '停用'}
          </span>
        </div>
        
        <button
          onClick={() => onPractice(bank)}
          className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          开始练习
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

// 数据为空时显示空状态，不使用示例数据

export default function ExamCenter() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'exams' | 'banks' | 'history' | 'wrong'>('exams');
  const [exams, setExams] = useState<Exam[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // 模考弹窗状态
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
  const [practiceMode, setPracticeMode] = useState<'sequential' | 'random'>('sequential');
  const [questionCount, setQuestionCount] = useState(20);

  useEffect(() => {
    loadData();
  }, [user?.uid]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 使用真实用户ID
      const userId = user?.uid || 'anonymous';
      
      console.log('[ExamCenter] 开始加载数据, userId:', userId);
      
      // 分别调用 API，单独处理每个错误
      let examsData: Exam[] = [];
      let banksData: QuestionBank[] = [];
      let attemptsData: ExamAttempt[] = [];
      
      // 获取考试列表
      try {
        const examsRes = await examService.getList();
        if (examsRes.success && examsRes.data && examsRes.data.length > 0) {
          examsData = examsRes.data;
          setExams(examsData);
          console.log('[ExamCenter] 考试列表加载成功:', examsData.length, '条');
        } else {
          console.warn('[ExamCenter] 考试列表为空');
          setExams([]);
        }
      } catch (err) {
        console.error('[ExamCenter] 考试列表异常:', err);
        setExams([]);
      }
      
      // 获取题库列表
      try {
        const banksRes = await questionBankService.getList();
        if (banksRes.success && banksRes.list && banksRes.list.length > 0) {
          banksData = banksRes.list;
          setBanks(banksData);
          console.log('[ExamCenter] 题库列表加载成功:', banksData.length, '条');
        } else {
          console.warn('[ExamCenter] 题库列表为空');
          setBanks([]);
        }
      } catch (err) {
        console.error('[ExamCenter] 题库列表异常:', err);
        setBanks([]);
      }
      
      // 获取考试记录（可能需要登录）
      try {
        const attemptsRes = await examService.getAttempts(userId);
        if (attemptsRes.success) {
          attemptsData = attemptsRes.data || [];
          setAttempts(attemptsData);
          console.log('[ExamCenter] 考试记录加载成功:', attemptsData.length, '条');
        } else {
          console.warn('[ExamCenter] 考试记录加载失败:', attemptsRes.message);
        }
      } catch (err) {
        console.error('[ExamCenter] 考试记录异常:', err);
      }
      
      // 如果所有数据都为空，设置友好提示
      if (examsData.length === 0 && banksData.length === 0) {
        setError('暂无考试数据');
      }
      
    } catch (err) {
      setError('加载数据失败');
      console.error('[ExamCenter] loadData 异常:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (exam: Exam) => {
    setSelectedExam(exam);
  };

  const handleStartPractice = (bank: QuestionBank) => {
    setSelectedBank(bank);
  };

  const confirmStartExam = () => {
    if (selectedExam) {
      // ★ 跳转到答题页面 /learning/exam/:examId（而非列表页 /exam/:examId）
      navigate(`/learning/exam/${selectedExam._id}`);
    }
  };

  const confirmStartPractice = () => {
    if (selectedBank) {
      navigate(`/practice/${selectedBank._id}?mode=${practiceMode}&count=${questionCount}`);
    }
  };

  if (loading) {
    return <Loading text="加载考试信息..." />;
  }

  // 统计信息
  const totalAttempts = attempts.length;
  const passCount = attempts.filter(a => a.passStatus).length;
  const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面标题 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">题库与考试</h1>
              <p className="text-blue-100">在线考试、题库练习、成绩查询一站式平台</p>
              {isDemoMode && (
                <p className="text-yellow-200 text-sm mt-1">⚠️ 当前显示示例数据，请在后台管理中添加真实考试和题库</p>
              )}
            </div>
            <GraduationCap className="w-16 h-16 text-blue-200 opacity-50" />
          </div>
          
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-200 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{exams.length}</p>
                  <p className="text-sm text-blue-100">可考科目</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center">
                <History className="w-8 h-8 text-blue-200 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{totalAttempts}</p>
                  <p className="text-sm text-blue-100">已考次数</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-blue-200 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{passCount}</p>
                  <p className="text-sm text-blue-100">通过次数</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-blue-200 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{avgScore}</p>
                  <p className="text-sm text-blue-100">平均分数</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 标签导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'exams', label: '在线考试', icon: FileText },
              { id: 'banks', label: '题库练习', icon: BookOpen },
              { id: 'history', label: '考试记录', icon: History },
              { id: 'wrong', label: '错题本', icon: AlertCircle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* 在线考试 */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">可参加的考试</h2>
            </div>
            
            {exams.length === 0 ? (
              <EmptyState 
                icon={<FileText />}
                title="暂无考试"
                description="暂时没有可参加的考试，请先报名课程"
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {exams.map(exam => (
                  <ExamCard 
                    key={exam._id} 
                    exam={exam} 
                    attempts={attempts}
                    onStart={handleStartExam}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 题库练习 */}
        {activeTab === 'banks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">题库练习</h2>
            </div>
            
            {banks.length === 0 ? (
              <EmptyState 
                icon={<BookOpen className="w-16 h-16 text-gray-300" />}
                title="暂无题库"
                description="题库正在建设中，敬请期待"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banks.map(bank => (
                  <QuestionBankCard 
                    key={bank._id} 
                    bank={bank}
                    onPractice={handleStartPractice}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 考试记录 */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">考试记录</h2>
            </div>
            
            {attempts.length === 0 ? (
              <EmptyState 
                icon={<History />}
                title="暂无考试记录"
                description="您还没有参加过任何考试"
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">考试名称</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分数</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用时</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">考试时间</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {attempts.map(attempt => {
                        const exam = exams.find(e => e._id === attempt.examId);
                        return (
                          <tr key={attempt._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{exam?.title || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-lg font-bold ${attempt.passStatus ? 'text-green-600' : 'text-red-600'}`}>
                                {attempt.score ?? 0}
                              </span>
                              <span className="text-sm text-gray-500">/{exam?.totalScore ?? 100}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {attempt.passStatus ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  已通过
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  未通过
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <Timer className="w-4 h-4 mr-1" />
                                {attempt.duration ?? 0}分钟
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {attempt.submitTime ? new Date(attempt.submitTime).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <a 
                                href={`/exam/result/${attempt._id}`}
                                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                              >
                                查看详情
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 错题本 */}
        {activeTab === 'wrong' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">错题本</h2>
              <a 
                href="/wrong-questions"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                查看全部
                <ChevronRight className="w-4 h-4 ml-1" />
              </a>
            </div>
            
            <EmptyState 
              icon={<AlertCircle />}
              title="错题本功能"
              description="记录您练习中答错的题目，方便针对性复习"
              actionText="去练习"
              onAction={() => setActiveTab('banks')}
            />
          </div>
        )}
      </div>

      {/* 开始考试确认弹窗 */}
      {selectedExam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">确认开始考试</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">考试科目</span>
                <span className="font-medium text-gray-900">{selectedExam.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">考试时长</span>
                <span className="font-medium text-gray-900">{selectedExam.duration}分钟</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">题目数量</span>
                <span className="font-medium text-gray-900">{selectedExam.questionCount}题</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">及格分数</span>
                <span className="font-medium text-gray-900">{selectedExam.passScore}分</span>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" />
                <p className="text-sm text-yellow-700">开始考试后计时器将启动，请在规定时间内完成所有题目。</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedExam(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmStartExam}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                开始考试
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 开始练习弹窗 */}
      {selectedBank && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">设置练习模式</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">练习模式</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPracticeMode('sequential')}
                    className={`px-4 py-3 rounded-lg border-2 text-center transition-colors ${
                      practiceMode === 'sequential'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">顺序练习</div>
                    <div className="text-xs text-gray-500 mt-1">按题库顺序做题</div>
                  </button>
                  <button
                    onClick={() => setPracticeMode('random')}
                    className={`px-4 py-3 rounded-lg border-2 text-center transition-colors ${
                      practiceMode === 'random'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">随机练习</div>
                    <div className="text-xs text-gray-500 mt-1">随机抽取题目</div>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">题目数量</label>
                <input
                  type="range"
                  min="10"
                  max={Math.min(50, selectedBank.questionCount)}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">{questionCount}道题</div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedBank(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmStartPractice}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                开始练习
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
