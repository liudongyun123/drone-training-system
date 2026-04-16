const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const adminDir = path.join(distDir, 'admin');

// 创建 admin 目录
if (!fs.existsSync(adminDir)) {
  fs.mkdirSync(adminDir, { recursive: true });
}

// 所有后台路由
const routes = [
  'dashboard', 'courses', 'students', 'teachers', 'schedules', 
  'attendance', 'orders', 'finance', 'exams', 'question-banks',
  'certificates', 'coupons', 'group-buys', 'live-streams',
  'banners', 'page-config', 'auth-config', 'logs', 'settings'
];

// 创建主 admin/index.html
const mainIndexContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Loading...</title>
  <script>
    window.location.replace('/#/admin' + window.location.search);
  </script>
</head>
<body>
  <p>正在跳转...</p>
</body>
</html>`;

fs.writeFileSync(path.join(adminDir, 'index.html'), mainIndexContent);
console.log('Created admin/index.html');

// 为每个路由创建目录和 index.html
routes.forEach(route => {
  const routeDir = path.join(adminDir, route);
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }
  
  const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Loading...</title>
  <script>
    window.location.replace('/#/admin/${route}' + window.location.search);
  </script>
</head>
<body>
  <p>正在跳转...</p>
</body>
</html>`;
  
  fs.writeFileSync(path.join(routeDir, 'index.html'), content);
  console.log(`Created admin/${route}/index.html`);
});

console.log('All redirect pages created successfully!');
