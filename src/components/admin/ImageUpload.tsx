import React, { useState, useCallback, useRef } from 'react'
import { Box, Typography, CircularProgress, Alert, IconButton, LinearProgress } from '@mui/material'
import { CloudUpload as CloudUploadIcon, Delete as DeleteIcon, Image as ImageIcon, CheckCircle } from '@mui/icons-material'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  accept?: string
  maxSize?: number // MB
  label?: string
  aspectRatio?: string // 如 "16/9", "4/3", "1/1"
}

export default function ImageUpload({
  value,
  onChange,
  accept = 'image/*',
  maxSize = 10,
  label = '封面图片',
  aspectRatio = '16/9'
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadToCloudBase = async (file: File): Promise<string | null> => {
    try {
      const { app } = await import('../../utils/cloudbase')
      const cloudPath = `course-covers/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      
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
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件')
      return
    }
    
    // 检查文件大小
    if (file.size > maxSize * 1024 * 1024) {
      setError(`图片大小不能超过 ${maxSize}MB`)
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
    // 重置input以允许重复选择同一文件
    e.target.value = ''
  }

  const handleDelete = () => {
    onChange('')
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
        // 已上传图片预览
        <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
          <Box
            component="img"
            src={value}
            alt={label}
            sx={{
              width: '100%',
              aspectRatio: aspectRatio,
              objectFit: 'cover',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          />
          <Box sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            display: 'flex', 
            gap: 1 
          }}>
            <IconButton
              size="small"
              onClick={handleClick}
              sx={{
                bgcolor: 'rgba(255,255,255,0.95)',
                color: 'primary.main',
                '&:hover': { bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
              }}
            >
              <CloudUploadIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{
                bgcolor: 'rgba(255,255,255,0.95)',
                color: 'error.main',
                '&:hover': { bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ 
            position: 'absolute', 
            bottom: 8, 
            left: 8,
            px: 1.5,
            py: 0.5,
            bgcolor: 'rgba(46,125,50,0.9)',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <CheckCircle sx={{ fontSize: 14, color: 'white' }} />
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>
              已上传
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
            borderColor: dragOver ? 'primary.main' : uploading ? 'grey.300' : 'grey.300',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: uploading ? 'default' : 'pointer',
            bgcolor: dragOver ? 'primary.light' : 'grey.50',
            transition: 'all 0.2s ease',
            '&:hover': uploading ? {} : {
              borderColor: 'primary.main',
              bgcolor: 'primary.light',
              '& .upload-icon': {
                transform: 'scale(1.1)',
                color: 'primary.main'
              }
            }
          }}
        >
          {uploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  size={64}
                  thickness={3}
                  sx={{ color: 'primary.main' }}
                />
                <Box sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Typography variant="caption" component="div" color="text.secondary" fontWeight="600">
                    {uploadProgress}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                正在上传图片...
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ width: '80%', borderRadius: 1 }}
              />
            </Box>
          ) : (
            <>
              <Box 
                className="upload-icon"
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  gap: 2,
                  mb: 2,
                  transition: 'all 0.2s ease'
                }}
              >
                <Box sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                }}>
                  <CloudUploadIcon sx={{ fontSize: 28, color: 'white' }} />
                </Box>
                <Box sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ImageIcon sx={{ fontSize: 28, color: 'grey.500' }} />
                </Box>
              </Box>
              <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500, mb: 0.5 }}>
                拖拽图片到此处上传
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
                  支持 JPG、PNG、GIF、WebP 格式，最大 {maxSize}MB
                </Typography>
              </Box>
            </>
          )}
        </Box>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </Box>
  )
}
