import React from 'react';

interface LearningStatsProps {
  /** 总学习时长 */
  totalHours: number;
  /** 完成课程数 */
  completedCourses: number;
  /** 在学课程数 */
  inProgressCourses: number;
  /** 获得证书数 */
  certificates: number;
}

/**
 * 学习统计组件
 */
export const LearningStats: React.FC<LearningStatsProps> = ({
  totalHours,
  completedCourses,
  inProgressCourses,
  certificates,
}) => {
  const stats = [
    {
      label: '学习时长',
      value: totalHours,
      unit: '小时',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
        </svg>
      ),
      color: '#1890ff',
    },
    {
      label: '已完成',
      value: completedCourses,
      unit: '门课程',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      ),
      color: '#52c41a',
    },
    {
      label: '在学中',
      value: inProgressCourses,
      unit: '门课程',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
      ),
      color: '#faad14',
    },
    {
      label: '获得证书',
      value: certificates,
      unit: '张',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
        </svg>
      ),
      color: '#722ed1',
    },
  ];

  return (
    <div className="learning-stats">
      {stats.map((item) => (
        <div key={item.label} className="learning-stats__item">
          <div 
            className="learning-stats__icon"
            style={{ backgroundColor: `${item.color}15`, color: item.color }}
          >
            {item.icon}
          </div>
          <div className="learning-stats__content">
            <span className="learning-stats__value">
              {item.value}
            </span>
            <span className="learning-stats__unit">{item.unit}</span>
          </div>
          <span className="learning-stats__label">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * 课程进度环形图组件
 */
interface ProgressRingProps {
  /** 进度值 (0-100) */
  percentage: number;
  /** 圆环半径 */
  radius?: number;
  /** 线条宽度 */
  strokeWidth?: number;
  /** 颜色 */
  color?: string;
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
}

/**
 * 课程进度环形图
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  radius = 40,
  strokeWidth = 6,
  color = '#1890ff',
  size = 'medium',
}) => {
  const sizeConfig = {
    small: { radius: 24, strokeWidth: 4 },
    medium: { radius: 40, strokeWidth: 6 },
    large: { radius: 60, strokeWidth: 8 },
  };

  const { radius: r, strokeWidth: sw } = sizeConfig[size];
  const normalizedRadius = r - sw * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="progress-ring" style={{ width: r * 2, height: r * 2 }}>
      <svg height={r * 2} width={r * 2}>
        {/* 背景圆环 */}
        <circle
          stroke="#f0f0f0"
          fill="transparent"
          strokeWidth={sw}
          r={normalizedRadius}
          cx={r}
          cy={r}
        />
        {/* 进度圆环 */}
        <circle
          className="progress-ring__progress"
          stroke={color}
          fill="transparent"
          strokeWidth={sw}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={r}
          cy={r}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="progress-ring__text">
        <span className="progress-ring__percentage">{percentage}%</span>
      </div>
    </div>
  );
};
