// ============================================================================
// App 主组件 - 生产环境优化版
// ============================================================================
import { Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { Loading } from './components';
import { ErrorBoundary } from './components/ErrorBoundary';
import PerformancePanel from './components/PerformanceMonitor';

// 全局样式
import './index.css';

function App() {
  useEffect(() => {
    // 移动端 viewport 适配
    const setViewport = () => {
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
      }
    };
    setViewport();

    // 禁用移动端双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // PWA 安装提示
    window.addEventListener('beforeinstallprompt', (e) => {
      // @ts-expect-error deferredPrompt 是自定义属性
      window.deferredPrompt = e;
    });

    // 生产环境启动日志
    if (import.meta.env.PROD) {
      console.log('🚀 Drone Training System Started', new Date().toISOString());
    }
  }, []);

  return (
    <ErrorBoundary scope="App">
      <Suspense 
        fallback={
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5'
          }}>
            <Loading fullScreen={false} />
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
      
      {/* 性能监控面板（开发环境） */}
      <PerformancePanel />
    </ErrorBoundary>
  );
}

export default App;
