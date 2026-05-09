// ============================================================================
// 字典配置服务 - 统一管理所有状态标签、类型配置、等级定义等
// ============================================================================
// 
// 所有业务状态的文案和颜色配置统一从此服务读取，
// 后台管理员可在 systemConfig 中修改。
//
// 数据来源: systemConfig 集合的 dictionaries 字段
// ============================================================================

import { app } from '@/utils/cloudbase';

const CONFIG_COLLECTION = 'systemConfig';

// ============================================================================
// 类型定义
// ============================================================================

/** 通用标签配置 */
export interface LabelConfig {
  text: string;
  color: string;
}

/** 等级配置项 */
export interface LevelConfigItem {
  value: string;
  label: string;
  badgeColor: string;
}

/** 通用选项 */
export interface OptionItem {
  value: string;
  label: string;
  [key: string]: any;
}

/** 消息类型配置 */
export interface MessageTypeConfig {
  key: string;
  label: string;
  icon?: string;
  color: string;
}

/** 字典分组 */
export interface DictionaryGroup {
  key: string;
  label: string;
  items: Record<string, LabelConfig> | LabelConfig[] | OptionItem[] | LevelConfigItem[];
}

// ============================================================================
// 默认字典数据（仅作初始化和兜底，不会作为最终数据源）
// ============================================================================

export const DEFAULT_DICTIONARIES: Record<string, any> = {
  // 订单状态
  orderStatus: {
    pending: { text: '待支付', color: 'bg-yellow-100 text-yellow-700' },
    paid: { text: '已支付', color: 'bg-green-100 text-green-700' },
    completed: { text: '已完成', color: 'bg-blue-100 text-blue-700' },
    cancelled: { text: '已取消', color: 'bg-gray-100 text-gray-700' },
    refunded: { text: '已退款', color: 'bg-purple-100 text-purple-700' },
  },

  // 支付状态
  paymentStatus: {
    unpaid: { text: '未支付', color: 'bg-yellow-100 text-yellow-700' },
    paid: { text: '已支付', color: 'bg-green-100 text-green-700' },
    refunded: { text: '已退款', color: 'bg-purple-100 text-purple-700' },
    failed: { text: '支付失败', color: 'bg-red-100 text-red-700' },
  },

  // 报名状态
  enrollmentStatus: {
    active: { text: '正常', color: 'bg-green-100 text-green-700' },
    cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' },
    pending: { text: '待审核', color: 'bg-yellow-100 text-yellow-700' },
    confirmed: { text: '已确认', color: 'bg-blue-100 text-blue-700' },
    suspended: { text: '已暂停', color: 'bg-orange-100 text-orange-700' },
    dropped: { text: '已退学', color: 'bg-red-100 text-red-700' },
    completed: { text: '已结业', color: 'bg-blue-100 text-blue-700' },
  },

  // 班级状态
  classStatus: {
    draft: { text: '草稿', color: 'bg-gray-100 text-gray-700' },
    enrolling: { text: '招生中', color: 'bg-green-100 text-green-700' },
    in_progress: { text: '进行中', color: 'bg-blue-100 text-blue-700' },
    completed: { text: '已结课', color: 'bg-gray-100 text-gray-700' },
    cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' },
  },

  // 课表状态
  scheduleStatus: {
    scheduled: { text: '已排课', color: 'bg-blue-100 text-blue-700' },
    completed: { text: '已完成', color: 'bg-green-100 text-green-700' },
    cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' },
  },

  // 来源类型
  enrollmentSource: {
    online_purchase: { text: '线上购买', color: 'bg-blue-100 text-blue-700' },
    online_enroll: { text: '线上报名', color: 'bg-cyan-100 text-cyan-700' },
    offline_enroll: { text: '线下报名', color: 'bg-orange-100 text-orange-700' },
    hybrid: { text: '混合用户', color: 'bg-purple-100 text-purple-700' },
  },

  // 调课类型
  transferTypes: {
    time: { text: '时间调整', color: 'text-blue-600', bg: 'bg-blue-50' },
    teacher: { text: '更换老师', color: 'text-purple-600', bg: 'bg-purple-50' },
    location: { text: '更换场地', color: 'text-green-600', bg: 'bg-green-50' },
    course: { text: '更换课程', color: 'text-orange-600', bg: 'bg-orange-50' },
    leave: { text: '请假补课', color: 'text-gray-600', bg: 'bg-gray-50' },
  },

  // 调课状态
  transferStatus: {
    pending: { text: '待审核', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    approved: { text: '已通过', color: 'text-green-600', bg: 'bg-green-50' },
    rejected: { text: '已拒绝', color: 'text-red-600', bg: 'bg-red-50' },
    cancelled: { text: '已取消', color: 'text-gray-600', bg: 'bg-gray-50' },
  },

  // 出勤状态
  attendanceStatus: {
    present: { text: '出勤', color: 'bg-green-100 text-green-700' },
    absent: { text: '缺勤', color: 'bg-red-100 text-red-700' },
    late: { text: '迟到', color: 'bg-yellow-100 text-yellow-700' },
    leave: { text: '请假', color: 'bg-blue-100 text-blue-700' },
  },

  // 会员类型
  memberType: {
    user: { text: '普通用户', color: 'bg-gray-100 text-gray-700' },
    student: { text: '学员', color: 'bg-blue-100 text-blue-700' },
    enterprise: { text: '企业用户', color: 'bg-purple-100 text-purple-700' },
  },

  // 会员状态
  memberStatus: {
    active: { text: '正常', color: 'bg-green-100 text-green-700' },
    disabled: { text: '已禁用', color: 'bg-red-100 text-red-700' },
  },

  // 会员来源
  memberSource: {
    purchase: { text: '线上购买', color: 'bg-blue-100 text-blue-700' },
    enrollment: { text: '线下报班', color: 'bg-orange-100 text-orange-700' },
    admin_grant: { text: '管理员授权', color: 'bg-purple-100 text-purple-700' },
    wechat: { text: '微信注册', color: 'bg-green-100 text-green-700' },
  },

  // 教师状态
  teacherStatus: {
    active: { text: '在职', color: 'bg-green-100 text-green-700' },
    inactive: { text: '离职', color: 'bg-gray-100 text-gray-600' },
    suspended: { text: '停用', color: 'bg-red-100 text-red-700' },
  },

  // 课程等级 - 按体系分组
  courseLevels: [
    // 人社培训等级
    { value: '初级工', label: '初级工', badgeColor: 'badge-success', source: 'RENSHE' },
    { value: '中级工', label: '中级工', badgeColor: 'badge-warning', source: 'RENSHE' },
    { value: '高级工', label: '高级工', badgeColor: 'badge-error', source: 'RENSHE' },
    { value: '技师', label: '技师', badgeColor: 'badge-primary', source: 'RENSHE' },
    { value: '高级技师', label: '高级技师', badgeColor: 'badge-secondary', source: 'RENSHE' },
    // CAAC证书等级
    { value: '视距内驾驶员', label: '视距内驾驶员', badgeColor: 'badge-success', source: 'CAAC' },
    { value: '超视距驾驶员', label: '超视距驾驶员(机长)', badgeColor: 'badge-warning', source: 'CAAC' },
    { value: '教员', label: '教员', badgeColor: 'badge-error', source: 'CAAC' },
  ],

  // 培训班等级 - 按体系分组
  classLevels: [
    // 人社培训等级
    { value: '入门班', label: '入门班', badgeColor: 'badge-success', source: 'RENSHE' },
    { value: '基础班', label: '基础班', badgeColor: 'badge-info', source: 'RENSHE' },
    { value: '进阶班', label: '进阶班', badgeColor: 'badge-warning', source: 'RENSHE' },
    { value: '高级班', label: '高级班', badgeColor: 'badge-error', source: 'RENSHE' },
    { value: '考证班', label: '考证班', badgeColor: 'badge-primary', source: 'RENSHE' },
    // CAAC培训班等级
    { value: 'CAAC入门班', label: 'CAAC入门班', badgeColor: 'badge-success', source: 'CAAC' },
    { value: 'CAAC基础班', label: 'CAAC基础班', badgeColor: 'badge-info', source: 'CAAC' },
    { value: 'CAAC进阶班', label: 'CAAC进阶班', badgeColor: 'badge-warning', source: 'CAAC' },
    { value: 'CAAC高级班', label: 'CAAC高级班', badgeColor: 'badge-error', source: 'CAAC' },
    { value: 'CAAC考证班', label: 'CAAC考证班', badgeColor: 'badge-primary', source: 'CAAC' },
  ],

  // 题库分类
  questionBankCategories: [
    { value: '', label: '全部' },
    { value: '理论', label: '理论' },
    { value: '法规', label: '法规' },
    { value: '实操', label: '实操' },
    { value: '安全', label: '安全' },
    { value: '考证', label: '考证' },
  ],

  // 题库难度
  questionBankLevels: [
    { value: 'easy', label: '简单' },
    { value: 'medium', label: '中等' },
    { value: 'hard', label: '困难' },
  ],

  // 消息类型
  messageTypes: [
    { key: 'system', label: '系统通知', color: 'bg-blue-100 text-blue-700' },
    { key: 'course', label: '课程通知', color: 'bg-green-100 text-green-700' },
    { key: 'order', label: '订单通知', color: 'bg-yellow-100 text-yellow-700' },
    { key: 'class', label: '班级通知', color: 'bg-purple-100 text-purple-700' },
    { key: 'exam', label: '考试通知', color: 'bg-red-100 text-red-700' },
  ],

  // 消息优先级
  messagePriorities: [
    { key: 'low', label: '低', color: 'bg-gray-100 text-gray-700' },
    { key: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-700' },
    { key: 'high', label: '高', color: 'bg-red-100 text-red-700' },
  ],

  // 学习路径分类等级映射 - 按体系配置每个分类的等级
  // 结构: { source: { category: [levels] } }
  learningPathCategories: {
    RENSHE: {
      '植保无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '航拍无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '物流无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '安防无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '测绘无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '巡检无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '装调检修工': ['初级工', '中级工', '高级工', '技师', '高级技师'],
    },
    CAAC: {
      '多旋翼': ['视距内驾驶员', '超视距驾驶员', '教员'],
      '固定翼': ['视距内驾驶员', '超视距驾驶员', '教员'],
      '直升机': ['视距内驾驶员', '超视距驾驶员', '教员'],
      '垂直起降固定翼': ['视距内驾驶员', '超视距驾驶员', '教员'],
    },
  },
};

// ============================================================================
// 服务缓存
// ============================================================================

let cachedDictionaries: Record<string, any> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// ============================================================================
// 核心方法
// ============================================================================

/**
 * 获取完整的字典配置（带缓存）
 */
export async function getDictionaries(): Promise<Record<string, any>> {
  const now = Date.now();
  if (cachedDictionaries && now - cacheTimestamp < CACHE_TTL) {
    return cachedDictionaries;
  }

  try {
    // 检查 SDK 是否已初始化
    if (!app || !app.database) {
      console.warn('[DictionaryService] SDK 未初始化，使用默认值');
      return DEFAULT_DICTIONARIES;
    }
    
    const db = app.database();
    if (!db) {
      console.warn('[DictionaryService] database() 返回 null，使用默认值');
      return DEFAULT_DICTIONARIES;
    }
    
    const { data } = await db.collection(CONFIG_COLLECTION)
      .where({ type: 'dictionaries' })
      .limit(1)
      .get();

    if (data && data.length > 0 && data[0].dictionaries) {
      cachedDictionaries = data[0].dictionaries;
      cacheTimestamp = now;
      return cachedDictionaries;
    }
  } catch (error) {
    console.error('[DictionaryService] 获取字典配置失败，使用默认值:', error);
  }

  // 兜底返回默认值
  return DEFAULT_DICTIONARIES;
}

/**
 * 获取指定字典分组
 */
export async function getDictionary(groupKey: string): Promise<any> {
  const dicts = await getDictionaries();
  return dicts[groupKey] || DEFAULT_DICTIONARIES[groupKey] || null;
}

/**
 * 获取状态标签（通用）
 */
export async function getStatusLabel(
  groupKey: string,
  statusKey: string,
  fallback?: { text: string; color: string }
): Promise<{ text: string; color: string }> {
  const group = await getDictionary(groupKey);
  if (group && typeof group === 'object' && !Array.isArray(group)) {
    const config = (group as Record<string, any>)[statusKey];
    if (config) return config as { text: string; color: string };
  }
  return fallback || { text: statusKey, color: 'bg-gray-100 text-gray-700' };
}

/**
 * 获取等级列表
 */
export async function getLevelOptions(): Promise<LevelConfigItem[]> {
  const levels = await getDictionary('courseLevels');
  return (Array.isArray(levels) ? levels : DEFAULT_DICTIONARIES.courseLevels) as LevelConfigItem[];
}

/**
 * 获取培训班等级列表
 */
export async function getClassLevels(): Promise<LevelConfigItem[]> {
  const levels = await getDictionary('classLevels');
  return (Array.isArray(levels) ? levels : DEFAULT_DICTIONARIES.classLevels) as LevelConfigItem[];
}

/**
 * 按体系获取课程等级列表
 * @param source 体系代码，如 'RENSHE' 或 'CAAC'
 */
export async function getCourseLevelsBySource(source: string): Promise<LevelConfigItem[]> {
  const levels = await getLevelOptions();
  return levels.filter((l: any) => l.source === source);
}

/**
 * 按体系获取培训班等级列表
 * @param source 体系代码，如 'RENSHE' 或 'CAAC'
 */
export async function getClassLevelsBySource(source: string): Promise<LevelConfigItem[]> {
  const levels = await getClassLevels();
  return levels.filter((l: any) => l.source === source);
}

/**
 * 获取选项列表（通用）
 */
export async function getOptions(groupKey: string): Promise<OptionItem[]> {
  const group = await getDictionary(groupKey);
  if (Array.isArray(group)) return group as OptionItem[];
  if (typeof group === 'object' && group !== null) {
    return Object.entries(group).map(([key, val]) => {
      const item = val as Record<string, any>;
      return { value: key, label: item.text || item.label || key, ...item };
    });
  }
  return DEFAULT_DICTIONARIES[groupKey] || [];
}

/**
 * 清除缓存（管理员修改字典后调用）
 */
export function clearDictionaryCache(): void {
  cachedDictionaries = null;
  cacheTimestamp = 0;
}

// ============================================================================
// 便捷导出：供现有代码直接导入（读取数据库后返回）
// ============================================================================

/**
 * 获取订单状态标签配置
 */
export async function getOrderStatusLabels(): Promise<Record<string, LabelConfig>> {
  return getDictionary('orderStatus') as Promise<Record<string, LabelConfig>>;
}

/**
 * 获取报名来源标签配置
 */
export async function getSourceLabels(): Promise<Record<string, LabelConfig>> {
  return getDictionary('enrollmentSource') as Promise<Record<string, LabelConfig>>;
}

/**
 * 获取调课类型配置
 */
export async function getTransferTypes(): Promise<Record<string, { label: string; color: string; bg: string }>> {
  return getDictionary('transferTypes');
}

/**
 * 获取题库分类列表
 */
export async function getQuestionBankCategories(): Promise<OptionItem[]> {
  return getOptions('questionBankCategories');
}

/**
 * 获取消息类型列表
 */
export async function getMessageTypes(): Promise<OptionItem[]> {
  return getOptions('messageTypes');
}

/**
 * 获取消息优先级列表
 */
export async function getMessagePriorities(): Promise<OptionItem[]> {
  return getOptions('messagePriorities');
}

export default {
  getDictionaries,
  getDictionary,
  getStatusLabel,
  getLevelOptions,
  getClassLevels,
  getOptions,
  clearDictionaryCache,
  getOrderStatusLabels,
  getSourceLabels,
  getTransferTypes,
  getQuestionBankCategories,
  getMessageTypes,
  getMessagePriorities,
  DEFAULT_DICTIONARIES,
};
