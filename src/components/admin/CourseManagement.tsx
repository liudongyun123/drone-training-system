import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  InputAdornment,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { CloudCourseAdminService } from '../../services/CloudAdminService'
import AdminTablePagination from './AdminTablePagination'
import ImageUpload from './ImageUpload'
import type { Course } from '@/types/service'

// 等级转换函数 - 将旧值转换为正确等级
const getLevelLabel = (level: string) => {
  // 已经是正确的等级
  const validLevels = ['初级工', '中级工', '高级工', '技师', '高级技师']
  if (validLevels.includes(level)) {
    return level
  }
  // 旧值转换映射
  const levelMap: Record<string, string> = {
    'beginner': '初级工',
    'intermediate': '中级工',
    'advanced': '高级工',
    '初级': '初级工',
    '中级': '中级工',
    '高级': '高级工',
    '入门': '初级工',
    '进阶': '中级工',
  }
  return levelMap[level] || '初级工'
}

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    level: '初级工' as string,
    price: 0,
    originalPrice: 0,
    category: '',
    categoryId: '',
    thumbnail: '',
    duration: 0,
    status: 'published' as const,
  })
  // 分类列表
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([])
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
    loadCourses()
    loadCategories()
  }, [page, rowsPerPage, searchText])

  // 加载分类列表
  const loadCategories = async () => {
    try {
      const { app } = await import('../../utils/cloudbase')
      const result = await app.database().collection('categories').orderBy('sort', 'asc').get()
      setCategories(result.data || [])
    } catch (error) {
      console.error('加载分类失败:', error)
      // 使用默认分类（与 categories 集合一致）
      setCategories([
        { _id: '1', name: '植保无人机' },
        { _id: '2', name: '安防无人机' },
        { _id: '3', name: '航拍无人机' },
        { _id: '4', name: '物流无人机' },
        { _id: '5', name: '应急无人机' },
        { _id: '6', name: '电力巡检无人机' },
      ])
    }
  }

  const loadCourses = async () => {
    try {
      setLoading(true)
      const offset = page * rowsPerPage
      // ✅ 优化：getAll 直接返回 total，不需要单独调用 count()
      const result = await CloudCourseAdminService.getAll({
        offset,
        limit: rowsPerPage,
        search: searchText || undefined,
      })
      if (result.success && result.data) {
        setCourses(result.data)
        // ✅ 从 getAll 结果中获取 total
        if (result.total !== undefined) {
          setTotal(result.total)
        }
      }
    } catch (error) {
      console.error('加载课程失败:', error)
      setSnackbar({ open: true, message: '加载课程失败', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (course?: any) => {
    if (course) {
      setEditMode(true)
      setSelectedCourse(course)
      setCourseForm({
        title: course.title,
        description: course.description,
        level: course.level,
        price: course.price,
        originalPrice: course.originalPrice || 0,
        category: course.category || '',
        categoryId: course.categoryId || '',
        thumbnail: course.thumbnail || '',
        duration: course.duration || 0,
        status: course.status || 'published',
      })
} else {
      setEditMode(false)
      setSelectedCourse(null)
      setCourseForm({
        title: '',
        description: '',
        level: '初级工',
        price: 0,
        originalPrice: 0,
        category: '',
        categoryId: '',
        thumbnail: '',
        duration: 0,
        status: 'published',
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setSelectedCourse(null)
    // @ts-ignore
    setCourseForm({
      title: '',
      description: '',
      level: '初级工',
      price: 0,
      originalPrice: 0,
      category: '',
      thumbnail: '',
      duration: 0,
      status: 'published',
    })
  }

  const handleSaveCourse = async () => {
    if (!courseForm.title.trim()) {
      setSnackbar({ open: true, message: '请输入课程标题', severity: 'error' })
      return
    }

    try {
      if (editMode && selectedCourse) {
        const result = await CloudCourseAdminService.update(selectedCourse.id, courseForm)
        if (result.success) {
          setSnackbar({ open: true, message: '更新成功', severity: 'success' })
          await loadCourses()
          handleCloseDialog()
        } else {
          setSnackbar({ open: true, message: result.error || '更新失败', severity: 'error' })
        }
      } else {
        const result = await CloudCourseAdminService.add(courseForm)
        if (result.success) {
          setSnackbar({ open: true, message: '创建成功', severity: 'success' })
          await loadCourses()
          handleCloseDialog()
        } else {
          setSnackbar({ open: true, message: result.error || '创建失败', severity: 'error' })
        }
      }
    } catch (error) {
      console.error('保存课程失败:', error)
      setSnackbar({ open: true, message: '保存失败', severity: 'error' })
    }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('确定要删除此课程吗？')) return
    console.log('[删除课程] 开始删除, id:', id)
    try {
      const result = await CloudCourseAdminService.delete(id)
      console.log('[删除课程] 服务返回结果:', result)
      if (result.success) {
        // 立即从本地状态中移除已删除的课程
        setCourses(prev => prev.filter(course => course.id !== id))
        setTotal(prev => Math.max(0, prev - 1))
        setSnackbar({ open: true, message: '删除成功', severity: 'success' })
        // 重新加载确保数据同步
        await loadCourses()
      } else {
        console.error('[删除课程] 失败:', result.error)
        setSnackbar({ open: true, message: result.error || '删除失败', severity: 'error' })
      }
    } catch (error) {
      console.error('[删除课程] 异常:', error)
      setSnackbar({ open: true, message: '删除失败', severity: 'error' })
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">课程管理</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索课程标题或描述..."
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
            新增课程
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {courses.map((course) => (
          <Grid item xs={12} sm={6} md={4} key={course.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label={getLevelLabel(course.level)} size="small" color="primary" />
                    <Chip label={course.category || '未分类'} size="small" color="secondary" />
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog(course)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteCourse(course.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography variant="h6" gutterBottom>{course.title}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {course.description}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Typography variant="body1" color="primary" fontWeight="bold">
                    ¥{course.price}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    // @ts-ignore
                    // @ts-ignore
                    {course.salesCount || 0}人学习
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <AdminTablePagination
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newRowsPerPage) => setRowsPerPage(newRowsPerPage)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? '编辑课程' : '新增课程'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              autoFocus
              label="课程标题"
              fullWidth
              value={courseForm.title}
              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
            />
            <TextField
              label="课程描述"
              fullWidth
              multiline
              rows={3}
              value={courseForm.description}
              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>难度级别</InputLabel>
                  <Select
                    value={courseForm.level}
                    label="难度级别"
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value as any })}
                  >
                    <MenuItem value="初级工">初级工</MenuItem>
                    <MenuItem value="中级工">中级工</MenuItem>
                    <MenuItem value="高级工">高级工</MenuItem>
                    <MenuItem value="技师">技师</MenuItem>
                    <MenuItem value="高级技师">高级技师</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>分类</InputLabel>
                  <Select
                    value={courseForm.categoryId}
                    label="分类"
                    onChange={(e) => {
                      const selectedCat = categories.find(c => c._id === e.target.value)
                      setCourseForm({ 
                        ...courseForm, 
                        categoryId: e.target.value,
                        category: selectedCat?.name || ''
                      })
                    }}
                  >
                    <MenuItem value="">请选择分类</MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="价格"
                  fullWidth
                  type="number"
                  value={courseForm.price}
                  onChange={(e) => setCourseForm({ ...courseForm, price: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="原价"
                  fullWidth
                  type="number"
                  value={courseForm.originalPrice}
                  onChange={(e) => setCourseForm({ ...courseForm, originalPrice: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="时长(小时)"
                  fullWidth
                  type="number"
                  value={courseForm.duration}
                  onChange={(e) => setCourseForm({ ...courseForm, duration: Number(e.target.value) })}
                />
              </Grid>
            </Grid>
            <ImageUpload
              label="封面图片"
              value={courseForm.thumbnail}
              onChange={(url) => setCourseForm({ ...courseForm, thumbnail: url })}
            />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={courseForm.status}
                label="状态"
                onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value as any })}
              >
                <MenuItem value="published">已发布</MenuItem>
                <MenuItem value="draft">草稿</MenuItem>
                <MenuItem value="archived">已归档</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSaveCourse} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
