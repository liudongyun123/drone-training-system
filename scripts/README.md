# 数据库初始化指南

## 方法一：使用云函数（推荐）

### 1. 在 CloudBase 控制台创建云函数

1. 登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 进入你的环境 `rcwljy-5ghmq2ex26764978`
3. 点击 **"云函数"** → **"新建云函数"**
4. 配置：
   - 函数名称：`init-database`
   - 运行环境：`Node.js 18.15`
   - 触发方式：手动

### 2. 部署函数代码

将 `init-database.js` 的内容复制到云函数的 `index.js` 中，然后：
- 安装依赖：`@cloudbase/node-sdk`
- 点击 **"部署"**

### 3. 执行函数

在云函数详情页点击 **"测试"** 或 **"执行"**

---

## 方法二：使用本地命令行

### 1. 安装 CloudBase CLI

```bash
npm install -g @cloudbase/cli
```

### 2. 登录

```bash
tcb login
```

### 3. 执行初始化

```bash
cd scripts
node init-database.js
```

---

## 方法三：直接在代码中初始化

在微信小程序中，在 `app.ts` 的 `onLaunch` 中添加初始化逻辑（仅首次运行）：

```typescript
// app.ts
onLaunch() {
  this.initDatabase()
},

methods: {
  async initDatabase() {
    const db = wx.cloud.database()
    const courseCollection = db.collection('courses')
    const result = await courseCollection.count()
    
    if (result.total === 0) {
      // 调用云函数初始化
      wx.cloud.callFunction({
        name: 'init-database',
        success: () => {
          console.log('数据库初始化成功')
        }
      })
    }
  }
}
```

---

## 创建的集合

| 集合名 | 说明 | 数据量 |
|--------|------|--------|
| courses | 课程 | 3 条 |
| classes | 培训班 | 2 条 |
| products | 商品 | 6 条 |
| orders | 订单 | - |
| enrollments | 报名记录 | - |
| certificates | 证书 | - |
| course_permissions | 课程权限 | - |

---

## 验证

初始化成功后，在微信开发者工具中：
1. 打开 **"云开发"** 控制台
2. 点击 **"数据库"**
3. 查看各集合是否有数据
