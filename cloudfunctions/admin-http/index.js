const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, collection, data = {} } = event;
  
  // 设置 CORS 头
  const response = {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  };
  
  try {
    // 测试连接
    if (action === 'test') {
      return { ...response, body: JSON.stringify({ code: 0, message: '连接成功' }) };
    }
    
    // 计数
    if (action === 'count') {
      const countResult = await db.collection(collection).count();
      return { ...response, body: JSON.stringify({ code: 0, data: countResult.total }) };
    }
    
    // 列表
    if (action === 'list') {
      const { page = 1, pageSize = 20 } = data;
      const skip = (page - 1) * pageSize;
      const listResult = await db.collection(collection).skip(skip).limit(pageSize).get();
      const countResult = await db.collection(collection).count();
      return { 
        ...response, 
        body: JSON.stringify({ 
          code: 0, 
          data: listResult.data,
          total: countResult.total 
        }) 
      };
    }
    
    // 生成测试数据
    if (action === 'generateTestData') {
      const { count = 10 } = data;
      const now = new Date();
      
      if (collection === 'course_permissions') {
        const testData = Array.from({ length: count }, (_, i) => ({
          userId: `user_${String(i + 1).padStart(3, '0')}`,
          userName: `学员${i + 1}`,
          phone: `139${String(10000000 + i).slice(-8)}`,
          courseId: `course_00${(i % 3) + 1}`,
          courseName: ['无人机基础飞行训练', '无人机高级飞行技术', '无人机维修保养'][i % 3],
          source: ['purchase', 'registration', 'gift'][i % 3],
          memberType: ['online_buyer', 'online_registrant', 'offline_registrant'][i % 3],
          videoAccess: {
            enabled: true,
            validFrom: now.toISOString(),
            validUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
          },
          status: 'active',
          createdAt: now.toISOString()
        }));
        
        const batchRes = await db.collection(collection).add({ data: testData });
        return { 
          ...response, 
          body: JSON.stringify({ 
            code: 0, 
            data: { inserted: count },
            message: `成功生成 ${count} 条课程权限测试数据`
          }) 
        };
      }
      
      if (collection === 'class_members') {
        const testData = Array.from({ length: count }, (_, i) => ({
          classId: `class_00${(i % 3) + 1}`,
          className: ['飞行基础班A', '高级飞行班B', '维修实践班C'][i % 3],
          userId: `user_${String(i + 1).padStart(3, '0')}`,
          userName: `学员${i + 1}`,
          phone: `139${String(10000000 + i).slice(-8)}`,
          source: ['registration', 'transfer', 'admin_add'][i % 3],
          status: ['enrolled', 'learning', 'completed'][i % 3],
          enrollmentDate: now.toISOString(),
          attendanceStats: {
            total: Math.floor(Math.random() * 20) + 10,
            present: Math.floor(Math.random() * 18) + 8,
            absent: Math.floor(Math.random() * 5),
            late: Math.floor(Math.random() * 3)
          },
          progress: Math.floor(Math.random() * 100),
          createdAt: now.toISOString()
        }));
        
        const batchRes = await db.collection(collection).add({ data: testData });
        return { 
          ...response, 
          body: JSON.stringify({ 
            code: 0, 
            data: { inserted: count },
            message: `成功生成 ${count} 条班级成员测试数据`
          }) 
        };
      }
      
      return { ...response, body: JSON.stringify({ code: -1, message: '不支持的集合' }) };
    }
    
    return { ...response, body: JSON.stringify({ code: -1, message: '不支持的操作' }) };
    
  } catch (e) {
    return { 
      ...response, 
      statusCode: 500,
      body: JSON.stringify({ code: -1, message: e.message }) 
    };
  }
};
