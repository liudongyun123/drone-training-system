// pages/cart/cart.ts
// 购物车页

Page({
  data: {
    cartItems: [] as any[],
    allSelected: false,
    totalPrice: '0.00',
    totalQty: 0,
    isEmpty: false
  },

  onShow() {
    this.loadCart()
  },

  loadCart() {
    const cart = wx.getStorageSync('cart') || []
    this.setData({
      cartItems: cart,
      isEmpty: cart.length === 0
    })
    this.calcTotal()
  },

  // 全选/取消全选
  toggleAll() {
    const allSelected = !this.data.allSelected
    const cartItems = this.data.cartItems.map((item: any) => ({
      ...item,
      selected: allSelected
    }))
    this.setData({ cartItems, allSelected })
    this.saveCart()
    this.calcTotal()
  },

  // 单选
  toggleItem(e: any) {
    const index = e.currentTarget.dataset.index
    const cartItems = [...this.data.cartItems]
    cartItems[index].selected = !cartItems[index].selected
    const allSelected = cartItems.length > 0 && cartItems.every((item: any) => item.selected)
    this.setData({ cartItems, allSelected })
    this.saveCart()
    this.calcTotal()
  },

  // 数量减
  decreaseQty(e: any) {
    const index = e.currentTarget.dataset.index
    const cartItems = [...this.data.cartItems]
    if (cartItems[index].quantity > 1) {
      cartItems[index].quantity--
      this.setData({ cartItems })
      this.saveCart()
      this.calcTotal()
    }
  },

  // 数量加
  increaseQty(e: any) {
    const index = e.currentTarget.dataset.index
    const cartItems = [...this.data.cartItems]
    const stock = cartItems[index].sku?.stock || cartItems[index].product?.stock || 999
    if (cartItems[index].quantity < stock) {
      cartItems[index].quantity++
      this.setData({ cartItems })
      this.saveCart()
      this.calcTotal()
    } else {
      wx.showToast({ title: '超出库存', icon: 'none' })
    }
  },

  // 删除商品
  deleteItem(e: any) {
    const index = e.currentTarget.dataset.index
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          const cartItems = [...this.data.cartItems]
          cartItems.splice(index, 1)
          const allSelected = cartItems.length > 0 && cartItems.every((item: any) => item.selected)
          this.setData({ cartItems, isEmpty: cartItems.length === 0, allSelected })
          this.saveCart()
          this.calcTotal()
        }
      }
    })
  },

  // 计算总价
  calcTotal() {
    const selectedItems = this.data.cartItems.filter((item: any) => item.selected)
    let total = 0
    let qty = 0
    selectedItems.forEach((item: any) => {
      const price = item.sku?.price || item.product?.price || 0
      total += price * item.quantity
      qty += item.quantity
    })
    this.setData({
      totalPrice: total.toFixed(2),
      totalQty: qty
    })
  },

  // 保存购物车到本地存储
  saveCart() {
    wx.setStorageSync('cart', this.data.cartItems)
  },

  // 跳转商品详情
  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` })
  },

  // 去逛逛
  goShopping() {
    wx.switchTab({ url: '/pages/shop/shop' })
  },

  // 结算
  checkout() {
    const selectedItems = this.data.cartItems.filter((item: any) => item.selected)
    if (selectedItems.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    wx.setStorageSync('checkoutItems', selectedItems)
    wx.navigateTo({ url: '/pages/checkout/checkout?type=shop' })
  }
})