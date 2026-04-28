/**
 * 移动端 API 服务云函数 - HTTP 类型
 * 使用 tcb-admin-node SDK
 */

const tcb = require('tcb-admin-node');

tcb.init({
  env: tcb.DYNAMIC_CURRENT_ENV,
});

const db = tcb.database();
const _ = db.command;

// ========================================
// 主入口
// ========================================

exports.main = async (event, context) => {
  console.log('=== mobile-exam HTTP 入口 ===');
  console.log('event:', JSON.stringify(event).slice(0, 300));
  
  // HTTP 网关传递的参数
  let action = '';
  let data = {};
  
  // 检查 body
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      action = body.action || '';
      data = body.data || {};
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  } else {
    action = event.action || '';
    data = event.data || {};
  }
  
  console.log('Final action:', action);
  
  // 获取 openid
  const wxContext = event.WXContext || {};
  const openid = wxContext.OPENID || '';
  console.log('openid:', openid);

  try {
    // 获取正在招生的班级
    if (action === 'enrollingClasses') {
      const classes = await db.collection('classes')
        .where({ status: 'open' })
        .limit(20)
        .get();
      
      return {
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          code: 0,
          success: true,
          data: classes.data.map(cls => ({
            _id: cls._id,
            classId: cls._id,
            name: cls.name || cls.className || '班级名称',
            price: cls.price || 0,
            startDate: cls.startDate || '',
            location: cls.location || '',
            maxStudents: cls.maxStudents || 30,
            enrolledCount: cls.enrolledCount || 0,
            description: cls.description || '',
            coverImage: cls.coverImage || '',
          })),
          total: classes.data.length,
        })
      };
    }
    
    // 班级详情
    if (action === 'classDetail') {
      const classId = data.classId;
      if (!classId) {
        return {
          statusCode: 400,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code: -1, message: '缺少班级ID' })
        };
      }
      
      const cls = await db.collection('classes').doc(classId).get();
      if (!cls.data || cls.data.length === 0) {
        return {
          statusCode: 404,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code: -1, message: '班级不存在' })
        };
      }
      
      const data2 = cls.data;
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          code: 0,
          success: true,
          data: {
            _id: data2._id,
            classId: data2._id,
            name: data2.name || data2.className || '班级名称',
            price: data2.price || 0,
            startDate: data2.startDate || '',
            endDate: data2.endDate || '',
            location: data2.location || '',
            maxStudents: data2.maxStudents || 30,
            enrolledCount: data2.enrolledCount || 0,
            description: data2.description || '',
            coverImage: data2.coverImage || '',
          }
        })
      };
    }
    
    // 获取轮播图
    if (action === 'banners') {
      const banners = await db.collection('banners')
        .where({ status: 'active' })
        .orderBy('order', 'asc')
        .limit(5)
        .get();
      
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          code: 0,
          success: true,
          data: banners.data.map(b => ({
            _id: b._id,
            image: b.image,
            link: b.link || '',
            courseId: b.courseId || '',
            title: b.title || '',
          }))
        })
      };
    }
    
    // 获取学习路径
    if (action === 'learningPaths') {
      const paths = await db.collection('learning_paths')
        .limit(10)
        .get();
      
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          code: 0,
          success: true,
          data: paths.data.map(p => ({
            _id: p._id,
            name: p.name,
            description: p.description,
            difficulty: p.difficulty || 'beginner',
          }))
        })
      };
    }
    
    // 未知操作
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: -1, message: '未知操作: ' + action })
    };
    
  } catch (error) {
    console.error('云函数错误:', error);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: -1, message: error.message || '服务器错误' })
    };
  }
};
