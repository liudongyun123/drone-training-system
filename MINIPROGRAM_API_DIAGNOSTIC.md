# 小程序 API 诊断页面

## 问题分析

### 1. HTTP API 端点
小程序使用以下 API 端点：
- API_BASE: `https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com`
- db-init: `POST /db-init`
- mobile-learning: `POST /mobile-learning`

### 2. 课程查询条件
```javascript
// courseApi.getHotCourses()
where: { status: 'published' }
orderBy: 'salesCount desc'

// courseApi.getList()
where: { status: 'published', ... }
orderBy: 'createdAt desc'
```

### 3. 可能的问题
1. **courses 集合没有数据** - 需要检查数据库
2. **课程 status 不是 'published'** - 需要更新课程状态
3. **HTTP 路由配置问题** - db-init 路由可能不正确
4. **数据库安全规则** - 可能阻止了无 _openid 的查询

## 诊断步骤

### 步骤 1: 检查 courses 集合数据
```javascript
// 使用 db-init 云函数查询
POST /db-init
{
  "action": "getList",
  "collection": "courses",
  "query": {},
  "limit": 5
}
```

### 步骤 2: 检查课程状态分布
```javascript
POST /db-init
{
  "action": "count",
  "collection": "courses",
  "query": {}
}
```

### 步骤 3: 测试 HTTP 触发器
访问以下 URL 测试：
```
https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com/db-init
```

## 解决方案

### 方案 1: 修复数据库数据
如果课程没有 `status: 'published'` 或 `salesCount` 字段，需要：
1. 批量更新课程状态
2. 初始化 salesCount 为 0

### 方案 2: 修改查询条件
如果数据中没有 published 状态的课程：
```javascript
// 修改 api.ts 中的查询条件
async getHotCourses(limit: number = 6, sourceId?: string) {
  const result = await dbGetList('courses', {
    // 移除 status 限制，改为查询所有
    orderBy: 'createdAt desc',  // 或使用其他排序字段
    limit
  })
}
```

### 方案 3: 重新部署 db-init 云函数
确保 HTTP 触发器配置正确。
