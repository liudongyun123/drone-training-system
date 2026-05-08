/**
 * CourseCard - 课程卡片组件
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Users, Clock, PlayCircle } from 'lucide-react';
import type { Course } from '../types/Course';

// ============================================================================
// Props
// ============================================================================

export interface CourseCardProps {
  /** 课程信息 */
  course: Course;
  /** 是否显示讲师 */
  showTeacher?: boolean;
  /** 是否显示价格 */
  showPrice?: boolean;
  /** 是否显示进度 */
  showProgress?: boolean;
  /** 卡片尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 点击事件 */
  onClick?: () => void;
}

// ============================================================================
// 组件
// ============================================================================

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  showTeacher = true,
  showPrice = true,
  showProgress = false,
  size = 'medium',
  onClick,
}) => {
  // 尺寸样式
  const sizeStyles = {
    small: {
      image: 'h-32',
      content: 'p-3',
      title: 'text-sm',
      desc: 'text-xs',
    },
    medium: {
      image: 'h-40',
      content: 'p-4',
      title: 'text-base',
      desc: 'text-sm',
    },
    large: {
      image: 'h-48',
      content: 'p-5',
      title: 'text-lg',
      desc: 'text-base',
    },
  };

  const styles = sizeStyles[size];

  // 格式化时长
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  // 计算总课时数
  const totalLessons = course.sections?.reduce(
    (acc, section) => acc + (section.lessons?.length || 0),
    0
  ) || 0;

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* 封面图 */}
      <div className={`relative ${styles.image}`}>
        <img
          src={course.coverImage || '/placeholder-course.jpg'}
          alt={course.title}
          className="w-full h-full object-cover"
        />
        
        {/* 免费标签 */}
        {course.isFree && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
            免费
          </span>
        )}
        
        {/* 播放图标 */}
        {course.isFree && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
            <PlayCircle className="w-12 h-12 text-white" />
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className={styles.content}>
        {/* 标题 */}
        <h3 className={`font-semibold text-gray-900 line-clamp-2 ${styles.title}`}>
          {course.title}
        </h3>

        {/* 描述 */}
        {size !== 'small' && (
          <p className={`text-gray-500 mt-1 line-clamp-2 ${styles.desc}`}>
            {course.description}
          </p>
        )}

        {/* 统计信息 */}
        <div className="flex items-center gap-4 mt-3 text-gray-400 text-xs">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {course.enrolledCount || 0}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(course.duration || 0)}
          </span>
          {totalLessons > 0 && (
            <span className="flex items-center gap-1">
              {totalLessons} 课时
            </span>
          )}
        </div>

        {/* 讲师 */}
        {showTeacher && course.teacher && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <img
              src={course.teacher.avatar || '/placeholder-avatar.jpg'}
              alt={course.teacher.name}
              className="w-6 h-6 rounded-full object-cover"
            />
            <span className="text-sm text-gray-600">{course.teacher.name}</span>
          </div>
        )}

        {/* 价格和评分 */}
        <div className="flex items-center justify-between mt-3">
          {showPrice && (
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-red-500">
                ¥{course.price}
              </span>
              {course.originalPrice && course.originalPrice > course.price && (
                <span className="text-sm text-gray-400 line-through">
                  ¥{course.originalPrice}
                </span>
              )}
            </div>
          )}
          
          {course.rating > 0 && (
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">{course.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 导出
// ============================================================================

export default CourseCard;
