import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TicketPercent,
  Users,
  Copy,
  Check,
  ChevronRight,
  Clock,
  Gift,
  TrendingDown,
  AlertCircle,
  Search,
  ShoppingCart,
} from 'lucide-react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  LinearProgress,
  Grid,
  Tabs,
  Tab,
  Paper,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import type { Coupon, GroupBuy, Course } from '../types';
import { couponService } from '../services/couponService';
import { groupBuyService } from '../services/groupBuyService';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

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
      id={`marketing-tabpanel-${index}`}
      aria-labelledby={`marketing-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// 优惠券卡片组件
const CouponCard = ({
  coupon,
  onCopy,
  copiedCode,
}: {
  coupon: Coupon;
  onCopy: (code: string) => void;
  copiedCode: string | null;
}) => {
  const isExpired = coupon.status === 'expired';
  const isDisabled = coupon.status === 'disabled';
  const remaining = coupon.totalCount - coupon.usedCount;
  const percentUsed = (coupon.usedCount / coupon.totalCount) * 100;

  const formatDiscount = () => {
    if (coupon.type === 'fixed') {
      return `¥${coupon.value}`;
    }
    return `${coupon.value}%`;
  };

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        opacity: isExpired || isDisabled ? 0.6 : 1,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}
    >
      {/* 锯齿边缘效果 */}
      <Box
        sx={{
          position: 'absolute',
          left: 100,
          top: 0,
          bottom: 0,
          width: 20,
          backgroundImage:
            'radial-gradient(circle at 0 50%, transparent 10px, white 10px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0',
        }}
      />

      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1, pr: 4 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {formatDiscount()}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
              {coupon.type === 'fixed'
                ? `立减¥${coupon.value}`
                : `最高减¥${coupon.maxDiscount || '∞'}`}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              满¥{coupon.minAmount}可用
            </Typography>
          </Box>

          <Box sx={{ flex: 1, pl: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'monospace',
                  letterSpacing: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                }}
              >
                {coupon.code}
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="small"
              startIcon={copiedCode === coupon.code ? <Check size={16} /> : <Copy size={16} />}
              onClick={() => onCopy(coupon.code)}
              disabled={isExpired || isDisabled || copiedCode === coupon.code}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                mb: 1,
              }}
            >
              {copiedCode === coupon.code ? '已复制' : '复制'}
            </Button>

            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                剩余 {remaining} 张
              </Typography>
              <LinearProgress
                variant="determinate"
                value={percentUsed}
                sx={{
                  mt: 0.5,
                  height: 4,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'white',
                  },
                }}
              />
            </Box>
          </Box>
        </Box>

        {coupon.courseIds && coupon.courseIds.length > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(255,255,255,0.3)' }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              限指定课程使用
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* 状态标签 */}
      {(isExpired || isDisabled) && (
        <Chip
          label={isExpired ? '已过期' : '已禁用'}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
          }}
        />
      )}
    </Card>
  );
};

// 拼团卡片组件
const GroupBuyCard = ({
  groupBuy,
  course,
  onJoin,
}: {
  groupBuy: GroupBuy;
  course?: Course;
  onJoin: (groupBuy: GroupBuy) => void;
}) => {
  const navigate = useNavigate();
  const isFull = groupBuy.currentCount >= groupBuy.requiredCount;
  const isExpired = groupBuy.status === 'expired';
  const progress = (groupBuy.currentCount / groupBuy.requiredCount) * 100;
  const savings = groupBuy.originalPrice - groupBuy.price;

  return (
    <Card sx={{ overflow: 'hidden' }}>
      {course && (
        <Box
          sx={{
            height: 160,
            backgroundImage: `url(${course.coverImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              bgcolor: '#ef4444',
              color: 'white',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontWeight: 'bold',
              fontSize: '0.875rem',
            }}
          >
            省¥{savings}
          </Box>
        </Box>
      )}

      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {groupBuy.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ef4444' }}>
            ¥{groupBuy.price}
          </Typography>
          <Typography
            variant="body2"
            sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
          >
            ¥{groupBuy.originalPrice}
          </Typography>
        </Box>

        {/* 拼团进度 */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              拼团进度
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {groupBuy.currentCount}/{groupBuy.requiredCount}人
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: progress >= 100 ? '#22c55e' : '#3b82f6',
                borderRadius: 4,
              },
            }}
          />
        </Box>

        {/* 参与者头像 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AvatarGroup max={4} sx={{ mr: 1 }}>
            {Array.from({ length: groupBuy.currentCount }).map((_, i) => (
              <Avatar key={i} sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                {String.fromCharCode(65 + i)}
              </Avatar>
            ))}
            {Array.from({ length: groupBuy.requiredCount - groupBuy.currentCount }).map(
              (_, i) => (
                <Avatar
                  key={`empty-${i}`}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: 'grey.200',
                    color: 'grey.400',
                    fontSize: '0.75rem',
                  }}
                >
                  ?
                </Avatar>
              )
            )}
          </AvatarGroup>
          <Typography variant="caption" color="text.secondary">
            {isFull ? '拼团成功' : `还差 ${groupBuy.requiredCount - groupBuy.currentCount} 人`}
          </Typography>
        </Box>

        {/* 倒计时 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'warning.main',
            mb: 2,
          }}
        >
          <Clock size={14} />
          <Typography variant="caption">
            剩余 {Math.ceil((new Date(groupBuy.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} 天
          </Typography>
        </Box>

        <Button
          variant="contained"
          fullWidth
          disabled={isFull || isExpired}
          onClick={() => onJoin(groupBuy)}
          sx={{
            bgcolor: isFull ? '#22c55e' : undefined,
            '&:hover': { bgcolor: isFull ? '#16a34a' : undefined },
          }}
        >
          {isFull ? '已满员' : isExpired ? '已结束' : '立即参团'}
        </Button>
      </CardContent>
    </Card>
  );
};

// 主页面
export default function MarketingCenter() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [couponStats, setCouponStats] = useState({
    total: 0,
    active: 0,
    used: 0,
  });
  const [groupBuyStats, setGroupBuyStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupBuy, setSelectedGroupBuy] = useState<GroupBuy | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [couponRes, groupBuyRes, couponStatRes, groupBuyStatRes] = await Promise.all([
        couponService.getList(),
        groupBuyService.getList(),
        couponService.getStats(),
        groupBuyService.getStats(),
      ]);
      setCoupons(couponRes.data);
      setGroupBuys(groupBuyRes.data);
      setCouponStats(couponStatRes.data);
      setGroupBuyStats({
        total: groupBuyStatRes.data.total,
        active: groupBuyStatRes.data.active,
        completed: groupBuyStatRes.data.completed,
      });
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    showSnackbar('优惠券码已复制');
  };

  const handleJoinGroupBuy = async (groupBuy: GroupBuy) => {
    setSelectedGroupBuy(groupBuy);
    setJoinDialogOpen(true);
  };

  const confirmJoin = async () => {
    if (!selectedGroupBuy) return;

    try {
      await groupBuyService.joinGroupBuy(selectedGroupBuy._id);
      setJoinDialogOpen(false);
      showSnackbar('参团成功！');
      loadData();
    } catch (error) {
      showSnackbar(error instanceof Error ? error.message : '参团失败');
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const filteredCoupons = coupons.filter(
    c =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.status.includes(searchQuery)
  );

  if (loading) return <Loading />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      {/* 头部 */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 4, px: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          优惠中心
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          领取优惠券，参与拼团，享受更多优惠
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 4 }}>
        {/* 统计卡片 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <TicketPercent size={32} color="#3b82f6" />
              <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
                {couponStats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                优惠券总数
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Gift size={32} color="#22c55e" />
              <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
                {couponStats.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                可用优惠券
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Users size={32} color="#f59e0b" />
              <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
                {groupBuyStats.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                进行中拼团
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <TrendingDown size={32} color="#ef4444" />
              <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
                {groupBuyStats.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                成功拼团
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 标签页 */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              icon={<TicketPercent size={18} />}
              iconPosition="start"
              label="优惠券"
              sx={{ textTransform: 'none' }}
            />
            <Tab
              icon={<Users size={18} />}
              iconPosition="start"
              label="拼团活动"
              sx={{ textTransform: 'none' }}
            />
          </Tabs>

          {/* 搜索框 */}
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              placeholder={activeTab === 0 ? '搜索优惠券...' : '搜索拼团活动...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Box>

          {/* 优惠券面板 */}
          <TabPanel value={activeTab} index={0}>
            {filteredCoupons.length === 0 ? (
              <EmptyState
                icon={<TicketPercent size={48} />}
                title="暂无优惠券"
                description="暂时没有可用的优惠券"
              />
            ) : (
              <Grid container spacing={3}>
                {filteredCoupons.map(coupon => (
                  <Grid item xs={12} md={6} key={coupon._id}>
                    <CouponCard
                      coupon={coupon}
                      onCopy={handleCopyCode}
                      copiedCode={copiedCode}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          {/* 拼团面板 */}
          <TabPanel value={activeTab} index={1}>
            {groupBuys.length === 0 ? (
              <EmptyState
                icon={<Users size={48} />}
                title="暂无拼团活动"
                description="暂时没有进行中的拼团活动"
              />
            ) : (
              <Grid container spacing={3}>
                {groupBuys.map(groupBuy => (
                  <Grid item xs={12} sm={6} md={4} key={groupBuy._id}>
                    <GroupBuyCard
                      groupBuy={groupBuy}
                      onJoin={handleJoinGroupBuy}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>
        </Paper>

        {/* 使用说明 */}
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            使用说明
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  1
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    领取优惠券
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    复制优惠券码，在结算时输入即可享受优惠
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  2
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    参与拼团
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    发起或加入拼团，达到人数即可享受团购价
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* 参团确认弹窗 */}
      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认参团</DialogTitle>
        <DialogContent>
          {selectedGroupBuy && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {selectedGroupBuy.title}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                拼团价：<strong style={{ color: '#ef4444' }}>¥{selectedGroupBuy.price}</strong>
                <span
                  style={{
                    textDecoration: 'line-through',
                    color: '#6b7280',
                    marginLeft: 8,
                  }}
                >
                  ¥{selectedGroupBuy.originalPrice}
                </span>
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                参团后不可取消，请在 {Math.ceil((new Date(selectedGroupBuy.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} 天内完成支付
              </Alert>
              <Typography variant="body2" color="text.secondary">
                当前已拼 {selectedGroupBuy.currentCount}/{selectedGroupBuy.requiredCount} 人
                {selectedGroupBuy.currentCount >= selectedGroupBuy.requiredCount - 1 &&
                  '，您加入后即可成团！'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={confirmJoin} startIcon={<ShoppingCart size={18} />}>
            确认参团
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
