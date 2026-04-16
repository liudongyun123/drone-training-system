// ============================================================================
// 认证上下文
// ============================================================================
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { app, checkLogin, logout as authLogout } from '@/utils/cloudbase';

interface User {
  uid: string;
  isAnonymous: boolean;
  email?: string;
  phone?: string;
  user_metadata?: {
    name?: string;
    avatarUrl?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const session = await checkLogin();
      if (session && 'uid' in session) {
        setUser(session as User);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async () => {
    try {
      // 使用 checkLogin 防止并发请求
      const session = await checkLogin();
      if (session && 'uid' in session) {
        setUser(session as User);
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authLogout();
      setUser(null);
    } catch (error) {
      console.error('退出登录失败:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isLoggedIn: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
