import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误日志
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 可以在此处发送错误报告到 Sentry 等服务
    this.reportError(error, errorInfo);
  }

  reportError(error: Error, errorInfo: ErrorInfo): void {
    // Sentry 错误报告
    if (import.meta.env.VITE_SENTRY_DSN) {
      // Sentry.captureException(error, { extra: errorInfo });
      console.log('Error reported to Sentry:', error.message);
    }

    // 自定义错误日志
    const errorLog = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // 可以发送到你的日志服务
    console.error('Error details:', JSON.stringify(errorLog, null, 2));
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            backgroundColor: '#f5f5f5',
            textAlign: 'center',
          }}
        >
          <ErrorOutlineIcon
            sx={{
              fontSize: 80,
              color: 'error.main',
              marginBottom: 2,
            }}
          />
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              color: '#333',
            }}
          >
            出错了
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: '#666',
              marginBottom: '2rem',
              maxWidth: '600px',
            }}
          >
            抱歉，应用程序遇到了一个错误。请尝试刷新页面或返回首页。
          </p>
          
          {import.meta.env.DEV && error && (
            <details
              style={{
                width: '100%',
                maxWidth: '800px',
                marginBottom: '2rem',
                padding: '1rem',
                backgroundColor: '#fff',
                borderRadius: '8px',
                textAlign: 'left',
                overflow: 'auto',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                }}
              >
                错误详情（开发模式）
              </summary>
              <div>
                <p>
                  <strong>错误信息：</strong>
                  <pre
                    style={{
                      backgroundColor: '#f0f0f0',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '0.875rem',
                    }}
                  >
                    {error.message}
                  </pre>
                </p>
                <p>
                  <strong>错误堆栈：</strong>
                  <pre
                    style={{
                      backgroundColor: '#f0f0f0',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '0.875rem',
                      maxHeight: '300px',
                    }}
                  >
                    {error.stack}
                  </pre>
                </p>
                {errorInfo?.componentStack && (
                  <p>
                    <strong>组件堆栈：</strong>
                    <pre
                      style={{
                        backgroundColor: '#f0f0f0',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        overflow: 'auto',
                        fontSize: '0.875rem',
                        maxHeight: '300px',
                      }}
                    >
                      {errorInfo.componentStack}
                    </pre>
                  </p>
                )}
              </div>
            </details>
          )}

          <div
            style={{
              display: 'flex',
              gap: '1rem',
            }}
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={this.handleReload}
            >
              刷新页面
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={this.handleGoHome}
            >
              返回首页
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
