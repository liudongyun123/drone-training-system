# 体系配置数据迁移指南

## 概述

本次改造新增了 `levels` 集合来管理等级数据，现有课程和班级数据需要迁移以关联到新的等级体系。

## 等级映射关系

### 人社培训体系 (RENSHE)
| 旧代码 | 新代码 | 等级名称 |
|--------|--------|----------|
| beginner | beginner | 初级工 |
| basic | basic | 中级工 |
| intermediate | intermediate | 高级工 |
| advanced | advanced | 技师 |
| expert | expert | 高级技师 |

### CAAC培训体系 (CAAC)
| 旧代码 | 新代码 | 等级名称 |
|--------|--------|----------|
| vlos | vlos | 视距内驾驶员 |
| beyond | beyond | 超视距驾驶员 |
| instructor | instructor | 教员 |

## 数据迁移步骤

### 步骤 1: 初始化等级数据

执行以下 CloudBase 控制台命令初始化 levels 集合：

```javascript
// levels 集合初始数据
[
  { code: "beginner", name: "初级工", sourceCode: "RENSHE", sortOrder: 1, status: "active" },
  { code: "basic", name: "中级工", sourceCode: "RENSHE", sortOrder: 2, status: "active" },
  { code: "intermediate", name: "高级工", sourceCode: "RENSHE", sortOrder: 3, status: "active" },
  { code: "advanced", name: "技师", sourceCode: "RENSHE", sortOrder: 4, status: "active" },
  { code: "expert", name: "高级技师", sourceCode: "RENSHE", sortOrder: 5, status: "active" },
  { code: "vlos", name: "视距内驾驶员", sourceCode: "CAAC", sortOrder: 1, status: "active" },
  { code: "beyond", name: "超视距驾驶员", sourceCode: "CAAC", sortOrder: 2, status: "active" },
  { code: "instructor", name: "教员", sourceCode: "CAAC", sortOrder: 3, status: "active" }
]
```

### 步骤 2: 迁移课程数据

为现有课程添加 `sourceId` 和 `levelCode` 字段：

```javascript
// 伪代码示例
const courses = db.collection('courses').get()
const sources = db.collection('sources').get()
const levels = db.collection('levels').get()

for (course of courses) {
  // 根据课程现有分类推断体系
  if (course.category?.includes('CAAC')) {
    course.sourceId = sources.find(s => s.code === 'CAAC')._id
  } else {
    course.sourceId = sources.find(s => s.code === 'RENSHE')._id
  }
  
  // 根据 level 字段匹配等级
  if (course.level) {
    const level = levels.find(l => l.code === course.level || l.name === course.level)
    if (level) {
      course.levelCode = level.code
      course.levelId = level._id
    }
  }
  
  db.collection('courses').doc(course._id).update(course)
}
```

### 步骤 3: 迁移班级数据

为现有班级添加 `sourceId` 和 `levelCode` 字段：

```javascript
// 伪代码示例
const classes = db.collection('classes').get()

for (cls of classes) {
  // 根据班级名称推断体系
  if (cls.name?.includes('CAAC')) {
    cls.sourceId = sources.find(s => s.code === 'CAAC')._id
  } else {
    cls.sourceId = sources.find(s => s.code === 'RENSHE')._id
  }
  
  // 根据 level 字段匹配等级
  if (cls.level) {
    const level = levels.find(l => l.code === cls.level || l.name === cls.level)
    if (level) {
      cls.levelCode = level.code
      cls.levelId = level._id
    }
  }
  
  db.collection('classes').doc(cls._id).update(cls)
}
```

### 步骤 4: 验证迁移结果

检查迁移后的数据：

```javascript
// 检查课程
const courses = db.collection('courses')
  .field({ title: true, level: true, sourceId: true, levelCode: true })
  .limit(10)
  .get()

// 检查班级
const classes = db.collection('classes')
  .field({ name: true, level: true, sourceId: true, levelCode: true })
  .limit(10)
  .get()
```

## 兼容性说明

系统已做兼容性处理：

1. **旧数据兼容**: 如果课程/班级没有 `sourceId` 字段，会显示所有分类和等级
2. **旧等级兼容**: 如果无法匹配到 `levels` 集合中的等级，会直接显示原有的 level 值
3. **新增数据**: 通过管理后台新增的课程/班级必须选择体系，会自动关联到选定的等级

## 回滚方案

如需回滚，删除以下新增字段：
- `courses.sourceId`
- `courses.levelCode`
- `courses.levelId`
- `classes.sourceId`
- `classes.levelCode`
- `classes.levelId`
