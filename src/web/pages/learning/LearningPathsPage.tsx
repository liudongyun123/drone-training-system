// ============================================================================
// 学习路径列表页 - 前台
// ============================================================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Map, 
  ChevronRight, 
  Clock, 
  BookOpen,
  Users,
  Star,
  ArrowLeft,
  Play,
  CheckCircle,
  Lock,
  X,
  Grid,
  List
} from 'lucide-react';
import { Button, Card, Loading } from '@/components';
import { CloudLearningPathService } from '@/services/CloudLearningPathService';
import { CloudCourseService } from '@/services/CloudCourseService';
import { useAuth } from '@/contexts/AuthContext';

// 数字格式化函数
const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  }
  return num.toLocaleString();
};

interface PathItem {
  id: string;
  courseId: string;
  order: number;
}

interface LearningPath {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryIds?: string[];  // 绑定的课程分类ID列表
  classIds?: string[];     // 绑定的班级ID列表
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  status: string;
  items: PathItem[];
  enrolledCount: number;
  rating: number;
  progress?: number;
  isEnrolled?: boolean;
}

// 按分类或班级分组的课程
interface CategoryCourseGroup {
  type: 'category' | 'class';  // 分组类型
  groupName: string;           // 分组名称
  groupId: string;            // 分类ID或班级ID
  courses: Course[];
}

// 课程接口
interface Course {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  price?: number;
  level?: string;
  duration?: number;
  teacherName?: string;
  studentsCount?: number;
}

export default function LearningPathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [detailPath, setDetailPath] = useState<LearningPath | null>(null);
  const [pathCourses, setPathCourses] = useState<Course[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryCourseGroup[]>([]);  // 按分类分组的课程
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [showAll, setShowAll] = useState(false);  // 是否显示全部路径
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // 加载学习路径
  const loadPaths = async () => {
    try {
      setLoading(true);
      const result = await CloudLearningPathService.getAllPaths();
      if (result.success && result.data) {
        setPaths(result.data);
      }
    } catch (error) {
      console.error('加载学习路径失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaths();
  }, []);

  // 开始学习
  const handleStartLearning = async (path: LearningPath) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      if (path.isEnrolled) {
        // 继续学习 - 跳转到第一个未完成课程
        const firstItem = path.items?.[0];
        if (firstItem) {
          navigate(`/courses/${firstItem.courseId}`);
        }
      } else {
        // 开始学习
        const result = await CloudLearningPathService.startPath(path.id);
        if (result.success) {
          setPaths(paths.map(p => 
            p.id === path.id ? { ...p, isEnrolled: true, progress: 0 } : p
          ));
          // 跳转到第一个课程
          if (path.items?.[0]) {
            navigate(`/courses/${path.items[0].courseId}`);
          }
        }
      }
    } catch (error) {
      console.error('开始学习失败:', error);
    }
  };

  // 查看学习路径详情
  const handleViewPathDetail = async (path: LearningPath) => {
    setDetailPath(path);
    setLoadingCourses(true);
    setPathCourses([]);
    setCategoryGroups([]);

    console.log('[LearningPathsPage] 查看学习路径详情:', {
      pathId: path.id,
      name: path.name,
      categoryId: path.categoryId,
      categoryIds: path.categoryIds,
      classIds: path.classIds,
      hasItems: path.items?.length > 0
    });

    try {
      let allCourses: Course[] = [];
      const groups: CategoryCourseGroup[] = [];
      
      // 获取分类名称映射
      const categoryNames: Record<string, string> = {};
      const classNames: Record<string, string> = {};
      
      // 1. 首先处理分类关联
      if (path.categoryIds && path.categoryIds.length > 0) {
        console.log('[LearningPathsPage] 处理分类关联，categoryIds:', path.categoryIds);
        // 并行查询所有分类的课程
        const categoryPromises = path.categoryIds.map(async (catId) => {
          console.log('[LearningPathsPage] 查询分类课程, catId:', catId);
          const result = await CloudCourseService.getByCategory(catId);
          console.log('[LearningPathsPage] 分类查询结果, catId:', catId, 'courses count:', result?.length);
          if (result && Array.isArray(result) && result.length > 0) {
            const courses = result.map((c: any) => ({
              id: c._id || c.id,
              title: c.title,
              description: c.description,
              coverImage: c.coverImage,
              price: c.price,
              level: c.level,
              duration: c.duration,
              teacherName: c.teacherName || c.instructor,
              studentsCount: c.studentsCount || c.enrolledCount || 0,
              category: c.category,
              categoryId: c.categoryId,
            }));
            
            // 获取分类名称
            if (!categoryNames[catId] && courses.length > 0) {
              categoryNames[catId] = courses[0].category || catId;
            }
            
            return {
              type: 'category' as const,
              groupId: catId,
              groupName: courses[0]?.category || catId,
              courses,
            };
          }
          return null;
        });
        
        const categoryResults = await Promise.all(categoryPromises);
        categoryResults.forEach((r) => {
          if (r && r.courses.length > 0) {
            groups.push(r);
            allCourses = [...allCourses, ...r.courses];
          }
        });
      } else if (path.categoryId) {
        // 兼容旧数据：单个分类
        const result = await CloudCourseService.getByCategory(path.categoryId);
        if (result && Array.isArray(result) && result.length > 0) {
          const courses = result.map((c: any) => ({
            id: c._id || c.id,
            title: c.title,
            description: c.description,
            coverImage: c.coverImage,
            price: c.price,
            level: c.level,
            duration: c.duration,
            teacherName: c.teacherName || c.instructor,
            studentsCount: c.studentsCount || c.enrolledCount || 0,
            category: c.category,
            categoryId: c.categoryId,
          }));
          allCourses = courses;
          if (courses.length > 0) {
            groups.push({
              type: 'category',
              groupId: path.categoryId,
              groupName: courses[0].category || path.category,
              courses,
            });
          }
        }
      }
      
      // 2. 然后处理班级关联
      if (path.classIds && path.classIds.length > 0) {
        console.log('[LearningPathsPage] 处理班级关联，classIds:', path.classIds);
        // 查询关联班级的信息
        const { classService } = await import('@/services/classService');
        const classPromises = path.classIds.map(async (classId) => {
          try {
            const result = await classService.getById(classId);
            if (result.code === 0 && result.data) {
              classNames[classId] = result.data.name || classId;
              // 班级暂时没有关联课程，返回空课程列表
              // 如果业务需要，可以在这里查询班级关联的课程
              return {
                type: 'class' as const,
                groupId: classId,
                groupName: result.data.name || `班级-${classId.slice(-4)}`,
                courses: [],  // 班级暂无关联课程
              };
            }
          } catch (err) {
            console.error('[LearningPathsPage] 获取班级信息失败, classId:', classId, err);
          }
          return null;
        });
        
        const classResults = await Promise.all(classPromises);
        classResults.forEach((r) => {
          if (r) {
            groups.push(r);
            // 班级的课程暂时为空，如果有的话也应该加入 allCourses
            // allCourses = [...allCourses, ...r.courses];
          }
        });
      }
      
      // 3. 最后处理手动添加的课程（兼容旧数据）
      if (groups.length === 0 && path.items && path.items.length > 0) {
        allCourses = path.items.map((item: any) => ({
          id: item.courseId,
          title: item.courseTitle || item.title || '',
        }));
        if (allCourses.length > 0) {
          groups.push({
            type: 'category',
            groupId: 'manual',
            groupName: '学习路径课程',
            courses: allCourses,
          });
        }
      }

      console.log('[LearningPathsPage] 最终分组结果:', {
        groupsCount: groups.length,
        totalCourses: allCourses.length,
        groups: groups
      });
      setCategoryGroups(groups);
      setPathCourses(allCourses);
    } catch (error) {
      console.error('加载课程失败:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  // 关闭详情视图
  const handleCloseDetail = () => {
    setDetailPath(null);
    setPathCourses([]);
    setCategoryGroups([]);
  };

  // 获取难度标签
  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      beginner: '入门',
      intermediate: '进阶',
      advanced: '高级'
    };
    return labels[difficulty] || difficulty;
  };

  // 获取难度样式
  const getDifficultyStyle = (difficulty: string) => {
    const styles: Record<string, string> = {
      beginner: 'bg-emerald-100 text-emerald-700',
      intermediate: 'bg-amber-100 text-amber-700',
      advanced: 'bg-red-100 text-red-700'
    };
    return styles[difficulty] || styles.beginner;
  };

  // 获取分类标签
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      theory: '理论学习',
      practice: '实操训练',
      certification: '考证辅导',
      flight: '飞行技能'
    };
    return labels[category] || category;
  };

  // 过滤学习路径（应用随机+分页逻辑）
  const filteredPaths = (() => {
    const baseFiltered = filter === 'all' 
      ? paths 
      : paths.filter(p => p.category === filter);
    
    // 基于日期的随机种子 - 同一天显示相同的随机顺序
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Fisher-Yates 洗牌算法（使用日期种子保证同一天结果一致）
    const shuffleWithSeed = (array: LearningPath[]) => {
      const shuffled = [...array];
      let currentSeed = seed;
      const random = () => {
        currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
        return currentSeed / 0x7fffffff;
      };
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    const shuffled = shuffleWithSeed(baseFiltered);
    // 如果未点击"查看全部"，只显示前3条
    return showAll ? shuffled : shuffled.slice(0, 3);
  })();

  // 获取所有分类
  const categories = ['all', ...new Set(paths.map(p => p.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* 学习路径详情弹窗 */}
      {detailPath && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className={`p-6 ${
              detailPath.difficulty === 'advanced' 
                ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                : detailPath.difficulty === 'intermediate'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{detailPath.name}</h2>
                  <p className="text-white/90">{detailPath.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">
                      {getCategoryLabel(detailPath.category)}
                    </span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm">
                      {getDifficultyLabel(detailPath.difficulty)}
                    </span>
                    {detailPath.categoryId && (
                      <span className="px-3 py-1 bg-yellow-400/80 rounded-full text-white text-sm flex items-center gap-1">
                        <Grid className="w-4 h-4" />
                        分类课程
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleCloseDetail}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  {categoryGroups.length > 0 ? '分类课程' : '学习路径课程列表'}
                  <span className="text-sm font-normal text-slate-500">({pathCourses.length} 门课程)</span>
                </h3>
              </div>

              {loadingCourses ? (
                <div className="flex items-center justify-center py-12">
                  <Loading text="加载课程中..." />
                </div>
              ) : categoryGroups.length === 0 && pathCourses.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">暂无课程</p>
                </div>
              ) : (
                <>
                  {/* 关联分类课程 */}
                  {categoryGroups.length > 0 && categoryGroups.filter(g => g.type === 'category').length > 0 && (
                    <div className="mb-6">
                      {categoryGroups.filter(g => g.type === 'category').map((group, groupIndex) => (
                        <div key={group.groupId} className="mb-4">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-100 mb-3">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                              <Grid className="w-4 h-4 text-blue-500" />
                              {group.groupName}的课程
                              <span className="text-sm font-normal text-slate-500 ml-2">({group.courses.length}门)</span>
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {group.courses.map((course, index) => (
                              <div 
                                key={course.id}
                                className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors cursor-pointer group"
                                onClick={() => navigate(`/courses?category=${encodeURIComponent(group.groupName)}`)}
                              >
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold flex-shrink-0">
                                    {groupIndex + 1}.{index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-800 group-hover:text-emerald-600 transition-colors line-clamp-1">
                                      {course.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                      {course.level && (
                                        <span className="px-2 py-0.5 bg-slate-200 rounded">
                                          {course.level === 'beginner' ? '入门' : course.level === 'intermediate' ? '进阶' : '高级'}
                                        </span>
                                      )}
                                      {course.duration && <span>{course.duration}h</span>}
                                    </div>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 关联班级 */}
                  {categoryGroups.length > 0 && categoryGroups.filter(g => g.type === 'class').length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-purple-500" />
                        关联班级
                        <span className="text-sm font-normal text-slate-500">({categoryGroups.filter(g => g.type === 'class').length}个)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryGroups.filter(g => g.type === 'class').map((group) => (
                          <div 
                            key={group.groupId}
                            className="bg-purple-50 rounded-xl p-4 hover:bg-purple-100 transition-colors cursor-pointer border border-purple-100"
                            onClick={() => navigate('/classes')}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                                <Users className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-medium text-slate-800">{group.groupName}</h5>
                                <p className="text-xs text-slate-500">点击查看班级详情</p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-purple-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 手动添加的课程 */}
                  {pathCourses.length > 0 && categoryGroups.filter(g => g.type === 'category').length === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pathCourses.map((course, index) => (
                        <div 
                          key={course.id}
                          className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors cursor-pointer group"
                          onClick={() => navigate(`/courses/${course.id}`)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-slate-800 group-hover:text-emerald-600 transition-colors line-clamp-1">
                                {course.title}
                              </h4>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* 底部操作 */}
              <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseDetail}
                >
                  关闭
                </Button>
                <Button
                  onClick={() => {
                    handleCloseDetail();
                    if (!isAuthenticated) {
                      navigate('/login');
                      return;
                    }
                    // 开始学习路径
                    handleStartLearning(detailPath);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {detailPath.isEnrolled ? '继续学习' : '开始学习'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Map className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">学习路径</h1>
                <p className="text-sm text-slate-500">{paths.length} 条学习路径</p>
              </div>
            </div>
          </div>

          {/* 分类筛选 */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filter === cat
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? '全部' : getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loading text="加载学习路径中..." />
          </div>
        ) : filteredPaths.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Map className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-600 mb-2">暂无学习路径</h3>
            <p className="text-slate-500">管理员正在准备学习内容</p>
          </div>
        ) : (
          <>
            {/* 路径卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPaths.map((path) => (
              <div
                key={path.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 group"
              >
                {/* 头部背景 */}
                <div className={`h-24 relative ${
                  path.difficulty === 'advanced' 
                    ? 'bg-gradient-to-br from-red-500 to-rose-600' 
                    : path.difficulty === 'intermediate'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                }`}>
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 left-4 w-20 h-20 border-2 border-white/30 rounded-xl rotate-12" />
                    <div className="absolute bottom-4 right-4 w-16 h-16 border-2 border-white/30 rounded-lg -rotate-6" />
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 text-xs rounded-full bg-white/20 text-white backdrop-blur-sm`}>
                      {getCategoryLabel(path.category)}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 text-xs rounded-full ${getDifficultyStyle(path.difficulty)}`}>
                      {getDifficultyLabel(path.difficulty)}
                    </span>
                  </div>
                </div>

                {/* 内容 */}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">
                    {path.name}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                    {path.description}
                  </p>

                  {/* 统计信息 */}
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {path.categoryId ? '分类课程' : `${path.items?.length || 0} 课程`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {path.estimatedHours || 0}h
                    </span>
                    {path.categoryId && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                        <Grid className="w-3 h-3" />
                        自动
                      </span>
                    )}
                  </div>

                  {/* 进度条（已报名） */}
                  {path.isEnrolled && path.progress !== undefined && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-500">学习进度</span>
                        <span className="font-medium text-emerald-600">{path.progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${path.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <Button 
                    onClick={() => handleViewPathDetail(path)}
                    className="w-full group-hover:shadow-lg transition-all bg-emerald-500 hover:bg-emerald-600"
                  >
                    <List className="w-4 h-4 mr-2" />
                    查看课程
                  </Button>
                </div>
              </div>
            ))}
            </div>

            {/* 查看全部按钮 */}
            {!showAll && filteredPaths.length > 3 && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-105"
                >
                  <List className="w-5 h-5" />
                  查看全部 {filteredPaths.length} 条学习路径
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* 返回显示3条按钮 */}
            {showAll && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowAll(false)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-full font-medium hover:bg-slate-200 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  返回精选路径
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
