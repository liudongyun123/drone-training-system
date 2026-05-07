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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  Fab,
} from '@mui/material'
import {
  Quiz as QuizIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  UploadFile as UploadFileIcon,
  QuestionAnswer as QuestionAnswerIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material'
import { CloudPracticeService } from '../../services/CloudPracticeService'
import { CloudCourseService } from '../../services/CloudCourseService'
import type { QuestionBank, PracticeQuestion } from '../../types/practice'
import type { Course, Question } from '@/types/service'

export default function QuestionBankManagement() {
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([])
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([])
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<PracticeQuestion | null>(null)
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)
  const [questionEditDialogOpen, setQuestionEditDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<Question[]>([])
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  })

  const [bankForm, setBankForm] = useState({
    courseIds: [] as string[],
    courseTitles: [] as string[],
    title: '',
    description: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    category: '',
    questionCount: 0,
    timeLimit: 0,
    passingScore: 0,
    tags: [] as string[],
    practiceMode: 'study' as 'study' | 'exam',
  })

  const [questionForm, setQuestionForm] = useState({
    type: 'single' as 'single' | 'multiple' | 'judgment',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    question: '',
    options: [{ text: '', isCorrect: false }] as Array<{ text: string; isCorrect: boolean }>,
    explanation: '',
    order: 0,
  })

  useEffect(() => {
    loadQuestionBanks()
    loadCourses()
  }, [])

  const loadQuestionBanks = async () => {
    try {
      setLoading(true)
      const banks = await CloudPracticeService.getAllBanks()
      setQuestionBanks(banks)
    } catch (error) {
      console.error('加载题库失败:', error)
      setSnackbar({ open: true, message: '加载题库失败', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadCourses = async () => {
    try {
      const data = await CloudCourseService.getAll()
      setCourses(data)
    } catch (error) {
      console.error('加载课程失败:', error)
    }
  }

  const loadBankQuestions = async (bankId: string) => {
    try {
      setLoading(true)
      const questions = await CloudPracticeService.getBankQuestions(bankId)
      setPracticeQuestions(questions)
    } catch (error) {
      console.error('加载题目失败:', error)
      setSnackbar({ open: true, message: '加载题目失败', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBank = async () => {
    try {
      if (bankForm.courseIds.length === 0) {
        setSnackbar({ open: true, message: '请至少选择一个课程', severity: 'error' })
        return
      }

      const courseTitles = bankForm.courseIds.map((id) => {
        const course = courses.find((c) => c.id === id)
        return course ? course.title : ''
      }).filter((t) => t)

      const bankData = {
        ...bankForm,
        courseTitles,
        createdAt: new Date().toISOString(),
      }

      let result
      if (selectedBank) {
        result = await CloudPracticeService.updateBank(selectedBank.id, bankData)
      } else {
        result = await CloudPracticeService.addBank(bankData)
      }

      if (result) {
        setSnackbar({ open: true, message: selectedBank ? '题库更新成功' : '题库创建成功', severity: 'success' })
        setBankDialogOpen(false)
        await loadQuestionBanks()
      } else {
        setSnackbar({ open: true, message: '保存题库失败', severity: 'error' })
      }
    } catch (error) {
      console.error('保存题库失败:', error)
      setSnackbar({ open: true, message: '保存题库失败', severity: 'error' })
    }
  }

  const handleDeleteBank = async (bank: QuestionBank) => {
    if (!window.confirm(`确定要删除题库 "${bank.title}" 吗？`)) {
      return
    }

    try {
      console.log('[删除题库] 开始删除, id:', bank.id)
      const result = await CloudPracticeService.deleteBank(bank.id)
      console.log('[删除题库] 返回结果:', result)
      
      // 无论返回什么，都刷新列表验证实际状态
      if (selectedBank?.id === bank.id) {
        setSelectedBank(null)
        setPracticeQuestions([])
      }
      await loadQuestionBanks()
      
      // 根据结果显示提示
      if (result.success) {
        setSnackbar({ open: true, message: '题库删除成功', severity: 'success' })
      } else {
        // @ts-ignore
        setSnackbar({ open: true, message: result.error || '删除可能失败，请刷新页面确认', severity: 'warning' })
      }
    } catch (error: any) {
      console.error('删除题库失败:', error)
      // 异常情况下也刷新列表
      await loadQuestionBanks()
      // @ts-ignore
      setSnackbar({ open: true, message: `操作完成，请确认数据状态`, severity: 'info' })
    }
  }

  const handleDeleteQuestion = async (question: PracticeQuestion) => {
    if (!window.confirm('确定要删除这道题目吗？')) {
      return
    }

    try {
      await CloudPracticeService.deleteQuestion(question.id)
      setSnackbar({ open: true, message: '题目删除成功', severity: 'success' })
      if (selectedBank) {
        await loadBankQuestions(selectedBank.id)
      }
    } catch (error) {
      console.error('删除题目失败:', error)
      setSnackbar({ open: true, message: '删除题目失败', severity: 'error' })
    }
  }

  const handleOpenAddQuestion = () => {
    setSelectedQuestion(null)
    setQuestionForm({
      type: 'single',
      difficulty: 'easy',
      question: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      explanation: '',
      order: practiceQuestions.length,
    })
    setQuestionEditDialogOpen(true)
  }

  const handleOpenEditQuestion = (question: PracticeQuestion) => {
    setSelectedQuestion(question)
    setQuestionForm({
      type: question.type,
      difficulty: question.difficulty,
      question: question.question,
      options: question.options || [],
      explanation: question.explanation,
      order: question.order,
    })
    setQuestionEditDialogOpen(true)
  }

  const handleAddOption = () => {
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, { text: '', isCorrect: false }],
    })
  }

  const handleRemoveOption = (index: number) => {
    if (questionForm.options.length <= 2) {
      setSnackbar({ open: true, message: '至少保留2个选项', severity: 'error' })
      return
    }
    setQuestionForm({
      ...questionForm,
      options: questionForm.options.filter((_, i) => i !== index),
    })
  }

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...questionForm.options]
    newOptions[index].text = text
    setQuestionForm({ ...questionForm, options: newOptions })
  }

  const handleCorrectAnswerChange = (index: number, isCorrect: boolean) => {
    const newOptions = [...questionForm.options]
    if (questionForm.type === 'single' && isCorrect) {
      // 单选题：只能有一个正确答案
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === index
      })
    } else {
      newOptions[index].isCorrect = isCorrect
    }
    setQuestionForm({ ...questionForm, options: newOptions })
  }

  const handleSaveQuestion = async () => {
    if (!selectedBank) {
      setSnackbar({ open: true, message: '请先选择题库', severity: 'error' })
      return
    }

    if (!questionForm.question.trim()) {
      setSnackbar({ open: true, message: '请输入题目内容', severity: 'error' })
      return
    }

    if (questionForm.type !== 'judgment') {
      const validOptions = questionForm.options.filter((opt) => opt.text.trim())
      if (validOptions.length < 2) {
        setSnackbar({ open: true, message: '至少需要2个有效选项', severity: 'error' })
        return
      }
      const hasCorrect = questionForm.options.some((opt) => opt.isCorrect)
      if (!hasCorrect) {
        setSnackbar({ open: true, message: '请至少选择一个正确答案', severity: 'error' })
        return
      }
    }

    try {
      const questionData = {
        ...questionForm,
        bankId: selectedBank.id,
      }

      if (selectedQuestion) {
        await CloudPracticeService.updateQuestion(selectedQuestion.id, questionData)
        setSnackbar({ open: true, message: '题目更新成功', severity: 'success' })
      } else {
        await CloudPracticeService.addQuestion(questionData)
        setSnackbar({ open: true, message: '题目创建成功', severity: 'success' })
      }

      setQuestionEditDialogOpen(false)
      if (selectedBank) {
        await loadBankQuestions(selectedBank.id)
      }
      // 更新题库的题目数量
      const updatedQuestions = await CloudPracticeService.getBankQuestions(selectedBank.id)
      await CloudPracticeService.updateBank(selectedBank.id, { questionCount: updatedQuestions.length })
      await loadQuestionBanks()
    } catch (error) {
      console.error('保存题目失败:', error)
      setSnackbar({ open: true, message: '保存题目失败', severity: 'error' })
    }
  }

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner':
        return '初级'
      case 'intermediate':
        return '中级'
      case 'advanced':
        return '高级'
      default:
        return level
    }
  }

  const getModeLabel = (mode: string) => {
    return mode === 'study' ? '背题模式' : '考试模式'
  }

  if (loading && questionBanks.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">题库管理</Typography>
      </Box>

      <Grid container spacing={3}>
        {questionBanks.map((bank) => (
          <Grid item xs={12} sm={6} md={4} key={bank.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={getModeLabel(bank.practiceMode)}
                      color={bank.practiceMode === 'study' ? 'info' : 'warning'}
                      size="small"
                    />
                    <Chip
                      label={getLevelLabel(bank.level)}
                      color={bank.level === 'beginner' ? 'success' : bank.level === 'intermediate' ? 'warning' : 'error'}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedBank(bank)
                        loadBankQuestions(bank.id)
                        setQuestionDialogOpen(true)
                      }}
                    >
                      <QuizIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedBank(bank)
                        setBankForm({
                          courseIds: bank.courseIds,
                          courseTitles: bank.courseTitles,
                          title: bank.title,
                          description: bank.description,
                          level: bank.level,
                          category: bank.category,
                          questionCount: bank.questionCount,
                          timeLimit: bank.timeLimit,
                          passingScore: bank.passingScore,
                          tags: bank.tags,
                          practiceMode: bank.practiceMode,
                        })
                        setBankDialogOpen(true)
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteBank(bank)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="h6" gutterBottom sx={{ minHeight: 56 }}>
                  {bank.title}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {bank.description}
                </Typography>

                {bank.courseTitles && bank.courseTitles.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      关联课程：
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {bank.courseTitles.map((title, index) => (
                        <Chip key={index} label={title} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {bank.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    // @ts-ignore
                    <AccessTimeIcon fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      {bank.timeLimit} 分钟
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <QuestionAnswerIcon fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      {bank.questionCount} 题
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 题目列表对话框 */}
      <Dialog
        open={questionDialogOpen}
        onClose={() => {
          setQuestionDialogOpen(false)
          setSelectedBank(null)
          setPracticeQuestions([])
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedBank?.title} - 题目列表 ({practiceQuestions.length}题)
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : practiceQuestions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">暂无题目</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              {practiceQuestions.map((question, index) => (
                <Paper key={question.id} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        第{index + 1}题
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {question.question}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                        {question.options && question.options.map((option, optIndex) => (
                          <Typography key={optIndex} variant="body2" color={option.isCorrect ? 'success.main' : 'text.secondary'}>
                            {String.fromCharCode(65 + optIndex)}. {option.text} {option.isCorrect && '✓'}
                          </Typography>
                        ))}
                      </Box>
                      {question.explanation && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          解析：{question.explanation}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditQuestion(question)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteQuestion(question)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddQuestion}
          >
            添加题目
          </Button>
          <Button onClick={() => {
            setQuestionDialogOpen(false)
            setSelectedBank(null)
            setPracticeQuestions([])
          }}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      {/* 题目编辑/创建对话框 */}
      <Dialog
        open={questionEditDialogOpen}
        onClose={() => setQuestionEditDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{selectedQuestion ? '编辑题目' : '添加题目'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>题目类型</InputLabel>
              <Select
                label="题目类型"
                value={questionForm.type}
                onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value as any })}
              >
                <MenuItem value="single">单选题</MenuItem>
                <MenuItem value="multiple">多选题</MenuItem>
                <MenuItem value="judgment">判断题</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>难度</InputLabel>
              <Select
                label="难度"
                value={questionForm.difficulty}
                onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as any })}
              >
                <MenuItem value="easy">简单</MenuItem>
                <MenuItem value="medium">中等</MenuItem>
                <MenuItem value="hard">困难</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="题目内容"
              multiline
              rows={4}
              value={questionForm.question}
              onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
              placeholder="请输入题目内容"
            />

            {questionForm.type !== 'judgment' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  选项设置 {questionForm.type === 'single' ? '(单选)' : '(多选)'}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {questionForm.options.map((option, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography sx={{ minWidth: 24, textAlign: 'center' }}>
                        {String.fromCharCode(65 + index)}.
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        value={option.text}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder="选项内容"
                      />
                      <Button
                        size="small"
                        variant={option.isCorrect ? 'contained' : 'outlined'}
                        color={option.isCorrect ? 'success' : 'primary'}
                        onClick={() => handleCorrectAnswerChange(index, !option.isCorrect)}
                      >
                        {option.isCorrect ? '正确' : '设为正确'}
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveOption(index)}
                        disabled={questionForm.options.length <= 2}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddOption}
                    startIcon={<AddIcon />}
                  >
                    添加选项
                  </Button>
                </Box>
              </Box>
            )}

            <TextField
              fullWidth
              label="解析"
              multiline
              rows={3}
              value={questionForm.explanation}
              onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
              placeholder="请输入题目解析（可选）"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionEditDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveQuestion} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 题库编辑/添加对话框 */}
      <Dialog open={bankDialogOpen} onClose={() => setBankDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedBank ? '编辑题库' : '创建题库'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>关联课程（可多选）</InputLabel>
              <Select
                label="关联课程（可多选）"
                multiple
                defaultValue={selectedBank?.courseIds || []}
                onChange={(e) => setBankForm({ ...bankForm, courseIds: e.target.value as string[] })}
              >
                {courses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>练习模式</InputLabel>
              <Select
                label="练习模式"
                defaultValue={selectedBank?.practiceMode || 'study'}
                onChange={(e) => setBankForm({ ...bankForm, practiceMode: e.target.value as any })}
              >
                <MenuItem value="study">
                  <Box>
                    <Typography variant="body2">背题模式</Typography>
                    <Typography variant="caption" color="text.secondary">
                      按章节学习练习
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="exam">
                  <Box>
                    <Typography variant="body2">考试模式</Typography>
                    <Typography variant="caption" color="text.secondary">
                      所有章节打乱抽选100题
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="题库标题"
              size="small"
              defaultValue={selectedBank?.title || ''}
              onChange={(e) => setBankForm({ ...bankForm, title: e.target.value })}
            />
            <TextField
              fullWidth
              label="题库描述"
              size="small"
              multiline
              rows={3}
              defaultValue={selectedBank?.description || ''}
              onChange={(e) => setBankForm({ ...bankForm, description: e.target.value })}
            />
            <FormControl fullWidth size="small">
              <InputLabel>难度级别</InputLabel>
              <Select
                label="难度级别"
                defaultValue={selectedBank?.level || 'beginner'}
                onChange={(e) => setBankForm({ ...bankForm, level: e.target.value as any })}
              >
                <MenuItem value="beginner">初级</MenuItem>
                <MenuItem value="intermediate">中级</MenuItem>
                <MenuItem value="advanced">高级</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="分类"
              size="small"
              defaultValue={selectedBank?.category || ''}
              onChange={(e) => setBankForm({ ...bankForm, category: e.target.value })}
            />
            <TextField
              fullWidth
              label="题目数量"
              size="small"
              type="number"
              defaultValue={selectedBank?.questionCount || 0}
              onChange={(e) => setBankForm({ ...bankForm, questionCount: Number(e.target.value) })}
            />
            <TextField
              fullWidth
              label="时间限制（分钟）"
              size="small"
              type="number"
              defaultValue={selectedBank?.timeLimit || 0}
              onChange={(e) => setBankForm({ ...bankForm, timeLimit: Number(e.target.value) })}
            />
            <TextField
              fullWidth
              label="及格分数"
              size="small"
              type="number"
              defaultValue={selectedBank?.passingScore || 0}
              onChange={(e) => setBankForm({ ...bankForm, passingScore: Number(e.target.value) })}
            />
            <TextField
              fullWidth
              label="标签（用逗号分隔）"
              size="small"
              defaultValue={selectedBank?.tags?.join(', ') || ''}
              onChange={(e) => setBankForm({ ...bankForm, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBankDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveBank} variant="contained">
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
