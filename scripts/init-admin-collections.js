/**
 * 初始化管理后台数据库集合
 * 通过 CloudBase MCP 工具创建所有管理模块需要的集合
 */

// 需要创建的集合列表
const collections = [
  // 核心管理
  { name: 'users', description: '用户信息' },
  { name: 'orders', description: '订单信息' },
  
  // 内容管理
  { name: 'courses', description: '课程信息' },
  { name: 'chapters', description: '章节信息' },
  { name: 'exams', description: '试卷信息' },
  { name: 'question_banks', description: '题库信息' },
  
  // 营销运营
  { name: 'learning_paths', description: '学习路径' },
  { name: 'member_levels', description: '会员等级' },
  { name: 'coupons', description: '优惠券' },
  { name: 'banners', description: '轮播图' },
  { name: 'notices', description: '公告通知' },
  { name: 'schedules', description: '课程表' },
  
  // 系统管理
  { name: 'roles', description: '角色权限' },
  { name: 'system_logs', description: '系统日志' },
  { name: 'system_settings', description: '系统设置' },
  
  // 数据统计
  { name: 'practice_records', description: '练习记录' },
  { name: 'comments', description: '评论反馈' },
]

console.log('需要创建的集合:', collections.map(c => c.name).join(', '))
console.log('请通过 MCP 工具逐一创建这些集合')
