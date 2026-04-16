# 数据库字段检查报告

## 检查时间
2025年3月23日

## 数据库集合清单

### 核心集合
| 集合名 | 用途 | 字段数量 | 状态 |
|-------|------|---------|------|
| `courses` | 课程信息 | 15+ | ✅ 正常 |
| `exams` | 试卷信息 | 10+ | ✅ 正常 |
| `questionBanks` | 题库信息 | 8+ | ✅ 正常 |
| `users` | 用户信息 | 12+ | ✅ 正常 |
| `orders` | 订单信息 | 10+ | ✅ 正常 |
| `enrollments` | 报名记录 | 8+ | ✅ 正常 |

### 扩展集合
| 集合名 | 用途 | 状态 |
|-------|------|------|
| `teachers` | 教师信息 | ✅ 正常 |
| `students` | 学员信息 | ✅ 正常 |
| `schedules` | 排课信息 | ✅ 正常 |
| `attendance` | 出勤记录 | ✅ 正常 |
| `certificates` | 证书信息 | ✅ 正常 |
| `coupons` | 优惠券 | ✅ 正常 |
| `banners` | 轮播图 | ✅ 正常 |
| `practiceRecords` | 练习记录 | ✅ 正常 |
| `chapters` | 课程章节 | ✅ 正常 |

## 发现的字段名问题

### 1. 集合名称不一致（已修复）

#### questionBanks
| 问题 | 代码中使用 | 数据库实际 | 修复方式 |
|-----|-----------|-----------|---------|
| 命名规范 | `question_banks` | `questionBanks` | 统一改为驼峰命名 |

**影响文件**:
- `/src/services/CloudAdminService.ts`
- `/src/services/CloudPracticeService.ts`

#### practiceRecords
| 问题 | 代码中使用 | 数据库实际 | 修复方式 |
|-----|-----------|-----------|---------|
| 命名规范 | `practice_records` | `practiceRecords` | 统一改为驼峰命名 |

**影响文件**:
- `/src/services/CloudAdminService.ts`

### 2. 字段命名规范

#### 用户集合 (users)
```typescript
// 标准字段
{
  _id: string;           // 用户ID
  openid: string;        // 微信OpenID
  name: string;          // 用户姓名
  phone?: string;        // 手机号
  email?: string;        // 邮箱
  avatar?: string;       // 头像URL
  role: string;          // 角色
  createdAt: string;     // 创建时间
  updatedAt: string;     // 更新时间
}
```

#### 课程集合 (courses)
```typescript
// 标准字段
{
  _id: string;           // 课程ID
  title: string;         // 课程标题
  description: string;   // 课程描述
  coverImage: string;    // 封面图
  category: string;      // 分类
  price: number;         // 价格
  originalPrice?: number; // 原价
  teacherId: string;     // 教师ID
  teacherName?: string;  // 教师姓名
  duration: number;      // 时长（小时）
  lessons: number;       // 课时数
  level: string;         // 难度级别
  tags: string[];        // 标签
  status: string;        // 状态
  salesCount: number;    // 销量
  rating: number;        // 评分
  reviewCount: number;   // 评价数
}
```

#### 订单集合 (orders)
```typescript
// 标准字段
{
  _id: string;           // 订单ID
  userId: string;        // 用户ID
  orderNo: string;       // 订单号
  items: CartItem[];     // 订单项
  totalAmount: number;   // 总金额
  discountAmount: number; // 优惠金额
  finalAmount: number;   // 实付金额
  paymentMethod: string; // 支付方式
  status: string;        // 订单状态
  paymentAt?: string;    // 支付时间
  createdAt: string;     // 创建时间
}
```

## 字段名规范建议

### 命名规则
1. **集合名**: 使用驼峰命名法（如 `questionBanks`）
2. **字段名**: 使用驼峰命名法（如 `createdAt`）
3. **ID字段**: 
   - 主键使用 `_id`
   - 外键使用 `{entity}Id`（如 `userId`, `courseId`）
4. **时间字段**:
   - 创建时间: `createdAt`
   - 更新时间: `updatedAt`
   - 删除时间: `deletedAt`（软删除）
5. **状态字段**: 使用 `status` 作为字段名，值为小写字符串

### 常用字段模板
```typescript
// 基础字段（所有集合都应包含）
interface BaseEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;  // 创建者ID
  updatedBy?: string;  // 更新者ID
}

// 软删除支持
interface SoftDeletable {
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

// 状态管理
interface StatusEntity {
  status: 'active' | 'inactive' | 'pending' | 'archived';
}
```

## 数据类型检查

### 类型一致性
| 字段 | 期望类型 | 实际类型 | 状态 |
|-----|---------|---------|------|
| `_id` | string | string | ✅ |
| `price` | number | number | ✅ |
| `createdAt` | ISO Date string | ISO Date string | ✅ |
| `tags` | string[] | string[] | ✅ |
| `status` | enum string | string | ⚠️ 需约束 |

## 索引建议

### 高频查询字段（建议添加索引）
```javascript
// users 集合
db.users.createIndex({ "phone": 1 }, { unique: true })
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "role": 1 })

// courses 集合
db.courses.createIndex({ "status": 1 })
db.courses.createIndex({ "category": 1 })
db.courses.createIndex({ "teacherId": 1 })

// orders 集合
db.orders.createIndex({ "userId": 1 })
db.orders.createIndex({ "orderNo": 1 }, { unique: true })
db.orders.createIndex({ "status": 1 })

// exams 集合
db.exams.createIndex({ "status": 1 })
db.exams.createIndex({ "courseId": 1 })
```

## 检查结论

### 已修复问题
1. ✅ 集合名称不一致（`question_banks` → `questionBanks`）
2. ✅ 集合名称不一致（`practice_records` → `practiceRecords`）
3. ✅ 安全规则更新（exams, questionBanks）

### 无需修复
- 所有集合的字段命名基本规范
- 数据类型一致性良好

### 建议优化
- 添加高频查询字段的索引
- 规范状态字段的枚举值
- 考虑添加软删除支持

## 相关文件

- 服务层: `/src/services/*.ts`
- 类型定义: `/src/types/index.ts`
- 数据库配置: `/cloudfunctions/admin/index.js`
