# 数据迁移执行指南

## 概述

本文档说明如何执行数据库迁移，将sources和categories的ID格式统一为短代码格式。

## 迁移云函数

已创建两个云函数：

1. **migrate-source-data** - 数据迁移
2. **backup-database** - 数据备份

## 执行步骤

### 步骤1：备份数据

1. 登录腾讯云控制台：
   https://console.cloud.tencent.com/tcb/scf/index?envId=rcwljy-5ghmq2ex26764978

2. 点击「新建云函数」

3. 填写配置：
   - 函数名称：`backup-database`
   - 运行环境：`Nodejs18.15`
   - 上传方式：本地文件夹
   - 选择目录：`cloudfunctions/backup-database/`
   - 入口函数：`index.main`

4. 点击「完成」

5. 点击「测试」按钮，输入：
   ```json
   { "action": "backup" }
   ```

6. 查看返回结果，包含所有集合的数据

### 步骤2：执行迁移

1. 在云函数列表找到 `migrate-source-data`（如果未创建，先创建）

2. 创建云函数：
   - 函数名称：`migrate-source-data`
   - 运行环境：`Nodejs18.15`
   - 上传目录：`cloudfunctions/migrate-source-data/`
   - 入口函数：`index.main`

3. 先执行验证：
   ```json
   { "action": "validate" }
   ```
   检查输出，确认数据状态

4. 执行迁移：
   ```json
   { "action": "migrate" }
   ```

5. 再次执行验证确认结果：
   ```json
   { "action": "validate" }
   ```

## 迁移内容

### ID格式变更

| 集合 | 旧格式 | 新格式 |
|------|--------|--------|
| sources | hash (如 `e35392d069fc521f0152e2c2537e32ad`) | 短代码 (如 `CAAC`, `RENSHE`) |
| categories | hash 或 nameEn | `SOURCE:CODE` (如 `CAAC:MULTI_ROTOR`) |

### 需要同步的集合

| 步骤 | 集合 | 操作 |
|------|------|------|
| 1 | sources | 更新 _id |
| 2 | categories | 更新 _id 和 sourceId |
| 3 | courses | 同步 sourceId |
| 4 | classes | 同步 sourceId |
| 5 | enrollments | 同步 sourceId |
| 6 | orders | 同步 sourceId |
| 7 | payments | 同步 sourceId |
| 8 | exams | 同步 sourceId |

## 验证清单

迁移完成后，检查以下数据：

### sources 集合
```javascript
// 预期结果
[
  { _id: "CAAC", name: "CAAC民航局" },
  { _id: "RENSHE", name: "人社培训" }
]
```

### categories 集合
```javascript
// 预期结果
[
  { _id: "CAAC:MULTI_ROTOR", name: "多旋翼", sourceId: "CAAC" },
  { _id: "RENSHE:PLANT_PROTECTION", name: "植保无人机", sourceId: "RENSHE" }
]
```

### courses 集合
```javascript
// 所有课程都应有 sourceId
{ sourceId: "CAAC" } 或 { sourceId: "RENSHE" }
```

## 回滚方案

如果迁移出现问题：

1. 从备份云函数的返回结果中恢复数据
2. 使用云数据库控制台手动还原

## 注意事项

1. ⚠️ sources 和 categories 的 _id 变更是不可逆的
2. ⚠️ 迁移过程中请暂停用户操作
3. ⚠️ 建议在低峰期执行
4. ⚠️ 执行前务必先备份数据
