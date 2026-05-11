/**
 * 统一 ID 格式常量定义
 * 
 * 所有云函数和前端代码应使用此文件中的常量
 * 确保 ID 格式一致性
 */

module.exports = {
  // ============================================
  // Source IDs (体系统一格式)
  // ============================================
  SOURCES: {
    CAAC: 'CAAC',
    RENSHE: 'RENSHE',
    NATIONAL_DEFENSE: 'NATIONAL_DEFENSE'
  },

  // ============================================
  // Category IDs (分类统一格式: SOURCE:CODE)
  // ============================================
  CATEGORIES: {
    // CAAC 分类
    CAAC_MULTI_ROTOR: 'CAAC:MULTI_ROTOR',
    CAAC_FIXED_WING: 'CAAC:FIXED_WING',
    CAAC_ROTARY_WING: 'CAAC:ROTARY_WING',
    CAAC_VTOL: 'CAAC:VTOL',
    
    // RENSHE 分类
    RENSHE_PLANT_PROTECTION: 'RENSHE:PLANT_PROTECTION',
    RENSHE_AERIAL_PHOTOGRAPHY: 'RENSHE:AERIAL_PHOTOGRAPHY',
    RENSHE_LOGISTICS: 'RENSHE:LOGISTICS',
    RENSHE_SECURITY: 'RENSHE:SECURITY',
    RENSHE_MAPPING: 'RENSHE:MAPPING',
    RENSHE_INSPECTION: 'RENSHE:INSPECTION',
    RENSHE_MAINTENANCE: 'RENSHE:MAINTENANCE'
  },

  // ============================================
  // Category 到 Source 的映射
  // ============================================
  CATEGORY_TO_SOURCE: {
    'CAAC:MULTI_ROTOR': 'CAAC',
    'CAAC:FIXED_WING': 'CAAC',
    'CAAC:ROTARY_WING': 'CAAC',
    'CAAC:VTOL': 'CAAC',
    'RENSHE:PLANT_PROTECTION': 'RENSHE',
    'RENSHE:AERIAL_PHOTOGRAPHY': 'RENSHE',
    'RENSHE:LOGISTICS': 'RENSHE',
    'RENSHE:SECURITY': 'RENSHE',
    'RENSHE:MAPPING': 'RENSHE',
    'RENSHE:INSPECTION': 'RENSHE',
    'RENSHE:MAINTENANCE': 'RENSHE'
  },

  // ============================================
  // 工具函数
  // ============================================
  
  /**
   * 从 categoryId 获取 sourceId
   */
  getSourceId(categoryId) {
    if (!categoryId) return null
    if (categoryId.includes(':')) {
      return categoryId.split(':')[0]
    }
    // 兼容旧的 hash 格式
    const oldMapping = {
      'ae0498ca69fc35c2014d4d3e332b809b': 'RENSHE',
      'edc7bd2969fc35c30151ff035b0c276d': 'RENSHE',
      '97b16bdb69fc35c401505fe61ad82e56': 'RENSHE',
      '98d3bbc169fc35c5015270c47a488d1b': 'RENSHE',
      '611e990a69fc35c7014cb85146ae2c00': 'RENSHE',
      'edc7bd2969fc35c80151ff497725f148': 'RENSHE',
      '9cd783ff69fc35ca0150cb4436019c71': 'RENSHE',
      'ae0498ca69fc52380151cf9344ba694d': 'CAAC',
      'ae0498ca69fc52380151cf9416b82e7b': 'CAAC',
      'ae0498ca69fc52380151cf9549195c14': 'CAAC',
      'ae0498ca69fc52380151cf96d1a7d0ff1': 'CAAC'
    }
    return oldMapping[categoryId] || null
  },

  /**
   * 检查是否为有效 sourceId
   */
  isValidSourceId(sourceId) {
    return ['CAAC', 'RENSHE', 'NATIONAL_DEFENSE'].includes(sourceId)
  },

  /**
   * 检查是否为有效 categoryId
   */
  isValidCategoryId(categoryId) {
    if (!categoryId) return false
    if (categoryId.includes(':')) {
      const source = categoryId.split(':')[0]
      return ['CAAC', 'RENSHE', 'NATIONAL_DEFENSE'].includes(source)
    }
    return false
  }
}
