import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = 'rcwljy-5ghmq2ex26764978';
const PUBLISHABLE_KEY = process.env.VITE_PUBLISHABLE_KEY || '';

async function test() {
  console.log('🔍 测试云函数调用\n');
  
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

  // 测试云函数调用
  console.log('📡 测试云函数 admin...');
  try {
    const result = await app.callFunction({
      name: 'admin',
      data: {
        action: 'list',
        collection: 'teacher_profiles',
        query: {},
        options: { limit: 10 }
      }
    });
    
    console.log('✅ 云函数调用成功!');
    console.log('响应:', JSON.stringify(result.result, null, 2).slice(0, 2000));
  } catch (e) {
    console.error('❌ 云函数调用失败:', e.code, e.message);
  }
}

test().catch(console.error);
