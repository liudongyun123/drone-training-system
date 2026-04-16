/**
 * 数据库结构调整脚本 v20260413
 * 
 * 需要添加/修改的集合：
 * 
 * 1. members 表 - 添加微信关联字段
 * 2. enrollments 表 - 添加线上/线下区分、赠送课程等字段
 * 3. orders 表 - 添加 orderType, adminId 等字段
 * 4. classes 表 - 添加 hasVideoGrant, videoGrantCourseId 等字段
 * 5. course_permission 表 - 新建
 */

// ============================================================================
// 1. members 表结构调整
// ============================================================================
/**
 * members 表完整结构：
 * 
 {
 *   _id: string,                    // UUID，系统主键
 *   
 *   // 核心标识（用于关联所有数据）
 *   phone: string,                  // 手机号，唯一，用于业务关联 ★
 *   phoneVerified: boolean,           // 是否已验证手机号
 *   
 *   // 微信登录关联
 *   unionId: string,                // 微信UnionID ★
 *   openId: string,                  // 微信OpenID
 *   
 *   // 基本信息
 *   name: string,                   // 姓名
 *   nickname: string,               // 昵称
 *   avatar: string,                 // 头像
 *   gender: 'male' | 'female',      // 性别
 *   
 *   // 系统信息
 *   role: 'student' | 'teacher' | 'admin',
 *   status: 'active' | 'disabled',
 *   type: 'individual' | 'enterprise',
 *   
 *   // 登录信息
 *   loginType: 'phone' | 'wechat',
 *   lastLoginAt: string,
 *   loginCount: number,
 *   
 *   // 关联管理（换号保留）
 *   relatedPhones: string[],         // 旧手机号列表 ★
 *   
 *   // 扩展信息
 *   idCard: string,                  // 身份证
 *   email: string,
 *   address: string,
 *   emergencyContact: string,
 *   emergencyPhone: string,
 *   
 *   createdAt: string,
 *   updatedAt: string
 * }
 */

// ============================================================================
// 2. enrollments 表结构调整
// ============================================================================
/**
 * enrollments 表完整结构：
 * 
 {
 *   _id: string,
 *   
 *   // 学员信息
 *   phone: string,                  // 手机号 ★
 *   userName: string,               // 学员姓名
 *   gender: string,
 *   memberId: string,               // members 表 _id
 *   
 *   // 班级信息
 *   classId: string,                // 班级ID ★
 *   className: string,              // 班级名称
 *   courseId: string,               // 课程ID
 *   courseName: string,             // 课程名称
 *   
 *   // 来源与类型 ★
 *   source: 'online' | 'offline',  // 来源：线上/线下
 *   enrollmentType: 'immediate' | 'prebook',  // 即交即报/预报名
 *   
 *   // 状态
 *   status: 'pending' | 'active' | 'suspended' | 'dropped' | 'completed',
 *   paymentStatus: 'unpaid' | 'paid' | 'refunded',
 *   
 *   // 缴费信息
 *   paymentMethod: 'wechat' | 'alipay' | 'cash' | 'transfer',
 *   amount: number,                // 缴费金额
 *   currency: string,
 *   
 *   // 管理员操作
 *   adminId: string,               // 操作的管理员
 *   adminNote: string,            // 管理员备注
 *   receiptNo: string,            // 收据编号
 *   
 *   // 审核信息
 *   reviewInfo: {
 *     reviewer: string,
 *     reviewTime: string,
 *     comment: string
 *   },
 *   
 *   // 分班信息
 *   assignedClass: {
 *     classId: string,
 *     className: string,
 *     startDate: string,
 *     teacher: string,
 *     classroom: string
 *   },
 *   
 *   // 赠送视频课程 ★
 *   hasVideoGrant: boolean,        // 是否赠送视频
 *   videoGrantCourseId: string,    // 赠送的视频课程ID
 *   videoGrantCourseName: string,  // 赠送的视频课程名称
 *   videoGrantStatus: 'pending' | 'granted' | 'none',
 *   
 *   // 预报名状态
 *   prebookStatus: 'pending' | 'confirmed' | 'cancelled',
 *   
 *   // 时间
 *   enrollmentDate: string,         // 报名日期
 *   effectiveDate: string,        // 生效日期
 *   expiryDate: string,            // 有效期
 *   completedDate: string,         // 结业日期
 *   
 *   createdAt: string,
 *   updatedAt: string
 * }
 */

// ============================================================================
// 3. orders 表结构调整
// ============================================================================
/**
 * orders 表完整结构：
 * 
 {
 *   _id: string,
 *   orderNo: string,               // 订单号
 *   
 *   // 订单类型 ★
 *   orderType: 'purchase' | 'enrollment' | 'enrollment_offline',
 *   // purchase: 线上购买课程
 *   // enrollment: 线上报班
 *   // enrollment_offline: 线下报班
 *   
 *   // 用户信息
 *   phone: string,                 // 手机号 ★
 *   userName: string,
 *   userId: string,                // members 表 _id
 *   
 *   // 订单内容
 *   items: [{
 *     type: 'course' | 'class',
 *     courseId: string,
 *     courseName: string,
 *     classId: string,             // 如果是班级报名
 *     price: number,
 *     quantity: number
 *   }],
 *   
 *   // 金额
 *   totalAmount: number,
 *   discountAmount: number,
 *   finalAmount: number,
 *   
 *   // 支付信息
 *   paymentMethod: 'wechat' | 'alipay' | 'cash' | 'transfer',
 *   paymentConfirmBy: 'system' | 'admin',
 *   paidAt: string,
 *   paidConfirmAt: string,
 *   
 *   // 管理员信息（线下特有）
 *   adminId: string,
 *   adminNote: string,
 *   receiptNo: string,
 *   
 *   // 关联
 *   enrollmentId: string,          // 关联的报名记录
 *   
 *   // 状态
 *   status: 'pending' | 'paid' | 'refunded' | 'cancelled',
 *   
 *   createdAt: string,
 *   updatedAt: string
 * }
 */

// ============================================================================
// 4. classes 表结构调整
// ============================================================================
/**
 * classes 表完整结构：
 * 
 {
 *   _id: string,
 *   name: string,                  // 班级名称
 *   
 *   // 课程关联
 *   courseId: string,
 *   courseName: string,
 *   
 *   // 教师
 *   teacherId: string,
 *   teacherName: string,
 *   
 *   // 时间地点
 *   classroom: string,
 *   startDate: string,
 *   endDate: string,
 *   
 *   // 招生
 *   maxStudents: number,           // 最大人数
 *   enrolledCount: number,        // 已报名
 *   remainingSlots: number,       // 剩余名额
 *   status: 'draft' | 'enrolling' | 'in_progress' | 'completed',
 *   
 *   // 费用
 *   fee: number,
 *   feeDescription: string,
 *   
 *   // 赠送视频课程 ★
 *   hasVideoGrant: boolean,        // 是否赠送视频
 *   videoGrantCourseId: string,    // 赠送的视频课程ID
 *   videoGrantCourseName: string,  // 赠送的视频课程名称
 *   videoGrantValue: number,       // 赠送价值
 *   videoGrantDescription: string, // 赠送说明
 *   
 *   // 课表
 *   schedule: [{
 *     date: string,
 *     time: string,
 *     topic: string,
 *     teacher: string,
 *     classroom: string,
 *     duration: number,
 *     status: 'scheduled' | 'completed' | 'cancelled'
 *   }],
 *   
 *   // 配置
 *   attendanceRequired: boolean,
 *   allowTransfer: boolean,
 *   maxTransfers: number,
 *   
 *   createdAt: string,
 *   updatedAt: string
 * }
 */

// ============================================================================
// 5. course_permission 表（新建）
// ============================================================================
/**
 * course_permission 表：
 * 统一管理用户对课程的视频访问权限
 * 
 {
 *   _id: string,
 *   
 *   // 核心标识
 *   phone: string,                  // 手机号 ★
 *   memberId: string,               // members 表 _id
 *   
 *   // 课程信息
 *   courseId: string,              // 课程ID
 *   courseName: string,            // 课程名称
 *   
 *   // 来源 ★
 *   source: 'purchase' | 'enrollment_grant' | 'admin_grant',
 *   // purchase: 线上购买获得
 *   // enrollment_grant: 线下班赠送
 *   // admin_grant: 管理员手动授权
 *   
 *   // 来源关联
 *   orderId: string,               // 关联订单
 *   enrollmentId: string,          // 关联报名记录
 *   
 *   // 授权信息
 *   grantedAt: string,            // 授权时间
 *   grantedBy: 'system' | 'admin', // 系统自动/管理员手动
 *   adminId: string,              // 管理员ID（如果是手动）
 *   
 *   // 有效期
 *   expiresAt: string,            // 过期时间，永久为 null
 *   
 *   // 状态
 *   status: 'active' | 'expired' | 'revoked',
 *   
 *   // 备注
 *   note: string,
 *   
 *   createdAt: string,
 *   updatedAt: string
 * }
 * 
 * 索引建议：
 * - phone + courseId: 唯一索引（防止重复授权）
 * - phone: 普通索引
 * - courseId: 普通索引
 * - status: 普通索引
 */

// ============================================================================
// 6. schedule_changes 表（调课申请）
// ============================================================================
/**
 * schedule_changes 表：
 * 
 {
 *   _id: string,
 *   
 *   // 学员信息
 *   phone: string,
 *   userName: string,
 *   enrollmentId: string,          // 报名记录ID
 *   
 *   // 调课信息
 *   originalSchedule: {
 *     scheduleId: string,
 *     date: string,
 *     time: string,
 *     topic: string
 *   },
 *   targetSchedule: {
 *     scheduleId: string,
 *     date: string,
 *     time: string,
 *     topic: string
 *   },
 *   
 *   // 原因
 *   reason: string,
 *   
 *   // 状态
 *   status: 'pending' | 'approved' | 'rejected' | 'cancelled',
 *   
 *   // 审核信息
 *   reviewInfo: {
 *     reviewer: string,
 *     reviewTime: string,
 *     comment: string
 *   },
 *   
 *   createdAt: string,
 *   updatedAt: string
 * }
 */

// ============================================================================
// 7. attendance_records 表（出勤记录）
// ============================================================================
/**
 * attendance_records 表：
 * 
 {
 *   _id: string,
 *   
 *   // 学员信息
 *   phone: string,
 *   userName: string,
 *   enrollmentId: string,
 *   
 *   // 课程信息
 *   scheduleId: string,
 *   courseId: string,
 *   classId: string,
 *   
 *   // 出勤信息
 *   date: string,
 *   topic: string,
 *   
 *   // 出勤状态
 *   status: 'present' | 'absent' | 'late' | 'leave',
 *   
 *   // 时间记录
 *   checkInTime: string,
 *   checkOutTime: string,
 *   duration: number,              // 时长（分钟）
 *   
 *   // 备注
 *   remark: string,
 *   
 *   // 教师考勤
 *   teacherId: string,
 *   teacherRemark: string,
 *   
 *   createdAt: string,
 *   updatedAt: string
 * }
 */

export {};
