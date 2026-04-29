/**
 * 统一认证状态管理 - 新版
 * 支持多种登录方式：匿名、微信、手机验证码、账号密码
 * 支持角色：访客(anonymous)、学员(student)、教师(teacher)、管理员(admin)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import app, { db } from '../config/tcb'
import tcb from '../config/tcb'

export type UserRole = 'anonymous' | 'visitor' | 'student' | 'teacher' | 'admin'
export type LoginType = 'anonymous' | 'wechat' | 'phone' | 'password'

// 权限定义
export const PERMISSIONS = {
  // 前台权限
  'course:view': '查看课程',
  'course:buy': '购买课程',
  'exam:view': '查看考试',
  'exam:take': '参加考试',
  'practice:view': '查看题库',
  'practice:do': '练习题库',
  'certificate:view': '查看证书',
  'profile:edit': '编辑个人资料',
  
  // 后台权限
  'admin:dashboard': '管理仪表盘',
  'admin:course': '课程管理',
  'admin:exam': '考试题库管理',
  'admin:student': '学员管理',
  'admin:teacher': '教师管理',
  'admin:schedule': '排课管理',
  'admin:finance': '财务管理',
  'admin:order': '订单管理',
  'admin:certificate': '证书管理',
  'admin:banner': '轮播图管理',
  'admin:notice': '公告管理',
  'admin:system': '系统设置',
  'admin:all': '所有管理权限',
} as const

export type Permission = keyof typeof PERMISSIONS

// 角色权限映射
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  anonymous: ['course:view'],
  visitor: ['course:view', 'exam:view', 'practice:view'],
  student: [
    'course:view', 'course:buy',
    'exam:view', 'exam:take',
    'practice:view', 'practice:do',
    'certificate:view',
    'profile:edit'
  ],
  teacher: [
    'course:view',
    'exam:view', 'exam:take',
    'practice:view', 'practice:do',
    'profile:edit',
    'admin:dashboard', 'admin:course', 'admin:exam', 'admin:student'
  ],
  admin: ['admin:all']
}

export interface User {
  id: string
  uid?: string
  email?: string
  phone?: string
  nickname?: string
  name?: string
  avatar?: string
  role: UserRole
  loginType: LoginType
  isAnonymous: boolean
  permissions: Permission[]
  // 学员特有
  level?: 'beginner' | 'intermediate' | 'advanced'
  enrolledCourses?: string[] // 已报名课程ID列表
  progress?: {
    completedCourses: string[]
    currentCourseId?: string
    totalHours: number
  }
  // 教师特有
  teacherId?: string
  specialty?: string[]
  // 微信登录特有
  wxOpenId?: string
  _openid?: string  // CloudBase OpenID
  // 登录时间
  loginAt: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  loginError: string | null
  loginDialogOpen: boolean
  
  // 计算属性
  isLoggedIn: () => boolean
  
  // 显示/隐藏登录对话框
  showLoginDialog: () => void
  hideLoginDialog: () => void
  
  // 登录方法
  loginWithAnonymous: () => Promise<{ success: boolean; error?: string; needBindPhone?: boolean }>
  loginWithPhone: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>
  loginWithWechat: () => Promise<{ success: boolean; error?: string; needBindPhone?: boolean }>
  loginWithPassword: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  // ★ 管理员登录：支持账号密码、手机验证码两种方式
  adminLogin: (
    username: string, 
    password: string, 
    phone?: string, 
    code?: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>
  
  // 验证码
  sendPhoneCode: (phone: string) => Promise<{ success: boolean; error?: string }>
  
  // ★ 绑定手机
  bindPhone: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>
  
  // ★ 检查用户是否已绑定手机
  checkPhoneBound: () => Promise<boolean>
  
  // 登出
  logout: () => Promise<void>
  
  // 用户信息更新
  updateUserRole: (role: UserRole) => void
  updateUserInfo: (info: Partial<User>) => void
  refreshUserPermissions: () => void
  
  // 权限检查
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasRole: (role: UserRole | UserRole[]) => boolean
  
  // 课程权限
  hasCourseAccess: (courseId: string) => boolean
  canTakeExam: (examId: string) => boolean
  canPracticeBank: (bankId: string) => boolean
}

const AUTH_STORAGE_KEY = 'auth-storage'

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isLoading: false,
      loginError: null,
      loginDialogOpen: false,

      // 计算属性：是否已登录（非匿名用户）
      isLoggedIn: () => {
        const { user, isAuthenticated } = get()
        return isAuthenticated && user !== null && !user.isAnonymous
      },

      // 显示登录对话框
      showLoginDialog: () => {
        set({ loginDialogOpen: true })
      },

      // 隐藏登录对话框
      hideLoginDialog: () => {
        set({ loginDialogOpen: false })
      },

      // 匿名登录
      loginWithAnonymous: async () => {
        set({ isLoading: true, loginError: null })
        try {
          const result = await app.auth().signInAnonymously()
          const user: User = {
            id: result.user.uid,
            uid: result.user.uid,
            nickname: '游客',
            role: 'anonymous',
            loginType: 'anonymous',
            isAnonymous: true,
            permissions: ROLE_PERMISSIONS.anonymous,
            loginAt: new Date().toISOString()
          }
          set({ user, isAuthenticated: true, isLoading: false })
          return { success: true, needBindPhone: true } // 匿名登录也需要绑定手机
        } catch (error: any) {
          set({ isLoading: false, loginError: error.message })
          return { success: false, error: error.message }
        }
      },

      // 手机验证码登录（通过云函数）
      loginWithPhone: async (phone: string, code: string) => {
        set({ isLoading: true, loginError: null })
        try {
          const result = await tcb.callFunction({
            name: 'mobile-auth',
            data: {
              action: 'loginBySms',
              data: { phone, code }
            }
          })
          
          if (result.result?.success) {
            const userData = result.result.data.user
            
            // 查询 user_roles 表识别身份
            let role: UserRole = 'student'
            let isAdmin = false
            try {
              const db = tcb.database()
              const roleRes = await db.collection('user_roles')
                .where({ phone, status: 'active' })
                .limit(1)
                .get()
              
              if (roleRes.data && roleRes.data.length > 0) {
                const userRole = roleRes.data[0]
                // 管理员或教师角色
                if (['super_admin', 'admin'].includes(userRole.role)) {
                  role = 'admin'
                  isAdmin = true
                } else if (userRole.role === 'teacher') {
                  role = 'teacher'
                }
                // 保存用户角色信息
                localStorage.setItem('user_role', userRole.role)
                localStorage.setItem('user_role_name', userRole.roleName)
              }
            } catch (e) {
              console.warn('查询用户角色失败:', e)
            }
            
            const user: User = {
              id: userData._id,
              uid: userData._id,
              phone: userData.phone,
              nickname: userData.username || phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
              role: role,
              loginType: 'phone',
              isAnonymous: false,
              permissions: ROLE_PERMISSIONS[role],
              loginAt: new Date().toISOString()
            }
            // 保存 token 到本地
            localStorage.setItem('auth_token', result.result.data.token)
            localStorage.setItem('user_id', userData._id)
            localStorage.setItem('user_phone', phone)
            set({ user, isAuthenticated: true, isAdmin, isLoading: false })
            return { success: true, isAdmin }
          } else {
            const errorMsg = result.result?.error || '登录失败'
            set({ isLoading: false, loginError: errorMsg })
            return { success: false, error: errorMsg }
          }
        } catch (error: any) {
          set({ isLoading: false, loginError: error.message || '网络错误，请稍后重试' })
          return { success: false, error: error.message || '网络错误，请稍后重试' }
        }
      },

      // 发送手机验证码（通过云函数）
      sendPhoneCode: async (phone: string) => {
        try {
          const result = await tcb.callFunction({
            name: 'mobile-auth',
            data: {
              action: 'sendSmsCode',
              data: { phone }
            }
          })
          if (result.result?.success) {
            return { success: true }
          } else {
            return { success: false, error: result.result?.error || '发送验证码失败' }
          }
        } catch (error: any) {
          return { success: false, error: error.message || '网络错误，请稍后重试' }
        }
      },

      // ★ 检查用户是否已绑定手机
      checkPhoneBound: async () => {
        const { user } = get()
        if (!user) return false
        
        // 如果已有手机号，直接返回 true
        if (user.phone) return true
        
        // 如果是手机验证码登录，已有手机号
        if (user.loginType === 'phone') return true
        
        // 否则检查数据库中是否有绑定记录
        try {
          const result = await app.callFunction({
            name: 'admin',
            data: {
              action: 'list',
              collection: 'members',
              query: { _id: user.id },
              options: { limit: 1 }
            }
          })
          
          const data = result.result as any
          if (data.code === 0 && data.data?.length > 0) {
            const member = data.data[0]
            if (member.phone) {
              // 更新用户信息中的手机号
              set({ user: { ...user, phone: member.phone } })
              return true
            }
          }
          return false
        } catch (error) {
          console.error('检查手机绑定失败:', error)
          return false
        }
      },

      // ★ 绑定手机号
      bindPhone: async (phone: string, code: string) => {
        const { user } = get()
        if (!user) return { success: false, error: '请先登录' }
        
        try {
          // 1. 验证验证码
          const verifyResult = await app.auth().verifyOtp({
            phone,
            code
          })
          
          if (!verifyResult.success) {
            return { success: false, error: '验证码错误或已过期' }
          }
          
          // 2. 查找或创建用户记录
          const memberResult = await app.callFunction({
            name: 'admin',
            data: {
              action: 'list',
              collection: 'members',
              query: { phone },
              options: { limit: 1 }
            }
          }) as any
          
          if (memberResult.code === 0 && memberResult.data?.length > 0) {
            // 手机号已存在，更新关联
            const existingMember = memberResult.data[0]
            await app.callFunction({
              name: 'admin',
              data: {
                action: 'update',
                collection: 'members',
                docId: existingMember._id,
                data: {
                  authUid: user.id,
                  _openid: user._openid || user.wxOpenId, // ★ 更新 openid
                  wxOpenId: user.wxOpenId || undefined,
                  lastLoginAt: new Date().toISOString()
                }
              }
            })

            // ★ 保存手机号到 localStorage
            localStorage.setItem('user_phone', phone)

            // 更新本地用户信息
            set({ user: { ...user, phone, name: existingMember.name || user.nickname } })
          } else {
            // 手机号未注册，创建新记录
            await app.callFunction({
              name: 'admin',
              data: {
                action: 'add',
                collection: 'members',
                data: {
                  _id: user.id,
                  authUid: user.id,
                  phone,
                  name: user.nickname || user.name || '新用户',
                  wxOpenId: user.wxOpenId || undefined,
                  type: 'user',
                  role: 'student',
                  status: 'active',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              }
            })

            // ★ 保存手机号到 localStorage
            localStorage.setItem('user_phone', phone)

            // 更新本地用户信息
            set({ user: { ...user, phone } })
          }
          
          // 3. 记录手机绑定日志
          try {
            await app.callFunction({
              name: 'admin',
              data: {
                action: 'add',
                collection: 'phone_bind_logs',
                data: {
                  userId: user.id,
                  phone,
                  loginType: user.loginType,
                  boundAt: new Date().toISOString()
                }
              }
            })
          } catch (logError) {
            console.error('记录绑定日志失败:', logError)
          }
          
          return { success: true }
        } catch (error: any) {
          console.error('绑定手机失败:', error)
          return { success: false, error: error.message || '绑定失败' }
        }
      },

      // 微信登录（渐进式：可以先登录，绑定手机号在购买时进行）
      loginWithWechat: async () => {
        set({ isLoading: true, loginError: null })
        try {
          const result = await app.auth().signInWithWechat()
          const openid = result.user.wxOpenId || (result.user as any)._openid

          // 尝试获取本地存储的手机号
          const cachedPhone = localStorage.getItem('user_phone')

          const user: User = {
            id: result.user.uid,
            uid: result.user.uid,
            wxOpenId: openid,
            _openid: openid,
            nickname: result.user.nickname || '微信用户',
            avatar: result.user.avatar,
            phone: cachedPhone || undefined, // 可能有缓存的手机号
            role: cachedPhone ? 'student' : 'visitor',
            loginType: 'wechat',
            isAnonymous: false,
            permissions: cachedPhone ? ROLE_PERMISSIONS.student : ROLE_PERMISSIONS.visitor,
            loginAt: new Date().toISOString()
          }
          set({ user, isAuthenticated: true, isLoading: false })

          console.log('[Auth] 微信登录完成, phone:', cachedPhone || '未绑定')
          return { success: true, needBindPhone: !cachedPhone }
        } catch (error: any) {
          set({ isLoading: false, loginError: error.message })
          return { success: false, error: error.message }
        }
      },

      // 账号密码登录
      loginWithPassword: async (username: string, password: string) => {
        set({ isLoading: true, loginError: null })
        try {
          // 使用邮箱+密码方式（CloudBase用户名登录）
          const result = await app.auth().signInWithEmailAndPassword(username, password)

          // 从用户自定义数据中获取角色
          const userData = result.user.customData || {}
          const role: UserRole = userData.role || 'student'

          const user: User = {
            id: result.user.uid,
            uid: result.user.uid,
            email: result.user.email,
            name: userData.name || result.user.nickname || username,
            avatar: result.user.avatar,
            role: role,
            loginType: 'password',
            isAnonymous: false,
            permissions: ROLE_PERMISSIONS[role],
            teacherId: userData.teacherId,
            specialty: userData.specialty,
            loginAt: new Date().toISOString()
          }
          set({ user, isAuthenticated: true, isAdmin: role === 'admin', isLoading: false })
          return { success: true }
        } catch (error: any) {
          set({ isLoading: false, loginError: error.message })
          return { success: false, error: error.message }
        }
      },

      // ★ 管理员登录（支持账号密码和手机验证码两种方式）
      adminLogin: async (username: string, password: string, phone?: string, code?: string) => {
        set({ isLoading: true, loginError: null })
        try {
          // ★ 如果提供了手机号和验证码，验证管理员身份
          if (phone && code) {
            // 允许的管理员手机号列表（仅限超级管理员）
            const ADMIN_PHONES = ['17628157097'] // 可添加更多管理员手机号
            
            if (!ADMIN_PHONES.includes(phone)) {
              set({ isLoading: false })
              return { success: false, error: '此手机号未授权管理员登录' }
            }
            
            // 调用云函数验证验证码
            const result = await tcb.callFunction({
              name: 'mobile-auth',
              data: {
                action: 'loginBySms',
                data: { phone, code }
              }
            })
            
            if (!result.result?.success) {
              set({ isLoading: false })
              return { success: false, error: result.result?.error || '验证码错误' }
            }
            
            // 验证码验证成功，登录为管理员
            const user: User = {
              id: `admin_${phone}`,
              uid: `admin_${phone}`,
              phone: phone,
              name: '系统管理员',
              nickname: '管理员',
              avatar: '',
              role: 'admin',
              loginType: 'phone',
              isAnonymous: false,
              permissions: ROLE_PERMISSIONS.admin,
              loginAt: new Date().toISOString()
            }
            // ★ 保存手机号到 localStorage
            localStorage.setItem('user_phone', phone)
            set({ user, isAuthenticated: true, isAdmin: true, isLoading: false })
            localStorage.setItem('user_role', 'admin')
            localStorage.setItem('user_role_name', '超级管理员')
            return { success: true, message: '登录成功' }
          }
          
          // ★ 账号密码登录（仅限 admin 账号）
          // 默认管理员账号验证
          if (username === 'admin' && password === 'admin123') {
            // 初始化 CloudBase 认证状态（用于数据库安全规则验证）
            try {
              await app.auth().anonymousAuthProvider().signIn()
            } catch (e) {
              // 忽略匿名登录错误，继续执行
              console.warn('CloudBase 认证初始化失败，将使用本地存储验证')
            }
            
            // ★ 从 user_roles 集合查询管理员绑定的手机号
            const adminPhone = await (async () => {
              try {
                const db = app.database()
                const rolesRes = await db.collection('user_roles')
                  .where({ role: 'admin', status: 'active' })
                  .limit(1)
                  .get()
                if (rolesRes.data && rolesRes.data.length > 0) {
                  return rolesRes.data[0].phone
                }
              } catch (e) {
                console.warn('[Admin] 查询管理员手机号失败:', e)
              }
              return '17628157097' // 默认管理员手机号
            })()
            
            const user: User = {
              id: 'admin',
              uid: 'admin',
              phone: adminPhone,
              email: 'admin@drone-training.com',
              name: '系统管理员',
              nickname: '管理员',
              avatar: '',
              role: 'admin',
              loginType: 'password',
              isAnonymous: false,
              permissions: ROLE_PERMISSIONS.admin,
              loginAt: new Date().toISOString()
            }
            // ★ 保存手机号到 localStorage
            localStorage.setItem('user_phone', adminPhone)
            // ★ 设置管理员认证标志（AuthGuard 需要）
            localStorage.setItem('admin_auth', 'true')
            set({ user, isAuthenticated: true, isAdmin: true, isLoading: false })
            return { success: true, message: '登录成功' }
          }

          // 尝试 CloudBase 邮箱密码登录
          const result = await app.auth().signInWithEmailAndPassword(username, password)
          const userData = result.user.customData || {}
          const role: UserRole = userData.role || 'student'

          // 检查是否为管理员
          if (role !== 'admin') {
            set({ isLoading: false })
            return { success: false, error: '此账号没有管理员权限' }
          }

          const user: User = {
            id: result.user.uid,
            uid: result.user.uid,
            email: result.user.email,
            name: userData.name || result.user.nickname || username,
            avatar: result.user.avatar,
            role: 'admin',
            loginType: 'password',
            isAnonymous: false,
            permissions: ROLE_PERMISSIONS.admin,
            loginAt: new Date().toISOString()
          }
          set({ user, isAuthenticated: true, isAdmin: true, isLoading: false })
          return { success: true, message: '登录成功' }
        } catch (error: any) {
          set({ isLoading: false, loginError: error.message })
          return { success: false, error: error.message, message: error.message }
        }
      },

      // 登出
      logout: async () => {
        try {
          await app.auth().signOut()
        } catch (e) {
          console.error('登出错误:', e)
        }
        set({ user: null, isAuthenticated: false, loginError: null })
      },

      // 更新用户角色
      updateUserRole: (role: UserRole) => {
        const { user } = get()
        if (user) {
          set({
            user: {
              ...user,
              role,
              permissions: ROLE_PERMISSIONS[role]
            }
          })
        }
      },

      // 更新用户信息
      updateUserInfo: (info: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, ...info } })
        }
      },

      // 刷新用户权限（根据已购课程等）
      refreshUserPermissions: () => {
        const { user } = get()
        if (!user) return
        
        // 根据角色重新计算权限
        const basePermissions = ROLE_PERMISSIONS[user.role]
        
        // 如果是学员，检查已购课程
        if (user.role === 'student' && user.enrolledCourses) {
          // 已购课程的权限已经在角色中定义
          // 这里可以添加额外的动态权限计算
        }
        
        set({
          user: {
            ...user,
            permissions: basePermissions
          }
        })
      },

      // 权限检查方法
      hasPermission: (permission: Permission) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'admin') return true // 管理员拥有所有权限
        return user.permissions.includes(permission)
      },

      hasAnyPermission: (permissions: Permission[]) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'admin') return true
        return permissions.some(p => user.permissions.includes(p))
      },

      hasRole: (role: UserRole | UserRole[]) => {
        const { user } = get()
        if (!user) return false
        if (Array.isArray(role)) {
          return role.includes(user.role)
        }
        return user.role === role
      },

      // 课程访问权限
      hasCourseAccess: (courseId: string) => {
        const { user, hasPermission } = get()
        if (!user) return false
        
        // 管理员和教师可以访问所有课程
        if (user.role === 'admin' || user.role === 'teacher') return true
        
        // 学员检查是否已购买
        if (user.role === 'student' && user.enrolledCourses) {
          return user.enrolledCourses.includes(courseId)
        }
        
        // 访客只能查看，不能访问内容
        return hasPermission('course:view')
      },

      // 考试权限
      canTakeExam: (examId: string) => {
        const { user, hasPermission } = get()
        if (!user) return false
        if (!hasPermission('exam:take')) return false
        
        // 这里可以添加更细粒度的检查
        // 比如检查是否已报名对应课程
        return true
      },

      // 题库练习权限
      canPracticeBank: (bankId: string) => {
        const { user, hasPermission } = get()
        if (!user) return false
        if (!hasPermission('practice:do')) return false
        
        // 这里可以添加题库权限检查
        return true
      }
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// 初始化函数 - 检查登录状态
export const initAuth = async () => {
  try {
    // 添加超时机制，防止 CloudBase SDK 初始化卡住
    const timeout = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Auth initialization timeout')), 5000)
    )
    
    const loginState = await Promise.race([
      app.auth().getLoginState(),
      timeout
    ]) as any
    
    if (loginState) {
      // 用户已登录，恢复状态 - ★关键：必须设置isAuthenticated为true
      useAuthStore.setState({ isAuthenticated: true })
      const currentUser = await app.auth().getCurrentUser()
      if (currentUser) {
        const openid = (currentUser as any)._openid || currentUser.uid
        const cachedPhone = localStorage.getItem('user_phone')

        // 如果有缓存手机号，直接使用
        if (cachedPhone) {
          const { user } = useAuthStore.getState()
          if (user) {
            useAuthStore.setState({
              user: {
                ...user,
                phone: cachedPhone,
                role: 'student',
                permissions: ROLE_PERMISSIONS.student
              }
            })
            console.log('[Auth] 初始化同步手机号:', cachedPhone)
          }
        } else {
          // ★ 如果没有缓存手机号，通过 openid 从 members 集合查询
          try {
            console.log('[Auth] 未找到缓存手机号，尝试通过 openid 查询:', openid)
            const database = app.database()
            // 先尝试 openid 字段
            let membersRes = await database.collection('members')
              .where({ openid: openid })
              .limit(1)
              .get()
            
            // 如果没找到，尝试 wxOpenId 字段
            if (!membersRes.data || membersRes.data.length === 0) {
              membersRes = await database.collection('members')
                .where({ wxOpenId: openid })
                .limit(1)
                .get()
            }
            
            if (membersRes.data && membersRes.data.length > 0) {
              const member = membersRes.data[0]
              const phoneFromDb = member.phone
              if (phoneFromDb) {
                // 保存到 localStorage
                localStorage.setItem('user_phone', phoneFromDb)
                
                const { user } = useAuthStore.getState()
                if (user) {
                  useAuthStore.setState({
                    user: { ...user, phone: phoneFromDb }
                  })
                }
                console.log('[Auth] 通过 openid 查询到手机号:', phoneFromDb)
              }
            } else {
              console.log('[Auth] 通过 openid 未查询到手机号')
            }
          } catch (err) {
            console.error('[Auth] 查询手机号失败:', err)
          }
        }
        console.log('✅ 用户已登录:', currentUser.uid, ', phone:', localStorage.getItem('user_phone') || '未绑定')
      }
    }
  } catch (e) {
    console.error('初始化认证状态失败:', e)
  }
}

// 权限守卫Hook
export const usePermission = () => {
  const { hasPermission, hasAnyPermission, hasRole, user } = useAuthStore()
  return {
    can: hasPermission,
    canAny: hasAnyPermission,
    isRole: hasRole,
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    isAnonymous: user?.isAnonymous ?? true
  }
}

export default useAuthStore
