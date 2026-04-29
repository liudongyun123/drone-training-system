/**
 * 题库列表页面 - 前台用户选择题库练习
 * 所有登录用户都可以查看题库列表
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Clock, HelpCircle, ChevronRight, 
  Award, BarChart3, Play, Search, Filter,
  Lock, Crown, ShoppingCart, Unlock
} from 'lucide-react';
import Loading from '@/components/Loading';
import { CloudPracticeService } from '@/services/CloudPracticeService';
import { getQuestionBankCategories } from '@/services/dictionaryService';
import type { OptionItem } from '@/services/dictionaryService';
import { useAuthStore } from '@/store/authStore';

interface QuestionBank {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  description: string;
  category: string;
  questionCount: number;
  level: 'easy' | 'medium' | 'hard';
  tags?: string[];
  courseIds?: string[];
  courseTitles?: string[];
}

// 获取题库唯一标识
const getBankId = (bank: QuestionBank): string => {
  return bank._id || bank.id || '';
};

// 获取题库显示名称
const getBankTitle = (bank: QuestionBank): string => {
  return bank.title || bank.name || '未命名题库';
};

export default function QuestionBankList() {
  const navigate = useNavigate();
  const [allBanks, setAllBanks] = useState<QuestionBank[]>([]);
  const [ownedBanks, setOwnedBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  
  // 分类列表（从数据库读取，初始化时使用默认值）
  const [categories, setCategories] = useState<OptionItem[]>([
    { value: '', label: '全部' },
    { value: '理论', label: '理论' },
    { value: '法规', label: '法规' },
    { value: '实操', label: '实操' },
    { value: '安全', label: '安全' },
    { value: '考证', label: '考证' },
  ]);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 加载分类和题库数据
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        // 并行加载分类配置和题库数据
        const [categoryOptions, banks] = await Promise.all([
          getQuestionBankCategories(),
          CloudPracticeService.getAllBanks(),
        ]);

        // 更新分类列表
        if (categoryOptions && categoryOptions.length > 0) {
          setCategories(categoryOptions);
        }

        console.log('[QuestionBankList] 获取到所有题库:', banks.length, '个');
        setAllBanks(banks);
        
        // 如果已登录，获取可访问的题库
        if (isAuthenticated) {
          const accessibleBanks = await CloudPracticeService.getAccessibleBanks();
          console.log('[QuestionBankList] 用户可访问的题库:', accessibleBanks.length, '个');
          setOwnedBanks(accessibleBanks);
        }
      } catch (error) {
        console.error('获取题库列表失败:', error);
        setAllBanks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, [isAuthenticated]);

  // 筛选题库
  const filteredBanks = allBanks.filter(bank => {
    const bankTitle = getBankTitle(bank);
    const matchesSearch = bankTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bank.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '全部' || selectedCategory === '' || bank.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 检查用户是否拥有某个题库
  const hasBankAccess = (bankId: string) => {
    return ownedBanks.some(b => getBankId(b) === bankId);
  };

  // 获取难度颜色
  const getDifficultyColor = (level: any) => {
    const levelStr = typeof level === 'string' ? level : String(level || '');
    switch (levelStr) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // 获取难度文字
  const getDifficultyText = (level: any) => {
    const levelStr = typeof level === 'string' ? level : String(level || '');
    switch (levelStr) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return '未知';
    }
  };

  // 安全渲染文本（确保不是对象）
  const safeRender = (value: any): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (value === null || value === undefined) return '';
    return String(value);
  };

  if (loading) {
    return <Loading />;
  }

  // 未登录状态 - 显示题库预览
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">题库练习</h2>
            <p className="text-gray-600 mb-6">
              登录并购买课程后即可解锁题库练习
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors mb-3"
            >
              去登录
            </button>
            <button
              onClick={() => navigate('/courses-list')}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              浏览课程
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 会员状态 - 显示题库列表
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BookOpen className="w-8 h-8 mr-3 text-blue-600" />
              题库练习
            </h1>
            {ownedBanks.length > 0 && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center">
                <Crown className="w-4 h-4 mr-1" />
                已解锁 {ownedBanks.length} 个
              </span>
            )}
          </div>
          <p className="text-gray-600">
            共 {allBanks.length} 个题库，{ownedBanks.length} 个已解锁
            {ownedBanks.length > 0 && (
              <span>（{ownedBanks.reduce((sum, b) => sum + (b.questionCount || 0), 0)} 道题目可用）</span>
            )}
          </p>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索题库名称..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            {/* 分类筛选 */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <div className="flex space-x-2">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.label)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === cat.label
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '总题库', value: allBanks.length, icon: BookOpen, color: 'blue' },
            { label: '已解锁', value: ownedBanks.length, icon: Unlock, color: 'green' },
            { label: '总题目数', value: allBanks.reduce((sum, b) => sum + (b.questionCount || 0), 0), icon: HelpCircle, color: 'purple' },
            { label: '解锁题目', value: ownedBanks.reduce((sum, b) => sum + (b.questionCount || 0), 0), icon: Award, color: 'orange' },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-4 flex items-center">
              <div className={`p-3 rounded-lg bg-${stat.color}-100 mr-4`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 题库列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBanks.map(bank => {
            const bankId = getBankId(bank);
            const bankTitle = getBankTitle(bank);
            const isOwned = hasBankAccess(bankId);
            
            return (
              <div 
                key={bankId}
                className={`rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border ${
                  isOwned ? 'border-gray-100' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="p-6">
                  {/* 头部 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-gray-900">{bankTitle}</h3>
                      {isOwned ? (
                        <span className="flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          <Unlock className="w-3 h-3 mr-1" />
                          已解锁
                        </span>
                      ) : (
                        <span className="flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          未解锁
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(bank.level)}`}>
                      {getDifficultyText(bank.level)}
                    </span>
                  </div>

                  {/* 描述 */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{safeRender(bank.description)}</p>

                  {/* 关联课程标签 */}
                  {Array.isArray(bank.courseTitles) && bank.courseTitles.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">包含课程：</p>
                      <div className="flex flex-wrap gap-1">
                        {bank.courseTitles.slice(0, 2).map((title: any, idx: number) => (
                          <span 
                            key={idx}
                            className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                          >
                            {safeRender(title)}
                          </span>
                        ))}
                        {bank.courseTitles.length > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            +{bank.courseTitles.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(Array.isArray(bank.tags) ? bank.tags : []).slice(0, 3).map((tag: any, idx: number) => (
                      <span 
                        key={`tag-${idx}`}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        {safeRender(tag)}
                      </span>
                    ))}
                  </div>

                  {/* 统计 */}
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <HelpCircle className="w-4 h-4 mr-1" />
                    <span>{bank.questionCount || 0} 题</span>
                    <span className="mx-2">•</span>
                    <Clock className="w-4 h-4 mr-1" />
                    <span>约 {Math.ceil((bank.questionCount || 0) * 1.5)} 分钟</span>
                  </div>

                  {/* 操作按钮 */}
                  {isOwned ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/practice/${bankId}?mode=sequential&count=20`)}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        顺序练习
                      </button>
                      <button
                        onClick={() => navigate(`/practice/${bankId}?mode=random&count=20`)}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        随机练习
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate('/courses-list')}
                      className="w-full flex items-center justify-center px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      购买课程解锁
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 空状态 */}
        {filteredBanks.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {allBanks.length === 0 ? '暂无题库数据' : '没有找到相关题库'}
            </h3>
            <p className="text-gray-500">
              {allBanks.length === 0 ? '管理员尚未创建题库，请耐心等待' : '请尝试其他搜索关键词或筛选条件'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
