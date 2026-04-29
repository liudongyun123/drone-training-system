/**
 * C 端课程列表页
 */

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery } from '../hooks/useQuery'
import { useAdd, useDelete } from '../hooks/useMutation'
import { Course } from '../types/database'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material'
import {
  AddShoppingCart as CartIcon,
  Visibility as ViewIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

export default function CoursesPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<string>('')
  const [cart, setCart] = useState<string[]>([])

  // 使用查询 Hook
  const { data: courses, loading, error, refresh } = useQuery<Course>('courses', {
    orderBy: 'createdAt',
    order: 'desc'
  })

  // 使用购物车 Hooks（简化版，仅存储课程ID）
  const { loading: adding, execute: addToCart } = useAdd('cart', {
    onSuccess: () => {
      alert('已加入购物车')
    }
  })

  const { loading: removing, execute: removeFromCart } = useDelete('cart', {
    onSuccess: () => {
      alert('已从购物车移除')
    }
  })

  // 过滤课程
  const filteredCourses = useMemo(() => {
    if (!category) return courses

    return courses.filter(course => {
      if (category && course.category !== category) return false
      return true
    })
  }, [courses, category])

  // 分类统计
  const categoryCount = useMemo(() => {
    const counts = courses.reduce((acc, course) => {
      if (course.category) {
        acc[course.category] = (acc[course.category] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return counts
  }, [courses])

  // 检查是否在购物车
  const isInCart = (courseId: string) => {
    return cart.includes(courseId)
  }

  // 添加到购物车
  const handleAddToCart = (courseId: string) => {
    addToCart({ courseId, addedAt: new Date().toISOString() })
  }

  // 从购物车移除
  const handleRemoveFromCart = (courseId: string) => {
    removeFromCart(courseId)
  }

  // 查看课程详情
  const handleViewCourse = (courseId: string) => {
    navigate(`/courses/${courseId}`)
  }

  // 分类标签
  const categories = [
    { id: 'all', label: '全部课程' },
    { id: 'multi', label: '多旋翼培训' },
    { id: 'fixed', label: '固定翼培训' },
    { id: 'photography', label: '航拍技巧' },
    { id: 'repair', label: '维修保养' },
    { id: 'laws', label: '法律法规' }
  ]

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* 标题 */}
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        课程中心
      </Typography>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 分类标签 */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <Button
            key={cat.id}
            variant={category === cat.id ? 'contained' : 'outlined'}
            onClick={() => setCategory(cat.id === 'all' ? '' : cat.id)}
          >
            {cat.label}
            {cat.id !== 'all' && (
              <Chip
                size="small"
                sx={{ ml: 1 }}
                label={categoryCount[cat.id] || 0}
              />
            )}
          </Button>
        ))}
      </Box>

      {/* 加载中 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 课程列表 */}
      {!loading && (
        <Grid container spacing={3}>
          {filteredCourses.length === 0 ? (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography color="text.secondary">
                  暂无课程数据
                </Typography>
              </Box>
            </Grid>
          ) : (
            filteredCourses.map((course) => (
              <Grid item xs={12} sm={6} md={4} key={course._id}>
                <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={course.thumbnail || 'https://via.placeholder.com/400x180?text=No+Image'}
                    sx={{ position: 'relative' }}
                  />
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom noWrap>
                          {course.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {course.description}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label={course.category} size="small" color="primary" />
                        <Chip label={course.level} size="small" />
                        <Chip label={course.type} size="small" />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" color="primary.main" fontWeight="bold">
                        ¥{course.price}
                      </Typography>
                      {course.originalPrice > course.price && (
                        <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through', ml: 1 }}>
                          ¥{course.originalPrice}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {course.lessons} 节 · {course.duration} 小时
                      </Typography>
                      <Typography variant="body2" color="primary">
                        {course.students} 人学习
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        评分: {course.rating?.toFixed(1)} / 5.0
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Button
                        size="small"
                        variant={isInCart(course._id) ? 'outlined' : 'contained'}
                        onClick={() => isInCart(course._id) ? handleRemoveFromCart(course._id) : handleAddToCart(course._id)}
                        disabled={adding || removing}
                      >
                        {isInCart(course._id) ? <CartIcon /> : <CartIcon sx={{ mr: 0.5 }} />}
                        {isInCart(course._id) ? '已加购物车' : '加入购物车'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleViewCourse(course._id)}
                        startIcon={<ViewIcon />}
                      >
                        查看详情
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}
    </Container>
  )
}
