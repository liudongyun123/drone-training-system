// ============================================================================
// 管理后台 - 考试和题库管理(整合版)
// 功能：试卷管理(从题库抽题)、题库管理、题目管理
// ============================================================================
import { useState } from 'react';
import { FileText, Database, BookOpen } from 'lucide-react';
import { useConfirm } from '@/admin/hooks/useConfirm';
import { useExamList, useBankList, useQuestionList, useImportState, useModalState } from './hooks/useExams';
import type { Exam, QuestionBank, BankQuestion } from '@/types';

import ExamList from './components/ExamList';
import ExamForm, { type ExamFormData } from './components/ExamForm';
import QuestionBankList, { type BankFormData } from './components/QuestionBankList';
import QuestionList from './components/QuestionList';

type TabKey = 'exams' | 'questionBanks' | 'questions';

const TABS: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: 'exams', label: '试卷管理', icon: FileText },
  { key: 'questionBanks', label: '题库管理', icon: Database },
  { key: 'questions', label: '题目管理', icon: BookOpen },
];

export default function AdminExamsUnited() {
  const [activeTab, setActiveTab] = useState<TabKey>('exams');
  const { confirm, ConfirmDialog } = useConfirm();

  // ==================== 试卷管理 ====================
  const examList = useExamList();
  const examModal = useModalState<Exam>();

  const handleExamSave = async (data: ExamFormData) => {
    try {
      await examList.save(data, examModal.editing);
      examModal.close();
      await examList.load();
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : '操作失败，请重试';
      await confirm({ title: '操作失败', message: msg, variant: 'warning' });
    }
  };

  const handleExamDelete = async (exam: Exam) => {
    try {
      await examList.remove(exam);
      await examList.load();
    } catch (error) {
      console.error('删除试卷失败:', error);
      await confirm({ title: '删除失败', message: '删除失败，请重试', variant: 'warning' });
    }
  };

  // ==================== 题库管理 ====================
  const bankList = useBankList();

  const handleBankSave = async (data: BankFormData, editingBank: QuestionBank | null) => {
    try {
      await bankList.save(data, editingBank);
      await bankList.load();
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : '操作失败，请重试';
      await confirm({ title: '操作失败', message: msg, variant: 'warning' });
    }
  };

  const handleBankDelete = async (bank: QuestionBank) => {
    try {
      await bankList.remove(bank);
      await bankList.load();
    } catch (error) {
      console.error('删除题库失败:', error);
      await confirm({ title: '删除失败', message: '删除失败，请重试', variant: 'warning' });
    }
  };

  // ==================== 题目管理 ====================
  const [selectedBank, setSelectedBank] = useState('');
  const questionList = useQuestionList(selectedBank);
  const importState = useImportState();
  const questionModal = useModalState<BankQuestion>();

  const handleQuestionDelete = async (question: BankQuestion) => {
    try {
      await questionList.remove(question);
      await questionList.load();
    } catch (error) {
      console.error('删除题目失败:', error);
      await confirm({ title: '删除失败', message: '删除失败，请重试', variant: 'warning' });
    }
  };

  const handleImportQuestions = async (questionsData: any[]) => {
    try {
      importState.setImporting(true);
      const result = await questionList.importQuestions(questionsData, importState.setProgress);

      if (result.failedCount === 0) {
        await confirm({ title: '导入成功', message: `🎉 成功导入 ${result.successCount} 道题目！`, variant: 'info' });
      } else if (result.successCount === 0) {
        await confirm({ title: '导入失败', message: `❌ ${result.failedCount} 道题目全部导入失败。\n\n${result.errors.slice(0, 3).join('\n')}`, variant: 'warning' });
      } else {
        await confirm({ title: '导入完成', message: `成功 ${result.successCount}，失败 ${result.failedCount}\n\n${result.errors.slice(0, 3).join('\n')}`, variant: 'warning' });
      }
    } catch (error: any) {
      await confirm({ title: '导入错误', message: `❌ ${error.message || '未知错误'}`, variant: 'warning' });
    } finally {
      importState.setImporting(false);
      await questionList.load();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 面包屑 */}
        <nav className="text-sm text-gray-500 mb-6">
          <ol className="flex items-center gap-2">
            <li><a href="/admin" className="hover:text-blue-600 transition-colors">管理后台</a></li>
            <li>/</li>
            <li className="text-gray-800 font-medium">考试和题库管理</li>
          </ol>
        </nav>

        {/* 标题区域 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">考试和题库管理</h1>
          <p className="text-gray-500">管理试卷、从题库抽选题目、题库维护</p>
        </div>

        {/* 标签页 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
          <div className="border-b">
            <div className="flex">
              {TABS.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                    activeTab === tab.key
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}>
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        {activeTab === 'exams' && (
          <ExamList
            exams={examList.exams} loading={examList.loading} total={examList.total}
            page={examList.page} keyword={examList.keyword} statusFilter={examList.statusFilter}
            onPageChange={examList.setPage} onKeywordChange={examList.setKeyword}
            onStatusFilterChange={examList.setStatusFilter}
            onCreate={() => examModal.open()} onEdit={examModal.open}
            onDelete={handleExamDelete}
          />
        )}

        {activeTab === 'questionBanks' && (
          <QuestionBankList
            banks={bankList.banks} loading={bankList.loading} total={bankList.total}
            page={bankList.page} keyword={bankList.keyword}
            onPageChange={bankList.setPage} onKeywordChange={bankList.setKeyword}
            onRefresh={bankList.load}
            onSave={handleBankSave}
            onDelete={handleBankDelete}
          />
        )}

        {activeTab === 'questions' && (
          <QuestionList
            questions={questionList.questions} loading={questionList.loading}
            total={questionList.total} page={questionList.page}
            selectedBank={selectedBank} keyword={questionList.keyword}
            difficultyFilter={questionList.difficultyFilter} banks={bankList.banks}
            onPageChange={questionList.setPage}
            onSelectedBankChange={setSelectedBank}
            onKeywordChange={questionList.setKeyword}
            onDifficultyFilterChange={questionList.setDifficultyFilter}
            onEdit={questionModal.open} onDelete={handleQuestionDelete}
            onImport={handleImportQuestions}
            importing={importState.importing} importProgress={importState.progress}
          />
        )}

        {/* 弹窗 */}
        <ExamForm
          exam={examModal.editing} isOpen={examModal.isOpen}
          onClose={examModal.close} onSave={handleExamSave}
        />

        {/* 全局确认弹窗 */}
        <ConfirmDialog />
      </div>
    </div>
  );
}
