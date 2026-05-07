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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  LinearProgress,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { Delete, Edit, Add, Link as LinkIcon } from '@mui/icons-material'
import { CloudLearningPathAdminService } from '../../services/CloudAdminService'
import { categoryService } from '../../services/categoryService'
import { classService } from '../../services/classService'

interface Course {
  _id: string
  title: string
}

interface PathStage {
  order: number
  level: string
  courseId?: string
  courseTitle?: string
  classId?: string
  className?: string
}

interface LearningPath {
  _id: string
  name: string
  description: string
  categoryId?: string
  stages: PathStage[]
  status: 'active' | 'draft'
  createdAt: string
  updatedAt?: string
}

export default function LearningPathManagement() {
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [classes, setClasses] = useState<{ _id: string; name: string; status: string }[]>([]) // 开班列表
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 路径表单状态 - 新结构：按无人机类型分类，每个类型5个等级阶段
  const [pathForm, setPathForm] = useState({
    name: '',
    description: '',
    categoryId: '',  // 关联分类ID（无人机类型）
    status: 'active' as const,
    stages: [] as PathStage[],  // 5个等级的阶段：入门班、基础班、进阶班、高级班、考证班
  })

  // 培训班等级选项
  const CLASS_LEVELS = ['入门班', '基础班', '进阶班', '高级班', '考证班']

  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    loadPaths()
    loadCourses()
    loadCategories()
    loadClasses()
  }, [])

  // 加载课程分类
  const loadCategories = async () => {
    try {
      const result = await categoryService.getAllActive()
      if (result.success && result.data) {
        const categoryList = result.data.map((cat: any) => ({
          id: cat._id || cat.id,
          name: cat.name,
          code: cat.code,
        }))
        setCategories(categoryList)
      }
    } catch (err) {
      console.error('加载分类失败:', err)
    }
  }

  // 加载开班信息（班级）
  const loadClasses = async () => {
    try {
      const result = await classService.getList({ page: 1, pageSize: 100 })
      if (result.code === 0 && result.data?.list) {
        // 只显示正在招募和进行中的班级
        const activeClasses = result.data.list.filter((c: any) => 
          ['enrolling', 'in_progress'].includes(c.status)
        )
        setClasses(activeClasses.map((c: any) => ({
          _id: c._id || c.id,
          name: c.name || `班级-${c._id?.slice(-4) || ''}`,
          status: c.status,
        })))
      }
    } catch (err) {
      console.error('加载班级失败:', err)
    }
  }

  const loadPaths = async () => {
    try {
      setLoading(true)
      const result = await CloudLearningPathAdminService.getAll()
      if (result.success) {
        // ✅ 数据映射：确保字段兼容（支持新旧格式）
        const mappedData = (result.data || []).map((item: any) => ({
          _id: item._id || item.id,
          name: item.name || '',
          description: item.description || '',
          categoryId: item.categoryId || '',
          status: item.status || 'draft',
          stages: item.stages || [],
          createdAt: item.createdAt || item.created_at || '',
          updatedAt: item.updatedAt || item.updated_at || '',
        }))
        setPaths(mappedData)
      } else {
        setError('加载学习路径失败: ' + result.message)
      }
    } catch (err) {
      setError('加载学习路径失败: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const loadCourses = async () => {
    try {
      const { CloudCourseService } = await import('../../services/CloudCourseService')
      const result = await CloudCourseService.getAll()
      if (result && Array.isArray(result)) {
        const courseList = result.map((course: any) => ({
          id: course.id,
          title: course.title
        }))
        setAvailableCourses(courseList)
        setCourses(courseList)
      }
    } catch (err) {
      console.error('加载课程失败:', err)
    }
  }

  const handleOpenDialog = (path?: LearningPath) => {
    if (path) {
      setEditMode(true)
      setEditingPath(path)
      setPathForm({
        name: path.name,
        description: path.description,
        categoryId: path.categoryId || '',
        status: path.status,
        stages: [...path.stages],
      })
    } else {
      setEditMode(false)
      setEditingPath(null)
      setPathForm({
        name: '',
        description: '',
        categoryId: '',
        status: 'active',
        stages: [],
      })
    }
    setDialogOpen(true)
    setError('')
    setSuccess('')
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setEditingPath(null)
    setPathForm({
      name: '',
      description: '',
      categoryId: '',
      status: 'active',
      stages: [],
    })
  }

  // 添加阶段
  const handleAddStage = (level: string) => {
    if (pathForm.stages.find(s => s.level === level)) {
      setError(`已存在${level}阶段`)
      return
    }
    const newStage: PathStage = {
      order: pathForm.stages.length + 1,
      level,
      courseId: '',
      courseTitle: '',
      classId: '',
      className: '',
    }
    setPathForm(prev => ({
      ...prev,
      stages: [...prev.stages, newStage],
    }))
    setError('')
  }

  // 更新阶段
  const handleUpdateStage = (index: number, updates: Partial<PathStage>) => {
    setPathForm(prev => ({
      ...prev,
      stages: prev.stages.map((s, i) => i === index ? { ...s, ...updates } : s),
    }))
  }

  // 删除阶段
  const handleRemoveStage = (index: number) => {
    setPathForm(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1 })),
    }))
  }

  const handleSavePath = async () => {
    // 表单验证
    if (!pathForm.name.trim()) {
      setError('请输入路径名称')
      return
    }
    if (!pathForm.description.trim()) {
      setError('请输入路径描述')
      return
    }
    if (!pathForm.categoryId) {
      setError('请选择无人机类型分类')
      return
    }

    // 获取分类名称
    const selectedCat = categories.find(c => c.id === pathForm.categoryId)
    const categoryName = selectedCat?.name || ''

    // 准备保存的数据 - 新结构
    const pathData: any = {
      name: pathForm.name,
      description: pathForm.description,
      categoryId: pathForm.categoryId,
      category: categoryName,
      status: pathForm.status,
      stages: pathForm.stages.map((stage, index) => ({
        order: index + 1,
        level: stage.level,
        courseId: stage.courseId || '',
        courseTitle: stage.courseTitle || '',
        classId: stage.classId || '',
        className: stage.className || '',
      })),
      updatedAt: new Date().toISOString(),
    }

    if (editMode && editingPath) {
      // 编辑路径 - 调用API
      try {
        const result = await CloudLearningPathAdminService.update(editingPath.id, pathData)
        if (result.success) {
          setSuccess('学习路径更新成功')
          await loadPaths()
          setTimeout(() => {
            handleCloseDialog()
            setSuccess('')
          }, 1500)
        } else {
          setError(result.error || '更新失败')
        }
      } catch (err) {
        console.error('更新学习路径失败:', err)
        setError('更新学习路径失败')
      }
    } else {
      // 新增路径 - 调用API
      try {
        const newPathData = {
          ...pathData,
          createdAt: new Date().toISOString(),
        }
        const result = await CloudLearningPathAdminService.add(newPathData)
        if (result.success) {
          setSuccess('学习路径创建成功')
          await loadPaths()
          setTimeout(() => {
            handleCloseDialog()
            setSuccess('')
          }, 1500)
        } else {
          setError(result.error || '创建失败')
        }
      } catch (err) {
        console.error('创建学习路径失败:', err)
        setError('创建学习路径失败')
      }
    }
  }

  const handleDeletePath = async (pathId: string) => {
    if (!window.confirm('确定要删除这个学习路径吗?')) {
      return
    }
    
    try {
      const result = await CloudLearningPathAdminService.delete(pathId)
      if (result.success) {
        setSuccess('学习路径删除成功')
        await loadPaths()
        setTimeout(() => setSuccess(''), 2000)
      } else {
        setError(result.error || '删除失败')
        setTimeout(() => setError(''), 3000)
      }
    } catch (err) {
      console.error('删除学习路径失败:', err)
      setError('删除学习路径失败')
      setTimeout(() => setError(''), 3000)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'success'
      case 'intermediate':
        return 'warning'
      case 'advanced':
        return 'error'
      default:
        return 'default'
    }
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '入门'
      case 'intermediate':
        return '进阶'
      case 'advanced':
        return '高级'
      default:
        return difficulty
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'default'
  }

  const getStatusText = (status: string) => {
    return status === 'active' ? '已发布' : '草稿'
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">学习路径管理</Typography>
        <Button variant="contained" color="primary" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          新增路径
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2}>
        {paths.map((path) => (
          <Grid item xs={12} md={6} lg={4} key={path._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                    {path.name}
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog(path)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeletePath(path._id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {path.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={getStatusText(path.status)}
                    color={getStatusColor(path.status) as any}
                    size="small"
                  />
                </Box>

                {/* 学习阶段 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    学习阶段 ({path.stages?.length || 0}个)
                  </Typography>
                  {path.stages?.map((stage, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', py: 0.5, borderBottom: '1px solid #eee' }}>
                      <Chip label={`第${stage.order}阶段`} size="small" sx={{ mr: 1 }} />
                      <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                        {stage.level}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth 
        scroll="paper"
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle sx={{ pb: 1, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
          {editMode ? '编辑学习路径' : '新增学习路径'}
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 'calc(90vh - 120px)', overflow: 'auto' }}>
          <Box sx={{ mt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="路径名称"
              fullWidth
              variant="outlined"
              value={pathForm.name}
              onChange={(e) => setPathForm(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="路径描述"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={pathForm.description}
              onChange={(e) => setPathForm(prev => ({ ...prev, description: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>无人机类型</InputLabel>
                  <Select
                    value={pathForm.categoryId}
                    label="无人机类型"
                    onChange={(e) => setPathForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  >
                    {categories.map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={pathForm.status}
                    label="状态"
                    onChange={(e) => setPathForm(prev => ({ ...prev, status: e.target.value as any }))}
                  >
                    <MenuItem value="active">已发布</MenuItem>
                    <MenuItem value="draft">草稿</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* 学习阶段配置 - 5个等级 */}
            <Box sx={{ mt: 3, mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LinkIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  学习阶段配置（5个等级）
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                每个阶段可关联理论课程和实操培训班，阶段按等级顺序排列
              </Typography>

              {/* 已配置的阶段 */}
              {pathForm.stages.map((stage, index) => (
                <Box key={stage.level} sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #ddd' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Chip
                      label={`第${stage.order}阶段: ${stage.level}`}
                      color="primary"
                      size="small"
                    />
                    <IconButton size="small" color="error" onClick={() => handleRemoveStage(index)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>关联课程</InputLabel>
                        <Select
                          value={stage.courseId || ''}
                          label="关联课程"
                          onChange={(e) => {
                            const course = availableCourses.find(c => c.id === e.target.value)
                            handleUpdateStage(index, {
                              courseId: e.target.value,
                              courseTitle: course?.title || ''
                            })
                          }}
                        >
                          <MenuItem value="">无</MenuItem>
                          {availableCourses.map(course => (
                            <MenuItem key={course.id} value={course.id}>{course.title}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>关联培训班</InputLabel>
                        <Select
                          value={stage.classId || ''}
                          label="关联培训班"
                          onChange={(e) => {
                            const cls = classes.find(c => c._id === e.target.value)
                            handleUpdateStage(index, {
                              classId: e.target.value,
                              className: cls?.name || ''
                            })
                          }}
                        >
                          <MenuItem value="">无</MenuItem>
                          {classes.map(cls => (
                            <MenuItem key={cls._id} value={cls._id}>{cls.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  {stage.courseTitle && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      课程: {stage.courseTitle}
                    </Typography>
                  )}
                  {stage.className && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      培训班: {stage.className}
                    </Typography>
                  )}
                </Box>
              ))}

              {/* 添加阶段按钮 */}
              {pathForm.stages.length < 5 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    添加阶段（可选剩余等级）
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {CLASS_LEVELS.filter(level => !pathForm.stages.find(s => s.level === level)).map(level => (
                      <Chip
                        key={level}
                        label={`+ ${level}`}
                        onClick={() => handleAddStage(level)}
                        variant="outlined"
                        color="primary"
                        size="small"
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>取消</Button>
          <Button onClick={handleSavePath} variant="contained" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
