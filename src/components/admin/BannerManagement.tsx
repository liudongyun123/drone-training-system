import React, { useState, useEffect } from 'react'
import { Box, Typography, Grid, Card, CardMedia, CardContent, Button, IconButton, CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material'
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, Search as SearchIcon, Link as LinkIcon } from '@mui/icons-material'
import { CloudBannerAdminService } from '../../services/CloudAdminService'
import { CloudCourseService } from '../../services/CloudCourseService'
import AdminTablePagination from './AdminTablePagination'
import ImageUploader from './ImageUploader'
import type { Course } from '@/types'
import type { Banner } from '@/types/service'

export default function BannerManagement() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null)
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    image: '',
    link: '',
    courseId: '',
    order: 0,
    status: 'active' as const,
    isHero: true, // 标记是否用于首页Hero轮播
  })
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  })

  // 分页状态
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(9)
  const [total, setTotal] = useState(0)

  // 搜索状态
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    loadBanners()
    loadCourses()
  }, [page, rowsPerPage, searchText])

  const loadBanners = async () => {
    try {
      setLoading(true)
      const offset = page * rowsPerPage
      // ✅ 优化：getAll 直接返回 total
      const result = await CloudBannerAdminService.getAll({
        offset,
        limit: rowsPerPage,
        search: searchText || undefined,
      })
      if (result.success && result.data) {
        setBanners(result.data)
        // ✅ 从 getAll 结果中获取 total
        if (result.total !== undefined) {
          setTotal(result.total)
        }
      }
    } catch (error) {
      console.error('加载轮播图失败:', error)
      setSnackbar({ open: true, message: '加载轮播图失败', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadCourses = async () => {
    try {
      const courseData = await CloudCourseService.getAll()
      setCourses(courseData)
    } catch (error) {
      console.error('加载课程列表失败:', error)
    }
  }

  const handleOpenDialog = (banner?: any) => {
    if (banner) {
      setEditMode(true)
      setSelectedBanner(banner)
      setBannerForm({
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        image: banner.image || '',
        link: banner.link || '',
        courseId: banner.courseId || '',
        order: banner.order || 0,
        status: banner.status || 'active',
        isHero: banner.isHero !== false, // 默认为true
      })
    } else {
      setEditMode(false)
      setSelectedBanner(null)
      setBannerForm({
        title: '',
        subtitle: '',
        image: '',
        link: '',
        courseId: '',
        order: banners.length,
        status: 'active',
        isHero: true,
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setSelectedBanner(null)
    setBannerForm({
      title: '',
      subtitle: '',
      image: '',
      link: '',
      courseId: '',
      order: 0,
      status: 'active',
      isHero: true,
    })
  }

  const handleSaveBanner = async () => {
    if (!bannerForm.title.trim() || !bannerForm.image.trim()) {
      setSnackbar({ open: true, message: '请填写标题和图片URL', severity: 'error' })
      return
    }

    try {
      // 处理链接逻辑：如果选择了课程，生成课程链接
      let finalLink = bannerForm.link
      if (bannerForm.courseId && !bannerForm.link) {
        // 注意：路由是 /courses/:id（复数），不是 /course/:id
        finalLink = `/courses/${bannerForm.courseId}`
      }

      const saveData = {
        ...bannerForm,
        link: finalLink,
      }

      if (editMode && selectedBanner) {
        const result = await CloudBannerAdminService.update(selectedBanner.id, saveData)
        if (result.success) {
          setSnackbar({ open: true, message: '更新成功', severity: 'success' })
          await loadBanners()
        }
      } else {
        const result = await CloudBannerAdminService.add(saveData)
        if (result.success) {
          setSnackbar({ open: true, message: '创建成功', severity: 'success' })
          await loadBanners()
        }
      }
      handleCloseDialog()
    } catch (error) {
      console.error('保存轮播图失败:', error)
      setSnackbar({ open: true, message: '保存失败', severity: 'error' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除此轮播图吗？')) return
    try {
      const result = await CloudBannerAdminService.delete(id)
      if (result.success) {
        setSnackbar({ open: true, message: '删除成功', severity: 'success' })
        await loadBanners()
      } else {
        setSnackbar({ open: true, message: '删除失败', severity: 'error' })
      }
    } catch (error) {
      console.error('删除轮播图失败:', error)
      setSnackbar({ open: true, message: '删除失败', severity: 'error' })
    }
  }

  // 获取课程标题
  const getCourseTitle = (courseId: string) => {
    const course = courses.find(c => c.id === courseId)
    return course ? course.title : ''
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">轮播图管理</Typography>
          <Chip 
            label="Hero轮播" 
            size="small" 
            color="primary" 
            variant="outlined"
            icon={<LinkIcon style={{ fontSize: 16 }} />}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索轮播图标题..."
            size="small"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value)
              setPage(0)
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            新增轮播图
          </Button>
        </Box>
      </Box>

      {banners.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography>暂无轮播图，点击上方按钮添加</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {banners.map((banner) => (
            <Grid item xs={12} sm={6} md={4} key={banner.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={banner.image}
                    alt={banner.title}
                    sx={{ objectFit: 'cover' }}
                  />
                  {banner.isHero !== false && (
                    <Chip
                      label="Hero轮播"
                      size="small"
                      color="primary"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  )}
                </Box>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" noWrap>
                    {banner.title}
                  </Typography>
                  {banner.subtitle && (
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                      {banner.subtitle}
                    </Typography>
                  )}
                  {banner.courseId && (
                    <Chip
                      label={getCourseTitle(banner.courseId) || '关联课程'}
                      size="small"
                      icon={<LinkIcon style={{ fontSize: 14 }} />}
                      sx={{ mt: 1 }}
                    />
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      排序: {banner.order}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleOpenDialog(banner)}><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(banner.id)}><DeleteIcon /></IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <AdminTablePagination
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newRowsPerPage) => setRowsPerPage(newRowsPerPage)}
      />

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? '编辑轮播图' : '新增轮播图'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="轮播图标题"
            fullWidth
            variant="outlined"
            value={bannerForm.title}
            onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="例如：无人机驾驶员培训"
          />
          <TextField
            margin="dense"
            label="副标题"
            fullWidth
            variant="outlined"
            value={bannerForm.subtitle}
            onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="例如：AOPA认证，全国通用"
          />
          {/* 图片上传 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              轮播图图片 *
            </Typography>
            <ImageUploader
              value={bannerForm.image}
              onChange={(url) => setBannerForm({ ...bannerForm, image: url })}
              maxSize={10}
              placeholder="拖拽或点击上传轮播图图片"
            />
          </Box>
          
          {/* 课程选择 */}
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>关联课程（可选）</InputLabel>
            <Select
              value={bannerForm.courseId}
              label="关联课程（可选）"
              onChange={(e) => setBannerForm({ ...bannerForm, courseId: e.target.value })}
            >
              <MenuItem value="">
                <em>不关联课程</em>
              </MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <img 
                      src={course.thumbnail} 
                      alt="" 
                      style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 4 }} 
                    />
                    <span>{course.title}</span>
                    <Chip label={`¥${course.price}`} size="small" />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label="自定义链接（可选）"
            fullWidth
            variant="outlined"
            value={bannerForm.link}
            onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="如果关联了课程，将自动生成课程链接"
            helperText="优先级：自定义链接 > 关联课程"
            disabled={!!bannerForm.courseId}
          />
          
          <TextField
            margin="dense"
            label="排序"
            fullWidth
            type="number"
            variant="outlined"
            value={bannerForm.order}
            onChange={(e) => setBannerForm({ ...bannerForm, order: Number(e.target.value) })}
            sx={{ mb: 2 }}
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSaveBanner} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  )
}
