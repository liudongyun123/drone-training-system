import { useState, useEffect } from 'react'
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Grid,
  Rating,
  Alert,
  Avatar,
  CircularProgress,
  Card,
  CardContent,
  InputAdornment,
} from '@mui/material'
import { Delete, Reply, Search as SearchIcon } from '@mui/icons-material'
import { CloudCommentAdminService } from '../../services/CloudAdminService'
import AdminTablePagination from './AdminTablePagination'

interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  courseId?: string
  courseName?: string
  content: string
  rating?: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reply?: string
}

export default function CommentManagement() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [, setDialogOpen] = useState(false)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null)
  const [success, setSuccess] = useState('')
  const [replyContent, setReplyContent] = useState('')

  // 分页状态
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)

  // 搜索状态
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    loadComments()
  }, [page, rowsPerPage, searchText])

  const loadComments = async () => {
    try {
      setLoading(true)
      const offset = page * rowsPerPage
      // ✅ 优化：getAll 直接返回 total
      const result = await CloudCommentAdminService.getAll({
        offset,
        limit: rowsPerPage,
        search: searchText || undefined,
      })
      if (result.success && result.data) {
        // ✅ 数据映射：确保字段兼容
        const mappedData = result.data.map((item: any) => ({
          id: item._id || item.id,
          userId: item.userId || item._openid || '',
          userName: item.userName || item.user_name || '匿名用户',
          userAvatar: item.userAvatar || item.user_avatar,
          courseId: item.courseId || item.course_id,
          courseName: item.courseName || item.course_name || '',
          content: item.content || '',
          rating: item.rating || 0,
          status: item.status || 'pending',
          createdAt: item.createdAt || item.created_at || '',
          reply: item.reply || '',
          replies: item.replies || [],
        }))
        setComments(mappedData)
        // ✅ 从 getAll 结果中获取 total
        if (result.total !== undefined) {
          setTotal(result.total)
        }
      }
    } catch (error) {
      console.error('加载评论失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewComment = (comment: Comment) => {
    setSelectedComment(comment)
    setViewDialogOpen(true)
  }

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false)
    setSelectedComment(null)
  }

  const handleOpenReplyDialog = (comment: Comment) => {
    setSelectedComment(comment)
    setReplyContent(comment.reply || '')
    setReplyDialogOpen(true)
  }

  const handleCloseReplyDialog = () => {
    setReplyDialogOpen(false)
    setSelectedComment(null)
    setReplyContent('')
  }

  const handleReplySubmit = async () => {
    if (!selectedComment || !replyContent.trim()) return

    try {
      const result = await CloudCommentAdminService.update(selectedComment.id, { reply: replyContent })
      if (result.success) {
        setSuccess('回复成功')
        await loadComments()
        setTimeout(() => setSuccess(''), 2000)
        handleCloseReplyDialog()
      }
    } catch (error) {
      console.error('回复评论失败:', error)
    }
  }

  const handleApproveComment = async (commentId: string) => {
    try {
      const result = await CloudCommentAdminService.update(commentId, { status: 'approved' })
      if (result.success) {
        setSuccess('评论已通过')
        await loadComments()
        setTimeout(() => setSuccess(''), 2000)
      }
    } catch (error) {
      console.error('审核评论失败:', error)
    }
  }

  const handleRejectComment = async (commentId: string) => {
    try {
      const result = await CloudCommentAdminService.update(commentId, { status: 'rejected' })
      if (result.success) {
        setSuccess('评论已拒绝')
        await loadComments()
        setTimeout(() => setSuccess(''), 2000)
      }
    } catch (error) {
      console.error('审核评论失败:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('确定要删除这条评论吗?')) {
      try {
        const result = await CloudCommentAdminService.delete(commentId)
        if (result.success) {
          setSuccess('评论已删除')
          await loadComments()
          setTimeout(() => setSuccess(''), 2000)
        }
      } catch (error) {
        console.error('删除评论失败:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success'
      case 'pending':
        return 'warning'
      case 'rejected':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return '已通过'
      case 'pending':
        return '待审核'
      case 'rejected':
        return '已拒绝'
      default:
        return status
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">评论反馈管理</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {success && <Alert severity="success" sx={{ mb: 0 }}>{success}</Alert>}
          <TextField
            placeholder="搜索评论内容或用户..."
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
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                总评论数
              </Typography>
              <Typography variant="h4" sx={{ color: 'primary.main' }}>{total || comments.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                待审核
              </Typography>
              <Typography variant="h4" sx={{ color: 'warning.main' }}>
                {comments.filter(c => c.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                平均评分
              </Typography>
              <Typography variant="h4" sx={{ color: 'primary.main' }}>
                {total > 0 && comments.length > 0
                  ? (comments.reduce((sum, c) => sum + (c.rating || 0), 0) / comments.length).toFixed(1)
                  : '0.0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>用户</TableCell>
              <TableCell>课程</TableCell>
              <TableCell>评论内容</TableCell>
              <TableCell>评分</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  暂无评论数据
                </TableCell>
              </TableRow>
            ) : (
              comments.map((comment) => (
                <TableRow key={comment.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        src={comment.userAvatar}
                        sx={{ width: 32, height: 32 }}
                      >
                        {comment.userName ? comment.userName[0] : 'U'}
                      </Avatar>
                      <Typography variant="body2">{comment.userName || '未知用户'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{comment.courseName || '-'}</TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {comment.content}
                  </TableCell>
                  <TableCell>
                    {comment.rating !== undefined && comment.rating > 0 && (
                      <Rating value={comment.rating} readOnly size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(comment.status)}
                      color={getStatusColor(comment.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{comment.createdAt ? new Date(comment.createdAt).toLocaleString('zh-CN') : '-'}</TableCell>
                  <TableCell>
                    <Button size="small" variant="text" onClick={() => handleViewComment(comment)}>
                      详情
                    </Button>
                    {comment.status === 'pending' && (
                      <>
                        <Button
                          size="small"
                          color="success"
                          onClick={() => handleApproveComment(comment.id)}
                        >
                          通过
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleRejectComment(comment.id)}
                        >
                          拒绝
                        </Button>
                      </>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleOpenReplyDialog(comment)}
                    >
                      <Reply fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <AdminTablePagination
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newRowsPerPage) => setRowsPerPage(newRowsPerPage)}
      />

      {/* 查看评论详情 */}
      <Dialog open={viewDialogOpen} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>评论详情</DialogTitle>
        <DialogContent>
          {selectedComment && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar
                  src={selectedComment.userAvatar}
                  sx={{ width: 48, height: 48 }}
                >
                  {selectedComment.userName[0]}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">{selectedComment.userName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedComment.createdAt}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  课程: {selectedComment.courseName}
                </Typography>
                {selectedComment.rating !== undefined && (
                  <Rating value={selectedComment.rating} readOnly />
                )}
              </Box>

              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedComment.content}
              </Typography>

              {selectedComment.reply && (
                <Box sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    管理员回复:
                  </Typography>
                  <Typography variant="body2">{selectedComment.reply}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 回复评论 */}
      <Dialog open={replyDialogOpen} onClose={handleCloseReplyDialog} maxWidth="sm" fullWidth>
        <DialogTitle>回复评论</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="回复内容"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReplyDialog}>取消</Button>
          <Button onClick={handleReplySubmit} variant="contained">
            提交回复
          </Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Box>
  )
}
