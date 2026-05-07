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
import { Delete, Edit, Add, Link as LinkIcon, School as SchoolIcon } from '@mui/icons-material'
import { CloudLearningPathAdminService } from '../../services/CloudAdminService'
import { categoryService } from '../../services/categoryService'
import { classService } from '../../services/classService'

interface Course {
  id: string
  title: string
}

interface PathItem {
  id: string
  courseId: string
  course: Course
  order: number
}

interface LearningPath {
  id: string
  name: string
  description: string
  category: string
  categoryIds?: string[]  // 绑定的课程分类ID列表
  classIds?: string[]     // 绑定的开班信息（班级）ID列表
  classNames?: string[]   // 绑定的开班信息名称列表
  items: PathItem[]
  estimatedHours: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  status: 'active' | 'draft'
  createdAt: string
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

  // 路径表单状态
  const [pathForm, setPathForm] = useState({
    name: '',
    description: '',
    category: '',
    categoryIds: [] as string[],  // 绑定的课程分类ID列表
    classIds: [] as string[],     // 绑定的开班信息ID列表
    classNames: [] as string[],   // 绑定的开班信息名称列表
    difficulty: 'beginner' as const,
    estimatedHours: 0,
    status: 'active' as const,
    items: [] as PathItem[],
  })

  // 新增课程项
  const [selectedCourseId, setSelectedCourseId] = useState('')

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
          id: item._id || item.id,
          name: item.name || '',
          description: item.description || '',
          category: item.category || '',
          // 兼容新旧格式：单选 → 多选
          categoryIds: item.categoryIds || (item.categoryId ? [item.categoryId] : []),
          classIds: item.classIds || (item.classId ? [item.classId] : []),
          classNames: item.classNames || (item.className ? [item.className] : []),
          difficulty: item.difficulty || 'beginner',
          estimatedHours: item.estimatedHours || item.estimated_hours || 0,
          status: item.status || 'draft',
          items: (item.items || []).map((it: any, index: number) => ({
            id: it._id || `item-${index}`,
            courseId: it.courseId || it.course_id || '',
            course: it.course || { id: it.courseId, title: it.courseTitle || '' },
            order: it.order || index + 1,
          })),
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
        category: path.category,
        categoryIds: path.categoryIds || [],
        classIds: path.classIds || [],
        classNames: path.classNames || [],
        // @ts-ignore
        difficulty: path.difficulty,
        estimatedHours: path.estimatedHours,
        // @ts-ignore
        status: path.status,
        items: [...path.items],
      })
    } else {
      setEditMode(false)
      setEditingPath(null)
      setPathForm({
        name: '',
        description: '',
        category: '',
        categoryIds: [],
        classIds: [],
        classNames: [],
        difficulty: 'beginner',
        estimatedHours: 0,
        status: 'active',
        items: [],
      })
    }
    setDialogOpen(true)
    setError('')
    setSuccess('')
    setSelectedCourseId('')
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setEditingPath(null)
    setPathForm({
      name: '',
      description: '',
      category: '',
      categoryIds: [],
      classIds: [],
      classNames: [],
      difficulty: 'beginner',
      estimatedHours: 0,
      status: 'active',
      items: [],
    })
    setSelectedCourseId('')
  }

  const handleAddCourse = () => {
    if (!selectedCourseId) return

    const course = availableCourses.find(c => c.id === selectedCourseId)
    if (!course) return

    const newItem: PathItem = {
      id: `item_${Date.now()}`,
      courseId: selectedCourseId,
      course,
      order: pathForm.items.length + 1,
    }

    setPathForm(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }))
    setSelectedCourseId('')
  }

  const handleRemoveCourse = (itemId: string) => {
    setPathForm(prev => ({
      ...prev,
      items: prev.items
        .filter(item => item.id !== itemId)
        .map((item, index) => ({ ...item, order: index + 1 })),
    }))
  }

  const handleMoveCourse = (itemId: string, direction: 'up' | 'down') => {
    const items = [...pathForm.items]
    const index = items.findIndex(item => item.id === itemId)

    if (direction === 'up' && index > 0) {
      [items[index], items[index - 1]] = [items[index - 1], items[index]]
    } else if (direction === 'down' && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]]
    }

    setPathForm(prev => ({
      ...prev,
      items: items.map((item, idx) => ({ ...item, order: idx + 1 })),
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
    if (!pathForm.category.trim()) {
      setError('请输入路径分类')
      return
    }
    // 如果选择了分类绑定，自动填充分类名称
    if (pathForm.categoryIds.length > 0 && !pathForm.category) {
      const selectedCats = categories.filter(c => pathForm.categoryIds.includes(c.id))
      if (selectedCats.length > 0) {
        setPathForm(prev => ({ ...prev, category: selectedCats.map(c => c.name).join('、') }))
      }
    }

    // 准备保存的数据
    const pathData: any = {
      name: pathForm.name,
      description: pathForm.description,
      category: pathForm.category,
      difficulty: pathForm.difficulty,
      estimatedHours: pathForm.estimatedHours,
      status: pathForm.status,
      items: pathForm.items.map((item, index) => ({
        courseId: item.courseId,
        courseTitle: item.course?.title || '',
        order: index + 1,
      })),
      updatedAt: new Date().toISOString(),
    }

    // 如果选择了多个分类绑定，添加到数据中
    if (pathForm.categoryIds.length > 0) {
      pathData.categoryIds = pathForm.categoryIds
      // 自动填充分类名称（多个用顿号分隔）
      const selectedCats = categories.filter(c => pathForm.categoryIds.includes(c.id))
      if (selectedCats.length > 0 && !pathForm.category) {
        pathData.category = selectedCats.map(c => c.name).join('、')
      }
    }

    // 如果选择了多个开班信息绑定，添加到数据中
    if (pathForm.classIds.length > 0) {
      pathData.classIds = pathForm.classIds
      const selectedClasses = classes.filter(c => pathForm.classIds.includes(c._id))
      if (selectedClasses.length > 0) {
        pathData.classNames = selectedClasses.map(c => c.name)
      }
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
          <Grid item xs={12} md={6} lg={4} key={path.id}>
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
                      onClick={() => handleDeletePath(path.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {path.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={path.category} size="small" variant="outlined" />
                  <Chip
                    label={getDifficultyText(path.difficulty)}
                    color={getDifficultyColor(path.difficulty) as any}
                    size="small"
                  />
                  <Chip
                    label={getStatusText(path.status)}
                    color={getStatusColor(path.status) as any}
                    size="small"
                  />
                </Box>

                {/* 绑定的分类信息 */}
                {path.categoryIds && path.categoryIds.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      绑定分类:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {path.categoryIds.map((catId, idx) => {
                        const cat = categories.find(c => c.id === catId)
                        return cat ? (
                          <Chip key={idx} label={cat.name} size="small" color="primary" variant="outlined" />
                        ) : null
                      })}
                    </Box>
                  </Box>
                )}

                {/* 关联的班级信息 */}
                {path.classIds && path.classIds.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      关联班级:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {path.classIds.map((clsId, idx) => {
                        const cls = classes.find(c => c._id === clsId)
                        return cls ? (
                          <Chip key={idx} label={cls.name} size="small" color="secondary" variant="outlined" />
                        ) : null
                      })}
                    </Box>
                  </Box>
                )}

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    包含课程: {path.items.length} 门
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    预计时长: {path.estimatedHours} 小时
                  </Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    课程列表:
                  </Typography>
                  {path.items.map((item, index) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 0.5,
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      <Typography variant="caption" sx={{ mr: 1, minWidth: 20 }}>
                        {index + 1}.
                      </Typography>
                      <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                        {item.course.title}
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
                <TextField
                  margin="dense"
                  label="路径分类"
                  fullWidth
                  variant="outlined"
                  value={pathForm.category}
                  onChange={(e) => setPathForm(prev => ({ ...prev, category: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>难度等级</InputLabel>
                  <Select
                    value={pathForm.difficulty}
                    label="难度等级"
                    onChange={(e) => setPathForm(prev => ({ ...prev, difficulty: e.target.value as any }))}
                  >
                    <MenuItem value="beginner">入门</MenuItem>
                    <MenuItem value="intermediate">进阶</MenuItem>
                    <MenuItem value="advanced">高级</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  margin="dense"
                  label="预计时长(小时)"
                  fullWidth
                  type="number"
                  variant="outlined"
                  value={pathForm.estimatedHours}
                  onChange={(e) => setPathForm(prev => ({ ...prev, estimatedHours: Number(e.target.value) }))}
                />
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

            {/* 课程分类绑定 - 支持多选 */}
            <Box sx={{ mt: 3, mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LinkIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  绑定课程分类（支持多选）
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                选择课程分类后，该学习路径将自动展示各分类下的所有课程，可同时绑定多个分类
              </Typography>
              
              {/* 分类多选 */}
              <Autocomplete
                multiple
                options={categories}
                getOptionLabel={(option) => option.name}
                value={categories.filter(c => pathForm.categoryIds.includes(c.id))}
                onChange={(_, newValue) => {
                  const selectedIds = newValue.map(c => c.id)
                  const selectedCats = newValue
                  setPathForm(prev => ({
                    ...prev,
                    categoryIds: selectedIds,
                    category: selectedCats.map(c => c.name).join('、'),
                  }))
                }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="选择课程分类" size="small" />
                )}
                renderOption={(props, option) => {
                  // @ts-ignore
                  const { key, ...other } = props
                  return (
                    <li key={key} {...other}>
                      {option.name}
                    </li>
                  )
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      key={option.id}
                      label={option.name}
                      size="small"
                      {...getTagProps({ index })}
                      color="primary"
                      variant="outlined"
                    />
                  ))
                }
              />
              
              {pathForm.categoryIds.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  已选择 {pathForm.categoryIds.length} 个分类
                  <br />
                  学习路径将自动展示各分类下的所有已发布课程
                </Alert>
              )}
            </Box>

            {/* 开班信息绑定 - 支持多选 */}
            <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: 'secondary.light', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SchoolIcon color="secondary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  关联开班信息（支持多选）
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                选择开班班级后，学员可从班级入口进入学习路径，适用于线下培训场景
              </Typography>
              
              {/* 班级多选 */}
              <Autocomplete
                multiple
                options={classes}
                getOptionLabel={(option) => `${option.name} (${option.status === 'enrolling' ? '招募中' : '进行中'})`}
                value={classes.filter(c => pathForm.classIds.includes(c._id))}
                onChange={(_, newValue) => {
                  const selected = newValue
                  setPathForm(prev => ({
                    ...prev,
                    classIds: selected.map(c => c._id),
                    classNames: selected.map(c => c.name),
                  }))
                }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="选择开班班级" size="small" />
                )}
                renderOption={(props, option) => {
                  // @ts-ignore
                  const { key, ...other } = props
                  return (
                    <li key={key} {...other}>
                      {option.name} ({option.status === 'enrolling' ? '招募中' : '进行中'})
                    </li>
                  )
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      key={option._id}
                      label={option.name}
                      size="small"
                      {...getTagProps({ index })}
                      color="secondary"
                      variant="outlined"
                    />
                  ))
                }
              />
              
              {pathForm.classIds.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  已关联 {pathForm.classIds.length} 个班级
                  <br />
                  学员可从各班级页面直接进入此学习路径
                </Alert>
              )}
            </Box>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              添加课程
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>选择课程</InputLabel>
                <Select
                  value={selectedCourseId}
                  label="选择课程"
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  {availableCourses.map(course => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleAddCourse}
                disabled={!selectedCourseId}
              >
                添加
              </Button>
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              课程列表:
            </Typography>
            {pathForm.items.map((item, index) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <Typography variant="caption" sx={{ minWidth: 24 }}>
                  {index + 1}.
                </Typography>
                <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                  {item.course.title}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleMoveCourse(item.id, 'up')}
                  disabled={index === 0}
                >
                  ↑
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleMoveCourse(item.id, 'down')}
                  disabled={index === pathForm.items.length - 1}
                >
                  ↓
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemoveCourse(item.id)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
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
