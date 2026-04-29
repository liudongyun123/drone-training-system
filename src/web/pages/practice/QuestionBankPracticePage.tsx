import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Flag, CheckCircle, XCircle, AlertCircle,
  BookOpen, RotateCcw, ChevronRight, Eye, EyeOff,
  Heart, Bookmark
} from 'lucide-react';
import type { BankQuestion, QuestionBank } from '@/types';
import { questionBankService } from '@/services/examService';
import Loading from '@/components/Loading';

export default function QuestionBankPractice() {
  const { bankId } = useParams<{ bankId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const mode = (searchParams.get('mode') as 'sequential' | 'random') || 'sequential';
  const questionCount = Number(searchParams.get('count')) || 20;
  
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [practiceId, setPracticeId] = useState<string>('');
  
  // 答题状态
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // 练习完成状态
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<{ score: number; correctCount: number } | null>(null);

  useEffect(() => {
    if (bankId) {
      startPractice();
    }
  }, [bankId]);

  const startPractice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [bankRes, practiceRes] = await Promise.all([
        questionBankService.getDetail(bankId!),
        questionBankService.startPractice(bankId!, mode, questionCount)
      ]);
      
      if (!bankRes.success || !practiceRes.success) {
        throw new Error(bankRes.message || practiceRes.message || '开始练习失败');
      }
      
      setBank(bankRes.data!);
      setQuestions(practiceRes.data!.questions);
      setPracticeId(practiceRes.data!.practiceId);
    } catch (err) {
      setError('开始练习失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string | string[]) => {
    if (isFinished) return;
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const toggleShowAnswer = (questionId: string) => {
    setShowAnswer(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const toggleFavorite = async (questionId: string) => {
    const isFavorite = favorites.has(questionId);
    await questionBankService.toggleFavorite(questionId, !isFavorite);
    
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleFinish = async () => {
    try {
      const submitAnswers = questions.map(q => ({
        questionId: q._id,
        answer: answers[q._id] || (q.type === 'multiple' ? [] : ''),
        isFavorite: favorites.has(q._id)
      }));
      
      const res = await questionBankService.submitPractice(practiceId, submitAnswers);
      if (res.success) {
        setResult({
          score: res.data!.score,
          correctCount: res.data!.correctCount
        });
        setIsFinished(true);
      }
    } catch (err) {
      console.error('提交练习失败', err);
    }
  };

  const getAnsweredCount = () => {
    return questions.filter(q => {
      const answer = answers[q._id];
      if (Array.isArray(answer)) return answer.length > 0;
      return answer && answer !== '';
    }).length;
  };

  const isAnswerCorrect = (question: BankQuestion, userAnswer: string | string[] | undefined) => {
    if (!userAnswer) return false;
    if (Array.isArray(question.answer)) {
      return JSON.stringify((userAnswer as string[]).sort()) === JSON.stringify(question.answer.sort());
    }
    return userAnswer === question.answer;
  };

  if (loading) {
    return <Loading text="加载题目..." />;
  }

  if (error || !bank || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-500 mb-6">{error || '题库加载失败'}</p>
          <button
            onClick={() => navigate('/exam-center')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回考试中心
          </button>
        </div>
      </div>
    );
  }

  // 练习完成结果页
  if (isFinished && result) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => navigate('/exam-center')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                返回
              </button>
              <h1 className="text-lg font-semibold text-gray-900">练习完成</h1>
              <div className="w-20" />
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">练习完成！</h2>
            <p className="text-gray-500 mb-6">{bank.name}</p>
            
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-blue-600">{result.score}</p>
                <p className="text-xs text-gray-500 mt-1">得分</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-green-600">{result.correctCount}</p>
                <p className="text-xs text-gray-500 mt-1">答对</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-gray-900">{questions.length - result.correctCount}</p>
                <p className="text-xs text-gray-500 mt-1">答错</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/exam-center')}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              返回题库
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-5 h-5 inline mr-2" />
              再次练习
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion._id] || (currentQuestion.type === 'multiple' ? [] : '');
  const isShowAnswer = showAnswer[currentQuestion._id];
  const isCorrect = isFinished ? isAnswerCorrect(currentQuestion, currentAnswer) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/exam-center')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              退出
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{bank.name}</h1>
              <p className="text-xs text-gray-500">{currentIndex + 1} / {questions.length}</p>
            </div>
            <div className="text-sm text-gray-500">
              已答: <span className="font-medium text-blue-600">{getAnsweredCount()}</span>/{questions.length}
            </div>
          </div>
          
          {/* 进度条 */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* 题目内容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* 题目头部 */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {currentQuestion.difficulty === 'easy' && '简单'}
                {currentQuestion.difficulty === 'medium' && '中等'}
                {currentQuestion.difficulty === 'hard' && '困难'}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {currentQuestion.type === 'single' && '单选题'}
                {currentQuestion.type === 'multiple' && '多选题'}
                {currentQuestion.type === 'judge' && '判断题'}
                {currentQuestion.type === 'fill' && '填空题'}
                {currentQuestion.type === 'essay' && '问答题'}
              </span>
              {currentQuestion.knowledgePoint && (
                <span className="text-xs text-gray-500">知识点: {currentQuestion.knowledgePoint}</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleShowAnswer(currentQuestion._id)}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isShowAnswer
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isShowAnswer ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {isShowAnswer ? '隐藏答案' : '看答案'}
              </button>
              <button
                onClick={() => toggleFavorite(currentQuestion._id)}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  favorites.has(currentQuestion._id)
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Heart className={`w-4 h-4 mr-1 ${favorites.has(currentQuestion._id) ? 'fill-current' : ''}`} />
                {favorites.has(currentQuestion._id) ? '已收藏' : '收藏'}
              </button>
            </div>
          </div>

          {/* 题目 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
              {currentIndex + 1}. {currentQuestion.question}
            </h3>
          </div>

          {/* 选项 */}
          <div className="space-y-3">
            {currentQuestion.type === 'single' && currentQuestion.options?.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = currentAnswer === letter;
              
              return (
                <label
                  key={idx}
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={letter}
                    checked={isSelected}
                    onChange={() => handleAnswer(currentQuestion._id, letter)}
                    className="sr-only"
                  />
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {letter}
                  </span>
                  <span className="flex-1">{option}</span>
                  {isSelected && <CheckCircle className="w-5 h-5 text-blue-500" />}
                </label>
              );
            })}

            {currentQuestion.type === 'multiple' && currentQuestion.options?.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = (currentAnswer as string[]).includes(letter);
              
              return (
                <label
                  key={idx}
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={letter}
                    checked={isSelected}
                    onChange={(e) => {
                      const newAnswers = [...(currentAnswer as string[])];
                      if (e.target.checked) {
                        newAnswers.push(letter);
                      } else {
                        const index = newAnswers.indexOf(letter);
                        if (index > -1) newAnswers.splice(index, 1);
                      }
                      handleAnswer(currentQuestion._id, newAnswers);
                    }}
                    className="sr-only"
                  />
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mr-4 ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {letter}
                  </span>
                  <span className="flex-1">{option}</span>
                  {isSelected && <CheckCircle className="w-5 h-5 text-blue-500" />}
                </label>
              );
            })}

            {currentQuestion.type === 'judge' && (
              <>
                <label
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    currentAnswer === 'true'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value="true"
                    checked={currentAnswer === 'true'}
                    onChange={() => handleAnswer(currentQuestion._id, 'true')}
                    className="sr-only"
                  />
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 ${
                    currentAnswer === 'true' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    ✓
                  </span>
                  <span className="flex-1">正确</span>
                </label>
                <label
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    currentAnswer === 'false'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value="false"
                    checked={currentAnswer === 'false'}
                    onChange={() => handleAnswer(currentQuestion._id, 'false')}
                    className="sr-only"
                  />
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 ${
                    currentAnswer === 'false' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    ✗
                  </span>
                  <span className="flex-1">错误</span>
                </label>
              </>
            )}
          </div>

          {/* 答案解析 */}
          {isShowAnswer && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <h4 className="font-medium text-purple-900 mb-2">答案解析</h4>
              <p className="text-purple-800 mb-2">
                正确答案: {' '}
                <span className="font-bold">
                  {Array.isArray(currentQuestion.answer) 
                    ? currentQuestion.answer.join(', ')
                    : currentQuestion.answer
                  }
                </span>
              </p>
              {currentQuestion.explanation && (
                <p className="text-purple-700 text-sm">{currentQuestion.explanation}</p>
              )}
            </div>
          )}

          {/* 导航按钮 */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              上一题
            </button>
            
            {currentIndex === questions.length - 1 ? (
              <button
                onClick={handleFinish}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                完成练习
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                下一题
                <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            )}
          </div>
        </div>

        {/* 题号导航 */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => {
              const answer = answers[q._id];
              const hasAnswer = Array.isArray(answer) ? answer.length > 0 : answer && answer !== '';
              const isCurrent = idx === currentIndex;
              
              return (
                <button
                  key={q._id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : hasAnswer
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
