// ============================================================================
// 布局组件 - 前台和管理后台统一布局
// ============================================================================
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, BookOpen, Users, GraduationCap, Calendar, 
  ClipboardCheck, ShoppingCart, FileText, 
  Award, Settings, Menu, 
  Bell, Search, ChevronRight, LogOut,
  LayoutDashboard, Wallet, Shield, FolderTree,
  MessageSquare, ScrollText, UsersRound,
  Wrench, Layers, Building2, CreditCard, ClipboardList,
  BookMarked, Megaphone, Gauge, Database
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/Toast';
import { pageConfigService, type FooterConfig } from '@/services/pageConfigService';
import { adminService } from '@/services/adminService';
import { CloudMessageService } from '@/services/CloudMessageService';

// 时间格式化函数
const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

// 导航分组配置
interface MenuItem {
  path: string;
  icon: any;
  label: string;
  description?: string;
  relatedPaths?: string[];
}

interface MenuGroup {
  title: string;
  icon: any;
  items: MenuItem[];
}

// 管理后台菜单配置（按业务场景分组）
const adminMenuGroups: MenuGroup[] = [
  {
    title: '概览',
    icon: LayoutDashboard,
    items: [
      { path: '/admin', icon: LayoutDashboard, label: '仪表盘' },
    ]
  },
  {
    title: '线上课程',
    icon: BookMarked,
    items: [
      { path: '/admin/courses', icon: BookOpen, label: '课程管理' },
      { path: '/admin/categories', icon: FolderTree, label: '课程分类' },
      { path: '/admin/comments', icon: MessageSquare, label: '评论管理' },
    ]
  },
  {
    title: '线下培训',
    icon: Building2,
    items: [
      { 
        path: '/admin/classes', 
        icon: Users, 
        label: '班级管理',
        description: '开班信息/培训安排',
        relatedPaths: ['/admin/class-schedules', '/admin/attendance', '/admin/schedules']
      },
      { 
        path: '/admin/class-schedules', 
        icon: Calendar, 
        label: '排课出勤',
        description: '课表/出勤记录',
      },
    ]
  },
  {
    title: '教师管理',
    icon: GraduationCap,
    items: [
      { path: '/admin/teachers', icon: GraduationCap, label: '教师管理' },
    ]
  },
  {
    title: '学员管理',
    icon: UsersRound,
    items: [
      { path: '/admin/members', icon: UsersRound, label: '成员管理', description: '用户/学员', relatedPaths: ['/admin/students'] },
      { path: '/admin/permissions', icon: Shield, label: '权限管理', description: '视频权限/班级成员' },
    ]
  },
  {
    title: '考试认证',
    icon: ClipboardCheck,
    items: [
      { path: '/admin/exams', icon: FileText, label: '题库管理', description: '内部练习', relatedPaths: ['/admin/question-banks'] },
      { path: '/admin/practice-records', icon: ClipboardCheck, label: '练习记录' },
      { path: '/admin/certificates', icon: Award, label: '证书管理' },
    ]
  },
  {
    title: '订单财务',
    icon: CreditCard,
    items: [
      { path: '/admin/course-orders', icon: BookOpen, label: '课程订单', description: '线上购买视频课程' },
      { path: '/admin/class-orders', icon: Users, label: '培训班订单', description: '线上报名培训班' },
      { path: '/admin/finance', icon: Wallet, label: '财务报表', description: '收入统计' },
    ]
  },
  {
    title: '运营配置',
    icon: Gauge,
    items: [
      { path: '/admin/page-config', icon: Layers, label: '首页配置', description: '轮播图/公告/推荐班级', relatedPaths: ['/admin/banners', '/admin/featured-courses', '/admin/notices'] },
      { path: '/admin/messages', icon: Bell, label: '消息管理', description: '系统通知/用户消息' },
      { path: '/admin/marketing', icon: Megaphone, label: '营销工具', description: '优惠券/活动' },
    ]
  },
  {
    title: '系统管理',
    icon: Shield,
    items: [
      { path: '/admin/logs', icon: ScrollText, label: '系统日志' },
      { path: '/admin/diagnostics', icon: Database, label: '系统诊断', description: '检测数据加载状态' },
      { path: '/admin/data-fix', icon: Wrench, label: '数据修复', description: '修复数据关联问题' },
      { path: '/admin/auth-config', icon: Settings, label: '系统设置', description: '登录方式', relatedPaths: ['/admin/user-roles'] },
      { path: '/admin/user-roles', icon: Users, label: '账号管理', description: '管理员/教师账号' },
    ]
  },
];

// 扁平化菜单项（兼容原有逻辑）
const adminMenuItems = adminMenuGroups.flatMap(group => group.items);

// 获取页面标题
const getPageTitle = (pathname: string): string => {
  const menuItem = adminMenuItems.find(item => item.path === pathname);
  if (menuItem) return menuItem.label;
  
  // 子页面标题
  if (pathname.includes('/admin/courses/')) return '课程详情';
  if (pathname.includes('/admin/students/')) return '学员详情';
  if (pathname.includes('/admin/teachers/')) return '教师详情';
  if (pathname.includes('/admin/orders/')) return '订单详情';
  if (pathname === '/admin/auth-config') return '系统设置';
  
  return '';
};

// 获取面包屑
const getBreadcrumbs = (pathname: string): { label: string; path?: string }[] => {
  const crumbs: { label: string; path?: string }[] = [{ label: '首页', path: '/admin' }];
  
  // 查找匹配的菜单项（包括relatedPaths）
  const menuItem = adminMenuItems.find(item => {
    if (pathname.startsWith(item.path) && item.path !== '/admin') return true;
    if (item.relatedPaths?.some(p => pathname.startsWith(p))) return true;
    return false;
  });
  
  if (menuItem) {
    crumbs.push({ label: menuItem.label, path: menuItem.path });
  }
  
  // 子页面
  if (pathname.includes('/detail') || pathname.includes('/edit') || pathname.includes('/create')) {
    const action = pathname.includes('/create') ? '新建' : pathname.includes('/edit') ? '编辑' : '详情';
    crumbs.push({ label: action });
  }
  
  return crumbs;
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [footerConfig, setFooterConfig] = useState<FooterConfig>({
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuthStore();

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdminLogin = location.pathname === '/admin/login';
  const pageTitle = getPageTitle(location.pathname);
  const breadcrumbs = getBreadcrumbs(location.pathname);

  // 切换分组展开/收起
  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  // 加载管理员通知消息
  const loadNotifications = async () => {
    if (!isAdmin) return;
    
    setNotificationsLoading(true);
    try {
      const notificationItems: any[] = [];
      
      // 1. 获取待处理订单数量
      try {
        const pendingOrderCount = await adminService.count('orders', { status: 'pending' });
        if (pendingOrderCount.data > 0) {
          notificationItems.push({
            id: 'pending-orders',
            type: 'order',
            title: '待处理订单',
            content: `您有 ${pendingOrderCount.data} 个待处理订单`,
            time: new Date().toISOString(),
            link: '/admin/orders',
            priority: 'high'
          });
        }
      } catch (e) { console.error('获取待处理订单失败:', e); }
      
      // 2. 获取待审核报名
      try {
        const pendingRegCount = await adminService.count('registrations', { status: 'pending' });
        if (pendingRegCount.data > 0) {
          notificationItems.push({
            id: 'pending-registrations',
            type: 'registration',
            title: '待审核报名',
            content: `您有 ${pendingRegCount.data} 个待审核报名`,
            time: new Date().toISOString(),
            link: '/admin/registrations',
            priority: 'high'
          });
        }
      } catch (e) { console.error('获取待审核报名失败:', e); }
      
      // 3. 获取系统公告
      try {
        const notices = await adminService.list('notices', { status: 'published' }, { limit: 3, orderBy: 'createdAt', order: 'desc' });
        if (notices.data && notices.data.length > 0) {
          notices.data.forEach((notice: any) => {
            notificationItems.push({
              id: notice._id,
              type: 'notice',
              title: notice.title || '系统公告',
              content: notice.content || notice.summary || '查看详情',
              time: notice.createdAt || new Date().toISOString(),
              link: '/admin/notices',
              priority: 'normal'
            });
          });
        }
      } catch (e) { console.error('获取系统公告失败:', e); }
      
      // 4. 获取课程评论
      try {
        const pendingComments = await adminService.count('comments', { status: 'pending' });
        if (pendingComments.data > 0) {
          notificationItems.push({
            id: 'pending-comments',
            type: 'comment',
            title: '待审核评论',
            content: `您有 ${pendingComments.data} 条待审核评论`,
            time: new Date().toISOString(),
            link: '/admin/comments',
            priority: 'normal'
          });
        }
      } catch (e) { console.error('获取待审核评论失败:', e); }
      
      // 按优先级和时间排序
      notificationItems.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });
      
      setNotifications(notificationItems);
    } catch (error) {
      console.error('加载通知失败:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // 加载页面配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await pageConfigService.getHomePageConfig();
        if (config && config.footer) {
          setFooterConfig(config.footer);
        }
      } catch (error) {
        console.error('加载页面配置失败:', error);
      }
    };
    loadConfig();
  }, []);

  // 加载通知
  useEffect(() => {
    if (isAdminRoute) {
      loadNotifications();
      // 每60秒刷新一次通知
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [isAdminRoute, isAdmin]);

  // 检查管理员权限
  useEffect(() => {
    if (isAdminRoute && !isAdminLogin && !isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAdminRoute, isAdminLogin, isAdmin, navigate]);

  // 加载用户未读消息数量
  useEffect(() => {
    const loadUnreadMessages = async () => {
      if (!isAuthenticated) {
        setUnreadMessageCount(0);
        return;
      }
      
      try {
        const { user } = useAuthStore.getState();
        const count = await CloudMessageService.getUnreadCount({
          userId: user?.id,
          phone: user?.phone,
          _openid: user?._openid
        });
        setUnreadMessageCount(count);
      } catch (error) {
        console.error('获取未读消息数量失败:', error);
      }
    };
    
    loadUnreadMessages();
    // 每30秒刷新一次未读消息数
    const interval = setInterval(loadUnreadMessages, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('退出登录成功');
      navigate('/');
    } catch (error) {
      console.error('退出登录失败:', error);
      toast.error('退出登录失败');
    }
  };

  // 管理员登录页面不需要布局
  if (isAdminLogin) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-base-200">
      {isAdminRoute ? (
        // 管理后台布局
        <div className="flex">
          {/* 侧边栏 */}
          <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl transition-transform duration-300 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
            {/* Logo */}
            <div className="p-6 border-b border-slate-700/50">
              <Link to="/admin" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">管理后台</h1>
                  <p className="text-xs text-slate-400">无人机培训系统</p>
                </div>
              </Link>
            </div>

            {/* 导航菜单 - 分组显示 */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto pb-20">
              {adminMenuGroups.map((group, groupIndex) => {
                const GroupIcon = group.icon;
                const isGroupActive = group.items.some(item => 
                  location.pathname === item.path || 
                  (item.path !== '/admin' && location.pathname.startsWith(item.path)) ||
                  item.relatedPaths?.some(p => location.pathname.startsWith(p))
                );
                const isCollapsed = collapsedGroups.has(group.title);
                const canCollapse = true; // 所有分组都显示折叠箭头，包括单一项
                
                return (
                  <div key={groupIndex} className="mb-1">
                    {/* 分组标题 - 可点击展开/收起 */}
                    <button
                      onClick={() => canCollapse && toggleGroup(group.title)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-200 ${
                        isGroupActive ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/30'
                      } ${canCollapse ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center gap-2">
                        <GroupIcon size={14} />
                        <span>{group.title}</span>
                      </div>
                      {canCollapse && (
                        <ChevronRight 
                          size={14} 
                          className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} 
                        />
                      )}
                    </button>
                    
                    {/* 分组菜单项 */}
                    <div className={`space-y-0.5 overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || 
                          (item.path !== '/admin' && location.pathname.startsWith(item.path)) ||
                          item.relatedPaths?.some(p => location.pathname.startsWith(p));
                        
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ml-0 ${
                              isActive 
                                ? 'bg-gradient-to-r from-blue-600/90 to-blue-500/80 text-white shadow-lg shadow-blue-500/25' 
                                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                            }`}
                            onClick={() => setSidebarOpen(false)}
                          >
                            {/* 选中指示条 */}
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-r-full shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                            )}
                            <Icon size={18} className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-sm block truncate">{item.label}</span>
                              {item.description && (
                                <span className={`text-[10px] block truncate ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                                  {item.description}
                                </span>
                              )}
                            </div>
                            {isActive && (
                              <div className="w-1.5 h-1.5 bg-blue-300 rounded-full flex-shrink-0" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* 底部操作 */}
            <div className="p-3 border-t border-slate-700/50">
              <Link 
                to="/" 
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all duration-200 group"
              >
                <Home size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>返回前台</span>
              </Link>
            </div>
          </aside>

          {/* 遮罩层 */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* 主内容区 */}
          <main className="flex-1 lg:ml-64 min-h-screen">
            {/* 顶部导航 */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu size={24} />
                  </button>
                  
                  {/* 面包屑 */}
                  <nav className="hidden md:flex items-center gap-2 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                      <div key={index} className="flex items-center gap-2">
                        {index > 0 && <ChevronRight size={16} className="text-slate-300" />}
                        {crumb.path ? (
                          <Link to={crumb.path} className="text-slate-500 hover:text-blue-600 transition-colors">
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className="text-slate-900 font-medium">{crumb.label}</span>
                        )}
                      </div>
                    ))}
                  </nav>
                  
                  {/* 页面标题（移动端） */}
                  <h2 className="md:hidden text-lg font-semibold">{pageTitle}</h2>
                </div>

                {/* 右侧操作 */}
                <div className="flex items-center gap-3">
                  {/* 搜索 */}
                  <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                    <Search size={18} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="搜索..."
                      className="bg-transparent border-none outline-none text-sm w-48"
                    />
                  </div>

                  {/* 通知 */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setNotificationsOpen(!notificationsOpen);
                        if (!notificationsOpen && notifications.length === 0) {
                          loadNotifications();
                        }
                      }}
                      className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Bell size={20} className="text-slate-600" />
                      {notifications.length > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      )}
                    </button>
                    
                    {/* 通知下拉 */}
                    {notificationsOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setNotificationsOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50">
                          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">通知消息</h3>
                            {notifications.length > 0 && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                {notifications.length} 条待处理
                              </span>
                            )}
                          </div>
                          <div className="max-h-80 overflow-y-auto">
                            {notificationsLoading ? (
                              <div className="p-8 text-center">
                                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                                <p className="text-sm text-slate-500 mt-2">加载中...</p>
                              </div>
                            ) : notifications.length === 0 ? (
                              <div className="p-8 text-center">
                                <Bell size={32} className="text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">暂无待处理事项</p>
                                <p className="text-xs text-slate-400 mt-1">所有事情都处理得很好！</p>
                              </div>
                            ) : (
                              notifications.slice(0, 5).map((notification) => (
                                <div
                                  key={notification.id}
                                  className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors"
                                  onClick={() => {
                                    if (notification.link) {
                                      navigate(notification.link);
                                      setNotificationsOpen(false);
                                    }
                                  }}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      notification.priority === 'high' 
                                        ? 'bg-red-100 text-red-600' 
                                        : notification.type === 'notice'
                                        ? 'bg-blue-100 text-blue-600'
                                        : notification.type === 'comment'
                                        ? 'bg-yellow-100 text-yellow-600'
                                        : 'bg-green-100 text-green-600'
                                    }`}>
                                      {notification.type === 'order' && <ShoppingCart size={16} />}
                                      {notification.type === 'registration' && <ClipboardList size={16} />}
                                      {notification.type === 'notice' && <Megaphone size={16} />}
                                      {notification.type === 'comment' && <MessageSquare size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-800 truncate">
                                        {notification.title}
                                        {notification.priority === 'high' && (
                                          <span className="ml-2 text-xs text-red-500 font-normal">紧急</span>
                                        )}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.content}</p>
                                      <p className="text-xs text-slate-400 mt-1">
                                        {formatTimeAgo(notification.time)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          {notifications.length > 5 && (
                            <div className="p-3 border-t border-slate-100 text-center">
                              <button 
                                className="text-sm text-blue-600 hover:text-blue-700"
                                onClick={() => {
                                  // 导航到通知中心或相关页面
                                  if (notifications[0]?.link) {
                                    navigate(notifications[0].link);
                                  } else {
                                    navigate('/admin/notices');
                                  }
                                  setNotificationsOpen(false);
                                }}
                              >
                                查看全部 ({notifications.length} 条)
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 用户信息 */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {user?.name?.[0] || user?.nickname?.[0] || 'A'}
                      </div>
                      <span className="hidden md:block text-sm font-medium text-slate-700">{user?.name || user?.nickname || '管理员'}</span>
                    </button>

                    {/* 用户下拉菜单 */}
                    {userMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 z-50 py-2">
                          <div className="px-4 py-3 border-b border-slate-100">
                            <p className="font-medium text-slate-900">{user?.name || user?.nickname || '管理员'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'admin@example.com'}</p>
                          </div>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 transition-colors text-red-600"
                          >
                            <LogOut size={16} />
                            <span className="text-sm">退出登录</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* 页面内容 */}
            <div className="p-6">
              <Outlet />
            </div>
          </main>
        </div>
      ) : (
        // 前台布局
        <div>
          {/* 导航栏 - 黑色背景白色字体 */}
          <header className="navbar bg-slate-900 shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4">
              <div className="flex-1">
                <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white hover:text-blue-300 transition-colors">
                  <GraduationCap className="w-7 h-7 text-blue-400" />
                  <span className="whitespace-nowrap">无人机培训</span>
                </Link>
              </div>
              <div className="flex-none gap-1">
                <Link to="/courses" className="btn btn-ghost text-white hover:bg-slate-800 hover:text-blue-300">
                  <BookOpen className="w-4 h-4" />
                  <span className="ml-1">课程</span>
                </Link>
                <Link to="/registration" className="btn btn-ghost text-white hover:bg-slate-800 hover:text-blue-300">
                  <Calendar className="w-4 h-4" />
                  <span className="ml-1">开班信息</span>
                </Link>
                <Link to="/teachers" className="btn btn-ghost text-white hover:bg-slate-800 hover:text-blue-300">
                  <Users className="w-4 h-4" />
                  <span className="ml-1">教师团队</span>
                </Link>
                <Link to="/exam-center" className="btn btn-ghost text-white hover:bg-slate-800 hover:text-blue-300">
                  <FileText className="w-4 h-4" />
                  <span className="ml-1">题库与考试</span>
                </Link>
                {isAuthenticated ? (
                  <>
                    <div className="dropdown dropdown-end">
                      <button tabIndex={0} className="btn btn-ghost btn-circle avatar hover:bg-blue-50">
                        <div className="w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium shadow-md">
                          {user?.nickname ? user.nickname[0] : user?.name ? user.name[0] : user?.phone ? user.phone.slice(-4) : 'U'}
                        </div>
                      </button>
                      <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-white rounded-xl w-56 border border-gray-100">
                        {/* 用户信息 */}
                        <li className="px-3 py-2 border-b border-gray-100 mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {user?.nickname?.[0] || user?.name?.[0] || user?.phone?.[0] || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate text-sm">{user?.nickname || user?.name || '用户'}</p>
                              <p className="text-xs text-gray-500 truncate">{user?.phone || user?.email || ''}</p>
                            </div>
                          </div>
                        </li>
                        
                        {/* 学习模块 */}
                        <li className="menu-title text-xs text-gray-400 px-3 py-1 mt-1">📚 学习</li>
                        <li>
                          <Link to="/learning" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg">我的学习</Link>
                        </li>
                        <li>
                          <Link to="/my-training" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg">我的培训</Link>
                        </li>
                        
                        {/* 考试模块 */}
                        <li className="menu-title text-xs text-gray-400 px-3 py-1">✍️ 练习考试</li>
                        <li>
                          <Link to="/exam-center" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg">题库与考试</Link>
                        </li>
                        <li>
                          <Link to="/certificates" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg">我的证书</Link>
                        </li>
                        
                        {/* 交易模块 */}
                        <li className="menu-title text-xs text-gray-400 px-3 py-1">💳 交易</li>
                        <li>
                          <Link to="/my-orders" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg">我的订单</Link>
                        </li>
                        <li>
                          <Link to="/my-coupons" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg">我的优惠券</Link>
                        </li>
                        <li>
                          <Link to="/messages" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-between">
                            <span>消息中心</span>
                            {unreadMessageCount > 0 && (
                              <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                              </span>
                            )}
                          </Link>
                        </li>
                        
                        {/* 退出 */}
                        <li className="border-t mt-2 pt-2">
                          <button onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg w-full text-left">退出登录</button>
                        </li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn btn-ghost text-gray-700 hover:text-blue-600 hover:bg-blue-50">登录</Link>
                    <Link to="/admin" className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-blue-600">
                      <Settings className="w-4 h-4" />
                      <span className="ml-1">管理后台</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </header>

          <Outlet />

          {/* 页脚 - 使用页面配置 */}
          <footer className="footer p-10 bg-slate-950 text-white">
            <div className="container mx-auto max-w-7xl">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <h3 className="text-lg font-bold mb-4">{footerConfig.logoText}</h3>
                  <p className="text-sm text-slate-400">{footerConfig.description}</p>
                  <div className="mt-3 text-sm text-slate-400">
                    <p>电话: {footerConfig.phone}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">快速链接</h4>
                  <ul className="space-y-2 text-sm text-slate-400">
                    {footerConfig.quickLinks.map((link, index) => (
                      <li key={index}>
                        <Link to={link.path} className="hover:text-white transition-colors">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">联系我们</h4>
                  <ul className="space-y-2 text-sm text-slate-400">
                    <li>邮箱: {footerConfig.email}</li>
                    <li>地址: {footerConfig.address}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">学习资源</h4>
                  <ul className="space-y-2 text-sm text-slate-400">
                    <li><Link to="/notices" className="hover:text-white transition-colors">公告通知</Link></li>
                    <li><Link to="/learning-paths" className="hover:text-white transition-colors">学习路径</Link></li>
                    <li><Link to="/exam-center" className="hover:text-white transition-colors">题库练习</Link></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
                <p>{footerConfig.copyright} | {footerConfig.icp}</p>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
