# 认证配置指南

## 当前配置状态

| 登录方式 | 状态 | 说明 |
|---------|------|------|
| 手机验证码登录 | ✅ 已启用 | 每天限制30条短信 |
| 匿名登录 | ✅ 已启用 | 游客模式 |
| 账号密码登录 | ✅ 已启用 | 用户名/邮箱/手机+密码 |
| 微信登录 | ❌ 待配置 | 需要微信开放平台AppID |

---

## 微信登录配置步骤

### 1. 注册微信开放平台账号

访问 [微信开放平台](https://open.weixin.qq.com/) 注册开发者账号

### 2. 创建网站应用

1. 登录微信开放平台
2. 进入"管理中心" → "网站应用" → "创建网站应用"
3. 填写应用信息：
   - 应用名称：无人机培训系统
   - 应用简介：专业无人机驾驶员培训平台
   - 应用官网：https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com/
   - 授权回调域：`rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com`

### 3. 获取AppID和AppSecret

应用审核通过后，在应用详情页获取：
- **AppID**：`wx****************`
- **AppSecret**：在"开发信息"中查看（仅显示一次，请妥善保存）

### 4. 配置到CloudBase

使用以下命令配置（替换YOUR_APPID和YOUR_APPSECRET）：

```bash
# 或者使用配置工具页面
# 访问：https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com/admin/auth-config
```

### 5. 验证配置

配置完成后，在登录页面应该能看到"微信登录"按钮。

---

## 短信服务配置（已自动配置）

短信验证码服务使用腾讯云SMS默认配置，每天限制30条。

如需自定义短信模板或增加额度，请访问：
https://tcb.cloud.tencent.com/dev?envId=rcwljy-5ghmq2ex26764978#/identity/login-manage

---

## 权限角色说明

| 角色 | 标识 | 权限范围 |
|-----|------|---------|
| 访客 | `anonymous` | 仅浏览前台公开内容 |
| 游客 | `visitor` | 注册但未完善信息的用户 |
| 学员 | `student` | 前台完整权限，仅可访问已购课程 |
| 教师 | `teacher` | 后台课程/题库/学员管理 |
| 管理员 | `admin` | 所有后台权限 |

---

## 相关文件

- 新认证状态管理：`/src/store/authStore.new.ts`
- 登录组件：`/src/components/auth/LoginModal.tsx`
- 权限守卫：`/src/components/auth/PermissionGuard.tsx`
- 配置工具：`/src/components/admin/AuthConfig.tsx`
