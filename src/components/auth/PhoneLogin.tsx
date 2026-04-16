/**
 * 手机验证码登录组件
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Shield, Loader2, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface PhoneLoginProps {
  onLoginSuccess: () => void;
}

const PhoneLogin: React.FC<PhoneLoginProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');

  const { sendPhoneCode, loginWithPhone } = useAuthStore();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 手机号验证
  const isValidPhone = (phone: string) => {
    return /^1[3-9]\d{9}$/.test(phone);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!isValidPhone(phone)) {
      setError('请输入正确的手机号码');
      return;
    }

    setIsSending(true);
    setError('');

    const result = await sendPhoneCode(phone);

    if (result.success) {
      setCountdown(60);
      setStep('code');
      // 自动聚焦第一个验证码输入框
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else {
      setError(result.error || '发送验证码失败，请重试');
    }

    setIsSending(false);
  };

  // 验证码输入处理
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    // 自动聚焦下一个输入框
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // 自动提交
    if (index === 5 && value) {
      const fullCode = [...newCode.slice(0, 5), value].join('');
      if (fullCode.length === 6) {
        handleLogin(fullCode);
      }
    }
  };

  // 处理键盘事件（删除键回退）
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 粘贴验证码
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setCode(newCode);

    // 聚焦到最后一个输入的框
    const lastIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastIndex]?.focus();

    if (pastedData.length === 6) {
      handleLogin(pastedData);
    }
  };

  // 登录
  const handleLogin = async (fullCode?: string) => {
    const finalCode = fullCode || code.join('');
    if (finalCode.length !== 6) {
      setError('请输入完整的6位验证码');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    const result = await loginWithPhone(phone, finalCode);

    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error || '登录失败，请检查验证码');
      // 清空验证码
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }

    setIsLoggingIn(false);
  };

  // 重新发送
  const handleResend = () => {
    if (countdown > 0) return;
    handleSendCode();
  };

  // 返回手机号输入
  const handleBack = () => {
    setStep('phone');
    setCode(['', '', '', '', '', '']);
    setError('');
  };

  return (
    <div className="space-y-4">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-600"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {error}
        </motion.div>
      )}

      {step === 'phone' ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">手机号码</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));
                  setError('');
                }}
                placeholder="请输入11位手机号码"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F3460] focus:border-transparent outline-none transition-all"
                maxLength={11}
              />
            </div>
          </div>

          <button
            onClick={handleSendCode}
            disabled={!isValidPhone(phone) || isSending}
            className="w-full py-3 bg-gradient-to-r from-[#0F3460] to-[#1A1A2E] text-white rounded-lg font-medium hover:shadow-lg hover:shadow-[#0F3460]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                发送中...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                获取验证码
              </>
            )}
          </button>
        </>
      ) : (
        <>
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">
              验证码已发送至{' '}
              <span className="font-medium text-[#0F3460]">
                {phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">验证码</label>
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F3460] focus:border-[#0F3460] outline-none transition-all"
                  maxLength={1}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => handleLogin()}
            disabled={code.join('').length !== 6 || isLoggingIn}
            className="w-full py-3 bg-gradient-to-r from-[#0F3460] to-[#1A1A2E] text-white rounded-lg font-medium hover:shadow-lg hover:shadow-[#0F3460]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                登录中...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                立即登录
              </>
            )}
          </button>

          <div className="flex justify-between text-sm">
            <button
              onClick={handleBack}
              className="text-gray-500 hover:text-[#0F3460] transition-colors"
            >
              更换手机号
            </button>
            <button
              onClick={handleResend}
              disabled={countdown > 0}
              className="text-[#0F3460] hover:text-[#E94560] disabled:text-gray-400 transition-colors"
            >
              {countdown > 0 ? `${countdown}秒后重发` : '重新发送'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PhoneLogin;
