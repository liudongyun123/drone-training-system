/**
 * 移动端底部导航组件
 * 固定在页面底部，提供主要功能入口
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, BookOpen, FileText, User, GraduationCap } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { LoginModal } from '../auth';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  requireAuth?: boolean;
}

const navItems: NavItem[] = [
  { id: 'home', label: '首页', icon: Home, path: '/' },
  { id: 'courses', label: '课程', icon: BookOpen, path: '/courses' },
  { id: 'exams', label: '考试', icon: FileText, path: '/exams' },
  { id: 'profile', label: '我的', icon: User, path: '/profile', requireAuth: true },
];

export const MobileNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const [activeId, setActiveId] = useState('home');
  const [showLogin, setShowLogin] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // 根据当前路径设置活动项
  useEffect(() => {
    const path = location.pathname;
    const activeItem = navItems.find((item) =>
      path === item.path || (item.path !== '/' && path.startsWith(item.path))
    );
    if (activeItem) {
      setActiveId(activeItem.id);
    }
  }, [location.pathname]);

  // 滚动隐藏/显示
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const isPastThreshold = currentScrollY > 100;

      if (isScrollingDown && isPastThreshold) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleNavClick = (item: NavItem) => {
    if (item.requireAuth && !isAuthenticated) {
      setShowLogin(true);
      return;
    }
    navigate(item.path);
  };

  return (
    <>
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: isVisible ? 0 : 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:hidden"
      >
        <div className="flex items-center justify-around py-2 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`relative flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'text-[#E94560]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {/* 活动指示器 */}
                {isActive && (
                  <motion.div
                    layoutId="mobileNavIndicator"
                    className="absolute -top-1 w-8 h-1 bg-[#E94560] rounded-full"
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}

                {/* 图标容器 */}
                <div
                  className={`relative p-2 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-[#E94560]/10 scale-110'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-all duration-300 ${
                      isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'
                    }`}
                  />
                  
                  {/* 未登录标记 */}
                  {item.requireAuth && !isAuthenticated && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* 标签 */}
                <span
                  className={`text-[10px] font-medium mt-1 transition-all duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-70'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* iPhone 底部安全区域 */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </motion.nav>

      {/* 登录弹窗 */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={() => setShowLogin(false)}
        defaultTab="phone"
      />
    </>
  );
};

/**
 * 浮动操作按钮组件
 * 移动端快捷操作入口
 */
export const FloatingActionButton: React.FC<{
  onClick: () => void;
  icon: React.ElementType;
  label?: string;
}> = ({ onClick, icon: Icon, label }) => {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed right-4 bottom-24 z-40 lg:hidden flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#0F3460] to-[#1A1A2E] text-white rounded-full shadow-lg shadow-[#0F3460]/30"
    >
      <Icon className="w-5 h-5" />
      {label && <span className="text-sm font-medium">{label}</span>}
    </motion.button>
  );
};

export default MobileNav;
