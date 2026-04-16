/**
 * 诊断脚本：直接测试 CloudBase 数据库访问
 * 运行: node scripts/diagnose-db.mjs
 */
import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = 'rcwljy-5ghmq2ex26764978';
const PUBLISHABLE_KEY = process.env.VITE_PUBLISHABLE_KEY || '';

async function diagnose() {
  console.log('🔍 CloudBase 数据库诊断\n');
  console.log('环境ID:', ENV_ID);
  console.log('Publishable Key:', PUBLISHABLE_KEY ? `已配置 (${PUBLISHABLE_KEY.length} 字符)` : '❌ 未配置');

  // 1. 初始化
  console.log('\n📦 步骤1: 初始化 SDK...');
  const appConfig = {
    env: ENV_ID,
    timeout: 15000,
    auth: {
      detectSessionInUrl: false,
      anonymousProvider: true,
      persistence: "local"
    },
  };
  
  if (PUBLISHABLE_KEY) {
    appConfig.accessKey = PUBLISHABLE_KEY;
  }

  const app = cloudbase.init(appConfig);
  console.log('✅ SDK 初始化成功');

  // 2. 认证
  console.log('\n🔐 步骤2: 检查/执行匿名登录...');
  const auth = app.auth();
  
  try {
    const sessionResult = await auth.getSession();
    console.log('✅ 已存在会话:', sessionResult.data.session ? '有' : '无');
  } catch (error) {
    console.log('ℹ️ 获取会话出错 (继续尝试匿名登录):', error?.message);
  }

  try {
    const signInResult = await auth.signInAnonymously();
    console.log('✅ 匿名登录成功!');
    console.log('   Session:', signInResult.data.session);
  } catch (error) {
    console.error('❌ 匿名登录失败!');
    console.error('   错误码:', error?.code);
    console.error('   错误信息:', error?.message);
    console.error('   完整错误:', JSON.stringify(error, null, 2));
  }

  // 3. 查询 members 集合 - 复现前端查询方式
  console.log('\n📋 步骤3: 查询 members 集合...');
  const db = app.database();

  console.log('\n   --- 方式A: 简单查询 ---');
  try {
    const result = await db.collection('members').where({}).limit(10).get();
    console.log('   响应 keys:', Object.keys(result));
    console.log('   响应:', JSON.stringify(result, null, 2).slice(0, 2000));
  } catch (error) {
    console.error('   方式A 失败:', error?.message);
  }

  console.log('\n   --- 方式B: 不带 where ---');
  try {
    const result2 = await db.collection('members').limit(10).get();
    console.log('   响应 keys:', Object.keys(result2));
    console.log('   响应:', JSON.stringify(result2, null, 2).slice(0, 2000));
  } catch (error) {
    console.error('   方式B 失败:', error?.message);
  }

  console.log('\n   --- 方式C: count 查询 ---');
  try {
    const countResult = await db.collection('members').where({}).count();
    console.log('   count 响应:', JSON.stringify(countResult, null, 2));
  } catch (error) {
    console.error('   count 失败:', error?.message);
  }

  // 4. 检查安全规则
  console.log('\n🔒 步骤4: 安全规则...');
  console.log('请确认 members 集合的安全规则设置为: rule: true (允许所有访问)');
  console.log('检查地址: https://tcb.cloud.tencent.com/dev?envId=' + ENV_ID + '#/db/doc/collection/members');
}

diagnose().catch(console.error);
