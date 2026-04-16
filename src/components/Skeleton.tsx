/**
 * 骨架屏加载组件
 * 提供优雅的加载占位效果，改善用户体验
 */

import React from 'react';

// ============================================================================
// 基础骨架组件
// ============================================================================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1em',
  borderRadius = '4px',
  animation = 'pulse',
  style
}) => {
  const baseStyle: React.CSSProperties = {
    width,
    height,
    borderRadius,
    backgroundColor: '#e5e7eb',
    ...style
  };

  const animationStyle = animation === 'pulse' ? {
    animation: 'skeleton-pulse 1.5s ease-in-out infinite'
  } : animation === 'wave' ? {
    position: 'relative' as const,
    overflow: 'hidden',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      animation: 'skeleton-wave 1.5s linear infinite'
    }
  } : {};

  return (
    <div style={{ ...baseStyle, ...animationStyle }} className="skeleton-base" />
  );
};

// ============================================================================
// 卡片骨架屏
// ============================================================================

interface SkeletonCardProps {
  avatar?: boolean;
  title?: boolean;
  rows?: number;
  action?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  avatar = true,
  title = true,
  rows = 3,
  action = true
}) => {
  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {avatar && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Skeleton width={48} height={48} borderRadius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={12} />
          </div>
        </div>
      )}
      
      {title && (
        <Skeleton width="80%" height={24} style={{ marginBottom: '1rem' }} />
      )}
      
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton 
          key={i} 
          width={i === rows - 1 ? '70%' : '100%'} 
          height={14} 
          style={{ marginBottom: '0.75rem' }} 
        />
      ))}
      
      {action && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <Skeleton width={80} height={32} borderRadius="6px" />
          <Skeleton width={80} height={32} borderRadius="6px" />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 列表骨架屏
// ============================================================================

interface SkeletonListProps {
  count?: number;
  avatar?: boolean;
  rows?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  avatar = true,
  rows = 2
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index}
          style={{
            display: 'flex',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '8px'
          }}
        >
          {avatar && (
            <Skeleton width={48} height={48} borderRadius="50%" />
          )}
          <div style={{ flex: 1 }}>
            <Skeleton width="50%" height={16} style={{ marginBottom: 8 }} />
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton 
                key={i} 
                width={i === 0 ? '90%' : '60%'} 
                height={12} 
                style={{ marginBottom: 6 }} 
              />
            ))}
          </div>
          <Skeleton width={60} height={32} borderRadius="6px" />
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// 表格骨架屏
// ============================================================================

interface SkeletonTableProps {
  columns?: number;
  rows?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  columns = 5,
  rows = 5
}) => {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
      {/* 表头 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '1rem',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={16} />
        ))}
      </div>
      
      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '1rem',
            padding: '1rem',
            borderBottom: rowIndex < rows - 1 ? '1px solid #f3f4f6' : 'none'
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height={14} />
          ))}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// 内容骨架屏
// ============================================================================

export const SkeletonContent: React.FC = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Hero 区域 */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <Skeleton width="60%" height={40} style={{ margin: '0 auto 1rem' }} />
        <Skeleton width="80%" height={20} style={{ margin: '0 auto 0.5rem' }} />
        <Skeleton width="50%" height={20} style={{ margin: '0 auto' }} />
      </div>
      
      {/* 统计卡片 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={100} borderRadius="12px" />
        ))}
      </div>
      
      {/* 课程列表 */}
      <SkeletonCard avatar={false} rows={4} />
    </div>
  );
};

// ============================================================================
// 轮播图骨架屏
// ============================================================================

export const SkeletonBanner: React.FC = () => {
  return (
    <div style={{
      width: '100%',
      height: '400px',
      backgroundColor: '#e5e7eb',
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景动画 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
        animation: 'skeleton-wave 1.5s linear infinite'
      }} />
    </div>
  );
};

// ============================================================================
// 媒体骨架屏
// ============================================================================

interface SkeletonMediaProps {
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4';
}

export const SkeletonMedia: React.FC<SkeletonMediaProps> = ({
  aspectRatio = '16:9'
}) => {
  const ratios: Record<string, string> = {
    '16:9': '56.25%',
    '4:3': '75%',
    '1:1': '100%',
    '3:4': '133.33%'
  };

  return (
    <div style={{ position: 'relative', paddingBottom: ratios[aspectRatio] }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#e5e7eb',
        borderRadius: '8px'
      }} />
    </div>
  );
};

// ============================================================================
// 表单骨架屏
// ============================================================================

export const SkeletonForm: React.FC = () => {
  return (
    <div style={{ maxWidth: '500px' }}>
      {/* 输入框 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Skeleton width={100} height={14} style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="100%" height={44} borderRadius="8px" />
      </div>
      
      {/* 多行输入 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Skeleton width={100} height={14} style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="100%" height={120} borderRadius="8px" />
      </div>
      
      {/* 选择框 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Skeleton width={100} height={14} style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="100%" height={44} borderRadius="8px" />
      </div>
      
      {/* 提交按钮 */}
      <Skeleton width={120} height={44} borderRadius="8px" />
    </div>
  );
};

// ============================================================================
// 侧边栏骨架屏
// ============================================================================

export const SkeletonSidebar: React.FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  return (
    <div style={{
      width: collapsed ? '64px' : '240px',
      backgroundColor: '#1f2937',
      padding: '1rem',
      minHeight: '100vh'
    }}>
      {/* Logo */}
      <Skeleton width={collapsed ? 40 : 120} height={32} style={{ marginBottom: '2rem' }} />
      
      {/* 菜单项 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div 
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            marginBottom: '0.5rem',
            borderRadius: '6px'
          }}
        >
          <Skeleton width={20} height={20} borderRadius="4px" />
          {!collapsed && (
            <Skeleton width="70%" height={14} />
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// 导出样式（需在全局 CSS 中引入）
// ============================================================================

export const skeletonStyles = `
  @keyframes skeleton-pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes skeleton-wave {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .skeleton-base {
    background: linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%);
    background-size: 200% 100%;
    animation: skeleton-wave 1.5s linear infinite;
  }
`;

// ============================================================================
// 懒加载占位组件
// ============================================================================

interface LazyPlaceholderProps {
  type?: 'card' | 'list' | 'table' | 'content' | 'banner' | 'form';
  count?: number;
}

export const LazyPlaceholder: React.FC<LazyPlaceholderProps> = ({
  type = 'card',
  count = 1
}) => {
  const renderPlaceholder = () => {
    switch (type) {
      case 'card':
        return <SkeletonCard />;
      case 'list':
        return <SkeletonList count={count} />;
      case 'table':
        return <SkeletonTable rows={count} />;
      case 'content':
        return <SkeletonContent />;
      case 'banner':
        return <SkeletonBanner />;
      case 'form':
        return <SkeletonForm />;
      default:
        return <SkeletonCard />;
    }
  };

  return <>{renderPlaceholder()}</>;
};

export default Skeleton;
