// ============================================================================
// 商品详情页 - Web 端
// ============================================================================

import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Typography,
  Button,
  Chip,
  Skeleton,
  IconButton,
  TextField,
  Paper,
  Divider,
  Rating,
  Tabs,
  Tab
} from '@mui/material'
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as CartIcon
} from '@mui/icons-material'
import { useParams, useNavigate } from 'react-router-dom'
import { productApi } from '@/shared/services/shopApi'
import type { Product } from '@/shared/types/shop'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (id) {
      loadProduct(id)
    }
  }, [id])

  const loadProduct = async (productId: string) => {
    try {
      setLoading(true)
      const data = await productApi.getDetail(productId)
      setProduct(data)
    } catch (err) {
      console.error('加载商品失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem('shop_cart') || '[]')
    const exist = cart.find((item: any) => item.product._id === product!._id)
    
    if (exist) {
      exist.quantity += quantity
    } else {
      cart.push({ product, quantity })
    }
    
    localStorage.setItem('shop_cart', JSON.stringify(cart))
    navigate('/shop')
  }

  const buyNow = () => {
    localStorage.setItem('checkout_items', JSON.stringify([{ product, quantity }]))
    navigate(`/checkout?type=shop&id=${product!._id}&quantity=${quantity}`)
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="text" height={40} />
            <Skeleton variant="text" height={20} />
            <Skeleton variant="text" height={20} width="60%" />
          </Grid>
        </Grid>
      </Box>
    )
  }

  if (!product) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">商品不存在</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={4}>
        {/* 左侧图片 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box
              component="img"
              src={product.coverImage || '/placeholder.png'}
              alt={product.name}
              sx={{ width: '100%', borderRadius: 1 }}
            />
          </Paper>
        </Grid>

        {/* 右侧信息 */}
        <Grid item xs={12} md={6}>
          <Typography variant="h4" gutterBottom>
            {product.name}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip label={`${product.salesCount}已售`} size="small" />
            {product.stock > 0 ? (
              <Chip label={`库存 ${product.stock}`} size="small" color="success" />
            ) : (
              <Chip label="缺货" size="small" color="error" />
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h4" color="error" fontWeight={600}>
            ¥{product.price}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {product.description}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* 数量选择 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography sx={{ mr: 2 }}>数量:</Typography>
            <IconButton onClick={() => setQuantity(q => Math.max(1, q - 1))}>
              <RemoveIcon />
            </IconButton>
            <TextField
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              size="small"
              sx={{ width: 80, mx: 1 }}
              inputProps={{ style: { textAlign: 'center' } }}
            />
            <IconButton onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}>
              <AddIcon />
            </IconButton>
          </Box>

          {/* 操作按钮 */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<CartIcon />}
              onClick={addToCart}
              sx={{ flex: 1 }}
            >
              加入购物车
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={buyNow}
              sx={{ flex: 1 }}
            >
              立即购买
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* 详情标签页 */}
      <Box sx={{ mt: 4 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="商品详情" />
          <Tab label="规格参数" />
        </Tabs>
        <Paper sx={{ p: 3, mt: 2 }}>
          {activeTab === 0 && (
            <Typography color="text.secondary">
              {product.detail || '暂无详情'}
            </Typography>
          )}
          {activeTab === 1 && (
            <Typography color="text.secondary">
              {product.specifications || '暂无规格参数'}
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  )
}