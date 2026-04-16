/**
 * 我的课表页面 - 优化版
 * 版本: v20260413-timeline-view
 * 采用时间线视图，按课程分组展示
 */
import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight,
  BookOpen, Filter, CalendarDays, List, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Loading } from '@/components';
import { app } from '@/utils/cloudbase';

// 课程颜色配置
const COURSE_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', badge: 'bg-blue-100' },
  { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', badge: 'bg-green-100' },
  { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700', badge: 'bg-purple-100' },
  { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700', badge: 'bg-orange-100' },
  { bg: 'bg-pink-50', border: 'border-pink-400', text: 'text-pink-700', badge: 'bg-pink-100' },
  { bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-700', badge: 'bg-teal-100' },
];

interface Schedule {
  _id: string;
  classId: string;
  courseId?: string;
  title: string;
  content?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  teacherId?: string;
  teacherName?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

interface CourseGroup {
  courseId: string;
  courseName: string;
  colorIndex: number;
  schedules: Schedule[];
}

export default function MySchedulePage() {
  const { user } = useAuthStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSchedules();
  }, [currentDate, user]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const db = app.database();
      if (!db) {
        console.error('数据库未初始化');
        setSchedules([]);
        return;
      }

      const userPhone = user?.phone || localStorage.getItem('user_phone') || '';
      const isAdmin = user?.role === 'admin';
      
      console.log('[MySchedulePage] 查询课表, phone:', userPhone, ', isAdmin:', isAdmin);

      let allSchedules: any[] = [];

      // ★ 管理员：显示所有排课
      if (isAdmin) {
        const result = await db.collection('class_schedules')
          .orderBy('date', 'asc')
          .orderBy('startTime', 'asc')
          .limit(200)
          .get();
        allSchedules = result.data || [];
      } else {
        // ★ 普通用户：通过 class_members 查询已加入的班级
        if (!userPhone) {
          setSchedules([]);
          setLoading(false);
          return;
        }

        // 1. 查询 class_members
        const membersResult = await db.collection('class_members')
          .where({ phone: userPhone, status: 'active' })
          .get();
        
        const members = membersResult.data || [];
        console.log('[MySchedulePage] 班级成员:', members);

        if (members.length === 0) {
          setSchedules([]);
          setLoading(false);
          return;
        }

        // 2. 获取班级ID
        const classIds = members.map((m: any) => m.classId).filter(Boolean);

        // 3. 查询排课
        if (classIds.length > 0) {
          const result = await db.collection('class_schedules')
            .where(db.command.in(classIds.map((id: string) => id)))
            .orderBy('date', 'asc')
            .orderBy('startTime', 'asc')
            .limit(200)
            .get();
          allSchedules = result.data || [];
        }
      }

      console.log('[MySchedulePage] 排课数量:', allSchedules.length);
      
      // ★ 按日期+班级+时间去重（避免同一课程重复显示）
      const seen = new Map<string, any>();
      allSchedules.forEach((s: any) => {
        const key = `${s.classId}_${s.date}_${s.startTime}`;
        if (!seen.has(key)) {
          seen.set(key, s);
        }
      });
      const uniqueSchedules = Array.from(seen.values());
      console.log('[MySchedulePage] 去重后数量:', uniqueSchedules.length);
      
      setSchedules(uniqueSchedules);
    } catch (error) {
      console.error('加载课表失败:', error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // ★ 按课程分组
  const courseGroups: CourseGroup[] = useMemo(() => {
    const groups = new Map<string, Schedule[]>();
    
    schedules.forEach(s => {
      const key = s.classId || s.courseId || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(s);
    });

    return Array.from(groups.entries()).map(([key, items], index) => ({
      courseId: key,
      courseName: items[0]?.title || items[0]?.content || '未知课程',
      colorIndex: index % COURSE_COLORS.length,
      schedules: items.sort((a, b) => a.date.localeCompare(b.date)),
    }));
  }, [schedules]);

  // ★ 获取本周的排课
  const weekSchedules = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return schedules.filter(s => {
      const date = new Date(s.date);
      return date >= startOfWeek && date <= endOfWeek;
    });
  }, [schedules, currentDate]);

  // ★ 获取今日排课
  const todaySchedules = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return schedules.filter(s => s.date === today);
  }, [schedules]);

  const getCourseColor = (colorIndex: number) => COURSE_COLORS[colorIndex];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'ongoing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'ongoing': return '进行中';
      case 'cancelled': return '已取消';
      default: return '待上课';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return '今天';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return '明天';
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  const toggleCourseExpand = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-2 sm:px-4">
      <div className="container mx-auto max-w-4xl">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">我的课表</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {courseGroups.length} 个班级 · {schedules.length} 节课
            </p>
          </div>
          
          {/* 视图切换 */}
          <div className="flex bg-white rounded-lg shadow-sm p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${
                viewMode === 'timeline' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">列表</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${
                viewMode === 'calendar' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">日历</span>
            </button>
          </div>
        </div>

        {/* 今日课程卡片 */}
        {todaySchedules.length > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 mb-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5" />
              <span className="font-bold">今日课程</span>
              <span className="text-blue-100 text-sm">({todaySchedules.length}节)</span>
            </div>
            <div className="space-y-2">
              {todaySchedules.slice(0, 2).map((s, idx) => (
                <div key={s._id} className="flex items-center gap-3 bg-white/10 rounded-lg p-2">
                  <div className="text-center min-w-[60px]">
                    <div className="text-lg font-bold">{s.startTime}</div>
                    <div className="text-xs text-blue-100">{s.endTime}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.title || s.content || '课时'}</div>
                    {s.teacherName && (
                      <div className="text-xs text-blue-100 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {s.teacherName}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {todaySchedules.length > 2 && (
                <div className="text-center text-sm text-blue-100">
                  还有 {todaySchedules.length - 2} 节课...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 时间线视图 */}
        {viewMode === 'timeline' && (
          <div className="space-y-4">
            {courseGroups.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">暂无课程安排</p>
              </div>
            ) : (
              courseGroups.map((group) => {
                const colors = getCourseColor(group.colorIndex);
                const isExpanded = expandedCourses.has(group.courseId);
                const upcomingCount = group.schedules.filter(s => s.date >= new Date().toISOString().split('T')[0]).length;
                
                return (
                  <div key={group.courseId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* 课程头部 */}
                    <button
                      onClick={() => toggleCourseExpand(group.courseId)}
                      className={`w-full p-4 flex items-center justify-between ${colors.bg} border-l-4 ${colors.border}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${colors.badge} flex items-center justify-center`}>
                          <BookOpen className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <div className="text-left">
                          <h3 className={`font-bold ${colors.text}`}>{group.courseName}</h3>
                          <p className="text-xs text-gray-500">
                            共 {group.schedules.length} 节课 · 待上 {upcomingCount} 节
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    
                    {/* 课程排课列表 */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-100">
                        {group.schedules.map((schedule) => {
                          const isToday = schedule.date === new Date().toISOString().split('T')[0];
                          const isPast = schedule.date < new Date().toISOString().split('T')[0];
                          
                          return (
                            <div 
                              key={schedule._id}
                              className={`p-4 flex items-center gap-4 ${isToday ? 'bg-blue-50/50' : ''} ${isPast ? 'opacity-60' : ''}`}
                            >
                              {/* 日期 */}
                              <div className={`text-center min-w-[70px] ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                                <div className="text-xs">{formatDate(schedule.date)}</div>
                                {isToday && <div className="text-[10px] font-bold">今天</div>}
                              </div>
                              
                              {/* 时间线 */}
                              <div className="flex flex-col items-center">
                                <div className={`w-3 h-3 rounded-full ${isToday ? 'bg-blue-500' : 'bg-gray-300'}`} />
                                <div className="w-0.5 h-8 bg-gray-200" />
                              </div>
                              
                              {/* 课程信息 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium">{schedule.startTime} - {schedule.endTime}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusStyle(schedule.status)}`}>
                                    {getStatusText(schedule.status)}
                                  </span>
                                </div>
                                {schedule.teacherName && (
                                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                    <User className="w-3 h-3" />
                                    {schedule.teacherName}
                                  </div>
                                )}
                                {schedule.location && (
                                  <div className="flex items-center gap-1 text-sm text-gray-500">
                                    <MapPin className="w-3 h-3" />
                                    {schedule.location}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 日历视图 - 简化版 */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* 周导航 */}
            <div className="flex items-center justify-between p-4 border-b">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(currentDate.getDate() - 7);
                  setCurrentDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium">
                {currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
              </span>
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(currentDate.getDate() + 7);
                  setCurrentDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 周日历 */}
            <div className="grid grid-cols-7 text-center border-b">
              {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => {
                const date = new Date(currentDate);
                date.setDate(date.getDate() - date.getDay() + i);
                const isToday = date.toDateString() === new Date().toDateString();
                const daySchedules = schedules.filter(s => s.date === date.toISOString().split('T')[0]);
                
                return (
                  <div 
                    key={i} 
                    className={`p-2 ${isToday ? 'bg-blue-50' : ''} ${daySchedules.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  >
                    <div className={`text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                      周{day}
                    </div>
                    <div className={`text-lg ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                      {date.getDate()}
                    </div>
                    {daySchedules.length > 0 && (
                      <div className="mt-1">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 本周课程列表 */}
            <div className="p-4">
              {weekSchedules.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  本周暂无课程
                </div>
              ) : (
                <div className="space-y-2">
                  {weekSchedules.map((s) => {
                    const group = courseGroups.find(g => g.courseId === (s.classId || s.courseId));
                    const colors = group ? getCourseColor(group.colorIndex) : COURSE_COLORS[0];
                    
                    return (
                      <div 
                        key={s._id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${colors.bg} border-l-4 ${colors.border}`}
                      >
                        <div className="text-center min-w-[60px]">
                          <div className="text-sm font-bold">{formatDate(s.date)}</div>
                          <div className="text-xs text-gray-500">{s.startTime}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${colors.text} truncate`}>
                            {s.title || s.content || '课时'}
                          </div>
                          {s.teacherName && (
                            <div className="text-xs text-gray-500">{s.teacherName}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 统计 */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{schedules.length}</div>
            <div className="text-xs text-gray-500">总课程</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{todaySchedules.length}</div>
            <div className="text-xs text-gray-500">今日</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{courseGroups.length}</div>
            <div className="text-xs text-gray-500">班级数</div>
          </div>
        </div>
      </div>
    </div>
  );
}
