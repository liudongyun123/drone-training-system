// ============================================================================
// 注册页面
// ============================================================================
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { sendPhoneCode, loginWithPassword } = useAuthStore();
  const navigate = useNavigate();

  const sendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await sendPhoneCode(phone);
      if (!result.success) {
        setError(result.error || '发送验证码失败');
        return;
      }
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!phone || !name || !code || !password) {
      setError('请填写完整信息');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 使用手机号+验证码登录完成注册（CloudBase 匿名注册后绑定手机号）
      const result = await loginWithPassword(phone, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || '注册失败，请重试');
      }
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body">
          {/* 返回按钮 */}
          <button
            className="btn btn-ghost btn-sm absolute top-4 left-4"
            onClick={() => navigate('/login')}
          >
            <ArrowLeft size={20} />
            返回登录
          </button>

          <h2 className="card-title text-2xl mb-6 text-center">注册</h2>

          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          {/* 用户名输入 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">用户名</span>
            </label>
            <input
              type="text"
              placeholder="请输入用户名"
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* 手机号输入 */}
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">手机号</span>
            </label>
            <input
              type="tel"
              placeholder="请输入手机号"
              className="input input-bordered"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* 验证码输入 */}
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">验证码</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="请输入验证码"
                className="input input-bordered flex-1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
              />
              <button
                className="btn"
                onClick={sendCode}
                disabled={countdown > 0 || loading}
              >
                {countdown > 0 ? `${countdown}s` : '发送验证码'}
              </button>
            </div>
          </div>

          {/* 密码输入 */}
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">密码</span>
            </label>
            <input
              type="password"
              placeholder="请设置密码（至少6位）"
              className="input input-bordered"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* 注册按钮 */}
          <button
            className="btn btn-primary w-full mt-6"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner"></span> : '注册'}
          </button>

          {/* 已有账号 */}
          <div className="text-center mt-4">
            <Link to="/login" className="link link-primary">
              已有账号？立即登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
