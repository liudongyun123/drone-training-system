import React, { useState, useEffect } from 'react'
import { Box, Typography, Button, IconButton, Dialog, DialogContent, Slide, Chip } from '@mui/material'
import { Close, Launch, Announcement } from '@mui/icons-material'
import { TransitionProps } from '@mui/material/transitions'
import { CloudNoticeService } from '@/services/CloudNoticeService'

interface Notice {
  id: string
  title: string
  content: string
  type: 'class' | 'course' | 'general' | 'system'
  linkType: 'none' | 'classRegistration' | 'coursePurchase' | 'custom'
  linkId?: string
  linkUrl?: string
  linkText?: string
  popupStyle: 'modal' | 'banner' | 'toast'
}

interface NoticePopupProps {
  onClose?: () => void
}

// 弹窗过渡动画
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="down" ref={ref} {...props} />
})

export default function NoticePopup({ onClose }: NoticePopupProps) {
  const [popupNotice, setPopupNotice] = useState<Notice | null>(null)
  const [open, setOpen] = useState(false)
  const [bannerOpen, setBannerOpen] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(false)
  
  // 检查是否已经关闭过
  const POPUP_KEY = 'notice_popup_closed'
  const POPUP_DATE_KEY = 'notice_popup_date'
  
  const checkAndShowPopup = async () => {
    try {
      // 获取弹窗公告
      const result = await CloudNoticeService.getPopupNotice()
      
      if (result.success && result.data) {
        const notice = result.data as Notice
        
        // 检查是否今天已经关闭过
        const today = new Date().toDateString()
        const lastClosed = localStorage.getItem(POPUP_DATE_KEY)
        const closedNotices = JSON.parse(localStorage.getItem(POPUP_KEY) || '[]')
        
        if (closedNotices.includes(notice.id) && lastClosed === today) {
          return // 今天已经关闭过
        }
        
        setPopupNotice(notice)
        
        // 根据弹窗样式显示
        if (notice.popupStyle === 'banner') {
          setBannerVisible(true)
        } else if (notice.popupStyle === 'modal') {
          setOpen(true)
        } else {
          // toast 暂时显示为 banner
          setBannerVisible(true)
        }
      }
    } catch (error) {
      console.error('获取弹窗公告失败:', error)
    }
  }

  useEffect(() => {
    checkAndShowPopup()
  }, [])

  // 关闭弹窗
  const handleClose = () => {
    setOpen(false)
    
    // 记录关闭状态
    if (popupNotice) {
      const closedNotices = JSON.parse(localStorage.getItem(POPUP_KEY) || '[]')
      if (!closedNotices.includes(popupNotice.id)) {
        closedNotices.push(popupNotice.id)
        localStorage.setItem(POPUP_KEY, JSON.stringify(closedNotices))
        localStorage.setItem(POPUP_DATE_KEY, new Date().toDateString())
      }
    }
    
    onClose?.()
  }

  // 关闭顶部横幅
  const handleBannerClose = () => {
    setBannerVisible(false)
    
    if (popupNotice) {
      const closedNotices = JSON.parse(localStorage.getItem(POPUP_KEY) || '[]')
      if (!closedNotices.includes(popupNotice.id)) {
        closedNotices.push(popupNotice.id)
        localStorage.setItem(POPUP_KEY, JSON.stringify(closedNotices))
        localStorage.setItem(POPUP_DATE_KEY, new Date().toDateString())
      }
    }
  }

  // 获取跳转链接
  const getLinkUrl = () => {
    if (!popupNotice) return '/'
    
    switch (popupNotice.linkType) {
      case 'classRegistration':
        return `/registration/class/${popupNotice.linkId}`
      case 'coursePurchase':
        return `/course/${popupNotice.linkId}`
      case 'custom':
        return popupNotice.linkUrl || '/'
      default:
        return '/'
    }
  }

  // 跳转到链接
  const handleLinkClick = () => {
    window.location.href = getLinkUrl()
  }

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'class': return '开班公告'
      case 'course': return '课程公告'
      case 'system': return '系统通知'
      default: return '公告'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'class': return 'primary'
      case 'course': return 'secondary'
      case 'system': return 'error'
      default: return 'default'
    }
  }

  if (!popupNotice) return null

  return (
    <>
      {/* 顶部横幅样式 */}
      {bannerVisible && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            bgcolor: 'primary.main',
            color: 'white',
            py: 1.5,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            boxShadow: 3,
            animation: 'slideDown 0.3s ease-out',
            '@keyframes slideDown': {
              from: { transform: 'translateY(-100%)' },
              to: { transform: 'translateY(0)' },
            },
          }}
        >
          <Announcement sx={{ fontSize: 20 }} />
          <Typography sx={{ flex: 1, textAlign: 'center' }}>
            {popupNotice.title}
          </Typography>
          {popupNotice.linkType !== 'none' && (
            <Button
              size="small"
              variant="contained"
              onClick={handleLinkClick}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' },
                minWidth: 'auto',
                px: 2,
              }}
              startIcon={<Launch />}
            >
              {popupNotice.linkText || '查看详情'}
            </Button>
          )}
          <IconButton size="small" onClick={handleBannerClose} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>
      )}

      {/* 模态弹窗样式 */}
      <Dialog
        open={open}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            overflow: 'hidden',
          },
        }}
      >
        {/* 弹窗头部 */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Announcement />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {popupNotice.title}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          {/* 类型标签 */}
          <Chip
            label={getTypeLabel(popupNotice.type)}
            color={getTypeColor(popupNotice.type) as any}
            size="small"
            sx={{ mb: 2 }}
          />

          {/* 公告内容 */}
          <Typography
            sx={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.8,
              color: 'text.primary',
              mb: 3,
            }}
          >
            {popupNotice.content}
          </Typography>

          {/* 跳转按钮 */}
          {popupNotice.linkType !== 'none' && (
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleLinkClick}
              startIcon={<Launch />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: 'bold',
                textTransform: 'none',
              }}
            >
              {popupNotice.linkText || (popupNotice.linkType === 'classRegistration' ? '立即报名' : '查看详情')}
            </Button>
          )}

          {/* 今日不再提示 */}
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mt: 2, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
            onClick={handleClose}
          >
            今日不再提示
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  )
}
