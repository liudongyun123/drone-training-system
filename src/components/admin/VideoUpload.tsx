import React, { useState, useCallback, useRef } from 'react'
import { Box, Typography, IconButton, Alert, LinearProgress } from '@mui/material'
import { CloudUpload as CloudUploadIcon, Delete as DeleteIcon, VideoLibrary as VideoIcon, CheckCircle } from '@mui/icons-material'

interface VideoUploadProps {
  value?: string
  onChange: (url: string) => void
  maxSize?: number // MB
  label?: string
}

export default function VideoUpload({
  value,
  onChange,
  maxSize = 500, // 默认500MB，视频通常较大
  label = '视频文件'
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadToCloudBase = async (file: File): Promise<string | null> => {
    try {
      const { app, ensureInit } = await import('../../utils/cloudbase')
      const cloudPath = `course-videos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      
      // 确保 SDK 初始化完成
      await ensureInit()
      
      // 确保用户已登录
      await app.auth().getLoginState()
      
      const uploadResult = await app.uploadFile({
        cloudPath,
        filePath: file,
        onUploadProgress: (progress: any) => {
          const percent = Math.round((progress.loaded / progress.total) * 100)
          setUploadProgress(percent)
        }
      })
      
      // 获取永久链接
      const getUrlResult = await app.getTempFileURL({
        fileList: [uploadResult.fileID]
      })
      
      if (getUrlResult.fileList && getUrlResult.fileList[0]) {
        return getUrlResult.fileList[0].tempFileURL || getUrlResult.fileList[0].download_url
      }
      return null
    } catch (err: any) {
      console.error('上传失败:', err)
      throw new Error(err?.message || '上传失败，请重试')
    }
  }

  const handleFile = useCallback(async (file: File) => {
    setError('')
    
    // 检查文件类型
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo']
    const isValidType = validVideoTypes.includes(file.type) || 
                        file.name.endsWith('.mp4') || 
                        file.name.endsWith('.webm') ||
                        file.name.endsWith('.ogg') ||
                        file.name.endsWith('.mov')
    
    if (!isValidType) {
      setError('请上传视频文件（支持 MP4、WebM、OGG 格式）')
      return
    }
    
    // 检查文件大小
    if (file.size > maxSize * 1024 * 1024) {
      setError(`视频大小不能超过 ${maxSize}MB`)
      return
    }
    
    setUploading(true)
    setUploadProgress(0)
    
    try {
      const url = await uploadToCloudBase(file)
      if (url) {
        onChange(url)
        setUploadProgress(100)
      } else {
        setError('上传成功但获取链接失败')
      }
    } catch (err: any) {
      setError(err.message || '上传失败，请重试')
    } finally {
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
      }, 1000)
    }
  }, [maxSize, onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
    e.target.value = ''
  }

  const handleDelete = () => {
    onChange('')
  }

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB'
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    } else {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
    }
  }

  // 提取文件名
  const getFileName = (url: string) => {
    if (!url) return ''
    try {
      const parts = url.split('/')
      return decodeURIComponent(parts[parts.length - 1].split('?')[0])
    } catch {
      return url
    }
  }

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500, color: 'text.primary' }}>
        {label}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {value ? (
        // 已上传视频预览
        <Box sx={{ 
          position: 'relative',
          bgcolor: 'grey.100',
          borderRadius: 2,
          p: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 64,
              height: 64,
              borderRadius: 1,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <VideoIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }} noWrap>
                {getFileName(value)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                视频已上传
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <IconButton
                onClick={handleClick}
                size="small"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                <CloudUploadIcon fontSize="small" />
              </IconButton>
              <IconButton
                onClick={handleDelete}
                size="small"
                sx={{
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'error.dark' }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ 
            mt: 1.5,
            px: 1,
            py: 0.5,
            bgcolor: 'success.light',
            borderRadius: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <CheckCircle sx={{ fontSize: 14, color: 'success.dark' }} />
            <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 500 }}>
              上传成功
            </Typography>
          </Box>
        </Box>
      ) : (
        // 上传区域
        <Box
          onClick={uploading ? undefined : handleClick}
          onDrop={uploading ? undefined : handleDrop}
          onDragOver={uploading ? undefined : handleDragOver}
          onDragLeave={uploading ? undefined : handleDragLeave}
          sx={{
            border: '2px dashed',
            borderColor: dragOver ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: uploading ? 'default' : 'pointer',
            bgcolor: dragOver ? 'primary.light' : 'grey.50',
            transition: 'all 0.2s ease',
            '&:hover': uploading ? {} : {
              borderColor: 'primary.main',
              bgcolor: 'primary.light'
            }
          }}
        >
          {uploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: '100%', maxWidth: 300 }}>
                <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
                  正在上传视频... {uploadProgress}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                请耐心等待，上传大文件可能需要较长时间
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                gap: 2,
                mb: 2
              }}>
                <Box sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                }}>
                  <CloudUploadIcon sx={{ fontSize: 32, color: 'white' }} />
                </Box>
                <Box sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  bgcolor: 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <VideoIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                </Box>
              </Box>
              <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500, mb: 0.5 }}>
                拖拽视频到此处上传
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                或点击选择文件
              </Typography>
              <Box sx={{
                display: 'inline-block',
                px: 2,
                py: 0.75,
                bgcolor: 'grey.200',
                borderRadius: 1,
              }}>
                <Typography variant="caption" color="text.secondary">
                  支持 MP4、WebM、OGG 格式，最大 {maxSize}MB
                </Typography>
              </Box>
            </>
          )}
        </Box>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,.mp4,.webm,.ogg,.mov"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </Box>
  )
}
