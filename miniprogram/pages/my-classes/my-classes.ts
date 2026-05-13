// pages/my-classes/my-classes.ts
// 我的培训班页

import { getMyEnrollments } from '../../utils/http'
import { checkLogin, getPhone } from '../../utils/util'
import logger from '../../utils/logger'

// 状态映射
const statusTextMap: Record<string, string> = {
  upcoming: '即将开始',
  ongoing: '进行中',
  ended: '已结束'
}

const enrollmentStatusTextMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
}

Page({
  data: {
    isLoggedIn: false,
    classes: [] as any[],
    loading: true,
    refreshing: false,
    tabs: [
      { key: 'all', title: '全部', count: 0 },
      { key: 'ongoing', title: '进行中', count: 0 },
      { key: 'ended', title: '已结束', count: 0 }
    ],
    currentTab: 'all',
    ongoingCount: 0,
    endedCount: 0
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '我的培训班' })
    const isLoggedIn = checkLogin()
    this.setData({ isLoggedIn })
    
    if (isLoggedIn) {
      this.loadMyClasses()
    }
  },

  onShow() {
    if (checkLogin()) {
      this.loadMyClasses()
    }
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadMyClasses().then(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    })
  },

  onRefresh() {
    this.onPullDownRefresh()
  },

  async loadMyClasses() {
    this.setData({ loading: true })

    try {
      const phone = getPhone() || ''

      if (!phone) {
        this.setData({ classes: [], loading: false })
        return
      }

      const result = await getMyEnrollments(phone)
      let classes = result.data || []

      // 去重
      const seen = new Set()
      classes = classes.filter((c: any) => {
        if (seen.has(c._id)) return false
        seen.add(c._id)
        return true
      })

      // 处理状态显示
      const now = new Date()
      classes = classes.map((item: any) => {
        const endDate = new Date(item.classInfo?.endDate || item.endDate)
        const startDate = new Date(item.classInfo?.startDate || item.startDate)
        
        let status = 'upcoming'
        let statusText = '即将开始'
        
        if (endDate < now) {
          status = 'ended'
          statusText = '已结束'
        } else if (startDate <= now) {
          status = 'ongoing'
          statusText = '进行中'
        }

        return {
          ...item,
          status,
          statusText,
          enrollmentStatusText: enrollmentStatusTextMap[item.enrollmentStatus] || item.enrollmentStatus || '待确认'
        }
      })

      // 更新统计
      const ongoingCount = classes.filter((c: any) => c.status === 'ongoing').length
      const endedCount = classes.filter((c: any) => c.status === 'ended').length
      
      const tabs = this.data.tabs.map(tab => {
        if (tab.key === 'all') return { ...tab, count: classes.length }
        if (tab.key === 'ongoing') return { ...tab, count: ongoingCount }
        if (tab.key === 'ended') return { ...tab, count: endedCount }
        return tab
      })

      // 根据 Tab 过滤
      if (this.data.currentTab !== 'all') {
        classes = classes.filter((item: any) => item.status === this.data.currentTab)
      }

      this.setData({ 
        classes, 
        loading: false,
        ongoingCount,
        endedCount,
        tabs
      })
    } catch (err) {
      logger.error('培训班', '加载我的培训班失败', err)
      this.setData({ loading: false })
    }
  },

  // 切换 Tab
  switchTab(e: any) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.currentTab) return
    this.setData({ currentTab: key, classes: [] })
    this.loadMyClasses()
  },

  // 去登录
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
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

  // 再次报名
  reEnroll(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '再次报名',
      content: '确定要报名该培训班的下一期吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: `/pages/class-detail/class-detail?id=${id}` })
        }
      }
    })
  },

  // 去培训班列表
  goToClassList() {
    wx.switchTab({ url: '/pages/class-list/class-list' })
  }
})
