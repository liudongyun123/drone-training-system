// ============================================================================
// 认证上下文
// ============================================================================
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { app, ensureInit } from '@/utils/cloudbase';

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
      // 确保 SDK 初始化
      await ensureInit();
      
      // 获取登录状态和用户信息
      const auth = app.auth();
      const loginState = await auth.getLoginState();
      
      if (loginState) {
        const { data } = await auth.getUser();
        if (data?.user) {
          const cloudUser = data.user;
          setUser({
            uid: cloudUser.uid || cloudUser.id || '',
            isAnonymous: cloudUser.isAnonymous || false,
            email: cloudUser.email,
            phone: cloudUser.phone,
            user_metadata: cloudUser.user_metadata
          });
        }
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
      await ensureInit();
      const auth = app.auth();
      const loginState = await auth.getLoginState();
      
      if (!loginState) {
        // 执行匿名登录
        await auth.anonymousAuthProvider().signIn();
      }
      
      // 获取用户信息
      const { data } = await auth.getUser();
      if (data?.user) {
        const cloudUser = data.user;
        setUser({
          uid: cloudUser.uid || cloudUser.id || '',
          isAnonymous: cloudUser.isAnonymous || false,
          email: cloudUser.email,
          phone: cloudUser.phone,
          user_metadata: cloudUser.user_metadata
        });
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const auth = app.auth();
      await auth.signOut();
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
