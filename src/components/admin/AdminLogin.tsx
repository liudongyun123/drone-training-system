import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Avatar,
  InputAdornment,
  IconButton,
} from '@mui/material'
import {
  LockOutlined as LockIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { useAuthStore } from '../../store/authStore'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // 使用 useAuthStore 获取登录函数和状态
  const { adminLogin, isAuthenticated, isAdmin } = useAuthStore()
  // 注意：不使用全局的 isLoading，使用本地的 loading 状态

  useEffect(() => {
    // 如果已登录且是管理员，跳转到后台首页
    if (isAuthenticated && isAdmin) {
      navigate('/admin')
    }
  }, [isAuthenticated, isAdmin, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username || !password) {
      setError('请输入用户名和密码')
      return
    }

    setError('')

    try {
      const result = await adminLogin(username, password)

      if (!result.success) {
        setError(result.error || result.message || '登录失败')
      }
      // 登录成功后会自动跳转
    } catch (err) {
      setError('登录失败，请稍后重试')
      console.error('登录错误:', err)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ 
              width: 64, 
              height: 64, 
              bgcolor: 'primary.main',
              mb: 2 
            }}>
              <LockIcon sx={{ fontSize: 40 }} />
            </Avatar>
            
            <Typography component="h1" variant="h4" gutterBottom>
              管理后台登录
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              请使用管理员账号登录系统
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleLogin}
            sx={{ mt: 1 }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="用户名"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="密码"
              id="password"
              autoComplete="current-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : '登录'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
}
