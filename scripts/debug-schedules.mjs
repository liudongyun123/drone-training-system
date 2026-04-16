import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = 'rcwljy-5ghmq2ex26764978';
const PUBLISHABLE_KEY = process.env.VITE_PUBLISHABLE_KEY || '';

async function debug() {
  console.log('🔍 调试排课数据\\n');
  
  const app = cloudbase.init({
    env: ENV_ID,
    timeout: 15000,
    auth: { anonymousProvider: true, persistence: "local" },
    ...(PUBLISHABLE_KEY ? { accessKey: PUBLISHABLE_KEY } : {})
  });

  try {
    await app.auth().signInAnonymously();
    console.log('✅ 匿名登录成功\\n');
  } catch (e) {
    console.log('ℹ️ 使用已有会话\\n');
  }

  // 1. 检查 course_schedules 集合
  console.log('📡 查询 course_schedules 集合...');
  try {
    const db = app.database();
    const result = await db.collection('course_schedules').limit(5).get();
    console.log('✅ 数据库查询成功!');
    console.log('数据条数:', result.data?.length || 0);
    if (result.data?.length > 0) {
      console.log('\\n第一条数据:');
      console.log(JSON.stringify(result.data[0], null, 2));
    } else {
      console.log('集合为空!');
    }
  } catch (e) {
    console.error('❌ course_schedules 查询失败:', e.message);
  }

  // 2. 检查 schedules 集合
  console.log('\\n\\n📡 查询 schedules 集合...');
  try {
    const db = app.database();
    const result = await db.collection('schedules').limit(5).get();
    console.log('✅ 数据库查询成功!');
    console.log('数据条数:', result.data?.length || 0);
    if (result.data?.length > 0) {
      console.log('\\n第一条数据:');
      console.log(JSON.stringify(result.data[0], null, 2));
    } else {
      console.log('集合为空!');
    }
  } catch (e) {
    console.error('❌ schedules 查询失败:', e.message);
  }

  // 3. 测试云函数调用
  console.log('\\n\\n📡 测试云函数 admin (list course_schedules)...');
  try {
    const result = await app.callFunction({
      name: 'admin',
      data: {
        action: 'list',
        collection: 'course_schedules',
        query: {},
        options: { limit: 10, page: 1 }
      }
    });
    
    console.log('✅ 云函数调用成功!');
    console.log('\\n=== 响应结构 ===');
    console.log(JSON.stringify(result.result, null, 2)?.slice(0, 3000));
    
    const data = result.result?.data;
    console.log('\\n=== 数据分析 ===');
    console.log('data 类型:', typeof data);
    console.log('data 是否为数组:', Array.isArray(data));
    if (Array.isArray(data)) {
      console.log('数组长度:', data.length);
    }
  } catch (e) {
    console.error('❌ 云函数调用失败:', e.code, e.message);
  }
}

debug().catch(console.error);
