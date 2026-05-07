/**
 * 我的班级页面
 * 
 * 功能：
 * 1. 显示已报名的班级列表
 * 2. 查看班级课表
 * 3. 申请调课
 * 4. 查看视频学习权限
 * 
 * 版本: v20260410
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
  AlertCircle,
  ChevronRight,
  BookOpen,
  Users
} from 'lucide-react';
import { registrationService } from '@/services/registrationService';
import { classService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { Loading, ErrorState, toast } from '@/components';
import type { Registration } from '@/types/registration';
import type { ClassV2, ClassScheduleV2 } from '@/types';

interface MyClassInfo {
  registration: Registration;
  classInfo: ClassV2 | null;
  schedules: ClassScheduleV2[];
}

export default function MyClassesPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [myClasses, setMyClasses] = useState<MyClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<MyClassInfo | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

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
      // 获取我的所有报名记录（通过 userId 和手机号查询）
      const regResult = await registrationService.getMyRegistrations(user.id, user.phone);
      
      // 兼容处理返回格式 - getMyRegistrations 返回 { code, data: { list, total } }
      const rawData = regResult?.data;
      const registrations = rawData?.list || (Array.isArray(rawData) ? rawData : []);
      console.log('[我的班级] 报名记录:', registrations);
      
      // 过滤出有班级的记录（source 为 offline 或 hybrid）
      const offlineRegs = registrations.filter((r: any) => 
        (r.source === 'offline' || r.source === 'hybrid') && r.classId
      );
      console.log('[我的班级] 有班级的报名:', offlineRegs);
      
      // 加载每个班级的详细信息
      const classInfos: MyClassInfo[] = await Promise.all(
        offlineRegs.map(async (reg: any) => {
          try {
            // 使用正确的 API: getById 和 getClassSchedules
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
            return {
              registration: reg,
              classInfo,
              schedules
            };
          } catch (err) {
            console.error('[我的班级] 加载班级详情失败:', err);
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

  // 申请调课
  const handleTransferRequest = (classInfo: MyClassInfo) => {
    navigate('/transfer-requests', {
      state: {
        fromClassId: classInfo.registration.classId,
        fromClassName: classInfo.registration.className,
        courseId: classInfo.registration.courseId,
        courseName: classInfo.registration.courseName
      }
    });
  };

  // 查看课表
  const handleViewSchedule = (classInfo: MyClassInfo) => {
    setSelectedClass(classInfo);
    setShowScheduleModal(true);
  };

  // 进入课程学习
  const handleStartLearning = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };

  // 获取状态显示
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: '审核中', color: 'badge-warning', icon: AlertCircle };
      case 'confirmed':
        return { label: '已确认', color: 'badge-success', icon: CheckCircle };
      case 'rejected':
        return { label: '已拒绝', color: 'badge-error', icon: AlertCircle };
      case 'cancelled':
        return { label: '已取消', color: 'badge-ghost', icon: AlertCircle };
      default:
        return { label: status, color: 'badge-ghost', icon: AlertCircle };
    }
  };

  if (loading) {
    return <Loading fullScreen text="加载中..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="container mx-auto px-4">
          <ErrorState title="加载失败" message={error} onRetry={loadMyClasses} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">我的班级</h1>
            <p className="text-gray-600 mt-1">管理您的线下培训课程</p>
          </div>
          <Link to="/classes" className="btn btn-outline">
            浏览更多开班信息
          </Link>
        </div>

        {myClasses.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-16">
              <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">暂无报名班级</h2>
              <p className="text-gray-500 mb-6">您还没有报名任何线下培训课程</p>
              <Link to="/classes" className="btn btn-primary">
                浏览开班信息
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {myClasses.map(({ registration, classInfo, schedules }) => {
              const status = getStatusDisplay(registration.status);
              const StatusIcon = status.icon;
              const hasVideoAccess = registration.access?.videoEnabled;
              
              return (
                <div key={registration._id} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      {/* 课程信息 */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <Link 
                              to={`/courses/${registration.courseId}`}
                              className="text-xl font-bold hover:text-primary transition-colors"
                            >
                              {registration.courseName}
                            </Link>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`badge ${status.color} gap-1`}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </span>
                              {hasVideoAccess && (
                                <span className="badge badge-info gap-1">
                                  <Play className="w-3 h-3" />
                                  视频已开通
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {classInfo ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-base-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-5 h-5 text-primary" />
                              <div>
                                <div className="text-sm text-gray-500">班级</div>
                                <div className="font-medium">{classInfo.name}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-5 h-5 text-secondary" />
                              <div>
                                <div className="text-sm text-gray-500">授课教师</div>
                                <div className="font-medium">{classInfo.teacherName}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-accent" />
                              <div>
                                <div className="text-sm text-gray-500">培训时间</div>
                                <div className="font-medium">
                                  {classInfo.startDate} 至 {classInfo.endDate}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-5 h-5 text-error" />
                              <div>
                                <div className="text-sm text-gray-500">上课地点</div>
                                <div className="font-medium">{classInfo.location}</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="alert alert-warning">
                            <AlertCircle className="w-5 h-5" />
                            <span>班级信息加载失败</span>
                          </div>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex flex-col gap-2 lg:w-48">
                        {hasVideoAccess && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleStartLearning(registration.courseId)}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            视频学习
                          </button>
                        )}
                        <button
                          className="btn btn-outline"
                          onClick={() => handleViewSchedule({ registration, classInfo, schedules })}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          查看课表
                        </button>
                        {registration.status === 'confirmed' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleTransferRequest({ registration, classInfo, schedules })}
                          >
                            <ArrowLeftRight className="w-4 h-4 mr-2" />
                            申请调课
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 下次上课提醒 */}
                    {schedules.length > 0 && registration.status === 'confirmed' && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="font-medium">下次上课：</span>
                          {(() => {
                            const upcoming = schedules.find(s => 
                              new Date(s.date + 'T' + s.endTime) > new Date() &&
                              s.status !== 'cancelled'
                            );
                            if (upcoming) {
                              return (
                                <span>
                                  {upcoming.date} {upcoming.startTime}-{upcoming.endTime} 
                                  <span className="text-gray-500 ml-2">{upcoming.location}</span>
                                </span>
                              );
                            }
                            return <span className="text-gray-500">暂无待上课程</span>;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 课表详情弹窗 */}
      {showScheduleModal && selectedClass && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {selectedClass.classInfo?.name} - 课程表
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedClass.schedules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无课表安排</p>
                </div>
              ) : (
                selectedClass.schedules.map((schedule) => (
                  <div 
                    key={schedule._id}
                    className={`p-4 rounded-lg border ${
                      schedule.status === 'completed' ? 'bg-base-200 opacity-60' :
                      schedule.status === 'cancelled' ? 'bg-error/10 border-error/30' :
                      new Date(schedule.date + 'T' + schedule.endTime) < new Date() ? 'bg-base-200' :
                      'bg-primary/5 border-primary/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <div className="text-sm text-gray-500">{schedule.date.slice(5)}</div>
                          <div className="font-bold">{schedule.startTime}</div>
                        </div>
                        <div>
                          <div className="font-medium">{schedule.title}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            {schedule.location}
                            {schedule.teacherName && (
                              <>
                                <span className="mx-1">·</span>
                                <GraduationCap className="w-3 h-3" />
                                {schedule.teacherName}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`badge ${
                        schedule.status === 'scheduled' ? 'badge-primary' :
                        schedule.status === 'completed' ? 'badge-success' :
                        schedule.status === 'cancelled' ? 'badge-error' :
                        'badge-ghost'
                      }`}>
                        {schedule.status === 'scheduled' ? '待上课' :
                         schedule.status === 'completed' ? '已完成' :
                         schedule.status === 'cancelled' ? '已取消' :
                         // @ts-ignore
                         schedule.status === 'adjusted' ? '已调整' : schedule.status}
                      </span>
                    </div>
                    {schedule.content && (
                      <div className="mt-2 text-sm text-gray-600 pl-[76px]">
                        {schedule.content}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="modal-action">
              <button 
                className="btn"
                onClick={() => setShowScheduleModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowScheduleModal(false)}></div>
        </div>
      )}
    </div>
  );
}
