/**
 * 响应式布局组件
 * 适配PC、平板、手机端
 */

import React, { useState } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  BottomNavigation,
  BottomNavigationAction,
  Fab,
  useTheme,
  useMediaQuery,
  styled,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  School as SchoolIcon,
  Quiz as QuizIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import LoginModal from '../auth/LoginModal'

interface ResponsiveLayoutProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
  onBack?: () => void
  hideBottomNav?: boolean
}

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  paddingBottom: theme.spacing(10), // 为底部导航留出空间
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(8),
  },
}))

const MobileAppBar = styled(AppBar)(({ theme }) => ({
  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
}))

const DesktopSidebar = styled(Box)(({ theme }) => ({
  width: 240,
  flexShrink: 0,
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}))

const MobileBottomNav = styled(BottomNavigation)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: theme.zIndex.appBar,
  borderTop: `1px solid ${theme.palette.divider}`,
  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
}))

export default function ResponsiveLayout({
  children,
  title = '无人机培训',
  showBack = false,
  onBack,
  hideBottomNav = false,
}: ResponsiveLayoutProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()
  
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [bottomValue, setBottomValue] = useState(() => {
    const path = location.pathname
    if (path.startsWith('/course')) return 1
    if (path.startsWith('/exam')) return 2
    if (path.startsWith('/profile') || path.startsWith('/my')) return 3
    return 0
  })

  const handleBottomChange = (_: React.SyntheticEvent, newValue: number) => {
    setBottomValue(newValue)
    switch (newValue) {
      case 0:
        navigate('/')
        break
      case 1:
        navigate('/courses')
        break
      case 2:
        navigate('/exams')
        break
      case 3:
        if (isAuthenticated) {
          navigate('/profile')
        } else {
          setLoginOpen(true)
        }
        break
    }
  }

  const navItems = [
    { label: '首页', icon: <HomeIcon />, path: '/' },
    { label: '课程', icon: <SchoolIcon />, path: '/courses' },
    { label: '考试', icon: <QuizIcon />, path: '/exams' },
    { label: '我的', icon: <PersonIcon />, path: '/profile' },
  ]

  const drawerContent = (
    <Box sx={{ width: 240 }}>
      <Toolbar>
        <Typography variant="h6" noWrap>
          {title}
        </Typography>
      </Toolbar>
      <List>
        {navItems.map((item) => (
          <ListItem
            button
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => {
              navigate(item.path)
              setDrawerOpen(false)
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* 移动端顶部导航 */}
      <MobileAppBar position="fixed">
        <Toolbar>
          {showBack ? (
            <IconButton edge="start" color="inherit" onClick={onBack || (() => navigate(-1))}>
              <ArrowBackIcon />
            </IconButton>
          ) : (
            <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            {title}
          </Typography>
          {isAuthenticated && user && (
            <Typography variant="body2" color="inherit">
              {user.nickname || user.name || '用户'}
            </Typography>
          )}
        </Toolbar>
      </MobileAppBar>

      {/* 侧边栏抽屉 */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
      >
        {drawerContent}
      </Drawer>

      {/* PC端侧边栏 */}
      <DesktopSidebar>
        {drawerContent}
      </DesktopSidebar>

      {/* 主内容区 */}
      <MainContent>
        {/* 为移动端AppBar留出空间 */}
        <MobileAppBar position="relative" sx={{ mb: 2, visibility: 'hidden' }}>
          <Toolbar />
        </MobileAppBar>
        
        {children}
      </MainContent>

      {/* 移动端底部导航 */}
      {!hideBottomNav && (
        <MobileBottomNav
          value={bottomValue}
          onChange={handleBottomChange}
          showLabels
        >
          {navItems.map((item) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </MobileBottomNav>
      )}

      {/* 登录弹窗 */}
      <LoginModal
        // @ts-ignore
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => {
          // 登录成功后刷新页面或跳转
          window.location.reload()
        }}
      />
    </Box>
  )
}
