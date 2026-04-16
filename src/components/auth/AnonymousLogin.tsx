/**
 * 匿名登录/游客访问组件
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Loader2, BookOpen, Eye, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface AnonymousLoginProps {
  onLoginSuccess: () => void;
}

const AnonymousLogin: React.FC<AnonymousLoginProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { loginWithAnonymous } = useAuthStore();

  // 处理匿名登录
  const handleAnonymousLogin = async () => {
    setIsLoading(true);
    setError('');

    const result = await loginWithAnonymous();

    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error || '游客登录失败，请重试');
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

      <div className="text-center space-y-4">
        {/* 图标 */}
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#0F3460]/10 to-[#E94560]/10 rounded-full flex items-center justify-center">
          <User className="w-10 h-10 text-[#0F3460]" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800">游客访问</h3>
          <p className="text-sm text-gray-500 mt-1">无需注册，快速浏览课程内容</p>
        </div>

        {/* 权限说明 */}
        <div className="bg-gray-50 rounded-xl p-4 text-left">
          <p className="text-sm font-medium text-gray-700 mb-3">游客权限：</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Eye className="w-4 h-4 text-green-500" />
              <span>浏览所有课程信息</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Eye className="w-4 h-4 text-green-500" />
              <span>查看课程大纲和介绍</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <BookOpen className="w-4 h-4" />
              <span className="line-through">学习课程内容（需登录）</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <BookOpen className="w-4 h-4" />
              <span className="line-through">参加考试和练习（需登录）</span>
            </div>
          </div>
        </div>

        {/* 登录按钮 */}
        <button
          onClick={handleAnonymousLogin}
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-[#0F3460] to-[#1A1A2E] text-white rounded-lg font-medium hover:shadow-lg hover:shadow-[#0F3460]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              进入中...
            </>
          ) : (
            <>
              <User className="w-5 h-5" />
              以游客身份进入
            </>
          )}
        </button>

        {/* 升级提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-3 bg-[#E94560]/5 border border-[#E94560]/20 rounded-lg"
        >
          <p className="text-sm text-gray-600">
            想要完整学习体验？
          </p>
          <button
            onClick={() => alert('请切换到"手机登录"或"微信登录"完成注册')}
            className="inline-flex items-center gap-1 text-sm text-[#E94560] font-medium hover:underline mt-1"
          >
            立即注册学员账号
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      <div className="text-center text-xs text-gray-400">
        <p>游客数据仅在当前设备保存，清除浏览器数据后将丢失</p>
      </div>
    </div>
  );
};

export default AnonymousLogin;
