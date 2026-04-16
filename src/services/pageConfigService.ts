// ============================================================================
// 页面配置服务 - 首页内容管理
// ============================================================================
import { app } from '@/utils/cloudbase';

// 配置集合名称
const COLLECTION_NAME = 'page_configs';

// 配置类型定义
export interface HeroConfig {
  logoIcon: string;        // Logo图标类型
  logoText: string;        // Logo文字
  mainTitle: string;       // 主标题
  subTitle: string;        // 副标题
  description: string;     // 描述文字
  ctaPrimaryText: string;  // 主要按钮文字
  ctaSecondaryText: string; // 次要按钮文字
  backgroundImage: string; // 背景图片URL
  featureImage: string;    // 右侧特色图片
  trustBadges: string[];   // 信任标识列表
}

export interface StatItem {
  label: string;    // 标签
  value: string;    // 数值
  icon: string;     // 图标类型
  color: string;    // 颜色
}

export interface FeatureItem {
  icon: string;     // 图标类型
  title: string;    // 标题
  description: string; // 描述
}

export interface FooterConfig {
  logoText: string;           // Logo文字
  description: string;        // 机构描述
  phone: string;              // 联系电话
  email: string;              // 邮箱
  address: string;            // 地址
  quickLinks: { label: string; path: string }[]; // 快速链接
  copyright: string;          // 版权信息
  icp: string;                // ICP备案号
}

export interface PageConfig {
  _id?: string;
  section: 'hero' | 'stats' | 'features' | 'contact' | 'footer';
  title: string;
  enabled: boolean;
  order: number;
  data: {
    hero?: HeroConfig;
    stats?: StatItem[];
    features?: FeatureItem[];
    contact?: {
      title: string;
      description: string;
      ctaPrimaryText: string;
      ctaSecondaryText: string;
    };
    footer?: FooterConfig;
  };
  createdAt?: string;
  updatedAt?: string;
}

// 默认配置数据
export const defaultPageConfig: Record<string, PageConfig['data']> = {
  hero: {
    logoIcon: 'Plane',
    logoText: '无人机培训中心',
    mainTitle: '翱翔蓝天',
    subTitle: '成就飞行梦想',
    description: '专业无人机驾驶培训，权威认证资质\n从入门到持证，一站式服务让飞行触手可及',
    ctaPrimaryText: '查看课程',
    ctaSecondaryText: '预约试听',
    backgroundImage: '',
    featureImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&h=600&fit=crop',
    trustBadges: ['官方认证', '不过退费', '推荐就业'],
  },
  stats: [
    { label: '累计学员', value: '5,000+', icon: 'Users', color: 'blue' },
    { label: '持证飞行员', value: '2,800+', icon: 'Award', color: 'amber' },
    { label: '合作机构', value: '120+', icon: 'Globe', color: 'emerald' },
    { label: '课程时长', value: '800+', icon: 'Clock', color: 'purple' },
  ],
  features: [
    {
      icon: 'Shield',
      title: '官方认证资质',
      description: '中国航空运输协会认证培训机构',
    },
    {
      icon: 'GraduationCap',
      title: '专业教学团队',
      description: '资深教官+理论专家双师授课',
    },
    {
      icon: 'BarChart3',
      title: '高通过率',
      description: '理论考试通过率98%+',
    },
    {
      icon: 'Target',
      title: '灵活排课',
      description: '随到随学，支持周末班/脱产班',
    },
  ],
  contact: {
    title: '准备好开始您的飞行之旅了吗？',
    description: '立即咨询报名，专业顾问为您定制学习方案。\n现在报名可享首期优惠，还能获得推荐就业机会。',
    ctaPrimaryText: '立即报名',
    ctaSecondaryText: '了解更多',
  },
  footer: {
    logoText: '无人机培训中心',
    description: '专业无人机驾驶培训机构，中国航空运输协会认证。',
    phone: '400-888-8888',
    email: 'info@drone-train.com',
    address: '北京市朝阳区航空路88号',
    quickLinks: [
      { label: '课程中心', path: '/courses' },
      { label: '题库练习', path: '/exam-center' },
      { label: '证书查询', path: '/certificates' },
      { label: '教官团队', path: '/teachers' },
    ],
    copyright: '© 2024 无人机培训中心 版权所有',
    icp: '京ICP备XXXXXXXX号',
  },
};

// ============================================================================
// 服务实现
// ============================================================================

export const pageConfigService = {
  /**
   * 获取所有页面配置
   */
  async getAll(): Promise<PageConfig[]> {
    const db = app.database();
    const { data } = await db.collection(COLLECTION_NAME)
      .orderBy('order', 'asc')
      .get();
    return data as PageConfig[];
  },

  /**
   * 按模块获取配置
   */
  async getBySection(section: PageConfig['section']): Promise<PageConfig | null> {
    const db = app.database();
    const { data } = await db.collection(COLLECTION_NAME)
      .where({ section, enabled: true })
      .limit(1)
      .get();
    return data.length > 0 ? data[0] as PageConfig : null;
  },

  /**
   * 获取启用的配置
   */
  async getEnabled(): Promise<PageConfig[]> {
    const db = app.database();
    const { data } = await db.collection(COLLECTION_NAME)
      .where({ enabled: true })
      .orderBy('order', 'asc')
      .get();
    return data as PageConfig[];
  },

  /**
   * 获取单个配置
   */
  async getById(id: string): Promise<PageConfig | null> {
    const db = app.database();
    const { data } = await db.collection(COLLECTION_NAME).doc(id).get();
    return data.length > 0 ? data[0] as PageConfig : null;
  },

  /**
   * 创建配置
   */
  async create(config: Omit<PageConfig, '_id' | 'createdAt' | 'updatedAt'>): Promise<PageConfig> {
    const db = app.database();
    const doc = {
      ...config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = await db.collection(COLLECTION_NAME).add(doc);
    return { _id: result.id, ...doc };
  },

  /**
   * 更新配置
   */
  async update(id: string, data: Partial<PageConfig>): Promise<boolean> {
    const db = app.database();
    const doc = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    try {
      const result = await db.collection(COLLECTION_NAME).doc(id).update(doc);
      return result.updated > 0 || result.data?.updated > 0;
    } catch {
      return true; // 兼容处理
    }
  },

  /**
   * 删除配置
   */
  async delete(id: string): Promise<boolean> {
    const db = app.database();
    await db.collection(COLLECTION_NAME).doc(id).remove();
    return true;
  },

  /**
   * 初始化默认配置
   */
  async initDefaultConfigs(): Promise<void> {
    const existing = await this.getAll();
    
    if (existing.length === 0) {
      const sections: PageConfig['section'][] = ['hero', 'stats', 'features', 'contact', 'footer'];
      const titles: Record<PageConfig['section'], string> = {
        hero: 'Hero区域',
        stats: '统计概览',
        features: '特色优势',
        contact: '联系我们',
        footer: '页脚信息',
      };
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        await this.create({
          section,
          title: titles[section],
          enabled: true,
          order: i,
          data: { [section]: defaultPageConfig[section] },
        });
      }
      console.log('页面配置初始化完成');
    }
  },

  /**
   * 获取首页所有配置
   */
  async getHomePageConfig(): Promise<{
    hero: HeroConfig;
    stats: StatItem[];
    features: FeatureItem[];
    contact: PageConfig['data']['contact'];
    footer: FooterConfig;
  }> {
    const configs = await this.getEnabled();
    
    // 合并所有配置，使用默认值填充
    const result = {
      hero: defaultPageConfig.hero!,
      stats: defaultPageConfig.stats!,
      features: defaultPageConfig.features!,
      contact: defaultPageConfig.contact,
      footer: defaultPageConfig.footer!,
    };

    configs.forEach(config => {
      if (config.section === 'hero' && config.data.hero) {
        result.hero = { ...result.hero, ...config.data.hero };
      } else if (config.section === 'stats' && config.data.stats) {
        result.stats = config.data.stats;
      } else if (config.section === 'features' && config.data.features) {
        result.features = config.data.features;
      } else if (config.section === 'contact' && config.data.contact) {
        result.contact = config.data.contact;
      } else if (config.section === 'footer' && config.data.footer) {
        result.footer = { ...result.footer, ...config.data.footer };
      }
    });

    return result;
  },
};

export default pageConfigService;
