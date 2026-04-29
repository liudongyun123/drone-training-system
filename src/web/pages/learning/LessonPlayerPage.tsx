// ============================================================================
// 课时播放页面
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  ChevronLeft, CheckCircle, Circle, Lock, 
  FileText, Download, MessageCircle, Clock,
  Menu, X, ChevronRight, Play
} from 'lucide-react';
import { courseService } from '@/services/database';
import { progressService, StudyProgress } from '@/services/progress';
import { getFileUrl } from '@/services/storageService';
import { useAuthStore } from '@/store/authStore';
import { Loading, ErrorState, Button } from '@/components';
import VideoPlayer from '@/components/VideoPlayer';

interface Lesson {
  _id: string;
  title: string;
  duration: number;
  videoUrl: string;
  videoUrlResolved?: string; // 转换后的视频URL
  order: number;
  chapterId: string;
  resources?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

interface Chapter {
  _id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Course {
  _id: string;
  title: string;
  coverImage: string;
  description: string;
  chapters: Chapter[];
}

export default function LessonPlayerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [lessonProgress, setLessonProgress] = useState<StudyProgress | null>(null);
  const [progressMap, setProgressMap] = useState<Map<string, StudyProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'resources' | 'notes'>('content');
  const [saveProgressTimeout, setSaveProgressTimeout] = useState<NodeJS.Timeout | null>(null);

  // 加载课程数据
  useEffect(() => {
    if (courseId && isAuthenticated) {
      loadCourseData();
    } else if (!isAuthenticated) {
      setLoading(false);
      setError('请先登录');
    }
  }, [courseId, isAuthenticated]);

  const loadCourseData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 加载课程详情
      const courseDetail = await courseService.getById(courseId!);
      
      // 加载课时列表
      const lessons = await courseService.getLessons(courseId!);
      
      // 将课时按章节分组（如果没有章节概念，则创建一个默认章节）
      if (lessons.length > 0) {
        // 按 order 分组到不同章节
        const chapterMap = new Map<number, Chapter>();
        
        lessons.forEach(lesson => {
          const chapterOrder = Math.floor((lesson.order - 1) / 5) + 1; // 每5个课时一组
          if (!chapterMap.has(chapterOrder)) {
            chapterMap.set(chapterOrder, {
              _id: `chapter_${chapterOrder}`,
              title: `第${chapterOrder}章`,
              order: chapterOrder,
              lessons: []
            });
          }
          chapterMap.get(chapterOrder)!.lessons.push({
            _id: lesson._id,
            title: lesson.title,
            duration: lesson.videoDuration || 0,
            videoUrl: lesson.videoUrl || '',
            order: lesson.order,
            chapterId: `chapter_${chapterOrder}`,
            resources: lesson.resources
          });
        });
        
        courseDetail.chapters = Array.from(chapterMap.values()).sort((a, b) => a.order - b.order);
      } else {
        courseDetail.chapters = [];
      }
      
      setCourse(courseDetail);

      // 加载学习进度
      if (user?.uid) {
        const progressList = await progressService.getCourseProgress(user.uid, courseId!);
        const progressMap = new Map<string, StudyProgress>();
        progressList.forEach((p: StudyProgress) => {
          progressMap.set(p.lessonId, p);
        });
        setProgressMap(progressMap);

        // 找到第一个未完成的课时或上次学习的课时
        let targetLesson: Lesson | null = null;
        const allLessons = courseDetail.chapters?.flatMap((c: Chapter) => c.lessons) || [];
        
        // 先尝试找 URL 参数指定的课时
        const urlLessonId = searchParams.get('lessonId');
        console.log('[LessonPlayer] URL lessonId 参数:', urlLessonId);
        
        if (urlLessonId) {
          targetLesson = allLessons.find((l: Lesson) => l._id === urlLessonId) || null;
          console.log('[LessonPlayer] 从URL参数找到指定课时:', urlLessonId, targetLesson ? '存在' : '不存在');
        }
        
        // 如果URL没有指定，找上次学习的课时
        if (!targetLesson && progressList.length > 0) {
          const sortedProgress = [...progressList].sort((a: StudyProgress, b: StudyProgress) => 
            new Date(b.lastWatchTime).getTime() - new Date(a.lastWatchTime).getTime()
          );
          const lastProgress = sortedProgress[0];
          if (lastProgress) {
            targetLesson = allLessons.find((l: Lesson) => l._id === lastProgress.lessonId) || null;
          }
        }
        
        // 如果还是没有，找第一个未完成的
        if (!targetLesson) {
          targetLesson = allLessons.find((l: Lesson) => {
            const progress = progressMap.get(l._id);
            return !progress?.completed;
          }) || allLessons[0] || null;
        }

        if (targetLesson) {
          // 转换初始课时的视频 URL
          let resolvedLesson = { ...targetLesson };
          if (targetLesson.videoUrl && targetLesson.videoUrl.startsWith('cloud://')) {
            try {
              const tempUrl = await getFileUrl(targetLesson.videoUrl);
              if (tempUrl) {
                resolvedLesson.videoUrlResolved = tempUrl;
              }
            } catch (err) {
              console.error('[LessonPlayer] 初始视频 URL 转换失败:', err);
            }
          } else if (targetLesson.videoUrl) {
            resolvedLesson.videoUrlResolved = targetLesson.videoUrl;
          }
          setCurrentLesson(resolvedLesson);
          setLessonProgress(progressMap.get(targetLesson._id) || null);
        }
      }
    } catch (err) {
      console.error('加载课程失败:', err);
      setError('加载课程失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 保存学习进度
  const saveProgress = useCallback(async (currentTime: number, duration: number) => {
    if (!user?.uid || !currentLesson || !courseId) return;

    const progress = Math.min(Math.round((currentTime / duration) * 100), 100);
    const completed = progress >= 90;

    try {
      const progressData = await progressService.saveProgress({
        userId: user.uid,
        courseId,
        lessonId: currentLesson._id,
        watchedDuration: currentTime,
        totalDuration: duration,
        watchProgress: progress,
        completed,
        lastWatchTime: new Date().toISOString(),
      });

      setLessonProgress(progressData);
      setProgressMap(prev => new Map(prev).set(currentLesson._id, progressData));
    } catch (err) {
      console.error('保存进度失败:', err);
    }
  }, [user?.uid, currentLesson, courseId]);

  // 处理视频时间更新
  const handleTimeUpdate = (currentTime: number, duration: number) => {
    // 防抖保存进度，每5秒保存一次
    if (saveProgressTimeout) {
      clearTimeout(saveProgressTimeout);
    }
    const timeout = setTimeout(() => {
      saveProgress(currentTime, duration);
    }, 5000);
    setSaveProgressTimeout(timeout);
  };

  // 处理视频播放完成
  const handleVideoEnded = async () => {
    if (!user?.uid || !currentLesson || !courseId) return;
    
    await saveProgress(currentLesson.duration, currentLesson.duration);
    
    // 自动播放下一个课时
    const allLessons = course?.chapters?.flatMap(c => c.lessons) || [];
    const currentIndex = allLessons.findIndex(l => l._id === currentLesson._id);
    const nextLesson = allLessons[currentIndex + 1];
    
    if (nextLesson) {
      handleLessonSelect(nextLesson);
    }
  };

  // 选择课时
  const handleLessonSelect = async (lesson: Lesson) => {
    // 清除之前的保存定时器
    if (saveProgressTimeout) {
      clearTimeout(saveProgressTimeout);
    }

    // 转换 cloud:// URL 为可访问的临时 URL
    let resolvedLesson = { ...lesson };
    if (lesson.videoUrl && lesson.videoUrl.startsWith('cloud://')) {
      try {
        const tempUrl = await getFileUrl(lesson.videoUrl);
        if (tempUrl) {
          resolvedLesson.videoUrlResolved = tempUrl;
          console.log('[LessonPlayer] 视频 URL 已转换:', lesson.videoUrl, '->', tempUrl);
        } else {
          console.error('[LessonPlayer] 获取视频 URL 失败');
        }
      } catch (err) {
        console.error('[LessonPlayer] 转换视频 URL 出错:', err);
      }
    } else if (lesson.videoUrl) {
      resolvedLesson.videoUrlResolved = lesson.videoUrl;
    }
    
    setCurrentLesson(resolvedLesson);
    setLessonProgress(progressMap.get(lesson._id) || null);
    
    // 在移动端关闭侧边栏
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // 切换课时完成状态
  const toggleLessonComplete = async () => {
    if (!user?.uid || !currentLesson) return;
    
    const isCompleted = lessonProgress?.completed;
    
    if (isCompleted) {
      // 取消完成状态（这里简化处理，实际可能需要重新设计）
      await saveProgress(0, currentLesson.duration);
    } else {
      await progressService.markAsCompleted(user.uid, currentLesson._id);
      await saveProgress(currentLesson.duration, currentLesson.duration);
    }
  };

  // 计算课程总体进度
  const calculateTotalProgress = () => {
    if (!course?.chapters) return 0;
    const allLessons = course.chapters.flatMap(c => c.lessons);
    if (allLessons.length === 0) return 0;
    
    const completedLessons = allLessons.filter(l => {
      const progress = progressMap.get(l._id);
      return progress?.completed;
    }).length;
    
    return Math.round((completedLessons / allLessons.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Loading fullScreen text="加载课程..." />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <ErrorState
            title={error || '课程不存在'}
            message="该课程可能已下架或不存在"
            showBack
            showHome
          />
        </div>
      </div>
    );
  }

  const totalProgress = calculateTotalProgress();
  const allLessons = course.chapters?.flatMap(c => c.lessons) || [];
  const completedCount = allLessons.filter(l => progressMap.get(l._id)?.completed).length;

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* 主内容区 */}
      <div className={`flex-1 flex flex-col transition-all ${sidebarOpen ? 'lg:mr-80' : ''}`}>
        {/* 顶部导航 */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/learning" 
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-white font-medium line-clamp-1">{course.title}</h1>
              <p className="text-gray-400 text-xs">
                进度: {completedCount}/{allLessons.length} 课时 ({totalProgress}%)
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-400 hover:text-white p-2"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* 视频播放器 */}
        <div className="flex-1 bg-black flex items-center justify-center">
          {currentLesson ? (
            <VideoPlayer
              src={currentLesson.videoUrlResolved || currentLesson.videoUrl}
              title={currentLesson.title}
              poster={course.coverImage}
              autoplay={false}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              className="w-full h-full max-h-[calc(100vh-200px)]"
            />
          ) : (
            <div className="text-center text-gray-400">
              <Play size={48} className="mx-auto mb-4 opacity-50" />
              <p>请选择课时开始学习</p>
            </div>
          )}
        </div>

        {/* 课时信息 */}
        {currentLesson && (
          <div className="bg-gray-800 border-t border-gray-700">
            {/* 标签页 */}
            <div className="flex border-b border-gray-700">
              {[
                { key: 'content', label: '课时内容', icon: FileText },
                { key: 'resources', label: '资料下载', icon: Download },
                { key: 'notes', label: '学习笔记', icon: MessageCircle },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 内容区 */}
            <div className="p-6">
              {activeTab === 'content' && (
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-2">
                        {currentLesson.title}
                      </h2>
                      <div className="flex items-center gap-4 text-gray-400 text-sm">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {Math.floor(currentLesson.duration / 60)}:{(currentLesson.duration % 60).toString().padStart(2, '0')}
                        </span>
                        {lessonProgress?.completed && (
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle size={14} />
                            已完成
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={lessonProgress?.completed ? 'secondary' : 'primary'}
                      onClick={toggleLessonComplete}
                    >
                      {lessonProgress?.completed ? (
                        <><CheckCircle size={16} className="mr-1" /> 已完成</>
                      ) : (
                        <><Circle size={16} className="mr-1" /> 标记完成</>
                      )}
                    </Button>
                  </div>
                  <p className="text-gray-400 leading-relaxed">
                    {course.description}
                  </p>
                </div>
              )}

              {activeTab === 'resources' && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">课程资料</h3>
                  {currentLesson.resources && currentLesson.resources.length > 0 ? (
                    <div className="space-y-3">
                      {currentLesson.resources.map((resource, index) => (
                        <a
                          key={index}
                          href={resource.url}
                          download
                          className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          <FileText className="text-blue-400" size={20} />
                          <span className="text-white flex-1">{resource.name}</span>
                          <Download size={16} className="text-gray-400" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">暂无课程资料</p>
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">学习笔记</h3>
                  <textarea
                    className="w-full h-32 bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="记录学习心得..."
                  />
                  <div className="flex justify-end mt-3">
                    <Button variant="primary">保存笔记</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 侧边栏 - 课程目录 */}
      <div className={`
        fixed lg:static inset-y-0 right-0 w-80 bg-gray-800 border-l border-gray-700
        transform transition-transform lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'}
        z-50 flex flex-col
      `}>
        {/* 侧边栏头部 */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white font-medium">课程目录</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* 章节列表 */}
        <div className="flex-1 overflow-y-auto">
          {course.chapters?.map((chapter, chapterIndex) => (
            <div key={chapter._id}>
              {/* 章节标题 */}
              <div className="px-4 py-3 bg-gray-700/50">
                <h3 className="text-sm font-medium text-gray-300">
                  第{chapterIndex + 1}章: {chapter.title}
                </h3>
              </div>

              {/* 课时列表 */}
              <div>
                {chapter.lessons?.map((lesson, lessonIndex) => {
                  const progress = progressMap.get(lesson._id);
                  const isActive = currentLesson?._id === lesson._id;
                  const isCompleted = progress?.completed;

                  return (
                    <button
                      key={lesson._id}
                      onClick={() => handleLessonSelect(lesson)}
                      className={`
                        w-full px-4 py-3 flex items-start gap-3 text-left transition-colors
                        ${isActive ? 'bg-blue-500/20 border-l-2 border-blue-500' : 'hover:bg-gray-700/50 border-l-2 border-transparent'}
                      `}
                    >
                      {/* 完成状态图标 */}
                      <div className="mt-0.5">
                        {isCompleted ? (
                          <CheckCircle size={16} className="text-green-400" />
                        ) : (
                          <Circle size={16} className="text-gray-500" />
                        )}
                      </div>

                      {/* 课时信息 */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          isActive ? 'text-blue-400' : 'text-gray-300'
                        }`}>
                          {lessonIndex + 1}. {lesson.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={12} className="text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}
                          </span>
                          {progress && progress.watchProgress > 0 && !isCompleted && (
                            <span className="text-xs text-blue-400">
                              已学 {progress.watchProgress}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 播放图标 */}
                      {isActive && (
                        <Play size={16} className="text-blue-400 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 侧边栏底部 */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">课程进度</span>
            <span className="text-blue-400 font-medium">{totalProgress}%</span>
          </div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 遮罩层 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
