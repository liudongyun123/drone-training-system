# 数据库数据流向分析

## 📊 数据流架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                         用户浏览器                                 │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    React 应用 (Claw)                       │   │
│  │   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │   │
│  │   │ 页面组件 │──▶│  Store  │──▶│ Service │──▶│ CloudBase│  │   │
│  │   │ Pages   │◀──│ Zustand │◀──│ Services│◀──│   SDK  │  │   │
│  │   └─────────┘   └─────────┘   └─────────┘   └─────────┘  │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ HTTPS API
┌──────────────────────────────────────────────────────────────────┐
│                        CloudBase 云开发                            │
│  ┌──────────────────┐    ┌──────────────────┐                     │
│  │   NoSQL 数据库    │    │    云函数 admin   │                     │
│  │  courses         │    │  ├── count()     │                     │
│  │  members         │    │  ├── list()       │                     │
│  │  orders          │    │  ├── create()     │                     │
│  │  exams           │    │  ├── update()     │                     │
│  │  teachers        │    │  └── delete()     │                     │
│  └──────────────────┘    └──────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 四层调用链路

### 1️⃣ SDK 初始化 (第1层)

```typescript
// src/utils/cloudbase.ts
const app = cloudbase.init({
  env: "rcwljy-5ghmq2ex26764978",
  accessKey: "eyJ...",
  auth: { persistence: "local" }
});
export { app };
```

### 2️⃣ Service 服务层 (第2层) - 38个服务文件

| 服务文件 | 操作集合 |
|----------|----------|
| `CloudCourseService.ts` | courses |
| `CloudOrderService.ts` | orders |
| `membersService.ts` | members, enrollments |
| `examService.ts` | exams, questions |
| `teacherService.ts` | teachers |
| `database.ts` | 通用 CRUD |

```typescript
// 调用示例: CloudCourseService.ts
async getAll(): Promise<Course[]> {
  return await app.database()
    .collection('courses')    // ① 选择集合
    .where({ status: 'published' })
    .limit(20)
    .get();                    // ② 执行查询
}
```

### 3️⃣ Store 状态层 (第3层) - Zustand

```typescript
// src/store/courseStore.ts
const useCourseStore = create((set) => ({
  courses: [],
  loading: false,
  
  fetchCourses: async () => {
    set({ loading: true });
    const courses = await CloudCourseService.getAll();
    set({ courses, loading: false });
  }
}));
```

### 4️⃣ Component 组件层 (第4层)

```typescript
// 页面中使用
function CoursePage() {
  const { courses, fetchCourses } = useCourseStore();
  
  useEffect(() => {
    fetchCourses();  // 调用 Store → Service → CloudBase SDK
  }, []);
  
  return courses.map(c => <CourseCard course={c} />);
}
```

---

## 📁 核心文件位置

```
Claw/src/
├── utils/
│   └── cloudbase.ts      ← SDK 初始化 (第1层)
├── services/            ← 38个服务文件 (第2层)
│   ├── CloudCourseService.ts
│   ├── CloudOrderService.ts
│   ├── membersService.ts
│   ├── examService.ts
│   ├── database.ts      ← 通用 CRUD
│   └── ...
├── store/               ← Zustand 状态 (第3层)
│   ├── authStore.ts
│   ├── courseStore.ts
│   └── ...
└── pages/               ← React 组件 (第4层)
    ├── HomePage.tsx
    ├── CoursePage.tsx
    └── ...
```

---

## 🗄️ 数据库集合清单

| 集合名 | 说明 | 主要字段 |
|--------|------|----------|
| courses | 课程 | title, price, coverImage |
| chapters | 章节 | courseId, title, videoUrl |
| members | 会员 | name, phone, source |
| enrollments | 报名记录 | memberId, classId |
| orders | 订单 | courseId, amount, status |
| exams | 考试 | title, duration, passScore |
| questions | 题库 | type, question, answer |
| teachers | 教师 | name, specialty, avatar |
| certificates | 证书 | userId, courseId |
| schedules | 排课 | courseId, startTime |
| banners | 轮播图 | title, imageUrl |
| notices | 公告 | title, content |

---

## 🔍 诊断工具

访问诊断页面查看数据流状态：
```
/diagnose.html
```

检查项：
1. ✅ 环境配置
2. ✅ SDK 初始化
3. ✅ 匿名登录
4. ✅ 数据库连接
5. ✅ 数据读取
