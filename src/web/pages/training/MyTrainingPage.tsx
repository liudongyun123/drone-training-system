/**
 * 我的培训页面（合并班级+课表）
 * 
 * 功能：
 * 1. 显示已报名的班级列表
 * 2. 查看班级课表（周视图）
 * 3. 今日课程快捷入口
 * 4. 申请调课
 * 5. 视频学习入口（已解锁时显示）
 * 
 * 版本: v20260412-merge
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  GraduationCap, 
  Clock, 
  Play, 
  ArrowLeftRight,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Users,
  Video,
  AlertCircle,
  BookOpen,
  Plus
} from 'lucide-react';
import { registrationService } from '@/services/registrationService';
import { classService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { Loading, ErrorState, toast } from '@/components';
import type { ClassV2, ClassScheduleV2 } from '@/types/class';

interface MyClassInfo {
  registration: any;
  classInfo: ClassV2 | null;
  schedules: ClassScheduleV2[];
  nextSchedule?: ClassScheduleV2;
}

// 日期工具函数
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const formatTime = (timeStr: string) => timeStr;

const isToday = (dateStr: string) => {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
};

const isFuture = (dateStr: string) => {
  const today = new Date().toISOString().split('T')[0];
  return dateStr >= today;
};

const getWeekDates = (baseDate: Date) => {
  const dates: Date[] = [];
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay()); // 从周日开始
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
};

export default function MyTrainingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [myClasses, setMyClasses] = useState<MyClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [showScheduleView, setShowScheduleView] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadMyClasses();
  }, [isAuthenticated]);

  const loadMyClasses = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // 获取我的所有报名记录
      const regResult = await registrationService.getMyRegistrations(user.id, user.phone);
      const registrations = regResult?.data?.list || regResult?.data || [];
      console.log('[我的培训] 报名记录:', registrations);
      
      // 过滤出有班级的记录
      const offlineRegs = registrations.filter((r: any) => 
        (r.source === 'offline' || r.source === 'hybrid' || r.source === 'online_enroll') && r.classId
      );
      console.log('[我的培训] 有班级的报名:', offlineRegs);
      
      // 加载每个班级的详细信息
      const classInfos: MyClassInfo[] = await Promise.all(
        offlineRegs.map(async (reg: any) => {
          try {
            const [classResult, schedulesResult] = await Promise.all([
              classService.getById(reg.classId!),
              classService.getClassSchedules(reg.classId!)
            ]);
            const classInfo = classResult?.data || null;
            const schedules = Array.isArray(schedulesResult?.data) 
              ? schedulesResult.data.sort((a: any, b: any) => 
                  new Date(a.date + 'T' + a.startTime).getTime() - 
                  new Date(b.date + 'T' + b.startTime).getTime()
                )
              : [];
            
            // 找到下一个排课
            const today = new Date().toISOString().split('T')[0];
            const nextSchedule = schedules.find((s: any) => s.date >= today && s.status !== 'cancelled');
            
            return {
              registration: reg,
              classInfo,
              schedules,
              nextSchedule
            };
          } catch (err) {
            console.error('[我的培训] 加载班级详情失败:', err);
            return {
              registration: reg,
              classInfo: null,
              schedules: []
            };
          }
        })
      );
      
      setMyClasses(classInfos);
    } catch (err) {
      console.error('加载我的班级失败:', err);
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取当前周的排课
  const getSchedulesForWeek = () => {
    const weekDates = getWeekDates(currentDate);
    const today = new Date().toISOString().split('T')[0];
    
    const scheduleMap: Record<string, any[]> = {};
    weekDates.forEach(d => {
      const dateStr = d.toISOString().split('T')[0];
      scheduleMap[dateStr] = [];
    });

    myClasses.forEach(item => {
      item.schedules.forEach(schedule => {
        if (scheduleMap[schedule.date]) {
          scheduleMap[schedule.date].push({
            ...schedule,
            className: item.classInfo?.name || '班级',
            location: schedule.location || item.classInfo?.location
          });
        }
      });
    });

    return { weekDates, scheduleMap, today };
  };

  // 切换上一周/下一周
  const goToPrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 获取所有排课（合并各班级的）
  const getAllSchedules = () => {
    const today = new Date().toISOString().split('T')[0];
    const schedules: any[] = [];
    
    myClasses.forEach(item => {
      item.schedules.forEach(schedule => {
        schedules.push({
          ...schedule,
          className: item.classInfo?.name || '班级',
          classId: item.classInfo?._id,
          location: schedule.location || item.classInfo?.location,
          teacherName: schedule.teacherName || item.classInfo?.teacherName
        });
      });
    });

    // 排序：未完成的排课优先，然后按日期时间排序
    return schedules.sort((a, b) => {
      const aDone = a.date < today || a.status === 'completed' || a.status === 'cancelled';
      const bDone = b.date < today || b.status === 'completed' || b.status === 'cancelled';
      if (aDone !== bDone) return aDone ? 1 : -1;
      return new Date(a.date + 'T' + a.startTime).getTime() - new Date(b.date + 'T' + b.startTime).getTime();
    });
  };

  // 获取今日课程
  const getTodaySchedules = () => {
    const today = new Date().toISOString().split('T')[0];
    const schedules: any[] = [];
    
    myClasses.forEach(item => {
      item.schedules.forEach(schedule => {
        if (schedule.date === today) {
          schedules.push({
            ...schedule,
            className: item.classInfo?.name || '班级',
            location: schedule.location || item.classInfo?.location
          });
        }
      });
    });

    return schedules.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // 申请调课
  const handleTransferRequest = (item: MyClassInfo) => {
    navigate('/transfer-requests', {
      state: {
        fromClassId: item.registration.classId,
        fromClassName: item.classInfo?.name
      }
    });
  };

  // 调课状态显示
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">待上课</span>;
      case 'ongoing':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">进行中</span>;
      case 'completed':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">已完成</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-500">已取消</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">{status}</span>;
    }
  };

  const { weekDates, scheduleMap, today } = getSchedulesForWeek();
  const allSchedules = getAllSchedules();
  const todaySchedules = getTodaySchedules();

  if (loading) return <Loading fullScreen />;
  if (error) return <ErrorState message={error} onRetry={loadMyClasses} />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-6">
        <h1 className="text-xl font-bold">我的培训</h1>
        <p className="text-blue-100 text-sm mt-1">
          {myClasses.length}个培训班级 · {allSchedules.length}节课程
        </p>
      </div>

      {/* Tab切换 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex">
          <button
            onClick={() => setShowScheduleView(false)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              !showScheduleView 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <GraduationCap className="w-4 h-4 inline mr-1" />
            班级列表
          </button>
          <button
            onClick={() => setShowScheduleView(true)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              showScheduleView 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1" />
            课表视图
          </button>
        </div>
      </div>

      {!showScheduleView ? (
        // ========== 班级列表视图 ==========
        <div className="p-4 space-y-4">
          {myClasses.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <GraduationCap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">暂无培训班级</h3>
              <p className="text-gray-500 text-sm mb-4">报名线下培训课程，开启学习之旅</p>
              <Link 
                to="/classes"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                查看培训课程
              </Link>
            </div>
          ) : (
            myClasses.map((item) => (
              <div key={item.registration._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* 班级卡片头部 */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedClassId(expandedClassId === item.registration._id ? null : item.registration._id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {item.classInfo?.name || '班级'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.classInfo?.courseName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.nextSchedule && isToday(item.nextSchedule.date) && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                          今日有课
                        </span>
                      )}
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedClassId === item.registration._id ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>

                  {/* 基本信息 */}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.classInfo?.location || '待定'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.classInfo?.startDate && formatDate(item.classInfo.startDate)} - {item.classInfo?.endDate && formatDate(item.classInfo.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.schedules.length}节课
                    </span>
                  </div>

                  {/* 下一个课时 */}
                  {item.nextSchedule && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-blue-600 mb-1">
                        <Clock className="w-3 h-3" />
                        下一节课
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-gray-900">
                            {item.nextSchedule.title || '课时'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(item.nextSchedule.date)} {item.nextSchedule.startTime}
                          </p>
                        </div>
                        {getStatusBadge(item.nextSchedule.status)}
                      </div>
                    </div>
                  )}
                </div>

                {/* 展开的操作按钮 */}
                {expandedClassId === item.registration._id && (
                  <div className="border-t bg-gray-50 p-3">
                    <div className="flex gap-2">
                      <Link
                        to={`/learning/lesson/${item.classInfo?.courseId}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        <Video className="w-4 h-4" />
                        视频学习
                      </Link>
                      <button
                        onClick={() => handleTransferRequest(item)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-white transition-colors"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        申请调课
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        // ========== 课表视图 ==========
        <div className="p-4">
          {/* 周导航 */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={goToPrevWeek} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <span className="font-medium">
                  {weekDates[0].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} - {weekDates[6].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                </span>
              </div>
              <button onClick={goToNextWeek} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 今日快捷按钮 */}
            <button
              onClick={goToToday}
              className="w-full py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              回到今天
            </button>
          </div>

          {/* 周课表网格 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b">
              {weekDates.map((date, index) => {
                const dateStr = date.toISOString().split('T')[0];
                const isTodayDate = dateStr === today;
                return (
                  <div 
                    key={index} 
                    className={`py-2 text-center text-sm ${isTodayDate ? 'bg-blue-600 text-white' : ''}`}
                  >
                    <div className="text-xs opacity-75">
                      {['日', '一', '二', '三', '四', '五', '六'][index]}
                    </div>
                    <div className="font-medium">{date.getDate()}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7 min-h-[200px]">
              {weekDates.map((date, index) => {
                const dateStr = date.toISOString().split('T')[0];
                const isTodayDate = dateStr === today;
                const daySchedules = scheduleMap[dateStr] || [];
                
                return (
                  <div 
                    key={index} 
                    className={`border-r last:border-r-0 p-1 ${isTodayDate ? 'bg-blue-50' : ''}`}
                  >
                    {daySchedules.map((schedule: any, sIdx: number) => (
                      <div 
                        key={sIdx}
                        className="text-xs p-1.5 mb-1 bg-blue-100 rounded text-blue-800 truncate"
                        title={`${schedule.className} ${schedule.title || '课时'}`}
                      >
                        <div className="font-medium truncate">{schedule.startTime}</div>
                        <div className="truncate opacity-75">{schedule.className}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 课程列表 */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">全部课程</h3>
            <div className="space-y-2">
              {allSchedules.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center text-gray-500">
                  暂无课程安排
                </div>
              ) : (
                allSchedules.slice(0, 10).map((schedule) => (
                  <div key={schedule._id} className="bg-white rounded-lg p-3 flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${
                      isToday(schedule.date) 
                        ? 'bg-blue-600 text-white' 
                        : isFuture(schedule.date)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className="text-xs">{new Date(schedule.date).getMonth() + 1}月</span>
                      <span className="text-lg font-bold">{new Date(schedule.date).getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{schedule.className}</span>
                        {getStatusBadge(schedule.status)}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {schedule.title || '课时'} · {schedule.startTime}-{schedule.endTime}
                      </p>
                      {schedule.location && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {schedule.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
