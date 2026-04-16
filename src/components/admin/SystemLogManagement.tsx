import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material'
import { Search, Download, FilterList } from '@mui/icons-material'
import { CloudSystemLogAdminService } from '../../services/CloudAdminService'

interface SystemLog {
  id: string
  level: 'info' | 'warning' | 'error' | 'debug'
  module: string
  operation: string
  userId?: string
  userName?: string
  message: string
  ip?: string
  userAgent?: string
  duration?: number
  createdAt: string
}

export default function SystemLogManagement() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('today')

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const result = await CloudSystemLogAdminService.getAll()
      if (result.success && result.data) {
        setLogs(result.data)
        setFilteredLogs(result.data)
      }
    } catch (error) {
      console.error('加载系统日志失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 过滤日志
  useEffect(() => {
    let filtered = logs

    // 关键词搜索
    if (searchKeyword) {
      filtered = filtered.filter(
        log =>
          log.message.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          log.operation.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          (log.userName && log.userName.toLowerCase().includes(searchKeyword.toLowerCase()))
      )
    }

    // 等级过滤
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter)
    }

    // 模块过滤
    if (moduleFilter !== 'all') {
      filtered = filtered.filter(log => log.module === moduleFilter)
    }

    setFilteredLogs(filtered)
  }, [searchKeyword, levelFilter, moduleFilter, logs])

  const getLevelColor = (level: string) => {
    const colors = {
      info: 'info',
      warning: 'warning',
      error: 'error',
      debug: 'default',
    }
    return colors[level as keyof typeof colors] || 'default'
  }

  const getLevelText = (level: string) => {
    const texts = {
      info: '信息',
      warning: '警告',
      error: '错误',
      debug: '调试',
    }
    return texts[level as keyof typeof texts] || level
  }

  const getModuleList = () => {
    const modules = [...new Set(logs.map(log => log.module))]
    return modules
  }

  const getStats = () => {
    return {
      total: logs.length,
      info: logs.filter(l => l.level === 'info').length,
      warning: logs.filter(l => l.level === 'warning').length,
      error: logs.filter(l => l.level === 'error').length,
      debug: logs.filter(l => l.level === 'debug').length,
    }
  }

  const stats = getStats()

  const StatCard = ({ title, value, color }: any) => (
    <Card>
      <CardContent>
        <Typography color="text.secondary" gutterBottom variant="body2">
          {title}
        </Typography>
        <Typography variant="h4" color={color}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        系统日志管理
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard title="总日志数" value={stats.total} color="primary.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard title="信息" value={stats.info} color="info.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard title="警告" value={stats.warning} color="warning.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard title="错误" value={stats.error} color="error.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard title="调试" value={stats.debug} color="text.secondary" />
        </Grid>
      </Grid>

      {/* 筛选区域 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="搜索日志..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, fontSize: 20 }} />,
            }}
            sx={{ width: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>日志级别</InputLabel>
            <Select
              value={levelFilter}
              label="日志级别"
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="info">信息</MenuItem>
              <MenuItem value="warning">警告</MenuItem>
              <MenuItem value="error">错误</MenuItem>
              <MenuItem value="debug">调试</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>模块</InputLabel>
            <Select
              value={moduleFilter}
              label="模块"
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              {getModuleList().map(module => (
                <MenuItem key={module} value={module}>
                  {module}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>日期</InputLabel>
            <Select
              value={dateFilter}
              label="日期"
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <MenuItem value="today">今天</MenuItem>
              <MenuItem value="week">本周</MenuItem>
              <MenuItem value="month">本月</MenuItem>
              <MenuItem value="all">全部</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<FilterList />}>
            重置筛选
          </Button>
          <Button variant="outlined" startIcon={<Download />}>
            导出日志
          </Button>
        </Box>
      </Paper>

      {/* 日志列表 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>时间</TableCell>
              <TableCell>级别</TableCell>
              <TableCell>模块</TableCell>
              <TableCell>操作</TableCell>
              <TableCell>用户</TableCell>
              <TableCell>消息</TableCell>
              <TableCell>IP地址</TableCell>
              <TableCell>耗时</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  暂无日志数据
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.createdAt}</TableCell>
                  <TableCell>
                    <Chip
                      label={getLevelText(log.level)}
                      color={getLevelColor(log.level) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{log.module}</TableCell>
                  <TableCell>{log.operation}</TableCell>
                  <TableCell>{log.userName || '-'}</TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {log.message}
                  </TableCell>
                  <TableCell>{log.ip || '-'}</TableCell>
                  <TableCell>{log.duration ? `${log.duration}ms` : '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          显示 {filteredLogs.length} 条日志
        </Typography>
      </Box>
        </>
      )}
    </Box>
  )
}
