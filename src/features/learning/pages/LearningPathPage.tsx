import React from 'react';
import { useLearningPath } from '../hooks';
import { ProgressRing } from '../components/LearningStats';
import { LearningPathCard } from '../components/ProgressCard';
import LazyImage from '@/components/LazyImage';

interface LearningPathPageProps {
  /** 路径 ID */
  pathId: string;
}

/**
 * 学习路径详情页面
 */
export const LearningPathPage: React.FC<LearningPathPageProps> = ({ pathId }) => {
  // 学习路径 Hook
  const {
    path,
    progress,
    loading,
    error,
    refresh,
    getNextCourse,
    completionPercentage,
  } = useLearningPath({ pathId, autoLoad: true });

  // 开始学习
  const handleStartLearning = () => {
    const nextCourseId = getNextCourse();
    if (nextCourseId) {
      window.location.href = `/course/${nextCourseId}`;
    }
  };

  // 查看课程详情
  const handleCourseClick = (courseId: string) => {
    window.location.href = `/course/${courseId}`;
  };

  if (loading) {
    return (
      <div className="learning-path-page">
        <div className="loading-skeleton">
          <div className="skeleton-header" />
          <div className="skeleton-content">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-course" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !path) {
    return (
      <div className="learning-path-page">
        <div className="error-state">
          <p>{error?.message || '加载失败'}</p>
          <button onClick={refresh}>重试</button>
        </div>
      </div>
    );
  }

  // 已完成课程 ID 列表
  const completedCourseIds = progress?.courseIds || [];

  return (
    <div className="learning-path-page">
      {/* 页面头部 */}
      <header className="path-header">
        <div className="path-header__cover">
          <LazyImage src={path.coverUrl} alt={path.name} />
          <div className="path-header__level">{path.level}</div>
        </div>
        
        <div className="path-header__info">
          <h1>{path.name}</h1>
          <p className="path-header__desc">{path.description}</p>
          
          <div className="path-header__meta">
            <span>{path.courses.length} 门课程</span>
            <span>{path.totalHours} 小时</span>
            <span>{path.skills.length} 项技能</span>
          </div>

          {/* 技能标签 */}
          <div className="path-header__skills">
            {path.skills.map((skill) => (
              <span key={skill} className="skill-tag">
                {skill}
              </span>
            ))}
          </div>

          {/* 进度和操作 */}
          <div className="path-header__action">
            <ProgressRing 
              percentage={completionPercentage} 
              size="medium" 
              color="#52c41a"
            />
            <button 
              className="btn-primary"
              onClick={handleStartLearning}
            >
              {completedCourseIds.length === 0 ? '开始学习' : '继续学习'}
            </button>
          </div>
        </div>
      </header>

      {/* 课程列表 */}
      <section className="path-courses">
        <h2>学习路径</h2>
        <div className="path-courses__list">
          {path.courses.map((course, index) => {
            const isCompleted = completedCourseIds.includes(course.id);
            
            return (
              <div 
                key={course.id} 
                className={`course-item ${isCompleted ? 'completed' : ''}`}
                onClick={() => handleCourseClick(course.id)}
              >
                {/* 序号/完成状态 */}
                <div className="course-item__index">
                  {isCompleted ? (
                    <span className="completed-icon">✓</span>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* 课程封面 */}
                <div className="course-item__cover">
                  <LazyImage src={course.coverUrl} alt={course.name} />
                </div>

                {/* 课程信息 */}
                <div className="course-item__info">
                  <h3>{course.name}</h3>
                  <p>{course.description}</p>
                  <div className="course-item__meta">
                    <span>{course.lessonCount} 课时</span>
                    <span>{course.totalHours} 小时</span>
                  </div>
                </div>

                {/* 状态标签 */}
                <div className="course-item__status">
                  {isCompleted ? (
                    <span className="status-completed">已完成</span>
                  ) : (
                    <span className="status-pending">待学习</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
