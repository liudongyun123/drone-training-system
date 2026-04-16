#!/usr/bin/env node

/**
 * 批量更新CloudAdminService.ts中的Service方法,添加分页和搜索支持
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/CloudAdminService.ts');

if (!fs.existsSync(filePath)) {
  console.error('文件不存在:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf-8');

// Service列表和对应的搜索字段
const services = [
  { name: 'CloudOrderAdminService', searchFields: ['username', 'courseTitle'] },
  { name: 'CloudCouponAdminService', searchFields: ['name', 'code'] },
  { name: 'CloudBannerAdminService', searchFields: ['title'] },
  { name: 'CloudCommentAdminService', searchFields: ['userName', 'content', 'courseName'] },
  { name: 'CloudNoticeAdminService', searchFields: ['title'] },
  { name: 'CloudRoleAdminService', searchFields: ['name', 'code'] },
  { name: 'CloudScheduleAdminService', searchFields: ['courseName', 'instructor'] },
  { name: 'CloudSystemLogAdminService', searchFields: ['action', 'userName', 'ip'] },
];

let updated = false;

services.forEach(service => {
  console.log(`\n处理 ${service.name}...`);

  // 检查是否已经更新过
  const hasParams = new RegExp(`const ${service.name} = \\{[^}]*getAll\\([^)]*\\?:`, 's').test(content);
  if (hasParams) {
    console.log(`  已更新过,跳过`);
    return;
  }

  // 查找getAll方法
  const getAllPattern = new RegExp(`(${service.name} = \\{\\s*collection[^}]*?)(async getAll\\(\\) \\{[^}]*?list\\(this\\.collection\\))`, 's');
  const match = content.match(getAllPattern);

  if (!match) {
    console.log(`  未找到getAll方法`);
    return;
  }

  // 替换getAll方法,添加参数
  const newGetAll = `${match[1]}
  async getAll(params?: { offset?: number; limit?: number; search?: string }) {
    try {
      const { offset = 0, limit = 100, search } = params || {}
      const query: any = {}
      const options: any = { limit, skip: offset }

      if (search) {
        query.$or = [
${service.searchFields.map(f => `          { ${f}: new RegExp(search, 'i') }`).join(',\n')}
        ]
      }

      const result = await adminService`;

  content = content.replace(match[0], newGetAll);
  console.log(`  ✓ 更新getAll方法`);

  // 查找delete方法后的位置,插入count方法
  const deletePattern = new RegExp(`(${service.name}[\\s\\S]*?async delete\\([^)]*\\) \\{[^}]*?\\n  \\},)`, 's');
  const deleteMatch = content.match(deletePattern);

  if (!deleteMatch) {
    console.log(`  未找到delete方法`);
    return;
  }

  // 构建count方法
  const countMethod = `

  async count(params?: { search?: string }) {
    try {
      const { search } = params || {}
      const query: any = {}
      if (search) {
        query.$or = [
${service.searchFields.map(f => `          { ${f}: new RegExp(search, 'i') }`).join(',\n')}
        ]
      }
      const result = await adminService.count(this.collection, query)
      return result.data
    } catch (error) {
      console.error('获取总数失败:', error)
      return 0
    }
  },`;

  content = content.replace(deleteMatch[0], deleteMatch[0] + countMethod);
  console.log(`  ✓ 添加count方法`);

  updated = true;
});

if (updated) {
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('\n✓ 文件更新完成!');
  console.log('请检查src/services/CloudAdminService.ts文件');
} else {
  console.log('\n没有需要更新的内容');
}
