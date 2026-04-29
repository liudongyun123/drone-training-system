// pages/index/index.ts
// 小程序首页

import { courseApi, classApi, productApi } from '../../utils/api'
import { showLoading, hideLoading } from '../../utils/util'

interface IndexData {
  hotCourses: any[]
  enrollingClasses: any[]
  featuredProducts: any[]
  loading: boolean
}

Page<IndexData>({
  data: {
    hotCourses: [],
    enrollingClasses: [],
    featuredProducts: [],
    loading: true
  },

  onLoad() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadData() {
    this.setData({ loading: true })
    
    try {
      // 并行加载三个模块数据
      const [courses, classes, products] = await Promise.all([
        courseApi.getHotCourses(6),
        classApi.getList({ status: 'enrolling' }),
        productApi.getList({ pageSize: 6 })
      ])
      
      this.setData({
        hotCourses: courses,
        enrollingClasses: classes,
        featuredProducts: products,
        loading: false
      })
    } catch (err) {
      console.error('加载首页数据失败:', err)
      this.setData({ loading: false })
    }
  },

  // 跳转课程详情
  goToCourse(e: any) {
    const courseId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/course-detail/course-detail?id=${courseId}`
    })
  },

  // 跳转培训班详情
  goToClass(e: any) {
    const classId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/class-detail/class-detail?id=${classId}`
    })
  },

  // 跳转商品详情
  goToProduct(e: any) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${productId}`
    })
  },

  onShareAppMessage() {
    return {
      title: '无人机培训',
      path: '/pages/index/index'
    }
  }
})