/**
 * 统一登录弹窗组件
 * 支持多种登录方式切换
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Smartphone, MessageSquare, Lock } from 'lucide-react';
import PhoneLogin from './PhoneLogin';
import WechatLogin from './WechatLogin';
import PasswordLogin from './PasswordLogin';
import AnonymousLogin from './AnonymousLogin';

export type LoginTab = 'phone' | 'wechat' | 'password' | 'anonymous';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  defaultTab?: LoginTab;
}

const tabs = [
  { id: 'phone' as LoginTab, label: '手机登录', icon: Smartphone },
  { id: 'wechat' as LoginTab, label: '微信登录', icon: MessageSquare },
  { id: 'password' as LoginTab, label: '账号密码', icon: Lock },
  { id: 'anonymous' as LoginTab, label: '游客访问', icon: User },
];

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  defaultTab = 'phone',
}) => {
  const [activeTab, setActiveTab] = useState<LoginTab>(defaultTab);

  const handleLoginSuccess = () => {
    onLoginSuccess?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* 弹窗容器 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* 头部 */}
              <div className="relative bg-gradient-to-r from-[#1A1A2E] via-[#16213E] to-[#0F3460] px-6 py-6">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold text-white">欢迎登录</h2>
                <p className="text-white/70 text-sm mt-1">选择登录方式开始您的学习之旅</p>
              </div>

              {/* 标签页切换 */}
              <div className="flex border-b border-gray-200">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex flex-col items-center py-3 px-2 text-xs font-medium transition-all ${
                        activeTab === tab.id
                          ? 'text-[#E94560] border-b-2 border-[#E94560] bg-[#E94560]/5'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* 登录内容区 */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 'phone' && (
                      <PhoneLogin onLoginSuccess={handleLoginSuccess} />
                    )}
                    {activeTab === 'wechat' && (
                      <WechatLogin onLoginSuccess={handleLoginSuccess} />
                    )}
                    {activeTab === 'password' && (
                      <PasswordLogin onLoginSuccess={handleLoginSuccess} />
                    )}
                    {activeTab === 'anonymous' && (
                      <AnonymousLogin onLoginSuccess={handleLoginSuccess} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 底部提示 */}
              <div className="px-6 pb-4 text-center">
                <p className="text-xs text-gray-400">
                  登录即表示您同意我们的
                  <a href="#" className="text-[#0F3460] hover:underline mx-1">服务条款</a>
                  和
                  <a href="#" className="text-[#0F3460] hover:underline mx-1">隐私政策</a>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;
