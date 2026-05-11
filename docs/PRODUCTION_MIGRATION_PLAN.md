# 生产级别数据修复方案

## 一、修复目标

### 1.1 功能需求清单

从功能出发，确定需要支持的数据查询：

| 功能场景 | 查询条件 | 需要字段 |
|---------|---------|---------|
| 按分类显示课程 | `WHERE sourceId=? AND categoryId=?` | courses.sourceId, courses.categoryId |
| 我的课程（按体系筛选） | `WHERE userId=? AND sourceId=?` | enrollments.sourceId |
| 权限校验 | `WHERE userId=? AND targetId=?` | course_permissions.sourceId |
| 按体系统计营收 | `WHERE sourceId=?` | orders.sourceId |
| 支付记录关联 | `WHERE sourceId=?` | payments.sourceId |

---

## 二、统一 ID 规范

```
sourceId:    "CAAC" | "RENSHE" | "NATIONAL_DEFENSE"
categoryId:  "{SOURCE}:{CODE}" 例如: "CAAC:MULTI_ROTOR", "RENSHE:DRONE"
```

---

## 三、ID 映射表

### 3.1 sources

| 当前 _id | 统一后 _id | name |
|---------|-----------|------|
| `e35392d069fc521f0152e2c2537e32ad` | **CAAC** | CAAC民航局 |
| `RENSHE` | **RENSHE** | 人社培训 |

### 3.2 categories

#### CAAC

| 当前 _id | 统一后 _id | sourceId |
|---------|-----------|----------|
| `ae0498ca69fc52380151cf9344ba694d` | **CAAC:MULTI_ROTOR** | CAAC |
| `ae0498ca69fc52380151cf9416b82e7b` | **CAAC:FIXED_WING** | CAAC |
| `ae0498ca69fc52380151cf9549195c14` | **CAAC:HELICOPTER** | CAAC |
| `ae0498ca69fc52380151cf9623c7aaa9` | **CAAC:VTOL** | CAAC |

#### RENSHE

| 当前 _id | 统一后 _id | sourceId |
|---------|-----------|----------|
| `cat-drone` | **RENSHE:DRONE** | RENSHE |
| `cat-fixedwing` | **RENSHE:FIXED_WING** | RENSHE |
| `cat-helicopter` | **RENSHE:HELICOPTER** | RENSHE |

---

## 四、集合修复规格

### 4.1 P0 必须修复

| 集合 | 必须字段 |
|------|---------|
| sources | _id = code |
| categories | _id = "{SOURCE}:{CODE}", sourceId |
| courses | sourceId, categoryId |
| classes | sourceId, categoryId |

### 4.2 P1 用户层

| 集合 | 添加字段 |
|------|---------|
| enrollments | sourceId, categoryId, courseTitle |
| course_permissions | sourceId, categoryId, level |

### 4.3 P2 统计层

| 集合 | 添加字段 |
|------|---------|
| orders | sourceId, items[].sourceId |
| payments | sourceId |

---

## 五、迁移脚本

```javascript
// cloudfunctions/migrate-source-data/index.js

const SOURCE_MAP = {
  'e35392d069fc521f0152e2c2537e32ad': 'CAAC'
};

const CAAC_CAT_MAP = {
  'ae0498ca69fc52380151cf9344ba694d': 'CAAC:MULTI_ROTOR',
  'ae0498ca69fc52380151cf9416b82e7b': 'CAAC:FIXED_WING',
  'ae0498ca69fc52380151cf9549195c14': 'CAAC:HELICOPTER',
  'ae0498ca69fc52380151cf9623c7aaa9': 'CAAC:VTOL'
};

const RENSHE_CAT_MAP = {
  'cat-drone': 'RENSHE:DRONE',
  'cat-fixedwing': 'RENSHE:FIXED_WING',
  'cat-helicopter': 'RENSHE:HELICOPTER'
};

exports.main = async (event, context) => {
  const { action } = event;
  
  if (action === 'migrate') {
    // 1. 迁移 sources
    await db.collection('sources').where({ _id: 'e35392d069fc521f0152e2c2537e32ad' }).update({
      data: { _id: 'CAAC', code: 'CAAC', name: 'CAAC民航局', levels: ['视距内驾驶员', '超视距驾驶员', '教员'] }
    });
    
    // 2. 迁移 categories
    for (const [oldId, newId] of Object.entries({...CAAC_CAT_MAP, ...RENSHE_CAT_MAP})) {
      await db.collection('categories').where({ _id: oldId }).update({
        data: { _id: newId, sourceId: newId.split(':')[0], oldId }
      });
    }
    
    // 3. 迁移 courses
    const courses = await db.collection('courses').get();
    for (const c of courses.data) {
      const updates = {};
      if (c.sourceId && SOURCE_MAP[c.sourceId]) updates.sourceId = SOURCE_MAP[c.sourceId];
      if (c.categoryId && CAAC_CAT_MAP[c.categoryId]) updates.categoryId = CAAC_CAT_MAP[c.categoryId];
      if (c.categoryId && RENSHE_CAT_MAP[c.categoryId]) updates.categoryId = RENSHE_CAT_MAP[c.categoryId];
      if (Object.keys(updates).length > 0) {
        await db.collection('courses').doc(c._id).update({ data: updates });
      }
    }
    
    // 4. 迁移 classes (同 courses)
    
    // 5. 回填 enrollments
    const enrollments = await db.collection('enrollments').get();
    for (const e of enrollments.data) {
      const course = await db.collection('courses').doc(e.courseId).get();
      if (course.data) {
        await db.collection('enrollments').doc(e._id).update({
          data: {
            sourceId: course.data.sourceId,
            categoryId: course.data.categoryId,
            courseTitle: course.data.title
          }
        });
      }
    }
    
    return { code: 0, message: '迁移完成' };
  }
  
  return { code: -1, message: '未知操作' };
};
```

---

## 六、代码修复

### 6.1 SourceService.ts

```typescript
// 删除回退查询，只用精确匹配
async getCourses(sourceId: string, options?: { categoryId?: string }) {
  const where: any = { sourceId };
  if (options?.categoryId) {
    where.categoryId = options.categoryId;  // 精确匹配
  }
  return await dbGetList('courses', { where });
}
```

### 6.2 保存时自动填充

```typescript
async saveCourse(data) {
  const category = await db.collection('categories').doc(data.categoryId).get();
  const saveData = {
    ...data,
    sourceId: category.data.sourceId,  // 自动填充
    categoryId: category.data._id
  };
  await db.collection('courses').add(saveData);
}
```

---

## 七、实施计划

| 阶段 | 内容 | 预计时间 |
|------|------|---------|
| Phase 1 | 备份数据 | 10分钟 |
| Phase 2 | 执行迁移 | 30分钟 |
| Phase 3 | 数据验证 | 20分钟 |
| Phase 4 | 代码修复 | 1天 |
| Phase 5 | 功能测试 | 1天 |
| **总计** | | **约2天** |

---

## 八、验证清单

- [ ] sources._id 格式正确
- [ ] categories._id 格式正确 (CAAC:MULTI_ROTOR)
- [ ] courses.sourceId 和 categoryId 正确
- [ ] CAAC 多旋翼页面只显示多旋翼课程
- [ ] 切换体系后数据正确
