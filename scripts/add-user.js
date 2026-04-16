/**
 * 添加用户脚本
 * 运行: node scripts/add-user.js
 */
const tcb = require('@cloudbase/node-sdk');

async function addUser() {
  const app = tcb.init({
    env: 'rcwljy-5ghmq2ex26764978'
  });
  
  const db = app.database();
  
  const userData = {
    password: '123456',
    data: {
      phone: '17628157097',
      username: '17628157097',
      role: 'student',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  
  try {
    // 先检查是否已存在
    const existResult = await db.collection('users').where({
      'data.phone': '17628157097'
    }).count();
    
    if (existResult.total > 0) {
      console.log('用户已存在，更新密码...');
      await db.collection('users').where({
        'data.phone': '17628157097'
      }).update({
        data: {
          password: '123456',
          'data.updatedAt': new Date().toISOString()
        }
      });
      console.log('✅ 用户密码已更新');
      return;
    }
    
    // 添加新用户
    const result = await db.collection('users').add(userData);
    console.log('✅ 用户添加成功:', result.id);
  } catch (error) {
    console.error('❌ 添加失败:', error);
  }
  
  process.exit(0);
}

addUser();
