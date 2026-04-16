import React, { useState, useEffect } from 'react'
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, IconButton, Grid } from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import { CloudScheduleAdminService } from '../../services/CloudAdminService'

export default function ScheduleManagement() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null)
  const [scheduleForm, setScheduleForm] = useState({
    courseTitle: '',
    courseId: '',
    instructor: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    status: 'scheduled' as const,
  })
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  })

  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const result = await CloudScheduleAdminService.getAll()
      if (result.success && result.data) {
        setSchedules(result.data)
      }
    } catch (error) {
      console.error('加载课程表失败:', error)
      setSnackbar({ open: true, message: '加载课程表失败', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (schedule?: ClassSchedule) => {
    if (schedule) {
      setEditMode(true)
      setSelectedSchedule(schedule)
      setScheduleForm({
        courseTitle: schedule.courseTitle,
        courseId: schedule.courseId,
        instructor: schedule.instructor,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location,
        status: schedule.status,
      })
    } else {
      setEditMode(false)
      setSelectedSchedule(null)
      setScheduleForm({
        courseTitle: '',
        courseId: '',
        instructor: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        status: 'scheduled',
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setSelectedSchedule(null)
    setScheduleForm({
      courseTitle: '',
      courseId: '',
      instructor: '',
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      status: 'scheduled',
    })
  }

  const handleSaveSchedule = async () => {
    if (!scheduleForm.courseTitle.trim() || !scheduleForm.date.trim()) {
      setSnackbar({ open: true, message: '请填写必填项', severity: 'error' })
      return
    }

    try {
      if (editMode && selectedSchedule) {
        const result = await CloudScheduleAdminService.update(selectedSchedule.id, scheduleForm)
        if (result.success) {
          setSnackbar({ open: true, message: '更新成功', severity: 'success' })
          await loadSchedules()
        }
      } else {
        const result = await CloudScheduleAdminService.add(scheduleForm)
        if (result.success) {
          setSnackbar({ open: true, message: '创建成功', severity: 'success' })
          await loadSchedules()
        }
      }
      handleCloseDialog()
    } catch (error) {
      console.error('保存课程表失败:', error)
      setSnackbar({ open: true, message: '保存失败', severity: 'error' })
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('确定要删除此课程表吗？')) return
    try {
      const result = await CloudScheduleAdminService.delete(id)
      if (result.success) {
        setSnackbar({ open: true, message: '删除成功', severity: 'success' })
        await loadSchedules()
      } else {
        setSnackbar({ open: true, message: '删除失败', severity: 'error' })
      }
    } catch (error) {
      console.error('删除课程表失败:', error)
      setSnackbar({ open: true, message: '删除失败', severity: 'error' })
    }
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">课程表管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          新增课程表
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>课程</TableCell>
              <TableCell>讲师</TableCell>
              <TableCell>日期</TableCell>
              <TableCell>时间</TableCell>
              <TableCell>地点</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>{schedule.courseTitle}</TableCell>
                <TableCell>{schedule.instructor}</TableCell>
                <TableCell>{schedule.date}</TableCell>
                <TableCell>{schedule.startTime} - {schedule.endTime}</TableCell>
                  <TableCell>{schedule.location}</TableCell>
                  <TableCell>
                    <Chip
                      label={schedule.status === 'scheduled' ? '已安排' : '已完成'}
                      color={schedule.status === 'scheduled' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpenDialog(schedule)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteSchedule(schedule.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? '编辑课程表' : '新增课程表'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="课程名称"
            fullWidth
            variant="outlined"
            value={scheduleForm.courseTitle}
            onChange={(e) => setScheduleForm({ ...scheduleForm, courseTitle: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="课程ID"
            fullWidth
            variant="outlined"
            value={scheduleForm.courseId}
            onChange={(e) => setScheduleForm({ ...scheduleForm, courseId: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="讲师"
            fullWidth
            variant="outlined"
            value={scheduleForm.instructor}
            onChange={(e) => setScheduleForm({ ...scheduleForm, instructor: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="日期"
            fullWidth
            type="date"
            variant="outlined"
            value={scheduleForm.date}
            onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="开始时间"
                fullWidth
                type="time"
                variant="outlined"
                value={scheduleForm.startTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="结束时间"
                fullWidth
                type="time"
                variant="outlined"
                value={scheduleForm.endTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <TextField
            margin="dense"
            label="地点"
            fullWidth
            variant="outlined"
            value={scheduleForm.location}
            onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSaveSchedule} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  )
}
