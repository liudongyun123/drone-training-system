/**
 * 用户角色类型定义
 * 用于管理用户身份和权限
 */

// 角色类型
export type SystemRole = 
  | 'super_admin'   // 超级管理员 - 所有权限
  | 'admin'         // 普通管理员 - 可分配部分权限
  | 'teacher'       // 教师 - 教学相关权限
  | 'student'       // 学员 - 学习相关权限
  | 'visitor'       // 访客 - 基础浏览权限
  | 'anonymous'     // 匿名用户 - 最低权限

// 权限标识
export type SystemPermission = 
  | 'super_admin'           // 超级管理员专属
  | 'admin:dashboard'       // 仪表盘
  | 'admin:course'          // 课程管理
  | 'admin:category'        // 课程分类管理
  | 'admin:member'          // 成员管理
  | 'admin:permission'     // 权限管理
  | 'admin:teacher'         // 教师管理
  | 'admin:schedule'        // 排课管理
  | 'admin:attendance'      // 出勤管理
  | 'admin:exam'            // 考试题库管理
  | 'admin:practice'        // 练习记录管理
  | 'admin:certificate'     // 证书管理
  | 'admin:order'           // 订单管理
  | 'admin:finance'         // 财务统计
  | 'admin:page'            // 首页配置
  | 'admin:banner'          // 轮播图管理
  | 'admin:notice'          // 公告管理
  | 'admin:marketing'       // 营销工具
  | 'admin:comment'         // 评论管理
  | 'admin:log'             // 系统日志
  | 'admin:system'          // 系统设置
  | 'admin:role'            // 角色权限管理
  | 'course:view'           // 查看课程
  | 'course:learn'          // 学习课程
  | 'exam:view'             // 查看考试
  | 'exam:take'             // 参加考试
  | 'certificate:view'      // 查看证书
  | 'profile:edit'          // 编辑个人资料

// 角色信息
export interface UserRoleRecord {
  _id?: string
  phone: string              // 手机号 - 唯一标识
  openid?: string           // 微信openid（可选，用于微信登录）
  name: string              // 姓名
  role: SystemRole          // 角色类型
  roleName: string          // 角色名称
  permissions: string[]     // 权限列表（为空则使用角色默认权限）
  description?: string       // 描述/备注
  status: 'active' | 'disabled'  // 状态
  createdAt: string         // 创建时间
  updatedAt: string         // 更新时间
  createdBy?: string        // 创建人
  lastLoginAt?: string      // 最后登录时间
}

// 角色默认权限映射
export const ROLE_DEFAULT_PERMISSIONS: Record<SystemRole, SystemPermission[]> = {
  super_admin: ['super_admin'],  // 特殊：表示拥有所有权限
  admin: [
    'admin:dashboard',
    'admin:course',
    'admin:category',
    'admin:member',
    'admin:permission',
    'admin:teacher',
    'admin:schedule',
    'admin:attendance',
    'admin:exam',
    'admin:practice',
    'admin:certificate',
    'admin:order',
    'admin:finance',
    'admin:page',
    'admin:banner',
    'admin:notice',
    'admin:marketing',
    'admin:comment',
    'admin:log',
    'admin:system',
    'admin:role',
  ],
  teacher: [
    'admin:dashboard',
    'admin:course',
    'admin:member',
    'admin:schedule',
    'admin:attendance',
    'course:view',
    'course:learn',
    'exam:view',
    'exam:take',
    'profile:edit',
  ],
  student: [
    'course:view',
    'course:learn',
    'exam:view',
    'exam:take',
    'certificate:view',
    'profile:edit',
  ],
  visitor: [
    'course:view',
    'profile:edit',
  ],
  anonymous: [
    'course:view',
  ],
}

// 角色名称映射
export const ROLE_LABELS: Record<SystemRole, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  teacher: '教师',
  student: '学员',
  visitor: '访客',
  anonymous: '匿名用户',
}

// 权限名称映射
export const PERMISSION_LABELS: Record<string, string> = {
  'super_admin': '超级管理员（所有权限）',
  'admin:dashboard': '仪表盘',
  'admin:course': '课程管理',
  'admin:category': '课程分类管理',
  'admin:member': '成员管理',
  'admin:permission': '权限管理',
  'admin:teacher': '教师管理',
  'admin:schedule': '排课管理',
  'admin:attendance': '出勤管理',
  'admin:exam': '考试题库管理',
  'admin:practice': '练习记录管理',
  'admin:certificate': '证书管理',
  'admin:order': '订单管理',
  'admin:finance': '财务统计',
  'admin:page': '首页配置',
  'admin:banner': '轮播图管理',
  'admin:notice': '公告管理',
  'admin:marketing': '营销工具',
  'admin:comment': '评论管理',
  'admin:log': '系统日志',
  'admin:system': '系统设置',
  'admin:role': '角色权限管理',
  'course:view': '查看课程',
  'course:learn': '学习课程',
  'exam:view': '查看考试',
  'exam:take': '参加考试',
  'certificate:view': '查看证书',
  'profile:edit': '编辑个人资料',
}

// 管理员角色选项（用于下拉选择）
export const ADMIN_ROLE_OPTIONS = [
  { value: 'super_admin', label: '超级管理员', description: '拥有所有权限' },
  { value: 'admin', label: '管理员', description: '大部分管理权限' },
  { value: 'teacher', label: '教师', description: '教学相关权限' },
]
