# 体系数据结构统一规范

## 一、问题现状

### 1.1 当前混乱的数据结构

| 项目 | CAAC 民航局 | RENSHE 人社部 | 问题 |
|------|------------|--------------|------|
| 分类ID | `_id: "ae0498ca69fc52380151cf9344ba694d"` | `id: "cat-drone"` | 字段名和格式都不统一 |
| 分类code | `code: "MULTI_ROTOR"` | `code: "cat-drone"` | 重复且不一致 |
| 课程categoryId | 32位hash | 简化字符串 | 无法关联 |
| sourceId | 32位hash | "RENSHE" | 格式不统一 |
| 查询方式 | 只查 `_id` | 模糊匹配多字段 | 查询逻辑混乱 |

### 1.2 导致的问题

1. **分类匹配失败**：课程和分类使用不同的ID格式，无法正确关联
2. **跨体系数据污染**：查询时未正确区分体系，导致数据显示错误
3. **代码维护困难**：每处查询都要写兼容逻辑

---

## 二、目标：统一数据结构

### 2.1 统一的数据模型

```typescript
// ========== sources 集合 ==========
interface Source {
  _id: string;           // 固定格式: "{CODE}" 例如: "CAAC", "RENSHE"
  code: string;          // 同 _id，兼容查询
  name: string;           // 显示名称: "CAAC民航局", "人社培训"
  icon?: string;
  description?: string;
  status: 'active' | 'disabled';
  sortOrder: number;
  levels: string[];       // 该体系的等级序列
}

// ========== categories 集合 ==========
interface Category {
  _id: string;           // 固定格式: "{SOURCE_ID}:{CODE}" 例如: "CAAC:MULTI_ROTOR", "RENSHE:DRONE"
  sourceId: string;      // 指向 sources._id，例如: "CAAC", "RENSHE"
  code: string;          // 分类代码: "MULTI_ROTOR", "DRONE", "FIXED_WING"
  name: string;          // 显示名称: "多旋翼", "固定翼"
  description?: string;
  icon?: string;
  coverImage?: string;
  status: 'active' | 'disabled';
  sortOrder: number;
}

// ========== courses 集合 ==========
interface Course {
  _id: string;
  title: string;
  description?: string;
  coverImage?: string;
  price: number;
  originalPrice?: number;
  
  // 关联字段（关键）
  sourceId: string;      // 必须: "CAAC", "RENSHE"
  categoryId: string;     // 必须: "CAAC:MULTI_ROTOR", "RENSHE:DRONE"
  
  // 等级字段
  level: string;          // 等级值: "视距内驾驶员", "初级工"
  levelText?: string;     // 冗余显示
  
  // 状态
  status: 'published' | 'draft' | 'disabled';
  
  // 统计
  salesCount?: number;
  rating?: number;
  reviewCount?: number;
  lessonCount?: number;
  
  // 教师
  teacherId?: string;
  instructor?: string;
  
  // 时间
  createdAt: string;
  updatedAt: string;
}

// ========== classes 集合 ==========
interface TrainingClass {
  _id: string;
  name: string;
  description?: string;
  coverImage?: string;
  price: number;
  
  // 关联字段（关键）
  sourceId: string;      // 必须: "CAAC", "RENSHE"
  categoryId: string;     // 必须: "CAAC:MULTI_ROTOR", "RENSHE:DRONE"
  
  // 等级字段
  level: string;
  levelText?: string;
  
  // 培训班信息
  maxStudents?: number;
  enrolledStudents?: number;
  startDate?: string;
  endDate?: string;
  location?: string;
  schedule?: string;
  
  // 状态
  status: 'enrolling' | 'ongoing' | 'ended' | 'disabled';
  
  // 教师
  teacherId?: string;
  teacherName?: string;
  
  // 时间
  createdAt: string;
  updatedAt: string;
}
```

---

## 三、迁移方案

### 3.1 创建迁移云函数

```javascript
// cloudfunctions/migrate-source-data/index.js

const SOURCES = {
  CAAC: {
    code: 'CAAC',
    name: 'CAAC民航局',
    levels: ['视距内驾驶员', '超视距驾驶员', '教员']
  },
  RENSHE: {
    code: 'RENSHE',
    name: '人社培训',
    levels: ['初级工', '中级工', '高级工', '技师', '高级技师']
  }
};

const CAAC_CATEGORIES = [
  { oldId: 'ae0498ca69fc52380151cf9344ba694d', code: 'MULTI_ROTOR', name: '多旋翼' },
  { oldId: 'ae0498ca69fc52380151cf9416b82e7b', code: 'FIXED_WING', name: '固定翼' },
  { oldId: 'ae0498ca69fc52380151cf9549195c14', code: 'HELICOPTER', name: '直升机' },
  { oldId: 'ae0498ca69fc52380151cf9623c7aaa9', code: 'VTOL', name: '垂直起降固定翼' }
];

const RENSHE_CATEGORIES = [
  { oldId: 'cat-drone', code: 'DRONE', name: '多旋翼' },
  { oldId: 'cat-fixedwing', code: 'FIXED_WING', name: '固定翼' },
  { oldId: 'cat-helicopter', code: 'HELICOPTER', name: '直升机' },
  { oldId: 'cat-vtol', code: 'VTOL', name: '垂直起降固定翼' },
  { oldId: 'cat-assembly', code: 'ASSEMBLY', name: '无人机装配调试' },
  { oldId: 'cat-mapping', code: 'MAPPING', name: '无人机测绘应用' },
  { oldId: 'cat-agriculture', code: 'AGRICULTURE', name: '无人机农业应用' }
];

// 生成新的 categoryId
function getNewCategoryId(sourceId, code) {
  return `${sourceId}:${code}`;
}

// 迁移 categories
async function migrateCategories() {
  const db = cloud.database();
  const results = [];
  
  // 迁移 CAAC
  for (const cat of CAAC_CATEGORIES) {
    const newId = getNewCategoryId('CAAC', cat.code);
    await db.collection('categories').where({ _id: cat.oldId }).update({
      data: {
        _id: newId,
        sourceId: 'CAAC',
        code: cat.code,
        status: 'active'
      }
    });
    results.push({ old: cat.oldId, new: newId });
  }
  
  // 迁移 RENSHE
  for (const cat of RENSHE_CATEGORIES) {
    const newId = getNewCategoryId('RENSHE', cat.code);
    await db.collection('categories').where({ id: cat.oldId }).update({
      data: {
        _id: newId,
        sourceId: 'RENSHE',
        id: cat.oldId, // 保留旧字段
        code: cat.code,
        status: 'active'
      }
    });
    results.push({ old: cat.oldId, new: newId });
  }
  
  return results;
}

// 迁移 courses
async function migrateCourses(categoryMapping) {
  const db = cloud.database();
  
  // 查询所有课程
  const courses = await db.collection('courses').get();
  
  for (const course of courses.data) {
    // 查找对应的旧 categoryId
    const oldCatId = course.categoryId;
    const newCatId = categoryMapping[oldCatId];
    
    if (newCatId) {
      await db.collection('courses').doc(course._id).update({
        data: {
          categoryId: newCatId,
          sourceId: newCatId.split(':')[0]
        }
      });
    }
  }
}

// 迁移 classes (类似逻辑)
```

---

## 四、新的统一查询API

### 4.1 SourceService.ts 统一查询

```typescript
export const SourceService = {
  // 统一的查询配置
  QUERY_FIELDS: {
    sourceId: 'sourceId',      // 体系ID
    categoryId: 'categoryId',   // 分类ID (新格式: "CAAC:MULTI_ROTOR")
    level: 'level',
    status: 'status'
  },
  
  // 按体系获取课程（精确匹配）
  async getCourses(sourceId: string, options?: {
    categoryId?: string;   // 新格式: "CAAC:MULTI_ROTOR"
    level?: string;
    status?: string;
  }) {
    const where: any = { sourceId };  // 必须包含 sourceId
    
    if (options?.categoryId) {
      where.categoryId = options.categoryId;  // 精确匹配
    }
    
    return await dbGetList('courses', { where, ... });
  },
  
  // 按体系获取分类（精确匹配）
  async getCategories(sourceId: string) {
    const where = { sourceId };  // 精确匹配 sourceId
    return await dbGetList('categories', { where });
  },
  
  // 获取学习路径（按分类）
  async getLearningPaths(sourceId: string) {
    // 1. 获取该体系的分类
    const categories = await this.getCategories(sourceId);
    
    // 2. 获取该体系的课程
    const courses = await this.getCourses(sourceId);
    
    // 3. 按 categoryId 分组
    const paths = categories.map(cat => ({
      ...cat,
      courses: courses.filter(c => c.categoryId === cat._id),
      courseCount: courses.filter(c => c.categoryId === cat._id).length
    }));
    
    return paths;
  }
};
```

---

## 五、实施步骤

### 5.1 第一阶段：数据结构迁移
1. [ ] 创建 `sources` 集合的标准化数据
2. [ ] 创建 `categories` 集合的标准化数据（使用统一ID格式）
3. [ ] 执行数据迁移脚本
4. [ ] 验证迁移结果

### 5.2 第二阶段：代码统一
1. [ ] 统一 SourceService.ts 的查询逻辑
2. [ ] 统一 learning-path.ts 的数据获取
3. [ ] 统一首页的体系切换逻辑
4. [ ] 更新所有管理后台的保存逻辑

### 5.3 第三阶段：测试验证
1. [ ] 测试 CAAC 体系的多旋翼页面
2. [ ] 测试 RENSHE 体系的多旋翼页面
3. [ ] 测试体系切换功能
4. [ ] 验证数据隔离是否正确

---

## 六、数据验证SQL

```sql
-- 验证分类ID格式
SELECT _id, sourceId, code, name FROM categories;

-- 验证课程关联
SELECT c._id, c.title, c.sourceId, c.categoryId, cat.name as categoryName
FROM courses c
LEFT JOIN categories cat ON c.categoryId = cat._id
WHERE c.sourceId = 'CAAC'
AND c.categoryId LIKE 'CAAC:%';

-- 统计每个分类的课程数量
SELECT cat._id, cat.name, COUNT(c._id) as courseCount
FROM categories cat
LEFT JOIN courses c ON c.categoryId = cat._id
GROUP BY cat._id;
```

---

## 七、最终数据结构

### 7.1 sources 集合
```json
[
  { "_id": "CAAC", "code": "CAAC", "name": "CAAC民航局", "levels": ["视距内驾驶员", "超视距驾驶员", "教员"], "status": "active" },
  { "_id": "RENSHE", "code": "RENSHE", "name": "人社培训", "levels": ["初级工", "中级工", "高级工", "技师", "高级技师"], "status": "active" },
  { "_id": "NATIONAL_DEFENSE", "code": "NATIONAL_DEFENSE", "name": "国防教育", "levels": ["一级", "二级", "三级"], "status": "active" }
]
```

### 7.2 categories 集合
```json
[
  { "_id": "CAAC:MULTI_ROTOR", "sourceId": "CAAC", "code": "MULTI_ROTOR", "name": "多旋翼", "status": "active" },
  { "_id": "CAAC:FIXED_WING", "sourceId": "CAAC", "code": "FIXED_WING", "name": "固定翼", "status": "active" },
  { "_id": "RENSHE:DRONE", "sourceId": "RENSHE", "code": "DRONE", "name": "多旋翼", "status": "active" },
  { "_id": "RENSHE:FIXED_WING", "sourceId": "RENSHE", "code": "FIXED_WING", "name": "固定翼", "status": "active" }
]
```

### 7.3 courses 集合
```json
[
  { "_id": "...", "title": "多旋翼视距内驾驶员培训", "sourceId": "CAAC", "categoryId": "CAAC:MULTI_ROTOR", "level": "视距内驾驶员" },
  { "_id": "...", "title": "多旋翼初级工培训", "sourceId": "RENSHE", "categoryId": "RENSHE:DRONE", "level": "初级工" }
]
```
