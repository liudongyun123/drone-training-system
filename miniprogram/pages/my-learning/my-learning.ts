// pages/my-learning/my-learning.ts
// 我的学习页面 - 小程序个人中心

import { checkLogin, getUserId, getPhone } from '../../utils/util'
import { courseApi, orderApi } from '../../utils/api'

Page({
  data: {
    isLoggedIn: false,
    userInfo: null as any,
    phone: '',
    myCourses: [] as any[],
    myClasses: [] as any[],
    myOrders: [] as any[],
    loading: false
  },

  onLoad() {
    this.checkStatus()
    if (checkLogin()) {
      this.loadMyData()
    }
  },

  onShow() {
    this.checkStatus()
    if (checkLogin()) {
      this.loadMyData()
    }
  },

  checkStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({
      isLoggedIn: checkLogin(),
      userInfo,
      phone: getPhone() || ''
    })
  },

  async loadMyData() {
    this.setData({ loading: true })
    try {
      const userId = getUserId() || ''
      
      // 加载已购课程
      const courses = await courseApi.getList({ pageSize: 20 })
      
      // 加载订单
      const orders = await orderApi.getByUserId(userId)
      
      this.setData({
        myCourses: courses.filter((c: any) => c.status === 'published').slice(0, 6),
        myOrders: orders,
        loading: false
      })
    } catch (err) {
      console.error('加载我的数据失败:', err)
      this.setData({ loading: false })
    }
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goToCourse(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${id}` })
  },

  goToOrders() {
    wx.navigateTo({ url: '/pages/my-orders/my-orders' })
  },

  goToClasses() {
    wx.navigateTo({ url: '/pages/my-classes/my-classes' })
  },

  goToCertificates() {
    wx.navigateTo({ url: '/pages/my-certificates/my-certificates' })
  },

  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' })
  },

  goToPractice() {
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  onShareAppMessage() {
    return {
      title: '无人机培训',
      path: '/pages/index/index'
    }
  }
})