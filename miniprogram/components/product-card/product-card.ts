// components/product-card/product-card.ts
// 商品卡片组件

Component({
  properties: {
    product: {
      type: Object,
      value: {}
    }
  },

  data: {
    defaultCover: '/assets/default-product.png'
  },

  methods: {
    onTap() {
      const product = this.properties.product
      if (product && product._id) {
        wx.navigateTo({
          url: `/pages/product-detail/product-detail?id=${product._id}`
        })
      }
    },

    addToCart() {
      const product = this.properties.product
      if (!product || !product._id) return
      
      // 读取购物车
      let cart = wx.getStorageSync('cart') || []
      
      // 检查是否已存在
      const existIndex = cart.findIndex((item: any) => item.productId === product._id)
      
      if (existIndex > -1) {
        cart[existIndex].quantity += 1
      } else {
        cart.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          coverImage: product.coverImage,
          quantity: 1
        })
      }
      
      wx.setStorageSync('cart', cart)
      wx.showToast({ title: '已加入购物车', icon: 'success' })
      
      // 触发事件通知父组件
      this.triggerEvent('cartUpdated', { count: cart.length })
    }
  }
})