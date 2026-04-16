import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = 'rcwljy-5ghmq2ex26764978';
const PUBLISHABLE_KEY = process.env.VITE_PUBLISHABLE_KEY || '';

async function diagnose() {
  console.log('🔍 教师管理诊断\n');

  // 1. 初始化
  const app = cloudbase.init({
    env: ENV_ID,
    timeout: 15000,
    auth: { anonymousProvider: true, persistence: "local" },
    ...(PUBLISHABLE_KEY ? { accessKey: PUBLISHABLE_KEY } : {})
  });

  // 2. 匿名登录
  const auth = app.auth();
  try {
    await auth.signInAnonymously();
    console.log('✅ 匿名登录成功\n');
  } catch (e) {
    console.log('ℹ️ 使用已有会话\n');
  }

  const db = app.database();

  // 3. 测试多个可能的集合名
  const collections = ['teachers', 'teacher_profiles', 'teacherprofile'];
  
  for (const coll of collections) {
    console.log(`📋 测试集合: ${coll}`);
    try {
      const result = await db.collection(coll).where({}).limit(2).get();
      console.log(`   ✅ 成功! 数据条数: ${result.data?.length || 0}`);
      if (result.data?.length > 0) {
        console.log(`   示例: ${result.data[0].name || result.data[0]._id || JSON.stringify(result.data[0]).slice(0, 100)}`);
      }
    } catch (e) {
      console.log(`   ❌ 失败: ${e.code || e.message}`);
    }
  }
}

diagnose().catch(console.error);
