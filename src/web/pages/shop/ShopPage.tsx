// ============================================================================
// 商城页面 - Web 端
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Typography,
  Chip,
  Rating,
  Skeleton,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Divider
} from '@mui/material'
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { productApi, categoryApi } from '@/shared/services/shopApi'
import type { Product, ProductCategory } from '@/shared/types/shop'

interface CartItem {
  product: Product
  quantity: number
}

export default function ShopPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('shop_cart')
    return saved ? JSON.parse(saved) : []
  })

  // 加载商品和分类
  useEffect(() => {
    loadData()
  }, [])

  // 保存购物车到 localStorage
  useEffect(() => {
    localStorage.setItem('shop_cart', JSON.stringify(cart))
  }, [cart])

  const loadData = async () => {
    try {
      setLoading(true)
      const [productsData, categoriesData] = await Promise.all([
        productApi.getList({ pageSize: 50 }),
        categoryApi.getList()
      ])
      setProducts(productsData.products)
      setCategories(categoriesData)
    } catch (err) {
      console.error('加载商品失败:', err)
    } finally {
      setLoading(false)
    }
  }

  // 筛选商品
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || product.categoryId === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  // 购物车数量
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  // 添加到购物车
  const addToCart = (product: Product) => {
    setCart(prev => {
      const exist = prev.find(item => item.product._id === product._id)
      if (exist) {
        return prev.map(item =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  // 更新购物车数量
  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product._id === productId) {
          const newQuantity = item.quantity + delta
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
        }
        return item
      }).filter(item => item.quantity > 0)
    )
  }

  // 从购物车移除
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product._id !== productId))
  }

  // 结算
  const handleCheckout = () => {
    localStorage.setItem('checkout_items', JSON.stringify(cart))
    navigate('/checkout?type=shop')
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 头部 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          配件商城
        </Typography>
        <IconButton onClick={() => setCartDrawerOpen(true)}>
          <Badge badgeContent={cartCount} color="error">
            <CartIcon />
          </Badge>
        </IconButton>
      </Box>

      {/* 搜索和筛选 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="搜索商品..."
          size="small"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>分类</InputLabel>
          <Select
            value={selectedCategory}
            label="分类"
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="">全部</MenuItem>
            {categories.map(cat => (
              <MenuItem key={cat._id} value={cat._id}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 商品列表 */}
      {loading ? (
        <Grid container spacing={3}>
          {[...Array(8)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rectangular" height={200} />
              <Skeleton variant="text" />
              <Skeleton variant="text" width="60%" />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {filteredProducts.map(product => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
              <Card>
                <CardActionArea onClick={() => navigate(`/shop/${product._id}`)}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={product.coverImage || '/placeholder.png'}
                    alt={product.name}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="subtitle1" noWrap>
                      {product.name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography color="error" fontWeight={600}>
                        ¥{product.price}
                      </Typography>
                      <Chip
                        label={`${product.salesCount}已售`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ p: 1, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="small"
                    onClick={() => addToCart(product)}
                  >
                    加入购物车
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 购物车抽屉 */}
      <Drawer
        anchor="right"
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      >
        <Box sx={{ width: 360, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            购物车 ({cartCount})
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {cart.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              购物车空空如也
            </Typography>
          ) : (
            <>
              <List>
                {cart.map(item => (
                  <ListItem key={item.product._id}>
                    <ListItemText
                      primary={item.product.name}
                      secondary={`¥${item.product.price}`}
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton size="small" onClick={() => updateCartQuantity(item.product._id, -1)}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                        <IconButton size="small" onClick={() => updateCartQuantity(item.product._id, 1)}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => removeFromCart(item.product._id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>合计:</Typography>
                <Typography color="error" fontWeight={600}>
                  ¥{cartTotal.toFixed(2)}
                </Typography>
              </Box>
              <Button variant="contained" fullWidth onClick={handleCheckout}>
                去结算
              </Button>
            </>
          )}
        </Box>
      </Drawer>
    </Box>
  )
}