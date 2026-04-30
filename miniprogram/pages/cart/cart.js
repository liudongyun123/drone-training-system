// pages/cart/cart.js
// 购物车页面逻辑

const CART_KEY = 'shop_cart'

Page({
  data: {
    cartList: [],
    selectedAll: false,
    totalPrice: 0,
    totalCount: 0,
    selectedCount: 0
  },

  onLoad(options) {
    // 可以从其他页面传入参数
    if (options.from) {
      console.log('从', options.from, '页面进入')
    }
  },

  onShow() {
    // 每次显示页面时加载购物车数据
    this.loadCart()
  },

  // 加载购物车数据
  loadCart() {
    const cartList = wx.getStorageSync(CART_KEY) || []
    
    // 确保每个商品都有 selected 属性，并标准化数据结构
    const processedList = cartList.map(item => ({
      _id: item._id || item.product?._id,
      name: item.name || item.product?.name || '',
      price: item.price || item.product?.price || 0,
      coverImage: item.coverImage || item.product?.coverImage || '',
      stock: item.stock || item.product?.stock || 99,
      quantity: item.quantity || 1,
      selected: item.selected !== undefined ? item.selected : true
    }))
    
    this.calculateTotal(processedList)
    this.setData({ cartList: processedList })
  },

  // 计算总价和数量
  calculateTotal(list) {
    const cartList = list || this.data.cartList
    let totalPrice = 0
    let totalCount = 0
    let selectedCount = 0
    let selectedAll = cartList.length > 0

    cartList.forEach(item => {
      const price = item.price || 0
      totalCount += item.quantity
      
      if (item.selected) {
        totalPrice += price * item.quantity
        selectedCount += item.quantity
      } else {
        selectedAll = false
      }
    })

    this.setData({
      totalPrice: totalPrice.toFixed(2),
      totalCount,
      selectedCount,
      selectedAll
    })
  },

  // 单选商品
  onSelectItem(e) {
    const { index } = e.currentTarget.dataset
    const cartList = [...this.data.cartList]
    cartList[index].selected = !cartList[index].selected
    
    this.calculateTotal(cartList)
    this.setData({ cartList })
    this.saveCart(cartList)
  },

  // 全选/取消全选
  onSelectAll() {
    const selectedAll = !this.data.selectedAll
    const cartList = this.data.cartList.map(item => ({
      ...item,
      selected: selectedAll
    }))
    
    this.calculateTotal(cartList)
    this.setData({ cartList })
    this.saveCart(cartList)
  },

  // 增加数量
  onIncrease(e) {
    const { index } = e.currentTarget.dataset
    const cartList = [...this.data.cartList]
    const maxStock = cartList[index].stock || 99
    
    if (cartList[index].quantity < maxStock) {
      cartList[index].quantity += 1
      this.calculateTotal(cartList)
      this.setData({ cartList })
      this.saveCart(cartList)
    } else {
      wx.showToast({
        title: '库存不足',
        icon: 'none'
      })
    }
  },

  // 减少数量
  onDecrease(e) {
    const { index } = e.currentTarget.dataset
    const cartList = [...this.data.cartList]
    
    if (cartList[index].quantity > 1) {
      cartList[index].quantity -= 1
      this.calculateTotal(cartList)
      this.setData({ cartList })
      this.saveCart(cartList)
    } else {
      wx.showToast({
        title: '数量不能少于1',
        icon: 'none'
      })
    }
  },

  // 删除商品
  onDeleteItem(e) {
    const { index } = e.currentTarget.dataset
    const that = this
    
    wx.showModal({
      title: '确认删除',
      content: '确定要从购物车中删除该商品吗？',
      success(res) {
        if (res.confirm) {
          const cartList = [...that.data.cartList]
          cartList.splice(index, 1)
          
          that.calculateTotal(cartList)
          that.setData({ cartList })
          that.saveCart(cartList)
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          })
        }
      }
    })
  },

  // 保存购物车到本地
  saveCart(cartList) {
    wx.setStorageSync(CART_KEY, cartList)
  },

  // 去结算
  onCheckout() {
    const selectedItems = this.data.cartList.filter(item => item.selected)
    
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请先选择商品',
        icon: 'none'
      })
      return
    }

    // 跳转到结算页面
    wx.navigateTo({
      url: '/pages/checkout/checkout?type=shop'
    })
  },

  // 返回按钮
  onBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 如果没有上一页，跳转到首页
        wx.switchTab({
          url: '/pages/index/index'
        })
      }
    })
  },

  // 继续购物
  onContinueShopping() {
    wx.switchTab({
      url: '/pages/shop/shop'
    })
  },

  // 清空购物车
  onClearCart() {
    const that = this
    
    wx.showModal({
      title: '确认清空',
      content: '确定要清空购物车吗？',
      success(res) {
        if (res.confirm) {
          that.setData({
            cartList: [],
            selectedAll: false,
            totalPrice: '0.00',
            totalCount: 0,
            selectedCount: 0
          })
          that.saveCart([])
          
          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  // 跳转到商品详情
  onViewProduct(e) {
    const { productId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${productId}`
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCart()
    wx.stopPullDownRefresh()
  }
})
