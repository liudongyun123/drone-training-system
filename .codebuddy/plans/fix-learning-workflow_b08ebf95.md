---
name: fix-learning-workflow
overview: 修复"继续学习"工作流的导航死循环问题，确保已购买用户能正确进入课程学习页面
todos:
  - id: fix-course-detail-page
    content: 修复 CourseDetailPage.tsx "开始学习"按钮导航路径
    status: completed
  - id: fix-my-learning-page
    content: 修复 MyLearningPage.tsx "继续学习"按钮导航路径（2处）
    status: completed
    dependencies:
      - fix-course-detail-page
  - id: fix-debug-page
    content: 修复 DebugMyLearning.tsx 测试跳转导航路径
    status: completed
    dependencies:
      - fix-my-learning-page
  - id: fix-profile-page
    content: 修复 ProfilePage.tsx 课程卡片导航路径
    status: completed
    dependencies:
      - fix-debug-page
  - id: fix-exam-page
    content: 修复 ExamPage.tsx 考试完成返回导航路径
    status: completed
    dependencies:
      - fix-profile-page
  - id: verify-compilation
    content: 验证所有文件编译无错误
    status: completed
    dependencies:
      - fix-exam-page
---

## 问题描述

"继续学习"和"开始学习"按钮点击后工作流错误，导航到错误页面。

## 问题分析

发现**导航路径错误**：

1. `CourseDetailPage.tsx` 第229行："开始学习"按钮导航到 `/course-detail/${course._id}`（当前购买页面），造成死循环
2. `MyLearningPage.tsx` 第126行："继续学习"导航到 `/course-detail/${courseId}`（购买页面），对已购买用户不正确
3. `DebugMyLearning.tsx` 第81行：测试跳转同样使用错误路径
4. `ProfilePage.tsx` 第99行：也存在同样问题
5. `ExamPage.tsx` 第189行：考试页面返回也使用错误路径

## 路由结构

- `/course-detail/:id` → `CourseDetailPage` - 课程详情/购买页
- `/courses/:id` → `CourseDetail` - 课程学习页（看视频、章节）

## 修复方案

将所有"开始学习"和"继续学习"的导航路径从 `/course-detail/${courseId}` 改为 `/courses/${courseId}`，确保已购买用户进入学习页面而非购买页面。

## 预期结果

- 已购买用户点击"开始学习"进入课程学习页面（可观看视频、查看章节）
- 已购买用户点击"继续学习"进入课程学习页面
- 未购买用户点击"立即购买"仍进入购买页面（`/course-detail/:id`）
- 所有导航逻辑正确区分购买和学习场景

## 技术方案

### 修改策略

统一修复所有错误的导航路径，将 `/course-detail/${courseId}` 改为 `/courses/${courseId}`

### 影响文件

1. `src/pages/CourseDetailPage.tsx` - "开始学习"按钮导航路径
2. `src/pages/MyLearningPage.tsx` - "继续学习"按钮导航路径（2处）
3. `src/pages/DebugMyLearning.tsx` - 测试跳转导航路径
4. `src/pages/ProfilePage.tsx` - 课程卡片点击导航路径
5. `src/pages/ExamPage.tsx` - 考试完成返回导航路径

### 代码变更

```typescript
// 修改前
navigate(`/course-detail/${courseId}`)

// 修改后
navigate(`/courses/${courseId}`)
```

### 验证方式

1. 编译检查：确保无TypeScript错误
2. 功能测试：点击按钮验证跳转正确
3. 场景测试：区分已购买/未购买用户场景