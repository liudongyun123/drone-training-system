import React, { useState } from 'react';
import { Plus, Edit, Trash2, X, Check, Upload } from 'lucide-react';

interface QuestionManagementProps {
  bankId: string;
  bankName: string;
  onAddQuestion: (question: any) => void;
  onUpdateQuestion: (question: any) => void;
  onClose: () => void;
}

export default function QuestionManagement({ bankId, bankName, onAddQuestion, onUpdateQuestion, onClose }: QuestionManagementProps) {
  const [formData, setFormData] = useState({
    type: 'single' as 'single' | 'multiple' | 'judge' | 'fill',
    question: '',
    options: ['', '', '', ''],
    answer: '0',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    score: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    if (!formData.question.trim()) {
      alert('请输入题目内容');
      return;
    }
    
    if (formData.type === 'single' || formData.type === 'multiple') {
      if (!formData.options[0].trim() || !formData.options[1].trim()) {
        alert('请至少填写2个选项');
        return;
      }
    }
    
    onAddQuestion(formData);
    onClose();
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ''],
    });
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50">
          <h2 className="text-xl font-bold text-gray-800">添加题目到「{bankName}」</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 题目类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">题目类型 *</label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: 'single', label: '单选题' },
                  { value: 'multiple', label: '多选题' },
                  { value: 'judge', label: '判断题' },
                  { value: 'fill', label: '填空题' },
                ].map((type) => (
                  <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="questionType"
                      value={type.value}
                      checked={formData.type === type.value}
                      onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-4 h-4 text-purple-500"
                    />
                    <span className="text-sm text-gray-700">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 题目内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">题目内容 *</label>
              <textarea
                required
                value={formData.question}
                onChange={e => setFormData({ ...formData, question: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder="请输入题目内容..."
              />
            </div>

            {/* 选项（单选/多选） */}
            {(formData.type === 'single' || formData.type === 'multiple') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选项 *</label>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <span className="text-gray-500 w-6">{String.fromCharCode(65 + index)}.</span>
                      <input
                        type="text"
                        value={option}
                        onChange={e => {
                          const newOptions = [...formData.options];
                          newOptions[index] = e.target.value;
                          setFormData({ ...formData, options: newOptions });
                        }}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        placeholder={`选项${String.fromCharCode(65 + index)}`}
                      />
                      {formData.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-2 text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1"
                >
                  <Plus size={16} />
                  添加选项
                </button>
              </div>
            )}

            {/* 答案 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">正确答案 *</label>
              <input
                type="text"
                value={formData.answer}
                onChange={e => setFormData({ ...formData, answer: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder="单选题填写选项字母（如A），多选题用逗号分隔，判断题填0或1"
              />
            </div>

            {/* 难度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">难度</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'easy', label: '简单' },
                  { value: 'medium', label: '中等' },
                  { value: 'hard', label: '困难' },
                ].map((level) => (
                  <label key={level.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="difficulty"
                      value={level.value}
                      checked={formData.difficulty === level.value}
                      onChange={e => setFormData({ ...formData, difficulty: e.target.value as any })}
                      className="w-4 h-4 text-purple-500"
                    />
                    <span className="text-sm text-gray-700">{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 分值 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分值</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.score}
                onChange={e => setFormData({ ...formData, score: parseInt(e.target.value) || 1 })}
                className="w-32 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
        </form>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Check size={18} />
            添加题目
          </button>
        </div>
      </div>
    </div>
  );
}
