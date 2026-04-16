/**
 * 课程详情页 v2.0
 * 
 * 业务逻辑变更：
 * - 线下培训：显示可报名班级列表
 * - 线上课程：直接购买/加入购物车
 * - 报名关联班级，班级控制视频权限
 * 
 * 版本: v20260410-refactor
 */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Clock, Users, BookOpen, Star, Play, ShoppingCart, CheckCircle, ArrowLeft, MapPin, Calendar, GraduationCap, Building2 } from 'lucide-react';
import { courseService } from '@/services/database';
import { classService } from '@/services';
import { registrationService } from '@/services/registrationService';
import { cartService } from '@/services/cart';
import { useAuthStore } from '@/store/authStore';
import type { Course, Lesson } from '@/types';
import type { ClassV2 } from '@/types/class';
import { Loading, ErrorState, toast } from '@/components';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<ClassV2[]>([]);
  const [myRegistration, setMyRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inCart, setInCart] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [registeringClassId, setRegisteringClassId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCourseData();
    }
  }, [id]);

  const loadCourseData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 并行加载课程、课时、班级列表
      const [courseData, lessonsData, classesData] = await Promise.all([
        courseService.getById(id),
        courseService.getLessons(id),
        classService.getClassesByCourse(id)
      ]);
      
      if (!courseData) {
        setError('课程不存在或已下架');
      } else {
        setCourse(courseData);
        setLessons(lessonsData);
        // 只显示招生中的班级 - 兼容 getClassesByCourse 返回格式
        const classList = classesData?.data || classesData || [];
        setClasses(Array.isArray(classList) ? classList.filter((c: any) => c.status === 'enrolling') : []);
      }

      // 如果已登录，检查是否已报名
      if (isAuthenticated && user) {
        try {
          const regData = await registrationService.getMyRegistration(user.id, id);
          setMyRegistration(regData);
        } catch {
          // 未报名，忽略错误
        }
      }
    } catch (err) {
      console.error('加载课程失败:', err);
      setError('加载课程失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 线下报名 - 选择班级
  const handleRegisterClass = async (classItem: ClassV2) => {
    if (!isAuthenticated) {
      toast.warning('请先登录');
      navigate('/login');
      return;
    }

    setRegisteringClassId(classItem._id);
    try {
      await registrationService.createRegistration({
        userId: user!.id,
        userName: user!.name || user!.phone || '未命名用户',
        userPhone: user!.phone || '',
        courseId: course!._id,
        courseName: course!.title,
        classId: classItem._id,
        className: classItem.name,
        source: 'offline',
        remark: ''
      });
      toast.success('报名申请已提交，请等待审核');
      // 刷新报名状态
      const regData = await registrationService.getMyRegistration(user!.id, course!._id);
      setMyRegistration(regData);
    } catch (err) {
      console.error('报名失败:', err);
      toast.error('报名失败，请稍后重试');
    } finally {
      setRegisteringClassId(null);
    }
  };

  // 线上购买 - 加入购物车
  const handleAddToCart = async () => {
    if (!course) return;
    
    if (!isAuthenticated) {
      toast.warning('请先登录');
      navigate('/login');
      return;
    }

    // 检查是否已购买或已拥有权限
    if (hasVideoAccess) {
      toast.info('您已购买该课程，无需重复购买');
      return;
    }

    setAddingToCart(true);
    try {
      await cartService.addToCart(user!.id, {
        courseId: course._id,
        courseTitle: course.title,
        coverImage: course.coverImage,
        price: course.price,
        teacherName: course.teacherName,
      });
      setInCart(true);
      toast.success('已加入购物车');
      setTimeout(() => setInCart(false), 2000);
    } catch (err) {
      console.error('加入购物车失败:', err);
      toast.error('加入购物车失败');
    } finally {
      setAddingToCart(false);
    }
  };

  // 线上购买 - 立即购买
  const handleBuyNow = () => {
    if (!course) return;
    
    if (!isAuthenticated) {
      toast.warning('请先登录');
      navigate('/login');
      return;
    }

    // 检查是否已购买或已拥有权限
    if (hasVideoAccess) {
      toast.info('您已购买该课程，无需重复购买');
      return;
    }

    navigate('/checkout', { 
      state: { 
        cartItems: [{
          courseId: course._id,
          courseTitle: course.title,
          coverImage: course.coverImage,
          price: course.price,
          teacherName: course.teacherName,
        }],
        totalAmount: course.price,
        finalAmount: course.price
      } 
    });
  };

  // 进入学习
  const handleStartLearning = () => {
    if (lessons.length > 0) {
      navigate(`/lessons/${lessons[0]._id}`);
    } else {
      toast.info('课程暂无内容');
    }
  };

  if (loading) {
    return <Loading fullScreen text="加载课程中..." />;
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-base-200 py-8">
        <div className="container mx-auto px-4">
          <ErrorState 
            title="课程加载失败"
            message={error || '课程不存在'}
            onRetry={loadCourseData}
            showBack
            showHome
          />
        </div>
      </div>
    );
  }

  const levelText = {
    beginner: '入门级',
    intermediate: '进阶级',
    advanced: '高级'
  };

  // 判断课程类型：有班级的是线下培训，纯线上课程
  const isOfflineTraining = classes.length > 0;
  const hasVideoAccess = myRegistration?.videoAccess?.hasAccess;

  return (
    <div className="min-h-screen bg-base-200 py-8">
      <div className="container mx-auto px-4">
        {/* 返回按钮 */}
        <button 
          onClick={() => navigate(-1)}
          className="btn btn-ghost mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </button>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {/* 面包屑 */}
            <div className="text-sm breadcrumbs mb-4">
              <ul>
                <li><Link to="/">首页</Link></li>
                <li><Link to="/courses">课程</Link></li>
                <li>{course.title}</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 左侧内容 */}
              <div className="lg:col-span-2">
                {/* 视频封面 */}
                <div className="aspect-video bg-gray-900 rounded-lg mb-6 flex items-center justify-center relative overflow-hidden group">
                  <img 
                    src={course.coverImage || 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800'} 
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    {hasVideoAccess ? (
                      <button 
                        onClick={handleStartLearning}
                        className="btn btn-circle btn-lg bg-primary hover:bg-primary-focus border-0"
                      >
                        <Play className="w-8 h-8 text-white fill-current" />
                      </button>
                    ) : (
                      <button className="btn btn-circle btn-lg bg-white/20 hover:bg-white/30 border-0 backdrop-blur-sm">
                        <Play className="w-8 h-8 text-white fill-current" />
                      </button>
                    )}
                  </div>
                  {/* 等级标签 */}
                  <div className="absolute top-4 left-4">
                    <span className={`badge badge-lg ${
                      course.level === 'beginner' ? 'badge-success' :
                      course.level === 'intermediate' ? 'badge-warning' :
                      'badge-error'
                    }`}>
                      {levelText[course.level]}
                    </span>
                  </div>
                  {/* 课程类型标签 */}
                  <div className="absolute top-4 right-4">
                    <span className={`badge badge-lg ${isOfflineTraining ? 'badge-secondary' : 'badge-primary'}`}>
                      {isOfflineTraining ? '线下培训' : '线上课程'}
                    </span>
                  </div>
                </div>

                {/* 课程信息 */}
                <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
                <p className="text-gray-600 mb-6 leading-relaxed">{course.description}</p>

                {/* 课程标签 */}
                {course.tags && course.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {course.tags.map((tag) => (
                      <span key={tag} className="badge badge-primary badge-outline">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 课程统计 */}
                <div className="stats stats-vertical lg:stats-horizontal shadow w-full mb-6 bg-base-200">
                  <div className="stat">
                    <div className="stat-figure text-primary">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div className="stat-title">课程时长</div>
                    <div className="stat-value text-2xl">{course.duration}h</div>
                  </div>
                  <div className="stat">
                    <div className="stat-figure text-secondary">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="stat-title">课时数</div>
                    <div className="stat-value text-2xl">{course.lessons}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-figure text-accent">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="stat-title">学习人数</div>
                    <div className="stat-value text-2xl">{course.salesCount || 0}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-figure text-yellow-500">
                      <Star className="w-6 h-6" />
                    </div>
                    <div className="stat-title">评分</div>
                    <div className="stat-value text-2xl">{(course.rating || 0).toFixed(1)}</div>
                    <div className="stat-desc">{course.reviewCount || 0} 条评价</div>
                  </div>
                </div>

                {/* 线下培训 - 班级列表 */}
                {isOfflineTraining && (
                  <>
                    <div className="divider text-lg font-semibold">
                      <Building2 className="w-5 h-5" />
                      可报名班级
                    </div>
                    <div className="space-y-4 mb-6">
                      {classes.length === 0 ? (
                        <div className="alert alert-info">
                          <Calendar className="w-5 h-5" />
                          <span>暂无招生中的班级，请联系客服咨询</span>
                        </div>
                      ) : (
                        classes.map((classItem) => (
                          <div 
                            key={classItem._id}
                            className="card bg-base-200 hover:bg-base-300 transition-colors"
                          >
                            <div className="card-body p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h3 className="font-bold text-lg flex items-center gap-2">
                                    {classItem.name}
                                    <span className={`badge badge-sm ${
                                      classItem.status === 'enrolling' ? 'badge-success' :
                                      classItem.status === 'full' ? 'badge-warning' :
                                      'badge-ghost'
                                    }`}>
                                      {classItem.status === 'enrolling' ? '招生中' :
                                       classItem.status === 'full' ? '已满员' :
                                       classItem.status === 'ongoing' ? '进行中' :
                                       classItem.status === 'completed' ? '已结课' : '已取消'}
                                    </span>
                                  </h3>
                                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      <span>{classItem.startDate} 至 {classItem.endDate}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-4 h-4" />
                                      <span>{classItem.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <GraduationCap className="w-4 h-4" />
                                      <span>{classItem.teacherName}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Users className="w-4 h-4" />
                                      <span>剩余名额: {classItem.maxStudents - (classItem.enrolledCount || 0)}/{classItem.maxStudents}</span>
                                    </div>
                                  </div>
                                  {classItem.description && (
                                    <p className="text-sm text-gray-500 mt-2">{classItem.description}</p>
                                  )}
                                </div>
                                <div className="ml-4">
                                  {myRegistration?.classId === classItem._id ? (
                                    <div className="badge badge-success badge-lg">
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      已报名
                                    </div>
                                  ) : myRegistration ? (
                                    <div className="badge badge-ghost badge-lg">已报其他班</div>
                                  ) : (
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleRegisterClass(classItem)}
                                      disabled={registeringClassId === classItem._id || classItem.status !== 'enrolling'}
                                    >
                                      {registeringClassId === classItem._id ? '提交中...' : '立即报名'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {/* 课程目录 */}
                <div className="divider text-lg font-semibold">课程目录</div>
                <div className="space-y-2">
                  {lessons.length > 0 ? (
                    <div className="space-y-2">
                      {lessons.map((lesson, index) => (
                        <div 
                          key={lesson._id} 
                          className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                            hasVideoAccess || lesson.isFree 
                              ? 'bg-base-200 hover:bg-base-300 cursor-pointer' 
                              : 'bg-base-200/50 opacity-70'
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const courseId = course._id;
                            const lessonId = lesson._id;
                            
                            console.log('[CourseDetail] 点击课时:', {
                              courseId,
                              lessonId,
                              lessonTitle: lesson.title,
                              isFree: lesson.isFree,
                              hasVideoAccess
                            });
                            
                            // 允许点击跳转：如果是免费课或有视频，直接跳转
                            if (lesson.isFree || lesson.videoUrl || hasVideoAccess) {
                              // 使用 Hash Router 格式跳转
                              window.location.hash = `#/learning/lesson/${courseId}?lessonId=${lessonId}`;
                            } else {
                              toast.info('请先购买课程');
                            }
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{lesson.title}</h4>
                            {lesson.description && (
                              <p className="text-sm text-gray-500">{lesson.description}</p>
                            )}
                          </div>
                          {lesson.isFree ? (
                            <span className="badge badge-success">免费试看</span>
                          ) : hasVideoAccess ? (
                            <Play className="w-4 h-4 text-primary" />
                          ) : (
                            <span className="badge badge-ghost">购买后观看</span>
                          )}
                          {lesson.videoDuration && (
                            <span className="text-sm text-gray-500">
                              {Math.floor(lesson.videoDuration / 60)}:{(lesson.videoDuration % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      <BookOpen className="w-5 h-5" />
                      <span>课程共 {course.lessons} 课时，购买后可观看全部内容</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧购买信息 */}
              <div>
                <div className="card bg-base-200 sticky top-4">
                  <div className="card-body">
                    {isOfflineTraining ? (
                      // 线下培训 - 报名信息
                      <>
                        <h2 className="card-title text-lg flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          线下培训报名
                        </h2>
                        
                        {myRegistration ? (
                          <div className="space-y-4">
                            <div className="alert alert-success">
                              <CheckCircle className="w-5 h-5" />
                              <div>
                                <div className="font-bold">报名状态: {myRegistration.status === 'confirmed' ? '已确认' : '审核中'}</div>
                                <div className="text-sm">班级: {myRegistration.className}</div>
                              </div>
                            </div>
                            {hasVideoAccess && (
                              <div className="alert alert-info">
                                <Play className="w-5 h-5" />
                                <span>已开通视频学习权限</span>
                              </div>
                            )}
                            <button
                              className="btn btn-primary w-full"
                              onClick={() => navigate('/my-classes')}
                            >
                              查看我的班级
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm text-gray-600 mb-4">
                              <p className="mb-2">选择左侧班级进行报名：</p>
                              <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>提交报名申请后需等待审核</li>
                                <li>审核通过后可参加线下培训</li>
                                <li>根据班级配置开通视频权限</li>
                              </ul>
                            </div>
                            <div className="divider"></div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>专业教师面授</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>实操设备提供</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>培训合格颁发证书</span>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      // 线上课程 - 购买信息
                      <>
                        <h2 className="card-title text-lg">购买课程</h2>

                        <div className="text-4xl font-bold text-primary mb-2">
                          ¥{course.price}
                        </div>
                        {course.originalPrice && course.originalPrice > course.price && (
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl text-gray-400 line-through">
                              ¥{course.originalPrice}
                            </span>
                            <span className="badge badge-error">
                              省 ¥{course.originalPrice - course.price}
                            </span>
                          </div>
                        )}

                        <div className="space-y-3 mt-6">
                          <button
                            className="btn btn-primary w-full"
                            onClick={handleBuyNow}
                          >
                            立即购买
                          </button>
                          <button
                            className={`btn w-full ${inCart ? 'btn-success' : 'btn-outline'}`}
                            onClick={handleAddToCart}
                            disabled={inCart || addingToCart}
                          >
                            <ShoppingCart size={20} />
                            {addingToCart ? '添加中...' : inCart ? '已加入购物车' : '加入购物车'}
                          </button>
                        </div>

                        <div className="divider"></div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>永久观看</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>支持手机、电脑、平板</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>学习完成后获得证书</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>7天无理由退款</span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="divider"></div>

                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-12">
                          <span>{course.teacherName?.charAt(0) || '教'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold">{course.teacherName || '授课教师'}</div>
                        <div className="text-sm text-gray-500">资深培训师</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
