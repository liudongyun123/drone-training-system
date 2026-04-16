// ============================================================================
// 页面配置管理 - 首页内容管理组件
// ============================================================================
import { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Plus, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
  Image as ImageIcon,
  Star,
  GraduationCap,
  Map,
  Link as LinkIcon,
  Bell,
  ExternalLink,
  Search,
  BarChart3,
  School,
} from 'lucide-react';
import { Button, Card, Input, TextArea, Loading, Modal } from '@/components';
import { pageConfigService, defaultPageConfig, type PageConfig, type HeroConfig, type StatItem, type FeatureItem, type FooterConfig } from '@/services/pageConfigService';
import { CloudBannerAdminService, CloudNoticeAdminService } from '@/services/CloudAdminService';
import { CloudCourseService } from '@/services/CloudCourseService';
import { CloudAdminService } from '@/services/CloudAdminService';
import { featuredClassService } from '@/services/featuredClassService';
import { featuredPathService } from '@/services/featuredPathService';
import { CloudLearningPathAdminService } from '@/services/CloudAdminService';
import ImageUploader from './ImageUploader';
import type { Course } from '@/types';
import type { Class } from '@/types/class';

type SectionType = PageConfig['section'] | 'banners';

// 轮播图接口
interface BannerItem {
  id?: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  courseId: string;
  order: number;
  status: 'active' | 'inactive';
}

// 公告接口 - 完整版
type NoticeType = 'class' | 'course' | 'general' | 'system';
type NoticeStatus = 'draft' | 'published' | 'expired';
type NoticePriority = 'low' | 'medium' | 'high';
type NoticeTarget = 'all' | 'vip' | 'new';
type LinkType = 'none' | 'classRegistration' | 'coursePurchase' | 'custom';
type PopupStyle = 'banner' | 'modal' | 'toast';

interface NoticeItem {
  id?: string;
  _id?: string;
  title: string;
  content: string;
  type: NoticeType;
  priority: NoticePriority;
  status: NoticeStatus;
  target: NoticeTarget;
  isPinned?: boolean;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
  updatedAt?: string;
  // 链接功能
  linkType?: LinkType;
  linkId?: string;
  linkUrl?: string;
  linkText?: string;
  // 弹窗功能
  showAsPopup?: boolean;
  isPopupEnabled?: boolean;
  popupStyle?: PopupStyle;
  // 统计数据
  views?: number;
  clicks?: number;
}

interface ClassOption {
  id: string;
  name: string;
  status: string;
}

interface CourseOption {
  id: string;
  title: string;
  status: string;
}

interface SectionInfo {
  key: SectionType;
  label: string;
  icon: string;
  description: string;
}

const sections: SectionInfo[] = [
  { key: 'hero', label: 'Hero区域', icon: '🎯', description: '首屏大图区域，包含轮播图、标语和主按钮' },
  { key: 'learningPaths', label: '学习路径', icon: '🗺️', description: '入门课程、进阶训练、考证冲刺三个学习路径' },
  { key: 'featured', label: '热门课程', icon: '⭐', description: '首页热门课程展示，最多8个课程' },
  { key: 'openClasses', label: '最新开班', icon: '📅', description: '正在招生的班级展示，学员可快速报名' },
  { key: 'stats', label: '统计概览', icon: '📊', description: '数据统计卡片' },
  { key: 'notices', label: '最新公告', icon: '📢', description: '首页公告展示区域' },
  { key: 'features', label: '特色优势', icon: '✨', description: '为什么选择我们' },
  { key: 'contact', label: '联系我们', icon: '📞', description: '行动号召区域' },
  { key: 'footer', label: '页脚信息', icon: '📋', description: '底部联系信息和链接' },
];

// 图标映射
const iconOptions = [
  { value: 'Plane', label: '飞机' },
  { value: 'Users', label: '用户' },
  { value: 'Award', label: '奖章' },
  { value: 'Globe', label: '地球' },
  { value: 'Clock', label: '时钟' },
  { value: 'Shield', label: '盾牌' },
  { value: 'GraduationCap', label: '毕业帽' },
  { value: 'BarChart3', label: '图表' },
  { value: 'Target', label: '目标' },
  { value: 'BookOpen', label: '书籍' },
  { value: 'CheckCircle', label: '勾选' },
  { value: 'Phone', label: '电话' },
  { value: 'Mail', label: '邮件' },
  { value: 'MapPin', label: '位置' },
];

// 颜色选项
const colorOptions = [
  { value: 'blue', label: '蓝色', class: 'bg-blue-100 text-blue-600' },
  { value: 'amber', label: '橙色', class: 'bg-amber-100 text-amber-600' },
  { value: 'emerald', label: '绿色', class: 'bg-emerald-100 text-emerald-600' },
  { value: 'purple', label: '紫色', class: 'bg-purple-100 text-purple-600' },
  { value: 'rose', label: '玫瑰', class: 'bg-rose-100 text-rose-600' },
  { value: 'cyan', label: '青色', class: 'bg-cyan-100 text-cyan-600' },
];

export default function PageConfigManagement() {
  const [configs, setConfigs] = useState<PageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionType>('hero');
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // 轮播图相关状态
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerItem>({
    title: '',
    subtitle: '',
    image: '',
    link: '',
    courseId: '',
    order: 0,
    status: 'active',
  });

  // 公告相关状态
  const [noticesList, setNoticesList] = useState<NoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);
  const [noticePreviewOpen, setNoticePreviewOpen] = useState(false);
  const [previewNotice, setPreviewNotice] = useState<NoticeItem | null>(null);
  const [noticeForm, setNoticeForm] = useState<NoticeItem>({
    title: '',
    content: '',
    type: 'general',
    priority: 'medium',
    status: 'draft',
    target: 'all',
    isPinned: false,
    linkType: 'none',
    linkUrl: '',
    linkText: '查看详情',
    showAsPopup: false,
    isPopupEnabled: false,
    popupStyle: 'modal',
    startTime: '',
    endTime: '',
  });
  // 公告筛选
  const [noticeStatusFilter, setNoticeStatusFilter] = useState<string>('all');
  const [noticeTypeFilter, setNoticeTypeFilter] = useState<string>('all');
  const [noticeSearchText, setNoticeSearchText] = useState('');
  // 公告可选班级课程
  const [noticeAvailableClasses, setNoticeAvailableClasses] = useState<ClassOption[]>([]);
  const [noticeAvailableCourses, setNoticeAvailableCourses] = useState<CourseOption[]>([]);
  // 公告统计
  const [noticeStats, setNoticeStats] = useState({ total: 0, published: 0, draft: 0, expired: 0, popupEnabled: 0 });

  // 热门课程相关状态
  const [featuredCourseIds, setFeaturedCourseIds] = useState<string[]>([]);
  const [featuredDialogOpen, setFeaturedDialogOpen] = useState(false);

  // 热门班级相关状态
  const [featuredClassIds, setFeaturedClassIds] = useState<string[]>([]);
  const [featuredClassDialogOpen, setFeaturedClassDialogOpen] = useState(false);
  const [featuredClassAvailable, setFeaturedClassAvailable] = useState<any[]>([]); // 热门班级可选列表

  // 学习路径相关状态
  const [featuredPathIds, setFeaturedPathIds] = useState<string[]>([]);
  const [featuredPathDialogOpen, setFeaturedPathDialogOpen] = useState(false);
  const [availablePaths, setAvailablePaths] = useState<any[]>([]);
  // 学习路径管理状态
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<any>(null);
  const [pathForm, setPathForm] = useState({
    name: '',
    description: '',
    difficulty: 'beginner',
    estimatedHours: 40,
    courses: [] as string[],
    categoryIds: [] as string[],  // 多选分类
    classIds: [] as string[],     // 多选班级
  });
  // 学习路径可选课程分类
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  // 学习路径可选班级（单独的状态，避免与热门班级冲突）
  const [pathAvailableClasses, setPathAvailableClasses] = useState<any[]>([]);

  // 加载配置
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await pageConfigService.getAll();
      setConfigs(data);
      
      // 初始化默认数据
      const defaultData: Record<string, any> = {
        hero: { ...defaultPageConfig.hero, ...data.find(c => c.section === 'hero')?.data.hero },
        stats: data.find(c => c.section === 'stats')?.data.stats || defaultPageConfig.stats,
        features: data.find(c => c.section === 'features')?.data.features || defaultPageConfig.features,
        contact: { ...defaultPageConfig.contact, ...data.find(c => c.section === 'contact')?.data.contact },
        footer: { ...defaultPageConfig.footer, ...data.find(c => c.section === 'footer')?.data.footer },
        // 新增模块配置
        learningPaths: data.find(c => c.section === 'learningPaths')?.data || {
          enabled: true,
          title: '学习路径',
          subtitle: '系统化学习体验'
        },
        openClasses: data.find(c => c.section === 'openClasses')?.data || {
          enabled: true,
          title: '最新开班信息',
          subtitle: '热门班级火热招生中，名额有限，报满即止'
        },
        notices: data.find(c => c.section === 'notices')?.data || {
          enabled: true,
          title: '最新公告',
          subtitle: '了解培训最新动态'
        },
      };
      setEditData(defaultData);
    } catch (error) {
      console.error('加载配置失败:', error);
      showToast('加载配置失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
    loadBanners();
    loadNotices();
    loadNoticeOptions();
    loadCourses();
    loadFeaturedCourses();
    loadFeaturedClasses();
    loadAllClasses();
    loadFeaturedPaths();
    loadAllPaths();
    loadCategories();
    loadClassOptions();
  }, []);

  // 加载轮播图
  const loadBanners = async () => {
    try {
      const result = await CloudBannerAdminService.getAll({ limit: 100 });
      console.log('[轮播图] 加载结果:', result);
      if (result.success && result.data) {
        const mappedBanners = result.data.map((b: any) => {
          const id = b.id || b._id;
          console.log('[轮播图] 映射 banner:', { 原始: b, 映射后ID: id });
          return {
            id: id,
            title: b.title || '',
            subtitle: b.subtitle || '',
            image: b.image || '',
            link: b.link || '',
            courseId: b.courseId || '',
            order: b.order || 0,
            status: b.status || 'active',
          };
        });
        setBanners(mappedBanners);
        console.log('[轮播图] 设置后 banners:', mappedBanners);
      }
    } catch (error) {
      console.error('加载轮播图失败:', error);
    }
  };

  // 加载公告列表
  const loadNotices = async () => {
    setNoticesLoading(true);
    try {
      const result = await CloudNoticeAdminService.getAll({ limit: 100 });
      console.log('[公告] 加载结果:', result);
      if (result.success && result.data) {
        const mappedNotices = result.data.map((n: any) => ({
          id: n.id || n._id,
          title: n.title || '',
          content: n.content || '',
          type: n.type || 'general',
          priority: n.priority || 'medium',
          status: n.status || 'draft',
          target: n.target || 'all',
          isPinned: n.isPinned || false,
          startTime: n.startTime || '',
          endTime: n.endTime || '',
          createdAt: n.createdAt || '',
          updatedAt: n.updatedAt || '',
          // 链接功能
          linkType: n.linkType || 'none',
          linkId: n.linkId || '',
          linkUrl: n.linkUrl || '',
          linkText: n.linkText || '查看详情',
          // 弹窗功能
          showAsPopup: n.showAsPopup || false,
          isPopupEnabled: n.isPopupEnabled || false,
          popupStyle: n.popupStyle || 'modal',
          // 统计数据
          views: n.views || 0,
          clicks: n.clicks || 0,
        }));
        // 按置顶和创建时间排序
        mappedNotices.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setNoticesList(mappedNotices);
        
        // 计算统计
        setNoticeStats({
          total: mappedNotices.length,
          published: mappedNotices.filter(n => n.status === 'published').length,
          draft: mappedNotices.filter(n => n.status === 'draft').length,
          expired: mappedNotices.filter(n => n.status === 'expired').length,
          popupEnabled: mappedNotices.filter(n => n.isPopupEnabled).length,
        });
      }
    } catch (error) {
      console.error('加载公告失败:', error);
    } finally {
      setNoticesLoading(false);
    }
  };
  
  // 加载班级和课程选项
  const loadNoticeOptions = async () => {
    try {
      // 加载班级
      const { classService } = await import('@/services/classService');
      const classResult = await classService.getList({ pageSize: 100 });
      if (classResult.code === 0 && classResult.data) {
        const classes = classResult.data.list
          .filter((c: any) => c.status === 'enrolling' || c.status === 'enrolled')
          .map((c: any) => ({
            id: c._id || c.id,
            name: c.name || c.title,
            status: c.status
          }));
        setNoticeAvailableClasses(classes);
      }
      
      // 加载课程
      const courseResult = await CloudCourseService.getAll();
      if (courseResult && Array.isArray(courseResult)) {
        const courses = courseResult
          .filter((c: any) => c.status === 'published')
          .map((c: any) => ({
            id: c.id || c._id,
            title: c.title || c.name,
            status: c.status
          }));
        setNoticeAvailableCourses(courses);
      }
    } catch (error) {
      console.error('加载班级课程选项失败:', error);
    }
  };

  // 打开公告编辑弹窗
  const openNoticeDialog = (notice?: NoticeItem) => {
    // 先加载班级课程选项
    loadNoticeOptions();
    
    if (notice) {
      setEditingNotice(notice);
      setNoticeForm({
        title: notice.title || '',
        content: notice.content || '',
        type: notice.type || 'general',
        priority: notice.priority || 'medium',
        status: notice.status || 'draft',
        target: notice.target || 'all',
        isPinned: notice.isPinned || false,
        startTime: notice.startTime || '',
        endTime: notice.endTime || '',
        linkType: notice.linkType || 'none',
        linkId: notice.linkId || '',
        linkUrl: notice.linkUrl || '',
        linkText: notice.linkText || '查看详情',
        showAsPopup: notice.showAsPopup || false,
        isPopupEnabled: notice.isPopupEnabled || false,
        popupStyle: notice.popupStyle || 'modal',
      });
    } else {
      setEditingNotice(null);
      setNoticeForm({
        title: '',
        content: '',
        type: 'general',
        priority: 'medium',
        status: 'draft',
        target: 'all',
        isPinned: false,
        startTime: '',
        endTime: '',
        linkType: 'none',
        linkId: '',
        linkUrl: '',
        linkText: '查看详情',
        showAsPopup: false,
        isPopupEnabled: false,
        popupStyle: 'modal',
      });
    }
    setNoticeDialogOpen(true);
  };
  
  // 预览公告
  const previewNoticeItem = (notice: NoticeItem) => {
    setPreviewNotice(notice);
    setNoticePreviewOpen(true);
  };

  // 保存公告
  const saveNotice = async () => {
    if (!noticeForm.title.trim()) {
      showToast('请输入公告标题', 'error');
      return;
    }
    if (!noticeForm.content.trim()) {
      showToast('请输入公告内容', 'error');
      return;
    }

    try {
      let result;
      if (editingNotice?.id) {
        // 更新
        result = await CloudNoticeAdminService.update(editingNotice.id, {
          ...noticeForm,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // 创建
        result = await CloudNoticeAdminService.create({
          ...noticeForm,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      if (result.success) {
        showToast(editingNotice?.id ? '公告已更新' : '公告已创建', 'success');
        setNoticeDialogOpen(false);
        loadNotices();
      } else {
        showToast(result.message || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存公告失败:', error);
      showToast('保存公告失败', 'error');
    }
  };

  // 删除公告
  const deleteNotice = async (id: string) => {
    if (!confirm('确定要删除这条公告吗？')) return;
    try {
      const result = await CloudNoticeAdminService.delete(id);
      if (result.success) {
        showToast('公告已删除', 'success');
        loadNotices();
      } else {
        showToast(result.message || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除公告失败:', error);
      showToast('删除公告失败', 'error');
    }
  };

  // 切换置顶状态
  const togglePinNotice = async (notice: NoticeItem) => {
    try {
      const result = await CloudNoticeAdminService.update(notice.id!, {
        isPinned: !notice.isPinned,
        updatedAt: new Date().toISOString(),
      });
      if (result.success) {
        showToast(notice.isPinned ? '已取消置顶' : '已置顶', 'success');
        loadNotices();
      }
    } catch (error) {
      console.error('切换置顶失败:', error);
    }
  };

  // 公告类型/状态/优先级/目标标签
  const getTypeLabel = (type: NoticeType) => {
    const labels: Record<NoticeType, string> = {
      class: '班级',
      course: '课程',
      general: '通用',
      system: '系统',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: NoticeType) => {
    const colors: Record<NoticeType, string> = {
      class: 'bg-blue-100 text-blue-700',
      course: 'bg-green-100 text-green-700',
      general: 'bg-slate-100 text-slate-700',
      system: 'bg-purple-100 text-purple-700',
    };
    return colors[type] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status: NoticeStatus) => {
    const labels: Record<NoticeStatus, string> = {
      draft: '草稿',
      published: '已发布',
      expired: '已过期',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: NoticeStatus) => {
    const colors: Record<NoticeStatus, string> = {
      draft: 'bg-amber-100 text-amber-700',
      published: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getPriorityLabel = (priority: NoticePriority) => {
    const labels: Record<NoticePriority, string> = {
      low: '低',
      medium: '中',
      high: '高',
    };
    return labels[priority] || priority;
  };

  // 计算筛选后的公告列表
  const filteredNotices = noticesList.filter(notice => {
    const matchSearch = !noticeSearchText || 
      notice.title.toLowerCase().includes(noticeSearchText.toLowerCase()) ||
      notice.content.toLowerCase().includes(noticeSearchText.toLowerCase());
    const matchStatus = noticeStatusFilter === 'all' || notice.status === noticeStatusFilter;
    const matchType = noticeTypeFilter === 'all' || notice.type === noticeTypeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const getTargetLabel = (target: NoticeTarget) => {
    const labels: Record<NoticeTarget, string> = {
      all: '全部用户',
      vip: 'VIP用户',
      new: '新用户',
    };
    return labels[target] || target;
  };

  // 加载课程列表
  const loadCourses = async () => {
    try {
      const data = await CloudCourseService.getAll();
      setCourses(data);
    } catch (error) {
      console.error('加载课程列表失败:', error);
    }
  };

  // 加载所有班级
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const loadAllClasses = async () => {
    try {
      const { classService } = await import('@/services/classService');
      const result = await classService.getList({ page: 1, pageSize: 100 });
      const list = result.data?.data?.list || result.data?.list || [];
      setAllClasses(list);
    } catch (error) {
      console.error('加载班级列表失败:', error);
    }
  };

  // 可选课程列表（用于热门课程选择）
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);

  // 加载热门班级
  const loadFeaturedClasses = async () => {
    try {
      const classIds = await featuredClassService.getFeaturedClasses();
      setFeaturedClassIds(classIds);
    } catch (error) {
      console.error('加载热门班级失败:', error);
      setFeaturedClassIds([]);
    }
  };

  // 加载所有学习路径
  const [allPaths, setAllPaths] = useState<any[]>([]);
  const loadAllPaths = async () => {
    try {
      const result = await CloudLearningPathAdminService.getAll({ limit: 100 });
      if (result.success && result.data) {
        setAllPaths(result.data);
      }
    } catch (error) {
      console.error('加载学习路径列表失败:', error);
    }
  };

  // 加载课程分类
  const loadCategories = async () => {
    try {
      const { categoryService } = await import('@/services/categoryService');
      const result = await categoryService.getAllActive();
      if (result.success && result.data) {
        setAvailableCategories(result.data.map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
        })));
      }
    } catch (error) {
      console.error('加载课程分类失败:', error);
    }
  };

  // 加载开班班级
  const loadClassOptions = async () => {
    try {
      const { classService } = await import('@/services/classService');
      const result = await classService.getList({ page: 1, pageSize: 100 });
      if (result.code === 0 && result.data?.list) {
        const activeClasses = result.data.list.filter((c: any) =>
          ['enrolling', 'in_progress'].includes(c.status)
        );
        setPathAvailableClasses(activeClasses.map((c: any) => ({
          id: c._id || c.id,
          name: c.name || `班级-${c._id?.slice(-4) || ''}`,
          status: c.status,
        })));
      }
    } catch (error) {
      console.error('加载开班班级失败:', error);
    }
  };

  // 加载首页展示的学习路径
  const loadFeaturedPaths = async () => {
    try {
      const pathIds = await featuredPathService.getFeaturedPaths();
      setFeaturedPathIds(pathIds);
    } catch (error) {
      console.error('加载首页学习路径失败:', error);
      setFeaturedPathIds([]);
    }
  };

  // 加载热门课程
  const loadFeaturedCourses = async () => {
    try {
      const result = await CloudAdminService.get('featuredCourses', 'home-featured');
      console.log('[热门课程] 加载结果:', result);
      if (result.success && result.data && result.data.courseIds) {
        setFeaturedCourseIds(result.data.courseIds);
      } else if (result.success && result.data) {
        // 文档存在但没有 courseIds 字段
        setFeaturedCourseIds([]);
      } else {
        // 文档不存在，先创建一个
        console.log('[热门课程] 文档不存在，准备创建');
        setFeaturedCourseIds([]);
      }
    } catch (error) {
      console.error('加载热门课程失败:', error);
      setFeaturedCourseIds([]);
    }
  };

  // 打开热门课程选择弹窗
  const openFeaturedDialog = () => {
    setAvailableCourses(courses.filter(c => !featuredCourseIds.includes(c.id)));
    setFeaturedDialogOpen(true);
  };

  // 确保热门课程配置文档存在
  const ensureFeaturedConfigExists = async () => {
    try {
      const result = await CloudAdminService.get('featuredCourses', 'home-featured');
      if (!result.success || !result.data) {
        // 文档不存在，创建它
        console.log('[热门课程] 创建配置文档');
        await CloudAdminService.add('featuredCourses', {
          _id: 'home-featured',
          courseIds: []
        });
      }
      return true;
    } catch (error) {
      console.error('确保热门课程配置存在失败:', error);
      return false;
    }
  };

  // 添加热门课程
  const handleAddFeatured = async (courseId: string) => {
    if (featuredCourseIds.length >= 8) {
      showToast('热门课程最多添加8个', 'error');
      return;
    }
    if (featuredCourseIds.includes(courseId)) {
      showToast('该课程已在热门列表中', 'error');
      return;
    }
    
    // 先确保配置文档存在
    const exists = await ensureFeaturedConfigExists();
    if (!exists) {
      showToast('配置初始化失败', 'error');
      return;
    }
    
    const newIds = [...featuredCourseIds, courseId];
    const result = await CloudAdminService.update('featuredCourses', 'home-featured', { courseIds: newIds });
    console.log('[热门课程] 添加结果:', result);
    if (result.success) {
      showToast('添加成功');
      setFeaturedCourseIds(newIds);
      setAvailableCourses(courses.filter(c => !newIds.includes(c.id)));
    } else {
      showToast('添加失败', 'error');
    }
  };

  // 移除热门课程
  const handleRemoveFeatured = async (courseId: string) => {
    const newIds = featuredCourseIds.filter(id => id !== courseId);
    const result = await CloudAdminService.update('featuredCourses', 'home-featured', { courseIds: newIds });
    console.log('[热门课程] 移除结果:', result);
    if (result.success) {
      showToast('移除成功');
      setFeaturedCourseIds(newIds);
    } else {
      showToast('移除失败', 'error');
    }
  };

  // 上移热门课程
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newIds = [...featuredCourseIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    const result = await CloudAdminService.update('featuredCourses', 'home-featured', { courseIds: newIds });
    console.log('[热门课程] 上移结果:', result);
    if (result.success) {
      setFeaturedCourseIds(newIds);
    } else {
      showToast('排序失败', 'error');
    }
  };

  // 下移热门课程
  const handleMoveDown = async (index: number) => {
    if (index === featuredCourseIds.length - 1) return;
    const newIds = [...featuredCourseIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    const result = await CloudAdminService.update('featuredCourses', 'home-featured', { courseIds: newIds });
    console.log('[热门课程] 下移结果:', result);
    if (result.success) {
      setFeaturedCourseIds(newIds);
    } else {
      showToast('排序失败', 'error');
    }
  };

  // 获取热门课程的完整信息
  const getFeaturedCourse = (courseId: string) => {
    return courses.find(c => c.id === courseId);
  };

  // 获取热门班级的完整信息
  const getFeaturedClass = (classId: string) => {
    return allClasses.find(c => c._id === classId || (c as any).id === classId);
  };

  // 打开热门班级选择弹窗
  const openFeaturedClassDialog = () => {
    const availableForFeatured = allClasses.filter(c => {
      const cid = c._id || (c as any).id;
      return !featuredClassIds.includes(cid);
    });
    // 使用单独的状态存储热门班级选项
    setFeaturedClassAvailable(availableForFeatured);
    setFeaturedClassDialogOpen(true);
  };

  // 添加热门班级
  const handleAddFeaturedClass = async (classId: string) => {
    const cid = classId || (allClasses.find(c => c._id === classId || (c as any).id === classId) as any)?.id;
    if (!cid) return;
    if (featuredClassIds.includes(cid)) {
      showToast('该班级已在首页展示列表中', 'error');
      return;
    }
    const newIds = [...featuredClassIds, cid];
    const success = await featuredClassService.updateFeaturedClasses(newIds);
    if (success) {
      showToast('添加成功');
      setFeaturedClassIds(newIds);
      setFeaturedClassAvailable(allClasses.filter(c => {
        const id = c._id || (c as any).id;
        return !newIds.includes(id);
      }));
    } else {
      showToast('添加失败', 'error');
    }
  };

  // 移除热门班级
  const handleRemoveFeaturedClass = async (classId: string) => {
    const cid = classId || classId;
    const newIds = featuredClassIds.filter(id => id !== cid);
    const success = await featuredClassService.updateFeaturedClasses(newIds);
    if (success) {
      showToast('移除成功');
      setFeaturedClassIds(newIds);
    } else {
      showToast('移除失败', 'error');
    }
  };

  // 上移热门班级
  const handleClassMoveUp = async (index: number) => {
    if (index === 0) return;
    const newIds = [...featuredClassIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    const success = await featuredClassService.updateFeaturedClasses(newIds);
    if (success) {
      setFeaturedClassIds(newIds);
    } else {
      showToast('排序失败', 'error');
    }
  };

  // 下移热门班级
  const handleClassMoveDown = async (index: number) => {
    if (index === featuredClassIds.length - 1) return;
    const newIds = [...featuredClassIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    const success = await featuredClassService.updateFeaturedClasses(newIds);
    if (success) {
      setFeaturedClassIds(newIds);
    } else {
      showToast('排序失败', 'error');
    }
  };

  // 获取学习路径的完整信息
  const getFeaturedPath = (pathId: string) => {
    return allPaths.find(p => p.id === pathId || p._id === pathId);
  };

  // 打开学习路径选择弹窗
  const openFeaturedPathDialog = () => {
    setAvailablePaths(allPaths.filter(p => {
      const pid = p.id || p._id;
      return !featuredPathIds.includes(pid);
    }));
    setFeaturedPathDialogOpen(true);
  };

  // 添加学习路径到首页
  const handleAddFeaturedPath = async (pathId: string) => {
    const pid = pathId || (allPaths.find(p => p.id === pathId || p._id === pathId) as any)?.id;
    if (!pid) return;
    if (featuredPathIds.includes(pid)) {
      showToast('该学习路径已在首页展示列表中', 'error');
      return;
    }
    const newIds = [...featuredPathIds, pid];
    const success = await featuredPathService.updateFeaturedPaths(newIds);
    if (success) {
      showToast('添加成功');
      setFeaturedPathIds(newIds);
      setAvailablePaths(allPaths.filter(p => {
        const id = p.id || p._id;
        return !newIds.includes(id);
      }));
    } else {
      showToast('添加失败', 'error');
    }
  };

  // 从首页移除学习路径
  const handleRemoveFeaturedPath = async (pathId: string) => {
    const newIds = featuredPathIds.filter(id => id !== pathId);
    const success = await featuredPathService.updateFeaturedPaths(newIds);
    if (success) {
      showToast('移除成功');
      setFeaturedPathIds(newIds);
    } else {
      showToast('移除失败', 'error');
    }
  };

  // 上移学习路径
  const handlePathMoveUp = async (index: number) => {
    if (index === 0) return;
    const newIds = [...featuredPathIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    const success = await featuredPathService.updateFeaturedPaths(newIds);
    if (success) {
      setFeaturedPathIds(newIds);
    } else {
      showToast('排序失败', 'error');
    }
  };

  // 下移学习路径
  const handlePathMoveDown = async (index: number) => {
    if (index === featuredPathIds.length - 1) return;
    const newIds = [...featuredPathIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    const success = await featuredPathService.updateFeaturedPaths(newIds);
    if (success) {
      setFeaturedPathIds(newIds);
    } else {
      showToast('排序失败', 'error');
    }
  };

  // 打开学习路径编辑弹窗
  const openPathDialog = (path?: any) => {
    if (path) {
      setEditingPath(path);
      setPathForm({
        name: path.name || '',
        description: path.description || '',
        difficulty: path.difficulty || 'beginner',
        estimatedHours: path.estimatedHours || 40,
        courses: path.courses || [],
        // 兼容新旧格式：单选 → 多选
        categoryIds: path.categoryIds || (path.categoryId ? [path.categoryId] : []),
        classIds: path.classIds || (path.classId ? [path.classId] : []),
      });
    } else {
      setEditingPath(null);
      setPathForm({
        name: '',
        description: '',
        difficulty: 'beginner',
        estimatedHours: 40,
        courses: [],
        categoryIds: [],
        classIds: [],
      });
    }
    setPathDialogOpen(true);
  };

  // 保存学习路径
  const handleSavePath = async () => {
    if (!pathForm.name.trim()) {
      showToast('请输入学习路径名称', 'error');
      return;
    }
    try {
      if (editingPath?.id || editingPath?._id) {
        // 更新
        const pathId = editingPath.id || editingPath._id;
        const result = await CloudLearningPathAdminService.update(pathId, pathForm);
        if (result.success) {
          showToast('学习路径更新成功');
          await loadAllPaths();
          await loadFeaturedPaths();
        } else {
          showToast(result.error || '更新失败', 'error');
          return;
        }
      } else {
        // 创建
        const result = await CloudLearningPathAdminService.add(pathForm);
        if (result.success) {
          showToast('学习路径创建成功');
          await loadAllPaths();
        } else {
          showToast(result.error || '创建失败', 'error');
          return;
        }
      }
      setPathDialogOpen(false);
    } catch (error) {
      console.error('保存学习路径失败:', error);
      showToast('保存失败', 'error');
    }
  };

  // 删除学习路径
  const handleDeletePath = async (pathId: string) => {
    if (!window.confirm('确定要删除此学习路径吗？')) return;
    try {
      const result = await CloudLearningPathAdminService.delete(pathId);
      if (result.success) {
        showToast('学习路径删除成功');
        await loadAllPaths();
        // 从首页展示中移除
        await handleRemoveFeaturedPath(pathId);
      } else {
        showToast(result.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除学习路径失败:', error);
      showToast('删除失败', 'error');
    }
  };

  // 打开轮播图编辑弹窗
  const openBannerDialog = (banner?: BannerItem) => {
    console.log('[DEBUG] openBannerDialog 被调用', { banner, bannerDialogOpen });
    if (banner) {
      setEditingBanner(banner);
      setBannerForm(banner);
    } else {
      setEditingBanner(null);
      setBannerForm({
        title: '',
        subtitle: '',
        image: '',
        link: '',
        courseId: '',
        order: banners.length,
        status: 'active',
      });
    }
    setBannerDialogOpen(true);
    console.log('[DEBUG] bannerDialogOpen 设置为 true');
  };

  // 保存轮播图
  const handleSaveBanner = async () => {
    if (!bannerForm.title.trim()) {
      showToast('请输入轮播图标题', 'error');
      return;
    }
    if (!bannerForm.image) {
      showToast('请上传轮播图图片', 'error');
      return;
    }

    try {
      // 处理链接逻辑
      let finalLink = bannerForm.link;
      if (bannerForm.courseId && !bannerForm.link) {
        // 注意：路由是 /courses/:id（复数），不是 /course/:id
        finalLink = `/courses/${bannerForm.courseId}`;
      }

      const saveData = { ...bannerForm, link: finalLink };
      console.log('[轮播图] 保存数据:', { editingBanner, saveData });

      if (editingBanner?.id) {
        console.log('[轮播图] 更新, id:', editingBanner.id);
        const result = await CloudBannerAdminService.update(editingBanner.id, saveData);
        console.log('[轮播图] 更新结果:', result);
        if (result.success) {
          showToast('轮播图更新成功');
        } else {
          showToast(result.error || '更新失败', 'error');
          return;
        }
      } else {
        console.log('[轮播图] 新增');
        const result = await CloudBannerAdminService.add(saveData);
        console.log('[轮播图] 新增结果:', result);
        if (result.success) {
          showToast('轮播图创建成功');
        } else {
          showToast(result.error || '创建失败', 'error');
          return;
        }
      }
      setBannerDialogOpen(false);
      await loadBanners();
    } catch (error) {
      console.error('保存轮播图失败:', error);
      showToast('保存失败', 'error');
    }
  };

  // 删除轮播图
  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('确定要删除此轮播图吗？')) return;
    try {
      await CloudBannerAdminService.delete(id);
      showToast('删除成功');
      await loadBanners();
    } catch (error) {
      console.error('删除轮播图失败:', error);
      showToast('删除失败', 'error');
    }
  };

  // 获取课程标题
  const getCourseTitle = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.title : '';
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  // 保存配置
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const sectionData = {
        hero: editData.hero,
        stats: editData.stats,
        features: editData.features,
        contact: editData.contact,
        footer: editData.footer,
      };

      // 保存每个模块
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const existingConfig = configs.find(c => c.section === section.key);
        const data = { [section.key]: sectionData[section.key] };

        if (existingConfig) {
          await pageConfigService.update(existingConfig._id!, {
            data,
            title: sections.find(s => s.key === section.key)?.label || section.label,
          });
        } else {
          await pageConfigService.create({
            section: section.key,
            title: sections.find(s => s.key === section.key)?.label || section.label,
            enabled: true,
            order: i,
            data,
          });
        }
      }

      showToast('保存成功！');
      await loadConfigs();
    } catch (error) {
      console.error('保存失败:', error);
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 上传图片
  const handleImageUpload = async (section: string, field: string, file: File) => {
    try {
      setUploadingImage(`${section}-${field}`);
      const result = await uploadFile(file, 'page-configs');
      if (result.success && result.fileID) {
        // 获取临时URL
        const { getFileUrl } = await import('@/services/storageService');
        const url = await getFileUrl(result.fileID);
        setEditData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: url || result.fileID,
          },
        }));
        showToast('图片上传成功');
      } else {
        showToast('图片上传失败', 'error');
      }
    } catch (error) {
      console.error('上传失败:', error);
      showToast('图片上传失败', 'error');
    } finally {
      setUploadingImage(null);
    }
  };

  // 更新字段
  const updateField = (section: string, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  // 添加统计项
  const addStatItem = () => {
    setEditData(prev => ({
      ...prev,
      stats: [...(prev.stats || []), { label: '新统计项', value: '0', icon: 'Users', color: 'blue' }],
    }));
  };

  // 删除统计项
  const removeStatItem = (index: number) => {
    setEditData(prev => ({
      ...prev,
      stats: prev.stats.filter((_: any, i: number) => i !== index),
    }));
  };

  // 更新统计项
  const updateStatItem = (index: number, field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      stats: prev.stats.map((item: StatItem, i: number) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // 添加特色项
  const addFeatureItem = () => {
    setEditData(prev => ({
      ...prev,
      features: [...(prev.features || []), { icon: 'Shield', title: '新特色', description: '特色描述' }],
    }));
  };

  // 删除特色项
  const removeFeatureItem = (index: number) => {
    setEditData(prev => ({
      ...prev,
      features: prev.features.filter((_: any, i: number) => i !== index),
    }));
  };

  // 更新特色项
  const updateFeatureItem = (index: number, field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      features: prev.features.map((item: FeatureItem, i: number) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // 添加证书项
  // 添加快速链接
  const addQuickLink = () => {
    setEditData(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        quickLinks: [...(prev.footer?.quickLinks || []), { label: '新链接', path: '/new' }],
      },
    }));
  };

  // 删除快速链接
  const removeQuickLink = (index: number) => {
    setEditData(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        quickLinks: prev.footer?.quickLinks?.filter((_: any, i: number) => i !== index),
      },
    }));
  };

  // 更新快速链接
  const updateQuickLink = (index: number, field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        quickLinks: prev.footer?.quickLinks?.map((item: any, i: number) => 
          i === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading text="加载配置..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-blue-600" />
            页面内容配置
          </h1>
          <p className="text-slate-500 mt-1">管理首页各模块的显示内容</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? '保存中...' : '保存全部'}
        </Button>
      </div>

      {/* Toast提示 */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* 左侧导航 */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold text-slate-700 mb-3">配置模块</h3>
            <div className="space-y-2">
              {sections.map(section => (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    activeSection === section.key
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{section.icon}</span>
                    <span className="font-medium">{section.label}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 ml-8">{section.description}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* 右侧编辑区 */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {/* Hero区域编辑 */}
            {activeSection === 'hero' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Hero 区域配置</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Logo文字</label>
                      <Input
                        value={editData.hero?.logoText || ''}
                        onChange={e => updateField('hero', 'logoText', e.target.value)}
                        placeholder="无人机培训中心"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">主标题</label>
                      <Input
                        value={editData.hero?.mainTitle || ''}
                        onChange={e => updateField('hero', 'mainTitle', e.target.value)}
                        placeholder="翱翔蓝天"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">副标题</label>
                      <Input
                        value={editData.hero?.subTitle || ''}
                        onChange={e => updateField('hero', 'subTitle', e.target.value)}
                        placeholder="成就飞行梦想"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">主按钮文字</label>
                      <Input
                        value={editData.hero?.ctaPrimaryText || ''}
                        onChange={e => updateField('hero', 'ctaPrimaryText', e.target.value)}
                        placeholder="查看课程"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">次要按钮文字</label>
                      <Input
                        value={editData.hero?.ctaSecondaryText || ''}
                        onChange={e => updateField('hero', 'ctaSecondaryText', e.target.value)}
                        placeholder="预约试听"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">描述文字（支持换行）</label>
                    <TextArea
                      value={editData.hero?.description || ''}
                      onChange={e => updateField('hero', 'description', e.target.value)}
                      placeholder="专业无人机驾驶培训，权威认证资质"
                      rows={3}
                    />
                  </div>

                  <div className="grid md:grid-cols-1 gap-4 mt-4">
                    {/* 轮播图管理 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">Hero轮播图</label>
                        <Button size="sm" onClick={() => openBannerDialog()}>
                          <Plus className="w-4 h-4 mr-1" /> 添加轮播图
                        </Button>
                      </div>
                      
                      {banners.length === 0 ? (
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                          <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">暂无轮播图，点击上方按钮添加</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {banners.map((banner) => (
                            <div key={banner.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                              <div className="relative w-24 h-16 rounded overflow-hidden shrink-0">
                                <img
                                  src={banner.image}
                                  alt={banner.title}
                                  className="w-full h-full object-cover"
                                />
                                {banner.status !== 'active' && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white text-xs">隐藏</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 truncate">{banner.title || '无标题'}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                  <span>排序: {banner.order}</span>
                                  {banner.courseId && (
                                    <span className="text-blue-600">关联: {getCourseTitle(banner.courseId) || '课程'}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => openBannerDialog(banner)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="编辑"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBanner(banner.id!)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 信任标识 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">信任标识（逗号分隔）</label>
                      <Input
                        value={editData.hero?.trustBadges?.join('，') || ''}
                        onChange={e => updateField('hero', 'trustBadges', e.target.value.split('，'))}
                        placeholder="官方认证，不过退费，推荐就业"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 热门课程管理 */}
            {activeSection === 'featured' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">热门课程管理</h3>
                    <p className="text-sm text-slate-500 mt-1">设置首页展示的热门课程，最多8个课程</p>
                  </div>
                  <Button size="sm" onClick={openFeaturedDialog} disabled={featuredCourseIds.length >= 8}>
                    <Plus className="w-4 h-4 mr-1" /> 添加课程
                  </Button>
                </div>

                {featuredCourseIds.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">暂无热门课程，点击上方按钮添加</p>
                    <p className="text-xs text-slate-400 mt-2">热门课程将显示在首页轮播图下方</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>已设置 {featuredCourseIds.length}/8 个热门课程</span>
                      <span>拖拽调整顺序</span>
                    </div>
                    {featuredCourseIds.map((courseId, index) => {
                      const course = getFeaturedCourse(courseId);
                      return (
                        <div key={courseId} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                              {course?.title || '课程已删除'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                ¥{course?.price || '已删除'}
                              </span>
                              {course?.category && (
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                  {course.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="上移"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(index)}
                              disabled={index === featuredCourseIds.length - 1}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="下移"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveFeatured(courseId)}
                              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="移除"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 添加热门课程弹窗 */}
                <Modal
                  isOpen={featuredDialogOpen}
                  onClose={() => setFeaturedDialogOpen(false)}
                  title="添加热门课程"
                >
                  <div className="space-y-4">
                    {availableCourses.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-500">所有课程都已在热门列表中</p>
                        <p className="text-xs text-slate-400 mt-2">请先移除已有热门课程后再添加</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-500">
                          选择要添加到热门列表的课程（已选 {featuredCourseIds.length}/8）
                        </p>
                        <div className="max-h-80 overflow-y-auto space-y-2">
                          {availableCourses.map(course => (
                            <div
                              key={course.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() => handleAddFeatured(course.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 truncate">{course.title}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                    ¥{course.price}
                                  </span>
                                  {course.category && (
                                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                      {course.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Plus className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    <div className="flex justify-end pt-4">
                      <Button variant="outline" onClick={() => setFeaturedDialogOpen(false)}>
                        关闭
                      </Button>
                    </div>
                  </div>
                </Modal>
              </div>
            )}

            {/* 热门班级管理 */}
            {activeSection === 'openClasses' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">首页展示班级</h3>
                    <p className="text-sm text-slate-500 mt-1">设置首页"最新开班"区域展示的班级，点击卡片可快速编辑</p>
                  </div>
                  <Button size="sm" onClick={openFeaturedClassDialog}>
                  <Plus className="w-4 h-4 mr-1" /> 添加班级
                </Button>
                </div>

                {featuredClassIds.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">暂无首页展示班级，点击上方按钮添加</p>
                    <p className="text-xs text-slate-400 mt-2">首页"最新开班"将显示正在招生的班级</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>已设置 {featuredClassIds.length} 个展示班级</span>
                      <span>使用上下箭头调整顺序</span>
                    </div>
                    {featuredClassIds.map((classId, index) => {
                      const cls = getFeaturedClass(classId);
                      return (
                        <div key={classId} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                              {cls?.name || '班级已删除'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                ¥{cls?.price || 0}
                              </span>
                              {cls?.startDate && (
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                  {cls.startDate} 开课
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded ${
                                cls?.status === 'enrolling' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {cls?.status === 'enrolling' ? '招生中' : cls?.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleClassMoveUp(index)}
                              disabled={index === 0}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="上移"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleClassMoveDown(index)}
                              disabled={index === featuredClassIds.length - 1}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="下移"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveFeaturedClass(classId)}
                              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="移除"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 添加班级弹窗 */}
                <Modal
                  isOpen={featuredClassDialogOpen}
                  onClose={() => setFeaturedClassDialogOpen(false)}
                  title="添加班级到首页"
                >
                  <div className="space-y-4">
                    {featuredClassAvailable.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-500">所有班级都已在首页展示列表中</p>
                        <p className="text-xs text-slate-400 mt-2">请先移除已有班级后再添加</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-500">
                          选择要添加到首页展示的班级（已选 {featuredClassIds.length} 个）
                        </p>
                        <div className="max-h-80 overflow-y-auto space-y-2">
                          {featuredClassAvailable.map(cls => {
                            const cid = cls._id || (cls as any).id;
                            return (
                              <div
                                key={cid}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                                onClick={() => handleAddFeaturedClass(cid)}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-800 truncate">{cls.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                      ¥{cls.price || 0}
                                    </span>
                                    {cls.startDate && (
                                      <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                        {cls.startDate}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Plus className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                    <div className="flex justify-end pt-4">
                      <Button variant="outline" onClick={() => setFeaturedClassDialogOpen(false)}>
                        关闭
                      </Button>
                    </div>
                  </div>
                </Modal>
              </div>
            )}

            {/* 学习路径管理 */}
            {activeSection === 'learningPaths' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">学习路径管理</h3>
                    <p className="text-sm text-slate-500 mt-1">管理学习路径，可创建、编辑、删除并设置首页展示</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openPathDialog()}>
                      <Plus className="w-4 h-4 mr-1" /> 创建路径
                    </Button>
                    <Button size="sm" onClick={openFeaturedPathDialog}>
                      <Plus className="w-4 h-4 mr-1" /> 添加到首页
                    </Button>
                  </div>
                </div>

                {/* 学习路径列表 */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">所有学习路径 ({allPaths.length})</h4>
                  {allPaths.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg">
                      <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">暂无学习路径，点击上方"创建路径"按钮添加</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allPaths.map((path) => {
                        const pid = path.id || path._id;
                        const isFeatured = featuredPathIds.includes(pid);
                        return (
                          <div key={pid} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <div className={`w-3 h-3 rounded-full shrink-0 ${isFeatured ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-800 truncate">{path.name || '无标题'}</p>
                                {isFeatured && (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full shrink-0">
                                    首页展示
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                <span className={`px-2 py-0.5 rounded ${
                                  path.difficulty === 'beginner' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : path.difficulty === 'intermediate'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {path.difficulty === 'beginner' ? '入门' : path.difficulty === 'intermediate' ? '进阶' : '高级'}
                                </span>
                                {path.estimatedHours && (
                                  <span>{path.estimatedHours}小时</span>
                                )}
                              </div>
                              {/* 显示绑定的分类 */}
                              {(path.categoryIds?.length > 0 || path.categoryId) && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(path.categoryIds || [path.categoryId]).filter(Boolean).map((catId: string, idx: number) => {
                                    const cat = availableCategories.find(c => c.id === catId);
                                    return cat ? (
                                      <span key={idx} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                        {cat.name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openPathDialog(path)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="编辑"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePath(pid)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 首页展示路径 */}
                {featuredPathIds.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3">首页展示路径（已设置 {featuredPathIds.length} 个）</h4>
                    <div className="space-y-2 bg-emerald-50 rounded-lg p-4">
                      {featuredPathIds.map((pathId, index) => {
                        const path = getFeaturedPath(pathId);
                        return (
                          <div key={pathId} className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-medium shrink-0">
                              {index + 1}
                            </span>
                            <span className="flex-1 text-sm text-slate-700 truncate">{path?.name || '路径已删除'}</span>
                            <button
                              onClick={() => handlePathMoveUp(index)}
                              disabled={index === 0}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePathMoveDown(index)}
                              disabled={index === featuredPathIds.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveFeaturedPath(pathId)}
                              className="p-1 text-red-400 hover:text-red-600"
                              title="从首页移除"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 添加到首页弹窗 */}
                <Modal
                  isOpen={featuredPathDialogOpen}
                  onClose={() => setFeaturedPathDialogOpen(false)}
                  title="添加学习路径到首页"
                >
                  <div className="space-y-4">
                    {availablePaths.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-500">所有学习路径都已在首页展示列表中</p>
                        <p className="text-xs text-slate-400 mt-2">请先移除已有学习路径后再添加</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-500">
                          选择要添加到首页展示的学习路径（已选 {featuredPathIds.length} 个）
                        </p>
                        <div className="max-h-80 overflow-y-auto space-y-2">
                          {availablePaths.map(path => {
                            const pid = path.id || path._id;
                            return (
                              <div
                                key={pid}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors"
                                onClick={() => handleAddFeaturedPath(pid)}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-800 truncate">{path.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <span className={`px-2 py-0.5 rounded ${
                                      path.difficulty === 'beginner' 
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : path.difficulty === 'intermediate'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {path.difficulty === 'beginner' ? '入门' : path.difficulty === 'intermediate' ? '进阶' : '高级'}
                                    </span>
                                    {path.estimatedHours && (
                                      <span>{path.estimatedHours}h</span>
                                    )}
                                  </div>
                                </div>
                                <Plus className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                    <div className="flex justify-end pt-4">
                      <Button variant="outline" onClick={() => setFeaturedPathDialogOpen(false)}>
                        关闭
                      </Button>
                    </div>
                  </div>
                </Modal>

                {/* 创建/编辑学习路径弹窗 */}
                <Modal
                  isOpen={pathDialogOpen}
                  onClose={() => setPathDialogOpen(false)}
                  title={editingPath ? '编辑学习路径' : '创建学习路径'}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">路径名称 *</label>
                      <Input
                        value={pathForm.name}
                        onChange={(e) => setPathForm({ ...pathForm, name: e.target.value })}
                        placeholder="例如：无人机驾驶员考证路线"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
                      <TextArea
                        value={pathForm.description}
                        onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                        placeholder="学习路径的详细描述"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">难度等级</label>
                        <select
                          value={pathForm.difficulty}
                          onChange={(e) => setPathForm({ ...pathForm, difficulty: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        >
                          <option value="beginner">入门</option>
                          <option value="intermediate">进阶</option>
                          <option value="advanced">高级</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">预计学时</label>
                        <Input
                          type="number"
                          value={pathForm.estimatedHours}
                          onChange={(e) => setPathForm({ ...pathForm, estimatedHours: Number(e.target.value) })}
                          placeholder="40"
                        />
                      </div>
                    </div>

                    {/* 绑定课程分类 - 多选 */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <LinkIcon className="inline-block w-4 h-4 mr-1 text-blue-600" />
                        绑定课程分类（支持多选）
                      </label>
                      <p className="text-xs text-slate-500 mb-2">选择课程分类后，该学习路径将自动展示各分类下的所有课程</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {availableCategories.map(cat => (
                          <label
                            key={cat.id}
                            className={`inline-flex items-center px-3 py-1.5 rounded-full cursor-pointer transition-all text-sm ${
                              pathForm.categoryIds.includes(cat.id)
                                ? 'bg-blue-500 text-white'
                                : 'bg-white border border-blue-200 text-slate-700 hover:border-blue-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={pathForm.categoryIds.includes(cat.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPathForm({ ...pathForm, categoryIds: [...pathForm.categoryIds, cat.id] });
                                } else {
                                  setPathForm({ ...pathForm, categoryIds: pathForm.categoryIds.filter(id => id !== cat.id) });
                                }
                              }}
                            />
                            {cat.name}
                          </label>
                        ))}
                      </div>
                      {pathForm.categoryIds.length > 0 && (
                        <p className="text-xs text-blue-600">
                          ✓ 已选择 {pathForm.categoryIds.length} 个分类
                        </p>
                      )}
                    </div>

                    {/* 关联开班信息 - 多选 */}
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <School className="inline-block w-4 h-4 mr-1 text-purple-600" />
                        关联开班信息（支持多选）
                      </label>
                      <p className="text-xs text-slate-500 mb-2">选择开班班级后，学员可从班级入口进入学习路径</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {pathAvailableClasses.map(cls => (
                          <label
                            key={cls.id}
                            className={`inline-flex items-center px-3 py-1.5 rounded-full cursor-pointer transition-all text-sm ${
                              pathForm.classIds.includes(cls.id)
                                ? 'bg-purple-500 text-white'
                                : 'bg-white border border-purple-200 text-slate-700 hover:border-purple-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={pathForm.classIds.includes(cls.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPathForm({ ...pathForm, classIds: [...pathForm.classIds, cls.id] });
                                } else {
                                  setPathForm({ ...pathForm, classIds: pathForm.classIds.filter(id => id !== cls.id) });
                                }
                              }}
                            />
                            {cls.name}
                          </label>
                        ))}
                      </div>
                      {pathForm.classIds.length > 0 && (
                        <p className="text-xs text-purple-600">
                          ✓ 已关联 {pathForm.classIds.length} 个班级
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setPathDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleSavePath}>
                        保存
                      </Button>
                    </div>
                  </div>
                </Modal>
              </div>
            )}

            {/* 最新公告编辑 - 完整版 */}
            {activeSection === 'notices' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">公告管理</h3>
                  <Button size="sm" onClick={() => openNoticeDialog()}>
                    <Plus className="w-4 h-4 mr-1" /> 新增公告
                  </Button>
                </div>
                
                {/* 统计卡片 */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg p-3 text-white">
                    <div className="text-2xl font-bold">{noticeStats.total}</div>
                    <div className="text-xs opacity-80">全部公告</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white">
                    <div className="text-2xl font-bold">{noticeStats.published}</div>
                    <div className="text-xs opacity-80">已发布</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-3 text-white">
                    <div className="text-2xl font-bold">{noticeStats.draft}</div>
                    <div className="text-xs opacity-80">草稿</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-3 text-white">
                    <div className="text-2xl font-bold">{noticeStats.expired}</div>
                    <div className="text-xs opacity-80">已过期</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-white">
                    <div className="text-2xl font-bold">{noticeStats.popupEnabled}</div>
                    <div className="text-xs opacity-80">弹窗公告</div>
                  </div>
                </div>
                
                {/* 基本配置 */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editData.notices?.enabled ?? true}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          notices: { ...prev.notices, enabled: e.target.checked }
                        }))}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium text-slate-700">启用公告模块</span>
                    </label>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">区域标题</label>
                      <Input
                        value={editData.notices?.title || ''}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          notices: { ...prev.notices, title: e.target.value }
                        }))}
                        placeholder="最新公告"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">区域副标题</label>
                      <Input
                        value={editData.notices?.subtitle || ''}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          notices: { ...prev.notices, subtitle: e.target.value }
                        }))}
                        placeholder="了解培训最新动态"
                      />
                    </div>
                  </div>
                </div>

                {/* 筛选和搜索 */}
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <Input
                        value={noticeSearchText}
                        onChange={(e) => setNoticeSearchText(e.target.value)}
                        placeholder="搜索公告标题或内容..."
                        className="w-full"
                      />
                    </div>
                    <select
                      value={noticeStatusFilter}
                      onChange={(e) => setNoticeStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">全部状态</option>
                      <option value="published">已发布</option>
                      <option value="draft">草稿</option>
                      <option value="expired">已过期</option>
                    </select>
                    <select
                      value={noticeTypeFilter}
                      onChange={(e) => setNoticeTypeFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">全部类型</option>
                      <option value="general">通用</option>
                      <option value="class">班级</option>
                      <option value="course">课程</option>
                      <option value="system">系统</option>
                    </select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setNoticeSearchText('');
                        setNoticeStatusFilter('all');
                        setNoticeTypeFilter('all');
                      }}
                    >
                      重置筛选
                    </Button>
                  </div>
                </div>

                {/* 公告列表 */}
                <div className="bg-white rounded-lg border border-slate-200">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h4 className="font-medium text-slate-700">
                      公告列表
                      <span className="ml-2 text-xs text-slate-400">
                        (共 {filteredNotices.length} 条)
                      </span>
                    </h4>
                  </div>
                  {noticesLoading ? (
                    <div className="p-8 text-center text-slate-500">
                      <Loading size="sm" />
                      <p className="mt-2">加载中...</p>
                    </div>
                  ) : filteredNotices.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>{noticeSearchText || noticeStatusFilter !== 'all' || noticeTypeFilter !== 'all' ? '没有符合条件的公告' : '暂无公告'}</p>
                      <p className="text-sm mt-1">{noticeSearchText || noticeStatusFilter !== 'all' || noticeTypeFilter !== 'all' ? '请调整筛选条件' : '点击上方按钮添加第一条公告'}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredNotices.map((notice: NoticeItem) => (
                        <div key={notice.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                {notice.isPinned && (
                                  <Star className="w-4 h-4 text-amber-500 fill-current shrink-0" />
                                )}
                                <h5 className="font-medium text-slate-800">{notice.title}</h5>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeColor(notice.type)}`}>
                                  {getTypeLabel(notice.type)}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(notice.status)}`}>
                                  {getStatusLabel(notice.status)}
                                </span>
                                {notice.showAsPopup && notice.isPopupEnabled && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                                    弹窗:{notice.popupStyle === 'modal' ? '模态' : notice.popupStyle === 'banner' ? '横幅' : '提示'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 line-clamp-2">{notice.content}</p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                                <span className={`px-2 py-0.5 rounded ${
                                  notice.priority === 'high' ? 'bg-red-100 text-red-600' :
                                  notice.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {getPriorityLabel(notice.priority)}优先级
                                </span>
                                <span>目标: {getTargetLabel(notice.target)}</span>
                                {notice.linkType !== 'none' && (
                                  <span className="text-blue-500">链接: {
                                    notice.linkType === 'classRegistration' ? '班级报名' :
                                    notice.linkType === 'coursePurchase' ? '课程购买' : '自定义'
                                  }</span>
                                )}
                                {notice.startTime && (
                                  <span>{notice.startTime.slice(0,10)} ~ {notice.endTime?.slice(0,10) || '长期'}</span>
                                )}
                                <span className="text-slate-300">|</span>
                                <span>浏览 {notice.views || 0}</span>
                                <span>点击 {notice.clicks || 0}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-4 shrink-0">
                              <button
                                onClick={() => previewNoticeItem(notice)}
                                className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="预览"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => togglePinNotice(notice)}
                                className={`p-2 rounded-lg transition-colors ${notice.isPinned ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                title={notice.isPinned ? '取消置顶' : '置顶'}
                              >
                                <Star className={`w-4 h-4 ${notice.isPinned ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                onClick={() => openNoticeDialog(notice)}
                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="编辑"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteNotice(notice.id!)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 统计概览编辑 */}
            {activeSection === 'stats' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">统计概览配置</h3>
                  <Button size="sm" onClick={addStatItem}>
                    <Plus className="w-4 h-4 mr-1" /> 添加统计项
                  </Button>
                </div>

                <div className="space-y-4">
                  {(editData.stats || []).map((stat: StatItem, index: number) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">图标</label>
                            <select
                              value={stat.icon}
                              onChange={e => updateStatItem(index, 'icon', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            >
                              {iconOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">数值</label>
                            <Input
                              value={stat.value}
                              onChange={e => updateStatItem(index, 'value', e.target.value)}
                              placeholder="5,000+"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">标签</label>
                            <Input
                              value={stat.label}
                              onChange={e => updateStatItem(index, 'label', e.target.value)}
                              placeholder="累计学员"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">颜色</label>
                            <select
                              value={stat.color}
                              onChange={e => updateStatItem(index, 'color', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            >
                              {colorOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={() => removeStatItem(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 特色优势编辑 */}
            {activeSection === 'features' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">特色优势配置</h3>
                  <Button size="sm" onClick={addFeatureItem}>
                    <Plus className="w-4 h-4 mr-1" /> 添加特色
                  </Button>
                </div>

                <div className="space-y-4">
                  {(editData.features || []).map((feature: FeatureItem, index: number) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">图标</label>
                            <select
                              value={feature.icon}
                              onChange={e => updateFeatureItem(index, 'icon', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            >
                              {iconOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">标题</label>
                            <Input
                              value={feature.title}
                              onChange={e => updateFeatureItem(index, 'title', e.target.value)}
                              placeholder="官方认证资质"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">描述</label>
                            <Input
                              value={feature.description}
                              onChange={e => updateFeatureItem(index, 'description', e.target.value)}
                              placeholder="中国航空运输协会认证培训机构"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removeFeatureItem(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 联系我们编辑 */}
            {activeSection === 'contact' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800">联系我们配置</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">标题</label>
                    <Input
                      value={editData.contact?.title || ''}
                      onChange={e => setEditData(prev => ({ ...prev, contact: { ...prev.contact, title: e.target.value } }))}
                      placeholder="准备好开始您的飞行之旅了吗？"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">描述（支持换行）</label>
                    <TextArea
                      value={editData.contact?.description || ''}
                      onChange={e => setEditData(prev => ({ ...prev, contact: { ...prev.contact, description: e.target.value } }))}
                      placeholder="立即咨询报名，专业顾问为您定制学习方案。"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">主按钮文字</label>
                    <Input
                      value={editData.contact?.ctaPrimaryText || ''}
                      onChange={e => setEditData(prev => ({ ...prev, contact: { ...prev.contact, ctaPrimaryText: e.target.value } }))}
                      placeholder="立即报名"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">次要按钮文字</label>
                    <Input
                      value={editData.contact?.ctaSecondaryText || ''}
                      onChange={e => setEditData(prev => ({ ...prev, contact: { ...prev.contact, ctaSecondaryText: e.target.value } }))}
                      placeholder="了解更多"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 页脚编辑 */}
            {activeSection === 'footer' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800">页脚配置</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">机构名称</label>
                    <Input
                      value={editData.footer?.logoText || ''}
                      onChange={e => setEditData(prev => ({ ...prev, footer: { ...prev.footer, logoText: e.target.value } }))}
                      placeholder="无人机培训中心"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">联系电话</label>
                    <Input
                      value={editData.footer?.phone || ''}
                      onChange={e => setEditData(prev => ({ ...prev, footer: { ...prev.footer, phone: e.target.value } }))}
                      placeholder="400-888-8888"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">邮箱</label>
                    <Input
                      value={editData.footer?.email || ''}
                      onChange={e => setEditData(prev => ({ ...prev, footer: { ...prev.footer, email: e.target.value } }))}
                      placeholder="info@drone-train.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">地址</label>
                    <Input
                      value={editData.footer?.address || ''}
                      onChange={e => setEditData(prev => ({ ...prev, footer: { ...prev.footer, address: e.target.value } }))}
                      placeholder="北京市朝阳区航空路88号"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">机构描述</label>
                    <TextArea
                      value={editData.footer?.description || ''}
                      onChange={e => setEditData(prev => ({ ...prev, footer: { ...prev.footer, description: e.target.value } }))}
                      placeholder="专业无人机驾驶培训机构，中国航空运输协会认证。"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">版权信息</label>
                    <Input
                      value={editData.footer?.copyright || ''}
                      onChange={e => setEditData(prev => ({ ...prev, footer: { ...prev.footer, copyright: e.target.value } }))}
                      placeholder="© 2024 无人机培训中心 版权所有"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ICP备案号</label>
                    <Input
                      value={editData.footer?.icp || ''}
                      onChange={e => setEditData(prev => ({ ...prev, footer: { ...prev.footer, icp: e.target.value } }))}
                      placeholder="京ICP备XXXXXXXX号"
                    />
                  </div>
                </div>

                {/* 快速链接 */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-700">快速链接</h4>
                    <Button size="sm" variant="outline" onClick={addQuickLink}>
                      <Plus className="w-4 h-4 mr-1" /> 添加链接
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(editData.footer?.quickLinks || []).map((link: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Input
                          value={link.label}
                          onChange={e => updateQuickLink(index, 'label', e.target.value)}
                          placeholder="链接名称"
                          className="flex-1"
                        />
                        <Input
                          value={link.path}
                          onChange={e => updateQuickLink(index, 'path', e.target.value)}
                          placeholder="/courses"
                          className="flex-1"
                        />
                        <button
                          onClick={() => removeQuickLink(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 轮播图编辑弹窗 - 移到条件块外部，始终可用 */}
            <Modal
              isOpen={bannerDialogOpen}
              onClose={() => setBannerDialogOpen(false)}
              title={editingBanner ? '编辑轮播图' : '新增轮播图'}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">轮播图标题 *</label>
                  <Input
                    value={bannerForm.title}
                    onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                    placeholder="例如：无人机驾驶员培训"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">副标题</label>
                  <Input
                    value={bannerForm.subtitle}
                    onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                    placeholder="例如：AOPA认证，全国通用"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">轮播图图片 *</label>
                  <ImageUploader
                    value={bannerForm.image}
                    onChange={(url) => setBannerForm({ ...bannerForm, image: url })}
                    maxSize={10}
                    placeholder="拖拽或点击上传轮播图图片"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">关联课程（可选）</label>
                  <select
                    value={bannerForm.courseId}
                    onChange={(e) => setBannerForm({ ...bannerForm, courseId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">不关联课程</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  {bannerForm.courseId && (
                    <p className="text-xs text-slate-500 mt-1">点击轮播图将跳转到课程详情页</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">自定义链接（可选）</label>
                  <Input
                    value={bannerForm.link}
                    onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
                    placeholder="如果关联了课程，将自动生成课程链接"
                    disabled={!!bannerForm.courseId}
                  />
                  {bannerForm.courseId && (
                    <p className="text-xs text-slate-500 mt-1">已选择关联课程，将忽略自定义链接</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">排序</label>
                  <Input
                    type="number"
                    value={bannerForm.order}
                    onChange={(e) => setBannerForm({ ...bannerForm, order: parseInt(e.target.value) || 0 })}
                    placeholder="数字越小排序越靠前"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setBannerDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSaveBanner}>
                    保存
                  </Button>
                </div>
              </div>
            </Modal>

            {/* 公告编辑弹窗 - 完整版 */}
            <Modal
              isOpen={noticeDialogOpen}
              onClose={() => setNoticeDialogOpen(false)}
              title={editingNotice?.id ? '编辑公告' : '新增公告'}
              size="lg"
            >
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {/* 基本信息 */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-slate-700 flex items-center gap-2">
                    <Bell className="w-4 h-4" /> 基本信息
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">公告标题 *</label>
                    <Input
                      value={noticeForm.title}
                      onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                      placeholder="请输入公告标题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">公告内容 *</label>
                    <textarea
                      value={noticeForm.content}
                      onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                      placeholder="请输入公告内容"
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">公告类型</label>
                      <select
                        value={noticeForm.type}
                        onChange={(e) => setNoticeForm({ ...noticeForm, type: e.target.value as NoticeType })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="general">通用</option>
                        <option value="class">班级</option>
                        <option value="course">课程</option>
                        <option value="system">系统</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">优先级</label>
                      <select
                        value={noticeForm.priority}
                        onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value as NoticePriority })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">发布状态</label>
                      <select
                        value={noticeForm.status}
                        onChange={(e) => setNoticeForm({ ...noticeForm, status: e.target.value as NoticeStatus })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="draft">草稿</option>
                        <option value="published">已发布</option>
                        <option value="expired">已过期</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">目标用户</label>
                      <select
                        value={noticeForm.target}
                        onChange={(e) => setNoticeForm({ ...noticeForm, target: e.target.value as NoticeTarget })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="all">全部用户</option>
                        <option value="vip">VIP用户</option>
                        <option value="new">新用户</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noticeForm.isPinned || false}
                        onChange={(e) => setNoticeForm({ ...noticeForm, isPinned: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-sm text-slate-700">置顶公告（置顶后会在列表顶部显示）</span>
                    </label>
                  </div>
                </div>

                {/* 链接功能 */}
                <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-blue-700 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" /> 链接功能
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">链接类型</label>
                    <select
                      value={noticeForm.linkType || 'none'}
                      onChange={(e) => setNoticeForm({ ...noticeForm, linkType: e.target.value as LinkType })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="none">无链接</option>
                      <option value="classRegistration">班级报名</option>
                      <option value="coursePurchase">课程购买</option>
                      <option value="custom">自定义链接</option>
                    </select>
                  </div>
                  {noticeForm.linkType === 'classRegistration' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">选择班级</label>
                      <select
                        value={noticeForm.linkId || ''}
                        onChange={(e) => setNoticeForm({ ...noticeForm, linkId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">请选择班级</option>
                        {noticeAvailableClasses.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {noticeForm.linkType === 'coursePurchase' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">选择课程</label>
                      <select
                        value={noticeForm.linkId || ''}
                        onChange={(e) => setNoticeForm({ ...noticeForm, linkId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">请选择课程</option>
                        {availableCourses.map(course => (
                          <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {noticeForm.linkType === 'custom' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">链接地址</label>
                        <Input
                          value={noticeForm.linkUrl || ''}
                          onChange={(e) => setNoticeForm({ ...noticeForm, linkUrl: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">按钮文字</label>
                        <Input
                          value={noticeForm.linkText || '查看详情'}
                          onChange={(e) => setNoticeForm({ ...noticeForm, linkText: e.target.value })}
                          placeholder="查看详情"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* 弹窗功能 */}
                <div className="bg-purple-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-purple-700 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> 弹窗功能
                  </h4>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noticeForm.showAsPopup || false}
                        onChange={(e) => setNoticeForm({ ...noticeForm, showAsPopup: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-sm text-slate-700">启用弹窗展示</span>
                    </label>
                  </div>
                  {noticeForm.showAsPopup && (
                    <>
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={noticeForm.isPopupEnabled || false}
                            onChange={(e) => setNoticeForm({ ...noticeForm, isPopupEnabled: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-sm text-slate-700">弹窗生效（用户访问首页时显示）</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">弹窗样式</label>
                        <select
                          value={noticeForm.popupStyle || 'modal'}
                          onChange={(e) => setNoticeForm({ ...noticeForm, popupStyle: e.target.value as PopupStyle })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="modal">模态弹窗（居中对话框）</option>
                          <option value="banner">横幅通知（顶部滚动条）</option>
                          <option value="toast">轻提示（右下角浮动）</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* 时间控制 */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-slate-700">时间控制</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">生效时间</label>
                      <Input
                        type="date"
                        value={noticeForm.startTime?.slice(0, 10) || ''}
                        onChange={(e) => setNoticeForm({ ...noticeForm, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">失效时间</label>
                      <Input
                        type="date"
                        value={noticeForm.endTime?.slice(0, 10) || ''}
                        onChange={(e) => setNoticeForm({ ...noticeForm, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">留空表示长期有效</p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                  <Button variant="outline" onClick={() => setNoticeDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={saveNotice}>
                    保存
                  </Button>
                </div>
              </div>
            </Modal>

            {/* 公告预览弹窗 */}
            <Modal
              isOpen={noticePreviewOpen}
              onClose={() => setNoticePreviewOpen(false)}
              title="公告预览"
              size="lg"
            >
              {previewNotice && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {previewNotice.isPinned && (
                        <Star className="w-4 h-4 text-amber-500 fill-current" />
                      )}
                      <h3 className="text-xl font-semibold text-slate-800">{previewNotice.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeColor(previewNotice.type)}`}>
                        {getTypeLabel(previewNotice.type)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(previewNotice.status)}`}>
                        {getStatusLabel(previewNotice.status)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        previewNotice.priority === 'high' ? 'bg-red-100 text-red-600' :
                        previewNotice.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {getPriorityLabel(previewNotice.priority)}优先级
                      </span>
                    </div>
                    <p className="text-slate-600 whitespace-pre-wrap">{previewNotice.content}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-slate-500 mb-1">目标用户</div>
                      <div className="font-medium">{getTargetLabel(previewNotice.target)}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-slate-500 mb-1">有效期</div>
                      <div className="font-medium">
                        {previewNotice.startTime?.slice(0,10) || '立即生效'} ~ {previewNotice.endTime?.slice(0,10) || '长期'}
                      </div>
                    </div>
                  </div>

                  {previewNotice.linkType && previewNotice.linkType !== 'none' && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-700 mb-2">
                        <LinkIcon className="w-4 h-4" />
                        <span className="font-medium">链接配置</span>
                      </div>
                      <p className="text-sm text-blue-600">
                        类型: {
                          previewNotice.linkType === 'classRegistration' ? '班级报名' :
                          previewNotice.linkType === 'coursePurchase' ? '课程购买' : '自定义链接'
                        }
                        {previewNotice.linkUrl && <>, 链接: {previewNotice.linkUrl}</>}
                      </p>
                      <Button size="sm" className="mt-2" variant="outline">
                        {previewNotice.linkText || '查看详情'} <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}

                  {previewNotice.showAsPopup && previewNotice.isPopupEnabled && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-purple-700 mb-2">
                        <BarChart3 className="w-4 h-4" />
                        <span className="font-medium">弹窗配置</span>
                      </div>
                      <p className="text-sm text-purple-600">
                        弹窗样式: {
                          previewNotice.popupStyle === 'modal' ? '模态弹窗' :
                          previewNotice.popupStyle === 'banner' ? '横幅通知' : '轻提示'
                        }
                      </p>
                      <p className="text-xs text-purple-500 mt-1">用户访问首页时将会看到此弹窗</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-slate-500">浏览量</div>
                      <div className="text-2xl font-bold text-slate-700">{previewNotice.views || 0}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-slate-500">点击量</div>
                      <div className="text-2xl font-bold text-slate-700">{previewNotice.clicks || 0}</div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button variant="outline" onClick={() => setNoticePreviewOpen(false)}>
                      关闭
                    </Button>
                  </div>
                </div>
              )}
            </Modal>
          </Card>
        </div>
      </div>
    </div>
  );
}
