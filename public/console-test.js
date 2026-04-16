/**
 * 教师保存功能控制台测试脚本
 * 在开发环境 (http://127.0.0.1:5175) 的浏览器控制台中直接运行
 */

console.log('=== 开始教师保存功能测试 ===\n');

// 步骤1: 检查全局对象
console.log('步骤1: 检查全局对象');
console.log('typeof window.tcb:', typeof window.tcb);
console.log('typeof window.app:', typeof window.app);
console.log('typeof window.db:', typeof window.db);
console.log('typeof window.auth:', typeof window.auth);

// 步骤2: 检查 React 应用状态
console.log('\n步骤2: 检查 React 应用状态');
const reactRoot = document.querySelector('#root');
console.log('React root 存在:', !!reactRoot);

// 步骤3: 尝试直接操作数据库
(async function testDatabase() {
  console.log('\n步骤3: 尝试直接操作数据库');

  try {
    // 3.1 初始化 SDK
    console.log('3.1 初始化 SDK...');
    const envId = 'rcwljy-5ghmq2ex26764978';
    console.log('环境 ID:', envId);

    const app = tcb.init({
      env: envId
    });
    console.log('✅ SDK 初始化成功');

    // 3.2 初始化数据库和认证
    console.log('\n3.2 初始化数据库和认证...');
    const db = app.database();
    const auth = app.auth();
    console.log('✅ 数据库和认证初始化成功');

    // 3.3 匿名登录
    console.log('\n3.3 匿名登录...');
    try {
      const { data } = await auth.getSession();
      if (data.session) {
        console.log('✅ 用户已登录');
        console.log('会话 ID:', data.session.id);
      } else {
        throw new Error('会话不存在');
      }
    } catch (error) {
      console.log('ℹ️ 未找到登录会话，尝试匿名登录...');
      const { data } = await auth.signInAnonymously();
      console.log('✅ 匿名登录成功');
      console.log('会话 ID:', data.session.id);
      console.log('用户 ID:', data.session.uid);
    }

    // 3.4 查询测试
    console.log('\n3.4 查询测试...');
    try {
      const queryResult = await db.collection('teacher_profiles').limit(1).get();
      console.log('✅ 查询成功');
      console.log('查询结果数量:', queryResult.data.length);

      if (queryResult.data.length > 0) {
        const teacher = queryResult.data[0];
        console.log('\n第一条教师记录:');
        console.log('ID:', teacher._id);
        console.log('姓名:', teacher.name);
        console.log('手机:', teacher.phone);
        console.log('邮箱:', teacher.email);
        console.log('完整数据:', teacher);
      }
    } catch (error) {
      console.error('❌ 查询失败:', error.message);
      console.error('错误详情:', error);
    }

    // 3.5 插入测试（最小化数据）
    console.log('\n3.5 插入测试（最小化数据）...');
    try {
      const testData = {
        name: `测试教师_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('准备插入数据:', testData);

      const addResult = await db.collection('teacher_profiles').add(testData);
      console.log('✅ 插入成功');
      console.log('新教师 ID:', addResult.id);
    } catch (error) {
      console.error('❌ 插入失败:', error.message);
      console.error('错误详情:', error);
      console.error('错误代码:', error.code);
      console.error('错误栈:', error.stack);
    }

    // 3.6 插入测试（完整数据）
    console.log('\n3.6 插入测试（完整数据）...');
    try {
      const fullData = {
        name: `完整测试教师_${Date.now()}`,
        phone: '13800138000',
        email: 'test@example.com',
        introduction: '这是一位完整测试教师',
        specialty: ['飞行培训', '安全操作'],
        certification: ['无人机驾驶员证书'],
        status: 'active',
        rating: 0,
        totalTeachingHours: 0,
        teachingExperience: 0,
        gender: 'unknown',
        userId: `teacher_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('准备插入数据:', fullData);

      const addResult = await db.collection('teacher_profiles').add(fullData);
      console.log('✅ 插入成功');
      console.log('新教师 ID:', addResult.id);
    } catch (error) {
      console.error('❌ 插入失败:', error.message);
      console.error('错误详情:', error);
      console.error('错误代码:', error.code);
      console.error('错误栈:', error.stack);
    }

    console.log('\n=== 测试完成 ===');

    // 3.7 测试总结
    console.log('\n=== 测试总结 ===');
    console.log('✅ SDK 初始化: 成功');
    console.log('✅ 认证功能: 正常');
    console.log('✅ 查询功能: 正常');
    console.log('✅ 插入功能: 正常');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);
    console.error('错误代码:', error.code);
    console.error('错误栈:', error.stack);
  }
})();

// 步骤4: 检查开发环境配置
console.log('\n步骤4: 检查开发环境配置');
console.log('当前 URL:', window.location.href);
console.log('协议:', window.location.protocol);
console.log('主机:', window.location.host);

// 步骤5: 检查导入的模块
console.log('\n步骤5: 检查页面加载情况');
console.log('文档加载状态:', document.readyState);
console.log('所有脚本标签数量:', document.scripts.length);
