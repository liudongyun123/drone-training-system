/**
 * 账号密码登录组件
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface PasswordLoginProps {
  onLoginSuccess: () => void;
}

const PasswordLogin: React.FC<PasswordLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const { loginWithPassword } = useAuthStore();

  // 邮箱验证
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // 处理登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证
    if (!email.trim()) {
      setError('请输入邮箱地址');
      return;
    }
    if (!isValidEmail(email)) {
      setError('请输入正确的邮箱格式');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    if (password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await loginWithPassword(email, password);

    if (result.success) {
      onLoginSuccess();
    } else {
      // 根据错误类型显示不同提示
      const errorMsg = result.error || '';
      if (errorMsg.includes('not found') || errorMsg.includes('不存在')) {
        setError('该邮箱未注册，请先注册账号');
      } else if (errorMsg.includes('password') || errorMsg.includes('密码')) {
        setError('密码错误，请重新输入');
      } else if (errorMsg.includes('disabled') || errorMsg.includes('禁用')) {
        setError('账号已被禁用，请联系客服');
      } else {
        setError(errorMsg || '登录失败，请检查邮箱和密码');
      }
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-600"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">邮箱地址</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="请输入邮箱地址"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F3460] focus:border-transparent outline-none transition-all"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">密码</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="请输入密码"
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F3460] focus:border-transparent outline-none transition-all"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 text-[#0F3460] rounded border-gray-300 focus:ring-[#0F3460]"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-600">记住我</span>
        </label>
        <button
          type="button"
          className="text-sm text-[#0F3460] hover:text-[#E94560] transition-colors"
          onClick={() => alert('请联系管理员重置密码')}
        >
          忘记密码？
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading || !email || !password}
        className="w-full py-3 bg-gradient-to-r from-[#0F3460] to-[#1A1A2E] text-white rounded-lg font-medium hover:shadow-lg hover:shadow-[#0F3460]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            登录中...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            登录
          </>
        )}
      </button>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          还没有账号？{' '}
          <button
            type="button"
            className="text-[#0F3460] hover:text-[#E94560] font-medium transition-colors"
            onClick={() => alert('请联系管理员注册账号')}
          >
            联系管理员
          </button>
        </p>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-700">
          <strong>提示：</strong>账号密码登录主要用于管理员和教师。学员建议使用手机号或微信登录。
        </p>
      </div>
    </form>
  );
};

export default PasswordLogin;
