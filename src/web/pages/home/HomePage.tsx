// ============================================================================
// 首页 - 无人机培训系统
// 支持从后台管理配置内容
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  Award, 
  Globe, 
  Clock,
  ChevronRight,
  Plane,
  Shield,
  BookOpen,
  BarChart3,
  Target,
  ArrowRight,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Star,
  Play,
  ChevronLeft,
  Bell,
  Map,
  Eye,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Button, Card, Loading } from '@/components';
import { CloudCourseService } from '@/services/CloudCourseService';
import { pageConfigService, defaultPageConfig } from '@/services/pageConfigService';
import { CloudBannerAdminService } from '@/services/CloudAdminService';
import { featuredCourseService } from '@/services/featuredCourseService';
import { featuredClassService } from '@/services/featuredClassService';
import { featuredPathService } from '@/services/featuredPathService';
import { CloudNoticeService } from '@/services/CloudNoticeService';
import { categoryService } from '@/services/categoryService';
import type { Course } from '@/types';
import NoticePopup from '@/components/NoticePopup';
import LazyImage from '@/components/LazyImage';

// 图标映射
const iconMap: Record<string, any> = {
  Plane,
  Users,
  Award,
  Globe,
  Clock,
  Shield,
  GraduationCap,
  BarChart3,
  Target,
  BookOpen,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
};

// 颜色映射
const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  purple: 'bg-purple-100 text-purple-600',
  rose: 'bg-rose-100 text-rose-600',
  cyan: 'bg-cyan-100 text-cyan-600',
};

// 轮播图接口
interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  courseId: string;
  order: number;
  status: string;
}

// 链接图标组件
const LinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

// 班级类型
interface ClassItem {
  _id?: string;
  name: string;
  courseName?: string;
  startDate: string;
  endDate: string;
  location: string;
  startTime?: string;
  endTime?: string;
  teacherName?: string;
  price?: number;
  enrolledCount?: number;
  maxStudents?: number;
  status: string;
  description?: string;
}

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [notices, setNotices] = useState<any[]>([]);
  const [enrollingClasses, setEnrollingClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [displayedPaths, setDisplayedPaths] = useState<any[]>([]);  // 首页显示的学习路径（随机3条）
  const [showAllPaths, setShowAllPaths] = useState(false);  // 是否显示全部路径
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});  // 分类ID -> 名称映射
  const navigate = useNavigate();
  
  // 页面配置
  const [pageConfig, setPageConfig] = useState<{
    hero: NonNullable<typeof defaultPageConfig.hero>;
    stats: NonNullable<typeof defaultPageConfig.stats>;
    features: NonNullable<typeof defaultPageConfig.features>;
    contact: NonNullable<typeof defaultPageConfig.contact>;
    footer: NonNullable<typeof defaultPageConfig.footer>;
  }>({
    hero: defaultPageConfig.hero || {
      logoIcon: 'Plane',
      logoText: '无人机培训中心',
      mainTitle: '翱翔蓝天',
      subTitle: '成就飞行梦想',
      description: '专业无人机驾驶培训',
      ctaPrimaryText: '查看课程',
      ctaSecondaryText: '预约试听',
      backgroundImage: '',
      featureImage: '',
      trustBadges: [],
    },
    stats: defaultPageConfig.stats || [],
    features: defaultPageConfig.features || [],
    contact: defaultPageConfig.contact || {
      title: '准备好开始您的飞行之旅了吗？',
      description: '',
      ctaPrimaryText: '立即报名',
      ctaSecondaryText: '了解更多',
    },
    footer: defaultPageConfig.footer || {
      logoText: '无人机培训中心',
      description: '',
      phone: '',
      email: '',
      address: '',
      quickLinks: [],
      copyright: '',
      icp: '',
    },
  });

  // 加载轮播图
  const loadHeroBanners = async () => {
    try {
      const result = await CloudBannerAdminService.getAll({ limit: 10 });
      if (result.success && result.data) {
        // 过滤并排序轮播图
        const activeBanners = result.data
          .filter((b: any) => b.status === 'active')
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setHeroBanners(activeBanners);
      }
    } catch (error) {
      console.error('加载轮播图失败:', error);
    }
  };

  // 加载首页展示的班级
  const loadEnrollingClasses = async () => {
    try {
      setClassesLoading(true);
      // 动态导入 classService
      const { classService } = await import('@/services/classService');
      
      // 先检查是否有配置的班级
      const featuredClassIds = await featuredClassService.getFeaturedClasses();
      
      let classesList: any[] = [];
      
      if (featuredClassIds.length > 0) {
        // 如果有配置的班级，优先使用配置的班级
        console.log('[首页] 使用配置的班级ID:', featuredClassIds);
        const allClassesResult = await classService.getList({ page: 1, pageSize: 100 });
        const allClasses = allClassesResult.data?.data?.list || allClassesResult.data?.list || [];
        classesList = featuredClassIds
          .map((id: string) => allClasses.find((c: any) => c._id === id || c.id === id))
          .filter(Boolean);
        console.log('[首页] 匹配到的配置班级:', classesList);
      }
      
      // 如果没有配置的班级，回退到获取所有招生中的班级
      if (classesList.length === 0) {
        const result = await classService.getList({ 
          status: 'enrolling', 
          page: 1, 
          pageSize: 6 
        });
        classesList = result.data?.data?.list || result.data?.list || [];
      }
      
      setEnrollingClasses(classesList);
    } catch (error) {
      console.error('加载招生班级失败:', error);
    } finally {
      setClassesLoading(false);
    }
  };

  // 加载首页学习路径
  const loadFeaturedPaths = async () => {
    try {
      // 加载分类数据，构建 ID -> 名称映射
      const catResult = await categoryService.getAllActive();
      if (catResult.success && catResult.data) {
        const map: Record<string, string> = {};
        catResult.data.forEach((cat: any) => {
          map[cat.id || cat._id] = cat.name;
        });
        setCategoryMap(map);
        console.log('[首页] 分类映射:', map);
      }

      // 获取配置的学习路径ID
      const featuredPathIds = await featuredPathService.getFeaturedPaths();
      console.log('[首页] 学习路径ID列表:', featuredPathIds, '数量:', featuredPathIds.length);
      
      let allLoadedPaths: any[] = [];
      
      // 获取所有学习路径
      const { CloudLearningPathService } = await import('@/services/CloudLearningPathService');
      const allPaths = await CloudLearningPathService.getAllPaths({ limit: 50 });
      console.log('[首页] 所有学习路径:', allPaths?.data?.length, '条');
      
      if (allPaths.success && allPaths.data) {
        // 如果有配置ID，按配置筛选；否则使用所有路径
        if (featuredPathIds.length > 0) {
          allLoadedPaths = featuredPathIds
            .map((id: string) => allPaths.data.find((p: any) => p.id === id || p._id === id))
            .filter(Boolean);
        } else {
          allLoadedPaths = allPaths.data;
        }
        console.log('[首页] 最终使用的学习路径:', allLoadedPaths.length, '条');
      }
      
      setLearningPaths(allLoadedPaths);
      
      // 实现日期随机选择3条的逻辑
      console.log('[首页] 检查是否需要随机选择: allLoadedPaths.length =', allLoadedPaths.length);
      if (allLoadedPaths.length > 3) {
        // 基于日期的随机种子 - 同一天显示相同的随机顺序
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        console.log('[首页] 日期种子:', seed);
        
        // Fisher-Yates 洗牌算法（使用日期种子保证同一天结果一致）
        const shuffleWithSeed = (array: any[]) => {
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
        
        const shuffledPaths = shuffleWithSeed(allLoadedPaths);
        const selectedPaths = shuffledPaths.slice(0, 3);
        console.log('[首页] 随机选择3条:', selectedPaths.map(p => p.name));
        setDisplayedPaths(selectedPaths);  // 只取前3条
      } else {
        console.log('[首页] 路径不足3条，使用全部:', allLoadedPaths.length);
        setDisplayedPaths(allLoadedPaths);  // 不足3条全部显示
      }
    } catch (error) {
      console.error('加载学习路径失败:', error);
    }
  };

  // 处理学习路径卡片点击 - 跳转到分类页面
  const handlePathClick = (path: any) => {
    console.log('[首页] 点击学习路径:', path.name, '绑定的分类ID:', path.categoryIds || path.categoryId);
    
    // 优先使用 categoryIds（多分类），其次使用 categoryId（单分类）
    const categoryIds = path.categoryIds || (path.categoryId ? [path.categoryId] : []);
    
    if (categoryIds.length > 0) {
      // 获取第一个分类的名称
      const firstCatId = categoryIds[0];
      const categoryName = categoryMap[firstCatId] || path.categoryName;
      
      if (categoryName) {
        console.log('[首页] 跳转到分类页面:', `/courses?category=${encodeURIComponent(categoryName)}`);
        navigate(`/courses?category=${encodeURIComponent(categoryName)}`);
      } else {
        console.log('[首页] 无法获取分类名称，使用默认课程页面');
        navigate('/courses');
      }
    } else {
      // 没有绑定分类，跳转到课程列表页
      console.log('[首页] 学习路径未绑定分类，跳转到课程列表');
      navigate('/courses');
    }
  };

  // 处理报名按钮点击
  const handleEnrollClick = (classId: string) => {
    // 跳转到班级专属报名页面
    navigate(`/registration/class/${classId}`);
  };

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 并行加载配置、课程、轮播图和公告
      const [config, courseData, featuredIds, noticeResult] = await Promise.all([
        pageConfigService.getHomePageConfig(),
        CloudCourseService.getAll().catch(() => []),
        featuredCourseService.getFeaturedCourses().catch(() => []),
        CloudNoticeService.getPublishedNotices({ limit: 5 }).catch(() => ({ success: false, data: [] })),
      ]);
      
      setPageConfig(config);
      
      // 如果有热门课程配置，使用配置的课程
      // 否则回退到取前4个课程
      if (featuredIds.length > 0) {
        const allCourses = courseData as Course[];
        console.log('热门课程ID列表:', featuredIds);
        console.log('所有课程:', allCourses.map(c => ({ _id: c._id, id: (c as any).id, title: c.title })));
        const featured = featuredIds
          .map(id => allCourses.find(c => c._id === id || (c as any).id === id))
          .filter(Boolean) as Course[];
        console.log('匹配到的热门课程:', featured);
        setCourses(featured);
      } else {
        setCourses((courseData as Course[]).slice(0, 4));
      }
      
      // 加载轮播图
      await loadHeroBanners();
      
      // 加载公告
      if (noticeResult.success && noticeResult.data) {
        setNotices(noticeResult.data);
      }
      
      // 加载招生班级
      await loadEnrollingClasses();
      
      // 加载首页学习路径
      await loadFeaturedPaths();
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 自动轮播
  useEffect(() => {
    if (heroBanners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
    }, 5000); // 5秒切换

    return () => clearInterval(interval);
  }, [heroBanners.length]);

  // 手动切换
  const goToSlide = (index: number) => setCurrentSlide(index);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroBanners.length) % heroBanners.length);

  // 处理轮播图点击
  const handleBannerClick = (banner: HeroBanner) => {
    console.log('轮播图点击:', banner);
    
    // 优先使用 courseId 构造课程路径（确保跳转到正确的 /courses/:id 路由）
    if (banner.courseId) {
      const targetPath = `/courses/${banner.courseId}`;
      console.log('使用courseId导航到:', targetPath);
      navigate(targetPath);
    } else if (banner.link && banner.link.trim()) {
      // 只有在没有 courseId 时才使用 link 字段
      // 检查是否为外部链接（以 http 开头）
      if (banner.link.startsWith('http')) {
        console.log('打开外部链接:', banner.link);
        window.open(banner.link, '_blank');
      } else {
        console.log('使用link导航到:', banner.link);
        navigate(banner.link);
      }
    } else {
      console.log('轮播图无可用跳转链接');
    }
  };

  const { hero, stats, features, contact, footer } = pageConfig;

  // 分割描述文字（支持\n换行）
  const descriptionLines = hero.description.split('\n');

  return (
    <div className="min-h-screen">
      {/* ======================================================= */}
      {/* 公告弹窗 */}
      {/* ======================================================= */}
      <NoticePopup />

      {/* ======================================================= */}
      {/* HERO SECTION - 左侧文字 + 右侧轮播图 */}
      {/* ======================================================= */}
      <section className="relative min-h-[85vh] overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full min-h-[85vh] flex items-center py-16">
          
          {/* 左侧：文字内容 */}
          <div className="w-1/2 pr-12 relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">{hero.logoText}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {hero.mainTitle}
              <br />
              <span className="text-white/90">{hero.subTitle}</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/80 max-w-lg mb-8 leading-relaxed">
              {descriptionLines.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < descriptionLines.length - 1 && <br />}
                </span>
              ))}
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4 mb-10">
              <Link to="/courses">
                <button 
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 rounded-lg shadow-xl min-w-[180px] font-semibold hover:bg-blue-50 transition-colors"
                  style={{ color: '#2563eb' }}
                >
                  <GraduationCap className="w-5 h-5 mr-2" />
                  {hero.ctaPrimaryText}
                </button>
              </Link>
              <Link to="/login">
                <button 
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-white/50 text-white rounded-lg min-w-[180px] font-semibold hover:bg-white/10 transition-colors"
                  style={{ color: '#ffffff' }}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {hero.ctaSecondaryText}
                </button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-white/70">
              {hero.trustBadges.map((badge, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* 右侧：轮播图 */}
          <div className="w-1/2 h-[500px] relative">
            {heroBanners.length > 0 ? (
              <>
                {heroBanners.map((banner, index) => (
                  <div
                    key={banner.id}
                    className={`absolute inset-0 transition-opacity duration-1000 rounded-2xl overflow-hidden ${
                      index === currentSlide ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={() => handleBannerClick(banner)}
                    style={{ cursor: banner.link || banner.courseId ? 'pointer' : 'default' }}
                  >
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                ))}

                {/* 轮播指示器 */}
                {heroBanners.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                    {heroBanners.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          index === currentSlide
                            ? 'bg-white w-6'
                            : 'bg-white/50 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* 左右箭头 */}
                {heroBanners.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-white/60">轮播图区域</span>
              </div>
            )}
          </div>
        </div>

        {/* 向下滚动指示 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <ChevronRight className="w-8 h-8 text-white/50 rotate-90" />
        </div>
      </section>

      {/* ======================================================= */}
      {/* 学习路径入口 - 前台功能展示 */}
      {/* ======================================================= */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Map className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">学习路径</h2>
                <p className="text-sm text-slate-500">系统化学习体验</p>
              </div>
            </div>
            {/* 根据路径数量显示不同按钮 - 简洁白色胶囊样式 */}
            {learningPaths.length > 3 ? (
              showAllPaths ? (
                <button
                  onClick={() => setShowAllPaths(false)}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  <span className="text-sm font-medium">返回精选</span>
                  <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>
              ) : (
                <button
                  onClick={() => setShowAllPaths(true)}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  <span className="text-sm font-medium">查看全部课程</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              )
            ) : (
              <Link 
                to="/courses"
                className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                <span className="text-sm font-medium">查看全部课程</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {(() => {
              // 确定要显示的路径
              const pathsToShow = showAllPaths 
                ? learningPaths 
                : (displayedPaths.length > 0 ? displayedPaths : learningPaths);
              
              // 如果没有数据，显示默认占位
              const displayData = pathsToShow.length > 0 
                ? pathsToShow 
                : [
                    { id: 'default-1', name: '入门课程', description: '零基础学习无人机知识', difficulty: 'beginner' },
                    { id: 'default-2', name: '进阶训练', description: '提升飞行技能水平', difficulty: 'intermediate' },
                    { id: 'default-3', name: '考证冲刺', description: '针对性备考训练', difficulty: 'advanced' },
                  ];
              
              return displayData.map((path: any, index: number) => {
                const difficultyStyle = {
                  beginner: { color: 'from-emerald-500 to-teal-500', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600' },
                  intermediate: { color: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-100', textColor: 'text-amber-600' },
                  advanced: { color: 'from-red-500 to-rose-500', bgColor: 'bg-red-100', textColor: 'text-red-600' },
                }[path.difficulty || 'beginner'] || { color: 'from-emerald-500 to-teal-500', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600' };
                
                return (
                  <div
                    key={path.id || index}
                    onClick={() => handlePathClick(path)}
                    className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 overflow-hidden cursor-pointer"
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${difficultyStyle.color} opacity-10 rounded-full blur-2xl transform translate-x-8 -translate-y-8`} />
                    <div className={`w-14 h-14 ${difficultyStyle.bgColor} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Map className={`w-7 h-7 ${difficultyStyle.textColor}`} />
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">
                      {path.name || path.title}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      {path.description}
                    </p>
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${difficultyStyle.bgColor} ${difficultyStyle.textColor}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {path.difficulty === 'beginner' ? '入门' : path.difficulty === 'intermediate' ? '进阶' : '高级'}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* 热门课程 */}
      {/* ======================================================= */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 标题 */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              热门课程
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              专业体系化培训，轻松考取无人机驾驶证
            </p>
          </div>

          {/* 课程列表 */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loading text="加载课程..." />
            </div>
          ) : courses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {courses.map((course, index) => (
                <Link 
                  key={course._id || index}
                  to={`/courses/${course._id}`}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <Card 
                    className={`h-full overflow-hidden transition-all duration-300 ${
                      hoveredCard === index 
                        ? 'shadow-xl -translate-y-2' 
                        : 'shadow-lg'
                    }`}
                  >
                    {/* 封面图 - 使用懒加载 */}
                    <div className="relative h-44 overflow-hidden">
                      {course.coverImage ? (
                        <LazyImage
                          src={course.coverImage}
                          alt={course.title}
                          className="w-full h-full object-cover transition-transform duration-500"
                          style={{ transform: hoveredCard === index ? 'scale(1.05)' : 'scale(1)' }}
                          placeholderType="blur"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Plane className="w-16 h-16 text-white/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                      
                      {/* 价格标签 */}
                      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <span className="text-lg font-bold text-blue-600">¥{course.price?.toLocaleString() || '待定'}</span>
                      </div>
                    </div>
                    
                    {/* 内容 */}
                    <div className="p-5">
                      <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      
                      {course.description && (
                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-sm text-slate-500">查看详情</span>
                        <ChevronRight className="w-4 h-4 text-blue-500" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>暂无课程数据</p>
            </div>
          )}

          {/* 查看更多 */}
          <div className="text-center mt-10">
            <Link to="/courses">
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                查看全部课程
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* 最新开班 + 统计概览 - 整合为一个区块 */}
      {/* ======================================================= */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 标题 */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              <span className="text-blue-600">最新</span>开班信息
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              热门班级火热招生中，名额有限，报满即止
            </p>
          </div>

          {/* 班级列表 */}
          {classesLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : enrollingClasses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollingClasses.map((cls) => {
                const remaining = (cls.maxStudents || 50) - (cls.enrolledCount || 0);
                const isFull = remaining <= 0;
                
                return (
                  <div 
                    key={cls._id}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
                  >
                    {/* 头部 */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg truncate flex-1">{cls.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
                          isFull 
                            ? 'bg-red-500/20 text-red-200' 
                            : 'bg-white/20 text-white'
                        }`}>
                          {isFull ? '已满员' : `剩余 ${remaining} 名额`}
                        </span>
                      </div>
                      {cls.courseName && (
                        <p className="text-blue-100 text-sm mt-1">{cls.courseName}</p>
                      )}
                    </div>
                    
                    {/* 信息 */}
                    <div className="p-5 space-y-3">
                      {/* 时间 */}
                      <div className="flex items-center gap-3 text-slate-600">
                        <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span className="text-sm">{cls.startDate} ~ {cls.endDate}</span>
                      </div>
                      
                      {/* 上课时间 */}
                      <div className="flex items-center gap-3 text-slate-600">
                        <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span className="text-sm">{cls.startTime || '09:00'} - {cls.endTime || '17:00'}</span>
                      </div>
                      
                      {/* 地点 */}
                      <div className="flex items-center gap-3 text-slate-600">
                        <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span className="text-sm truncate">{cls.location}</span>
                      </div>
                      
                      {/* 教师 */}
                      {cls.teacherName && (
                        <div className="flex items-center gap-3 text-slate-600">
                          <Users className="w-5 h-5 text-blue-500 flex-shrink-0" />
                          <span className="text-sm">{cls.teacherName}</span>
                        </div>
                      )}
                      
                      {/* 价格 */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-orange-500">
                          <DollarSign className="w-5 h-5" />
                          <span className="text-xl font-bold">{cls.price || 0}</span>
                          <span className="text-sm text-slate-400">元</span>
                        </div>
                        
                        <button
                          onClick={() => handleEnrollClick(cls._id!)}
                          disabled={isFull}
                          className={`px-5 py-2 rounded-lg font-medium transition-all duration-200 ${
                            isFull
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {isFull ? '已满员' : '立即报名'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">暂无正在招生的班级</p>
              <p className="text-slate-400 text-sm mt-2">敬请期待下一期开班</p>
            </div>
          )}

          {/* 查看更多 */}
          {enrollingClasses.length > 0 && (
            <div className="text-center mt-10">
              <Link to="/registration">
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8"
                >
                  查看全部班级
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          )}

          {/* 统计概览 - 整合在开班区块内 */}
          {stats.length > 0 && enrollingClasses.length > 0 && (
            <div className="mt-16 pt-12 border-t border-slate-200/60">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">培训成果</h3>
                <p className="text-slate-500">用心教学，用数据说话</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                  const Icon = iconMap[stat.icon] || Users;
                  return (
                    <div 
                      key={index}
                      className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 text-center group"
                    >
                      <div className={`w-14 h-14 ${colorMap[stat.color] || 'bg-blue-100 text-blue-600'} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================= */}
      {/* 最新公告 - 前台功能展示 */}
      {/* ======================================================= */}
      {notices.length > 0 && (
        <section className="py-16 bg-gradient-to-br from-amber-50 to-orange-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">最新公告</h2>
                  <p className="text-sm text-slate-500">了解培训最新动态</p>
                </div>
              </div>
              <Link 
                to="/notices"
                className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium transition-colors"
              >
                查看全部
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notices.slice(0, 3).map((notice, index) => (
                <div 
                  key={notice.id || index}
                  onClick={() => navigate('/notices')}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100 hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      notice.priority === 'high' 
                        ? 'bg-red-100 text-red-600' 
                        : notice.priority === 'medium'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {notice.priority === 'high' && (
                          <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                            <span className="w-1 h-1 bg-red-500 rounded-full" />
                            紧急
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          notice.type === 'activity' 
                            ? 'bg-purple-100 text-purple-600' 
                            : notice.type === 'announcement'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {notice.type === 'activity' ? '活动' : notice.type === 'announcement' ? '公告' : '通知'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-amber-600 transition-colors line-clamp-2 mb-2">
                        {notice.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(notice.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {notice.views || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ======================================================= */}
      {/* 为什么选择我们 + 联系我们 - 整合区块 */}
      {/* ======================================================= */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* 上半部分：为什么选择我们 */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                为什么选择我们
              </h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                专业、权威、一站式培训服务，让您的飞行之路更加顺畅
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => {
                const Icon = iconMap[feature.icon] || Shield;
                return (
                  <div 
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-300 group"
                  >
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 text-center">{feature.title}</h3>
                    <p className="text-sm text-white/70 text-center">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-white/20 my-12"></div>

          {/* 下半部分：联系我们 */}
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              {contact.title}
            </h2>
            <p className="text-white/80 mb-10 max-w-2xl mx-auto">
              {contact.description.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < contact.description.split('\n').length - 1 && <br />}
                </span>
              ))}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/registration">
                <button 
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 rounded-lg shadow-xl min-w-[160px] font-semibold hover:bg-blue-50 transition-colors"
                  style={{ color: '#2563eb' }}
                >
                  <GraduationCap className="w-5 h-5 mr-2" />
                  {contact.ctaPrimaryText}
                </button>
              </Link>
              <Link to="/teachers">
                <button 
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-white/50 text-white rounded-lg min-w-[160px] font-semibold hover:bg-white/10 transition-colors"
                  style={{ color: '#ffffff' }}
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  {contact.ctaSecondaryText}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 轮播图淡入动画样式 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
