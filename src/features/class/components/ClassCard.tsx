/**
 * ClassCard - 班级卡片组件
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import type { ClassInfo } from '../types/Class';

// ============================================================================
// Props
// ============================================================================

export interface ClassCardProps {
  /** 班级信息 */
  classInfo: ClassInfo;
  /** 卡片尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 点击事件 */
  onClick?: () => void;
}

// ============================================================================
// 组件
// ============================================================================

export const ClassCard: React.FC<ClassCardProps> = ({
  classInfo,
  size = 'medium',
  onClick,
}) => {
  // 尺寸样式
  const sizeStyles = {
    small: {
      wrapper: 'p-3',
      title: 'text-sm',
      badge: 'text-xs px-1.5 py-0.5',
    },
    medium: {
      wrapper: 'p-4',
      title: 'text-base',
      badge: 'text-xs px-2 py-1',
    },
    large: {
      wrapper: 'p-5',
      title: 'text-lg',
      badge: 'text-sm px-2 py-1',
    },
  };

  const styles = sizeStyles[size];

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enrolling':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'enrolling':
        return '报名中';
      case 'in_progress':
        return '进行中';
      case 'completed':
        return '已结束';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 计算剩余名额
  const remaining = classInfo.capacity - classInfo.enrolled;

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* 头部 */}
      <div className={`${styles.wrapper} border-b border-gray-100`}>
        {/* 标题行 */}
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-semibold text-gray-900 line-clamp-1 ${styles.title}`}>
            {classInfo.name}
          </h3>
          <span
            className={`${styles.badge} rounded whitespace-nowrap ${getStatusColor(
              classInfo.status
            )}`}
          >
            {getStatusText(classInfo.status)}
          </span>
        </div>

        {/* 等级标签 */}
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
            {classInfo.level || classInfo.levelName || '班级'}
          </span>
          {classInfo.courseName && (
            <span className="text-xs text-gray-400">
              关联课程：{classInfo.courseName}
            </span>
          )}
        </div>
      </div>

      {/* 信息区域 */}
      <div className="p-4 space-y-3">
        {/* 日期和时间 */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            {formatDate(classInfo.startDate)} - {formatDate(classInfo.endDate)}
          </span>
          {classInfo.startTime && classInfo.endTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              {classInfo.startTime} - {classInfo.endTime}
            </span>
          )}
        </div>

        {/* 地点 */}
        {classInfo.location && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            {classInfo.location}
          </div>
        )}

        {/* 教师 */}
        {classInfo.teacherName && (
          <div className="text-sm text-gray-600">
            授课教师：{classInfo.teacherName}
          </div>
        )}

        {/* 人数和价格 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-sm">
            <Users className="w-4 h-4 text-gray-400" />
            <span className={remaining > 0 ? 'text-gray-600' : 'text-red-500'}>
              {classInfo.enrolled}/{classInfo.capacity}
            </span>
            {remaining > 0 ? (
              <span className="text-green-500 text-xs">剩{remaining}名</span>
            ) : (
              <span className="text-red-500 text-xs">已满</span>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-red-500">
              ¥{classInfo.price}
            </span>
            {classInfo.originalPrice && classInfo.originalPrice > classInfo.price && (
              <span className="text-sm text-gray-400 line-through">
                ¥{classInfo.originalPrice}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 导出
// ============================================================================

export default ClassCard;
