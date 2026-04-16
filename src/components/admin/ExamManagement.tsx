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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Quiz as QuizIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon,
} from '@mui/icons-material'
import { CloudPracticeService } from '../../services/CloudPracticeService'
import { CloudCourseService } from '../../services/CloudCourseService'
import type { QuestionBank } from '../../types/practice'
import type { Course } from '@/types/service'

export interface ExamPaper {
  id: string
  title: string
  description: string
  bankIds: string[] // 关联的题库ID列表
  questionCount: number // 试题总数
  timeLimit: number // 考试时长（分钟）
  passingScore: number // 及格分数
  totalScore: number // 总分
  shuffleQuestions: boolean // 是否打乱题目顺序
  allowRetake: boolean // 是否允许重考
  createdAt: string
}

export default function ExamManagement() {
  const [exams, setExams] = useState<ExamPaper[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState<ExamPaper | null>(null)
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  })

  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    bankIds: [] as string[],
    timeLimit: 120,
    passingScore: 60,
    totalScore: 100,
    shuffleQuestions: true,
    allowRetake: false,
  })

  useEffect(() => {
    loadCourses()
    loadQuestionBanks()
    loadExams()
  }, [])

  const loadCourses = async () => {
    try {
      const data = await CloudCourseService.getAll()
      setCourses(data)
    } catch (error) {
      console.error('加载课程失败:', error)
    }
  }

  const loadQuestionBanks = async () => {
    try {
      const data = await CloudPracticeService.getAllBanks()
      setQuestionBanks(data)
    } catch (error) {
      console.error('加载题库失败:', error)
    }
  }

  const loadExams = async () => {
    try {
      setLoading(true)
      // 使用CloudAdminService加载试卷数据
      const { CloudExamAdminService } = await import('../../services/CloudAdminService')
      const result = await CloudExamAdminService.getAll()
      if (result.success && result.data) {
        setExams(result.data)
      }
    } catch (error) {
      console.error('加载试卷失败:', error)
      setSnackbar({ open: true, message: '加载试卷失败', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddExam = () => {
    setSelectedExam(null)
    setExamForm({
      title: '',
      description: '',
      bankIds: [],
      timeLimit: 120,
      passingScore: 60,
      totalScore: 100,
      shuffleQuestions: true,
      allowRetake: false,
    })
    setDialogOpen(true)
  }

  const handleOpenEditExam = (exam: ExamPaper) => {
    setSelectedExam(exam)
    setExamForm({
      title: exam.title,
      description: exam.description,
      bankIds: exam.bankIds,
      timeLimit: exam.timeLimit,
      passingScore: exam.passingScore,
      totalScore: exam.totalScore,
      shuffleQuestions: exam.shuffleQuestions,
      allowRetake: exam.allowRetake,
    })
    setDialogOpen(true)
  }

  const handleSaveExam = async () => {
    if (!examForm.title.trim()) {
      setSnackbar({ open: true, message: '请输入试卷标题', severity: 'error' })
      return
    }

    if (examForm.bankIds.length === 0) {
      setSnackbar({ open: true, message: '请至少选择一个题库', severity: 'error' })
      return
    }

    try {
      // 计算总题目数
      let totalQuestions = 0
      for (const bankId of examForm.bankIds) {
        const questions = await CloudPracticeService.getBankQuestions(bankId)
        totalQuestions += questions.length
      }

      const examData = {
        ...examForm,
        questionCount: totalQuestions,
        createdAt: new Date().toISOString(),
      }

      const { CloudExamAdminService } = await import('../../services/CloudAdminService')
      let result
      if (selectedExam) {
        result = await CloudExamAdminService.update(selectedExam.id, examData)
      } else {
        result = await CloudExamAdminService.add(examData)
      }

      if (result.success) {
        setSnackbar({ open: true, message: selectedExam ? '试卷更新成功' : '试卷创建成功', severity: 'success' })
        setDialogOpen(false)
        await loadExams()
      } else {
        setSnackbar({ open: true, message: result.error || '保存试卷失败', severity: 'error' })
      }
    } catch (error) {
      console.error('保存试卷失败:', error)
      setSnackbar({ open: true, message: '保存试卷失败', severity: 'error' })
    }
  }

  const handleDeleteExam = async (exam: ExamPaper) => {
    if (!window.confirm(`确定要删除试卷"${exam.title}"吗？`)) {
      return
    }

    try {
      console.log('[删除试卷] 开始删除, id:', exam.id)
      const { CloudExamAdminService } = await import('../../services/CloudAdminService')
      const result = await CloudExamAdminService.delete(exam.id)
      console.log('[删除试卷] 返回结果:', result)
      
      // 无论返回什么，都刷新列表验证实际状态
      await loadExams()
      
      if (result.success) {
        setSnackbar({ open: true, message: result.message || '试卷删除成功', severity: 'success' })
      } else {
        setSnackbar({ open: true, message: result.error || '操作完成，请确认数据状态', severity: 'info' })
      }
    } catch (error: any) {
      console.error('删除试卷异常:', error)
      // 异常情况下也刷新列表
      await loadExams()
      setSnackbar({ open: true, message: '操作完成，请确认数据状态', severity: 'info' })
    }
  }

  const generateExamPreview = async (exam: ExamPaper) => {
    try {
      // 从选中的题库中随机抽取题目
      let allQuestions: Question[] = []
      for (const bankId of exam.bankIds) {
        const questions = await CloudPracticeService.getBankQuestions(bankId)
        allQuestions = [...allQuestions, ...questions]
      }

      // 根据设置决定是否打乱顺序
      if (exam.shuffleQuestions) {
        allQuestions = allQuestions.sort(() => Math.random() - 0.5)
      }

      // 这里可以显示预览对话框或跳转到考试页面
      console.log('生成预览:', allQuestions.slice(0, 10))
      setSnackbar({ open: true, message: '已生成试卷预览', severity: 'success' })
    } catch (error) {
      console.error('生成试卷预览失败:', error)
      setSnackbar({ open: true, message: '生成预览失败', severity: 'error' })
    }
  }

  const getBankTitle = (bankId: string) => {
    const bank = questionBanks.find(b => b.id === bankId)
    return bank ? bank.title : '未知题库'
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>试卷/考试管理</Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddExam}>
          创建试卷
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : exams.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>暂无试卷</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            创建试卷以进行考试管理
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddExam}>
            创建第一份试卷
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {exams.map((exam) => (
            <Grid item xs={12} sm={6} md={4} key={exam.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <QuizIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleOpenEditExam(exam)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteExam(exam)} sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Typography variant="h6" gutterBottom>
                    {exam.title}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {exam.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      关联题库：
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {exam.bankIds.map((bankId) => (
                        <Chip key={bankId} label={getBankTitle(bankId)} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon fontSize="small" color="secondary" />
                        <Typography variant="body2">
                          {exam.timeLimit}分钟
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <QuizIcon fontSize="small" color="secondary" />
                        <Typography variant="body2">
                          {exam.questionCount}题
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        及格: {exam.passingScore}分
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        总分: {exam.totalScore}分
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={exam.shuffleQuestions ? '随机排序' : '固定顺序'}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={exam.allowRetake ? '允许重考' : '仅一次'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Button
                    fullWidth
                    variant="outlined"
                    sx={{ mt: 2 }}
                    onClick={() => generateExamPreview(exam)}
                  >
                    生成试卷预览
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 试卷编辑/创建对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedExam ? '编辑试卷' : '创建试卷'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="试卷标题"
              value={examForm.title}
              onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
              placeholder="例如：期末考试 A卷"
            />

            <TextField
              fullWidth
              label="试卷描述"
              multiline
              rows={3}
              value={examForm.description}
              onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
              placeholder="描述试卷的用途和范围"
            />

            <FormControl fullWidth>
              <InputLabel>选择题库（可多选）</InputLabel>
              <Select
                multiple
                value={examForm.bankIds}
                label="选择题库"
                onChange={(e) => setExamForm({ ...examForm, bankIds: e.target.value as string[] })}
              >
                {questionBanks.map((bank) => (
                  <MenuItem key={bank.id} value={bank.id}>
                    {bank.title} ({bank.questionCount}题)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="考试时长（分钟）"
                  type="number"
                  value={examForm.timeLimit}
                  onChange={(e) => setExamForm({ ...examForm, timeLimit: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="及格分数"
                  type="number"
                  value={examForm.passingScore}
                  onChange={(e) => setExamForm({ ...examForm, passingScore: Number(e.target.value) })}
                  inputProps={{ max: examForm.totalScore }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="试卷总分"
                  type="number"
                  value={examForm.totalScore}
                  onChange={(e) => setExamForm({ ...examForm, totalScore: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>随机排序</InputLabel>
                  <Select
                    value={examForm.shuffleQuestions ? 'true' : 'false'}
                    label="随机排序"
                    onChange={(e) => setExamForm({ ...examForm, shuffleQuestions: e.target.value === 'true' })}
                  >
                    <MenuItem value="true">是</MenuItem>
                    <MenuItem value="false">否</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <FormControl fullWidth>
              <InputLabel>允许重考</InputLabel>
              <Select
                value={examForm.allowRetake ? 'true' : 'false'}
                label="允许重考"
                onChange={(e) => setExamForm({ ...examForm, allowRetake: e.target.value === 'true' })}
              >
                <MenuItem value="true">允许</MenuItem>
                <MenuItem value="false">不允许</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveExam} variant="contained">
            保存
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
