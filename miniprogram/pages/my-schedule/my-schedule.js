// pages/my-schedule/my-schedule.js
// 我的日程页面

const app = getApp()
import { dbGetList } from '../../utils/http'

Page({
  data: {
    dates: [],
    currentDate: '',
    schedule: [],
    dayScheduleCount: 0,
    loading: false
  },

  onLoad(options) {
    this.initDates()
    this.loadSchedule()
  },

  onShow() {
    // this.loadSchedule()
  },

  initDates() {
    const dates = []
    const today = new Date()
    
    for (let i = -3; i <= 3; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const month = date.getMonth() + 1
      const day = date.getDate()
      dates.push(`${month}/${day}`)
    }
    
    const currentDate = dates[3]
    
    this.setData({ dates, currentDate })
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date
    this.setData({ currentDate: date })
    this.calculateDayScheduleCount()
  },

  async loadSchedule() {
    this.setData({ loading: true })
    
    try {
      const userId = wx.getStorageSync('userId') || ''
      const openid = wx.getStorageSync('openid') || ''
      const uid = userId || openid
      
      if (!uid) {
        this.setData({ loading: false, schedule: [] })
        return
      }
      
      const result = await dbGetList('schedules', {
        where: { userId: uid },
        orderBy: 'startTime asc'
      })
      
      this.setData({ 
        loading: false,
        schedule: result.data || []
      })
      
      this.calculateDayScheduleCount()
      
    } catch (err) {
      console.error('加载日程失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  calculateDayScheduleCount() {
    const { schedule, currentDate } = this.data
    const todayStr = currentDate
    
    const daySchedule = schedule.filter(item => {
      const itemDate = item.startTime?.substring(5, 10)
      return itemDate === todayStr
    })
    
    this.setData({ dayScheduleCount: daySchedule.length })
  },

  onPullDownRefresh() {
    this.loadSchedule().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    // 可实现分页加载
  },

  onShareAppMessage() {
    return {
      title: '我的日程',
      path: '/pages/my-schedule/my-schedule'
    }
  }
})
