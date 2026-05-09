// ============================================================================
// 管理后台 - 仪表板
// ============================================================================
import { useState, useEffect } from 'react';
import { 
  Users, BookOpen, ShoppingCart, TrendingUp, 
  Calendar, Award, Clock, ArrowUp, ArrowDown,
  ChevronRight, MoreHorizontal, Video, MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Button, Loading } from '@/components';
import { adminService } from '@/services/adminService';
import { parseDate, formatDateStr } from '@/utils/dateUtils';

interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  totalOrders: number;
  totalRevenue: number;
  todayNewStudents: number;
  todayNewOrders: number;
  weekRevenue: number;
  completionRate: number;
  // ★ 历史对比数据（真实趋势）
  yesterdayStudents: number;
  yesterdayOrders: number;
  lastWeekRevenue: number;
  // ★ 会员来源统计
  memberSourceStats: {
    online_purchase: number;
    online_enroll: number;
    offline_enroll: number;
    hybrid: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'order' | 'enrollment' | 'course' | 'user';
  title: string;
  description: string;
  time: string;
}

interface TopCourse {
  id: string;
  title: string;
  students: number;
  revenue: number;
  rating: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalCourses: 0,
    totalOrders: 0,
    totalRevenue: 0,
    todayNewStudents: 0,
    todayNewOrders: 0,
    weekRevenue: 0,
    completionRate: 0,
    // ★ 历史对比数据（真实趋势）
    yesterdayStudents: 0,
    yesterdayOrders: 0,
    lastWeekRevenue: 0,
    // ★ 会员来源统计
    memberSourceStats: {
      online_purchase: 0,
      online_enroll: 0,
      offline_enroll: 0,
      hybrid: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      console.log('[Dashboard] 开始加载数据...');

      // 通过 adminService HTTP 获取数据
      const [coursesResult, enrollmentsResult, ordersResult, membersResult] = await Promise.all([
        adminService.listCourses({ limit: 1000 }),
        adminService.listEnrollments({ limit: 1000 }),
        adminService.listOrders({ limit: 1000 }),
        adminService.listMembers({ limit: 1000 }),
      ]);

      console.log('[Dashboard] 获取到数据:', {
        courses: coursesResult.data?.list?.length || 0,
        enrollments: enrollmentsResult.data?.list?.length || 0,
        orders: ordersResult.data?.list?.length || 0,
        members: membersResult.data?.list?.length || 0,
      });

      // 计算基础统计数据
      const coursesList = coursesResult.data?.list || [];
      const enrollmentsList = enrollmentsResult.data?.list || [];
      const ordersList = ordersResult.data?.list || [];
      const membersList = membersResult.data?.list || [];

      const totalStudents = membersList.length;
      const totalCourses = coursesList.length;
      const totalOrders = ordersList.length;

      // ★ 计算会员来源统计（从 enrollments 和 members 集合）
      const memberSourceStats = {
        online_purchase: 0,
        online_enroll: 0,
        offline_enroll: 0,
        hybrid: 0,
      };

      // 从报名记录统计来源
      enrollmentsList.forEach((e: any) => {
        const source = e.source || 'offline';
        if (source === 'online_purchase' || source === 'online') {
          memberSourceStats.online_purchase++;
        } else if (source === 'online_enroll') {
          memberSourceStats.online_enroll++;
        } else if (source === 'offline_enroll' || source === 'offline') {
          memberSourceStats.offline_enroll++;
        } else if (source === 'hybrid') {
          memberSourceStats.hybrid++;
        }
      });

      // 计算总收入（从订单）
      const totalRevenue = ordersList.reduce((sum: number, order: any) => {
        return sum + (order.totalAmount || order.amount || 0);
      }, 0) || 0;

      // 5. 计算今日数据
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayEnrollments = enrollmentsList.filter((e: any) => {
        const enrollDate = parseDate(e.createdAt);
        return enrollDate !== null && enrollDate >= today;
      });

      const todayOrders = ordersList.filter((o: any) => {
        const orderDate = parseDate(o.createdAt);
        return orderDate !== null && orderDate >= today;
      });

      // 今日新增学员：从 members 集合获取
      const todayNewUsers = membersList.filter((m: any) => {
        const createDate = parseDate(m.createdAt);
        return createDate !== null && createDate >= today;
      });

      // 6. 计算本周收入
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weekOrders = ordersList.filter((o: any) => {
        const orderDate = parseDate(o.createdAt);
        return orderDate !== null && orderDate >= weekAgo;
      });

      const weekRevenue = weekOrders.reduce((sum: number, order: any) => {
        return sum + (order.totalAmount || order.amount || 0);
      }, 0);

      // ★ 7. 计算真实历史对比数据
      // 昨日数据（昨天0点到今天0点之间）
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayEnrollments = enrollmentsList.filter((e: any) => {
        const enrollDate = parseDate(e.createdAt);
        return enrollDate !== null && enrollDate >= yesterday && enrollDate < today;
      });
      const yesterdayOrders = ordersList.filter((o: any) => {
        const orderDate = parseDate(o.createdAt);
        return orderDate !== null && orderDate >= yesterday && orderDate < today;
      });

      // 上周同期数据（上周同一时间段）
      const lastWeekStart = new Date(weekAgo);
      const lastWeekEnd = new Date(yesterday);
      const lastWeekOrders = ordersList.filter((o: any) => {
        const orderDate = parseDate(o.createdAt);
        return orderDate !== null && orderDate >= lastWeekStart && orderDate < lastWeekEnd;
      });
      const lastWeekRevenue = lastWeekOrders.reduce((sum: number, order: any) => {
        return sum + (order.totalAmount || order.amount || 0);
      }, 0);

      // 7. 计算完成率（从 enrollments 的 status 字段）
      const completedEnrollments = enrollmentsList.filter((e: any) => {
        return e.status === 'completed' || e.status === 'graduated';
      }).length;
      const totalEnrollments = enrollmentsList.length;
      const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

      setStats({
        totalStudents,
        totalCourses,
        totalOrders,
        totalRevenue,
        todayNewStudents: todayNewUsers.length,
        todayNewOrders: todayOrders.length,
        weekRevenue,
        completionRate,
        // ★ 真实历史对比数据
        yesterdayStudents: yesterdayEnrollments.length,
        yesterdayOrders: yesterdayOrders.length,
        lastWeekRevenue,
        // ★ 会员来源统计
        memberSourceStats,
      });

      // 8. 生成真实最近活动（从数据库记录）
      const activities: RecentActivity[] = [];
      
      // 从最近的订单生成活动
      const recentOrders = ordersList
        .slice(0, 3)
        .map((order: any) => {
          const time = getTimeAgo(order.createdAt);
          return {
            id: `order-${order._id}`,
            type: 'order' as const,
            title: '新订单',
            description: `订单 ¥${order.totalAmount || order.amount} 已支付`,
            time,
          };
        });

      // 从最近的报名生成活动
      const recentEnrollments = enrollmentsList
        .slice(0, 3)
        .map((enrollment: any) => {
          const time = getTimeAgo(enrollment.createdAt);
          return {
            id: `enrollment-${enrollment._id}`,
            type: 'enrollment' as const,
            title: '新报名',
            description: `学员报名了课程`,
            time,
          };
        });

      // 从最近的课程生成活动
      const recentCourses = coursesList
        .slice(0, 2)
        .map((course: any) => {
          const time = getTimeAgo(course.updatedAt || course.createdAt);
          return {
            id: `course-${course._id}`,
            type: 'course' as const,
            title: '课程更新',
            description: `课程 "${course.title}" 已更新`,
            time,
          };
        });

      // 从最近的学员生成活动（从 members 集合）
      const recentMembers = membersList
        .slice(0, 2)
        .map((member: any) => {
          const time = getTimeAgo(member.createdAt || member.updatedAt);
          return {
            id: `member-${member._id}`,
            type: 'user' as const,
            title: '新学员加入',
            description: `学员 ${member.name || member.phone || '未知'} 加入了平台`,
            time,
          };
        });

      // 合并并去重
      const allActivities = [...recentOrders, ...recentEnrollments, ...recentCourses, ...recentMembers];
      setRecentActivities(allActivities.slice(0, 5));

      // 9. 热门课程（按报名人数排序）
      const sortedCourses = [...coursesList]
        .sort((a: any, b: any) => {
          const studentsA = a.students || a.enrollmentCount || 0;
          const studentsB = b.students || b.enrollmentCount || 0;
          return studentsB - studentsA;
        })
        .slice(0, 5);

      setTopCourses(sortedCourses.map((c: any) => ({
        id: c._id,
        title: c.title,
        students: c.students || c.enrollmentCount || 0,
        revenue: (c.price || 0) * (c.students || c.enrollmentCount || 0),
        rating: c.rating || 4.5,
      })));
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
      console.error('错误详情:', JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
    }
  };

  // 辅助函数：计算时间差（安全版本）
  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return '未知时间';
    
    try {
      const date = new Date(timestamp);
      // 检查日期是否有效
      if (isNaN(date.getTime())) return '未知时间';
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;
      return `${Math.floor(diffDays / 7)}周前`;
    } catch {
      return '未知时间';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" text="加载数据..." />
      </div>
    );
  }

  // ★ 计算真实趋势百分比
  const calcTrend = (current: number, previous: number): { value: number; up: boolean } => {
    if (previous === 0) {
      return { value: current > 0 ? 100 : 0, up: current > 0 };
    }
    const change = ((current - previous) / previous) * 100;
    return { 
      value: Math.abs(Math.round(change)), 
      up: change >= 0 
    };
  };

  const statCards = [
    { 
      title: '学员总数', 
      value: stats.totalStudents, 
      icon: Users, 
      color: 'blue',
      trend: calcTrend(stats.todayNewStudents, stats.yesterdayStudents),
      subtitle: `今日新增 ${stats.todayNewStudents} 人`,
      detail: `较昨日 ${stats.yesterdayStudents} 人`
    },
    { 
      title: '课程总数', 
      value: stats.totalCourses, 
      icon: BookOpen, 
      color: 'green',
      trend: { value: 0, up: true },
      subtitle: '所有课程',
      detail: '课程总数稳定'
    },
    { 
      title: '订单总数', 
      value: stats.totalOrders, 
      icon: ShoppingCart, 
      color: 'amber',
      trend: calcTrend(stats.todayNewOrders, stats.yesterdayOrders),
      subtitle: `今日 ${stats.todayNewOrders} 笔`,
      detail: `较昨日 ${stats.yesterdayOrders} 笔`
    },
    { 
      title: '总收入', 
      value: `¥${(stats.totalRevenue / 10000).toFixed(1)}万`, 
      icon: TrendingUp, 
      color: 'rose',
      trend: calcTrend(stats.weekRevenue, stats.lastWeekRevenue),
      subtitle: `本周 ¥${(stats.weekRevenue / 10000).toFixed(1)}万`,
      detail: `上周同期 ¥${(stats.lastWeekRevenue / 10000).toFixed(1)}万`
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case 'enrollment': return <BookOpen className="w-4 h-4 text-emerald-500" />;
      case 'course': return <Award className="w-4 h-4 text-amber-500" />;
      case 'user': return <Users className="w-4 h-4 text-orange-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">仪表板</h1>
            <p className="text-slate-500 mt-1">欢迎使用无人机培训管理系统</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadDashboardData}>
              刷新数据
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            const colorClasses: Record<string, { bg: string; text: string; ring: string }> = {
              blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
              green: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
              amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
              rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100' },
            };
            const colors = colorClasses[stat.color] || colorClasses.blue;
            
            return (
              <div key={index} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`flex items-center text-xs font-medium ${stat.trend.up ? 'text-emerald-600' : 'text-red-500'}`}>
                        {stat.trend.up ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
                        {stat.trend.value}%
                      </span>
                      <span className="text-slate-400 text-xs whitespace-nowrap">{stat.subtitle}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{stat.detail}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${colors.bg} ring-1 ${colors.ring}`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ★ 会员来源分布卡片 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">会员来源分布</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={18} className="text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">线上购买</span>
              </div>
              <p className="text-2xl font-bold text-blue-800">{stats.memberSourceStats.online_purchase}</p>
              <p className="text-xs text-blue-600 mt-1">纯线上自主学习</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Video size={18} className="text-green-600" />
                <span className="text-sm text-green-700 font-medium">线上报名</span>
              </div>
              <p className="text-2xl font-bold text-green-800">{stats.memberSourceStats.online_enroll}</p>
              <p className="text-xs text-green-600 mt-1">线上报名+班级</p>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-orange-600" />
                <span className="text-sm text-orange-700 font-medium">线下报名</span>
              </div>
              <p className="text-2xl font-bold text-orange-800">{stats.memberSourceStats.offline_enroll}</p>
              <p className="text-xs text-orange-600 mt-1">到店报名+班级</p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-purple-600" />
                <span className="text-sm text-purple-700 font-medium">混合用户</span>
              </div>
              <p className="text-2xl font-bold text-purple-800">{stats.memberSourceStats.hybrid}</p>
              <p className="text-xs text-purple-600 mt-1">线上+线下组合</p>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">快捷操作</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: BookOpen, label: '发布课程', path: '/admin/courses', color: 'bg-blue-500' },
              { icon: Users, label: '添加学员', path: '/admin/students', color: 'bg-emerald-500' },
              { icon: Calendar, label: '安排课程', path: '/admin/schedules', color: 'bg-amber-500' },
              { icon: TrendingUp, label: '查看报表', path: '/admin/finance', color: 'bg-orange-500' },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={index}
                  to={item.path}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                >
                  <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-slate-700">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 下方内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* 最近活动 */}
          <div className="bg-white rounded-xl border border-slate-200 lg:col-span-2">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">最近活动</h2>
                <Link to="/admin/activities" className="text-blue-600 text-sm hover:underline">
                  查看全部
                </Link>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800">{activity.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{activity.description}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 热门课程 */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">热门课程</h2>
                <Link to="/admin/courses" className="text-blue-600 text-sm hover:underline">
                  查看全部
                </Link>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {topCourses.map((course, index) => (
                <div key={course.id} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index < 3 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{course.title}</p>
                    <p className="text-xs text-slate-500">{course.students} 人学习</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-800">¥{course.revenue}</p>
                    <p className="text-xs text-amber-500">★ {course.rating}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 待办事项 */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">待办事项</h2>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">课程完成率</span>
              </div>
              <p className="text-2xl font-bold text-amber-800">{stats.completionRate}%</p>
              <p className="text-xs text-amber-600 mt-2">学员平均学习进度</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <ShoppingCart className="w-4 h-4" />
                <span className="font-medium">今日订单</span>
              </div>
              <p className="text-2xl font-bold text-red-800">{stats.todayNewOrders}</p>
              <Link to="/admin/finance" className="text-sm text-red-600 hover:underline mt-2 inline-flex items-center">
                去查看 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">今日新学员</span>
              </div>
              <p className="text-2xl font-bold text-blue-800">{stats.todayNewStudents}</p>
              <Link to="/admin/students" className="text-sm text-blue-600 hover:underline mt-2 inline-flex items-center">
                去查看 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
