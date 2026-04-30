// pages/product-detail/product-detail.js
// 商品详情页

import { dbGetList } from '../../utils/http'

Page({
  data: {
    loading: true,
    product: null,
    quantity: 1,
    currentSwiperIndex: 0,
    showSkuPicker: false,
    buyType: 'cart',
    selectedSku: null,
    selectedSpecs: {},
    specs: [],
    skuList: [],
    productId: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ productId: options.id })
      this.loadProductDetail(options.id)
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  async loadProductDetail(productId) {
    this.setData({ loading: true })
    
    try {
      const result = await dbGetList('products', {
        where: { _id: productId }
      })
      
      if (result.data && result.data.length > 0) {
        const product = result.data[0]
        
        // 处理轮播图数据
        if (typeof product.images === 'string') {
          product.images = [product.images]
        } else if (!product.images || !product.images.length) {
          product.images = ['/assets/images/default-product.png']
        }
        
        // 处理规格数据
        const specs = product.specs && product.specs.length > 0 ? product.specs : []
        const skuList = product.skuList && product.skuList.length > 0 ? product.skuList : []
        
        this.setData({
          loading: false,
          product,
          specs,
          skuList
        })
        
        wx.setNavigationBarTitle({
          title: product.name || '商品详情'
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '商品不存在', icon: 'none' })
      }
    } catch (err) {
      console.error('加载商品详情失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onSwiperChange(e) {
    this.setData({ currentSwiperIndex: e.detail.current })
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src
    wx.previewImage({
      current: src,
      urls: this.data.product.images
    })
  },

  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/shop/shop' })
      }
    })
  },

  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  decreaseQty() {
    const qty = this.data.quantity
    if (qty > 1) {
      this.setData({ quantity: qty - 1 })
    } else {
      wx.showToast({ title: '至少选择1件', icon: 'none' })
    }
  },

  increaseQty() {
    const qty = this.data.quantity
    const stock = this.data.selectedSku?.stock || this.data.product?.stock || 999
    if (qty < stock) {
      this.setData({ quantity: qty + 1 })
    } else {
      wx.showToast({ title: '库存不足', icon: 'none' })
    }
  },

  openSkuPicker(e) {
    const type = e.currentTarget.dataset.type || 'cart'
    this.setData({ showSkuPicker: true, buyType: type })
  },

  closeSkuPicker() {
    this.setData({ showSkuPicker: false })
  },

  selectSpec(e) {
    const specName = e.currentTarget.dataset.specName
    const specValue = e.currentTarget.dataset.specValue
    
    const selectedSpecs = { ...this.data.selectedSpecs }
    selectedSpecs[specName] = specValue
    
    this.setData({ selectedSpecs })
    this.matchSku()
  },

  matchSku() {
    const { skuList, selectedSpecs } = this.data
    if (!skuList || skuList.length === 0) return
    
    const specKey = Object.values(selectedSpecs).sort().join(',')
    
    const matchedSku = skuList.find(sku => {
      const skuSpecKey = sku.specs ? sku.specs.sort().join(',') : ''
      return skuSpecKey === specKey
    })
    
    if (matchedSku) {
      this.setData({ selectedSku: matchedSku })
    }
  },

  confirmAction() {
    const { buyType, product, quantity, selectedSku, selectedSpecs, specs } = this.data
    
    if (specs && specs.length > 0) {
      const specNames = specs.map(s => s.name)
      const selectedSpecNames = Object.keys(selectedSpecs)
      const missingSpecs = specNames.filter(name => !selectedSpecs[name])
      
      if (missingSpecs.length > 0) {
        wx.showToast({ title: '请选择完整的规格', icon: 'none' })
        return
      }
    }
    
    const productInfo = {
      id: product._id || product.id,
      name: product.name,
      price: selectedSku?.price || product.price,
      image: product.images?.[0] || '',
      quantity,
      specs: selectedSpecs,
      skuId: selectedSku?.id || null,
      stock: selectedSku?.stock || product.stock
    }
    
    if (buyType === 'cart') {
      this.addToCart(productInfo)
    } else {
      this.goToCheckout(productInfo)
    }
  },

  addToCart(productInfo) {
    try {
      const cartData = wx.getStorageSync('shop_cart') || []
      
      const existIndex = cartData.findIndex(item => 
        item._id === productInfo.id || item.id === productInfo.id
      )
      
      if (existIndex > -1) {
        cartData[existIndex].quantity += productInfo.quantity
      } else {
        cartData.push({
          _id: productInfo.id,
          name: productInfo.name,
          price: productInfo.price,
          coverImage: productInfo.image || '',
          stock: productInfo.stock || 99,
          quantity: productInfo.quantity
        })
      }
      
      wx.setStorageSync('shop_cart', cartData)
      this.setData({ showSkuPicker: false })
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    } catch (err) {
      console.error('加入购物车失败:', err)
      wx.showToast({ title: '加入购物车失败', icon: 'none' })
    }
  },

  goToCheckout(productInfo) {
    this.setData({ showSkuPicker: false })
    wx.navigateTo({
      url: `/pages/checkout/checkout?productInfo=${encodeURIComponent(JSON.stringify(productInfo))}`
    })
  },

  onShareAppMessage() {
    const { product } = this.data
    return {
      title: product.name || '商品详情',
      path: `/pages/product-detail/product-detail?id=${this.data.productId}`,
      imageUrl: product.images?.[0] || ''
    }
  },

  onPullDownRefresh() {
    if (this.data.productId) {
      this.loadProductDetail(this.data.productId).finally(() => {
        wx.stopPullDownRefresh()
      })
    } else {
      wx.stopPullDownRefresh()
    }
  }
})
