// ============================================================================
// 站点配置服务 - 管理占位图片、默认值、业务参数等
// ============================================================================
//
// 所有站点级的配置统一从此服务读取，
// 后台管理员可在 site_config 集合中修改。
//
// 数据来源: site_config 集合
// ============================================================================

import { app } from '@/utils/cloudbase';

const CONFIG_COLLECTION = 'site_config';

// ============================================================================
// 类型定义
// ============================================================================

/** 站点配置项 */
export interface SiteConfigItem {
  _id?: string;
  category: 'default' | 'business' | 'media' | 'wechat' | 'payment';
  key: string;
  value: any;
  description: string;
  updatedAt?: string;
}

// ============================================================================
// 默认配置（仅作初始化和兜底）
// ============================================================================

const DEFAULT_SITE_CONFIG: SiteConfigItem[] = [
  // ========== 媒体 ==========
  {
    category: 'media',
    key: 'defaultCourseCover',
    value: '',
    description: '课程默认封面图片（空则使用CSS占位）',
  },
  {
    category: 'media',
    key: 'defaultUserAvatar',
    value: '',
    description: '用户默认头像（空则使用CSS占位）',
  },
  {
    category: 'media',
    key: 'defaultHeroImage',
    value: '',
    description: '首页Hero区域默认图片',
  },
  {
    category: 'media',
    key: 'defaultLogo',
    value: '',
    description: '站点默认Logo',
  },

  // ========== 业务参数 ==========
  {
    category: 'business',
    key: 'groupBuyDurationHours',
    value: 48,
    description: '拼团有效时长（小时）',
  },
  {
    category: 'business',
    key: 'groupBuyMaxMultiplier',
    value: 2,
    description: '拼团最大人数倍数（相对所需人数）',
  },
  {
    category: 'business',
    key: 'examDefaultPassScore',
    value: 60,
    description: '考试默认及格分数',
  },
  {
    category: 'business',
    key: 'examDefaultDuration',
    value: 120,
    description: '考试默认时长（分钟）',
  },
  {
    category: 'business',
    key: 'examDefaultTotalScore',
    value: 100,
    description: '考试默认总分',
  },
  {
    category: 'business',
    key: 'examDefaultAttempts',
    value: 3,
    description: '考试默认尝试次数',
  },
  {
    category: 'business',
    key: 'courseDefaultMaxStudents',
    value: 50,
    description: '课程默认最大学员数',
  },
  {
    category: 'business',
    key: 'orderExpireMinutes',
    value: 30,
    description: '订单过期时间（分钟）',
  },

  // ========== 默认值 ==========
  {
    category: 'default',
    key: 'siteName',
    value: '无人机培训中心',
    description: '站点名称',
  },
  {
    category: 'default',
    key: 'siteDescription',
    value: '专业无人机驾驶培训，权威认证资质',
    description: '站点描述',
  },
  {
    category: 'default',
    key: 'currency',
    value: '¥',
    description: '货币符号',
  },
  {
    category: 'default',
    key: 'pageSize',
    value: 12,
    description: '默认分页大小',
  },
  {
    category: 'default',
    key: 'courseScheduleColors',
    value: [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-green-100 text-green-700 border-green-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-pink-100 text-pink-700 border-pink-200',
      'bg-cyan-100 text-cyan-700 border-cyan-200',
    ],
    description: '课程排课日历颜色',
  },
];

// ============================================================================
// 服务缓存
// ============================================================================

let cachedConfigs: Map<string, any> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// ============================================================================
// 核心方法
// ============================================================================

/**
 * 获取所有站点配置（带缓存）
 */
export async function getAllConfigs(): Promise<Map<string, any>> {
  const now = Date.now();
  if (cachedConfigs && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfigs;
  }

  try {
    const db = app.database();
    const { data } = await db.collection(CONFIG_COLLECTION).get();

    if (data && data.length > 0) {
      const configMap = new Map<string, any>();
      data.forEach((item: any) => {
        configMap.set(item.key, item.value);
      });
      cachedConfigs = configMap;
      cacheTimestamp = now;
      return configMap;
    }
  } catch (error) {
    console.error('[SiteConfigService] 获取站点配置失败，使用默认值:', error);
  }

  // 兜底返回默认值
  const defaultMap = new Map<string, any>();
  DEFAULT_SITE_CONFIG.forEach(item => {
    defaultMap.set(item.key, item.value);
  });
  return defaultMap;
}

/**
 * 获取单个配置值
 */
export async function getConfig<T = any>(key: string, defaultValue?: T): Promise<T> {
  const configs = await getAllConfigs();
  if (configs.has(key)) {
    return configs.get(key) as T;
  }
  // 从默认配置中查找
  const defaultItem = DEFAULT_SITE_CONFIG.find(item => item.key === key);
  if (defaultItem !== undefined) {
    return defaultItem.value as T;
  }
  return defaultValue as T;
}

/**
 * 获取占位图片 URL
 */
export async function getPlaceholderImage(type: 'course' | 'avatar' | 'hero' | 'logo'): Promise<string> {
  const keyMap: Record<string, string> = {
    course: 'defaultCourseCover',
    avatar: 'defaultUserAvatar',
    hero: 'defaultHeroImage',
    logo: 'defaultLogo',
  };
  return getConfig<string>(keyMap[type], '') || '';
}

/**
 * 获取业务参数
 */
export async function getBusinessParam<T = number>(key: string, defaultValue?: T): Promise<T> {
  return getConfig<T>(key, defaultValue);
}

/**
 * 清除缓存
 */
export function clearSiteConfigCache(): void {
  cachedConfigs = null;
  cacheTimestamp = 0;
}

// ============================================================================
// 初始化（首次部署时调用）
// ============================================================================

/**
 * 初始化站点默认配置
 */
export async function initSiteConfig(): Promise<void> {
  try {
    const db = app.database();
    const { data } = await db.collection(CONFIG_COLLECTION).limit(1).get();

    if (!data || data.length === 0) {
      console.log('[SiteConfigService] 初始化站点配置...');
      const now = new Date().toISOString();
      const batch = DEFAULT_SITE_CONFIG.map(item => ({
        ...item,
        updatedAt: now,
      }));

      // CloudBase 批量添加
      for (const item of batch) {
        await db.collection(CONFIG_COLLECTION).add(item);
      }
      console.log('[SiteConfigService] 站点配置初始化完成');
    }
  } catch (error) {
    console.error('[SiteConfigService] 初始化站点配置失败:', error);
  }
}

/**
 * 更新配置（管理员操作）
 */
export async function updateConfig(key: string, value: any): Promise<boolean> {
  try {
    const db = app.database();
    const { data } = await db.collection(CONFIG_COLLECTION)
      .where({ key })
      .get();

    if (data && data.length > 0) {
      await db.collection(CONFIG_COLLECTION).doc(data[0]._id).update({
        value,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // 不存在则创建
      const defaultItem = DEFAULT_SITE_CONFIG.find(item => item.key === key);
      await db.collection(CONFIG_COLLECTION).add({
        category: defaultItem?.category || 'default',
        key,
        value,
        description: defaultItem?.description || '',
        updatedAt: new Date().toISOString(),
      });
    }

    clearSiteConfigCache();
    return true;
  } catch (error) {
    console.error('[SiteConfigService] 更新配置失败:', error);
    return false;
  }
}

// ============================================================================
// 便捷导出
// ============================================================================

export default {
  getAllConfigs,
  getConfig,
  getPlaceholderImage,
  getBusinessParam,
  clearSiteConfigCache,
  initSiteConfig,
  updateConfig,
  DEFAULT_SITE_CONFIG,
};
