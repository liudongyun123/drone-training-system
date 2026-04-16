/**
 * CloudBase 云函数部署脚本
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_ID = 'rcwljy-5ghmq2ex26764978';
const FUNCTION_NAME = 'admin';
const FUNCTION_DIR = path.join(__dirname, '../cloudfunctions/admin');

async function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', cmd], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    child.on('error', reject);
    
    // 发送确认
    setTimeout(() => {
      child.stdin.write('y\n');
      setTimeout(() => {
        child.stdin.write('y\n');
        setTimeout(() => {
          child.stdin.end();
        }, 1000);
      }, 1000);
    }, 2000);
  });
}

async function main() {
  console.log('开始部署云函数 admin...');
  
  // 读取 package.json
  const pkg = JSON.parse(fs.readFileSync(path.join(FUNCTION_DIR, 'package.json'), 'utf8'));
  console.log('依赖:', pkg.dependencies);
  
  // 删除旧云函数
  console.log('\n1. 删除旧云函数...');
  try {
    const deleteResult = await runCommand('echo "y" | tcb fn delete admin');
    console.log(deleteResult.stdout);
    if (deleteResult.stdout.includes('deleted successfully')) {
      console.log('删除成功');
    }
  } catch (e) {
    console.log('删除结果:', e.message);
  }
  
  // 等待
  await new Promise(r => setTimeout(r, 2000));
  
  // 部署新云函数
  console.log('\n2. 部署新云函数...');
  try {
    const deployResult = await runCommand(`tcb fn deploy ${FUNCTION_NAME} --dir cloudfunctions`);
    console.log(deployResult.stdout);
    console.log(deployResult.stderr);
    
    if (deployResult.stdout.includes('Deployment completed') || deployResult.stdout.includes('部署成功')) {
      console.log('部署成功!');
    }
  } catch (e) {
    console.log('部署结果:', e.message);
  }
  
  // 检查状态
  console.log('\n3. 检查部署状态...');
  try {
    const listResult = execSync('tcb fn list | grep admin', { encoding: 'utf8' });
    console.log(listResult);
  } catch (e) {
    console.log('检查结果:', e.message);
  }
}

main().catch(console.error);
