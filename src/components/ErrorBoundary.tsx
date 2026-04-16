/**
 * React 错误边界组件 - 生产环境版本
 * 捕获组件树中的 JavaScript 错误，显示备用 UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@mui/material';
import { logError } from '@/utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 错误消息前缀，用于区分错误来源 */
  scope?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 错误边界类组件
 * 捕获子组件树的错误并显示友好的错误提示
 */
export class ErrorBoundary extends Component<Props, State> {
  private errorCount = 0;
  private readonly maxErrors = 3; // 最多显示3次错误，避免无限循环

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.errorCount++;
    
    // 记录错误日志
    console.error(`[ErrorBoundary] Caught error (${this.errorCount}/${this.maxErrors}):`, {
      error: error.message,
      componentStack: errorInfo.componentStack,
      scope: this.props.scope
    });
    
    this.setState({ errorInfo });
    
    // 调用错误回调
    this.props.onError?.(error, errorInfo);
    
    // 上报到监控系统
    logError(error, { 
      componentStack: errorInfo.componentStack,
      scope: this.props.scope,
      count: this.errorCount
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.hash = '#/';
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.errorCount = 0;
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.errorCount = 0;
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    // 如果错误次数过多，阻止渲染子组件
    if (this.errorCount > this.maxErrors) {
      return (
        <div style={{
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          margin: '1rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <AlertTriangle size={32} color="#dc2626" style={{ marginBottom: '1rem' }} />
            <p style={{ color: '#dc2626', fontWeight: 500 }}>
              页面加载失败，请稍后重试
            </p>
            <Button
              variant="contained"
              size="small"
              onClick={this.handleReload}
              sx={{ mt: 2 }}
            >
              刷新页面
            </Button>
          </div>
        </div>
      );
    }

    if (hasError) {
      // 自定义 fallback UI
      if (fallback) {
        return fallback;
      }

      // 默认错误页面
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#f5f5f5',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '3rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            {/* 错误图标 */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <AlertTriangle size={40} color="#dc2626" />
            </div>

            {/* 错误标题 */}
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              页面出现了一些问题
            </h1>

            {/* 错误描述 */}
            <p style={{
              color: '#6b7280',
              marginBottom: '1.5rem',
              lineHeight: 1.6
            }}>
              请尝试刷新页面或返回首页
            </p>

            {/* 错误详情（开发环境显示） */}
            {import.meta.env.DEV && error && (
              <details style={{
                textAlign: 'left',
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  错误详情
                </summary>
                <pre style={{
                  overflow: 'auto',
                  maxHeight: '200px',
                  color: '#dc2626',
                  fontSize: '0.75rem'
                }}>
                  {error.toString()}
                  {'\n\n'}
                  {errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <Button
                variant="outlined"
                startIcon={<Home size={18} />}
                onClick={this.handleGoHome}
                sx={{
                  borderColor: '#e5e7eb',
                  color: '#4b5563',
                  '&:hover': {
                    borderColor: '#d1d5db',
                    backgroundColor: '#f9fafb'
                  }
                }}
              >
                返回首页
              </Button>
              
              <Button
                variant="contained"
                startIcon={<RefreshCw size={18} />}
                onClick={this.handleReload}
                sx={{
                  backgroundColor: '#3b82f6',
                  '&:hover': {
                    backgroundColor: '#2563eb'
                  }
                }}
              >
                刷新页面
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * 异步错误处理 Hook
 * 用于捕获 async 函数中的错误
 */
export function useAsyncError() {
  const [error, setError] = React.useState<Error | null>(null);
  
  const throwError = React.useCallback((err: Error) => {
    setError(err);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return throwError;
}

/**
 * 错误状态管理 Hook
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((err: unknown) => {
    if (err instanceof Error) {
      setError(err);
    } else {
      setError(new Error(String(err)));
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

/**
 * 错误提示组件
 */
interface ErrorAlertProps {
  error: Error | string;
  onDismiss?: () => void;
  severity?: 'error' | 'warning' | 'info';
}

export function ErrorAlert({ error, onDismiss, severity = 'error' }: ErrorAlertProps) {
  const message = typeof error === 'string' ? error : error.message;
  
  const colors = {
    error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' }
  };

  const color = colors[severity];

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: color.bg,
      border: `1px solid ${color.border}`,
      borderRadius: '8px',
      color: color.text,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <AlertTriangle size={20} />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            color: color.text,
            opacity: 0.7
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default ErrorBoundary;
