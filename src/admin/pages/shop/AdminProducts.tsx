// ============================================================================
// 商品管理页面 - 后台（Tailwind + 自定义组件）
// ============================================================================

import { useState, useEffect } from 'react'
import { useConfirm } from '@/admin/hooks/useConfirm'
import { Button, Input, TextArea, Modal } from '@/components'
import { ConfirmDialog } from '@/components'
import { Plus, Edit, Trash2 } from 'lucide-react'
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
        status: (p.status === 'onsale' ? 'active' : p.status === 'inactive' ? 'inactive' : p.status) as 'active' | 'inactive'
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
        status: formData.status,
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

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          新增商品
        </Button>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">商品图片</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">商品名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">分类</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">价格</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">库存</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">销量</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <img
                      src={product.coverImage || 'https://via.placeholder.com/60x60?text=无图'}
                      alt={product.name}
                      className="w-15 h-15 rounded-lg object-cover"
                      style={{ width: 60, height: 60 }}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{product.name || product.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {categories.find(c => c._id === product.categoryId)?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">¥{product.price}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{product.stock}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{product.sales || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      product.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {product.status === 'active' ? '在售' : '下架'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenDialog(product)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product._id!)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 编辑对话框 */}
      <Modal
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={editingProduct ? '编辑商品' : '新增商品'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="商品名称"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value, title: e.target.value })}
              placeholder="请输入商品名称"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择分类</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="价格"
              type="number"
              value={String(formData.price)}
              onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              placeholder="请输入价格"
            />
            <Input
              label="原价"
              type="number"
              value={String(formData.originalPrice)}
              onChange={e => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) || 0 })}
              placeholder="请输入原价"
            />
            <Input
              label="库存"
              type="number"
              value={String(formData.stock)}
              onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
              placeholder="请输入库存"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">在售</option>
                <option value="inactive">下架</option>
              </select>
            </div>
          </div>
          
          <Input
            label="封面图片URL"
            value={formData.coverImage}
            onChange={e => setFormData({ ...formData, coverImage: e.target.value })}
            placeholder="请输入封面图片URL"
          />
          
          <TextArea
            label="商品描述"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="请输入商品描述"
            rows={3}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFeatured"
              checked={formData.isFeatured}
              onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700">
              推荐商品
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleCloseDialog}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </div>
      </Modal>

      <ConfirmDialog />
    </div>
  )
}
