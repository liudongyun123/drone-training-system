import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = 'rcwljy-5ghmq2ex26764978';
const PUBLISHABLE_KEY = process.env.VITE_PUBLISHABLE_KEY || '';

async function debug() {
  console.log('🔍 深度调试教师数据查询\n');
  
  const app = cloudbase.init({
    env: ENV_ID,
    timeout: 15000,
    auth: { anonymousProvider: true, persistence: "local" },
    ...(PUBLISHABLE_KEY ? { accessKey: PUBLISHABLE_KEY } : {})
  });

  // 匿名登录
  try {
    await app.auth().signInAnonymously();
    console.log('✅ 匿名登录成功\n');
  } catch (e) {
    console.log('ℹ️ 使用已有会话\n');
  }

  // 1. 测试云函数调用 - 模拟 teacherService.getList 的调用
  console.log('📡 测试云函数 admin (list teacher_profiles)...');
  try {
    const result = await app.callFunction({
      name: 'admin',
      data: {
        action: 'list',
        collection: 'teacher_profiles',
        query: {},
        options: { limit: 10, page: 1 }
      }
    });
    
    console.log('✅ 云函数调用成功!');
    console.log('完整响应结构:');
    console.log(JSON.stringify(result, null, 2).slice(0, 3000));
    
    console.log('\n📊 result.result 结构:');
    console.log(JSON.stringify(result.result, null, 2).slice(0, 2000));
    
    // 检查 data 字段
    if (result.result && result.result.data) {
      console.log('\n📋 result.result.data 类型:', typeof result.result.data);
      console.log('📋 result.result.data 是否为数组:', Array.isArray(result.result.data));
      if (Array.isArray(result.result.data)) {
        console.log('📋 数据条数:', result.result.data.length);
      }
    }
    
    // 检查 list 字段
    if (result.result && result.result.list) {
      console.log('\n📋 result.result.list 类型:', typeof result.result.list);
      console.log('📋 result.result.list 是否为数组:', Array.isArray(result.result.list));
      if (Array.isArray(result.result.list)) {
        console.log('📋 数据条数:', result.result.list.length);
      }
    }
    
  } catch (e) {
    console.error('❌ 云函数调用失败:', e.code, e.message);
    console.error(e);
  }

  // 2. 直接查询数据库
  console.log('\n\n📡 直接查询数据库 teacher_profiles...');
  try {
    const db = app.database();
    const result = await db.collection('teacher_profiles')
      .limit(10)
      .get();
    
    console.log('✅ 数据库查询成功!');
    console.log('数据条数:', result.data?.length || 0);
    console.log('第一条数据:', JSON.stringify(result.data?.[0], null, 2)?.slice(0, 500));
  } catch (e) {
    console.error('❌ 数据库查询失败:', e.code, e.message);
  }
}

debug().catch(console.error);
