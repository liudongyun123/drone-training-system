/**
 * 开班信息列表页面
 * 展示所有正在招生的班级
 * 
 * 版本: v20260412
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users,
  Clock,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { classService } from '@/services';
import { Loading, ErrorState } from '@/components';

interface ClassItem {
  _id: string;
  name: string;
  courseId: string;
  courseName: string;
  teacherName: string;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
  maxStudents: number;
  currentStudents: number;
  description?: string;
}

export default function OpenClassesPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await classService.getList({ 
        status: 'enrolling',  // 只获取正在招生的班级
        page: 1, 
        pageSize: 100 
      });
      
      // 兼容处理返回格式
      let list: ClassItem[] = [];
      if (result.code === 0) {
        if (Array.isArray(result.data)) {
          list = result.data;
        } else if (result.data?.list) {
          // @ts-ignore
          list = result.data.list;
        }
      }
      
      setClasses(list);
    } catch (err) {
      console.error('加载开班信息失败:', err);
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (classId: string) => {
    navigate(`/registration/class/${classId}`);
  };

  if (loading) {
    return <Loading fullScreen text="加载中..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="container mx-auto px-4">
          <ErrorState title="加载失败" message={error} onRetry={loadClasses} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">开班信息</h1>
          <p className="text-gray-600 mt-2">浏览正在招生的培训班级</p>
        </div>

        {classes.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-16">
              <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">暂无开班信息</h2>
              <p className="text-gray-500">当前没有正在招生的班级</p>
              <Link to="/courses" className="btn btn-outline mt-4">
                浏览线上课程
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div 
                key={cls._id} 
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
                onClick={() => handleViewDetails(cls._id)}
              >
                <div className="card-body">
                  {/* 班级名称 */}
                  <h3 className="card-title text-lg">{cls.name}</h3>
                  
                  {/* 课程名称 */}
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {cls.courseName}
                  </p>

                  {/* 信息列表 */}
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-primary" />
                      <span>{cls.teacherName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-secondary" />
                      <span>{cls.startDate} 至 {cls.endDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-error" />
                      <span>{cls.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-accent" />
                      <span>招生 {cls.currentStudents}/{cls.maxStudents} 人</span>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="mt-4">
                    <div className="w-full bg-base-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((cls.currentStudents / cls.maxStudents) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* 操作 */}
                  <div className="card-actions justify-end mt-4">
                    <button className="btn btn-primary btn-sm">
                      查看详情
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
