import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = 'rcwljy-5ghmq2ex26764978';
const PUBLISHABLE_KEY = process.env.VITE_PUBLISHABLE_KEY || '';

async function debug() {
  console.log('🔍 模拟浏览器环境调试\n');
  
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

  // 模拟 teacherService.getList 调用
  console.log('📡 调用云函数 admin (list teacher_profiles)...');
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
    
    console.log('✅ 云函数返回成功!');
    console.log('\n=== 完整返回结构 ===');
    console.log(JSON.stringify(result, null, 2).slice(0, 4000));
    
    console.log('\n=== result.result 结构 ===');
    console.log(JSON.stringify(result.result, null, 2).slice(0, 3000));
    
    // 检查 result.result.data 的类型
    const responseData = result.result.data;
    console.log('\n=== 数据分析 ===');
    console.log('result.result.data 类型:', typeof responseData);
    console.log('result.result.data 是否为数组:', Array.isArray(responseData));
    
    if (Array.isArray(responseData)) {
      console.log('✅ data 是数组，长度:', responseData.length);
      console.log('第一条数据:', JSON.stringify(responseData[0], null, 2)?.slice(0, 500));
    } else if (responseData && typeof responseData === 'object') {
      console.log('data 是对象，键:', Object.keys(responseData));
      if (responseData.list) {
        console.log('data.list 类型:', typeof responseData.list);
        console.log('data.list 是否为数组:', Array.isArray(responseData.list));
        if (Array.isArray(responseData.list)) {
          console.log('data.list 长度:', responseData.list.length);
        }
      }
    }
    
    // 模拟前端解析逻辑
    console.log('\n=== 模拟前端解析 ===');
    const resultObj = result.result;
    let teacherList = [];
    
    // 方法1: result.data?.list
    if (resultObj.data?.list && Array.isArray(resultObj.data.list)) {
      console.log('✅ 方法1成功: result.data.list');
      teacherList = resultObj.data.list;
    }
    // 方法2: result.data 是数组
    else if (Array.isArray(resultObj.data)) {
      console.log('✅ 方法2成功: result.data 是数组');
      teacherList = resultObj.data;
    }
    // 方法3: result.data?.data
    else if (resultObj.data?.data && Array.isArray(resultObj.data.data)) {
      console.log('✅ 方法3成功: result.data.data');
      teacherList = resultObj.data.data;
    }
    else {
      console.log('❌ 所有方法都失败');
      console.log('result.data:', resultObj.data);
    }
    
    console.log('\n最终 teacherList 长度:', teacherList.length);
    
  } catch (e) {
    console.error('❌ 调用失败:', e.code, e.message);
    console.error(e);
  }
}

debug().catch(console.error);
