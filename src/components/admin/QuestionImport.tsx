import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';

interface Question {
  type: 'single' | 'multiple' | 'judge' | 'fill';
  content: string;
  options?: string[];
  answer: string | number[];
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  explanation?: string;
  category?: string;
}

interface QuestionImportProps {
  onImport: (questions: Question[]) => void;
  onClose: () => void;
  isImporting?: boolean;
  importProgress?: { current: number; total: number; success: number; failed: number };
}

export default function QuestionImport({ onImport, onClose, isImporting = false, importProgress }: QuestionImportProps) {
  const [importMethod, setImportMethod] = useState<'json' | 'excel' | 'text'>('json');
  const [importText, setImportText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const parseJSONImport = (text: string): { questions: Question[]; errors: string[] } => {
    const questions: Question[] = [];
    const errors: string[] = [];

    try {
      const data = JSON.parse(text);
      const questionsArray = Array.isArray(data) ? data : data.questions || [];

      questionsArray.forEach((q: any, index: number) => {
        try {
          const question: Question = {
            type: q.type || 'single',
            content: q.content || q.question || '',
            options: q.options,
            answer: q.answer,
            difficulty: q.difficulty || 'medium',
            score: q.score || 1,
            explanation: q.explanation || q.analysis || '',
            category: q.category || '',
          };
          questions.push(question);
        } catch (e) {
          errors.push(`第 ${index + 1} 题解析失败`);
        }
      });
    } catch (e) {
      errors.push('JSON格式错误');
    }

    return { questions, errors };
  };

  const parseTextImport = (text: string): { questions: Question[]; errors: string[] } => {
    const questions: Question[] = [];
    const errors: string[] = [];
    const blocks = text.split(/\n\s*\n+/).filter(b => b.trim());

    blocks.forEach((block, index) => {
      try {
        const lines = block.trim().split('\n');
        let content = '';
        let type: Question['type'] = 'single';
        const options: string[] = [];
        let answer: any = '';
        let difficulty: Question['difficulty'] = 'medium';

        lines.forEach((line, i) => {
          const trimmed = line.trim();
          
          // 题目类型标记
          if (trimmed.match(/^\[(单选|多选|判断|填空)\]/)) {
            const typeMap: Record<string, Question['type']> = {
              '单选': 'single',
              '多选': 'multiple',
              '判断': 'judge',
              '填空': 'fill',
            };
            type = typeMap[trimmed.match(/\[(单选|多选|判断|填空)\]/)![1]];
            content = trimmed.replace(/^\[.*?\]\s*/, '');
          }
          // 难度标记
          else if (trimmed.match(/^\[难度:(简单|中等|困难)\]/)) {
            const diffMap: Record<string, Question['difficulty']> = {
              '简单': 'easy',
              '中等': 'medium',
              '困难': 'hard',
            };
            difficulty = diffMap[trimmed.match(/\[难度:(简单|中等|困难)\]/)![1]];
          }
          // 选项
          else if (trimmed.match(/^[A-D][.、]/)) {
            options.push(trimmed.replace(/^[A-D][.、]\s*/, ''));
          }
          // 答案
          else if (trimmed.match(/^答案[:：]/)) {
            const answerText = trimmed.replace(/^答案[:：]\s*/, '');
            if (type === 'single' || type === 'judge') {
              if (type === 'judge') {
                answer = answerText.includes('正确') || answerText === '√' || answerText === '✓' ? 0 : 1;
              } else {
                const answerMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
                answer = answerMap[answerText.toUpperCase()] ?? 0;
              }
            } else if (type === 'multiple') {
              answer = answerText.toUpperCase().split('').map((c: string) => {
                const answerMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
                return answerMap[c] ?? 0;
              });
            } else {
              answer = answerText;
            }
          }
          // 默认为题目内容
          else if (!content && i === 0) {
            content = trimmed;
          }
        });

        if (content) {
          questions.push({
            type,
            content,
            options: (type === 'single' || type === 'multiple') ? options : undefined,
            answer,
            difficulty,
            score: 1,
          });
        }
      } catch (e) {
        errors.push(`第 ${index + 1} 题解析失败`);
      }
    });

    return { questions, errors };
  };

  const handleParse = () => {
    if (!importText.trim()) {
      setParsedQuestions([]);
      setImportErrors(['请输入导入内容']);
      return;
    }

    let result: { questions: Question[]; errors: string[] };

    if (importMethod === 'json') {
      result = parseJSONImport(importText);
    } else {
      result = parseTextImport(importText);
    }

    setParsedQuestions(result.questions);
    setImportErrors(result.errors);
  };

  const handleImport = () => {
    if (parsedQuestions.length === 0) {
      alert('没有有效的题目可以导入');
      return;
    }
    onImport(parsedQuestions);
  };

  const downloadTemplate = () => {
    const template = {
      questions: [
        {
          type: 'single',
          content: '无人机飞行前需要检查哪些项目？',
          options: ['电池电量', '螺旋桨安装', 'GPS信号', '以上都是'],
          answer: 3,
          difficulty: 'easy',
          score: 1,
          explanation: '飞行前需要检查所有关键项目',
          category: '基础理论'
        },
        {
          type: 'multiple',
          content: '以下哪些是无人机的组成部分？',
          options: ['飞控系统', '动力系统', '通信系统', '导航系统'],
          answer: [0, 1, 2, 3],
          difficulty: 'medium',
          score: 2,
          explanation: '无人机包含多个重要系统'
        },
        {
          type: 'judge',
          content: '无人机可以在任何天气条件下飞行。',
          answer: 1,
          difficulty: 'easy',
          score: 1,
          explanation: '恶劣天气会影响飞行安全'
        },
        {
          type: 'fill',
          content: '无人机的最大飞行高度一般不得超过____米。',
          answer: '120',
          difficulty: 'medium',
          score: 2,
          explanation: '根据法规规定'
        }
      ]
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTextTemplate = () => {
    const template = `[单选] 无人机飞行前需要检查哪些项目？
A. 电池电量
B. 螺旋桨安装
C. GPS信号
D. 以上都是
[难度:简单]
答案: D

[多选] 以下哪些是无人机的组成部分？
A. 飞控系统
B. 动力系统
C. 通信系统
D. 导航系统
[难度:中等]
答案: A,B,C,D

[判断] 无人机可以在任何天气条件下飞行。
[难度:简单]
答案: 错误

[填空] 无人机的最大飞行高度一般不得超过____米。
[难度:中等]
答案: 120`;

    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-template.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600">
          <h2 className="text-xl font-bold text-white">批量导入题目</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 导入方式选择 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">选择导入方式</h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setImportMethod('json')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  importMethod === 'json'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <FileText className="w-8 h-8 mb-2 text-blue-500" />
                <div className="font-medium">JSON 格式</div>
                <div className="text-sm text-gray-600 mt-1">结构化数据导入</div>
              </button>
              <button
                onClick={() => setImportMethod('excel')}
                className="p-4 border-2 border-gray-200 rounded-lg text-left opacity-50 cursor-not-allowed"
              >
                <FileText className="w-8 h-8 mb-2 text-gray-400" />
                <div className="font-medium">Excel 格式</div>
                <div className="text-sm text-gray-600 mt-1">即将推出</div>
              </button>
              <button
                onClick={() => setImportMethod('text')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  importMethod === 'text'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <FileText className="w-8 h-8 mb-2 text-blue-500" />
                <div className="font-medium">文本格式</div>
                <div className="text-sm text-gray-600 mt-1">简洁易写</div>
              </button>
            </div>
          </div>

          {/* 下载模板 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">下载导入模板</h4>
                <p className="text-sm text-blue-700 mt-1">
                  参考模板格式编写题目，确保正确导入
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                >
                  <Download size={16} />
                  JSON模板
                </button>
                <button
                  onClick={downloadTextTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
                >
                  <Download size={16} />
                  文本模板
                </button>
              </div>
            </div>
          </div>

          {/* 输入区 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {importMethod === 'json' ? '粘贴 JSON 数据' : '粘贴文本内容'}
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={importMethod === 'json' 
                ? `{\n  "questions": [\n    {\n      "type": "single",\n      "content": "题目内容",\n      "options": ["A", "B", "C", "D"],\n      "answer": 0,\n      "difficulty": "easy",\n      "score": 1\n    }\n  ]\n}`
                : `[单选] 题目内容
A. 选项A
B. 选项B
C. 选项C
D. 选项D
答案: A

[判断] 判断题内容
答案: 正确`
              }
              className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* 解析按钮 */}
          <button
            onClick={handleParse}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={20} />
            解析题目
          </button>

          {/* 解析结果 */}
          {parsedQuestions.length > 0 || importErrors.length > 0 ? (
            <div className="mt-6 space-y-4">
              {/* 成功统计 */}
              {parsedQuestions.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">
                      成功解析 {parsedQuestions.length} 道题目
                    </span>
                  </div>
                </div>
              )}

              {/* 错误列表 */}
              {importErrors.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 text-red-800 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">
                      解析失败 ({importErrors.length} 个错误)
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {importErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 题目预览 */}
              {parsedQuestions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    题目预览 (显示前5道)
                  </h4>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {parsedQuestions.slice(0, 5).map((q, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                        <div className="text-sm text-gray-500 mb-1">
                          题目 {index + 1} · {q.type === 'single' ? '单选' : q.type === 'multiple' ? '多选' : q.type === 'judge' ? '判断' : '填空'} · {q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难'}
                        </div>
                        <p className="text-gray-900 font-medium mb-2">{q.content}</p>
                        {q.options && (
                          <div className="text-sm text-gray-600 space-y-1">
                            {q.options.map((opt, i) => (
                              <div key={i}>{String.fromCharCode(65 + i)}. {opt}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          {isImporting ? (
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    导入进度: {importProgress?.current || 0} / {importProgress?.total || 0}
                  </span>
                  <span className="text-sm text-green-600 font-medium">
                    ✓ {importProgress?.success || 0}
                  </span>
                  <span className="text-sm text-red-600 font-medium">
                    ✗ {importProgress?.failed || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${importProgress ? (importProgress.current / importProgress.total) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {importProgress ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%
              </span>
            </div>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={parsedQuestions.length === 0}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload size={18} />
                确认导入 ({parsedQuestions.length} 题)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
