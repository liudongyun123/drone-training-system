# 更新日志

## [3.3.6] 2026-05-06
- [Fixed] getUser 返回用户信息支持 open_id 字段

## [3.3.5] 2026-04-30
- [Added] 文档型数据库支持批量新增数据

## [3.3.4] 2026-04-29
- [Added] 添加类型定义

## [3.3.4] 2026-04-21
- [Added] database where条件支持事务

## [3.3.3] 2026-04-17
- [Fixed] signUp 修复 phone_number 为空时格式化报错的问题

## [3.3.2] 2026-04-13
- [Changed] getUser/getCurrentUser 支持 isRefresh 参数控制是否发请求获取最新用户信息，默认每次请求最新数据

## [3.3.1] 2026-04-13
- [Added] getUser 支持读缓存和读接口数据可选

## [3.3.0] 2026-04-08
- [Added] database 支持 http api

## [3.2.2] 2026-04-02
- [Added] signInWithOtp 支持 emailRedirectTo

## [3.2.1] 2026-03-24
- [Added] 增加帮助信息

## [3.2.0] 2026-03-23
- [Added] 小程序手机号授权支持服务商类型小程序

## [3.1.12] 2026-03-16
- [Fixed] node 模式下请求参数增加 envName

## [3.1.11] 2026-03-16
- [Fixed] node 模式下 v3 签名兼容 headers 为空场景

## [3.1.9] 2026-03-13
- [Added] 增强类型声明以及错误提示

## [3.1.8] 2026-03-12
- [Fixed] 增加 storage 类型定义

## [3.1.7] 2026-03-12
- [Fixed] getVerification 增加 phone_number 参数格式化

## [3.1.6] 2026-03-12
- [Added] signInWithOtp 增加可选参数 options.shouldCreateUser 控制是否自动注册用户

## [3.1.5] 2026-03-11
- [Changed] 完善 database 类型定义
- [Added] 异常时增加 requestId 返回

## [3.1.4] 2026-03-11
- [Fixed] verifyOAuth 返回预设重定向地址  

## [3.1.3] 2026-03-10
- [Fixed] verifyOAuth 兼容 hash 地址  

## [3.1.2] 2026-03-06
- [Fixed] 修复 HBuilderX 找不到 SourceMap 问题

## [3.1.1] 2026-03-03
- [Changed] 更新微信小程序端adapter

## [3.1.0] 2026-03-03
- [Fixed] 兼容多端

## [3.0.6] 2026-03-03
- [Fixed] 修复 Node.js 端签名问题

## [3.0.5] 2026-03-01
- [Added] Node.js 端支持 SecretId 和 SecretKey

## [3.0.4] 2026-02-27
- [Added] 支持 Node.js 端

## [3.0.3] 2026-02-26
- [Fixed] 修复用户信息nickName获取问题

## [3.0.2] 2026-02-12
- [Fixed] 修复用户信息role获取问题

## [3.0.0] 2026-02-10
- [Changed] endPointMode 默认启用 GATEWAY 模式

## [2.28.4] 2026-05-06
- [Fixed] getUser 返回用户信息支持 open_id 字段

## [2.28.3] 2026-04-30
- [Added] 文档型数据库支持批量新增数据

## [2.28.2] 2026-04-29
- [Added] 类型定义

## [2.28.1] 2026-04-23
- [Added] 海外支持

## [2.27.5] 2026-04-21
- [Added] database where条件支持事务

## [2.27.4] 2026-04-17
- [Fixed] signUp 修复 phone_number 为空时格式化报错的问题

## [2.27.3] 2026-04-13
- [Added] getUser 支持读缓存和读接口数据可选

## [2.27.2] 2026-04-02
- [Added] signInWithOtp 支持 emailRedirectTo

## [2.27.1] 2026-03-24
- [Added] 增加帮助信息

## [2.27.0] 2026-03-23
- [Added] 小程序手机号授权支持服务商类型小程序

## [2.26.2] 2026-03-13
- [Added] 增强类型声明以及错误提示

## [2.26.1] 2026-03-12
- [Fixed] getVerification 增加 phone_number 参数格式化

## [2.26.0] 2026-03-12
- [Added] signInWithOtp 增加可选参数 options.shouldCreateUser 控制是否自动注册用户

## [2.25.11] 2026-03-11
- [Fixed] verifyOAuth 返回预设重定向地址  

## [2.25.10] 2026-03-10
- [Fixed] verifyOAuth 兼容 hash 地址  

## [2.25.9] 2026-03-06
- [Fixed] 修复 HBuilderX 找不到 SourceMap 问题

## [2.25.8] 2026-03-03
- [Changed] 更新微信小程序端adapter

## [2.25.5] 2026-02-04
- [Fixed] 修复用户信息role获取问题

## [2.25.4] 2026-02-04
- [Added] encryptlong 兼容多端

## [2.25.3] 2026-01-28
- [Fixed] GET/HEAD 请求时，将请求体设置为空
- [Fixed] auth\.wsWebSign action 一直走 tcb api 请求

## [2.25.2] 2026-01-26
- [Added] 新版本 auth api 上线

## [2.25.1] 2026-01-22
- [Added] 更新 database 依赖版本

## [2.25.0] 2026-01-22
- [Changed] 构建 CI 发布、Node.js 版本升级至 22、代码优化

## [2.24.10] 2026‑01‑14
- [Changed] 更新 getDeviceInfo 和错误处理

## [2.24.9] 2026‑01‑13
- [Changed] 更新数据库依赖至 0.10.0、多认证支持、清理构建文件

## [2.24.8] 2026‑01‑12
- [Added] 添加混元 AR 图像模型支持

## [2.24.7 及更早版本] 2025-12-29 至 2026-01-12
- 略

## [1.4.1] 2021-03-08
- [Fixed] 修复上传文件进度获取异常 bug

## [1.4.0] 2020-12-16
- [Added] 新增 analytics 接口

## [1.3.3] 2020-09-25
- [Changed] 优化 TypeScript 语法提示
- [Fixed] 修复未登录调用数据库报错问题

## [1.3.2] 2020-09-24
- [Fixed] 微信小程序插件环境获取 appSign 取插件 AppId
- [Fixed] storage 满仓情况下写入抛出错误

## [1.3.1] 2020-09-23
- [Fixed] 兼容微信小程序插件环境

## [1.3.0] 2020-09-11
- [Changed] 数据库实时推送功能抽离为独立的模块

## [1.2.5] 2020-09-07
- [Fixed] 修复微信小程序真机环境报错

## [1.2.3] 2020-09-03
- [Changed] 优化 API 语法提示

## [1.2.2] 2020-09-01
- [Changed] 优化开发环境的错误信息

## [1.2.1] 2020-08-26
- [Added] 新增 `Auth.getAuthHeaderAsync` API

## [1.1.4] 2020-08-25
- [Fixed] 修复微信公众号登录 Bug
- [Fixed] 修复微信小程序上传文件 Bug

## [1.1.2] 2020-08-24
- [Fixed] 修复小程序无法直接引用 npm 包问题

## [1.1.1] 2020-08-19
- [Fixed] 修复用户名密码登录bug

## [1.1.0] 2020-08-18
- [Added] 增加 `cloudbase.registerSdkName` API

## [1.0.4] 2020-08-13
- [Fixed] 修复实时推送多环境混淆问题

## [1.0.3] 2020-08-11
- [Fixed] 修复由 Crypto-JS 引起的打包体积过大问题

## [1.0.2] 2020-08-10
- [Changed] 优化版本统计信息

## [1.0.1] 2020-08-05
- [Fixed] `Storage.downloadFile` 可将文件直接下载到本地

## [1.0.0] 2020-07-31
- [Added] 发布 1.0.0 版本，旧版本 SDK [tcb-js-sdk](https://github.com/TencentCloudBase/tcb-js-sdk) 未来不再增加新功能
