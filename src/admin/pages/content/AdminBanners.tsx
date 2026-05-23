import { Box } from '@mui/material'
import BannerManagement from '@/components/admin/BannerManagement'

/**
 * 轮播图管理页面
 * 使用共享的 BannerManagement 组件
 */
export default function AdminBanners() {
  return (
    <Box sx={{ p: 3 }}>
      <BannerManagement />
    </Box>
  )
}
