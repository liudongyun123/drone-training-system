import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import { 
  MessageCircle, 
  Phone, 
  User, 
  EyeOff, 
  CheckCircle, 
  XCircle,
  Settings,
  Pencil,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  Shield,
  Users,
  Plus as Add
} from 'lucide-react';
import systemConfigService, { ALL_PERMISSIONS, SystemConfig, LoginProviderConfig, RolePermission } from '@/services/systemConfigService';
import { toast } from '@/components/Toast';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const AuthConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [providers, setProviders] = useState<LoginProviderConfig[]>([]);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  
  // 微信配置
  const [wechatConfig, setWechatConfig] = useState({
    appId: '',
    appSecret: '',
    enabled: false,
  });

  const [loading, setLoading] = useState(false);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 角色编辑对话框
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RolePermission | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // 新建角色
  const [newRoleDialogOpen, setNewRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    role: '',
    name: '',
    description: '',
    permissions: [] as string[],
  });

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await systemConfigService.getSystemConfig();
      setConfig(data);
      setProviders(data.loginProviders);
      setRoles(data.roles);
      if (data.wechatConfig) {
        setWechatConfig(data.wechatConfig);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      setMessage({ type: 'error', text: '加载配置失败' });
    } finally {
      setLoading(false);
    }
  };

  // 切换登录方式
  const handleToggleProvider = async (providerId: string, enabled: boolean) => {
    setSavingProvider(providerId);
    try {
      const success = await systemConfigService.updateLoginProvider(providerId, enabled);
      if (success) {
        setProviders(prev => prev.map(p => 
          p.id === providerId ? { ...p, enabled } : p
        ));
        toast.success(`${getProviderName(providerId)}已${enabled ? '启用' : '禁用'}`);
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      console.error('更新登录方式失败:', error);
      toast.error('更新失败，请重试');
      // 恢复原状态
      await loadConfig();
    } finally {
      setSavingProvider(null);
    }
  };

  const getProviderName = (id: string) => {
    const names: Record<string, string> = {
      phone: '手机验证码登录',
      username: '账号密码登录',
      anonymous: '匿名登录',
      wechat: '微信登录',
    };
    return names[id] || id;
  };

  // 保存微信配置
  const handleSaveWechatConfig = async () => {
    if (!wechatConfig.appId || !wechatConfig.appSecret) {
      toast.error('请填写完整的AppID和AppSecret');
      return;
    }

    setLoading(true);
    try {
      const success = await systemConfigService.updateWechatConfig({
        ...wechatConfig,
        enabled: true,
      });

      if (success) {
        toast.success('微信登录配置已保存');
        setProviders(prev => prev.map(p => 
          p.id === 'wechat' ? { ...p, enabled: true } : p
        ));
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('保存微信配置失败:', error);
      toast.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 打开角色编辑对话框
  const handleEditRole = (role: RolePermission) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions);
    setRoleDialogOpen(true);
  };

  // 保存角色权限
  const handleSaveRolePermissions = async () => {
    if (!editingRole) return;

    setLoading(true);
    try {
      const success = await systemConfigService.updateRolePermissions(
        editingRole.role,
        selectedPermissions
      );
      if (success) {
        toast.success('角色权限已更新');
        setRoles(prev => prev.map(r => 
          r.role === editingRole.role ? { ...r, permissions: selectedPermissions } : r
        ));
        setRoleDialogOpen(false);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('保存角色权限失败:', error);
      toast.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 切换权限选择
  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  // 创建新角色
  const handleCreateRole = async () => {
    if (!newRole.role || !newRole.name) {
      toast.error('请填写角色标识和名称');
      return;
    }

    setLoading(true);
    try {
      const success = await systemConfigService.createCustomRole({
        role: newRole.role,
        name: newRole.name,
        description: newRole.description,
        permissions: newRole.permissions,
      });
      if (success) {
        toast.success('角色创建成功');
        await loadConfig();
        setNewRoleDialogOpen(false);
        setNewRole({ role: '', name: '', description: '', permissions: [] });
      } else {
        throw new Error('创建失败');
      }
    } catch (error) {
      console.error('创建角色失败:', error);
      toast.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 删除角色
  const handleDeleteRole = async (role: RolePermission) => {
    if (role.isSystem) {
      toast.error('系统角色不能删除');
      return;
    }

    if (!confirm(`确定要删除角色 "${role.name}" 吗？`)) return;

    setLoading(true);
    try {
      const success = await systemConfigService.deleteCustomRole(role.role);
      if (success) {
        toast.success('角色已删除');
        await loadConfig();
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      toast.error('删除失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 按类别分组权限
  const permissionsByCategory = ALL_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof ALL_PERMISSIONS>);

  const getProviderIcon = (id: string) => {
    switch (id) {
      case 'wechat': return <MessageCircle size={24} color="#07c160" />;
      case 'phone': return <Phone size={24} color="#1976d2" />;
      case 'username': return <User size={24} color="#ff9800" />;
      case 'anonymous': return <EyeOff size={24} color="#757575" />;
      default: return <Settings size={24} />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          系统设置
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={18} />}
          onClick={loadConfig}
          disabled={loading}
        >
          刷新配置
        </Button>
      </Box>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Tabs 
        value={activeTab} 
        onChange={(_, v) => setActiveTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab 
          icon={<Shield size={18} />} 
          iconPosition="start" 
          label="登录方式管理" 
        />
        <Tab 
          icon={<Users size={18} />} 
          iconPosition="start" 
          label="角色权限管理" 
        />
      </Tabs>

      {/* 登录方式管理 */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          {/* 登录方式列表 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  登录方式管理
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  启用或禁用各种登录方式，只有启用的登录方式才会在用户登录界面显示
                </Typography>

                {providers.map((provider) => (
                  <Paper
                    key={provider.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      border: '1px solid',
                      borderColor: provider.enabled ? 'success.main' : 'divider',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: provider.enabled ? 'success.dark' : 'grey.400',
                        bgcolor: 'grey.50',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {getProviderIcon(provider.id)}
                      
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {provider.name}
                        </Typography>
                        <Chip
                          size="small"
                          icon={provider.enabled ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          label={provider.enabled ? '已启用' : '已禁用'}
                          color={provider.enabled ? 'success' : 'default'}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {savingProvider === provider.id && (
                        <CircularProgress size={20} />
                      )}
                      <Switch
                        checked={provider.enabled}
                        onChange={(e) => handleToggleProvider(provider.id, e.target.checked)}
                        disabled={loading || savingProvider === provider.id}
                      />
                    </Box>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* 微信登录配置 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MessageCircle color="#07c160" />
                  微信登录配置
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  请在微信开放平台注册应用并获取AppID和AppSecret
                </Typography>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>配置步骤：</strong>
                  </Typography>
                  <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
                    <li>访问 微信开放平台 (open.weixin.qq.com)</li>
                    <li>注册开发者账号并创建网站应用</li>
                    <li>填写授权回调域：rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com</li>
                    <li>获取AppID和AppSecret并填写下方</li>
                  </ol>
                </Alert>

                <TextField
                  fullWidth
                  label="AppID"
                  value={wechatConfig.appId}
                  onChange={(e) => setWechatConfig(prev => ({ ...prev, appId: e.target.value }))}
                  placeholder="wx****************"
                  sx={{ mb: 2 }}
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="AppSecret"
                  type="password"
                  value={wechatConfig.appSecret}
                  onChange={(e) => setWechatConfig(prev => ({ ...prev, appSecret: e.target.value }))}
                  placeholder="********************************"
                  sx={{ mb: 3 }}
                  disabled={loading}
                />

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleSaveWechatConfig}
                  disabled={loading || !wechatConfig.appId || !wechatConfig.appSecret}
                  startIcon={loading ? <CircularProgress size={20} /> : <Save size={20} />}
                >
                  {loading ? '保存中...' : '保存微信配置'}
                </Button>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" gutterBottom>
                  当前回调地址
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                    https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com/__auth/
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* 角色权限管理 */}
      <TabPanel value={activeTab} index={1}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <div>
                <Typography variant="h6">
                  角色权限管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理系统角色及其权限，系统角色不可删除
                </Typography>
              </div>
              <Button
                variant="contained"
                startIcon={<Add size={18} />}
                onClick={() => setNewRoleDialogOpen(true)}
              >
                新建角色
              </Button>
            </Box>

            <Grid container spacing={2}>
              {roles.map((role) => (
                <Grid item xs={12} sm={6} md={4} key={role.role}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      borderLeft: 4, 
                      borderColor: role.isSystem ? 'primary.main' : 'success.main',
                      position: 'relative',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {role.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                          {role.role}
                        </Typography>
                        {role.isSystem && (
                          <Chip 
                            size="small" 
                            label="系统" 
                            color="primary" 
                            sx={{ ml: 1, height: 20 }} 
                          />
                        )}
                      </Box>
                      <Box>
                        <Tooltip title="编辑权限">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditRole(role)}
                            disabled={loading}
                          >
                            <Pencil size={18} />
                          </IconButton>
                        </Tooltip>
                        {!role.isSystem && (
                          <Tooltip title="删除角色">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRole(role)}
                            disabled={loading}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                      {role.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      <Badge badgeContent={role.permissions.length} color="primary">
                        <Chip 
                          size="small" 
                          label="权限数" 
                          variant="outlined"
                        />
                      </Badge>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* 编辑角色权限对话框 */}
      <Dialog 
        open={roleDialogOpen} 
        onClose={() => setRoleDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          编辑角色权限 - {editingRole?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {editingRole?.description}
          </Typography>
          
          {Object.entries(permissionsByCategory).map(([category, perms]) => (
            <Box key={category} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                {category}权限
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={1}>
                  {perms.map((perm) => (
                    <Grid item xs={12} sm={6} key={perm.key}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedPermissions.includes(perm.key)}
                            onChange={() => togglePermission(perm.key)}
                          />
                        }
                        label={perm.label}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>
            取消
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveRolePermissions}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} /> : <Save size={18} />}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新建角色对话框 */}
      <Dialog 
        open={newRoleDialogOpen} 
        onClose={() => setNewRoleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建角色</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="角色标识"
            value={newRole.role}
            onChange={(e) => setNewRole(prev => ({ ...prev, role: e.target.value }))}
            placeholder="如: custom_role"
            sx={{ mb: 2, mt: 1 }}
            helperText="唯一标识，只能包含字母、数字和下划线"
          />
          <TextField
            fullWidth
            label="角色名称"
            value={newRole.name}
            onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
            placeholder="如: 客服专员"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="角色描述"
            value={newRole.description}
            onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
            placeholder="描述该角色的职责范围"
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            选择权限
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
            {ALL_PERMISSIONS.map((perm) => (
              <FormControlLabel
                key={perm.key}
                control={
                  <Checkbox
                    checked={newRole.permissions.includes(perm.key)}
                    onChange={() => {
                      setNewRole(prev => ({
                        ...prev,
                        permissions: prev.permissions.includes(perm.key)
                          ? prev.permissions.filter(p => p !== perm.key)
                          : [...prev.permissions, perm.key]
                      }));
                    }}
                  />
                }
                label={`${perm.category} - ${perm.label}`}
                sx={{ display: 'block' }}
              />
            ))}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRoleDialogOpen(false)}>
            取消
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateRole}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} /> : <Plus size={18} />}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuthConfig;
