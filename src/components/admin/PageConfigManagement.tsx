// ============================================================================
// 页面配置管理 - 生产级别重构 v2.0
// 支持多体系管理，通过分类关联体系
// - 轮播图（全局）- 公告（全局）- 学习路径（按体系分类）
// - 热门课程（按体系分类）- 最新开班（按体系分类）
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { 
  Image, Bell, Route, Star, Calendar, 
  Plus, Edit, Trash2, ToggleLeft, ToggleRight
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

interface Category {
  _id: string;
  name: string;
  sourceId?: string;  // 关联的体系ID
  sourceCode?: string;  // 关联的体系代码
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

interface LearningPathItem {
  _id: string;
  name: string;
  title?: string;
  sourceCode?: string;
  categoryId?: string;
  status: string;
}

type TabType = 'banners' | 'notices' | 'learningPaths' | 'courses' | 'classes';

// ==================== 组件 ====================

export default function PageConfigManagement() {
  // 状态
  const [activeTab, setActiveTab] = useState<TabType>('banners');
  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{api: string; data: any}[]>([]);
  
  // 数据
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPathItem[]>([]);
  
  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // 获取当前体系的分类ID列表
  const getCurrentCategoryIds = useCallback(() => {
    if (!selectedSource) return [];
    const selectedSourceObj = sources.find(s => s.code === selectedSource);
    return categories
      .filter(c => 
        c.sourceCode === selectedSource || 
        c.sourceId === selectedSourceObj?._id
      )
      .map(c => c._id);
  }, [selectedSource, categories, sources]);

  // 加载体系列表
  useEffect(() => {
    loadSources();
    loadCategories();
  }, []);

  // 加载数据
  useEffect(() => {
    if (activeTab) {
      loadData();
    }
  }, [activeTab, selectedSource]);

  const loadSources = async () => {
    try {
      const result = await adminService.listSources({ limit: 100 });
      console.log('[PageConfig] loadSources result:', result);
      if (result.data?.list && result.data.list.length > 0) {
        setSources(result.data.list);
        // 自动选择第一个体系
        const firstSource = result.data.list[0];
        setSelectedSource(firstSource.code);
        console.log('[PageConfig] 自动选择体系:', firstSource.code, firstSource.name);
      } else {
        console.log('[PageConfig] 未找到体系数据');
      }
    } catch (error) {
      console.error('加载体系失败:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await adminService.list('categories', {}, { limit: 200 });
      console.log('[PageConfig] loadCategories result:', result);
      if (result.data?.list) {
        setCategories(result.data.list);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'banners':
          await loadBanners();
          break;
        case 'notices':
          await loadNotices();
          break;
        case 'courses':
          await loadCourses();
          break;
        case 'classes':
          await loadClasses();
          break;
        case 'learningPaths':
          await loadLearningPaths();
          break;
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
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
    console.log('[PageConfig] loadCourses, selectedSource:', selectedSource);
    try {
      const result = await adminService.list('courses', {}, { orderBy: 'createdAt', order: 'desc', limit: 100 });
      
      const debug = {api: 'courses', raw: result, list: result.data?.list, total: result.data?.total};
      setDebugInfo(prev => [...prev.slice(-2), debug]);
      
      console.log('[PageConfig] 课程原始数据:', JSON.stringify(result.data?.list?.slice(0, 2)));
      
      if (result.data?.list && result.data.list.length > 0) {
        const categoryIds = getCurrentCategoryIds();
        console.log('[PageConfig] 当前体系的分类IDs:', categoryIds);
        
        // 筛选：匹配 sourceCode 或 分类属于当前体系 或 通用（无sourceCode和categoryId）
        const courses = result.data.list.filter((c: any) => {
          if (!selectedSource) return true;
          if (c.sourceCode === selectedSource) return true;
          if (c.categoryId && categoryIds.includes(c.categoryId)) return true;
          if (!c.sourceCode && !c.categoryId) return true;  // 通用内容
          return false;
        });
        
        console.log('[PageConfig] 课程总数:', result.data.list.length, '筛选后:', courses.length);
        setCourses(courses.map((c: any) => ({ ...c, id: c._id })));
      } else {
        console.log('[PageConfig] 没有课程数据');
        setCourses([]);
      }
    } catch (error) {
      console.error('[PageConfig] loadCourses error:', error);
      setDebugInfo(prev => [...prev.slice(-2), {api: 'courses', error: String(error)}]);
    }
  };

  const loadClasses = async () => {
    console.log('[PageConfig] loadClasses, selectedSource:', selectedSource);
    try {
      const result = await adminService.list('classes', {}, { orderBy: 'createdAt', order: 'desc', limit: 100 });
      
      const debug = {api: 'classes', raw: result, list: result.data?.list, total: result.data?.total};
      setDebugInfo(prev => [...prev.slice(-2), debug]);
      
      console.log('[PageConfig] 班级原始数据:', JSON.stringify(result.data?.list?.slice(0, 2)));
      
      if (result.data?.list && result.data.list.length > 0) {
        const categoryIds = getCurrentCategoryIds();
        console.log('[PageConfig] 当前体系的分类IDs:', categoryIds);
        
        const classes = result.data.list.filter((c: any) => {
          if (!selectedSource) return true;
          if (c.sourceCode === selectedSource) return true;
          if (c.categoryId && categoryIds.includes(c.categoryId)) return true;
          if (!c.sourceCode && !c.categoryId) return true;
          return false;
        });
        
        console.log('[PageConfig] 班级总数:', result.data.list.length, '筛选后:', classes.length);
        setClasses(classes.map((c: any) => ({ ...c, id: c._id })));
      } else {
        console.log('[PageConfig] 没有班级数据');
        setClasses([]);
      }
    } catch (error) {
      console.error('[PageConfig] loadClasses error:', error);
      setDebugInfo(prev => [...prev.slice(-2), {api: 'classes', error: String(error)}]);
    }
  };

  const loadLearningPaths = async () => {
    console.log('[PageConfig] loadLearningPaths, selectedSource:', selectedSource);
    try {
      const result = await adminService.list('learning_paths', {}, { orderBy: 'createdAt', order: 'desc', limit: 100 });
      
      // 诊断：显示原始数据
      const debug = {api: 'learning_paths', raw: result, list: result.data?.list, total: result.data?.total};
      setDebugInfo(prev => [...prev.slice(-2), debug]);
      
      console.log('[PageConfig] 学习路径原始数据:', JSON.stringify(result.data?.list?.slice(0, 2)));
      
      if (result.data?.list && result.data.list.length > 0) {
        const categoryIds = getCurrentCategoryIds();
        console.log('[PageConfig] 当前体系的分类IDs:', categoryIds);
        
        // 学习路径通过 categoryId 关联到分类
        const paths = result.data.list.filter((p: any) => {
          if (!selectedSource) return true;  // 没有选择体系时显示全部
          // 只要有 categoryId 且该分类属于当前体系，就显示
          if (p.categoryId && categoryIds.includes(p.categoryId)) return true;
          return false;
        });
        
        console.log('[PageConfig] 学习路径总数:', result.data.list.length, '筛选后:', paths.length);
        setLearningPaths(paths.map((p: any) => ({ ...p, id: p._id })));
      } else {
        console.log('[PageConfig] 没有学习路径数据');
        setLearningPaths([]);
      }
    } catch (error) {
      console.error('[PageConfig] loadLearningPaths error:', error);
      setDebugInfo(prev => [...prev.slice(-2), {api: 'learning_paths', error: String(error)}]);
    }
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
    if (item.categoryId) {
      const category = categories.find(c => c._id === item.categoryId);
      if (category) {
        if (category.sourceCode) {
          const source = sources.find(s => s.code === category.sourceCode);
          return source?.name || '未知体系';
        }
        return category.name;
      }
    }
    return '通用';
  };

  const tabs = [
    { key: 'banners', label: '轮播图', icon: Image, global: true },
    { key: 'notices', label: '公告', icon: Bell, global: true },
    { key: 'learningPaths', label: '学习路径', icon: Route, global: false },
    { key: 'courses', label: '热门课程', icon: Star, global: false },
    { key: 'classes', label: '最新开班', icon: Calendar, global: false },
  ];

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

        {/* 体系选择器 - 非全局内容显示 */}
        {activeTab !== 'banners' && activeTab !== 'notices' && (
          <div className="mb-4 flex items-center gap-4">
            <span className="text-gray-600">选择体系：</span>
            <div className="flex gap-2">
              {sources.length === 0 ? (
                <span className="text-gray-400">暂无体系数据</span>
              ) : (
                sources.map((source) => (
                  <button
                    key={source.code}
                    onClick={() => setSelectedSource(source.code)}
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

        {/* Tab 切换 */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex border-b overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                  {renderGlobalBadge(tab.global)}
                </button>
              );
            })}
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
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-1" /> 添加
            </Button>
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

              {(activeTab === 'courses' || activeTab === 'classes' || activeTab === 'learningPaths') && (
                <div className="space-y-3">
                  {activeTab === 'courses' && courses.length === 0 && (
                    <p className="text-gray-500 text-center py-8">暂无课程</p>
                  )}
                  {activeTab === 'courses' && courses.map((course) => (
                    <div key={course._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <Star className="w-5 h-5 text-amber-500" />
                      <div className="flex-1">
                        <p className="font-medium">{course.title}</p>
                        <p className="text-xs text-gray-500">{getSourceName(course)}</p>
                      </div>
                      {getSourceName(course) === '通用' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">通用</span>}
                      <span className={`px-2 py-1 text-xs rounded ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}>
                        {course.status === 'published' ? '已发布' : '草稿'}
                      </span>
                    </div>
                  ))}

                  {activeTab === 'classes' && classes.length === 0 && (
                    <p className="text-gray-500 text-center py-8">暂无班级</p>
                  )}
                  {activeTab === 'classes' && classes.map((cls) => (
                    <div key={cls._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-green-500" />
                      <div className="flex-1">
                        <p className="font-medium">{cls.name}</p>
                        <p className="text-xs text-gray-500">{getSourceName(cls)}</p>
                      </div>
                      {getSourceName(cls) === '通用' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">通用</span>}
                      <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-600">{cls.status}</span>
                    </div>
                  ))}

                  {activeTab === 'learningPaths' && learningPaths.length === 0 && (
                    <p className="text-gray-500 text-center py-8">暂无学习路径</p>
                  )}
                  {activeTab === 'learningPaths' && learningPaths.map((path) => (
                    <div key={path._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <Route className="w-5 h-5 text-purple-500" />
                      <div className="flex-1">
                        <p className="font-medium">{path.name || path.title}</p>
                        <p className="text-xs text-gray-500">{getSourceName(path)}</p>
                      </div>
                      {getSourceName(path) === '通用' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">通用</span>}
                      <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-600">{path.status || '活跃'}</span>
                    </div>
                  ))}
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
              <div>
                <label className="block text-sm font-medium mb-1">关联分类（可选）</label>
                <select 
                  className="w-full p-2 border rounded-lg"
                  value={editItem?.categoryId || ''}
                  onChange={(e) => setEditItem({ ...editItem, categoryId: e.target.value })}
                >
                  <option value="">无分类</option>
                  {categories
                    .filter(c => !editItem?.sourceCode || c.sourceCode === editItem?.sourceCode)
                    .map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))
                  }
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
