---
name: admin-system-fix-plan
overview: 修复后台管理系统关键问题：JSX语法错误、Service返回格式统一、分页支持完善、密码安全加固
todos:
  - id: fix-jsx-error
    content: 修复CouponManagement.tsx第333行JSX语法错误，删除多余的`),`
    status: completed
  - id: unify-service-format
    content: 统一CloudAdminService中所有Service返回格式为{success, data, message/error}
    status: completed
    dependencies:
      - fix-jsx-error
  - id: add-pagination
    content: 为所有Service的getAll方法添加offset/limit/search分页参数支持
    status: completed
    dependencies:
      - unify-service-format
  - id: encrypt-password
    content: 修改adminAuthService使用bcryptjs进行密码加密存储和验证
    status: completed
  - id: use-tcb-migrate
    content: Use [integration:tcb] to migrate existing plaintext passwords to hashed format in database
    status: completed
    dependencies:
      - encrypt-password
  - id: add-debounce
    content: 为CouponManagement等组件的搜索功能添加防抖处理，延迟300ms触发
    status: completed
    dependencies:
      - fix-jsx-error
  - id: verify-fixes
    content: 验证所有修复是否生效，系统能否正常编译和运行
    status: completed
    dependencies:
      - add-pagination
      - use-tcb-migrate
      - add-debounce
---

## 问题概述

根据系统分析报告，需要解决以下5个关键问题：

1. **JSX语法错误** - CouponManagement.tsx第333行存在多余的`),`，导致编译失败
2. **Service返回格式不统一** - CloudAdminService中有的返回原始数组，有的返回`{success, data}`对象
3. **分页支持不完整** - 仅User、Order等部分Service支持分页参数，Course、Chapter等不支持
4. **密码明文存储** - adminAuthService中使用明文密码验证，存在安全风险
5. **搜索缺少防抖** - 搜索功能频繁触发请求，影响性能

## 修复目标

- 修复语法错误使系统能正常编译
- 统一所有Service返回格式为`{success, data, message/error}`
- 为所有Service添加分页和搜索支持
- 实现密码加密存储和验证
- 为搜索添加防抖优化

## 技术栈

- React 18 + TypeScript
- Material-UI v5
- CloudBase 云开发
- bcryptjs（密码加密）

## 修复策略

### 1. 语法错误修复

直接删除CouponManagement.tsx第333行多余的`),`

### 2. 统一Service返回格式

将所有Service的返回格式统一为：

```typescript
interface ServiceResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}
```

### 3. 分页参数标准化

为所有getAll方法添加统一参数：

```typescript
async getAll(params?: { offset?: number; limit?: number; search?: string })
```

### 4. 密码加密方案

- 使用bcryptjs进行密码哈希
- 密码验证时使用bcrypt.compare()
- 对现有明文密码进行迁移处理

### 5. 防抖实现

使用lodash debounce或自定义防抖Hook，延迟300ms触发搜索

## 目录结构变更

```
src/
├── components/admin/
│   └── CouponManagement.tsx          [MODIFY] 修复语法错误，添加防抖
├── services/
│   ├── CloudAdminService.ts          [MODIFY] 统一返回格式，添加分页
│   └── adminAuthService.ts           [MODIFY] 添加密码加密
└── utils/
    └── debounce.ts                   [NEW] 防抖工具函数
```

## Agent Extensions

### Integration

- **tcb: CloudBase**
- Purpose: 用于更新数据库中现有用户的密码为加密格式
- Expected outcome: 将现有明文密码迁移为bcrypt加密存储

### SubAgent

- **code-explorer**
- Purpose: 探索项目中的Service使用模式，确保返回格式统一后组件层能正确处理
- Expected outcome: 识别所有使用CloudAdminService的组件，确保返回格式兼容性