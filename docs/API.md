# 📡 API 参考文档

## 概述

本系统使用 **CloudBase JS SDK** 进行后端交互，主要通过以下服务进行数据操作：

| 服务 | 用途 | SDK 方法 |
|------|------|----------|
| 数据库 | 数据 CRUD | `app.database()` |
| 存储 | 文件上传下载 | `app.uploadFile()` |
| 认证 | 用户登录注册 | `app.auth()` |

## 初始化

```typescript
// src/utils/cloudbase.ts
import cloudbase from '@cloudbase/js-sdk';

const app = cloudbase.init({
  env: import.meta.env.VITE_ENV_ID,
  region: 'ap-shanghai',
});

export default app;
```

## 认证服务 (authService.ts)

### 用户登录

```typescript
// 匿名登录
const user = await auth.signInAnonymously();

// 手机号登录
await auth.signInWithPhoneNumber(phone, code);

// 密码登录
await auth.signInWithUsernameAndPassword(username, password);
```

### 获取用户信息

```typescript
const user = auth.currentUser;
if (user) {
  const info = await user.getUserInfo();
  console.log(info);
}
```

## 课程服务 (courseService.ts)

### 获取课程列表

```typescript
// 获取所有课程
const courses = await courseService.getCourses({
  category?: string,    // 分类筛选
  status?: 'published',  // 状态筛选
  page?: 1,             // 页码
  pageSize?: 20,         // 每页数量
});

// 获取热门课程
const featured = await courseService.getFeaturedCourses();

// 搜索课程
const results = await courseService.searchCourses('无人机');
```

### 获取课程详情

```typescript
const course = await courseService.getCourseById(courseId);
const chapters = await courseService.getChapters(courseId);
const lessons = await courseService.getLessons(courseId);
```

### 管理课程

```typescript
// 创建课程
const newCourse = await courseService.createCourse({
  title: '无人机基础理论',
  price: 2999,
  category: 'certificate',
});

// 更新课程
await courseService.updateCourse(courseId, {
  title: '无人机高级飞行',
  price: 3999,
});

// 删除课程
await courseService.deleteCourse(courseId);
```

## 订单服务 (orderService.ts)

### 创建订单

```typescript
const order = await orderService.createOrder({
  courseId: 'course-123',
  amount: 2999,
  paymentMethod: 'wechat',
});
```

### 查询订单

```typescript
// 获取用户订单列表
const orders = await orderService.getOrders({
  userId: 'user-123',
  status?: 'paid',
  page: 1,
  pageSize: 20,
});

// 获取订单详情
const order = await orderService.getOrderById(orderId);
```

### 更新订单状态

```typescript
// 支付成功
await orderService.updateOrderStatus(orderId, 'paid');

// 取消订单
await orderService.cancelOrder(orderId);
```

## 教师服务 (teacherService.ts)

### 获取教师列表

```typescript
const teachers = await teacherService.getTeachers({
  status?: 'active',
  page: 1,
  pageSize: 20,
});
```

### 管理教师

```typescript
// 创建教师
await teacherService.createTeacher({
  name: '张教员',
  phone: '13800138000',
  certifications: ['AOPA证书', '教官证'],
  specialty: ['理论教学', '实操训练'],
});

// 更新教师
await teacherService.updateTeacher(teacherId, {
  bio: '10年教学经验',
});
```

## 排课服务 (scheduleService.ts)

### 创建排课

```typescript
await scheduleService.createSchedule({
  courseId: 'course-123',
  teacherId: 'teacher-456',
  title: '周末飞行训练',
  startTime: '2026-04-10T09:00:00Z',
  endTime: '2026-04-10T17:00:00Z',
  location: '训练基地A',
  maxStudents: 20,
});
```

### 查询排课

```typescript
// 获取课程排课
const schedules = await scheduleService.getSchedulesByCourse(courseId);

// 获取教师排课
const teacherSchedules = await scheduleService.getSchedulesByTeacher(teacherId);

// 获取日期范围内排课
const schedules = await scheduleService.getSchedulesByDateRange(
  '2026-04-01',
  '2026-04-30'
);
```

## 出勤服务 (attendanceService.ts)

### 记录出勤

```typescript
await attendanceService.recordAttendance({
  scheduleId: 'schedule-123',
  studentId: 'student-456',
  status: 'present',  // present | absent | late
  checkInTime: new Date().toISOString(),
});
```

### 查询出勤

```typescript
// 按排课查询
const records = await attendanceService.getAttendanceBySchedule(scheduleId);

// 按学员查询
const records = await attendanceService.getAttendanceByStudent(studentId);
```

## 考试服务 (examService.ts)

### 创建考试

```typescript
await examService.createExam({
  courseId: 'course-123',
  title: '无人机理论考试',
  duration: 120,      // 分钟
  passScore: 60,
  questionCount: 50,
  attempts: 3,         // 允许次数
});
```

### 获取考试

```typescript
const exams = await examService.getExams({
  courseId: 'course-123',
  status: 'published',
});

// 获取考试详情（含题目）
const exam = await examService.getExamWithQuestions(examId);
```

### 提交考试

```typescript
const result = await examService.submitExam(examId, {
  answers: [
    { questionId: 'q1', answer: 'A' },
    { questionId: 'q2', answer: ['A', 'C'] },
  ],
  duration: 95,
});
```

## 题库服务

### 创建题库

```typescript
// src/services/questionBankService.ts
await questionBankService.createBank({
  name: '无人机法规题库',
  category: 'regulation',
  description: 'AOPA 法规考试题库',
});
```

### 添加题目

```typescript
await questionBankService.createQuestion({
  bankId: 'bank-123',
  type: 'single',  // single | multiple | judge | fill | essay
  content: '无人机飞行前需要做什么？',
  options: [
    '检查电池电量',
    '检查螺旋桨',
    '检查遥控器信号',
    '以上全部',
  ],
  answer: 'D',
  difficulty: 'medium',
});
```

### 批量导入题目

```typescript
// JSON 格式
await questionBankService.importQuestions(bankId, questions, 'json');

// 文本格式
// [单选] 问题内容 | 选项A | 选项B | 选项C | 选项D | 答案
await questionBankService.importQuestions(bankId, textContent, 'text');
```

## 证书服务 (certificateService.ts)

### 创建证书

```typescript
await certificateService.createCertificate({
  userId: 'user-123',
  courseId: 'course-123',
  examId: 'exam-456',
  type: 'course_completion',
  title: '无人机飞行结业证书',
});
```

### 审核证书

```typescript
await certificateService.reviewCertificate(certId, {
  status: 'issued',
  issueDate: new Date().toISOString(),
  certificateNo: 'CERT-2026-0001',
});
```

## 优惠券服务 (couponService.ts)

### 创建优惠券

```typescript
await couponService.createCoupon({
  code: 'DRONE2026',
  type: 'percent',  // fixed | percent
  value: 15,        // 15% 折扣
  minAmount: 1000,  // 最低消费 1000 元
  maxDiscount: 200,  // 最高优惠 200 元
  totalCount: 100,
  validFrom: '2026-04-01',
  validTo: '2026-04-30',
});
```

### 使用优惠券

```typescript
const result = await couponService.useCoupon(code, orderId);
```

## 轮播图服务 (bannerService.ts)

### 管理轮播图

```typescript
// 创建
await bannerService.createBanner({
  title: '春季特惠',
  image: 'https://...',
  link: '/courses/123',
  order: 1,
  status: 'active',
});

// 更新
await bannerService.updateBanner(id, { order: 2 });

// 批量更新排序
await bannerService.reorderBanners([{ id: '1', order: 1 }, ...]);
```

## 数据库操作 (database.ts)

### 基础 CRUD

```typescript
import { getDatabase } from './database';

// 查询
const result = await getDatabase()
  .collection('courses')
  .where({ status: 'published' })
  .orderBy('createdAt', 'desc')
  .skip(0)
  .limit(20)
  .get();

// 查询单条
const course = await getDatabase()
  .collection('courses')
  .doc(courseId)
  .get();

// 创建
await getDatabase()
  .collection('courses')
  .add({
    title: '新课程',
    price: 2999,
    createdAt: new Date(),
  });

// 更新
await getDatabase()
  .collection('courses')
  .doc(courseId)
  .update({
    title: '更新后的标题',
    updatedAt: new Date(),
  });

// 删除
await getDatabase()
  .collection('courses')
  .doc(courseId)
  .remove();
```

### 聚合查询

```typescript
// 统计课程数量
const count = await getDatabase()
  .collection('courses')
  .count();

// 分页
const result = await getDatabase()
  .collection('orders')
  .where({ userId: 'user-123' })
  .orderBy('createdAt', 'desc')
  .getPaged({
    size: 20,
    current: 1,
  });
```

## 存储服务 (storageService.ts)

### 上传文件

```typescript
import { uploadFile } from './services/storageService';

const result = await uploadFile(file, {
  cloudPath: `courses/${courseId}/cover.jpg`,
  onProgress: (progress) => {
    console.log(`上传进度: ${progress}%`);
  },
});

console.log(result.fileID);  // 云存储文件 ID
```

### 获取临时链接

```typescript
import { getTempFileURL } from './services/storageService';

const url = await getTempFileURL(fileIds);
```

## 错误处理

### 统一错误格式

```typescript
interface ApiError {
  code: string;       // 错误码
  message: string;    // 错误信息
  details?: any;      // 详细信息
}

// 示例错误处理
try {
  await courseService.getCourseById(id);
} catch (error: any) {
  if (error.code === 'DATABASE_PERMISSION_DENIED') {
    // 权限不足
  } else if (error.code === 'DATABASE_NOT_FOUND') {
    // 资源不存在
  } else {
    // 其他错误
  }
}
```

### 常见错误码

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| `DATABASE_PERMISSION_DENIED` | 权限不足 | 检查安全规则或重新登录 |
| `DATABASE_NOT_FOUND` | 资源不存在 | 检查 ID 是否正确 |
| `DATABASE_REQUEST_FAILED` | 请求失败 | 网络问题，重试 |
| `STORAGE_REQUEST_FAILED` | 存储请求失败 | 检查文件是否存在 |
| `AUTH_INVALID_TICKET` | 登录凭证无效 | 重新登录 |

---

**最后更新**: 2026-04-05
