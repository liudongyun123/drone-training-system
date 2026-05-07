// ============================================================================
// 在线考试页面
// ============================================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { examService } from '@/services/examService';
import { useAuthStore } from '@/store/authStore';
import type { QuestionOption } from '@/types/service';

// 本地类型 - 匹配实际数据库/服务返回的数据结构
interface ExamItem {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  courseId?: string;
  duration: number;
  passScore: number;
  totalScore: number;
  questionCount?: number;
  attempts?: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface QuestionItem {
  _id?: string;
  id?: string;
  examId?: string;
  type: string;
  question?: string;
  content?: string;
  options?: (string | QuestionOption)[];
  answer: string | string[];
  explanation?: string;
  score?: number;
  order?: number;
}

interface ExamResult {
  score: number;
  passStatus?: boolean;
  passed?: boolean;
  correctCount?: number;
  totalCount?: number;
  answers?: any[];
}

export default function ExamPage() {
  // ★ 路由定义为 /learning/exam/:examId，所以参数名必须是 examId
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [exam, setExam] = useState<ExamItem | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (examId) loadExam();
  }, [examId]);

  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !submitted && questions.length > 0) {
      handleSubmit();
    }
  }, [timeLeft, submitted, questions]);

  const loadExam = async () => {
    if (!examId) return;
    setLoading(true);
    
    let hasData = false;
    let errorMsg = '';
    
    try {
      console.log('[ExamPage] loadExam 开始加载, examId:', examId);
      
      // 1. 获取考试详情 + 题目（并行）
      const [examResult, questionsResult] = await Promise.all([
        examService.getDetail(examId),
        examService.getQuestions(examId)
      ]);

      console.log('[ExamPage] getDetail:', examResult.success ? '✅' : '❌', 
        examResult.data?._id || '');
      console.log('[ExamPage] getQuestions:', questionsResult.success ? '✅' : '❌',
        '题目数:', questionsResult.data?.length || 0);

      if (examResult.success && examResult.data) {
        const safeExam = {
          ...examResult.data,
          title: String(examResult.data.title || '考试'),
          description: String(examResult.data.description || ''),
        };
        setExam(safeExam);
        setTimeLeft((examResult.data.duration || 60) * 60);
        hasData = true;
      } else {
        console.warn('[ExamPage] 获取考试详情失败:', examResult.message);
        errorMsg = examResult.message || '获取考试信息失败';
      }

      if (questionsResult.success && questionsResult.data && questionsResult.data.length > 0) {
        setQuestions(questionsResult.data);
        hasData = true;
      } else {
        console.warn('[ExamPage] getQuestions 返回空或失败:', questionsResult.message);
        
        // ★ 兜底：尝试从 startExam 获取题目
        console.log('[ExamPage] 尝试从 startExam 获取题目...');
        try {
          const startResult = await examService.startExam(examId, user?.uid || 'anonymous');
          if (startResult.success && startResult.data && startResult.data.questions && startResult.data.questions.length > 0) {
            console.log('[ExamPage] 从 startExam 获取到', startResult.data.questions.length, '题');
            setQuestions(startResult.data.questions);
            setAttemptId(startResult.data.attemptId);
            hasData = true;
            errorMsg = '';
          } else {
            errorMsg = startResult.message || '暂无题目';
          }
        } catch (startErr: any) {
          console.warn('[ExamPage] startExam 也失败:', startErr.message);
          if (!errorMsg) errorMsg = '无法获取考试题目';
        }
      }
      
      // 创建考试记录（如果还没创建）
      if (!attemptId) {
        try {
          const startResult2 = await examService.startExam(examId, user?.uid || 'anonymous');
          if (startResult2.success && startResult2.data) {
            setAttemptId(startResult2.data.attemptId);
          }
        } catch (e) { /* 忽略 */ }
      }
      
      if (!hasData && !errorMsg) {
        errorMsg = '未找到考试数据';
      }
      if (errorMsg) {
        setErrorMsg(errorMsg);
      }
      
    } catch (error: any) {
      console.error('[ExamPage] 加载考试异常:', error);
      setErrorMsg(error.message || '加载异常');
    } finally {
      setLoading(false);  // ★ 无论成功失败都必须停止 loading
    }
  };

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleSubmit = async () => {
    if (submitted || submitting) return;
    setSubmitting(true);
    try {
      const answerList = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer: typeof answer === 'boolean' ? (answer ? 'true' : 'false') : answer
      }));

      const submitResult = await examService.submitExam(
        attemptId || `attempt_${Date.now()}`,
        answerList,
        user?.uid || 'anonymous'
      );

      if (submitResult.success && submitResult.data) {
        const data = submitResult.data;
        setSubmitted(true);
        setResult({
          score: data.score,
          passStatus: data.passStatus,
          correctCount: data.answers?.filter((a: any) => a.isCorrect).length || 0,
          totalCount: data.answers?.length || 0,
        });
      } else {
        setResult({
          score: 0,
          passStatus: false,
          correctCount: 0,
          totalCount: questions.length,
        });
        setSubmitted(true);
      }
    } catch (error) {
      console.error('提交考试失败:', error);
      setSubmitted(true);
      setResult({ score: 0, passStatus: false, correctCount: 0, totalCount: questions.length });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // ★ 数据为空时显示错误/空状态
  if (errorMsg && (!exam || questions.length === 0)) {
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-12">
              <XCircle className="text-warning w-16 h-16 mb-4" />
              <h2 className="text-xl font-bold mb-2">无法加载考试</h2>
              <p className="text-gray-500 mb-6">{errorMsg}</p>
              <div className="flex gap-4">
                <button className="btn btn-outline" onClick={() => { setErrorMsg(''); loadExam(); }}>
                  重试
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/exam-center')}>
                  返回考试中心
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ★ 无题目但无错误时也显示友好提示
  if ((!questions || questions.length === 0) && !submitted) {
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-12">
              <h2 className="text-xl font-bold mb-2">{exam?.title || '考试'}</h2>
              <p className="text-gray-500">该考试暂未配置题目，请联系管理员</p>
              <button className="btn btn-primary mt-4" onClick={() => navigate('/exam-center')}>
                返回考试中心
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* 考试头部 */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{exam?.title}</h1>
                <p className="text-gray-600 mt-2">
                  总分：{exam?.totalScore}分 | 及格：{exam?.passScore}分
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-lg">
                  <Clock className="text-primary" />
                  <span className={timeLeft < 300 ? 'text-red-500 font-bold' : ''}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!submitted ? (
          <>
            {/* 答题区域 */}
            <div className="card bg-base-100 shadow-xl mb-6">
              <div className="card-body">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-lg font-semibold">
                    第 {currentQuestion + 1} 题 / 共 {questions.length} 题
                  </div>
                  <div className="text-sm text-gray-500">
                    {questions[currentQuestion]?.score} 分
                  </div>
                </div>

                {questions[currentQuestion] && (
                  <div className="mb-6">
                    <div className="text-lg mb-4">
                      {questions[currentQuestion].question}
                    </div>

                    {questions[currentQuestion].type === 'single' && (
                      <div className="space-y-3">
                        {(questions[currentQuestion].options || []).map((opt: any, idx: number) => {
                          const optStr = typeof opt === 'string' ? opt : opt?.content || '';
                          const qId = questions[currentQuestion]._id || String(idx);
                          return (
                          <label
                            key={idx}
                            className={`label cursor-pointer border rounded-lg p-4 hover:bg-base-200 ${
                              answers[qId] === optStr
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name={qId}
                                className="radio radio-primary"
                                checked={answers[qId] === optStr}
                                onChange={(e) => handleAnswer(qId, e.target.value)}
                                value={optStr}
                              />
                              <span>{optStr}</span>
                            </div>
                          </label>
                          );
                        })}
                      </div>
                    )}

                    {questions[currentQuestion].type === 'multiple' && (
                      <div className="space-y-3">
                        {(questions[currentQuestion].options || []).map((opt: any, idx: number) => {
                          const optStr = typeof opt === 'string' ? opt : opt?.content || '';
                          const qId = questions[currentQuestion]._id || String(idx);
                          return (
                          <label
                            key={idx}
                            className={`label cursor-pointer border rounded-lg p-4 hover:bg-base-200 ${
                              (answers[qId] || []).includes(optStr)
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-primary"
                                checked={(answers[qId] || []).includes(optStr)}
                                onChange={(e) => {
                                  const current = answers[qId] || [];
                                  if (e.target.checked) {
                                    handleAnswer(qId, [...current, optStr]);
                                  } else {
                                    // @ts-ignore
                                    handleAnswer(qId, current.filter((v: any) => v !== optStr));
                                  }
                                }}
                                value={optStr}
                              />
                              <span>{optStr}</span>
                            </div>
                          </label>
                          );
                        })}
                      </div>
                    )}

                    {(questions[currentQuestion].type === 'judge' || questions[currentQuestion].type === 'truefalse' || questions[currentQuestion].type === 'true_false') && (() => {
                      const qId = questions[currentQuestion]._id || String(questions[currentQuestion].order || 0);
                      return (
                      <div className="flex gap-4">
                        <label className="label cursor-pointer border rounded-lg p-4 hover:bg-base-200 w-full">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={qId}
                              className="radio radio-primary"
                              // @ts-ignore
                              checked={answers[qId] === true}
                              onChange={() => handleAnswer(qId, true)}
                            />
                            <span>正确</span>
                          </div>
                        </label>
                        <label className="label cursor-pointer border rounded-lg p-4 hover:bg-base-200 w-full">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={qId}
                              className="radio radio-primary"
                              // @ts-ignore
                              checked={answers[qId] === false}
                              onChange={() => handleAnswer(qId, false)}
                            />
                            <span>错误</span>
                          </div>
                        </label>
                      </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    className="btn btn-outline"
                    disabled={currentQuestion === 0}
                    onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  >
                    上一题
                  </button>
                  {currentQuestion < questions.length - 1 ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    >
                      下一题
                    </button>
                  ) : (
                    <button className="btn btn-success" onClick={handleSubmit}>
                      提交试卷
                    </button>
                  )}
                </div>
              </div>
            </div>

                {/* 题目导航 */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h3 className="font-semibold mb-4">题目导航</h3>
                    <div className="flex flex-wrap gap-2">
                      {questions.map((q, idx) => (
                        <button
                          key={String(q._id || `q-${idx}`)}
                          className={`btn btn-circle ${
                            currentQuestion === idx
                              ? 'btn-primary'
                              : answers[q._id || String(idx)]
                              ? 'btn-success'
                              : 'btn-outline'
                          }`}
                          onClick={() => setCurrentQuestion(idx)}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
          </>
        ) : (
          // 考试结果
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-12">
              {result?.passStatus ? (
                <CheckCircle className="text-green-500 w-24 h-24 mb-4" />
              ) : (
                <XCircle className="text-red-500 w-24 h-24 mb-4" />
              )}
              <h2 className="text-3xl font-bold mb-2">
                {result?.passStatus ? '恭喜通过！' : '未通过考试'}
              </h2>
              <div className="text-5xl font-bold text-primary my-6">
                {result?.score} 分
              </div>
              <p className="text-xl mb-6">
                正确 {result?.correctCount} / {result?.totalCount} 题
              </p>
              <div className="flex gap-4">
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setSubmitted(false);
                    setCurrentQuestion(0);
                    setAnswers({});
                  }}
                >
                  重新考试
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/learning')}>
                  返回学习
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
