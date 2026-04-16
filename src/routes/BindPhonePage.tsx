/**
 * 绑定手机页面
 * 用于微信登录或其他登录方式后，强制绑定手机号
 * 绑定后可通过手机号关联所有用户数据
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Smartphone, Shield, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

export default function BindPhonePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sendPhoneCode, bindPhone, user } = useAuthStore()

  // 获取登录后的返回地址（默认是首页）
  const getRedirectPath = () => {
    const state = location.state as { redirect?: string } | null;
    return state?.redirect || '/courses';
  };

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 发送验证码
  const handleSendCode = async () => {
    if (countdown > 0) return

    setError('')

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }

    setSending(true)
    try {
      const result = await sendPhoneCode(phone)
      if (!result.success) {
        setError(result.error || '发送验证码失败')
        return
      }

      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(err.message || '发送验证码失败')
    } finally {
      setSending(false)
    }
  }

  // 绑定手机
  const handleBindPhone = async () => {
    if (!phone || !code) {
      setError('请输入手机号和验证码')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await bindPhone(phone, code)
      if (!result.success) {
        setError(result.error || '绑定失败，请重试')
      } else {
        setSuccess(true)
        // 2秒后跳转到目标页面
        setTimeout(() => {
          navigate(getRedirectPath())
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || '绑定失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 跳过绑定（仅在非强制模式下可用）
  const handleSkip = () => {
    navigate(getRedirectPath())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* 标题 */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">绑定手机号</h2>
          <p className="mt-2 text-sm text-gray-600">
            为了更好地为您提供服务，请绑定您的手机号
          </p>
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">为什么要绑定手机号？</p>
              <ul className="space-y-1 text-blue-600">
                <li>• 关联您的报名、课程、班级等所有数据</li>
                <li>• 方便找回账号和接收通知</li>
                <li>• 一个手机号统一管理所有权限</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 成功提示 */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div className="text-sm text-green-700">
                <p className="font-medium">绑定成功！</p>
                <p>即将跳转到首页...</p>
              </div>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* 绑定表单 */}
        {!success && (
          <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
            {/* 手机号 */}
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
                  maxLength={11}
                />
              </div>
            </div>

            {/* 验证码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="请输入验证码"
                  maxLength={6}
                />
                <button
                  onClick={handleSendCode}
                  disabled={sending || countdown > 0 || !phone}
                  className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg font-medium disabled:opacity-50 whitespace-nowrap"
                >
                  {sending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </div>

            {/* 绑定按钮 */}
            <button
              onClick={handleBindPhone}
              disabled={loading || !phone || !code}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? (
                '绑定中...'
              ) : (
                <>
                  确认绑定
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </button>

            {/* 跳过按钮 */}
            <div className="text-center pt-2">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                暂时跳过（部分功能可能受限）
              </button>
            </div>
          </div>
        )}

        {/* 当前登录方式提示 */}
        {user && (
          <div className="text-center text-sm text-gray-500">
            当前登录方式：
            <span className="font-medium text-gray-700">
              {user.loginType === 'wechat' ? '微信登录' :
               user.loginType === 'anonymous' ? '访客登录' :
               user.loginType === 'phone' ? '手机登录' :
               user.loginType === 'password' ? '密码登录' : '其他'}
            </span>
            {user.nickname && (
              <span className="ml-2">
                （{user.nickname}）
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
