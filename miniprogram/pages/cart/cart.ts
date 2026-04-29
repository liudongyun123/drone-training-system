// pages/cart/cart.ts
// 购物车页面

import { checkLogin, showToast } from '../../utils/util'

interface CartItem {
  productId: string
  productName: string
  productImage: string
  price: number
  quantity: number
  selected: boolean
}

Page({
  data: {
    cartItems: [] as CartItem[],
    totalPrice: 0,
    selectedCount: 0,
    isEmpty: false
  },

  onLoad() {
    this.loadCart()
  },

  onShow() {
    this.loadCart()
  },

  loadCart() {
    const cart: CartItem[] = wx.getStorageSync('cart') || []
    
    // 添加选中状态
    const cartItems = cart.map(item => ({
      ...item,
      selected: true
    }))
    
    this.setData({
      cartItems,
      isEmpty: cartItems.length === 0
    })
    
    this.calculateTotal()
  },

  // 计算总价
  calculateTotal() {
    const { cartItems } = this.data
    const selectedItems = cartItems.filter(item => item.selected)
    
    const totalPrice = selectedItems.reduce((sum, item) => {
      return sum + item.price * item.quantity
    }, 0)
    
    this.setData({
      totalPrice,
      selectedCount: selectedItems.length
    })
  },

  // 切换选中
  toggleSelect(e: any) {
    const index = e.currentTarget.dataset.index
    const cartItems = [...this.data.cartItems]
    cartItems[index].selected = !cartItems[index].selected
    
    this.setData({ cartItems })
    this.calculateTotal()
  },

  // 全选
  toggleSelectAll() {
    const cartItems = [...this.data.cartItems]
    const allSelected = cartItems.every(item => item.selected)
    
    cartItems.forEach(item => {
      item.selected = !allSelected
    })
    
    this.setData({ cartItems })
    this.calculateTotal()
  },

  // 减少数量
  decreaseQuantity(e: any) {
    const index = e.currentTarget.dataset.index
    const cartItems = [...this.data.cartItems]
    
    if (cartItems[index].quantity > 1) {
      cartItems[index].quantity -= 1
      this.setData({ cartItems })
      this.calculateTotal()
      this.saveCart()
    }
  },

  // 增加数量
  increaseQuantity(e: any) {
    const index = e.currentTarget.dataset.index
    const cartItems = [...this.data.cartItems]
    
    cartItems[index].quantity += 1
    this.setData({ cartItems })
    this.calculateTotal()
    this.saveCart()
  },

  // 删除商品
  deleteItem(e: any) {
    const index = e.currentTarget.dataset.index
    const cartItems = [...this.data.cartItems]
    
    wx.showModal({
      title: '提示',
      content: '确定要删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          cartItems.splice(index, 1)
          this.setData({
            cartItems,
            isEmpty: cartItems.length === 0
          })
          this.calculateTotal()
          this.saveCart()
        }
      }
    })
  },

  // 保存购物车
  saveCart() {
    const cart = this.data.cartItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      price: item.price,
      quantity: item.quantity
    }))
    wx.setStorageSync('cart', cart)
  },

  // 结算
  checkout() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    
    if (this.data.selectedCount === 0) {
      showToast('请选择商品')
      return
    }
    
    const selectedItems = this.data.cartItems.filter(item => item.selected)
    wx.setStorageSync('checkoutItems', selectedItems)
    wx.navigateTo({ url: '/pages/checkout/checkout?type=cart' })
  }
})