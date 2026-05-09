// ============================================================================
// 商品管理页面 - 后台
// ============================================================================

import React, { useState, useEffect } from 'react'
import { useConfirm } from '@/admin/hooks/useConfirm'
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { adminService } from '@/services/adminService'

interface Product {
  _id?: string;
  name: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  sales: number;
  category?: string;
  categoryId?: string;
  cover?: string;
  coverImage?: string;
  image?: string;
  status: 'active' | 'inactive' | 'onsale' | 'offsale';
  isFeatured?: boolean;
  createdAt?: string;
}

interface ProductCategory {
  _id?: string;
  name: string;
  code?: string;
}

export default function AdminProducts() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    price: 0,
    originalPrice: 0,
    stock: 0,
    categoryId: '',
    coverImage: '',
    status: 'active' as 'active' | 'inactive',
    isFeatured: false
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // 并行加载商品列表和分类列表
      const [productsResult, categoriesResult] = await Promise.all([
        adminService.listProducts({}, { limit: 100 }),
        adminService.listCategories({ status: 'active' }, { limit: 100 })
      ])
      
      // 映射数据字段（兼容不同命名）
      const mappedProducts: Product[] = (productsResult.data?.list || []).map(p => ({
        ...p,
        name: p.name || p.title || '',
        title: p.title || p.name || '',
        coverImage: p.coverImage || p.cover || p.image || '',
        sales: p.sales || 0,
        status: (p.status === 'onsale' ? 'active' : p.status === 'offsale' ? 'inactive' : p.status) as 'active' | 'inactive'
      }))
      
      setProducts(mappedProducts)
      setCategories(categoriesResult.data?.list || [])
    } catch (err) {
      console.error('加载商品失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name || product.title || '',
        title: product.title || product.name || '',
        description: product.description || '',
        price: product.price,
        originalPrice: product.originalPrice || 0,
        stock: product.stock,
        categoryId: product.categoryId || '',
        coverImage: product.coverImage || '',
        status: product.status,
        isFeatured: product.isFeatured || false
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '',
        title: '',
        description: '',
        price: 0,
        originalPrice: 0,
        stock: 0,
        categoryId: '',
        coverImage: '',
        status: 'active',
        isFeatured: false
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingProduct(null)
  }

  const handleSave = async () => {
    try {
      const saveData = {
        name: formData.name || formData.title,
        title: formData.title || formData.name,
        description: formData.description,
        price: formData.price,
        originalPrice: formData.originalPrice,
        stock: formData.stock,
        categoryId: formData.categoryId,
        coverImage: formData.coverImage,
        status: formData.status === 'active' ? 'active' : 'inactive',
        isFeatured: formData.isFeatured,
      }

      if (editingProduct?._id) {
        // 更新
        await adminService.updateProduct(editingProduct._id, { ...saveData, updatedAt: new Date().toISOString() })
      } else {
        // 创建
        await adminService.createProduct({ ...saveData, createdAt: new Date().toISOString() })
      }
      handleCloseDialog()
      loadData()
    } catch (err) {
      console.error('保存商品失败:', err)
      alert('保存失败: ' + (err as Error).message)
    }
  }

  const handleDelete = async (productId: string) => {
    const ok = await confirm({ title: '删除确认', message: '确定要删除该商品吗？', variant: 'danger' })
    if (!ok) return
    try {
      await adminService.deleteProduct(productId)
      loadData()
    } catch (err) {
      console.error('删除商品失败:', err)
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'active' || status === 'onsale' ? 'success' : 'default'
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          商品管理
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          新增商品
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>商品图片</TableCell>
              <TableCell>商品名称</TableCell>
              <TableCell>分类</TableCell>
              <TableCell>价格</TableCell>
              <TableCell>库存</TableCell>
              <TableCell>销量</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">加载中...</TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">暂无数据</TableCell>
              </TableRow>
            ) : (
              products.map(product => (
                <TableRow key={product._id}>
                  <TableCell>
                    <Box
                      component="img"
                      src={product.coverImage || '/placeholder.png'}
                      sx={{ width: 60, height: 60, borderRadius: 1, objectFit: 'cover' }}
                    />
                  </TableCell>
                  <TableCell>{product.name || product.title}</TableCell>
                  <TableCell>
                    {categories.find(c => c._id === product.categoryId)?.name || '-'}
                  </TableCell>
                  <TableCell>¥{product.price}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>{product.sales || 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={product.status === 'active' ? '在售' : '下架'}
                      color={getStatusColor(product.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpenDialog(product)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(product._id!)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 编辑对话框 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProduct ? '编辑商品' : '新增商品'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <TextField
              label="商品名称"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value, title: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>分类</InputLabel>
              <Select
                value={formData.categoryId}
                label="分类"
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
              >
                {categories.map(cat => (
                  <MenuItem key={cat._id} value={cat._id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="价格"
              type="number"
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <TextField
              label="原价"
              type="number"
              value={formData.originalPrice}
              onChange={e => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <TextField
              label="库存"
              type="number"
              value={formData.stock}
              onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status}
                label="状态"
                onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              >
                <MenuItem value="active">在售</MenuItem>
                <MenuItem value="inactive">下架</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="封面图片URL"
              value={formData.coverImage}
              onChange={e => setFormData({ ...formData, coverImage: e.target.value })}
              fullWidth
              sx={{ gridColumn: 'span 2' }}
            />
            <TextField
              label="商品描述"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
              sx={{ gridColumn: 'span 2' }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isFeatured}
                  onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                />
              }
              label="推荐商品"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button variant="contained" onClick={handleSave}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog />
    </Box>
  )
}