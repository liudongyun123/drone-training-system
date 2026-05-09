# 小程序功能测试清单

## 测试环境
- 微信开发者工具
- 项目目录：`/Users/liudongyun/Desktop/drone-training-system-new/miniprogram`

## 测试模块

### 1. 首页 (index)
- [ ] 热门课程显示
- [ ] 轮播图加载
- [ ] 培训班列表
- [ ] 体系切换 (RENSHE/CAAC)
- [ ] 分类点击跳转学习路径

### 2. 课程列表 (course-list)
- [ ] 课程列表加载
- [ ] 分类筛选
- [ ] 排序功能 (最新/最热/价格)
- [ ] 体系切换
- [ ] 下拉刷新
- [ ] 上拉加载更多

### 3. 课程详情 (course-detail)
- [ ] 课程信息显示
- [ ] 课时列表显示
- [ ] 权限检查 (是否已购买)
- [ ] 购买按钮
- [ ] 开始学习按钮

### 4. 登录 (login)
- [ ] 微信登录
- [ ] 手机号登录
- [ ] 登录状态检查
- [ ] 退出登录

### 5. 结算 (checkout)
- [ ] 课程订单创建
- [ ] 订单信息验证
- [ ] 提交订单

### 6. 学习路径 (learning-path)
- [ ] 等级显示
- [ ] 课程按等级分组
- [ ] 跳转课程详情

### 7. 我的学习 (my-learning)
- [ ] 学习进度显示
- [ ] 已购课程列表
- [ ] Tab 切换

### 8. 订单 (my-orders)
- [ ] 订单列表加载
- [ ] 订单状态显示

## API 测试

### 测试课程 API
```javascript
// 测试热门课程
const res = await courseApi.getHotCourses(6, 'RENSHE')
console.log('热门课程:', res)

// 测试课程列表
const courses = await courseApi.getList({ sourceId: 'RENSHE' })
console.log('课程列表:', courses)

// 测试课程详情
const detail = await courseApi.getDetail('courseId')
console.log('课程详情:', detail)
```

## 常见问题排查

### 1. 课程不显示
- 检查 `courses` 集合是否有数据
- 检查 `status` 字段是否为 `published`
- 检查 `sourceId` 是否匹配

### 2. 登录失败
- 检查 `login` 云函数是否部署
- 检查 HTTP 路由配置
- 检查手机号验证码配置

### 3. 订单创建失败
- 检查 `orders` 集合权限
- 检查 `api-order` 云函数
