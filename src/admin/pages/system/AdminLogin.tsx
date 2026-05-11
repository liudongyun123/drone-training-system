/**
 * 管理员登录页面 - 支持多种登录方式
 * 仅限超级管理员 admin 用户使用
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, User, ArrowRight, Eye, EyeOff, Phone, Mail, MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

type LoginTab = 'sms' | 'password'

// 允许的管理员手机号列表（仅限超级管理员）
// 可在此添加更多授权手机号
const ADMIN_PHONES = [
  '17628157097', // 主管理员手机号
]

export default function AdminLogin() {
  const navigate = useNavigate()
  const { isAuthenticated, isAdmin, adminLogin, sendPhoneCode } = useAuthStore()
  
  // 登录方式切换
  const [activeTab, setActiveTab] = useState<LoginTab>('password')
  
  // 账号密码登录
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // 手机验证码登录
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)
  
  // 通用状态
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 已登录则跳转
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      navigate('/admin', { replace: true })
    }
  }, [isAuthenticated, isAdmin, navigate])

  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [countdown])

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号')
      return
    }
    
    // 检查是否在允许列表中
    if (!ADMIN_PHONES.includes(phone)) {
      setError('此手机号未授权管理员登录')
      return
    }
    
    setSending(true)
    setError('')
    
    const result = await sendPhoneCode(phone)
    
    if (result.success) {
      setCountdown(60)
      setError('')
    } else {
      setError(result.error || '发送验证码失败')
    }
    
    setSending(false)
  }

  // 账号密码登录
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }
    
    setLoading(true)
    setError('')
    
    const result = await adminLogin(username, password)
    
    if (!result.success) {
      setError(result.error || '登录失败')
    }
    
    setLoading(false)
  }

  // 手机验证码登录
  const handleSmsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号')
      return
    }
    if (!code || code.length !== 6) {
      setError('请输入6位验证码')
      return
    }
    
    setLoading(true)
    setError('')
    
    const result = await adminLogin(username, password, phone, code)
    
    if (!result.success) {
      setError(result.error || '登录失败')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* 标题 */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">超级管理员登录</h2>
          <p className="mt-2 text-sm text-gray-400">仅限授权管理员使用</p>
        </div>

        {/* 登录方式切换 */}
        <div className="flex bg-gray-800/50 rounded-lg p-1">
          <button
            onClick={() => { setActiveTab('sms'); setError(''); }}
            className={`flex-1 flex items-center justify-center py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'sms'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            验证码登录
          </button>
          <button
            onClick={() => { setActiveTab('password'); setError(''); }}
            className={`flex-1 flex items-center justify-center py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'password'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 mr-2" />
            账号密码登录
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 手机验证码登录表单 */}
        {activeTab === 'sms' && (
          <form onSubmit={handleSmsLogin} className="space-y-4">
            {/* 手机号 */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="管理员手机号"
                maxLength={11}
              />
            </div>

            {/* 验证码 */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full pl-10 pr-28 py-3 bg-gray-800/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="验证码"
                maxLength={6}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0 || sending}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 rounded-md disabled:opacity-50 hover:bg-blue-500/30"
              >
                {countdown > 0 ? `${countdown}s` : sending ? '发送中...' : '获取验证码'}
              </button>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
              {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
            </button>
          </form>
        )}

        {/* 账号密码登录表单 */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            {/* 用户名 */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="用户名"
              />
            </div>

            {/* 密码 */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="密码"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
              {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
            </button>
          </form>
        )}

        {/* 返回首页 */}
        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-white"
          >
            ← 返回首页
          </button>
        </div>
      </div>
    </div>
  )
}
