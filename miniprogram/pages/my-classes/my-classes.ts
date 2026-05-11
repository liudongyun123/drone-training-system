// pages/my-classes/my-classes.ts
// 我的培训班页

import { getMyEnrollments } from '../../utils/http'
import { checkLogin, getPhone } from '../../utils/util'
import logger from '../../utils/logger'

Page({
  data: {
    classes: [] as any[],
    loading: true,
    tabs: [
      { key: 'all', title: '全部' },
      { key: 'ongoing', title: '进行中' },
      { key: 'ended', title: '已结束' }
    ],
    currentTab: 'all'
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '我的培训班' })
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.loadMyClasses()
  },

  onShow() {
    if (checkLogin()) {
      this.loadMyClasses()
    }
  },

  onPullDownRefresh() {
    this.loadMyClasses().then(() => wx.stopPullDownRefresh())
  },

  async loadMyClasses() {
    this.setData({ loading: true })

    try {
      // ★ 统一使用 phone 作为用户标识
      const phone = getPhone() || ''

      if (!phone) {
        this.setData({ classes: [], loading: false })
        return
      }

      // ★ 统一使用 phone 查询
      const result = await getMyEnrollments(phone)
      let classes = result.data || []

      // 去重
      const seen = new Set()
      classes = classes.filter((c: any) => {
        if (seen.has(c._id)) return false
        seen.add(c._id)
        return true
      })

      // 根据 Tab 过滤
      if (this.data.currentTab !== 'all') {
        const now = new Date()
        classes = classes.filter((item: any) => {
          const endDate = new Date(item.classInfo?.endDate)
          if (this.data.currentTab === 'ongoing') {
            return endDate >= now
          } else {
            return endDate < now
          }
        })
      }

      this.setData({ classes, loading: false })
    } catch (err) {
      logger.error('培训班', '加载我的培训班失败', err)
      this.setData({ loading: false })
    }
  },

  // 切换 Tab
  switchTab(e: any) {
    const key = e.currentTarget.dataset.key
    this.setData({ currentTab: key })
    this.loadMyClasses()
  },

  // 跳转培训班详情
  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/class-detail/class-detail?id=${id}` })
  },

  // 查看日程
  goToSchedule(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/my-schedule/my-schedule?classId=${id}` })
  },

  // 去培训班列表
  goToClassList() {
    wx.switchTab({ url: '/pages/class-list/class-list' })
  }
})
