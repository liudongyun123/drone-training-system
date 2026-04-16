/**
 * 我的培训页面
 * 
 * 功能：
 * 1. 课表 - 查看已报班级的课程安排
 * 2. 出勤 - 查看出勤记录和统计
 * 3. 调课 - 申请调课/请假
 * 4. 费用 - 查看费用记录和待缴费用
 * 
 * 适用用户：线上报名、线下报名、混合用户
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  CreditCard,
  ChevronRight,
  RefreshCw,
  Users,
  Video,
  ArrowRightLeft,
  History,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Loading, EmptyState, Card } from '@/components';
import { formatDateStr, formatTimeStr } from '@/utils/dateUtils';

interface ClassInfo {
  _id: string;
  name: string;
  courseName: string;
  teacherName: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  enrolledAt: string;
  attendance?: {
    total: number;
    present: number;
    absent: number;
    late: number;
  };
}

interface ScheduleItem {
  _id: string;
  classId: string;
  className: string;
  title: string;
  teacherName: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  attendanceStatus?: 'present' | 'absent' | 'late' | 'pending';
}

interface AttendanceRecord {
  _id: string;
  scheduleId: string;
  className: string;
  scheduleTitle: string;
  date: string;
  startTime: string;
  status: 'present' | 'absent' | 'late';
  checkInTime?: string;
  notes?: string;
}

interface TransferRequest {
  _id: string;
  classId: string;
  className: string;
  originalDate: string;
  originalTime: string;
  newDate: string;
  newTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  rejectedReason?: string;
}

interface PaymentRecord {
  _id: string;
  className: string;
  amount: number;
  type: 'tuition' | 'material' | 'exam' | 'other';
  status: 'paid' | 'unpaid' | 'refunded';
  paidAt?: string;
  dueDate?: string;
  description?: string;
}

type TabType = 'schedule' | 'attendance' | 'transfer' | 'expense';

export default function MyTrainingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, phone } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  
  // 数据状态
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  
  // 统计
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalSchedules: 0,
    upcomingSchedules: 0,
    completedSchedules: 0,
    attendanceRate: 0,
    pendingPayments: 0,
    pendingPaymentsAmount: 0,
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadTrainingData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadTrainingData = async () => {
    setLoading(true);
    try {
      const userId = user?.uid || user?.id || (user as any)?._openid;
      const userPhone = phone || localStorage.getItem('user_phone');
      
      console.log('[MyTrainingPage] 加载数据:', { userId, userPhone });

      // 使用 adminService 通过云函数查询（绕过数据库安全规则）
      const { adminService } = await import('@/services/adminService');

      // 1. 获取班级成员记录
      let classList: ClassInfo[] = [];
      try {
        const memberQuery: any = {};
        if (userId) memberQuery.userId = userId;
        if (userPhone) memberQuery.userPhone = userPhone;
        
        const memberResult = await adminService.list('class_members', memberQuery, { limit: 100 });
        console.log('[MyTrainingPage] 班级成员原始结果:', memberResult);
        
        let members: any[] = [];
        if (Array.isArray(memberResult.data)) {
          members = memberResult.data;
        } else if (memberResult.data && memberResult.data.list !== undefined) {
          members = Array.isArray(memberResult.data.list) ? memberResult.data.list : [];
        } else if (memberResult.data && memberResult.data.data !== undefined) {
          members = Array.isArray(memberResult.data.data) ? memberResult.data.data : [];
        }
        console.log('[MyTrainingPage] 班级成员解析后:', members.length, members);
        
        // 获取班级详情
        for (const member of members) {
          if (member.classId) {
            try {
              const classResult = await adminService.get('classes', member.classId);
              const classInfo = classResult.data;
              if (classInfo) {
                classList.push({
                  _id: member.classId,
                  name: member.className || classInfo.name || '班级',
                  courseName: classInfo.courseName || member.courseName || '',
                  teacherName: member.teacherName || classInfo.teacherName || '待分配',
                  startDate: classInfo.startDate || classInfo.startTime || '',
                  endDate: classInfo.endDate || classInfo.endTime || '',
                  location: classInfo.location || member.location || '待定',
                  status: member.status || classInfo.status || 'enrolled',
                  enrolledAt: member.enrolledAt || member.createdAt,
                  attendance: member.attendance,
                });
              }
            } catch (e) {
              console.error('[MyTrainingPage] 获取班级详情失败:', e);
            }
          }
        }
        setClasses(classList);
      } catch (e) {
        console.error('[MyTrainingPage] 查询班级成员失败:', e);
      }

      // 2. 获取课表
      let scheduleList: ScheduleItem[] = [];
      if (classList.length > 0) {
        try {
          const classIds = classList.map(c => c._id);
          const scheduleResult = await adminService.list('schedules', { classId: { $in: classIds } }, { limit: 200 });
          console.log('[MyTrainingPage] 课表原始结果:', scheduleResult);
          
          let schedules: any[] = [];
          if (Array.isArray(scheduleResult.data)) {
            schedules = scheduleResult.data;
          } else if (scheduleResult.data && scheduleResult.data.list !== undefined) {
            schedules = Array.isArray(scheduleResult.data.list) ? scheduleResult.data.list : [];
          } else if (scheduleResult.data && scheduleResult.data.data !== undefined) {
            schedules = Array.isArray(scheduleResult.data.data) ? scheduleResult.data.data : [];
          }
          console.log('[MyTrainingPage] 课表解析后:', schedules.length, schedules);
          
          // 查询出勤记录
          let attendanceMap = new Map();
          try {
            const attendanceQuery: any = {};
            if (userId) attendanceQuery.userId = userId;
            if (userPhone) attendanceQuery.userId = userPhone;
            const attendanceResult = await adminService.list('attendance_records', attendanceQuery, { limit: 500 });
            console.log('[MyTrainingPage] 出勤记录原始结果:', attendanceResult);
            
            let attendances: any[] = [];
            if (Array.isArray(attendanceResult.data)) {
              attendances = attendanceResult.data;
            } else if (attendanceResult.data && attendanceResult.data.list !== undefined) {
              attendances = Array.isArray(attendanceResult.data.list) ? attendanceResult.data.list : [];
            } else if (attendanceResult.data && attendanceResult.data.data !== undefined) {
              attendances = Array.isArray(attendanceResult.data.data) ? attendanceResult.data.data : [];
            }
            console.log('[MyTrainingPage] 出勤记录解析后:', attendances.length, attendances);
            attendances.forEach((a: any) => attendanceMap.set(a.scheduleId, a.status));
          } catch (e) {
            console.log('[MyTrainingPage] 查询出勤记录失败:', e);
          }
          
          scheduleList = schedules.map((s: any) => ({
            _id: s._id,
            classId: s.classId,
            className: classList.find(c => c._id === s.classId)?.name || '',
            title: s.title || s.scheduleTitle || '课程',
            teacherName: s.teacherName || '',
            date: s.date || s.startTime?.split('T')[0] || '',
            startTime: s.startTime || '',
            endTime: s.endTime || '',
            location: s.location || '待定',
            status: s.status || 'scheduled',
            attendanceStatus: attendanceMap.get(s._id) || 'pending',
          }));
          setSchedules(scheduleList);
        } catch (e) {
          console.error('[MyTrainingPage] 查询课表失败:', e);
        }
      }

      // 3. 获取出勤记录
      let attendanceList: AttendanceRecord[] = [];
      try {
        const attendanceQuery: any = {};
        if (userId) attendanceQuery.userId = userId;
        if (userPhone) attendanceQuery.userId = userPhone;
        
        const attendanceResult = await adminService.list('attendance_records', attendanceQuery, { limit: 200 });
        console.log('[MyTrainingPage] 出勤记录列表原始结果:', attendanceResult);
        
        let attendances: any[] = [];
        if (Array.isArray(attendanceResult.data)) {
          attendances = attendanceResult.data;
        } else if (attendanceResult.data && attendanceResult.data.list !== undefined) {
          attendances = Array.isArray(attendanceResult.data.list) ? attendanceResult.data.list : [];
        } else if (attendanceResult.data && attendanceResult.data.data !== undefined) {
          attendances = Array.isArray(attendanceResult.data.data) ? attendanceResult.data.data : [];
        }
        console.log('[MyTrainingPage] 出勤记录列表解析后:', attendances.length, attendances);
        
        attendanceList = attendances.map((a: any) => ({
          _id: a._id,
          scheduleId: a.scheduleId || a._id,
          className: classList.find(c => c._id === a.classId)?.name || a.className || '',
          scheduleTitle: a.title || '课程',
          date: a.date || a.checkInTime?.split('T')[0] || '',
          startTime: a.startTime || '',
          status: a.status,
          checkInTime: a.checkInTime,
          notes: a.notes,
        }));
        setAttendanceRecords(attendanceList);
      } catch (e) {
        console.error('[MyTrainingPage] 查询出勤记录失败:', e);
      }

      // 4. 获取调课申请
      let transferList: TransferRequest[] = [];
      try {
        const transferQuery: any = {};
        if (userId) transferQuery.userId = userId;
        if (userPhone) transferQuery.userId = userPhone;
        
        const transferResult = await adminService.list('transfer_requests', transferQuery, { limit: 50 });
        console.log('[MyTrainingPage] 调课申请原始结果:', transferResult);
        
        let transfers: any[] = [];
        if (Array.isArray(transferResult.data)) {
          transfers = transferResult.data;
        } else if (transferResult.data && transferResult.data.list !== undefined) {
          transfers = Array.isArray(transferResult.data.list) ? transferResult.data.list : [];
        } else if (transferResult.data && transferResult.data.data !== undefined) {
          transfers = Array.isArray(transferResult.data.data) ? transferResult.data.data : [];
        }
        console.log('[MyTrainingPage] 调课申请解析后:', transfers.length, transfers);
        
        transferList = transfers.map((t: any) => ({
          _id: t._id,
          classId: t.classId || '',
          className: t.className || '',
          originalDate: t.originalDate || t.originalStartTime?.split('T')[0] || '',
          originalTime: t.originalTime || t.originalStartTime || '',
          newDate: t.newDate || t.newStartTime?.split('T')[0] || '',
          newTime: t.newTime || t.newStartTime || '',
          reason: t.reason || '',
          status: t.status || 'pending',
          createdAt: t.createdAt,
          processedAt: t.processedAt,
          rejectedReason: t.rejectedReason,
        }));
        setTransferRequests(transferList);
      } catch (e) {
        console.error('[MyTrainingPage] 查询调课申请失败:', e);
      }

      // 5. 获取费用记录
      let paymentList: PaymentRecord[] = [];
      try {
        const enrollQuery: any = {};
        if (userId) {
          enrollQuery.$or = [
            { userId },
            { studentId: userId },
            { _openid: userId }
          ];
        }
        if (userPhone) {
          enrollQuery.$or = enrollQuery.$or || [];
          enrollQuery.$or.push({ phone: userPhone });
        }
        
        const enrollResult = await adminService.list('enrollments', enrollQuery, { limit: 100 });
        console.log('[MyTrainingPage] 报名记录原始结果:', enrollResult);
        
        let enrollments: any[] = [];
        if (Array.isArray(enrollResult.data)) {
          enrollments = enrollResult.data;
        } else if (enrollResult.data && enrollResult.data.list !== undefined) {
          enrollments = Array.isArray(enrollResult.data.list) ? enrollResult.data.list : [];
        } else if (enrollResult.data && enrollResult.data.data !== undefined) {
          enrollments = Array.isArray(enrollResult.data.data) ? enrollResult.data.data : [];
        }
        console.log('[MyTrainingPage] 报名记录解析后:', enrollments.length, enrollments);
        
        enrollments.forEach((reg: any) => {
          if (reg.amount || reg.tuition) {
            paymentList.push({
              _id: `${reg._id}_tuition`,
              className: reg.className || reg.courseName || '班级',
              amount: reg.amount || reg.tuition || 0,
              type: 'tuition',
              status: reg.paymentStatus === 'paid' ? 'paid' : 'unpaid',
              paidAt: reg.paidAt,
              dueDate: reg.dueDate,
              description: '培训费用',
            });
          }
        });
        setPayments(paymentList);
      } catch (e) {
        console.error('[MyTrainingPage] 查询费用记录失败:', e);
      }

      // 更新统计
      const now = new Date().toISOString();
      const upcoming = scheduleList.filter(s => s.date >= now.split('T')[0] && s.status !== 'cancelled').length;
      const completedSchedules = scheduleList.filter(s => s.status === 'completed').length;
      const presentCount = attendanceList.filter(r => r.status === 'present' || r.status === 'late').length;
      const attendanceRate = attendanceList.length > 0 ? Math.round((presentCount / attendanceList.length) * 100) : 0;
      const pendingPayments = paymentList.filter(p => p.status === 'unpaid');
      
      setStats({
        totalClasses: classList.length,
        totalSchedules: scheduleList.length,
        upcomingSchedules: upcoming,
        completedSchedules,
        attendanceRate,
        pendingPayments: pendingPayments.length,
        pendingPaymentsAmount: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
      });

      console.log('[MyTrainingPage] 加载完成:', {
        classes: classList.length,
        schedules: scheduleList.length,
        attendance: attendanceList.length,
        transfers: transferList.length,
        payments: paymentList.length
      });

    } catch (error) {
      console.error('[MyTrainingPage] 加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };



  // 申请调课
  const handleApplyTransfer = () => {
    navigate('/training/transfer-apply');
  };

  // 渲染课表标签页
  const renderScheduleTab = () => {
    // 确保 schedules 是数组
    const safeSchedules = Array.isArray(schedules) ? schedules : [];
    
    return (
    <div className="space-y-4">
      {/* 即将上课 */}
      {safeSchedules.filter(s => s.status === 'scheduled' && s.date >= new Date().toISOString().split('T')[0]).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            即将上课
          </h3>
          <div className="space-y-3">
            {safeSchedules
              .filter(s => s.status === 'scheduled' && s.date >= new Date().toISOString().split('T')[0])
              .slice(0, 5)
              .map(schedule => (
                <Card key={schedule._id} className="border-l-4 border-l-blue-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{schedule.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{schedule.className}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDateStr(schedule.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatTimeStr(schedule.startTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {schedule.location}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {schedule.attendanceStatus === 'present' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          已出勤
                        </span>
                      )}
                      {schedule.attendanceStatus === 'absent' && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                          缺勤
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* 历史课程 */}
      {safeSchedules.filter(s => s.status === 'completed').length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            历史课程
          </h3>
          <div className="space-y-3">
            {safeSchedules
              .filter(s => s.status === 'completed')
              .slice(0, 10)
              .map(schedule => (
                <Card key={schedule._id} className="border-l-4 border-l-gray-300 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-700">{schedule.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{schedule.className}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        <span>{formatDateStr(schedule.date)}</span>
                        <span>{formatTimeStr(schedule.startTime)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {schedule.attendanceStatus === 'present' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                          <CheckCircle size={12} />
                          已出勤
                        </span>
                      )}
                      {schedule.attendanceStatus === 'absent' && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1">
                          <XCircle size={12} />
                          缺勤
                        </span>
                      )}
                      {schedule.attendanceStatus === 'late' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs flex items-center gap-1">
                          <AlertCircle size={12} />
                          迟到
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {safeSchedules.length === 0 && (
        <EmptyState
          type="custom"
          icon={<Calendar className="w-16 h-16 text-gray-300" />}
          title="暂无课程安排"
          description="您还没有报名线下班级，或课程安排尚未发布"
          action={
            <button
              onClick={() => navigate('/open-classes')}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              查看开班信息
            </button>
          }
        />
      )}
    </div>
  );};

  // 渲染出勤标签页
  const renderAttendanceTab = () => {
    // 确保是数组
    const safeAttendanceRecords = Array.isArray(attendanceRecords) ? attendanceRecords : [];
    
    return (
    <div className="space-y-4">
      {/* 出勤统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="text-center">
          <p className="text-3xl font-bold text-blue-600">{safeAttendanceRecords.length}</p>
          <p className="text-sm text-gray-500 mt-1">总出勤</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-green-600">
            {safeAttendanceRecords.filter(r => r.status === 'present').length}
          </p>
          <p className="text-sm text-gray-500 mt-1">出勤</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-yellow-600">
            {safeAttendanceRecords.filter(r => r.status === 'late').length}
          </p>
          <p className="text-sm text-gray-500 mt-1">迟到</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-red-600">
            {safeAttendanceRecords.filter(r => r.status === 'absent').length}
          </p>
          <p className="text-sm text-gray-500 mt-1">缺勤</p>
        </Card>
      </div>

      {/* 出勤率 */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">整体出勤率</p>
            <p className="text-4xl font-bold mt-1">{stats.attendanceRate}%</p>
          </div>
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10" />
          </div>
        </div>
      </Card>

      {/* 出勤记录列表 */}
      <div className="space-y-3">
        {safeAttendanceRecords.map(record => (
          <Card key={record._id} className="border-l-4 border-l-gray-300">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-800">{record.scheduleTitle}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {record.className} · {formatDateStr(record.date)}
                </p>
                {record.checkInTime && (
                  <p className="text-xs text-gray-400 mt-1">
                    签到时间: {formatTimeStr(record.checkInTime)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {record.status === 'present' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <CheckCircle size={14} />
                    出勤
                  </span>
                )}
                {record.status === 'late' && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <AlertCircle size={14} />
                    迟到
                  </span>
                )}
                {record.status === 'absent' && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <XCircle size={14} />
                    缺勤
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {safeAttendanceRecords.length === 0 && (
        <EmptyState
          type="custom"
          icon={<CheckCircle className="w-16 h-16 text-gray-300" />}
          title="暂无出勤记录"
          description="出勤记录将在您参加线下培训后显示"
        />
      )}
    </div>
  );};

  // 渲染调课标签页
  const renderTransferTab = () => {
    // 确保是数组
    const safeTransferRequests = Array.isArray(transferRequests) ? transferRequests : [];
    const safeClasses = Array.isArray(classes) ? classes : [];
    
    return (
    <div className="space-y-4">
      {/* 调课说明 */}
      <Card className="bg-blue-50 border border-blue-200">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">调课说明</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• 请提前至少 24 小时提交调课申请</li>
              <li>• 调课申请需管理员审核通过</li>
              <li>• 每人每班级每月最多调课 2 次</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 申请调课按钮 */}
      {safeClasses.length > 0 && (
        <button
          onClick={handleApplyTransfer}
          className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <ArrowRightLeft className="w-5 h-5" />
          申请调课
        </button>
      )}

      {/* 调课记录列表 */}
      <div className="space-y-3">
        {safeTransferRequests.map(request => (
          <Card key={request._id}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">{request.className}</h4>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="text-gray-400">原时间：</span>
                    {formatDateStr(request.originalDate)} {formatTimeStr(request.originalTime)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="text-gray-400">调至：</span>
                    {formatDateStr(request.newDate)} {formatTimeStr(request.newTime)}
                  </p>
                  {request.reason && (
                    <p className="text-sm text-gray-500 mt-2">
                      <span className="text-gray-400">原因：</span>{request.reason}
                    </p>
                  )}
                </div>
              </div>
              <div>
                {request.status === 'pending' && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <Clock size={14} />
                    待审核
                  </span>
                )}
                {request.status === 'approved' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <CheckCircle size={14} />
                    已通过
                  </span>
                )}
                {request.status === 'rejected' && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <XCircle size={14} />
                    已拒绝
                  </span>
                )}
              </div>
            </div>
            {request.rejectedReason && (
              <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                拒绝原因：{request.rejectedReason}
              </div>
            )}
          </Card>
        ))}
      </div>

      {safeTransferRequests.length === 0 && (
        <EmptyState
          type="custom"
          icon={<ArrowRightLeft className="w-16 h-16 text-gray-300" />}
          title="暂无调课记录"
          description="您还没有提交过调课申请"
        />
      )}
    </div>
  );};

  // 渲染费用标签页
  const renderExpenseTab = () => {
    // 确保是数组
    const safePayments = Array.isArray(payments) ? payments : [];
    
    return (
    <div className="space-y-4">
      {/* 费用统计 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-sm text-gray-500">总费用</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            ¥{safePayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-gray-500">待缴费</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            ¥{stats.pendingPaymentsAmount.toFixed(2)}
          </p>
        </Card>
      </div>

      {/* 待缴费提醒 */}
      {stats.pendingPayments > 0 && (
        <Card className="bg-orange-50 border border-orange-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800">待缴费提醒</h4>
              <p className="text-sm text-orange-700 mt-1">
                您有 {stats.pendingPayments} 笔待缴费，共计 ¥{stats.pendingPaymentsAmount.toFixed(2)}
              </p>
              <button
                onClick={() => navigate('/checkout')}
                className="mt-2 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium"
              >
                立即支付
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* 费用记录列表 */}
      <div className="space-y-3">
        {safePayments.map(payment => (
          <Card key={payment._id}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">{payment.className}</h4>
                {payment.description && (
                  <p className="text-sm text-gray-500 mt-1">{payment.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    payment.type === 'tuition' ? 'bg-blue-100 text-blue-700' :
                    payment.type === 'material' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {payment.type === 'tuition' ? '学费' :
                     payment.type === 'material' ? '教材' :
                     payment.type === 'exam' ? '考试' : '其他'}
                  </span>
                  {payment.dueDate && (
                    <span className="text-xs text-gray-400">
                      截止: {formatDateStr(payment.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-800">¥{payment.amount.toFixed(2)}</p>
                {payment.status === 'paid' && (
                  <span className="text-sm text-green-600 flex items-center gap-1 justify-end mt-1">
                    <CheckCircle size={14} />
                    已支付
                  </span>
                )}
                {payment.status === 'unpaid' && (
                  <span className="text-sm text-red-600 flex items-center gap-1 justify-end mt-1">
                    <XCircle size={14} />
                    待支付
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {safePayments.length === 0 && (
        <EmptyState
          type="custom"
          icon={<CreditCard className="w-16 h-16 text-gray-300" />}
          title="暂无费用记录"
          description="您的费用记录将在缴费后显示"
        />
      )}
    </div>
  );};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Loading fullScreen text="加载培训数据..." />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <EmptyState
            type="custom"
            icon={<Users className="w-16 h-16" />}
            title="请先登录"
            description="登录后即可查看您的培训信息"
            action={
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                去登录
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">我的培训</h1>
          <p className="text-gray-500 mt-2">管理您的线下班级培训</p>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center gap-2">
              <Users className="w-8 h-8 text-white/80" />
              <div>
                <p className="text-white/80 text-xs">已报班级</p>
                <p className="text-xl font-bold">{stats.totalClasses}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center gap-2">
              <Calendar className="w-8 h-8 text-white/80" />
              <div>
                <p className="text-white/80 text-xs">待上课</p>
                <p className="text-xl font-bold">{stats.upcomingSchedules}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-8 h-8 text-white/80" />
              <div>
                <p className="text-white/80 text-xs">出勤率</p>
                <p className="text-xl font-bold">{stats.attendanceRate}%</p>
              </div>
            </div>
          </Card>
          <Card className={`bg-gradient-to-br ${stats.pendingPayments > 0 ? 'from-red-500 to-red-600' : 'from-gray-500 to-gray-600'} text-white`}>
            <div className="flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-white/80" />
              <div>
                <p className="text-white/80 text-xs">待缴费</p>
                <p className="text-xl font-bold">¥{stats.pendingPaymentsAmount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 班级卡片 */}
        {Array.isArray(classes) && classes.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">我的班级</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map(cls => (
                <Card key={cls._id} className="border-l-4 border-l-blue-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">{cls.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{cls.courseName}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {cls.teacherName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Video size={14} />
                          {cls.location}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      cls.status === 'enrolled' || cls.status === 'learning' 
                        ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {cls.status === 'enrolled' ? '学习中' : 
                       cls.status === 'completed' ? '已结业' : '已退出'}
                    </span>
                  </div>
                  {cls.attendance && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">出勤统计</span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓ {cls.attendance.present}</span>
                          <span className="text-yellow-600">~ {cls.attendance.late}</span>
                          <span className="text-red-600">✗ {cls.attendance.absent}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 标签页切换 */}
        <div className="bg-white rounded-xl shadow-sm p-1 mb-6">
          <div className="grid grid-cols-4 gap-1">
            {[
              { key: 'schedule' as TabType, label: '课表', icon: Calendar, count: stats.upcomingSchedules },
              { key: 'attendance' as TabType, label: '出勤', icon: CheckCircle, count: stats.attendanceRate },
              { key: 'transfer' as TabType, label: '调课', icon: ArrowRightLeft, count: (Array.isArray(transferRequests) ? transferRequests : []).filter(t => t.status === 'pending').length },
              { key: 'expense' as TabType, label: '费用', icon: CreditCard, count: stats.pendingPayments },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-4 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 标签页内容 */}
        <div>
          {activeTab === 'schedule' && renderScheduleTab()}
          {activeTab === 'attendance' && renderAttendanceTab()}
          {activeTab === 'transfer' && renderTransferTab()}
          {activeTab === 'expense' && renderExpenseTab()}
        </div>

        {/* 刷新按钮 */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={loadTrainingData}
            className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all hover:scale-105"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
