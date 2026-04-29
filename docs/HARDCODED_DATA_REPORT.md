# 硬编码数据排查报告

## 排查日期: 2026-04-29
## 改造日期: 2026-04-29

## 一、发现的硬编码数据

### 1. MOCK/DEMO 数据 (已改造)

| 文件 | 硬编码变量 | 状态 |
|------|-----------|------|
| `src/web/pages/account/MyCouponsPage.tsx` | `MOCK_MY_COUPONS` | ✅ 已删除，改为调用 couponService |
| `src/web/pages/account/CouponCenterPage.tsx` | `MOCK_AVAILABLE_COUPONS` | ✅ 已删除，改为调用 couponService |
| `src/web/pages/practice/ExamCenterPage.tsx` | `DEMO_EXAMS`, `DEMO_BANKS` | ✅ 已删除，显示空状态 |
| `src/web/pages/practice/QuestionBankListPage.tsx` | `DEMO_BANKS` | ✅ 已删除，显示空状态 |

### 2. 状态/类型标签配置 (已创建统一服务)

已创建 `src/services/dictionaryService.ts` 和 `src/services/siteConfigService.ts`，所有状态标签配置可通过后台管理。

已修改的文件：
- `src/services/systemConfigService.ts` - 添加 dictionaries 字段

### 3. 等级/分类配置 (已改造)

| 文件 | 硬编码变量 | 状态 |
|------|-----------|------|
| `src/admin/pages/courses/AdminCourses.tsx` | `LEVELS` | ✅ 改为从 dictionaryService 读取 |
| `src/web/pages/practice/QuestionBankListPage.tsx` | `categories` | ✅ 改为从 dictionaryService 读取 |
| `src/web/pages/learning/CourseListPage.tsx` | `levelBadgeColor`, `levelText` | ✅ 改为动态计算 |

### 4. 占位图片 (已改造)

| 文件 | 状态 |
|------|------|
| `src/web/pages/learning/CourseListPage.tsx` | ✅ 改为从 siteConfigService 读取 |

### 5. 业务参数 (已改造)

| 文件 | 硬编码 | 状态 |
|------|--------|------|
| `src/services/groupBuyService.ts` | `DEFAULT_GROUP_BUY_DURATION` | ✅ 移除硬编码，由调用方传入 |

---

## 二、新创建的服务

### 1. dictionaryService.ts

路径: `src/services/dictionaryService.ts`

功能:
- 统一管理所有状态标签、类型配置、等级定义
- 从 `systemConfig.dictionaries` 字段读取
- 提供默认值兜底
- 支持缓存

主要方法:
- `getDictionaries()` - 获取完整字典配置
- `getDictionary(groupKey)` - 获取指定分组
- `getStatusLabel(groupKey, statusKey)` - 获取状态标签
- `getLevelOptions()` - 获取等级列表
- `getOptions(groupKey)` - 获取选项列表

### 2. siteConfigService.ts

路径: `src/services/siteConfigService.ts`

功能:
- 管理占位图片、默认值、业务参数
- 从 `site_config` 集合读取
- 提供默认值兜底
- 支持缓存

主要方法:
- `getConfig(key, defaultValue)` - 获取单个配置
- `getPlaceholderImage(type)` - 获取占位图片
- `getBusinessParam(key, defaultValue)` - 获取业务参数
- `initSiteConfig()` - 初始化默认配置

---

## 三、数据库初始化

### 需要初始化的集合:

1. **site_config** - 站点配置
```javascript
// 调用 siteConfigService.initSiteConfig() 初始化
```

2. **systemConfig** - 系统配置（已存在）
```javascript
// dictionaries 字段会自动从 DEFAULT_DICTIONARIES 初始化
```

---

## 四、待完善项

### 需要继续改造的文件:

以下文件中的状态标签配置（STATUS_LABELS 等）建议后续统一使用 dictionaryService：

1. `src/admin/pages/classes/AdminClassOrders.tsx`
2. `src/admin/pages/classes/AdminClasses.tsx`
3. `src/admin/pages/classes/AdminClassSchedules.tsx`
4. `src/admin/pages/classes/AdminRegistrations.tsx`
5. `src/admin/pages/orders/AdminCourseOrders.tsx`
6. `src/admin/pages/orders/AdminTransfers.tsx`
7. `src/admin/pages/orders/AdminFinance.tsx`
8. `src/admin/pages/users/AdminUserRoles.tsx`
9. `src/components/admin/MessageManagement.tsx`
10. `src/components/admin/PermissionManagement.tsx`
11. `src/web/pages/account/TransferRequestPage.tsx`
12. `src/web/pages/account/MessagesPage.tsx`
13. `src/web/pages/learning/CourseDetailPage.tsx`
14. `src/web/pages/training/MySchedulePage.tsx`

> 注：这些状态标签配置为固定文案，不影响核心功能。后续可根据需要统一改造。

---

## 五、改造效果

- ✅ 连接数据库后，所有数据从数据库读取
- ✅ 无 MOCK/DEMO 数据，数据库为空时显示友好提示
- ✅ 占位图片可在后台配置
- ✅ 业务参数可在后台调整
- ✅ 等级/分类配置可动态管理

---

## 六、使用说明

### 前端获取配置

```typescript
import { dictionaryService } from '@/services/dictionaryService';
import { siteConfigService } from '@/services/siteConfigService';

// 获取等级选项
const levels = await dictionaryService.getLevelOptions();

// 获取状态标签
const statusLabel = await dictionaryService.getStatusLabel('orderStatus', 'paid');

// 获取占位图片
const defaultCover = await siteConfigService.getPlaceholderImage('course');

// 获取业务参数
const groupBuyDuration = await siteConfigService.getBusinessParam('groupBuyDurationHours', 48);
```

### 后台管理配置

管理员可在后台修改以下配置：
- `systemConfig.dictionaries` - 字典配置（状态标签、等级配置等）
- `site_config` - 站点配置（占位图片、业务参数等）