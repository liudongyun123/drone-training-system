import { useState, useEffect, useCallback } from 'react';
import { learningApi } from '../api/learningApi';
import type { Certificate } from '../types';

interface UseCertificateOptions {
  /** 是否自动加载 */
  autoLoad?: boolean;
}

interface UseCertificateReturn {
  /** 证书列表 */
  certificates: Certificate[];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 刷新数据 */
  refresh: () => Promise<void>;
  /** 下载证书 */
  downloadCertificate: (certificateId: string) => Promise<void>;
  /** 分享证书 */
  shareCertificate: (certificateId: string) => Promise<string>;
}

/**
 * 证书 Hook
 * 管理用户的证书列表和相关操作
 */
export function useCertificate(options: UseCertificateOptions = {}): UseCertificateReturn {
  const { autoLoad = true } = options;

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 加载证书列表
  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await learningApi.getMyCertificates();
      setCertificates(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载证书列表失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    await loadCertificates();
  }, [loadCertificates]);

  // 下载证书
  const downloadCertificate = useCallback(async (certificateId: string) => {
    try {
      const url = await learningApi.downloadCertificate(certificateId);
      // 创建下载链接
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${certificateId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      throw err instanceof Error ? err : new Error('下载证书失败');
    }
  }, []);

  // 分享证书
  const shareCertificate = useCallback(async (certificateId: string) => {
    const certificate = certificates.find(c => c.id === certificateId);
    if (!certificate) {
      throw new Error('证书不存在');
    }

    // 生成分享链接
    const shareUrl = `${window.location.origin}/certificate/${certificateId}`;
    const shareText = `我在小何老师获得了 ${certificate.name} 证书，快来看看吧！`;

    // 检查是否支持 Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: certificate.name,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // 用户取消分享，不做处理
        if ((err as Error).name !== 'AbortError') {
          throw err;
        }
      }
    }

    // 复制链接到剪贴板作为后备
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      return shareUrl;
    } catch {
      return shareUrl;
    }
  }, [certificates]);

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      loadCertificates();
    }
  }, [autoLoad, loadCertificates]);

  return {
    certificates,
    loading,
    error,
    refresh,
    downloadCertificate,
    shareCertificate,
  };
}
