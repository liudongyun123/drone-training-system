import React from 'react';
import { useMyLearning, useCertificate } from '../hooks';
import { LearningStats } from '../components/LearningStats';
import { ProgressCard } from '../components/ProgressCard';
import { CertificateCard } from '../components/ProgressCard';

/**
 * 我的学习页面
 */
export const MyLearningPage: React.FC = () => {
  // 学习进度 Hook
  const {
    progressList,
    loading: progressLoading,
    error: progressError,
    refresh: refreshProgress,
    continueLearning,
    stats,
  } = useMyLearning({ autoLoad: true });

  // 证书 Hook
  const {
    certificates,
    loading: certLoading,
    error: certError,
    refresh: refreshCerts,
    downloadCertificate,
    shareCertificate,
  } = useCertificate({ autoLoad: true });

  // Tab 切换状态
  const [activeTab, setActiveTab] = React.useState<'learning' | 'certificates'>('learning');

  const handleTabChange = (tab: 'learning' | 'certificates') => {
    setActiveTab(tab);
  };

  return (
    <div className="my-learning-page">
      {/* 页面标题 */}
      <header className="page-header">
        <h1>我的学习</h1>
      </header>

      {/* 学习统计 */}
      <LearningStats
        totalHours={stats.totalHours}
        completedCourses={stats.completedCourses}
        inProgressCourses={stats.inProgressCourses}
        certificates={certificates.length}
      />

      {/* Tab 切换 */}
      <div className="tab-nav">
        <button
          className={`tab-nav__item ${activeTab === 'learning' ? 'active' : ''}`}
          onClick={() => handleTabChange('learning')}
        >
          正在学习 ({progressList.length})
        </button>
        <button
          className={`tab-nav__item ${activeTab === 'certificates' ? 'active' : ''}`}
          onClick={() => handleTabChange('certificates')}
        >
          我的证书 ({certificates.length})
        </button>
      </div>

      {/* 学习进度列表 */}
      {activeTab === 'learning' && (
        <div className="learning-list">
          {progressLoading ? (
            <div className="loading-skeleton">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          ) : progressError ? (
            <div className="error-state">
              <p>{progressError.message}</p>
              <button onClick={refreshProgress}>重试</button>
            </div>
          ) : progressList.length === 0 ? (
            <div className="empty-state">
              <p>暂无学习记录</p>
              <a href="/course">去选课</a>
            </div>
          ) : (
            <div className="learning-grid">
              {progressList.map((progress) => (
                <ProgressCard
                  key={progress.courseId}
                  progress={progress}
                  onClick={(courseId) => {
                    window.location.href = `/course/${courseId}`;
                  }}
                  onContinue={continueLearning}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 证书列表 */}
      {activeTab === 'certificates' && (
        <div className="certificate-list">
          {certLoading ? (
            <div className="loading-skeleton">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          ) : certError ? (
            <div className="error-state">
              <p>{certError.message}</p>
              <button onClick={refreshCerts}>重试</button>
            </div>
          ) : certificates.length === 0 ? (
            <div className="empty-state">
              <p>暂无证书</p>
              <p className="empty-state__hint">完成课程学习后可获得证书</p>
            </div>
          ) : (
            <div className="certificate-grid">
              {certificates.map((cert) => (
                <CertificateCard
                  key={cert.id}
                  certificate={cert}
                  onDownload={downloadCertificate}
                  onShare={shareCertificate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
