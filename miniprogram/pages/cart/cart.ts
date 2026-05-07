// pages/cart/cart.ts
// 购物车页

Page({
  data: {
    cartList: [] as any[],
    selectedAll: false,
    totalPrice: '0.00',
    selectedCount: 0,
    loading: false
  },

  onShow() {
    wx.setNavigationBarTitle({ title: '购物车' })
    this.loadCart()
  },

  loadCart() {
    const cart = wx.getStorageSync('cart') || []
    this.setData({
      cartList: cart,
      loading: false
    })
    this.calcTotal()
  },

  // 全选/取消全选
  onSelectAll() {
    const selectedAll = !this.data.selectedAll
    const cartList = this.data.cartList.map((item: any) => ({
      ...item,
      selected: selectedAll
    }))
    this.setData({ cartList, selectedAll })
    this.saveCart()
    this.calcTotal()
  },

  // 单选
  onSelectItem(e: any) {
    const index = e.currentTarget.dataset.index
    const cartList = [...this.data.cartList]
    cartList[index].selected = !cartList[index].selected
    const selectedAll = cartList.length > 0 && cartList.every((item: any) => item.selected)
    this.setData({ cartList, selectedAll })
    this.saveCart()
    this.calcTotal()
  },

  // 数量减
  onDecrease(e: any) {
    const index = e.currentTarget.dataset.index
    const cartList = [...this.data.cartList]
    if (cartList[index].quantity > 1) {
      cartList[index].quantity--
      this.setData({ cartList })
      this.saveCart()
      this.calcTotal()
    }
  },

  // 数量加
  onIncrease(e: any) {
    const index = e.currentTarget.dataset.index
    const cartList = [...this.data.cartList]
    const stock = cartList[index].sku?.stock || cartList[index].product?.stock || 999
    if (cartList[index].quantity < stock) {
      cartList[index].quantity++
      this.setData({ cartList })
      this.saveCart()
      this.calcTotal()
    } else {
      wx.showToast({ title: '超出库存', icon: 'none' })
    }
  },

  // 删除商品
  onDeleteItem(e: any) {
    const index = e.currentTarget.dataset.index
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          const cartList = [...this.data.cartList]
          cartList.splice(index, 1)
          const selectedAll = cartList.length > 0 && cartList.every((item: any) => item.selected)
          this.setData({ cartList, selectedAll })
          this.saveCart()
          this.calcTotal()
        }
      }
    })
  },

  // 计算总价
  calcTotal() {
    const selectedItems = this.data.cartList.filter((item: any) => item.selected)
    let total = 0
    let count = 0
    selectedItems.forEach((item: any) => {
      const price = item.sku?.price || item.product?.price || 0
      total += price * item.quantity
      count += item.quantity
    })
    this.setData({
      totalPrice: total.toFixed(2),
      selectedCount: count
    })
  },

  // 保存购物车到本地存储
  saveCart() {
    wx.setStorageSync('cart', this.data.cartList)
  },

  // 清空购物车
  onClearCart() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('cart')
          this.setData({
            cartList: [],
            selectedAll: false,
            totalPrice: '0.00',
            selectedCount: 0
          })
        }
      }
    })
  },

  // 返回
  onBack() {
    wx.navigateBack()
  },

  // 查看商品
  onViewProduct(e: any) {
    const id = e.currentTarget.dataset.productId
    wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` })
  },

  // 去逛逛
  onContinueShopping() {
    wx.switchTab({ url: '/pages/shop/shop' })
  },

  // 结算
  onCheckout() {
    const selectedItems = this.data.cartList.filter((item: any) => item.selected)
    if (selectedItems.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    wx.setStorageSync('checkoutItems', selectedItems)
    wx.navigateTo({ url: '/pages/checkout/checkout?type=shop' })
  }
})
