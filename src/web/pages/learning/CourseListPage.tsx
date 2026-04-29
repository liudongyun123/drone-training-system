/**
 * 课程列表页
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, BookOpen, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { courseService } from '@/services/database';
import { categoryService } from '@/services/categoryService';
import type { Course } from '@/types';
import { Loading, EmptyState, ErrorState, toast } from '@/components';

// 分类选项类型
interface CategoryOption {
  value: string;
  label: string;
}

const levels = [
  { value: '', label: '全部等级' },
  { value: '初级工', label: '初级工' },
  { value: '中级工', label: '中级工' },
  { value: '高级工', label: '高级工' },
  { value: '技师', label: '技师' },
  { value: '高级技师', label: '高级技师' },
];

const sortOptions = [
  { value: 'newest', label: '最新发布' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
  { value: 'popular', label: '最受欢迎' },
];

export default function CourseListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  // 分类数据（从数据库加载）
  const [categories, setCategories] = useState<CategoryOption[]>([
    { value: '', label: '全部分类' }
  ]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // 筛选状态
  const [searchKeyword, setSearchKeyword] = useState(searchParams.get('keyword') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [level, setLevel] = useState(searchParams.get('level') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [showFilters, setShowFilters] = useState(false);

  const pageSize = 12;

  // 加载分类数据
  useEffect(() => {
    loadCategories();
  }, []);

  // 加载课程数据
  useEffect(() => {
    loadCourses();
  }, [page, category, level, sortBy]);

  // 从数据库加载分类
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const result = await categoryService.getAllActive();
      if (result.success && result.data.length > 0) {
        // 转换分类数据格式：使用 name 作为 value（因为课程 category 存储的是中文名称）
        const categoryOptions = result.data.map(cat => ({
          value: cat.name,  // 使用 name 而不是 code
          label: cat.name
        }));
        setCategories([
          { value: '', label: '全部分类' },
          ...categoryOptions
        ]);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[CourseListPage] 加载课程, 参数:', { page, pageSize, searchKeyword, category, level, sortBy });
      const result = await courseService.getList({
        page,
        pageSize,
        ...(searchKeyword && { title: searchKeyword }),
        ...(category && { category }),
        ...(level && { level }),
        status: 'published',
      });
      console.log('[CourseListPage] 课程查询结果:', result);
      setCourses(result.list);
      setTotal(result.total);
    } catch (err) {
      console.error('加载课程失败:', err);
      setError('加载课程失败，请稍后重试');
      toast.error('加载课程失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateSearchParams({ keyword: searchKeyword, page: '1' });
    loadCourses();
  };

  const updateSearchParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
    updateSearchParams({ category: value, page: '1' });
  };

  const handleLevelChange = (value: string) => {
    setLevel(value);
    setPage(1);
    updateSearchParams({ level: value, page: '1' });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    updateSearchParams({ sort: value });
  };

  const clearFilters = () => {
    setSearchKeyword('');
    setCategory('');
    setLevel('');
    setPage(1);
    setSearchParams(new URLSearchParams());
    loadCourses();
  };

  const hasActiveFilters = searchKeyword || category || level;

  const levelBadgeColor: Record<string, string> = {
    'beginner': 'badge-success',
    '入门': 'badge-success',
    'intermediate': 'badge-warning',
    '进阶': 'badge-warning',
    'advanced': 'badge-error',
    '高级': 'badge-error'
  };

  const levelText: Record<string, string> = {
    'beginner': '入门',
    '入门': '入门',
    'intermediate': '进阶',
    '进阶': '进阶',
    'advanced': '高级',
    '高级': '高级'
  };

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="container mx-auto px-4">
          <ErrorState 
            title="加载失败"
            message={error}
            onRetry={loadCourses}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">全部课程</h1>
          <p className="text-gray-600">探索专业的无人机培训课程，开启您的飞行之旅</p>
        </div>

        {/* 搜索和筛选 */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 搜索框 */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="搜索课程..."
                    className="input input-bordered w-full"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                  <button type="submit" className="btn btn-square btn-primary">
                    <Search size={20} />
                  </button>
                </div>
              </form>

              {/* 筛选按钮（移动端） */}
              <button 
                className="btn btn-outline md:hidden"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={20} />
                筛选
              </button>

              {/* 分类选择（桌面端） */}
              <div className="hidden md:flex gap-2">
                <select
                  className="select select-bordered"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <select
                  className="select select-bordered"
                  value={level}
                  onChange={(e) => handleLevelChange(e.target.value)}
                >
                  {levels.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
                <select
                  className="select select-bordered"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 移动端筛选 */}
            {showFilters && (
              <div className="md:hidden mt-4 space-y-3">
                <select
                  className="select select-bordered w-full"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <select
                  className="select select-bordered w-full"
                  value={level}
                  onChange={(e) => handleLevelChange(e.target.value)}
                >
                  {levels.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 已选筛选条件 */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                <span className="text-sm text-gray-500">已选筛选：</span>
                {searchKeyword && (
                  <span className="badge badge-primary gap-1">
                    搜索: {searchKeyword}
                    <button onClick={() => { setSearchKeyword(''); handleSearch({ preventDefault: () => {} } as any); }}>
                      <X size={14} />
                    </button>
                  </span>
                )}
                {category && (
                  <span className="badge badge-primary gap-1">
                    {categories.find(c => c.value === category)?.label}
                    <button onClick={() => handleCategoryChange('')}>
                      <X size={14} />
                    </button>
                  </span>
                )}
                {level && (
                  <span className="badge badge-primary gap-1">
                    {levels.find(l => l.value === level)?.label}
                    <button onClick={() => handleLevelChange('')}>
                      <X size={14} />
                    </button>
                  </span>
                )}
                <button 
                  className="btn btn-ghost btn-xs"
                  onClick={clearFilters}
                >
                  清除全部
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 课程列表 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            type="search"
            title="暂无课程"
            description={hasActiveFilters ? '尝试调整筛选条件' : '敬请期待更多课程'}
            action={hasActiveFilters && (
              <button className="btn btn-primary" onClick={clearFilters}>
                清除筛选
              </button>
            )}
          />
        ) : (
          <>
            {/* 结果统计 */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">共 {total} 门课程</span>
            </div>

            {/* 课程网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {courses.map((course) => (
                <Link 
                  key={course._id} 
                  to={`/courses/${course._id}`} 
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer overflow-hidden group"
                >
                  <figure className="aspect-video relative overflow-hidden">
                    <img 
                      src={course.coverImage || 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400'} 
                      alt={course.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`badge ${levelBadgeColor[course.level]}`}>
                        {levelText[course.level]}
                      </span>
                    </div>
                  </figure>
                  <div className="card-body p-4">
                    <h2 className="card-title text-base line-clamp-2 mb-2">{course.title}</h2>
                    <p className="text-sm opacity-70 line-clamp-2 mb-3">{course.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-lg font-bold text-primary">¥{course.price}</span>
                      {course.originalPrice && course.originalPrice > course.price && (
                        <span className="text-sm text-gray-400 line-through">¥{course.originalPrice}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                      <span>{course.lessons} 课时</span>
                      <span>{course.duration} 小时</span>
                      <span className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        {(course.rating || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 分页 */}
            {total > pageSize && (
              <div className="flex justify-center items-center gap-2">
                <button
                  className="btn btn-sm"
                  disabled={page === 1}
                  onClick={() => {
                    const newPage = page - 1;
                    setPage(newPage);
                    updateSearchParams({ page: newPage.toString() });
                  }}
                >
                  <ChevronLeft size={16} />
                  上一页
                </button>
                <span className="px-4 py-2 bg-base-100 rounded-lg">
                  第 {page} / {Math.ceil(total / pageSize)} 页
                </span>
                <button
                  className="btn btn-sm"
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => {
                    const newPage = page + 1;
                    setPage(newPage);
                    updateSearchParams({ page: newPage.toString() });
                  }}
                >
                  下一页
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
