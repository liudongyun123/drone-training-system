const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 等级映射
const levelMapping = {
  'beginner': '初级工',
  'intermediate': '中级工',
  'advanced': '高级工',
  'expert': '技师',
  'master': '高级技师'
};

exports.main = async (event, context) => {
  const { action } = event;
  
  try {
    if (action === 'fixLevels') {
      // 批量修复 members 集合的 level 字段
      let totalFixed = 0;
      
      for (const [oldLevel, newLevel] of Object.entries(levelMapping)) {
        // 更新顶层 level 字段
        const result1 = await db.collection('members')
          .where({ level: oldLevel })
          .update({
            data: { level: newLevel }
          });
        totalFixed += result1.stats.updated;
        
        // 更新 profile.level 嵌套字段
        const result2 = await db.collection('members')
          .where({ 'profile.level': oldLevel })
          .update({
            data: { 'profile.level': newLevel }
          });
        totalFixed += result2.stats.updated;
      }
      
      return { success: true, totalFixed };
    }
    
    return { success: false, message: 'Unknown action' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
