// pages/course-list/course-list.ts
// 课程列表页

import { courseApi } from '../../utils/api'

Page({
  data: {
    courses: [] as any[],
    loading: false,
    page: 1,
    hasMore: true,
    categories: [] as string[],
    currentCategory: ''
  },

  onLoad() {
    this.loadCategories()
    this.loadCourses()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, courses: [] })
    this.loadCourses().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  async loadCategories() {
    try {
      const categories = await courseApi.getCategories()
      this.setData({ categories: ['全部', ...categories] })
    } catch (err) {
      console.error('加载分类失败:', err)
    }
  },

  async loadCourses() {
    this.setData({ loading: true })
    
    try {
      const filters: any = { page: 1, pageSize: 10 }
      if (this.data.currentCategory && this.data.currentCategory !== '全部') {
        filters.category = this.data.currentCategory
      }
      
      const courses = await courseApi.getList(filters)
      this.setData({
        courses,
        page: 1,
        hasMore: courses.length >= 10,
        loading: false
      })
    } catch (err) {
      console.error('加载课程失败:', err)
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    const nextPage = this.data.page + 1
    
    try {
      const filters: any = { page: nextPage, pageSize: 10 }
      if (this.data.currentCategory && this.data.currentCategory !== '全部') {
        filters.category = this.data.currentCategory
      }
      
      const newCourses = await courseApi.getList(filters)
      
      this.setData({
        courses: [...this.data.courses, ...newCourses],
        page: nextPage,
        hasMore: newCourses.length >= 10
      })
    } catch (err) {
      console.error('加载更多失败:', err)
    }
  },

  // 切换分类
  switchCategory(e: any) {
    const category = e.currentTarget.dataset.category
    this.setData({ currentCategory: category })
    this.loadCourses()
  },

  // 跳转课程详情
  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${id}` })
  }
})