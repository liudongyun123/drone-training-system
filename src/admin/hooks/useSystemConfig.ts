// ============================================================================
// useSystemConfig Hook - 系统配置统一管理
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import {
  getSystemConfig,
  updateLoginProvider,
  updateRolePermissions,
  type SystemConfig,
} from '@/services/systemConfigService';
import { updateConfig } from '@/services/siteConfigService';
import { clearDictionaryCache } from '@/services/dictionaryService';

interface UseSystemConfigReturn {
  /** 系统配置对象 */
  config: SystemConfig | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 更新字典配置 */
  updateDictionary: (key: string, data: OptionItem[]) => Promise<boolean>;
  /** 更新站点配置 */
  updateSiteConfig: (key: string, value: unknown) => Promise<boolean>;
  /** 更新登录方式 */
  updateLoginProvider: (providerId: string, enabled: boolean) => Promise<boolean>;
  /** 更新角色权限 */
  updateRolePermissions: (role: string, permissions: string[]) => Promise<boolean>;
  /** 手动刷新配置 */
  refresh: () => Promise<void>;
}

// 导入 OptionItem 类型
import type { OptionItem } from '@/services/dictionaryService';

/**
 * 系统配置管理 Hook
 *
 * @example
 * const { config, loading, updateDictionary } = useSystemConfig();
 *
 * await updateDictionary('courseLevels', [...]);
 */
export function useSystemConfig(): UseSystemConfigReturn {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSystemConfig();
      setConfig(data);
    } catch (error) {
      console.error('[useSystemConfig] 加载系统配置失败:', error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdateDictionary = useCallback(async (key: string, data: OptionItem[]): Promise<boolean> => {
    if (!config?._id) return false;
    try {
      const db = (await import('@/utils/cloudbase')).app.database();
      const updatedDictionaries = {
        ...config.dictionaries,
        [key]: data,
      };
      await db.collection('systemConfig').doc(config._id).update({
        dictionaries: updatedDictionaries,
        updatedAt: new Date(),
      });
      // 清除缓存
      clearDictionaryCache();
      // 刷新本地状态
      setConfig(prev => prev ? { ...prev, dictionaries: updatedDictionaries } : prev);
      return true;
    } catch (error) {
      console.error('[useSystemConfig] 更新字典失败:', error);
      return false;
    }
  }, [config]);

  const handleUpdateSiteConfig = useCallback(async (key: string, value: unknown): Promise<boolean> => {
    try {
      const success = await updateConfig(key, value);
      return success;
    } catch (error) {
      console.error('[useSystemConfig] 更新站点配置失败:', error);
      return false;
    }
  }, []);

  const handleUpdateLoginProvider = useCallback(async (providerId: string, enabled: boolean): Promise<boolean> => {
    try {
      const success = await updateLoginProvider(providerId, enabled);
      if (success) {
        setConfig(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            loginProviders: prev.loginProviders.map(p =>
              p.id === providerId ? { ...p, enabled } : p
            ),
          };
        });
      }
      return success;
    } catch (error) {
      console.error('[useSystemConfig] 更新登录方式失败:', error);
      return false;
    }
  }, []);

  const handleUpdateRolePermissions = useCallback(async (role: string, permissions: string[]): Promise<boolean> => {
    try {
      const success = await updateRolePermissions(role, permissions);
      if (success) {
        setConfig(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            roles: prev.roles.map(r =>
              r.role === role ? { ...r, permissions } : r
            ),
          };
        });
      }
      return success;
    } catch (error) {
      console.error('[useSystemConfig] 更新角色权限失败:', error);
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    clearDictionaryCache();
    await load();
  }, [load]);

  return {
    config,
    loading,
    updateDictionary: handleUpdateDictionary,
    updateSiteConfig: handleUpdateSiteConfig,
    updateLoginProvider: handleUpdateLoginProvider,
    updateRolePermissions: handleUpdateRolePermissions,
    refresh,
  };
}

export default useSystemConfig;
