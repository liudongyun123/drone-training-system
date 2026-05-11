import React from 'react';
import type { LearningProgress, LearningPath } from '../types';
import LazyImage from '@/components/LazyImage';

interface ProgressCardProps {
  /** 学习进度数据 */
  progress: LearningProgress;
  /** 点击卡片回调 */
  onClick?: (courseId: string) => void;
  /** 继续学习回调 */
  onContinue?: (courseId: string) => void;
}

/**
 * 学习进度卡片组件
 */
export const ProgressCard: React.FC<ProgressCardProps> = ({
  progress,
  onClick,
  onContinue,
}) => {
  const handleClick = () => {
    onClick?.(progress.courseId);
  };

  const handleContinue = (e: React.MouseEvent) => {
    e.stopPropagation();
    onContinue?.(progress.courseId);
  };

  // 计算进度百分比
  const percentage = progress.totalHours > 0
    ? Math.round((progress.completedHours / progress.totalHours) * 100)
    : 0;

  // 状态显示
  const statusText = {
    not_started: '未开始',
    in_progress: '学习中',
    completed: '已完成',
  }[progress.status];

  const statusColor = {
    not_started: '#999',
    in_progress: '#1890ff',
    completed: '#52c41a',
  }[progress.status];

  return (
    <div className="progress-card" onClick={handleClick}>
      {/* 课程封面 */}
      <div className="progress-card__cover">
        {progress.coverUrl ? (
          <LazyImage src={progress.coverUrl} alt={progress.courseName} />
        ) : (
          <div className="progress-card__cover-placeholder">
            <span>{progress.courseName.charAt(0)}</span>
          </div>
        )}
        
        {/* 状态标签 */}
        <span 
          className="progress-card__status"
          style={{ backgroundColor: statusColor }}
        >
          {statusText}
        </span>
      </div>

      {/* 课程信息 */}
      <div className="progress-card__info">
        <h3 className="progress-card__title">{progress.courseName}</h3>
        
        {/* 进度条 */}
        <div className="progress-card__progress">
          <div className="progress-card__progress-bar">
            <div 
              className="progress-card__progress-fill"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="progress-card__progress-text">
            {percentage}% · {progress.completedLessons}/{progress.totalLessons} 课时
          </span>
        </div>

        {/* 学习时长 */}
        <div className="progress-card__meta">
          <span>学习时长：{progress.completedHours.toFixed(1)}小时</span>
          {progress.lastLearnedAt && (
            <span>最近学习：{formatRelativeTime(progress.lastLearnedAt)}</span>
          )}
        </div>
      </div>

      {/* 继续学习按钮 */}
      {progress.status !== 'completed' && (
        <button 
          className="progress-card__continue"
          onClick={handleContinue}
        >
          {progress.status === 'not_started' ? '开始学习' : '继续学习'}
        </button>
      )}
    </div>
  );
};

/**
 * 学习路径卡片组件
 */
interface LearningPathCardProps {
  /** 学习路径数据 */
  path: LearningPath;
  /** 用户进度 */
  progress?: LearningProgress;
  /** 点击卡片回调 */
  onClick?: (pathId: string) => void;
  /** 开始学习回调 */
  onStart?: (pathId: string) => void;
}

export const LearningPathCard: React.FC<LearningPathCardProps> = ({
  path,
  progress,
  onClick,
  onStart,
}) => {
  const handleClick = () => {
    onClick?.(path.id);
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStart?.(path.id);
  };

  // 计算完成度
  const completedCount = progress?.courseIds?.length || 0;
  const totalCount = path.courses.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="learning-path-card" onClick={handleClick}>
      {/* 路径封面 */}
      <div className="learning-path-card__cover">
        <LazyImage src={path.coverUrl} alt={path.name} />
        <div className="learning-path-card__level">{path.level}</div>
      </div>

      {/* 路径信息 */}
      <div className="learning-path-card__info">
        <h3 className="learning-path-card__title">{path.name}</h3>
        <p className="learning-path-card__desc">{path.description}</p>
        
        {/* 课程数量 */}
        <div className="learning-path-card__stats">
          <span>{path.courses.length} 门课程</span>
          <span>{path.totalHours} 小时</span>
        </div>

        {/* 进度条 */}
        <div className="learning-path-card__progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="progress-text">{completedCount}/{totalCount}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <button 
        className="learning-path-card__action"
        onClick={handleStart}
      >
        {completedCount === 0 ? '开始学习' : '继续学习'}
      </button>
    </div>
  );
};

/**
 * 证书卡片组件
 */
interface CertificateCardProps {
  /** 证书数据 */
  certificate: Certificate;
  /** 下载回调 */
  onDownload?: (certificateId: string) => void;
  /** 分享回调 */
  onShare?: (certificateId: string) => void;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  certificate,
  onDownload,
  onShare,
}) => {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload?.(certificate.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(certificate.id);
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="certificate-card">
      {/* 证书图标 */}
      <div className="certificate-card__icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
        </svg>
      </div>

      {/* 证书信息 */}
      <div className="certificate-card__info">
        <h3 className="certificate-card__name">{certificate.name}</h3>
        <p className="certificate-card__course">{certificate.courseName}</p>
        <p className="certificate-card__date">
          获得时间：{formatDate(certificate.issuedAt)}
        </p>
        
        {/* 证书编号 */}
        <p className="certificate-card__id">
          证书编号：{certificate.id}
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="certificate-card__actions">
        <button 
          className="certificate-card__btn certificate-card__btn--primary"
          onClick={handleDownload}
        >
          下载证书
        </button>
        <button 
          className="certificate-card__btn"
          onClick={handleShare}
        >
          分享
        </button>
      </div>
    </div>
  );
};

// 辅助函数：格式化相对时间
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return date.toLocaleDateString('zh-CN');
}
