import { useState, useEffect } from 'react';
import { 
  GraduationCap, Search, RefreshCw, 
  CheckCircle, Clock, PlayCircle,
  Eye, RotateCcw, ChevronLeft, ChevronRight,
  User, BookOpen, BarChart3, TrendingUp
} from 'lucide-react';
import { progressApi, type UserProgress, type ProgressStats } from '@/services/progressApi';
import { adminService } from '@/services/adminService';
import Loading from '@/components/Loading';
import EmptyState from '@/components/EmptyState';
import { formatDateStr } from '@/utils/dateUtils';

export default function AdminLearningProgress() {
  const [progressList, setProgressList] = useState<UserProgress[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    total: 0, notStarted: 0, inProgress: 0, completed: 0, thisWeek: 0, avgProgress: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  
  // 详情抽屉
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState<UserProgress | null>(null);
  
  // 用户列表（用于搜索）
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  useEffect(() => {
    loadUsersAndCourses();
    loadData();
  }, []);

  const loadUsersAndCourses = async () => {
    try {
      // 加载用户列表
      const usersRes = await adminService.list('users', {}, { limit: 500 });
      if (usersRes.data && Array.isArray(usersRes.data)) {
        setUsers(usersRes.data);
      }
      
      // 加载课程列表
      const coursesRes = await adminService.list('courses', {}, { limit: 500 });
      if (coursesRes.data && Array.isArray(coursesRes.data)) {
        setCourses(coursesRes.data);
      }
    } catch (err) {
      console.error('加载用户/课程列表失败', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 获取统计数据
      const statsRes = await progressApi.getStats();
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data as ProgressStats);
      }
      
      // 获取进度列表
      const params: any = {
        page: currentPage,
        pageSize: pageSize
      };
      if (selectedUserId) params.userId = selectedUserId;
      if (selectedCourseId) params.courseId = selectedCourseId;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.keyword = searchQuery;
      
      const listRes = await progressApi.getList(params);
      if (listRes.success && listRes.data) {
        const data = listRes.data as any;
        setProgressList(data.list || []);
        setTotalCount(data.total || 0);
      } else {
        // 降级：使用 adminService
        const fallbackRes = await adminService.list('user_progress', {}, { limit: pageSize });
        if (fallbackRes.data && Array.isArray(fallbackRes.data)) {
          setProgressList(fallbackRes.data as UserProgress[]);
          setTotalCount(fallbackRes.data.length);
        }
      }
    } catch (err) {
      console.error('加载进度数据失败', err);
      setProgressList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadData();
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleViewDetail = async (progress: UserProgress) => {
    setSelectedProgress(progress);
    setShowDetailDrawer(true);
  };

  // 进度更新功能（暂未使用）
  // @ts-expect-error 进度更新功能待实现
  const handleUpdateProgress = async (progressId: string, data: any) => {
    // TODO: 实现进度更新功能
  };

  const handleCompleteLesson = async (progressId: string) => {
    try {
      const res = await progressApi.completeLesson(progressId);
      if (res.success) {
        loadData();
        setShowDetailDrawer(false);
      }
    } catch (err) {
      console.error('完成课时失败', err);
    }
  };

  const handleResetProgress = async (userId: string, courseId: string) => {
    if (!confirm('确定要重置该学员的课程进度吗？此操作不可恢复！')) return;
    try {
      const res = await progressApi.resetProgress(userId, courseId);
      if (res.success) {
        loadData();
        setShowDetailDrawer(false);
      }
    } catch (err) {
      console.error('重置进度失败', err);
    }
  };

  const getStatusBadge = (status: string): React.ReactNode => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />已完成
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />进行中
          </span>
        );
      case 'not_started':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <PlayCircle className="w-3 h-3 mr-1" />未开始
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            未知
          </span>
        );
    }
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const filteredList = progressList;

  if (loading) {
    return <Loading text="加载学习进度数据..." />;
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">学习进度管理</h1>
        <p className="text-gray-500 mt-1">管理学员学习进度、查看完成状态、调整进度</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">总记录</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
              <PlayCircle className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.notStarted}</p>
              <p className="text-sm text-gray-500">未开始</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">进行中</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">已完成</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
              <p className="text-sm text-gray-500">本周新增</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mr-4">
              <BarChart3 className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</p>
              <p className="text-sm text-gray-500">平均进度</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 关键词搜索 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索学员姓名、课程名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* 用户筛选 */}
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
          >
            <option value="">全部学员</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>
                {user.name || user.nickName || user.phone || user._id}
              </option>
            ))}
          </select>
          
          {/* 课程筛选 */}
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
          >
            <option value="">全部课程</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.title}
              </option>
            ))}
          </select>
          
          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部状态</option>
            <option value="not_started">未开始</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
          </select>
          
          {/* 按钮组 */}
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              搜索
            </button>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 进度列表 */}
      {filteredList.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-16 h-16 text-gray-300" />}
          title="暂无学习进度记录"
          description="没有找到符合条件的学习进度记录"
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    学员信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    课程
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    课时
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    进度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最近学习
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredList.map((progress, index) => (
                  <tr key={progress._id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {progress.userName || progress.userPhone || progress.userId || '-'}
                          </p>
                          {progress.userPhone && (
                            <p className="text-xs text-gray-500">{progress.userPhone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <BookOpen className="w-4 h-4 text-gray-400 mr-2" />
                        <p className="text-sm text-gray-900 max-w-[200px] truncate">
                          {progress.courseTitle || progress.courseId || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-[150px] truncate">
                        {progress.lessonTitle || progress.lessonId || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(progress.status || 'not_started')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getProgressColor(progress.progress || 0)}`}
                            style={{ width: `${progress.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{progress.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {progress.lastStudyTime 
                        ? formatDateStr(new Date(progress.lastStudyTime).toISOString())
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetail(progress)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {progress.status !== 'completed' && (
                          <button
                            onClick={() => handleCompleteLesson(progress._id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="完成课时"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleResetProgress(progress.userId, progress.courseId)}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="重置进度"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 分页 */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                共 {totalCount} 条记录，第 {currentPage}/{totalPages} 页
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 进度详情抽屉 */}
      {showDetailDrawer && selectedProgress && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div 
            className="absolute inset-0"
            onClick={() => setShowDetailDrawer(false)}
          />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900">进度详情</h3>
              <button
                onClick={() => setShowDetailDrawer(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 学员信息 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3">学员信息</h4>
                <div className="flex items-center mb-2">
                  <User className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="font-medium">
                    {selectedProgress.userName || selectedProgress.userPhone || '-'}
                  </span>
                </div>
                {selectedProgress.userPhone && (
                  <p className="text-sm text-gray-500 ml-7">{selectedProgress.userPhone}</p>
                )}
              </div>
              
              {/* 课程信息 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3">课程信息</h4>
                <div className="flex items-center mb-2">
                  <BookOpen className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="font-medium">
                    {selectedProgress.courseTitle || '-'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 ml-7">
                  课程ID: {selectedProgress.courseId}
                </p>
              </div>
              
              {/* 课时信息 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3">课时信息</h4>
                <p className="font-medium mb-2">
                  {selectedProgress.lessonTitle || '-'}
                </p>
                <p className="text-sm text-gray-500">
                  课时ID: {selectedProgress.lessonId}
                </p>
              </div>
              
              {/* 进度信息 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3">学习进度</h4>
                <div className="flex items-center mb-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressColor(selectedProgress.progress || 0)}`}
                      style={{ width: `${selectedProgress.progress || 0}%` }}
                    />
                  </div>
                  <span className="ml-3 font-bold text-lg">{selectedProgress.progress || 0}%</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">当前状态</p>
                    <p className="font-medium">{getStatusBadge(selectedProgress.status || 'not_started')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">视频进度</p>
                    <p className="font-medium">{selectedProgress.videoProgress || 0}秒</p>
                  </div>
                </div>
              </div>
              
              {/* 时间信息 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3">时间记录</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">创建时间</span>
                    <span>{formatDateStr(new Date(selectedProgress.createdAt).toISOString())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">最后学习</span>
                    <span>
                      {selectedProgress.lastStudyTime 
                        ? formatDateStr(new Date(selectedProgress.lastStudyTime).toISOString())
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">完成时间</span>
                    <span>
                      {selectedProgress.completedAt 
                        ? formatDateStr(new Date(selectedProgress.completedAt).toISOString())
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="space-y-3 pt-4">
                {selectedProgress.status !== 'completed' && (
                  <button
                    onClick={() => handleCompleteLesson(selectedProgress._id)}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    标记完成
                  </button>
                )}
                <button
                  onClick={() => handleResetProgress(selectedProgress.userId, selectedProgress.courseId)}
                  className="w-full px-4 py-3 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  重置进度
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
