#!/usr/bin/env node

/**
 * E2E 测试运行脚本
 * 自动启动开发服务器并运行 Playwright 测试
 */

const { spawn } = require('child_process');
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5173';

async function waitForServer(url, timeout = 60000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('✅ 开发服务器已启动');
        return true;
      }
    } catch (e) {
      // 服务器尚未启动
    }
    await new Promise(r => setTimeout(r, 1000));
    process.stdout.write('.');
  }
  console.log('\n❌ 服务器启动超时');
  return false;
}

async function runBasicTests() {
  console.log('\n📋 开始基础测试...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // 收集错误
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.errors.push(`Console Error: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    results.errors.push(`Page Error: ${error.message}`);
  });

  try {
    // 测试1: 首页加载
    console.log('🧪 测试1: 首页加载');
    await page.goto(BASE_URL, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    const homeTitle = await page.title();
    console.log(`   页面标题: ${homeTitle}`);
    console.log(`   ✅ 首页加载成功`);
    results.passed++;

    // 测试2: 管理后台加载
    console.log('\n🧪 测试2: 管理后台加载');
    await page.goto(`${BASE_URL}/admin`, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const adminBody = await page.locator('body').innerText();
    if (adminBody.length > 100) {
      console.log(`   ✅ 管理后台加载成功 (${adminBody.length} 字符)`);
      results.passed++;
    } else {
      console.log(`   ❌ 管理后台内容过少`);
      results.failed++;
    }

    // 测试3: 课程管理页面
    console.log('\n🧪 测试3: 课程管理页面');
    await page.goto(`${BASE_URL}/admin/courses`, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    console.log(`   ✅ 课程管理页面加载成功`);
    results.passed++;

    // 测试4: 教师管理页面
    console.log('\n🧪 测试4: 教师管理页面');
    await page.goto(`${BASE_URL}/admin/teachers`, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    console.log(`   ✅ 教师管理页面加载成功`);
    results.passed++;

    // 测试5: 权限管理页面
    console.log('\n🧪 测试5: 权限管理页面');
    await page.goto(`${BASE_URL}/admin/permissions`, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    console.log(`   ✅ 权限管理页面加载成功`);
    results.passed++;

  } catch (error) {
    console.log(`\n   ❌ 测试失败: ${error.message}`);
    results.failed++;
    results.errors.push(error.message);
  }

  await browser.close();

  // 输出结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(50));
  console.log(`✅ 通过: ${results.passed}`);
  console.log(`❌ 失败: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n⚠️ 错误信息:');
    results.errors.forEach(e => console.log(`   - ${e}`));
  }
  
  console.log('\n' + '='.repeat(50));
  
  return results.failed === 0;
}

async function main() {
  console.log('🚀 启动开发服务器...');
  
  // 启动开发服务器
  const serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', data => {
    serverOutput += data.toString();
  });
  serverProcess.stderr.on('data', data => {
    serverOutput += data.toString();
  });

  // 等待服务器启动
  const serverReady = await waitForServer(BASE_URL);
  
  if (!serverReady) {
    console.log('❌ 无法启动开发服务器');
    serverProcess.kill();
    process.exit(1);
  }

  try {
    // 运行测试
    const success = await runBasicTests();
    process.exit(success ? 0 : 1);
  } finally {
    // 清理
    console.log('\n🛑 关闭开发服务器...');
    serverProcess.kill();
  }
}

main().catch(console.error);
