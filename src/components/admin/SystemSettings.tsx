import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Alert,
  Tabs,
  Tab,
  Paper,
} from '@mui/material'
import { Save, CloudUpload } from '@mui/icons-material'

interface SystemConfig {
  basic: {
    siteName: string
    siteLogo: string
    siteUrl: string
    adminEmail: string
    icp: string
  }
  security: {
    enableCaptcha: boolean
    passwordMinLength: number
    sessionTimeout: number
    maxLoginAttempts: number
    enableTwoFactor: boolean
  }
  storage: {
    uploadMaxSize: number
    allowedFormats: string
    storageType: 'local' | 'qcloud' | 'aliyun'
    cdnDomain: string
  }
  notification: {
    enableEmail: boolean
    emailSmtp: string
    emailPort: number
    emailUsername: string
    enableSms: boolean
    smsProvider: string
  }
}

export default function SystemSettings() {
  const [tabValue, setTabValue] = useState(0)
  const [success, setSuccess] = useState('')

  const [config, setConfig] = useState<SystemConfig>({
    basic: {
      siteName: '在线学习平台',
      siteLogo: '',
      siteUrl: 'https://example.com',
      adminEmail: 'admin@example.com',
      icp: 'ICP备案号',
    },
    security: {
      enableCaptcha: true,
      passwordMinLength: 6,
      sessionTimeout: 7200,
      maxLoginAttempts: 5,
      enableTwoFactor: false,
    },
    storage: {
      uploadMaxSize: 100,
      allowedFormats: 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx',
      storageType: 'qcloud',
      cdnDomain: 'cdn.example.com',
    },
    notification: {
      enableEmail: true,
      emailSmtp: 'smtp.example.com',
      emailPort: 587,
      emailUsername: 'noreply@example.com',
      enableSms: true,
      smsProvider: 'qcloud',
    },
  })

  const handleSave = () => {
    setSuccess('配置保存成功!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleBasicChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      basic: { ...prev.basic, [field]: value },
    }))
  }

  const handleSecurityChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      security: { ...prev.security, [field]: value },
    }))
  }

  const handleStorageChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      storage: { ...prev.storage, [field]: value },
    }))
  }

  const handleNotificationChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      notification: { ...prev.notification, [field]: value },
    }))
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        系统设置
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="基础设置" />
          <Tab label="安全设置" />
          <Tab label="存储设置" />
          <Tab label="通知设置" />
        </Tabs>

        {/* 基础设置 */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  基础配置
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="站点名称"
                      value={config.basic.siteName}
                      onChange={(e) => handleBasicChange('siteName', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="站点URL"
                      value={config.basic.siteUrl}
                      onChange={(e) => handleBasicChange('siteUrl', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="管理员邮箱"
                      value={config.basic.adminEmail}
                      onChange={(e) => handleBasicChange('adminEmail', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="ICP备案号"
                      value={config.basic.icp}
                      onChange={(e) => handleBasicChange('icp', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="站点LOGO"
                      value={config.basic.siteLogo}
                      onChange={(e) => handleBasicChange('siteLogo', e.target.value)}
                      helperText="输入图片URL或上传图片"
                      sx={{ mb: 2 }}
                      InputProps={{
                        endAdornment: (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CloudUpload />}
                          >
                            上传
                          </Button>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                  >
                    保存配置
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* 安全设置 */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  安全配置
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.security.enableCaptcha}
                          onChange={(e) => handleSecurityChange('enableCaptcha', e.target.checked)}
                        />
                      }
                      label="启用验证码"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="密码最小长度"
                      type="number"
                      value={config.security.passwordMinLength}
                      onChange={(e) => handleSecurityChange('passwordMinLength', Number(e.target.value))}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="会话超时时间(秒)"
                      type="number"
                      value={config.security.sessionTimeout}
                      onChange={(e) => handleSecurityChange('sessionTimeout', Number(e.target.value))}
                      helperText="7200秒 = 2小时"
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="最大登录尝试次数"
                      type="number"
                      value={config.security.maxLoginAttempts}
                      onChange={(e) => handleSecurityChange('maxLoginAttempts', Number(e.target.value))}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.security.enableTwoFactor}
                          onChange={(e) => handleSecurityChange('enableTwoFactor', e.target.checked)}
                        />
                      }
                      label="启用双因素认证"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                  >
                    保存配置
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* 存储设置 */}
        {tabValue === 2 && (
          <Box sx={{ p: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  存储配置
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="上传文件最大大小(MB)"
                      type="number"
                      value={config.storage.uploadMaxSize}
                      onChange={(e) => handleStorageChange('uploadMaxSize', Number(e.target.value))}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="允许的文件格式"
                      value={config.storage.allowedFormats}
                      onChange={(e) => handleStorageChange('allowedFormats', e.target.value)}
                      helperText="多个格式用逗号分隔"
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      fullWidth
                      label="存储类型"
                      value={config.storage.storageType}
                      onChange={(e) => handleStorageChange('storageType', e.target.value)}
                      SelectProps={{ native: true }}
                      sx={{ mb: 2 }}
                    >
                      <option value="local">本地存储</option>
                      <option value="qcloud">腾讯云COS</option>
                      <option value="aliyun">阿里云OSS</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="CDN域名"
                      value={config.storage.cdnDomain}
                      onChange={(e) => handleStorageChange('cdnDomain', e.target.value)}
                      helperText="留空则不使用CDN"
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                  >
                    保存配置
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* 通知设置 */}
        {tabValue === 3 && (
          <Box sx={{ p: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  邮件通知
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.notification.enableEmail}
                          onChange={(e) => handleNotificationChange('enableEmail', e.target.checked)}
                        />
                      }
                      label="启用邮件通知"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SMTP服务器"
                      value={config.notification.emailSmtp}
                      onChange={(e) => handleNotificationChange('emailSmtp', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SMTP端口"
                      type="number"
                      value={config.notification.emailPort}
                      onChange={(e) => handleNotificationChange('emailPort', Number(e.target.value))}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="发件人邮箱"
                      value={config.notification.emailUsername}
                      onChange={(e) => handleNotificationChange('emailUsername', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  短信通知
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.notification.enableSms}
                          onChange={(e) => handleNotificationChange('enableSms', e.target.checked)}
                        />
                      }
                      label="启用短信通知"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      label="短信服务商"
                      value={config.notification.smsProvider}
                      onChange={(e) => handleNotificationChange('smsProvider', e.target.value)}
                      SelectProps={{ native: true }}
                    >
                      <option value="qcloud">腾讯云短信</option>
                      <option value="aliyun">阿里云短信</option>
                      <option value="netease">网易云信</option>
                    </TextField>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                  >
                    保存配置
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
