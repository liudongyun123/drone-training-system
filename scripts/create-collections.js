/**
 * 通过 admin 云函数创建数据库集合
 */
const collections = [
  { name: 'chapters', sampleData: { title: '示例章节', courseId: 'demo', sortOrder: 0, status: 'published' } },
  { name: 'exams', sampleData: { title: '示例试卷', courseId: 'demo', questionCount: 10, duration: 60, status: 'published' } },
  { name: 'question_banks', sampleData: { title: '示例题库', category: '技术', questionCount: 50, status: 'published' } },
  { name: 'learning_paths', sampleData: { title: '示例学习路径', description: '从零开始学编程', level: '入门', status: 'published' } },
  { name: 'member_levels', sampleData: { name: '青铜会员', price: 0, originalPrice: 0, discount: 0, features: [], status: 'active' } },
  { name: 'coupons', sampleData: { code: 'DEMO123', type: 'discount', price: 10, minPrice: 100, count: 100, status: 'active' } },
  { name: 'banners', sampleData: { title: '示例轮播图', imageUrl: '', linkUrl: '', sortOrder: 0, status: 'active' } },
  { name: 'notices', sampleData: { title: '示例公告', content: '系统公告内容', type: 'system', status: 'published' } },
  { name: 'schedules', sampleData: { title: '示例课程表', date: new Date().toISOString(), startTime: '09:00', endTime: '10:00', status: 'active' } },
  { name: 'roles', sampleData: { name: '管理员', code: 'admin', description: '系统管理员', permissions: ['all'], status: 'active' } },
  { name: 'system_logs', sampleData: { level: 'info', module: 'system', operation: 'init', message: '系统初始化' } },
  { name: 'system_settings', sampleData: { key: 'site_name', value: '无人机培训系统', category: 'basic' } },
  { name: 'practice_records', sampleData: { userId: 'demo', bankId: 'demo', score: 80, totalQuestions: 10, correctCount: 8 } },
  { name: 'comments', sampleData: { userId: 'demo', content: '示例评论', rating: 5, status: 'approved' } },
]

console.log('准备创建以下集合:')
collections.forEach(c => console.log(`- ${c.name}`))

console.log('\n请通过 admin 云函数的 add 接口为每个集合添加示例数据来创建集合')
console.log('集合将在第一次添加数据时自动创建')
