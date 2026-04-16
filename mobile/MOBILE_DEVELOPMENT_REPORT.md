# 无人机培训系统 - 移动应用开发报告

## 开发时间
2026年4月2日

---

## 已完成的页面

### 1. 登录/注册模块

#### 登录页面 (`screens/auth/LoginScreen.tsx`)
- **功能**：
  - 短信验证码登录
  - 密码登录
  - 切换登录方式
  - 发送验证码（倒计时60秒）
  - 显示/隐藏密码
  - 第三方登录入口（微信）
  - 用户协议提示

- **设计风格**：
  - 复古未来主义航空仪表盘风格
  - 深色主题 `#0A0E14`
  - 琥珀橙主色调 `#FF8C00`
  - Orbitron/Rajdhani 字体
  - 动画过渡效果

#### 注册页面 (`screens/auth/RegisterScreen.tsx`)
- **功能**：
  - 分步注册（手机验证 → 设置密码）
  - 发送验证码
  - 密码确认验证
  - 步骤指示器

#### 找回密码页面 (`screens/auth/ForgotPasswordScreen.tsx`)
- **功能**：
  - 分步流程（验证手机 → 设置密码 → 完成）
  - 步骤指示器
  - 发送验证码（60秒倒计时）
  - 新密码设置（6位以上）
  - 确认密码验证
  - 密码可见切换
  - 密码提示说明
  - 成功状态展示
  - 返回登录入口
- **设计**：
  - 步骤指示器（数字/勾选状态）
  - 密码输入安全样式
  - 成功图标动画效果

### 2. 课程模块

#### 课程列表页面 (`screens/course/CourseListScreen.tsx`)
- **功能**：
  - 课程分类筛选
  - 课程搜索
  - 多维度排序（综合/最热/评分/最新/价格）
  - 难度筛选（入门/进阶/高级）
  - 分页加载
  - 下拉刷新
  - 空状态处理

- **设计风格**：
  - 卡片式布局
  - 横向滚动分类标签
  - 课程封面 + 价格 + 评分 + 讲师

#### 课程详情页面 (`screens/course/CourseDetailScreen.tsx`)
- **功能**：
  - 封面展示
  - 课程信息（评分/学员数/时长）
  - 讲师信息卡片
  - Tab切换（课程目录/课程介绍/用户评价）
  - 章节列表（可展开/收起）
  - 课时列表（免费试看标识）
  - 收藏/咨询快捷操作
  - 购买/开始学习按钮

### 3. 视频播放模块

#### 视频播放页面 (`screens/video/VideoPlayerScreen.tsx`)
- **功能**：
  - 视频播放器界面
  - 播放/暂停控制
  - 进度条拖动
  - 倍速播放（0.75x/1x/1.25x/1.5x/2x）
  - 快进/快退10秒
  - 全屏切换
  - 自动隐藏控制栏
  - 退出时保存进度
  - 学习进度展示

### 4. 学习模块

#### 学习页面 (`screens/learning/LearningScreen.tsx`)
- **功能**：
  - Tab切换（学习中/已完成/最近学习）
  - 课程学习进度卡片
  - 最近学习课时显示
  - 继续学习按钮
  - 空状态处理
  - 下拉刷新

### 5. 个人中心模块

#### 个人中心页面 (`screens/profile/ProfileScreen.tsx`)
- **功能**：
  - 用户头像/昵称/手机号展示
  - 学习数据统计卡片（学习中/已完成/学习时长/证书）
  - 快捷操作入口
  - 菜单分组（学习相关/订单相关/设置）
  - 退出登录

### 6. 考试模块

#### 考试列表页面 (`screens/exam/ExamListScreen.tsx`)
- **功能**：
  - Tab切换（可参加/历史记录）
  - 可参加考试列表
  - 历史考试记录
  - 考试状态标签（已通过/未通过）
  - 考试次数/通过次数/平均成绩统计
  - 下拉刷新
  - 空状态处理
- **设计**：
  - 仪表盘风格统计卡片
  - 考试卡片：类型标签/时长/题数/总分/及格分
  - 历史成绩分数大字展示

#### 考试详情页面 (`screens/exam/ExamDetailScreen.tsx`)
- **功能**：
  - 考试规则展示（时长/题数/总分/及格分）
  - 注意事项提示
  - 题目预览（显示前5题）
  - 关联课程信息
  - 开始考试按钮
  - 考试规则确认弹窗
- **设计**：
  - 考试图标/徽章视觉元素
  - 规则卡片四宫格布局
  - 警示提示框

#### 答题页面 (`screens/exam/ExamPlayerScreen.tsx`)
- **功能**：
  - 实时倒计时（小时:分钟:秒）
  - 5分钟时间警告
  - 题目进度指示
  - 单选题/多选题/判断题支持
  - 题目导航（上一题/下一题）
  - 题目列表弹窗
  - 已答/未答状态显示
  - 退出确认
  - 自动交卷（时间到）
  - 交卷确认
- **设计**：
  - 顶部状态栏（进度/计时/答题数）
  - 题目类型标签
  - 选项圆圈/复选框/对错按钮
  - 底部导航条

#### 成绩查询页面 (`screens/exam/ExamResultScreen.tsx`)
- **功能**：
  - 成绩展示（大字分数）
  - 通过/未通过状态
  - 统计数据（答对/答错/正确率）
  - 答题卡视图
  - 答案解析视图
  - 正确答案对比
  - 答案解析说明
  - 重新考试/返回首页
- **设计**：
  - 圆形成绩展示
  - 彩色状态徽章
  - 答题卡网格布局
  - 正确/错误颜色区分
  - 解析提示框

### 7. 订单模块

#### 订单列表页面 (`screens/order/OrderListScreen.tsx`)
- **功能**：
  - Tab切换（全部/待支付/已完成）
  - 订单统计卡片（累计消费/订单总数/待支付/已完成）
  - 订单卡片展示（订单号/课程名/金额/状态）
  - 待支付订单快捷支付入口
  - 下拉刷新/上拉加载更多
  - 空状态处理
- **设计**：
  - 仪表盘风格统计卡片
  - 状态标签颜色区分
  - 订单卡片信息分组布局

#### 订单详情页面 (`screens/order/OrderDetailScreen.tsx`)
- **功能**：
  - 订单状态展示
  - 订单信息（订单号/下单时间/支付时间/支付方式）
  - 课程信息卡片（可跳转详情）
  - 优惠信息展示
  - 金额明细（原价格/优惠/实付）
  - 待支付：取消订单/去支付按钮
  - 已支付：开始学习按钮
  - 联系客服入口
- **设计**：
  - 状态卡片醒目展示
  - 信息卡片分组布局
  - 底部操作按钮固定

#### 支付页面 (`screens/order/PaymentScreen.tsx`)
- **功能**：
  - 30分钟倒计时显示
  - 应付金额大字展示
  - 支付方式选择（微信/支付宝/余额）
  - 课程信息预览
  - 优惠信息展示
  - 支付协议勾选
  - 立即支付按钮
  - 取消支付确认
- **设计**：
  - 倒计时警示卡片
  - 金额大字居中
  - 支付方式单选卡片
  - 底部固定支付栏

---

## 设计规范

### 色彩方案
```
primary: #FF8C00        // 琥珀橙 - 主要操作
secondary: #00D4AA       // 航空绿 - 成功/完成
accent: #00A8E8          // 天空蓝 - 辅助信息
bgPrimary: #0A0E14       // 深夜背景
bgSecondary: #1A1F29      // 卡片背景
textPrimary: #FFFFFF      // 主文字
textSecondary: #A0AEC0    // 次要文字
```

### 字体方案
- 标题：Orbitron / Rajdhani
- 正文：Source Sans Pro / Noto Sans SC
- 数字：JetBrains Mono

### 布局策略
- 底部Tab导航：Home / 课程 / 学习 / 我的
- 卡片式布局
- 非对称网格布局
- 充足的留白

---

## 云函数服务

### mobile-auth（认证服务）
- 短信验证码发送/验证
- 密码登录
- Token管理
- 用户信息获取

### mobile-course（课程服务）
- 课程列表/详情
- 分类查询
- 购买状态检查
- 推荐课程

### mobile-learning（学习服务）
- 学习统计数据
- 我的课程列表
- 学习进度管理
- 收藏管理

### mobile-exam（考试服务）
- 获取可参加的考试列表
- 获取考试详情（含题目）
- 开始考试（生成Token）
- 提交考试答案
- 获取考试结果
- 获取历史考试记录

### mobile-order（订单服务）
- 订单列表/详情
- 创建订单
- 取消订单
- 支付订单
- 退款申请
- 订单统计

### mobile-wechat（微信服务）
- 微信登录检查
- 微信授权登录
- 授权码换取用户信息
- iOS/Android回调处理

### mobile-payment（支付服务）
- 微信支付（真实SDK）
- 支付宝支付（真实SDK）
- 余额支付（实时扣减）
- 模拟支付（开发环境）
- 退款申请
- 支付结果验证

### mobile-video（视频服务）
- 获取视频播放地址
- 防盗链签名URL
- 本地播放进度保存
- 进度同步到服务器
- 课程完成度计算
- 倍速播放支持

---

## 下一步开发

### ✅ 已完成页面
1. ✅ 登录/注册模块
2. ✅ 课程模块（列表/详情）
3. ✅ 视频播放模块
4. ✅ 学习模块
5. ✅ 个人中心模块
6. ✅ 考试模块（列表/详情/答题/成绩）
7. ✅ 订单模块（列表/详情/支付）
8. ✅ 找回密码模块

### ✅ 已完成功能
1. ✅ 微信登录集成（服务层+UI绑定）
2. ✅ 微信支付/支付宝支付（服务层+模拟支付）
3. ✅ 视频播放器服务（进度同步+缓存）
4. ✅ 导航路由配置（App.tsx已完成）

### 待完成功能
1. ~~离线缓存功能~~ ✅
2. ~~消息推送~~ ✅
3. ~~优惠券功能~~ ✅
4. ~~证书功能~~ ✅
5. ~~学习记录功能~~ ✅
6. ~~积分功能~~ ✅
7. 微信SDK真机集成（需配置AppID）

---

## 新增功能（本轮开发）

### 1. 离线缓存服务 (`services/storage.ts`)
- **通用存储操作**: set/get 字符串和对象
- **课程缓存**: 缓存课程列表和详情，30分钟过期
- **视频进度**: 本地保存播放进度，支持同步到服务器
- **考试缓存**: 缓存考试列表和答题记录
- **应用设置**: 播放倍速、清晰度、通知开关等
- **数据同步**: 自动检测同步状态
- **缓存清理**: 自动清理过期缓存，查看缓存大小

### 2. 设置页面 (`screens/profile/SettingsScreen.tsx`)
- **用户信息展示**: 头像、姓名、手机号
- **播放设置**: 自动播放、倍速选择、清晰度设置
- **通知设置**: 推送开关
- **第三方登录**: 微信AppID配置入口
- **数据管理**: 同步数据、清理缓存
- **其他**: 关于应用、退出登录

### 3. 消息推送服务 (`services/push.ts`)
- **推送初始化**: 自动注册和获取Token
- **通知设置**: 分类开关（课程/考试/订单/优惠）
- **消息管理**: 保存/读取/标记已读/删除
- **角标管理**: iOS角标数字控制
- **本地通知**: 支持考试提醒、订单状态等

### 4. 消息通知页面 (`screens/profile/NotificationsScreen.tsx`)
- **消息列表**: Tab切换（全部/未读）
- **消息操作**: 点击跳转、删除、长按菜单
- **批量操作**: 全部已读、清空消息
- **通知设置**: 课程更新/考试提醒/订单通知/优惠活动开关
- **测试功能**: 发送测试通知
- **时间格式化**: 智能时间显示（刚刚/分钟前/小时前/天前）

### 5. 微信SDK集成文档 (`docs/WECHAT_INTEGRATION.md`)
- **开放平台配置**: AppID、Universal Link获取
- **iOS配置**: URL Scheme、LSApplicationQueriesSchemes
- **Android配置**: WXEntryActivity、权限设置
- **代码集成**: 登录/支付服务调用示例
- **测试调试**: 常见问题与解决方案
- **生产发布**: App Store / 应用市场配置

### 6. 优惠券服务 (`services/api/coupon.ts`)
- **获取优惠券**: 获取用户优惠券列表
- **可用优惠券**: 获取订单可用优惠券
- **验证优惠券**: 验证优惠券码有效性
- **领取优惠券**: 输入券码领取
- **使用优惠券**: 下单时使用优惠券
- **计算优惠**: 计算优惠金额

### 7. 优惠券页面 (`screens/profile/CouponsScreen.tsx`)
- **Tab切换**: 可用/已使用/已过期
- **优惠券卡片**: 面值/使用条件/有效期/状态
- **领取弹窗**: 输入券码领取
- **下拉刷新**: 刷新优惠券列表
- **去使用**: 跳转到课程详情

### 8. 证书服务 (`services/api/certificate.ts`)
- **获取证书**: 获取用户证书列表
- **证书详情**: 查看证书详细信息
- **验证证书**: 验证码真伪
- **下载证书**: 获取证书下载链接
- **分享证书**: 分享证书信息

### 9. 证书页面 (`screens/profile/CertificatesScreen.tsx`)
- **证书列表**: 展示用户所有证书
- **状态显示**: 有效/已过期/已吊销
- **详情弹窗**: 查看证书完整信息
- **查验真伪**: 验证证书真实性
- **分享证书**: 分享证书给好友
- **下载证书**: 查看/下载证书文件

### 10. 学习记录页面 (`screens/learning/StudyHistoryScreen.tsx`)
- **统计卡片**: 学习记录/进行中/已完成/总时长
- **Tab筛选**: 全部/进行中/已完成
- **学习记录卡片**: 课程封面/进度/观看时长/最后观看时间
- **继续学习按钮**: 快速跳转到视频播放
- **下拉刷新**: 刷新学习记录

### 11. 积分页面 (`screens/profile/PointsScreen.tsx`)
- **积分卡片**: 总积分/等级/升级进度
- **功能入口**: 积分商城/积分明细/等级权益
- **赚积分攻略**: 学习/考试/邀请/签到等积分来源
- **积分明细**: 获得/消费筛选/时间/余额
- **等级系统**: 青铜/白银/铂金/钻石

---

## 项目结构

```
mobile/DroneTrainingMobile/
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── course/
│   │   │   ├── CourseListScreen.tsx
│   │   │   └── CourseDetailScreen.tsx
│   │   ├── exam/
│   │   │   ├── ExamListScreen.tsx
│   │   │   ├── ExamDetailScreen.tsx
│   │   │   ├── ExamPlayerScreen.tsx
│   │   │   └── ExamResultScreen.tsx
│   │   ├── home/
│   │   │   └── HomeScreen.tsx
│   │   ├── learning/
│   │   │   ├── LearningScreen.tsx
│   │   │   └── StudyHistoryScreen.tsx  # 学习记录
│   │   ├── order/
│   │   │   ├── OrderListScreen.tsx
│   │   │   ├── OrderDetailScreen.tsx
│   │   │   └── PaymentScreen.tsx
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── SettingsScreen.tsx        # 设置页面
│   │   │   ├── NotificationsScreen.tsx  # 消息通知
│   │   │   ├── CouponsScreen.tsx        # 优惠券页面
│   │   │   ├── CertificatesScreen.tsx   # 证书页面
│   │   │   └── PointsScreen.tsx        # 积分页面
│   │   ├── video/
│   │   │   └── VideoPlayerScreen.tsx
│   │   └── index.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── auth.ts
│   │   │   ├── course.ts
│   │   │   ├── exam.ts
│   │   │   ├── learning.ts
│   │   │   ├── order.ts
│   │   │   ├── wechat.ts      # 微信登录服务
│   │   │   ├── payment.ts     # 支付服务
│   │   │   ├── video.ts       # 视频播放服务
│   │   │   ├── coupon.ts      # 优惠券服务
│   │   │   ├── certificate.ts # 证书服务
│   │   │   └── client.ts
│   │   ├── storage.ts         # 本地存储服务
│   │   └── push.ts            # 消息推送服务
│   ├── store/
│   │   └── userStore.ts       # 用户状态管理
│   ├── config/
│   │   └── index.ts
│   └── types/
│       └── index.ts
└── cloudfunctions/
    ├── mobile-auth/
    ├── mobile-course/
    ├── mobile-order/
    ├── mobile-exam/
    └── mobile-learning/
```

---

## CloudBase 资源

### 云函数（已部署）
- `mobile-auth` - 认证服务
- `mobile-course` - 课程服务
- `mobile-order` - 订单服务
- `mobile-exam` - 考试服务
- `mobile-learning` - 学习服务
- `mobile-search` - 搜索服务
- `mobile-favorite` - 收藏服务
- `mobile-feedback` - 反馈服务

### HTTP 网关（已配置）
| 路径 | 函数名 | 创建时间 | 触发类型 |
|------|--------|----------|----------|
| /mobile-auth | mobile-auth | 2026-04-02 17:38:53 | Cloud hosting |
| /mobile-course | mobile-course | 2026-04-02 17:38:53 | Cloud hosting |
| /mobile-order | mobile-order | 2026-04-02 17:38:53 | Cloud hosting |
| /mobile-exam | mobile-exam | 2026-04-02 17:38:53 | Cloud hosting |
| /mobile-learning | mobile-learning | 2026-04-02 17:38:53 | Cloud hosting |
| /mobile-search | mobile-search | 2026-04-03 12:38:59 | Cloud function |
| /mobile-favorite | mobile-favorite | 2026-04-03 12:39:05 | Cloud function |
| /mobile-feedback | mobile-feedback | 2026-04-03 12:39:08 | Cloud function |

### 环境信息
- Environment ID: `rcwljy-5ghmq2ex26764978`
- Region: `ap-shanghai`
- API Gateway: `https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com`

### 前端配置
- API Gateway URL (已修复): `https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com`
- 配置文件: `src/config/index.ts`

### 更新记录
#### 2026-04-03
1. ✅ 配置 mobile-search HTTP 访问服务
2. ✅ 配置 mobile-favorite HTTP 访问服务
3. ✅ 配置 mobile-feedback HTTP 访问服务
4. ✅ 修复前端 API Gateway URL (ap-shanghai → 标准域名)
