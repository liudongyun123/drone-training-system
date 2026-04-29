# 无人机培训系统 - 重构方案

## 一、业务模型

### 核心业务流程

```
方式A：先买线上课程，后续再报培训班
购买课程 → 理论学习 → 报名培训班

方式B：直接报名培训班（含线上课程）
报名培训班(线上/线下缴费) → 自动获得线上课程 → 理论+实操 → 考证 → 证书
```

### 关键业务规则

| 规则 | 说明 |
|------|------|
| 报名培训班 = 自动获得线上课程 | 报名成功自动授权对应课程 |
| 线上缴费 | 微信支付，自动确认 |
| 线下缴费 | 管理员录入，手动确认 |
| 课程独立购买 | 可单独买课程，不报培训班 |

---

## 二、技术架构

### 三端分离

| 端 | 技术 | 位置 |
|----|------|------|
| Web 前台 | React（响应式） | `src/web/` |
| Web 后台 | React（懒加载） | `src/admin/` |
| 微信小程序 | 原生 WXML/TS | `miniprogram/` |

### 共用层（地下室）

```
src/shared/
├── types/           # 类型定义（所有端共用）
├── services/        # API 调用（所有端共用）
└── hooks/           # 业务逻辑（React 端共用）
```

---

## 三、功能模块

### 前台用户端

```
src/web/pages/
├── learning/        # 线上学习
├── training/        # 线下培训（核心：报名、排课）
├── practice/        # 练习/考试
├── certificate/     # 证书
├── account/         # 账户
└── home/            # 首页
```

### 后台管理端

```
src/admin/pages/
├── classes/         # 培训班管理（核心）
├── courses/         # 课程管理
├── exams/           # 考试管理
├── certificates/    # 证书管理
├── users/           # 用户管理
├── orders/          # 订单财务
├── marketing/       # 营销管理
└── system/          # 系统管理
```

---

## 四、核心数据模型

### 培训班（TrainingClass）

```typescript
interface TrainingClass {
  _id: string
  name: string
  includedCourses: string[]  // 报名即获得的课程
  teacherId: string
  maxStudents: number
  price: number
  startDate: string
  endDate: string
  location: string
  status: 'draft' | 'enrolling' | 'ongoing' | 'finished'
}
```

### 报名记录（Enrollment）

```typescript
interface Enrollment {
  _id: string
  classId: string
  userId: string
  paymentMethod: 'online' | 'offline'
  paymentStatus: 'pending' | 'paid' | 'confirmed'
  grantedCourses: string[]   // 已授权课程
  status: 'pending' | 'confirmed' | 'cancelled'
}
```

---

## 五、执行计划

| 阶段 | 内容 | 时间 | 状态 |
|------|------|------|------|
| 第1步 | 建地下室 + 类型收拢 | 2-3天 | 待执行 |
| 第2步 | API 层统一 | 2-3天 | - |
| 第3步 | Hooks 提取 | 2-3天 | - |
| 第4步 | Web 端页面迁移 | 5-7天 | - |
| 第5步 | 后台页面迁移 | 3-5天 | - |
| 第6步 | 小程序项目搭建 | 10-14天 | - |
| 第7步 | 大组件拆分 | 3-5天 | - |
| 第8步 | 测试 + 上线 | 3-5天 | - |

**总计：4-6 周**

---

## 六、安全保障

- Git 每步提交，随时回滚
- 每步构建验证
- 渐进迁移，新旧共存
- 不删旧代码，标记废弃

---

创建时间：2026-04-29
确认人：红包