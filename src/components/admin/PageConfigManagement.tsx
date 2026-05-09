// ============================================================================
// 页面配置管理 - 生产级别重构 v2.0
// 支持多体系管理，通过分类关联体系
// - 轮播图（全局）- 公告（全局）- 学习路径（按体系分类）
// - 热门课程（按体系分类）- 最新开班（按体系分类）
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { 
  Image, Bell, Route, Star, Calendar, Layout,
  Plus, Edit, Trash2, ToggleLeft, ToggleRight,
  BarChart3, Sparkles, Phone, Footprints,
  Eye, EyeOff, ArrowUp, ArrowDown, GripVertical
} from 'lucide-react';
import { Button, Input, TextArea, Loading, Modal } from '@/components';
import { adminService } from '@/services/adminService';
import ImageUploader from './ImageUploader';

// ==================== 类型定义 ====================

interface Source {
  _id?: string;
  code: string;
  name: string;
  icon: string;
}

interface BannerItem {
  _id?: string;
  id?: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  order: number;
  status: 'active' | 'inactive';
}

interface NoticeItem {
  _id?: string;
  id?: string;
  title: string;
  content: string;
  type: 'system' | 'general' | 'class' | 'course';
  status: 'published' | 'draft';
  isPinned: boolean;
  createdAt?: string;
}

interface CourseItem {
  _id: string;
  title: string;
  sourceCode?: string;
  categoryId?: string;
  status: string;
}

interface ClassItem {
  _id: string;
  name: string;
  sourceCode?: string;
  categoryId?: string;
  status: string;
}

interface HeroConfig {
  logoIcon: string;
  logoText: string;
  mainTitle: string;
  subTitle: string;
  description: string;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
  backgroundImage: string;
  featureImage: string;
  trustBadges: string[];
}

// 统计项结构
interface StatItem {
  label: string;
  value: string;
  icon: string;
  color: string;
}

// 特色项结构
interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

// 联系信息结构
interface ContactInfo {
  title: string;
  description: string;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
}

// 页脚配置结构
interface FooterConfig {
  logoText: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  quickLinks: { label: string; path: string }[];
  copyright: string;
  icp: string;
}

// 学习路径结构：按分类组织，每个分类下包含课程和培训班
interface LearningPathGroup {
  _id: string;
  name: string;
  order: number;
  courses: CourseItem[];
  classes: ClassItem[];
  visible: boolean;
}

// 热门课程配置项
interface CourseConfigItem {
  _id: string;
  title: string;
  sourceCode?: string;
  categoryId?: string;
  status: string;
  order: number;
  visible: boolean;
}

// 培训班配置项
interface ClassConfigItem {
  _id: string;
  name: string;
  sourceCode?: string;
  categoryId?: string;
  status: string;
  order: number;
  visible: boolean;
}

type TabType = 'hero' | 'banners' | 'notices' | 'stats' | 'features' | 'contact' | 'footer' | 'learningPaths' | 'courses' | 'classes';

// ==================== 组件 ====================

export default function PageConfigManagement() {
  // 状态
  const [activeTab, setActiveTab] = useState<TabType>('banners');
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');  // 体系的 code
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');  // 体系的 _id
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{api: string; data: any}[]>([]);
  
  // 数据
  const [heroConfig, setHeroConfig] = useState<HeroConfig | null>(null);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [footer, setFooter] = useState<FooterConfig | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPathGroup[]>([]);
  
  // 内容配置状态（显示/隐藏、顺序）
  const [courseConfigs, setCourseConfigs] = useState<CourseConfigItem[]>([]);
  const [classConfigs, setClassConfigs] = useState<ClassConfigItem[]>([]);
  const [learningPathConfigs, setLearningPathConfigs] = useState<LearningPathGroup[]>([]);
  const [saving, setSaving] = useState(false);
  
  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // 加载体系列表
  useEffect(() => {
    loadSources();
  }, []);

  // 加载数据
  useEffect(() => {
    // 公共配置（hero、轮播图、公告、统计、特色、联系、页脚）不需要体系选择
    const isGlobalTab = ['hero', 'banners', 'notices', 'stats', 'features', 'contact', 'footer'].includes(activeTab);
    if (activeTab && (isGlobalTab || selectedSourceId)) {
      loadData();
    }
  }, [activeTab, selectedSourceId]);

  const loadSources = async () => {
    try {
      const result = await adminService.listSources({ limit: 100 });
      console.log('[PageConfig] loadSources result:', result);
      if (result.data?.list && result.data.list.length > 0) {
        setSources(result.data.list);
        // 自动选择第一个体系
        const firstSource = result.data.list[0];
        setSelectedSource(firstSource.code);
        setSelectedSourceId(firstSource._id || '');
        console.log('[PageConfig] 自动选择体系:', firstSource.code, firstSource.name, 'ID:', firstSource._id);
      } else {
        console.log('[PageConfig] 未找到体系数据');
      }
    } catch (error) {
      console.error('加载体系失败:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'hero':
          await loadHeroConfig();
          break;
        case 'banners':
          await loadBanners();
          break;
        case 'notices':
          await loadNotices();
          break;
        case 'stats':
          await loadStats();
          break;
        case 'features':
          await loadFeatures();
          break;
        case 'contact':
          await loadContact();
          break;
        case 'footer':
          await loadFooter();
          break;
        case 'courses':
          await loadCourses();
          await loadCourseConfigs();
          break;
        case 'classes':
          await loadClasses();
          await loadClassConfigs();
          break;
        case 'learningPaths':
          await loadLearningPaths();
          await loadLearningPathConfigs();
          break;
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHeroConfig = async () => {
    try {
      // 从 page_configs 集合加载 hero 配置
      const result = await adminService.list('page_configs', { section: 'hero' }, { limit: 1 });
      if (result.data?.list && result.data.list.length > 0) {
        const config = result.data.list[0];
        if (config.data?.hero) {
          setHeroConfig(config.data.hero as HeroConfig);
        } else {
          // 使用默认配置
          setHeroConfig(getDefaultHeroConfig());
        }
      } else {
        setHeroConfig(getDefaultHeroConfig());
      }
    } catch (error) {
      console.error('加载Hero配置失败:', error);
      setHeroConfig(getDefaultHeroConfig());
    }
  };

  const getDefaultHeroConfig = (): HeroConfig => ({
    logoIcon: 'Plane',
    logoText: '无人机培训中心',
    mainTitle: '翱翔蓝天',
    subTitle: '成就飞行梦想',
    description: '专业无人机驾驶培训，权威认证资质\n从入门到持证，一站式服务让飞行触手可及',
    ctaPrimaryText: '查看课程',
    ctaSecondaryText: '预约试听',
    backgroundImage: '',
    featureImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&h=600&fit=crop',
    trustBadges: ['官方认证', '不过退费', '推荐就业'],
  });

  const saveHeroConfig = async () => {
    if (!heroConfig) return;
    try {
      const result = await adminService.list('page_configs', { section: 'hero' }, { limit: 1 });
      const saveData = {
        section: 'hero',
        title: 'Hero区域',
        enabled: true,
        order: 1,
        data: { hero: heroConfig },
      };
      if (result.data?.list && result.data.list.length > 0) {
        await adminService.update('page_configs', result.data.list[0]._id, saveData);
      } else {
        await adminService.add('page_configs', saveData);
      }
      alert('保存成功');
    } catch (error) {
      console.error('保存Hero配置失败:', error);
      alert('保存失败');
    }
  };

  // ==================== 统计概览（Stats）配置 ====================
  const getDefaultStats = (): StatItem[] => [
    { label: '累计学员', value: '5,000+', icon: 'Users', color: 'blue' },
    { label: '持证飞行员', value: '2,800+', icon: 'Award', color: 'amber' },
    { label: '合作机构', value: '120+', icon: 'Globe', color: 'emerald' },
    { label: '课程时长', value: '800+', icon: 'Clock', color: 'purple' },
  ];

  const loadStats = async () => {
    try {
      const result = await adminService.list('page_configs', { section: 'stats' }, { limit: 1 });
      if (result.data?.list && result.data.list.length > 0) {
        const config = result.data.list[0];
        if (config.data?.stats && Array.isArray(config.data.stats)) {
          setStats(config.data.stats as StatItem[]);
        } else {
          setStats(getDefaultStats());
        }
      } else {
        setStats(getDefaultStats());
      }
    } catch (error) {
      console.error('加载统计配置失败:', error);
      setStats(getDefaultStats());
    }
  };

  const saveStats = async () => {
    if (!stats.length) return;
    try {
      const result = await adminService.list('page_configs', { section: 'stats' }, { limit: 1 });
      const saveData = {
        section: 'stats',
        title: '统计概览',
        enabled: true,
        order: 2,
        data: { stats },
      };
      if (result.data?.list && result.data.list.length > 0) {
        await adminService.update('page_configs', result.data.list[0]._id, saveData);
      } else {
        await adminService.add('page_configs', saveData);
      }
      alert('保存成功');
    } catch (error) {
      console.error('保存统计配置失败:', error);
      alert('保存失败');
    }
  };

  const addStat = () => {
    setStats([...stats, { label: '', value: '', icon: 'Users', color: 'blue' }]);
  };

  const removeStat = (index: number) => {
    setStats(stats.filter((_, i) => i !== index));
  };

  const updateStat = (index: number, field: keyof StatItem, value: string) => {
    const newStats = [...stats];
    newStats[index] = { ...newStats[index], [field]: value };
    setStats(newStats);
  };

  // ==================== 特色优势（Features）配置 ====================
  const getDefaultFeatures = (): FeatureItem[] => [
    { icon: 'Shield', title: '官方认证资质', description: '中国航空运输协会认证培训机构' },
    { icon: 'GraduationCap', title: '专业教学团队', description: '资深教官+理论专家双师授课' },
    { icon: 'BarChart3', title: '高通过率', description: '理论考试通过率98%+' },
    { icon: 'Target', title: '灵活排课', description: '随到随学，支持周末班/脱产班' },
  ];

  const loadFeatures = async () => {
    try {
      const result = await adminService.list('page_configs', { section: 'features' }, { limit: 1 });
      if (result.data?.list && result.data.list.length > 0) {
        const config = result.data.list[0];
        if (config.data?.features && Array.isArray(config.data.features)) {
          setFeatures(config.data.features as FeatureItem[]);
        } else {
          setFeatures(getDefaultFeatures());
        }
      } else {
        setFeatures(getDefaultFeatures());
      }
    } catch (error) {
      console.error('加载特色配置失败:', error);
      setFeatures(getDefaultFeatures());
    }
  };

  const saveFeatures = async () => {
    if (!features.length) return;
    try {
      const result = await adminService.list('page_configs', { section: 'features' }, { limit: 1 });
      const saveData = {
        section: 'features',
        title: '特色优势',
        enabled: true,
        order: 4,
        data: { features },
      };
      if (result.data?.list && result.data.list.length > 0) {
        await adminService.update('page_configs', result.data.list[0]._id, saveData);
      } else {
        await adminService.add('page_configs', saveData);
      }
      alert('保存成功');
    } catch (error) {
      console.error('保存特色配置失败:', error);
      alert('保存失败');
    }
  };

  const addFeature = () => {
    setFeatures([...features, { icon: 'Star', title: '', description: '' }]);
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const updateFeature = (index: number, field: keyof FeatureItem, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setFeatures(newFeatures);
  };

  // ==================== 联系我们（Contact）配置 ====================
  const getDefaultContact = (): ContactInfo => ({
    title: '准备好开始您的飞行之旅了吗？',
    description: '立即咨询报名，专业顾问为您定制学习方案。\n现在报名可享首期优惠，还能获得推荐就业机会。',
    ctaPrimaryText: '立即报名',
    ctaSecondaryText: '了解更多',
  });

  const loadContact = async () => {
    try {
      const result = await adminService.list('page_configs', { section: 'contact' }, { limit: 1 });
      if (result.data?.list && result.data.list.length > 0) {
        const config = result.data.list[0];
        if (config.data?.contact) {
          setContact(config.data.contact as ContactInfo);
        } else {
          setContact(getDefaultContact());
        }
      } else {
        setContact(getDefaultContact());
      }
    } catch (error) {
      console.error('加载联系配置失败:', error);
      setContact(getDefaultContact());
    }
  };

  const saveContact = async () => {
    if (!contact) return;
    try {
      const result = await adminService.list('page_configs', { section: 'contact' }, { limit: 1 });
      const saveData = {
        section: 'contact',
        title: '联系我们',
        enabled: true,
        order: 5,
        data: { contact },
      };
      if (result.data?.list && result.data.list.length > 0) {
        await adminService.update('page_configs', result.data.list[0]._id, saveData);
      } else {
        await adminService.add('page_configs', saveData);
      }
      alert('保存成功');
    } catch (error) {
      console.error('保存联系配置失败:', error);
      alert('保存失败');
    }
  };

  // ==================== 页脚信息（Footer）配置 ====================
  const getDefaultFooter = (): FooterConfig => ({
    logoText: '无人机培训中心',
    description: '专业无人机驾驶培训机构，中国航空运输协会认证。',
    phone: '400-888-8888',
    email: 'info@drone-train.com',
    address: '北京市朝阳区航空路88号',
    quickLinks: [
      { label: '课程中心', path: '/courses' },
      { label: '题库练习', path: '/exam-center' },
      { label: '证书查询', path: '/certificates' },
      { label: '教官团队', path: '/teachers' },
    ],
    copyright: '© 2024 无人机培训中心 版权所有',
    icp: '京ICP备XXXXXXXX号',
  });

  const loadFooter = async () => {
    try {
      const result = await adminService.list('page_configs', { section: 'footer' }, { limit: 1 });
      if (result.data?.list && result.data.list.length > 0) {
        const config = result.data.list[0];
        if (config.data?.footer) {
          setFooter(config.data.footer as FooterConfig);
        } else {
          setFooter(getDefaultFooter());
        }
      } else {
        setFooter(getDefaultFooter());
      }
    } catch (error) {
      console.error('加载页脚配置失败:', error);
      setFooter(getDefaultFooter());
    }
  };

  const saveFooter = async () => {
    if (!footer) return;
    try {
      const result = await adminService.list('page_configs', { section: 'footer' }, { limit: 1 });
      const saveData = {
        section: 'footer',
        title: '页脚信息',
        enabled: true,
        order: 6,
        data: { footer },
      };
      if (result.data?.list && result.data.list.length > 0) {
        await adminService.update('page_configs', result.data.list[0]._id, saveData);
      } else {
        await adminService.add('page_configs', saveData);
      }
      alert('保存成功');
    } catch (error) {
      console.error('保存页脚配置失败:', error);
      alert('保存失败');
    }
  };

  const addQuickLink = () => {
    if (!footer) return;
    setFooter({
      ...footer,
      quickLinks: [...footer.quickLinks, { label: '', path: '' }],
    });
  };

  const removeQuickLink = (index: number) => {
    if (!footer) return;
    setFooter({
      ...footer,
      quickLinks: footer.quickLinks.filter((_, i) => i !== index),
    });
  };

  const updateQuickLink = (index: number, field: 'label' | 'path', value: string) => {
    if (!footer) return;
    const newLinks = [...footer.quickLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFooter({ ...footer, quickLinks: newLinks });
  };

  const loadBanners = async () => {
    const result = await adminService.list('banners', {}, { orderBy: 'order', order: 'asc', limit: 100 });
    if (result.data?.list) {
      setBanners(result.data.list.map((b: any) => ({ ...b, id: b._id })));
    }
  };

  const loadNotices = async () => {
    const result = await adminService.list('notices', {}, { orderBy: 'createdAt', order: 'desc', limit: 100 });
    if (result.data?.list) {
      setNotices(result.data.list.map((n: any) => ({ ...n, id: n._id })));
    }
  };

  const loadCourses = async () => {
    console.log('[PageConfig] loadCourses, selectedSourceId:', selectedSourceId);
    try {
      // 直接通过 sourceId 筛选属于该体系的课程
      const result = await adminService.list('courses', { sourceId: selectedSourceId }, { limit: 1000 });
      
      console.log('[PageConfig] 课程查询结果:', {
        selectedSourceId,
        total: result.data?.total,
        listLength: result.data?.list?.length
      });
      
      if (result.data?.list && result.data.list.length > 0) {
        console.log('[PageConfig] 热门课程:', result.data.list.length);
        setCourses(result.data.list.map((c: any) => ({ ...c, id: c._id })));
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error('[PageConfig] loadCourses error:', error);
      setCourses([]);
    }
  };

  const loadClasses = async () => {
    console.log('[PageConfig] loadClasses, selectedSourceId:', selectedSourceId);
    try {
      // 统一使用 sourceId（_id）查询
      const result = await adminService.list('classes', { 
        sourceId: selectedSourceId 
      }, { limit: 1000 });
      
      console.log('[PageConfig] 培训班:', result.data?.list?.length || 0);
      setClasses((result.data?.list || []).map((c: any) => ({ ...c, id: c._id })));
    } catch (error) {
      console.error('[PageConfig] loadClasses error:', error);
      setClasses([]);
    }
  };

  const loadLearningPaths = async () => {
    console.log('[PageConfig] loadLearningPaths, selectedSourceId:', selectedSourceId);
    try {
      // 1. 查询该体系的所有分类（使用 sortOrder 排序）
      const categoryResult = await adminService.list('categories', { sourceId: selectedSourceId }, { orderBy: 'sortOrder', order: 'asc', limit: 100 });
      const categories = categoryResult.data?.list || [];
      console.log('[PageConfig] 学习路径分类:', categories.length, '个');
      
      // 2. 统一使用 sourceId（_id）查询课程和培训班
      const [coursesResult, classesResult] = await Promise.all([
        adminService.list('courses', { sourceId: selectedSourceId }, { limit: 1000 }),
        adminService.list('classes', { sourceId: selectedSourceId }, { limit: 1000 })
      ]);
      
      const allCourses = coursesResult.data?.list || [];
      const allClasses = classesResult.data?.list || [];
      console.log('[PageConfig] 课程总数:', allCourses.length, '培训班总数:', allClasses.length);
      
      // 3. 按分类组织：每个分类匹配对应的课程和培训班
      const pathGroups: LearningPathGroup[] = categories.map((cat: any) => {
        // 匹配属于该分类的课程（通过 categoryId 或 categoryName）
        const matchedCourses = allCourses.filter((c: any) => 
          c.categoryId === cat._id || c.categoryId === cat.code || c.category === cat.name
        );
        // 匹配属于该分类的培训班（通过 category 字段匹配分类 name）
        const matchedClasses = allClasses.filter((cls: any) => 
          cls.category === cat.name || cls.categoryId === cat._id || cls.categoryId === cat.code
        );
        
        return {
          _id: cat._id,
          name: cat.name,
          icon: cat.icon || '',
          order: cat.sortOrder || 0,
          sourceId: selectedSourceId,  // 保存体系ID用于小程序过滤
          courses: matchedCourses.map((c: any) => ({ ...c, id: c._id })),
          classes: matchedClasses.map((c: any) => ({ ...c, id: c._id })),
          visible: true
        };
      }).filter((g: LearningPathGroup) => g.courses.length > 0 || g.classes.length > 0);
      
      console.log('[PageConfig] 学习路径分组:', pathGroups);
      setLearningPaths(pathGroups);
      setLearningPathConfigs(pathGroups);
    } catch (error) {
      console.error('[PageConfig] loadLearningPaths error:', error);
      setLearningPaths([]);
      setLearningPathConfigs([]);
    }
  };

  // ==================== 内容配置管理 ====================
  
  // 加载热门课程配置
  const loadCourseConfigs = async () => {
    try {
      // 按体系使用独立的集合名
      const collectionName = `page_configs_${selectedSource}`;
      const result = await adminService.list(collectionName, { section: 'courses' }, { limit: 1 });
      if (result.data?.list && result.data.list.length > 0) {
        const config = result.data.list[0];
        if (config.data?.items && Array.isArray(config.data.items) && config.data.items.length > 0) {
          setCourseConfigs(config.data.items);
          return;
        }
      }
      // 无配置时自动从课程生成默认配置
      const defaultItems = courses.map((c, index) => ({
        _id: c._id,
        title: c.title,
        sourceCode: c.sourceCode,
        categoryId: c.categoryId,
        status: c.status,
        order: index + 1,
        visible: true
      }));
      setCourseConfigs(defaultItems);
      // 自动保存默认配置
      if (defaultItems.length > 0) {
        await saveCourseConfigsDirect(defaultItems);
      }
    } catch (error) {
      console.error('加载课程配置失败:', error);
      const defaultItems = courses.map((c, index) => ({
        _id: c._id,
        title: c.title,
        sourceCode: c.sourceCode,
        categoryId: c.categoryId,
        status: c.status,
        order: index + 1,
        visible: true
      }));
      setCourseConfigs(defaultItems);
    }
  };

  // 直接保存课程配置（用于自动初始化）
  const saveCourseConfigsDirect = async (items: CourseConfigItem[]) => {
    try {
      const collectionName = `page_configs_${selectedSource}`;
      const result = await adminService.list(collectionName, { section: 'courses' }, { limit: 1 });
      const saveData = {
        section: 'courses',
        title: `热门课程配置 - ${selectedSource}`,
        enabled: true,
        order: 3,
        data: { items }
      };
      if (result.data?.list && result.data.list.length > 0) {
        await adminService.update(collectionName, result.data.list[0]._id, saveData);
      } else {
        await adminService.add(collectionName, saveData);
      }
    } catch (error) {
      console.error('自动保存课程配置失败:', error);
    }
  };

  // 保存热门课程配置
  const saveCourseConfigs = async () => {
    try {
      const collectionName = `page_configs_${selectedSource}`;
      const result = await adminService.list(collectionName, { section: 'courses' }, { limit: 1 });
      const saveData = {
        section: 'courses',
        title: `热门课程配置 - ${selectedSource}`,
        enabled: true,
        order: 3,
        data: { items: courseConfigs }
      };
      if (result.data?.list && result.data.list.length > 0) {
        await adminService.update(collectionName, result.data.list[0]._id, saveData);
      } else {
        await adminService.add(collectionName, saveData);
      }
      alert('保存成功');
    } catch (error) {
      console.error('保存课程配置失败:', error);
      alert('保存失败');
    }
  };

  // 加载培训班配置
  const loadClassConfigs = async () => {
    try {
      // 按体系使用独立的集合名
      const collectionName = `page_configs_${selectedSource}`;
      const result = await adminService.list(collectionName, { section: 'classes' }, { limit: 1 });
      if (result.data?.list && result.data.list.length > 0) {
        const config = result.data.list[0];
        if (config.data?.items && Array.isArray(config.data.items) && config.data.items.length > 0) {
          setClassConfigs(config.data.items);
          return;
        }
      }
      // 无配置时自动从培训班生成默认配置
      const defaultItems = classes.map((c, index) => ({
        _id: c._id,
        name: c.name,
        sourceCode: c.sourceCode,
        categoryId: c.categoryId,
        status: c.status,
        order: index + 1,
        visible: true
      }));
      setClassConfigs(defaultItems);
      // 自动保存默认配置
      if (defaultItems.length > 0) {
        await saveClassConfigsDirect(defaultItems);
      }
    } catch (error) {
      console.error('加载培训班配置失败:', error);
      const defaultItems = classes.map((c, index) => ({
        _id: c._id,
        name: c.name,
        sourceCode: c.sourceCode,
        categoryId: c.categoryId,
        status: c.status,
        order: index + 1,
        visible: true
      }));
      setClassConfigs(defaultItems);
    }
  };

  // 直接保存培训班配置
  const saveClassConfigsDirect = async (items: ClassConfigItem[]) => {
    try {
      const collectionName = `page_configs_${selectedSource}`;
      const result = await adminService.list(collectionName, { section: 'classes' }, { limit: 1 });
      const saveData = {
        section: 'classes',
        title: `培训班配置 - ${selectedSource}`,
        enabled: true,
        order: 4,
        data: { items }
      };
      if (result.data?.list && result.data.list.length > 0) {
        await adminService.update(collectionName, result.data.list[0]._id, saveData);
      } else {
        await adminService.add(collectionName, saveData);
      }
    } catch (error) {
      console.error('自动保存培训班配置失败:', error);
    }
  };

  // 保存培训班配置
  const saveClassConfigs = async () => {
    try {
      const collectionName = `page_configs_${selectedSource}`;
      const result = await adminService.list(collectionName, { section: 'classes' }, { limit: 1 });
      const saveData = {
        section: 'classes',
        title: `培训班配置 - ${selectedSource}`,
        enabled: true,
        order: 4,
        data: { items: classConfigs }
      };
      if (result.data?.list && result.data.list.length > 0) {
        await adminService.update(collectionName, result.data.list[0]._id, saveData);
      } else {
        await adminService.add(collectionName, saveData);
      }
      alert('保存成功');
    } catch (error) {
      console.error('保存培训班配置失败:', error);
      alert('保存失败');
    }
  };

  // 加载学习路径配置
  const loadLearningPathConfigs = async () => {
    try {
      // 按体系使用独立的集合名
      const collectionName = `page_configs_${selectedSource}`;
      const result = await adminService.list(collectionName, { section: 'learningPaths' }, { limit: 1 });
      
      if (result.data?.list && result.data.list.length > 0 && result.data.list[0].data?.items) {
        setLearningPathConfigs(result.data.list[0].data.items);
        return;
      }
      // 无配置时自动从学习路径生成默认配置
      const defaultItems = learningPaths.map((g, index) => ({
        ...g,
        order: index + 1,
        visible: true
      }));
      setLearningPathConfigs(defaultItems);
      // 自动保存默认配置
      if (defaultItems.length > 0) {
        await saveLearningPathConfigsDirect(defaultItems);
      }
    } catch (error) {
      console.error('加载学习路径配置失败:', error);
      const defaultItems = learningPaths.map((g, index) => ({
        ...g,
        order: index + 1,
        visible: true
      }));
      setLearningPathConfigs(defaultItems);
    }
  };

  // 直接保存学习路径配置
  const saveLearningPathConfigsDirect = async (items: LearningPathGroup[]) => {
    try {
      // 查找当前体系的配置
      const result = await adminService.list('page_configs', { section: 'learningPaths' }, { limit: 10 });
      let existingConfig = null;
      
      if (result.data?.list && result.data.list.length > 0) {
        for (const config of result.data.list) {
          if (config.data?.sourceCode === selectedSource) {
            existingConfig = config;
            break;
          }
        }
      }
      
      // 按体系使用独立的集合名
      const collectionName = `page_configs_${selectedSource}`;
      const saveData = {
        section: 'learningPaths',
        title: `学习路径配置 - ${selectedSource}`,
        enabled: true,
        order: 2,
        data: { items }
      };
      // 查找现有配置
      const existingResult = await adminService.list(collectionName, { section: 'learningPaths' }, { limit: 1 });
      if (existingResult.data?.list && existingResult.data.list.length > 0) {
        await adminService.update(collectionName, existingResult.data.list[0]._id, saveData);
      } else {
        await adminService.add(collectionName, saveData);
      }
    } catch (error) {
      console.error('自动保存学习路径配置失败:', error);
    }
  };

  // 保存学习路径配置
  const saveLearningPathConfigs = async () => {
    try {
      // 按体系使用独立的集合名
      const collectionName = `page_configs_${selectedSource}`;
      const saveData = {
        section: 'learningPaths',
        title: `学习路径配置 - ${selectedSource}`,
        enabled: true,
        order: 2,
        data: { items: learningPathConfigs }
      };
      
      // 查找现有配置
      const existingResult = await adminService.list(collectionName, { section: 'learningPaths' }, { limit: 1 });
      if (existingResult.data?.list && existingResult.data.list.length > 0) {
        await adminService.update(collectionName, existingResult.data.list[0]._id, saveData);
      } else {
        await adminService.add(collectionName, saveData);
      }
      alert('保存成功');
    } catch (error) {
      console.error('保存学习路径配置失败:', error);
      alert('保存失败');
    }
  };

  // 切换课程显示/隐藏
  const toggleCourseVisible = (index: number) => {
    const newConfigs = [...courseConfigs];
    newConfigs[index] = { ...newConfigs[index], visible: !newConfigs[index].visible };
    setCourseConfigs(newConfigs);
  };

  // 切换培训班显示/隐藏
  const toggleClassVisible = (index: number) => {
    const newConfigs = [...classConfigs];
    newConfigs[index] = { ...newConfigs[index], visible: !newConfigs[index].visible };
    setClassConfigs(newConfigs);
  };

  // 切换学习路径显示/隐藏
  const toggleLearningPathVisible = (index: number) => {
    const newConfigs = [...learningPathConfigs];
    newConfigs[index] = { ...newConfigs[index], visible: !newConfigs[index].visible };
    setLearningPathConfigs(newConfigs);
  };

  // 调整课程顺序
  const moveCourse = (index: number, direction: 'up' | 'down') => {
    const newConfigs = [...courseConfigs];
    if (direction === 'up' && index > 0) {
      [newConfigs[index - 1], newConfigs[index]] = [newConfigs[index], newConfigs[index - 1]];
    } else if (direction === 'down' && index < newConfigs.length - 1) {
      [newConfigs[index], newConfigs[index + 1]] = [newConfigs[index + 1], newConfigs[index]];
    }
    // 更新顺序号
    newConfigs.forEach((item, i) => {
      item.order = i + 1;
    });
    setCourseConfigs(newConfigs);
  };

  // 调整培训班顺序
  const moveClass = (index: number, direction: 'up' | 'down') => {
    const newConfigs = [...classConfigs];
    if (direction === 'up' && index > 0) {
      [newConfigs[index - 1], newConfigs[index]] = [newConfigs[index], newConfigs[index - 1]];
    } else if (direction === 'down' && index < newConfigs.length - 1) {
      [newConfigs[index], newConfigs[index + 1]] = [newConfigs[index + 1], newConfigs[index]];
    }
    // 更新顺序号
    newConfigs.forEach((item, i) => {
      item.order = i + 1;
    });
    setClassConfigs(newConfigs);
  };

  // 调整学习路径顺序
  const moveLearningPath = (index: number, direction: 'up' | 'down') => {
    const newConfigs = [...learningPathConfigs];
    if (direction === 'up' && index > 0) {
      [newConfigs[index - 1], newConfigs[index]] = [newConfigs[index], newConfigs[index - 1]];
    } else if (direction === 'down' && index < newConfigs.length - 1) {
      [newConfigs[index], newConfigs[index + 1]] = [newConfigs[index + 1], newConfigs[index]];
    }
    // 更新顺序号
    newConfigs.forEach((item, i) => {
      item.order = i + 1;
    });
    setLearningPathConfigs(newConfigs);
  };

  // 保存
  const handleSave = async () => {
    setSaving(true);
    try {
      const collection = editItem.collection || getCollectionName();
      // 移除不必要的字段
      const { collection: _, id, ...saveData } = editItem;
      
      console.log('[PageConfig] 保存数据:', { collection, saveData });
      
      if (editItem._id) {
        await adminService.update(collection, editItem._id, saveData);
      } else {
        await adminService.add(collection, saveData);
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // 删除
  const handleDelete = async (item: any) => {
    if (!confirm(`确定要删除 "${item.title || item.name || item._id}" 吗？`)) return;
    try {
      await adminService.delete(getCollectionName(), item._id || item.id);
      loadData();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 切换状态
  const handleToggleStatus = async (item: any) => {
    const newStatus = item.status === 'active' || item.status === 'published' ? 'inactive' : 'active';
    try {
      await adminService.update(getCollectionName(), item._id || item.id, { status: newStatus });
      loadData();
    } catch (error) {
      console.error('状态切换失败:', error);
    }
  };

  const getCollectionName = () => {
    switch (activeTab) {
      case 'hero':
      case 'stats':
      case 'features':
      case 'contact':
      case 'footer':
        return 'page_configs';
      case 'banners': return 'banners';
      case 'notices': return 'notices';
      case 'courses': return 'courses';
      case 'classes': return 'classes';
      case 'learningPaths': return 'learning_paths';
      default: return '';
    }
  };

  const openAddModal = () => {
    setEditItem(getDefaultItem());
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditItem({ ...item, collection: getCollectionName() });
    setModalOpen(true);
  };

  const getDefaultItem = () => {
    const base = {
      collection: getCollectionName(),
      status: 'active',
      order: 1,
    };
    if (activeTab === 'banners') {
      return { ...base, title: '', subtitle: '', image: '', link: '/courses', order: banners.length + 1 };
    }
    if (activeTab === 'notices') {
      return { ...base, title: '', content: '', type: 'general', isPinned: false };
    }
    if (activeTab === 'courses' || activeTab === 'classes' || activeTab === 'learningPaths') {
      return { ...base, sourceCode: selectedSource, categoryId: '', title: '', name: '' };
    }
    return base;
  };

  // 获取内容所属的体系名称
  const getSourceName = (item: any) => {
    if (item.sourceCode) {
      const source = sources.find(s => s.code === item.sourceCode);
      return source?.name || item.sourceCode;
    }
    return '通用';
  };

  // 全局配置 Tab
  const globalTabs = [
    { key: 'hero', label: 'Hero区域', icon: Layout },
    { key: 'banners', label: '轮播图', icon: Image },
    { key: 'notices', label: '公告', icon: Bell },
    { key: 'stats', label: '统计概览', icon: BarChart3 },
    { key: 'features', label: '特色优势', icon: Sparkles },
    { key: 'contact', label: '联系我们', icon: Phone },
    { key: 'footer', label: '页脚信息', icon: Footprints },
  ];

  // 体系配置 Tab
  const sourceTabs = [
    { key: 'learningPaths', label: '学习路径', icon: Route },
    { key: 'courses', label: '热门课程', icon: Star },
    { key: 'classes', label: '最新开班', icon: Calendar },
  ];

  // 合并所有 tabs 用于兼容
  const tabs = [...globalTabs, ...sourceTabs].map(t => ({
    ...t,
    global: !sourceTabs.find(st => st.key === t.key)
  }));

  const renderGlobalBadge = (global: boolean) => {
    if (!global) return null;
    return <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">全局</span>;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">页面配置管理</h1>
          <p className="text-gray-500 mt-1">管理首页展示内容</p>
        </div>

        {/* 体系选择器 - 体系配置区域显示 */}
        {sourceTabs.find(t => t.key === activeTab) && (
          <div className="mb-4 flex items-center gap-4">
            <span className="text-gray-600">切换体系：</span>
            <div className="flex gap-2">
              {sources.length === 0 ? (
                <span className="text-gray-400">暂无体系数据</span>
              ) : (
                sources.map((source) => (
                  <button
                    key={source.code}
                    onClick={() => {
                      setSelectedSource(source.code);
                      setSelectedSourceId(source._id || '');
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedSource === source.code
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border'
                    }`}
                  >
                    {source.icon} {source.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 切换 - 分全局和体系两部分 */}
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          {/* 全局配置行 */}
          <div className="border-b">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">公共配置</span>
            </div>
            <div className="flex overflow-x-auto">
              {globalTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as TabType)}
                    className={`flex items-center gap-2 px-5 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
                      isActive
                        ? 'text-blue-600 border-blue-600 bg-blue-50'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* 体系配置行 */}
          <div>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">体系配置</span>
              {!['hero', 'banners', 'notices'].includes(activeTab) && selectedSource && (
                <span className="ml-2 text-xs text-blue-600 font-medium">
                  当前：{sources.find(s => s.code === selectedSource)?.name}
                </span>
              )}
            </div>
            <div className="flex overflow-x-auto">
              {sourceTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as TabType)}
                    className={`flex items-center gap-2 px-5 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
                      isActive
                        ? 'text-blue-600 border-blue-600 bg-blue-50'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 内容区 */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {tabs.find(t => t.key === activeTab)?.label}
              {!tabs.find(t => t.key === activeTab)?.global && selectedSource && (
                <span className="ml-2 text-sm text-gray-500">
                  - {sources.find(s => s.code === selectedSource)?.name}
                </span>
              )}
            </h2>
            {(activeTab === 'banners' || activeTab === 'notices') && (
              <Button onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-1" /> 添加
              </Button>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loading text="加载中..." />
            </div>
          ) : (
            <div className="p-4">
              {/* 调试面板 - 开发时可见 */}
              {debugInfo.length > 0 && (
                <details className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                  <summary className="cursor-pointer font-bold text-yellow-700">🔧 API 诊断信息</summary>
                  <pre className="mt-2 p-2 bg-white rounded overflow-auto max-h-60 text-gray-700">
                    {JSON.stringify(debugInfo[debugInfo.length - 1], null, 2)}
                  </pre>
                </details>
              )}
              
              {/* ==================== Hero 区域配置 ==================== */}
              {activeTab === 'hero' && heroConfig && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>Hero 区域</strong>：控制首页顶部主区域的显示内容，包括主标题、副标题、描述文字、按钮文案等。
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Logo 设置 */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700 border-b pb-2">Logo 设置</h3>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">图标类型</label>
                        <select 
                          className="w-full px-3 py-2 border rounded-lg"
                          value={heroConfig.logoIcon}
                          onChange={(e) => setHeroConfig({...heroConfig, logoIcon: e.target.value})}
                        >
                          <option value="Plane">飞机</option>
                          <option value="Drone">无人机</option>
                          <option value="GraduationCap">毕业帽</option>
                          <option value="Award">奖杯</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Logo 文字</label>
                        <Input 
                          value={heroConfig.logoText}
                          onChange={(e) => setHeroConfig({...heroConfig, logoText: e.target.value})}
                          placeholder="例如：无人机培训中心"
                        />
                      </div>
                    </div>

                    {/* 标题设置 */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700 border-b pb-2">标题设置</h3>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">主标题</label>
                        <Input 
                          value={heroConfig.mainTitle}
                          onChange={(e) => setHeroConfig({...heroConfig, mainTitle: e.target.value})}
                          placeholder="例如：翱翔蓝天"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">副标题</label>
                        <Input 
                          value={heroConfig.subTitle}
                          onChange={(e) => setHeroConfig({...heroConfig, subTitle: e.target.value})}
                          placeholder="例如：成就飞行梦想"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 描述文字 */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">描述文字（支持换行）</label>
                    <textarea 
                      className="w-full px-3 py-2 border rounded-lg min-h-[80px]"
                      value={heroConfig.description}
                      onChange={(e) => setHeroConfig({...heroConfig, description: e.target.value})}
                      placeholder="描述文字，每行一段"
                    />
                  </div>

                  {/* 按钮文案 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">主要按钮文字</label>
                      <Input 
                        value={heroConfig.ctaPrimaryText}
                        onChange={(e) => setHeroConfig({...heroConfig, ctaPrimaryText: e.target.value})}
                        placeholder="例如：查看课程"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">次要按钮文字</label>
                      <Input 
                        value={heroConfig.ctaSecondaryText}
                        onChange={(e) => setHeroConfig({...heroConfig, ctaSecondaryText: e.target.value})}
                        placeholder="例如：预约试听"
                      />
                    </div>
                  </div>

                  {/* 图片设置 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">背景图片URL</label>
                      <Input 
                        value={heroConfig.backgroundImage}
                        onChange={(e) => setHeroConfig({...heroConfig, backgroundImage: e.target.value})}
                        placeholder="背景图片URL"
                      />
                      {heroConfig.backgroundImage && (
                        <img src={heroConfig.backgroundImage} alt="背景预览" className="mt-2 w-full h-32 object-cover rounded-lg" />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">特色图片URL</label>
                      <Input 
                        value={heroConfig.featureImage}
                        onChange={(e) => setHeroConfig({...heroConfig, featureImage: e.target.value})}
                        placeholder="右侧特色图片URL"
                      />
                      {heroConfig.featureImage && (
                        <img src={heroConfig.featureImage} alt="特色图片预览" className="mt-2 w-full h-32 object-cover rounded-lg" />
                      )}
                    </div>
                  </div>

                  {/* 信任标识 */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">信任标识（逗号分隔）</label>
                    <Input 
                      value={heroConfig.trustBadges.join('、')}
                      onChange={(e) => setHeroConfig({...heroConfig, trustBadges: e.target.value.split(/[、,，]/).filter(Boolean)})}
                      placeholder="例如：官方认证、不过退费、推荐就业"
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {heroConfig.trustBadges.map((badge, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 预览和保存 */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={loadHeroConfig}>重置</Button>
                    <Button onClick={saveHeroConfig}>保存配置</Button>
                  </div>
                </div>
              )}

              {activeTab === 'banners' && (
                <div className="space-y-3">
                  {banners.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">暂无轮播图，点击添加</p>
                  ) : (
                    banners.map((banner) => (
                      <div key={banner._id || banner.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <img src={banner.image} alt={banner.title} className="w-24 h-16 object-cover rounded" />
                        <div className="flex-1">
                          <p className="font-medium">{banner.title}</p>
                          <p className="text-sm text-gray-500">{banner.subtitle}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${banner.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                          {banner.status === 'active' ? '启用' : '禁用'}
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(banner)}>
                            {banner.status === 'active' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(banner)}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(banner)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'notices' && (
                <div className="space-y-3">
                  {notices.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">暂无公告，点击添加</p>
                  ) : (
                    notices.map((notice) => (
                      <div key={notice._id || notice.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <Bell className="w-5 h-5 text-blue-500" />
                        <div className="flex-1">
                          <p className="font-medium">{notice.title}</p>
                          <p className="text-sm text-gray-500 truncate">{notice.content}</p>
                        </div>
                        {notice.isPinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">置顶</span>}
                        <span className={`px-2 py-1 text-xs rounded ${notice.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                          {notice.status === 'published' ? '已发布' : '草稿'}
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(notice)}>
                            {notice.status === 'published' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(notice)}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(notice)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ==================== 统计概览（Stats）配置 ==================== */}
              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>统计概览</strong>：控制首页显示的数据统计卡片，如累计学员、持证飞行员等数据。
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {stats.map((stat, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1 grid grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">标签</label>
                            <Input 
                              value={stat.label}
                              onChange={(e) => updateStat(index, 'label', e.target.value)}
                              placeholder="如：累计学员"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">数值</label>
                            <Input 
                              value={stat.value}
                              onChange={(e) => updateStat(index, 'value', e.target.value)}
                              placeholder="如：5,000+"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">图标</label>
                            <select 
                              className="w-full px-3 py-2 border rounded-lg"
                              value={stat.icon}
                              onChange={(e) => updateStat(index, 'icon', e.target.value)}
                            >
                              <option value="Users">用户</option>
                              <option value="Award">奖杯</option>
                              <option value="Globe">地球</option>
                              <option value="Clock">时钟</option>
                              <option value="BookOpen">书本</option>
                              <option value="GraduationCap">毕业帽</option>
                              <option value="Plane">飞机</option>
                              <option value="Star">星星</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">颜色</label>
                            <select 
                              className="w-full px-3 py-2 border rounded-lg"
                              value={stat.color}
                              onChange={(e) => updateStat(index, 'color', e.target.value)}
                            >
                              <option value="blue">蓝色</option>
                              <option value="amber">琥珀色</option>
                              <option value="emerald">翠绿色</option>
                              <option value="purple">紫色</option>
                              <option value="rose">玫瑰色</option>
                              <option value="cyan">青色</option>
                            </select>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeStat(index)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={addStat}>
                      <Plus className="w-4 h-4 mr-1" /> 添加统计项
                    </Button>
                  </div>
                  
                  {/* 预览 */}
                  {stats.length > 0 && (
                    <div className="mt-6 p-4 bg-slate-100 rounded-lg">
                      <p className="text-sm font-medium text-gray-600 mb-3">预览：</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats.slice(0, 4).map((stat, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg text-center shadow-sm">
                            <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${
                              stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                              stat.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                              stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                              stat.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                              stat.color === 'rose' ? 'bg-rose-100 text-rose-600' :
                              'bg-cyan-100 text-cyan-600'
                            }`}>
                              {stat.icon === 'Users' ? '👥' : stat.icon === 'Award' ? '🏆' : 
                               stat.icon === 'Globe' ? '🌍' : stat.icon === 'Clock' ? '⏰' :
                               stat.icon === 'BookOpen' ? '📖' : stat.icon === 'GraduationCap' ? '🎓' :
                               stat.icon === 'Plane' ? '✈️' : '⭐'}
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                            <p className="text-sm text-gray-500">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 保存 */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={loadStats}>重置</Button>
                    <Button onClick={saveStats}>保存配置</Button>
                  </div>
                </div>
              )}

              {/* ==================== 特色优势（Features）配置 ==================== */}
              {activeTab === 'features' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>特色优势</strong>：控制首页展示的特色优势卡片，如官方认证资质、专业教学团队等。
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">图标</label>
                            <select 
                              className="w-full px-3 py-2 border rounded-lg"
                              value={feature.icon}
                              onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                            >
                              <option value="Shield">盾牌</option>
                              <option value="GraduationCap">毕业帽</option>
                              <option value="BarChart3">图表</option>
                              <option value="Target">目标</option>
                              <option value="BookOpen">书本</option>
                              <option value="Award">奖杯</option>
                              <option value="Users">用户</option>
                              <option value="Star">星星</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">标题</label>
                            <Input 
                              value={feature.title}
                              onChange={(e) => updateFeature(index, 'title', e.target.value)}
                              placeholder="如：官方认证资质"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">描述</label>
                            <Input 
                              value={feature.description}
                              onChange={(e) => updateFeature(index, 'description', e.target.value)}
                              placeholder="如：中国航空运输协会认证培训机构"
                            />
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeFeature(index)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={addFeature}>
                      <Plus className="w-4 h-4 mr-1" /> 添加特色项
                    </Button>
                  </div>
                  
                  {/* 预览 */}
                  {features.length > 0 && (
                    <div className="mt-6 p-4 bg-slate-100 rounded-lg">
                      <p className="text-sm font-medium text-gray-600 mb-3">预览：</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {features.slice(0, 4).map((feature, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg text-center shadow-sm">
                            <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                              {feature.icon === 'Shield' ? '🛡️' : feature.icon === 'GraduationCap' ? '🎓' : 
                               feature.icon === 'BarChart3' ? '📊' : feature.icon === 'Target' ? '🎯' :
                               feature.icon === 'BookOpen' ? '📖' : feature.icon === 'Award' ? '🏆' :
                               feature.icon === 'Users' ? '👥' : '⭐'}
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-1">{feature.title || '标题'}</h3>
                            <p className="text-sm text-gray-500">{feature.description || '描述'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 保存 */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={loadFeatures}>重置</Button>
                    <Button onClick={saveFeatures}>保存配置</Button>
                  </div>
                </div>
              )}

              {/* ==================== 联系我们（Contact）配置 ==================== */}
              {activeTab === 'contact' && contact && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>联系我们</strong>：控制首页底部的联系信息区域，包括标题、描述和按钮文案。
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700 border-b pb-2">联系信息</h3>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">标题</label>
                        <Input 
                          value={contact.title}
                          onChange={(e) => setContact({...contact, title: e.target.value})}
                          placeholder="如：准备好开始您的飞行之旅了吗？"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">描述（支持换行）</label>
                        <textarea 
                          className="w-full px-3 py-2 border rounded-lg min-h-[100px]"
                          value={contact.description}
                          onChange={(e) => setContact({...contact, description: e.target.value})}
                          placeholder="描述文字，每行一段"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700 border-b pb-2">按钮文案</h3>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">主要按钮文字</label>
                        <Input 
                          value={contact.ctaPrimaryText}
                          onChange={(e) => setContact({...contact, ctaPrimaryText: e.target.value})}
                          placeholder="如：立即报名"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">次要按钮文字</label>
                        <Input 
                          value={contact.ctaSecondaryText}
                          onChange={(e) => setContact({...contact, ctaSecondaryText: e.target.value})}
                          placeholder="如：了解更多"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* 预览 */}
                  <div className="mt-6 p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg">
                    <p className="text-sm font-medium text-white/80 mb-3">预览：</p>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
                      <h3 className="text-2xl font-bold text-white mb-3">{contact.title}</h3>
                      <div className="text-white/80 mb-6 space-y-1">
                        {contact.description.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                      <div className="flex justify-center gap-4">
                        <Button className="bg-white text-blue-600 hover:bg-white/90">
                          {contact.ctaPrimaryText}
                        </Button>
                        <Button variant="outline" className="text-white border-white hover:bg-white/10">
                          {contact.ctaSecondaryText}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 保存 */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={loadContact}>重置</Button>
                    <Button onClick={saveContact}>保存配置</Button>
                  </div>
                </div>
              )}

              {/* ==================== 页脚信息（Footer）配置 ==================== */}
              {activeTab === 'footer' && footer && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>页脚信息</strong>：控制首页底部的页脚区域，包括机构信息、联系方式、快速链接和版权信息。
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700 border-b pb-2">基本信息</h3>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">机构名称</label>
                        <Input 
                          value={footer.logoText}
                          onChange={(e) => setFooter({...footer, logoText: e.target.value})}
                          placeholder="如：无人机培训中心"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">机构描述</label>
                        <textarea 
                          className="w-full px-3 py-2 border rounded-lg min-h-[80px]"
                          value={footer.description}
                          onChange={(e) => setFooter({...footer, description: e.target.value})}
                          placeholder="机构描述"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">联系电话</label>
                        <Input 
                          value={footer.phone}
                          onChange={(e) => setFooter({...footer, phone: e.target.value})}
                          placeholder="如：400-888-8888"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">邮箱</label>
                        <Input 
                          value={footer.email}
                          onChange={(e) => setFooter({...footer, email: e.target.value})}
                          placeholder="如：info@drone-train.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">地址</label>
                        <Input 
                          value={footer.address}
                          onChange={(e) => setFooter({...footer, address: e.target.value})}
                          placeholder="如：北京市朝阳区航空路88号"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-medium text-gray-700">快速链接</h3>
                        <Button size="sm" variant="outline" onClick={addQuickLink}>
                          <Plus className="w-4 h-4 mr-1" /> 添加
                        </Button>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {footer.quickLinks.map((link, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <Input 
                              value={link.label}
                              onChange={(e) => updateQuickLink(index, 'label', e.target.value)}
                              placeholder="链接名称"
                              className="flex-1"
                            />
                            <Input 
                              value={link.path}
                              onChange={(e) => updateQuickLink(index, 'path', e.target.value)}
                              placeholder="/courses"
                              className="flex-1"
                            />
                            <Button size="sm" variant="ghost" onClick={() => removeQuickLink(index)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-4 border-t space-y-4">
                        <h3 className="font-medium text-gray-700">版权信息</h3>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">版权文字</label>
                          <Input 
                            value={footer.copyright}
                            onChange={(e) => setFooter({...footer, copyright: e.target.value})}
                            placeholder="如：© 2024 无人机培训中心 版权所有"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">ICP备案号</label>
                          <Input 
                            value={footer.icp}
                            onChange={(e) => setFooter({...footer, icp: e.target.value})}
                            placeholder="如：京ICP备XXXXXXXX号"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 预览 */}
                  <div className="mt-6 p-4 bg-gray-900 rounded-lg">
                    <p className="text-sm font-medium text-white/80 mb-3">预览：</p>
                    <div className="bg-gray-800 rounded-lg p-6">
                      <div className="flex flex-wrap gap-8">
                        <div className="flex-1 min-w-[200px]">
                          <h3 className="text-white font-bold mb-2">{footer.logoText}</h3>
                          <p className="text-gray-400 text-sm mb-3">{footer.description}</p>
                          <div className="space-y-1 text-sm text-gray-400">
                            {footer.phone && <p>📞 {footer.phone}</p>}
                            {footer.email && <p>✉️ {footer.email}</p>}
                            {footer.address && <p>📍 {footer.address}</p>}
                          </div>
                        </div>
                        <div className="min-w-[150px]">
                          <h4 className="text-white font-medium mb-3">快速链接</h4>
                          <div className="space-y-2">
                            {footer.quickLinks.slice(0, 4).map((link, index) => (
                              <p key={index} className="text-gray-400 text-sm hover:text-white cursor-pointer">{link.label}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-gray-700 text-center text-gray-500 text-sm">
                        <p>{footer.copyright}</p>
                        {footer.icp && <p className="mt-1">{footer.icp}</p>}
                      </div>
                    </div>
                  </div>
                  
                  {/* 保存 */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={loadFooter}>重置</Button>
                    <Button onClick={saveFooter}>保存配置</Button>
                  </div>
                </div>
              )}

              {(activeTab === 'courses' || activeTab === 'classes' || activeTab === 'learningPaths') && (
                <div className="space-y-3">
                  {/* ==================== 热门课程配置 ==================== */}
                  {activeTab === 'courses' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-700">
                          <strong>热门课程配置</strong>：控制首页展示的热门课程，支持显示/隐藏和顺序调整。
                        </p>
                      </div>
                      
                      {courseConfigs.length === 0 && courses.length === 0 && (
                        <p className="text-gray-500 text-center py-8">暂无课程</p>
                      )}
                      
                      {courseConfigs.length > 0 && courseConfigs.map((course, index) => (
                        <div key={course._id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                          course.visible ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-300 opacity-60'
                        }`}>
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                          <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-medium text-gray-600">
                            {course.order}
                          </span>
                          <Star className={`w-5 h-5 ${course.visible ? 'text-amber-500' : 'text-gray-400'}`} />
                          <div className="flex-1">
                            <p className={`font-medium ${course.visible ? 'text-gray-900' : 'text-gray-500'}`}>{course.title}</p>
                            <p className="text-xs text-gray-500">{getSourceName(course)}</p>
                          </div>
                          {getSourceName(course) === '通用' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">通用</span>}
                          <span className={`px-2 py-1 text-xs rounded ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}>
                            {course.status === 'published' ? '已发布' : '草稿'}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => moveCourse(index, 'up')} disabled={index === 0}>
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => moveCourse(index, 'down')} disabled={index === courseConfigs.length - 1}>
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => toggleCourseVisible(index)}
                            title={course.visible ? '隐藏' : '显示'}
                          >
                            {course.visible ? <Eye className="w-5 h-5 text-green-600" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                          </Button>
                        </div>
                      ))}

                      {courseConfigs.length > 0 && (
                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button variant="outline" onClick={loadCourseConfigs}>重置</Button>
                          <Button onClick={saveCourseConfigs}>保存配置</Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ==================== 培训班配置 ==================== */}
                  {activeTab === 'classes' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-700">
                          <strong>培训班配置</strong>：控制首页展示的培训班，支持显示/隐藏和顺序调整。
                        </p>
                      </div>
                      
                      {classConfigs.length === 0 && classes.length === 0 && (
                        <p className="text-gray-500 text-center py-8">暂无班级</p>
                      )}
                      
                      {classConfigs.length > 0 && classConfigs.map((cls, index) => (
                        <div key={cls._id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                          cls.visible ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-300 opacity-60'
                        }`}>
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                          <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-medium text-gray-600">
                            {cls.order}
                          </span>
                          <Calendar className={`w-5 h-5 ${cls.visible ? 'text-green-500' : 'text-gray-400'}`} />
                          <div className="flex-1">
                            <p className={`font-medium ${cls.visible ? 'text-gray-900' : 'text-gray-500'}`}>{cls.name}</p>
                            <p className="text-xs text-gray-500">{getSourceName(cls)}</p>
                          </div>
                          {getSourceName(cls) === '通用' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">通用</span>}
                          <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-600">{cls.status}</span>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => moveClass(index, 'up')} disabled={index === 0}>
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => moveClass(index, 'down')} disabled={index === classConfigs.length - 1}>
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => toggleClassVisible(index)}
                            title={cls.visible ? '隐藏' : '显示'}
                          >
                            {cls.visible ? <Eye className="w-5 h-5 text-green-600" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                          </Button>
                        </div>
                      ))}

                      {classConfigs.length > 0 && (
                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button variant="outline" onClick={loadClassConfigs}>重置</Button>
                          <Button onClick={saveClassConfigs}>保存配置</Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ==================== 学习路径配置 ==================== */}
                  {activeTab === 'learningPaths' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-700">
                          <strong>学习路径配置</strong>：控制首页展示的学习路径，支持显示/隐藏和顺序调整。
                        </p>
                      </div>
                      
                      {learningPathConfigs.length === 0 && learningPaths.length === 0 && (
                        <p className="text-gray-500 text-center py-8">暂无学习路径</p>
                      )}
                      
                      {learningPathConfigs.length > 0 && learningPathConfigs.map((group, index) => (
                        <div key={group._id} className={`mb-4 p-4 rounded-lg border ${
                          group.visible ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-300 opacity-60'
                        }`}>
                          <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-200">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                            <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-medium text-gray-600">
                              {group.order || index + 1}
                            </span>
                            <span className="text-xl">{group.icon || '📁'}</span>
                            <h3 className={`font-semibold ${group.visible ? 'text-gray-800' : 'text-gray-500'}`}>{group.name}</h3>
                            <span className="text-xs text-gray-500">
                              {group.courses.length} 个课程，{group.classes.length} 个培训班
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => moveLearningPath(index, 'up')} disabled={index === 0}>
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => moveLearningPath(index, 'down')} disabled={index === learningPathConfigs.length - 1}>
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => toggleLearningPathVisible(index)}
                              title={group.visible ? '隐藏' : '显示'}
                            >
                              {group.visible ? <Eye className="w-5 h-5 text-green-600" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                            </Button>
                          </div>
                          {group.courses.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-500 mb-1">课程：</p>
                              <div className="flex flex-wrap gap-2">
                                {group.courses.map((course) => (
                                  <span key={course._id} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    {course.title}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {group.classes.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">培训班：</p>
                              <div className="flex flex-wrap gap-2">
                                {group.classes.map((cls) => (
                                  <span key={cls._id} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                    {cls.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {learningPathConfigs.length > 0 && (
                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button variant="outline" onClick={loadLearningPathConfigs}>重置</Button>
                          <Button onClick={saveLearningPathConfigs}>保存配置</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 添加/编辑弹窗 */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem?._id ? '编辑' : '添加'}>
        <div className="space-y-4">
          {activeTab === 'banners' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">标题</label>
                <Input value={editItem?.title || ''} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">副标题</label>
                <Input value={editItem?.subtitle || ''} onChange={(e) => setEditItem({ ...editItem, subtitle: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">图片</label>
                <ImageUploader value={editItem?.image || ''} onChange={(url) => setEditItem({ ...editItem, image: url })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">链接</label>
                <Input value={editItem?.link || ''} onChange={(e) => setEditItem({ ...editItem, link: e.target.value })} placeholder="/courses" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">排序</label>
                <Input type="number" value={editItem?.order || 1} onChange={(e) => setEditItem({ ...editItem, order: parseInt(e.target.value) })} />
              </div>
            </>
          )}

          {activeTab === 'notices' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">标题</label>
                <Input value={editItem?.title || ''} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">内容</label>
                <TextArea value={editItem?.content || ''} onChange={(e) => setEditItem({ ...editItem, content: e.target.value })} rows={4} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">类型</label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={editItem?.type || 'general'}
                  onChange={(e) => setEditItem({ ...editItem, type: e.target.value })}
                >
                  <option value="general">普通</option>
                  <option value="system">系统</option>
                  <option value="class">班级</option>
                  <option value="course">课程</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isPinned"
                  checked={editItem?.isPinned || false}
                  onChange={(e) => setEditItem({ ...editItem, isPinned: e.target.checked })}
                />
                <label htmlFor="isPinned">置顶</label>
              </div>
            </>
          )}

          {(activeTab === 'courses' || activeTab === 'classes' || activeTab === 'learningPaths') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">名称</label>
                <Input 
                  value={editItem?.name || editItem?.title || ''} 
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value, title: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">关联体系</label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={editItem?.sourceCode || ''}
                  onChange={(e) => setEditItem({ ...editItem, sourceCode: e.target.value })}
                >
                  <option value="">通用（所有体系可见）</option>
                  {sources.map((s) => (
                    <option key={s.code} value={s.code}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
