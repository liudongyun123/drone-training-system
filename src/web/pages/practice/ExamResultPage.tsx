import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Award, Clock, CheckCircle, XCircle, ArrowLeft, RotateCcw,
  FileText, BarChart3, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import type { ExamAttempt, Exam, Question } from '@/types';
import { examService } from '@/services/examService';
import Loading from '@/components/Loading';

export default function ExamResult() {
  const { attemptId } = useParams<{ attemptId: string }>;
  const navigate = useNavigate();
  
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('[ExamResult] useEffect 触发, attemptId:', attemptId);
    
    // 如果 attemptId 为空或无效，尝试从 localStorage 获取最近的考试 ID
    if (!attemptId || attemptId === 'undefined' || attemptId === 'null') {
      console.log('[ExamResult] attemptId 无效，检查 localStorage...');
      const savedAttemptId = localStorage.getItem('lastExamAttemptId');
      if (savedAttemptId) {
        console.log('[ExamResult] 从 localStorage 获取到 ID:', savedAttemptId);
        // 使用保存的 ID 重新加载
        window.location.href = `/exam/result/${savedAttemptId}`;
        return;
      }
      
      // 尝试获取最新记录
      console.log('[ExamResult] 尝试获取最新考试记录...');
      loadLatestAttempt();
      return;
    }
    
    console.log('[ExamResult] 调用 loadResult()');
    loadResult();
  }, [attemptId]);

  // 加载最新的考试记录
  const loadLatestAttempt = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[ExamResult] loadLatestAttempt: 正在查询最新记录');
      
      const { getDb } = await import('../services/cloudBaseService');
      const result = await getDb()
        .collection('examAttempts')
        .orderBy('submitTime', 'desc')
        .limit(1)
        .get();
      
      console.log('[ExamResult] loadLatestAttempt: 查询结果', result);
      
      if (result.data && result.data.length > 0) {
        const latest = result.data[0];
        const attemptData: ExamAttempt = {
          _id: latest._id,
          examId: latest.examId || '',
          userId: latest.userId || '',
          courseId: latest.courseId || '',
          score: latest.score || 0,
          passStatus: latest.passStatus ?? (latest.score >= 60),
          answers: Array.isArray(latest.answers) ? latest.answers : [],
          startTime: latest.startTime || new Date().toISOString(),
          submitTime: latest.submitTime || '',
          duration: latest.duration || 60
        };
        
        setAttempt(attemptData);
        setExam({
          _id: attemptData.examId || 'unknown',
          title: '无人机考试',
          totalScore: 100,
          passScore: 60,
          duration: 60,
        } as Exam);
        
        // 获取题目
        if (attemptData.examId) {
          const questionsRes = await examService.getQuestions(attemptData.examId);
          if (questionsRes.success && questionsRes.data) {
            setQuestions(questionsRes.data);
          }
        }
      } else {
        setError('未找到考试记录');
      }
    } catch (err: any) {
      console.error('[ExamResult] loadLatestAttempt 失败:', err);
      setError('获取考试记录失败');
    } finally {
      setLoading(false);
    }
  };

  const loadResult = async () => {
    console.log('[ExamResult] loadResult 开始执行');
    try {
      console.log('[ExamResult] 步骤1: 设置 loading=true');
      setLoading(true);
      setError(null);
      
      console.log('[ExamResult] 步骤2: 调用 getAttemptDetail, attemptId:', attemptId);
      
      // 直接查询数据库，不使用 service
      let attemptData: ExamAttempt | null = null;
      
      try {
        console.log('[ExamResult] 步骤2.1: 导入 cloudBaseService');
        const { getDb } = await import('../services/cloudBaseService');
        console.log('[ExamResult] 步骤2.2: 导入成功，准备查询');
        
        // 直接查询，不依赖任何用户身份
        console.log('[ExamResult] 步骤2.3: 执行数据库查询, ID:', attemptId);
        const result = await getDb().collection('examAttempts').doc(attemptId!).get();
        console.log('[ExamResult] 步骤2.4: 查询结果:', JSON.stringify(result));
        
        if (result && result.data) {
          console.log('[ExamResult] 步骤2.5: 找到记录');
          attemptData = {
            _id: result.data._id || attemptId,
            examId: result.data.examId || '',
            userId: result.data.userId || '',
            courseId: result.data.courseId || '',
            score: result.data.score || 0,
            passStatus: result.data.passStatus ?? (result.data.score >= 60),
            answers: Array.isArray(result.data.answers) ? result.data.answers : [],
            startTime: result.data.startTime || new Date().toISOString(),
            submitTime: result.data.submitTime || '',
            duration: result.data.duration || 60
          };
        } else {
          console.log('[ExamResult] 步骤2.5: 直接查询未命中，尝试获取最新记录');
          // 获取最新记录
          const latestResult = await getDb()
            .collection('examAttempts')
            .orderBy('submitTime', 'desc')
            .limit(5)
            .get();
          console.log('[ExamResult] 最新记录数量:', latestResult.data?.length);
          
          if (latestResult.data && latestResult.data.length > 0) {
            const latest = latestResult.data[0];
            attemptData = {
              _id: latest._id || attemptId,
              examId: latest.examId || '',
              userId: latest.userId || '',
              courseId: latest.courseId || '',
              score: latest.score || 0,
              passStatus: latest.passStatus ?? (latest.score >= 60),
              answers: Array.isArray(latest.answers) ? latest.answers : [],
              startTime: latest.startTime || new Date().toISOString(),
              submitTime: latest.submitTime || '',
              duration: latest.duration || 60
            };
          }
        }
      } catch (e: any) {
        console.error('[ExamResult] 数据库查询失败:', e?.message || e, 'code:', e?.code, 'errCode:', e?.errCode);
      }
      
      console.log('[ExamResult] 步骤3: 处理查询结果, attemptData:', attemptData);
      
      if (!attemptData) {
        console.log('[ExamResult] 步骤3.1: 未找到记录，显示错误');
        setError('考试记录不存在');
        setLoading(false);
        return;
      }
      
      console.log('[ExamResult] 步骤4: 设置考试记录');
      setAttempt(attemptData);
      
      // 获取考试信息
      let examInfo: Exam = {
        _id: attemptData.examId || 'unknown',
        title: '无人机考试',
        totalScore: 100,
        passScore: 60,
        duration: 60,
      };
      
      if (attemptData.examId) {
        console.log('[ExamResult] 步骤5: 获取考试信息, examId:', attemptData.examId);
        const examRes = await examService.getDetail(attemptData.examId);
        if (examRes.success && examRes.data) {
          examInfo = examRes.data;
          console.log('[ExamResult] 考试信息获取成功:', examInfo);
        }
      }
      
      setExam(examInfo);
      
      // 获取题目信息
      if (attemptData.examId) {
        console.log('[ExamResult] 步骤6: 获取题目信息');
        const questionsRes = await examService.getQuestions(attemptData.examId);
        if (questionsRes.success && questionsRes.data) {
          setQuestions(questionsRes.data);
          console.log('[ExamResult] 题目数量:', questionsRes.data.length);
        }
      }
      
      console.log('[ExamResult] 步骤7: 加载完成，准备渲染');
    } catch (err: any) {
      console.error('[ExamResult] 加载失败:', err?.message || err);
      setError('获取考试结果失败: ' + (err?.message || '未知错误'));
    } finally {
      console.log('[ExamResult] 步骤8: 设置 loading=false');
      setLoading(false);
    }
  };

  const toggleQuestionDetail = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const getScoreLevel = (score: number, totalScore: number) => {
    const percentage = (score / totalScore) * 100;
    if (percentage >= 90) return { label: '优秀', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (percentage >= 80) return { label: '良好', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (percentage >= 60) return { label: '及格', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { label: '不及格', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  if (loading) {
    return <Loading text="加载考试结果..." />;
  }

  if (error || !attempt || !exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-500 mb-4">{error || '考试结果加载失败'}</p>
          <p className="text-sm text-gray-400 mb-6">
            考试ID: {attemptId}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setError(null);
                loadResult();
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重试
            </button>
            <button
              onClick={() => navigate('/exam-center')}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回考试中心
            </button>
          </div>
        </div>
      </div>
    );
  }

  const scoreLevel = getScoreLevel(attempt.score, exam.totalScore);
  const correctCount = attempt.answers.filter(a => a.isCorrect).length;
  const wrongCount = attempt.answers.length - correctCount;
  const accuracy = Math.round((correctCount / attempt.answers.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/exam-center')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回考试中心
            </button>
            <h1 className="text-lg font-semibold text-gray-900">考试结果</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 成绩卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className={`p-8 text-center ${attempt.passStatus ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-4">
              {attempt.passStatus ? (
                <Award className="w-12 h-12 text-green-500" />
              ) : (
                <XCircle className="w-12 h-12 text-red-500" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {attempt.passStatus ? '恭喜通过考试！' : '很遗憾，未通过考试'}
            </h2>
            <p className="text-white/80">{exam.title}</p>
          </div>
          
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-gray-900 mb-2">
                {attempt.score}
                <span className="text-2xl text-gray-400">/{exam.totalScore}</span>
              </div>
              <span className={`inline-flex items-center px-4 py-1 rounded-full text-sm font-medium ${scoreLevel.bgColor} ${scoreLevel.color}`}>
                {scoreLevel.label}
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">{accuracy}%</p>
                <p className="text-xs text-gray-500 mt-1">正确率</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                <p className="text-xs text-gray-500 mt-1">答对</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-red-600">{wrongCount}</p>
                <p className="text-xs text-gray-500 mt-1">答错</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">{attempt.duration}</p>
                <p className="text-xs text-gray-500 mt-1">用时(分钟)</p>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/exam-center')}
            className="flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回列表
          </button>
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <BarChart3 className="w-5 h-5 mr-2" />
            {showDetail ? '隐藏详情' : '查看解析'}
          </button>
          <button
            onClick={() => navigate(`/exam/${exam._id}`)}
            className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            重新考试
          </button>
        </div>

        {/* 答题详情 */}
        {showDetail && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              答题详情
            </h3>
            
            {attempt.answers.map((answer, index) => {
              const question = questions.find(q => q._id === answer.questionId);
              if (!question) return null;
              
              const isExpanded = expandedQuestions.has(answer.questionId);
              const keyId = String(answer.questionId || `a-${index}`);
              
              return (
                <div
                  key={keyId}
                  className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                    answer.isCorrect ? 'border-green-200' : 'border-red-200'
                  }`}
                >
                  <button
                    onClick={() => toggleQuestionDetail(answer.questionId)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center flex-1">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                        answer.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 line-clamp-1">{question.question}</p>
                        <div className="flex items-center mt-1 space-x-4 text-sm">
                          <span className={answer.isCorrect ? 'text-green-600' : 'text-red-600'}>
                            {answer.isCorrect ? '回答正确' : '回答错误'}
                          </span>
                          <span className="text-gray-400">得分: {answer.score}/{question.score}</span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="pt-4 space-y-3">
                        <div>
                          <p className="text-sm text-gray-500 mb-2">您的答案:</p>
                          <p className={`font-medium ${answer.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {Array.isArray(answer.userAnswer) 
                              ? answer.userAnswer.join(', ') || '未作答'
                              : answer.userAnswer || '未作答'
                            }
                          </p>
                        </div>
                        
                        {!answer.isCorrect && (
                          <div>
                            <p className="text-sm text-gray-500 mb-2">正确答案:</p>
                            <p className="font-medium text-green-600">
                              {Array.isArray(question.answer) 
                                ? question.answer.join(', ')
                                : question.answer
                              }
                            </p>
                          </div>
                        )}
                        
                        {question.options && (
                          <div className="mt-4 space-y-2">
                            {question.options.map((option, idx) => {
                              const letter = String.fromCharCode(65 + idx);
                              const isUserAnswer = Array.isArray(answer.userAnswer) 
                                ? answer.userAnswer.includes(letter)
                                : answer.userAnswer === letter;
                              const isCorrectAnswer = Array.isArray(question.answer)
                                ? question.answer.includes(letter)
                                : question.answer === letter;
                              
                              let bgColor = 'bg-gray-50';
                              let textColor = 'text-gray-700';
                              
                              if (isCorrectAnswer) {
                                bgColor = 'bg-green-50';
                                textColor = 'text-green-700';
                              } else if (isUserAnswer && !isCorrectAnswer) {
                                bgColor = 'bg-red-50';
                                textColor = 'text-red-700';
                              }
                              
                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-lg ${bgColor} ${textColor} flex items-center`}
                                >
                                  <span className="w-6 h-6 rounded bg-white/50 flex items-center justify-center text-sm font-bold mr-3">
                                    {letter}
                                  </span>
                                  <span className="flex-1">{option}</span>
                                  {isCorrectAnswer && <CheckCircle className="w-5 h-5 text-green-600" />}
                                  {isUserAnswer && !isCorrectAnswer && <XCircle className="w-5 h-5 text-red-600" />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
