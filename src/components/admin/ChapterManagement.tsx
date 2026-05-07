import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  Checkbox,
  Divider,
  LinearProgress,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  PlayCircle as PlayCircleIcon,
  Search as SearchIcon,
  MenuBook as MenuBookIcon,
  Preview as PreviewIcon,
  Quiz as QuizIcon,
  VideoLibrary as VideoIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PictureAsPdf as PdfIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import {
  CloudChapterAdminService,
  CloudQuestionBankAdminService,
  CloudCourseAdminService,
} from '../../services/CloudAdminService'
// @ts-ignore
import type { CourseChapter } from '../../types/class'
import type { Course, QuestionBank } from '@/types/service'
import AdminTablePagination from './AdminTablePagination'
import EmptyState from '../EmptyState'
import { uploadFile, deleteFile, getFileUrl, formatFileSize, validateFileType, validateFileSize } from '../../services/storageService'

interface ChapterStats {
  total: number
  preview: number
  withTest: number
  withVideo: number
  withPdf: number
}

export default function ChapterManagement() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [chapters, setChapters] = useState<CourseChapter[]>([])
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedChapter, setSelectedChapter] = useState<CourseChapter | null>(null)
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  })
  const [stats, setStats] = useState<ChapterStats>({
    total: 0,
    preview: 0,
    withTest: 0,
    withVideo: 0,
    withPdf: 0,
  })

  // PDF上传状态
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pdfProgress, setPdfProgress] = useState(0)

  // 视频上传状态
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoDragActive, setVideoDragActive] = useState(false)

  // 批量选择
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchAction, setBatchAction] = useState<'delete' | 'preview' | 'test'>('delete')

  const [chapterForm, setChapterForm] = useState({
    courseId: '',
    title: '',
    description: '',
    content: '',
    videoUrl: '',
    order: 0,
    isPreview: false,
    questionBankId: '',
    pdfFile: undefined as { fileID: string; name: string; size: number } | undefined,
  })

  // 分页状态
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)

  // 搜索状态
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    loadCourses()
    loadQuestionBanks()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      loadChapters(selectedCourse)
      setChapterForm({ ...chapterForm, courseId: selectedCourse })
    }
  }, [selectedCourse, page, rowsPerPage, searchText])

  const loadCourses = async () => {
    try {
      const result = await CloudCourseAdminService.getAll()
      setCourses(result.success ? result.data : [])
    } catch (error) {
      console.error('加载课程失败:', error)
    }
  }

  const loadQuestionBanks = async () => {
    try {
      const result = await CloudQuestionBankAdminService.getAll()
      setQuestionBanks(result.success ? result.data : [])
    } catch (error) {
      console.error('加载题库失败:', error)
    }
  }

  const loadChapters = async (courseId: string) => {
    try {
      setLoading(true)
      const result = await CloudChapterAdminService.getByCourseId(courseId)
      let filteredData = result || []
      
      if (searchText) {
        filteredData = filteredData.filter((c: any) =>
          c.title?.toLowerCase().includes(searchText.toLowerCase())
        )
      }
      
      const offset = page * rowsPerPage
      const paginatedData = filteredData.slice(offset, offset + rowsPerPage)
      
      setChapters(paginatedData)
      setTotal(filteredData.length)
      
      // 计算统计
      setStats({
        total: filteredData.length,
        preview: filteredData.filter((c: any) => c.isPreview).length,
        withTest: filteredData.filter((c: any) => c.questionBankId).length,
        withVideo: filteredData.filter((c: any) => c.videoUrl).length,
        withPdf: filteredData.filter((c: any) => c.pdfFile?.fileID).length,
      })
      
      // 清空批量选择
      setSelectedChapters([])
    } catch (error) {
      console.error('加载章节失败:', error)
      setSnackbar({ open: true, message: '加载章节失败', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddChapter = () => {
    setSelectedChapter(null)
    setChapterForm({
      courseId: selectedCourse,
      title: '',
      description: '',
      content: '',
      videoUrl: '',
      order: chapters.length,
      isPreview: false,
      questionBankId: '',
      pdfFile: undefined,
    })
    setPdfProgress(0)
    setDialogOpen(true)
  }

  const handleOpenEditChapter = (chapter: CourseChapter) => {
    setSelectedChapter(chapter)
    setChapterForm({
      courseId: chapter.courseId,
      title: chapter.title,
      description: chapter.description,
      content: chapter.content,
      videoUrl: chapter.videoUrl || '',
      order: chapter.order,
      isPreview: chapter.isPreview,
      questionBankId: chapter.questionBankId || '',
      pdfFile: chapter.pdfFile,
    })
    setPdfProgress(0)
    setDialogOpen(true)
  }

  const handleSaveChapter = async () => {
    if (!chapterForm.title.trim()) {
      setSnackbar({ open: true, message: '请输入章节标题', severity: 'error' })
      return
    }

    if (!selectedCourse) {
      setSnackbar({ open: true, message: '请先选择课程', severity: 'error' })
      return
    }

    try {
      if (selectedChapter) {
        await CloudChapterAdminService.update(selectedChapter.id, chapterForm)
        setSnackbar({ open: true, message: '章节更新成功', severity: 'success' })
      } else {
        await CloudChapterAdminService.add(chapterForm)
        setSnackbar({ open: true, message: '章节创建成功', severity: 'success' })
      }

      setDialogOpen(false)
      if (selectedCourse) {
        await loadChapters(selectedCourse)
      }
    } catch (error) {
      console.error('保存章节失败:', error)
      setSnackbar({ open: true, message: '保存章节失败', severity: 'error' })
    }
  }

  const handleDeleteChapter = async (chapter: CourseChapter) => {
    if (!window.confirm(`确定要删除章节"${chapter.title}"吗？`)) {
      return
    }

    try {
      await CloudChapterAdminService.delete(chapter.id)
      setSnackbar({ open: true, message: '章节删除成功', severity: 'success' })
      if (selectedCourse) {
        await loadChapters(selectedCourse)
      }
    } catch (error) {
      console.error('删除章节失败:', error)
      setSnackbar({ open: true, message: '删除章节失败', severity: 'error' })
    }
  }

  const handleMoveChapter = async (chapter: CourseChapter, direction: 'up' | 'down') => {
    const currentIndex = chapters.findIndex(c => c.id === chapter.id)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= chapters.length) return

    const updates = [
      { id: chapter.id, order: chapters[newIndex].order },
      { id: chapters[newIndex].id, order: chapter.order },
    ]

    try {
      for (const update of updates) {
        await CloudChapterAdminService.update(update.id, { sortOrder: update.order })
      }
      if (selectedCourse) {
        await loadChapters(selectedCourse)
      }
    } catch (error) {
      console.error('调整顺序失败:', error)
      setSnackbar({ open: true, message: '调整顺序失败', severity: 'error' })
    }
  }

  // 批量操作
  const handleToggleSelect = (chapterId: string) => {
    setSelectedChapters(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    )
  }

  const handleSelectAll = () => {
    if (selectedChapters.length === chapters.length) {
      setSelectedChapters([])
    } else {
      setSelectedChapters(chapters.map(c => c.id))
    }
  }

  // PDF文件上传处理
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!validateFileType(file, ['application/pdf'])) {
      setSnackbar({ open: true, message: '请上传PDF格式的文件', severity: 'error' })
      return
    }

    // 验证文件大小（最大50MB）
    if (!validateFileSize(file, 50)) {
      setSnackbar({ open: true, message: 'PDF文件大小不能超过50MB', severity: 'error' })
      return
    }

    setUploadingPdf(true)
    setPdfProgress(0)

    try {
      // 如果已有PDF，先删除旧文件
      if (chapterForm.pdfFile?.fileID) {
        await deleteFile(chapterForm.pdfFile.fileID)
      }

      // 上传新文件
      const result = await uploadFile(file, 'chapters/pdf', (percent) => {
        setPdfProgress(percent)
      })

      if (result.success && result.fileID) {
        setChapterForm({
          ...chapterForm,
          pdfFile: {
            fileID: result.fileID,
            name: file.name,
            size: file.size,
          },
        })
        setSnackbar({ open: true, message: 'PDF上传成功', severity: 'success' })
      } else {
        setSnackbar({ open: true, message: result.message || '上传失败', severity: 'error' })
      }
    } catch (error) {
      console.error('PDF上传失败:', error)
      setSnackbar({ open: true, message: 'PDF上传失败', severity: 'error' })
    } finally {
      setUploadingPdf(false)
    }
  }

  // 删除PDF文件
  const handleDeletePdf = async () => {
    if (!chapterForm.pdfFile?.fileID) return

    if (!window.confirm('确定要删除该PDF课件吗？')) return

    try {
      const success = await deleteFile(chapterForm.pdfFile.fileID)
      if (success) {
        setChapterForm({ ...chapterForm, pdfFile: undefined })
        setSnackbar({ open: true, message: 'PDF已删除', severity: 'success' })
      } else {
        setSnackbar({ open: true, message: '删除失败', severity: 'error' })
      }
    } catch (error) {
      console.error('删除PDF失败:', error)
      setSnackbar({ open: true, message: '删除PDF失败', severity: 'error' })
    }
  }

  // 预览PDF文件
  const handlePreviewPdf = async () => {
    if (!chapterForm.pdfFile?.fileID) return

    try {
      const url = await getFileUrl(chapterForm.pdfFile.fileID, 3600) // 1小时有效期
      if (url) {
        window.open(url, '_blank')
      } else {
        setSnackbar({ open: true, message: '无法获取PDF预览链接', severity: 'error' })
      }
    } catch (error) {
      console.error('预览PDF失败:', error)
      setSnackbar({ open: true, message: '预览PDF失败', severity: 'error' })
    }
  }

  // 视频文件上传处理
  const handleVideoUpload = async (file: File) => {
    // 验证文件类型
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov', 'video/quicktime']
    if (!validateFileType(file, allowedVideoTypes)) {
      setSnackbar({ open: true, message: '请上传MP4、WebM、MOV等视频格式的文件', severity: 'error' })
      return
    }

    // 验证文件大小（最大500MB）
    if (!validateFileSize(file, 500)) {
      setSnackbar({ open: true, message: '视频文件大小不能超过500MB', severity: 'error' })
      return
    }

    setUploadingVideo(true)
    setVideoProgress(0)

    try {
      // 如果已有视频，先删除旧文件
      if (chapterForm.videoUrl?.startsWith('cloud://')) {
        await deleteFile(chapterForm.videoUrl)
      }

      // 上传新文件
      const result = await uploadFile(file, 'chapters/video', (percent) => {
        setVideoProgress(percent)
      })

      if (result.success && result.fileID) {
        setChapterForm({
          ...chapterForm,
          videoUrl: result.fileID,
        })
        setSnackbar({ open: true, message: '视频上传成功', severity: 'success' })
      } else {
        setSnackbar({ open: true, message: result.message || '上传失败', severity: 'error' })
      }
    } catch (error) {
      console.error('视频上传失败:', error)
      setSnackbar({ open: true, message: '视频上传失败', severity: 'error' })
    } finally {
      setUploadingVideo(false)
    }
  }

  // 点击上传视频
  const handleVideoInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleVideoUpload(file)
    }
  }

  // 拖拽上传处理
  const handleVideoDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setVideoDragActive(true)
  }

  const handleVideoDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setVideoDragActive(false)
  }

  const handleVideoDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setVideoDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleVideoUpload(file)
    }
  }

  // 删除视频文件
  const handleDeleteVideo = async () => {
    if (!chapterForm.videoUrl?.startsWith('cloud://')) {
      // 外部URL直接清空
      setChapterForm({ ...chapterForm, videoUrl: '' })
      return
    }

    if (!window.confirm('确定要删除该视频文件吗？')) return

    try {
      const success = await deleteFile(chapterForm.videoUrl)
      if (success) {
        setChapterForm({ ...chapterForm, videoUrl: '' })
        setSnackbar({ open: true, message: '视频已删除', severity: 'success' })
      } else {
        setSnackbar({ open: true, message: '删除失败', severity: 'error' })
      }
    } catch (error) {
      console.error('删除视频失败:', error)
      setSnackbar({ open: true, message: '删除视频失败', severity: 'error' })
    }
  }

  const handleBatchAction = async () => {
    try {
      if (batchAction === 'delete') {
        for (const id of selectedChapters) {
          await CloudChapterAdminService.delete(id)
        }
        setSnackbar({ open: true, message: `成功删除 ${selectedChapters.length} 个章节`, severity: 'success' })
      } else if (batchAction === 'preview') {
        for (const id of selectedChapters) {
          await CloudChapterAdminService.update(id, { isPreview: true })
        }
        setSnackbar({ open: true, message: `成功设置 ${selectedChapters.length} 个章节为试看`, severity: 'success' })
      } else if (batchAction === 'test') {
        // 批量关联题库需要额外UI选择题库
        // @ts-ignore
        setSnackbar({ open: true, message: '请单独设置章节关联的题库', severity: 'info' })
      }
      
      setBatchDialogOpen(false)
      setSelectedChapters([])
      if (selectedCourse) {
        await loadChapters(selectedCourse)
      }
    } catch (error) {
      console.error('批量操作失败:', error)
      setSnackbar({ open: true, message: '批量操作失败', severity: 'error' })
    }
  }

  const formatVideoDuration = (seconds?: number) => {
    if (!seconds) return '-'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const selectedCourseTitle = courses.find(c => c.id === selectedCourse)?.title || ''

  return (
    <Box>
      <Typography variant="h6" gutterBottom>课程章节管理</Typography>

      {/* 课程选择 */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>选择课程</InputLabel>
          <Select
            value={selectedCourse}
            label="选择课程"
            onChange={(e) => {
              setSelectedCourse(e.target.value as string)
              setPage(0)
            }}
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={course.id}>
                {course.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 统计卡片 */}
      {selectedCourse && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={4} lg={2.4}>
            <Card>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MenuBookIcon color="primary" />
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: '1.25rem' }}>{stats.total}</Typography>
                    <Typography variant="caption" color="text.secondary">总章节</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={4} lg={2.4}>
            <Card>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PreviewIcon color="info" />
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: '1.25rem' }}>{stats.preview}</Typography>
                    <Typography variant="caption" color="text.secondary">试看章节</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={4} lg={2.4}>
            <Card>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QuizIcon color="warning" />
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: '1.25rem' }}>{stats.withTest}</Typography>
                    <Typography variant="caption" color="text.secondary">有测试</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={4} lg={2.4}>
            <Card>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VideoIcon color="success" />
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: '1.25rem' }}>{stats.withVideo}</Typography>
                    <Typography variant="caption" color="text.secondary">有视频</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={4} lg={2.4}>
            <Card>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PdfIcon color="error" />
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: '1.25rem' }}>{stats.withPdf}</Typography>
                    <Typography variant="caption" color="text.secondary">有PDF</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 搜索框 */}
      {selectedCourse && (
        <Box sx={{ mb: 3 }}>
          <TextField
            placeholder="搜索章节标题..."
            size="small"
            fullWidth
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
          />
        </Box>
      )}

      {/* 章节列表 */}
      {!selectedCourse ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <EmptyState
            icon={<MenuBookIcon className="w-16 h-16 text-gray-300" />}
            title="请选择课程"
            description="选择一个课程来管理其章节内容"
          />
        </Paper>
      ) : loading ? (
        <Box sx={{ py: 8 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            加载章节中...
          </Typography>
        </Box>
      ) : chapters.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <EmptyState
            icon={<MenuBookIcon className="w-16 h-16 text-gray-300" />}
            title="暂无章节"
            description={`课程"${selectedCourseTitle}"还没有章节内容`}
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddChapter}>
                添加第一章
              </Button>
            }
          />
        </Paper>
      ) : (
        <Box>
          {/* 工具栏 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                checked={selectedChapters.length === chapters.length && chapters.length > 0}
                indeterminate={selectedChapters.length > 0 && selectedChapters.length < chapters.length}
                onChange={handleSelectAll}
              />
              <Typography variant="body2" color="text.secondary">
                已选择 {selectedChapters.length} 项
              </Typography>
              {selectedChapters.length > 0 && (
                <>
                  <Button size="small" color="error" onClick={() => { setBatchAction('delete'); setBatchDialogOpen(true) }}>
                    批量删除
                  </Button>
                  <Button size="small" color="info" onClick={() => { setBatchAction('preview'); setBatchDialogOpen(true) }}>
                    设为试看
                  </Button>
                </>
              )}
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddChapter}>
              添加章节
            </Button>
          </Box>

          {/* 章节卡片列表 */}
          {chapters.map((chapter, index) => (
            <Card key={chapter.id} sx={{ mb: 2, boxShadow: 1 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Checkbox
                    checked={selectedChapters.includes(chapter.id)}
                    onChange={() => handleToggleSelect(chapter.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <DragIcon color="disabled" sx={{ cursor: 'grab' }} />
                  <Chip 
                    label={`第${chapter.order + 1}章`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={500}>
                      {chapter.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300, display: 'block' }}>
                      {chapter.description || '暂无描述'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {chapter.isPreview && (
                      <Tooltip title="试看章节">
                        <Chip label="试看" size="small" color="info" variant="outlined" />
                      </Tooltip>
                    )}
                    {chapter.questionBankId && (
                      <Tooltip title="有测试题">
                        <Chip label="测试" size="small" color="warning" variant="outlined" />
                      </Tooltip>
                    )}
                    {chapter.videoUrl && (
                      <Tooltip title="有视频">
                        <Chip 
                          icon={<VideoIcon fontSize="small" />} 
                          label={formatVideoDuration(chapter.videoDuration)} 
                          size="small" 
                          color="success" 
                          variant="outlined" 
                        />
                      </Tooltip>
                    )}
                    {chapter.pdfFile?.fileID && (
                      <Tooltip title={`PDF课件: ${chapter.pdfFile.name}`}>
                        <Chip 
                          icon={<PdfIcon fontSize="small" />} 
                          label={formatFileSize(chapter.pdfFile.size)} 
                          size="small" 
                          color="error" 
                          variant="outlined" 
                        />
                      </Tooltip>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="上移">
                      <IconButton
                        size="small"
                        onClick={() => handleMoveChapter(chapter, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUpIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="下移">
                      <IconButton
                        size="small"
                        onClick={() => handleMoveChapter(chapter, 'down')}
                        disabled={index === chapters.length - 1}
                      >
                        <ArrowDownIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => handleOpenEditChapter(chapter)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" onClick={() => handleDeleteChapter(chapter)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}

          <AdminTablePagination
            total={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(newPage) => setPage(newPage)}
            onRowsPerPageChange={(newRowsPerPage) => setRowsPerPage(newRowsPerPage)}
          />
        </Box>
      )}

      {/* 章节编辑/添加对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedChapter ? '编辑章节' : '添加章节'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="章节标题"
              value={chapterForm.title}
              onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
              placeholder="例如：第一章 课程介绍"
            />

            <TextField
              fullWidth
              label="章节描述"
              multiline
              rows={2}
              value={chapterForm.description}
              onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
              placeholder="简要描述本章内容"
            />

            {/* 视频上传 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                视频文件
              </Typography>
              {chapterForm.videoUrl ? (
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <VideoIcon color="success" sx={{ fontSize: 40 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {chapterForm.videoUrl.startsWith('cloud://') ? '已上传视频' : '外部视频链接'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {chapterForm.videoUrl}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<CloseIcon />}
                      onClick={handleDeleteVideo}
                      color="error"
                      variant="outlined"
                    >
                      删除
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <Paper
                  onDragEnter={handleVideoDragEnter}
                  onDragLeave={handleVideoDragLeave}
                  onDragOver={handleVideoDragOver}
                  onDrop={handleVideoDrop}
                  sx={{
                    p: 3,
                    border: '2px dashed',
                    borderColor: videoDragActive ? 'primary.main' : 'grey.300',
                    bgcolor: videoDragActive ? 'primary.50' : 'grey.50',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'primary.50',
                    },
                  }}
                >
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/mov,video/quicktime"
                    hidden
                    id="video-upload-input"
                    onChange={handleVideoInputChange}
                  />
                  <label htmlFor="video-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
                    {uploadingVideo ? (
                      <Box sx={{ width: '100%' }}>
                        <Typography variant="body2" gutterBottom>
                          上传中 {videoProgress}%
                        </Typography>
                        <LinearProgress variant="determinate" value={videoProgress} />
                      </Box>
                    ) : (
                      <>
                        <VideoIcon sx={{ fontSize: 48, color: videoDragActive ? 'primary.main' : 'grey.400', mb: 1 }} />
                        <Typography variant="body1" color={videoDragActive ? 'primary.main' : 'text.secondary'}>
                          {videoDragActive ? '松开以上传视频' : '拖拽视频到此处，或点击上传'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          支持 MP4、WebM、MOV 格式，最大 500MB
                        </Typography>
                      </>
                    )}
                  </label>
                </Paper>
              )}
              {uploadingVideo && (
                <LinearProgress variant="determinate" value={videoProgress} sx={{ mt: 1 }} />
              )}
            </Box>

            <TextField
              fullWidth
              label="章节内容（富文本）"
              multiline
              rows={4}
              value={chapterForm.content}
              onChange={(e) => setChapterForm({ ...chapterForm, content: e.target.value })}
              placeholder="输入章节详细内容，支持HTML格式"
            />

            <FormControl fullWidth>
              <InputLabel>关联测试题库</InputLabel>
              <Select
                value={chapterForm.questionBankId}
                label="关联测试题库"
                onChange={(e) => setChapterForm({ ...chapterForm, questionBankId: e.target.value as string })}
              >
                <MenuItem value="">不关联测试</MenuItem>
                {questionBanks.map((bank) => (
                  <MenuItem key={bank.id} value={bank.id}>
                    // @ts-ignore
                    {bank.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* PDF课件上传 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                PDF课件
              </Typography>
              {chapterForm.pdfFile?.fileID ? (
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PdfIcon color="error" sx={{ fontSize: 40 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {chapterForm.pdfFile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(chapterForm.pdfFile.size)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={handlePreviewPdf}
                        variant="outlined"
                      >
                        预览
                      </Button>
                      <Button
                        size="small"
                        startIcon={<CloseIcon />}
                        onClick={handleDeletePdf}
                        color="error"
                        variant="outlined"
                      >
                        删除
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  disabled={uploadingPdf}
                  fullWidth
                  sx={{ py: 2, borderStyle: 'dashed' }}
                >
                  {uploadingPdf ? `上传中 ${pdfProgress}%` : '上传PDF课件'}
                  <input
                    type="file"
                    accept=".pdf"
                    hidden
                    onChange={handlePdfUpload}
                  />
                </Button>
              )}
              {uploadingPdf && (
                <LinearProgress variant="determinate" value={pdfProgress} sx={{ mt: 1 }} />
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                支持PDF格式，最大50MB
              </Typography>
            </Box>

            <FormControl fullWidth>
              <InputLabel>试看设置</InputLabel>
              <Select
                value={chapterForm.isPreview ? 'true' : 'false'}
                label="试看设置"
                onChange={(e) => setChapterForm({ ...chapterForm, isPreview: e.target.value === 'true' })}
              >
                <MenuItem value="false">付费章节</MenuItem>
                <MenuItem value="true">试看章节</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} startIcon={<CancelIcon />}>
            取消
          </Button>
          <Button onClick={handleSaveChapter} variant="contained" startIcon={<SaveIcon />}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 批量操作确认对话框 */}
      <Dialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认批量操作</DialogTitle>
        <DialogContent>
          <Alert severity={batchAction === 'delete' ? 'error' : 'warning'} sx={{ mb: 2 }}>
            您确定要对选中的 {selectedChapters.length} 个章节执行
            {batchAction === 'delete' ? '删除' : batchAction === 'preview' ? '设为试看' : '关联测试'}操作吗？
          </Alert>
          <Typography variant="body2" color="text.secondary">
            此操作不可恢复，请谨慎操作。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchDialogOpen(false)}>取消</Button>
          <Button 
            onClick={handleBatchAction} 
            variant="contained" 
            color={batchAction === 'delete' ? 'error' : 'primary'}
          >
            确认{batchAction === 'delete' ? '删除' : batchAction === 'preview' ? '设置' : '操作'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  )
}
