// ============================================================================
// 认证上下文（通过 HTTP API 实现，不再依赖 CloudBase SDK）
// ============================================================================
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminService } from '@/services/adminService';

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
      // 通过 api-auth 云函数验证 Token
      const result = await adminService.callFunction('api-auth', {
        action: 'verifyToken',
        data: {}
      });

      if (result?.success && result?.data) {
        const userData = result.data.user || result.data;
        setUser({
          uid: userData.uid || userData.openid || '',
          isAnonymous: userData.isAnonymous || false,
          email: userData.email,
          phone: userData.phone,
          user_metadata: userData.user_metadata
        });
      } else {
        setUser(null);
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
      // 匿名登录
      const result = await adminService.callFunction('api-auth', {
        action: 'wxMiniappLogin',
        data: { type: 'anonymous' }
      });

      if (result?.data) {
        const userData = result.data.user || result.data;
        setUser({
          uid: userData.uid || userData.openid || '',
          isAnonymous: true,
          email: userData.email,
          phone: userData.phone,
          user_metadata: userData.user_metadata
        });
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await adminService.callFunction('api-auth', {
        action: 'logout',
        data: {}
      });
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
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
