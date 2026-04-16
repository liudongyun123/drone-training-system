/**
 * 微信登录组件
 * 支持扫码登录和微信内授权登录
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Loader2, QrCode, Smartphone, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface WechatLoginProps {
  onLoginSuccess: () => void;
}

const WechatLogin: React.FC<WechatLoginProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'qrcode' | 'mobile'>('qrcode');
  const [isWechatBrowser, setIsWechatBrowser] = useState(false);

  const { loginWithWechat } = useAuthStore();

  // 检测是否在微信浏览器内
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWechat = ua.includes('micromessenger');
    setIsWechatBrowser(isWechat);
    if (isWechat) {
      setMode('mobile');
    }
  }, []);

  // 处理微信登录
  const handleWechatLogin = async () => {
    setIsLoading(true);
    setError('');

    const result = await loginWithWechat();

    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error || '微信登录失败，请重试');
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
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

      {/* 模式切换 */}
      {!isWechatBrowser && (
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('qrcode')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'qrcode'
                ? 'bg-white text-[#0F3460] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <QrCode className="w-4 h-4" />
            扫码登录
          </button>
          <button
            onClick={() => setMode('mobile')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'mobile'
                ? 'bg-white text-[#0F3460] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            手机登录
          </button>
        </div>
      )}

      {mode === 'qrcode' ? (
        <div className="text-center space-y-4">
          {/* 二维码区域 */}
          <div className="bg-[#07C160]/5 rounded-xl p-6 border-2 border-dashed border-[#07C160]/20">
            <div className="w-48 h-48 mx-auto bg-white rounded-lg shadow-sm flex items-center justify-center relative overflow-hidden">
              {/* 这里应该显示真实的二维码图片 */}
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-[#07C160] mx-auto mb-2" />
                <p className="text-xs text-gray-400">请使用微信扫码</p>
              </div>
              {/* 扫描动画 */}
              <motion.div
                className="absolute inset-x-0 h-0.5 bg-[#07C160]/50"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              请使用微信扫一扫登录
            </p>
            <p className="text-xs text-gray-400">
              刷新页面可重新获取二维码
            </p>
          </div>

          {/* 模拟登录按钮（实际项目中应该通过轮询二维码状态） */}
          <button
            onClick={handleWechatLogin}
            disabled={isLoading}
            className="w-full py-3 bg-[#07C160] hover:bg-[#06ad56] text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                登录中...
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5" />
                模拟微信登录
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          {isWechatBrowser ? (
            <>
              <div className="bg-[#07C160]/5 rounded-xl p-6">
                <MessageSquare className="w-16 h-16 text-[#07C160] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">微信授权登录</h3>
                <p className="text-sm text-gray-500">
                  点击下方按钮授权微信登录
                </p>
              </div>

              <button
                onClick={handleWechatLogin}
                disabled={isLoading}
                className="w-full py-3 bg-[#07C160] hover:bg-[#06ad56] text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    授权中...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-5 h-5" />
                    微信一键登录
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="bg-gray-50 rounded-xl p-6">
                <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">手机微信登录</h3>
                <p className="text-sm text-gray-500">
                  在手机上打开微信，搜索"无人机培训"小程序
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg text-left">
                <p className="text-sm text-blue-700 font-medium mb-2">操作步骤：</p>
                <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
                  <li>打开微信，点击右上角"+"</li>
                  <li>选择"扫一扫"扫描上方二维码</li>
                  <li>或在小程序搜索"无人机培训"</li>
                  <li>点击授权登录即可</li>
                </ol>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
        <MessageSquare className="w-3 h-3" />
        <span>微信登录将获取您的公开信息（昵称、头像）</span>
      </div>
    </div>
  );
};

export default WechatLogin;
