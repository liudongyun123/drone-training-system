// ============================================================================
// QuestionForm.tsx - 题目新增/编辑弹窗
// ============================================================================
import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { BankQuestion } from '@/types';

export interface QuestionFormData {
  type: 'single' | 'multiple' | 'judge' | 'fill' | 'essay';
  content: string;
  options: string[];
  answer: string | string[];
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  explanation: string;
}

interface QuestionFormProps {
  question: BankQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: QuestionFormData) => Promise<void>;
}

const TYPE_OPTIONS: { key: QuestionFormData['type']; label: string }[] = [
  { key: 'single', label: '单选题' },
  { key: 'multiple', label: '多选题' },
  { key: 'judge', label: '判断题' },
  { key: 'fill', label: '填空题' },
  { key: 'essay', label: '问答题' },
];

const DIFFICULTY_OPTIONS: { key: QuestionFormData['difficulty']; label: string }[] = [
  { key: 'easy', label: '简单' },
  { key: 'medium', label: '中等' },
  { key: 'hard', label: '困难' },
];

const EMPTY: QuestionFormData = {
  type: 'single',
  content: '',
  options: ['', '', '', ''],
  answer: '',
  difficulty: 'medium',
  score: 1,
  explanation: '',
};

export default function QuestionForm({ question, isOpen, onClose, onSave }: QuestionFormProps) {
  const [form, setForm] = useState<QuestionFormData>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (question) {
      const type = (question.type as QuestionFormData['type']) || 'single';
      setForm({
        type: type === 'judge' ? 'judge' : type,
        content: question.question || question.content || '',
        options: type === 'judge'
          ? ['正确', '错误']
          : (question.options && question.options.length ? [...question.options] : ['', '', '', '']),
        answer: question.answer ?? (type === 'multiple' ? [] : ''),
        difficulty: (question.difficulty as QuestionFormData['difficulty']) || 'medium',
        score: question.score || question.points || 1,
        explanation: question.explanation || question.analysis || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [question, isOpen]);

  if (!isOpen) return null;

  const isChoice = form.type === 'single' || form.type === 'multiple';
  const isJudge = form.type === 'judge';

  const setType = (type: QuestionFormData['type']) => {
    if (type === 'judge') {
      setForm({ ...form, type, options: ['正确', '错误'], answer: '' });
    } else if (type === 'single' || type === 'multiple') {
      const opts = form.options.length >= 2 && !isJudge ? form.options : ['', '', '', ''];
      setForm({ ...form, type, options: opts, answer: type === 'multiple' ? [] : '' });
    } else {
      setForm({ ...form, type, options: [], answer: '' });
    }
  };

  const updateOption = (idx: number, value: string) => {
    const options = [...form.options];
    options[idx] = value;
    setForm({ ...form, options });
  };

  const addOption = () => setForm({ ...form, options: [...form.options, ''] });
  const removeOption = (idx: number) => {
    const options = form.options.filter((_, i) => i !== idx);
    setForm({ ...form, options });
  };

  const toggleMultiAnswer = (letter: string) => {
    const arr = Array.isArray(form.answer) ? [...form.answer] : [];
    const next = arr.includes(letter) ? arr.filter(a => a !== letter) : [...arr, letter];
    setForm({ ...form, answer: next });
  };

  const handleSubmit = async () => {
    if (!form.content.trim()) { alert('请输入题目内容'); return; }
    if (isChoice || isJudge) {
      const validOptions = form.options.filter(o => o.trim());
      if (validOptions.length < 2) { alert('请至少填写 2 个选项'); return; }
    }
    const hasAnswer = Array.isArray(form.answer) ? form.answer.length > 0 : String(form.answer).trim() !== '';
    if (!hasAnswer) { alert('请设置正确答案'); return; }

    try {
      setSaving(true);
      await onSave({
        ...form,
        options: (isChoice || isJudge) ? form.options.filter(o => o.trim()) : [],
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const letters = form.options.map((_, i) => String.fromCharCode(65 + i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-800">{question ? '编辑题目' : '新增题目'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* 题型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">题型</label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map(t => (
                <button key={t.key} onClick={() => setType(t.key)}
                  className={`px-4 py-2 rounded-lg text-sm border-2 transition-colors ${
                    form.type === t.key ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 题目内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">题目内容</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
              rows={3} placeholder="请输入题目内容..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" />
          </div>

          {/* 选项 + 答案（单选/多选/判断） */}
          {(isChoice || isJudge) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选项与答案 {form.type === 'multiple' ? '（勾选多个正确项）' : '（勾选唯一正确项）'}
              </label>
              <div className="space-y-2">
                {form.options.map((opt, idx) => {
                  const letter = letters[idx];
                  const checked = form.type === 'multiple'
                    ? Array.isArray(form.answer) && form.answer.includes(letter)
                    : form.answer === letter;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type={form.type === 'multiple' ? 'checkbox' : 'radio'}
                        checked={checked}
                        onChange={() => form.type === 'multiple' ? toggleMultiAnswer(letter) : setForm({ ...form, answer: letter })}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="w-6 text-sm font-medium text-gray-500">{letter}.</span>
                      <input type="text" value={opt} onChange={e => updateOption(idx, e.target.value)}
                        disabled={isJudge} placeholder={`选项 ${letter}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-50" />
                      {isChoice && form.options.length > 2 && (
                        <button onClick={() => removeOption(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
              {isChoice && (
                <button onClick={addOption} className="mt-2 flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700">
                  <Plus size={16} />添加选项
                </button>
              )}
            </div>
          )}

          {/* 答案（填空/问答） */}
          {(form.type === 'fill' || form.type === 'essay') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {form.type === 'fill' ? '正确答案（多个用 | 分隔）' : '参考答案'}
              </label>
              <textarea value={Array.isArray(form.answer) ? form.answer.join('|') : form.answer}
                onChange={e => setForm({ ...form, answer: e.target.value })}
                rows={2} placeholder="请输入答案..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
          )}

          {/* 难度 + 分值 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">难度</label>
              <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white">
                {DIFFICULTY_OPTIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分值</label>
              <input type="number" min={1} value={form.score}
                onChange={e => setForm({ ...form, score: Number(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
          </div>

          {/* 解析 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">答案解析（可选）</label>
            <textarea value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })}
              rows={2} placeholder="请输入答案解析..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={saving}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50">取消</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
