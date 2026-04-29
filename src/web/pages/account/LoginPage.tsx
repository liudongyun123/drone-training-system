/**
 * 用户登录页面
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { User, Mail, Smartphone, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, MessageCircle, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithAnonymous, loginWithPhone, loginWithWechat, loginWithPassword, sendPhoneCode } = useAuthStore()
  
  // 获取登录后的返回地址
  const getRedirectPath = () => {
    const state = location.state as { redirect?: string } | null;
    return state?.redirect || '/courses';
  };

  const [activeTab, setActiveTab] = useState<'phone' | 'email' | 'password' | 'wechat'>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 发送验证码
  const handleSendCode = async () => {
    if (countdown > 0) return

    setError('')

    if (activeTab === 'phone') {
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        setError('请输入正确的手机号')
        return
      }
      const result = await sendPhoneCode(phone)
      if (!result.success) {
        setError(result.error || '发送验证码失败')
        return
      }
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('请输入正确的邮箱地址')
        return
      }
      setError('邮箱验证码功能暂未开放，请使用手机号登录')
      return
    }

    setCodeSent(true)
    setCountdown(60)

    // 倒计时
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 登录
  const handleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      let result
      if (activeTab === 'password') {
        // 密码登录
        if (!email || !password) {
          setError('请输入邮箱和密码')
          setLoading(false)
          return
        }
        result = await loginWithPassword(email, password)
      } else if (activeTab === 'phone') {
        // 手机验证码登录
        if (!phone || !code) {
          setError('请输入手机号和验证码')
          setLoading(false)
          return
        }
        result = await loginWithPhone(phone, code)
      } else {
        // 邮箱验证码登录
        setError('邮箱验证码功能暂未开放，请使用手机号登录')
        setLoading(false)
        return
      }

      if (!result.success) {
        setError(result.error || '登录失败，请重试')
      } else {
        // 登录成功
        // 跳转到绑定手机页面（如果需要）
        if (result.needBindPhone) {
          navigate('/bind-phone', { state: { redirect: getRedirectPath() } })
        } else {
          navigate(getRedirectPath())
        }
      }
    } catch (err) {
      setError('登录失败，请稍后重试')
      console.error('登录错误:', err)
    }

    setLoading(false)
  }

  // 微信登录
  const handleWechatLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const result = await loginWithWechat()
      if (!result.success) {
        setError(result.error || '微信登录失败')
      } else {
        // 跳转到绑定手机页面
        if (result.needBindPhone) {
          navigate('/bind-phone', { state: { redirect: getRedirectPath() } })
        } else {
          navigate(getRedirectPath())
        }
      }
    } catch (err) {
      setError('微信登录失败，请稍后重试')
      console.error('微信登录错误:', err)
    }

    setLoading(false)
  }

  // 匿名登录
  const handleAnonymousLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const result = await loginWithAnonymous()
      if (!result.success) {
        setError(result.error || '匿名登录失败')
      } else {
        // 跳转到绑定手机页面
        if (result.needBindPhone) {
          navigate('/bind-phone', { state: { redirect: getRedirectPath() } })
        } else {
          navigate(getRedirectPath())
        }
      }
    } catch (err) {
      setError('匿名登录失败，请稍后重试')
      console.error('匿名登录错误:', err)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* 标题 */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <User className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">欢迎回来</h2>
          <p className="mt-2 text-sm text-gray-600">请选择登录方式</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 登录方式切换 */}
        <div className="flex justify-center space-x-1 bg-white p-1 rounded-lg shadow-sm flex-wrap">
          {[
            { id: 'phone', label: '短信登录', icon: Smartphone },
            { id: 'email', label: '邮箱登录', icon: Mail },
            { id: 'password', label: '密码登录', icon: Lock },
            { id: 'wechat', label: '微信登录', icon: MessageCircle },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any)
                setError('')
                setCodeSent(false)
              }}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4 mr-1" />
              {item.label}
            </button>
          ))}
        </div>

        {/* 表单 */}
        <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
          {/* 手机号 */}
          {activeTab === 'phone' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="请输入手机号"
                />
              </div>
            </div>
          )}

          {/* 邮箱 */}
          {(activeTab === 'email' || activeTab === 'password') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="请输入邮箱"
                />
              </div>
            </div>
          )}

          {/* 密码 */}
          {activeTab === 'password' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="请输入密码"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {/* 验证码 */}
          {(activeTab === 'phone' || activeTab === 'email') && codeSent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="请输入验证码"
                  maxLength={6}
                />
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium disabled:opacity-50 whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : '重新发送'}
                </button>
              </div>
            </div>
          )}

          {/* 微信登录 */}
          {activeTab === 'wechat' && (
            <div className="text-center py-8">
              <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-16 h-16 text-green-500" />
              </div>
              <p className="text-gray-600 mb-2">请使用微信扫一扫登录</p>
              <p className="text-sm text-gray-400">PC端微信登录功能需要在微信开放平台配置</p>
            </div>
          )}

          {/* 主按钮 */}
          {activeTab === 'wechat' ? (
            <button
              onClick={() => setError('微信登录需要在后台配置AppID和AppSecret')}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium"
            >
              <MessageCircle className="mr-2 w-5 h-5" />
              微信一键登录
            </button>
          ) : (activeTab === 'phone' || activeTab === 'email') && !codeSent ? (
            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              获取验证码
            </button>
          ) : (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
              {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
            </button>
          )}
        </div>

          {/* 匿名登录 */}
        <button
          onClick={handleAnonymousLogin}
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <User className="mr-2 w-5 h-5" />
          {loading ? '登录中...' : '访客浏览'}
        </button>

        {/* 注册提示 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            还没有账号？
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 hover:text-blue-700 font-medium ml-1"
            >
              立即注册
            </button>
          </p>
        </div>

        {/* 管理员入口 */}
        <div className="text-center pt-4 border-t border-gray-200">
          <button
            onClick={() => navigate('/admin/login')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 mr-1" />
            管理员登录
          </button>
        </div>
      </div>
    </div>
  )
}
