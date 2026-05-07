// ============================================================================
// 我的练习记录页 - 前台
// ============================================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  ChevronRight, 
  Clock, 
  CheckCircle,
  XCircle,
  ArrowLeft,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Star
} from 'lucide-react';
import { Button, Card, Loading } from '@/components';
import { CloudPracticeService } from '@/services/CloudPracticeService';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateStr } from '@/utils/dateUtils';

// 兼容性格式化函数
const formatDate = (dateStr: string | undefined | null) => formatDateStr(dateStr, { year: 'numeric', month: '2-digit', day: '2-digit' });

// 格式化时长
const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分`;
  return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`;
};

interface Answer {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

interface PracticeRecord {
  id: string;
  bankId: string;
  bankTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  duration: number;
  isPassed: boolean;
  completedAt: string;
  answers: Answer[];
}

interface UserStats {
  totalPractices: number;
  totalQuestions: number;
  correctRate: number;
  avgScore: number;
  totalTime: number;
  rank: number;
}

export default function MyPracticePage() {
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'wrong' | 'ranking'>('records');
  // @ts-ignore
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // 加载练习记录
  const loadRecords = async () => {
    try {
      setLoading(true);
      const [recordsData, statsData] = await Promise.all([
        CloudPracticeService.getUserRecords().catch(() => []),
        CloudPracticeService.getUserStats().catch(() => null)
      ]);
      // @ts-ignore
      setRecords(recordsData);
      setStats(statsData);
    } catch (error) {
      console.error('加载练习记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadRecords();
  }, [isAuthenticated]);

  // 继续练习
  const handleContinuePractice = (record: PracticeRecord) => {
    navigate(`/practice/${record.bankId}`);
  };

  // 获取正确率
  const getAccuracy = (record: PracticeRecord) => {
    if (record.totalQuestions === 0) return 0;
    return Math.round((record.correctAnswers / record.totalQuestions) * 100);
  };

  // 获取分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  // 获取错题
  const wrongQuestions = records.flatMap(record => 
    (record.answers || [])
      .filter(a => !a.isCorrect)
      .map(a => ({
        ...a,
        bankTitle: record.bankTitle,
        recordId: record.id,
        completedAt: record.completedAt
      }))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/learning')}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">练习记录</h1>
                <p className="text-sm text-slate-500">{records.length} 次练习</p>
              </div>
            </div>
          </div>

          {/* Tab切换 */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { key: 'records', label: '练习记录', icon: ClipboardList },
              { key: 'wrong', label: '错题本', icon: XCircle, badge: wrongQuestions.length },
              { key: 'ranking', label: '排行榜', icon: Trophy },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === tab.key ? 'bg-white/20' : 'bg-red-100 text-red-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loading text="加载练习记录中..." />
          </div>
        ) : (
          <>
            {/* 统计卡片 */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{stats.totalPractices}</p>
                  <p className="text-sm text-slate-500">练习次数</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Target className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{stats.correctRate}%</p>
                  <p className="text-sm text-slate-500">正确率</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{stats.avgScore}</p>
                  <p className="text-sm text-slate-500">平均分数</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-violet-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    {stats.rank > 0 ? `#${stats.rank}` : '-'}
                  </p>
                  <p className="text-sm text-slate-500">我的排名</p>
                </div>
              </div>
            )}

            {/* 练习记录列表 */}
            {activeTab === 'records' && (
              <div className="space-y-4">
                {records.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ClipboardList className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-600 mb-2">暂无练习记录</h3>
                    <p className="text-slate-500 mb-4">开始练习来提高你的技能吧</p>
                    <Button onClick={() => navigate('/exam-center')}>
                      去练习
                    </Button>
                  </div>
                ) : (
                  records.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-violet-200 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        {/* 分数 */}
                        <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${
                          record.isPassed 
                            ? 'bg-emerald-100' 
                            : 'bg-red-100'
                        }`}>
                          <span className={`text-xl font-bold ${getScoreColor(record.score)}`}>
                            {record.score}
                          </span>
                          <span className="text-xs text-slate-500">分</span>
                        </div>

                        {/* 内容 */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 mb-1">
                            {record.bankTitle}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(record.completedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDuration(record.duration)}
                            </span>
                          </div>
                          
                          {/* 统计 */}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              <span className="text-emerald-600">{record.correctAnswers}</span> / {record.totalQuestions}
                            </span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-600">
                              正确率 {getAccuracy(record)}%
                            </span>
                          </div>
                        </div>

                        {/* 操作 */}
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            record.isPassed 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {record.isPassed ? '通过' : '未通过'}
                          </span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleContinuePractice(record)}
                          >
                            再次练习
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 错题本 */}
            {activeTab === 'wrong' && (
              <div className="space-y-4">
                {wrongQuestions.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-600 mb-2">太棒了！没有错题</h3>
                    <p className="text-slate-500">你已经掌握了所有练习题目</p>
                  </div>
                ) : (
                  wrongQuestions.map((wq, index) => (
                    <div
                      key={`${wq.recordId}-${wq.questionId}-${index}`}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                          <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-500 mb-2">{wq.bankTitle}</p>
                          <div className="bg-slate-50 rounded-lg p-3 mb-2">
                            <p className="text-sm text-slate-600">
                              <span className="text-red-500">你的答案：</span>
                              {wq.userAnswer || '未作答'}
                            </p>
                            <p className="text-sm text-slate-600">
                              <span className="text-emerald-600">正确答案：</span>
                              {wq.correctAnswer}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 排行榜 */}
            {activeTab === 'ranking' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-10 h-10 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-600 mb-2">
                    {stats?.rank ? `你当前的排名是 #${stats.rank}` : '暂无排名'}
                  </h3>
                  <p className="text-slate-500">继续练习提高你的排名</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
