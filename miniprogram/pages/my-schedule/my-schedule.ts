// pages/my-schedule/my-schedule.ts
// 我的日程页

import { getMySchedules } from '../../utils/http'
import { formatDate } from '../../utils/util'
import { checkLogin } from '../../utils/util'
import logger from '../../utils/logger'

Page({
  data: {
    schedule: [] as any[],
    daySchedules: [] as any[],
    dates: [] as string[],
    currentDate: '',
    loading: true,
    classId: ''
  },

  onLoad(options: any) {
    wx.setNavigationBarTitle({ title: '我的日程' })
    this.data.classId = options.classId || ''
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.initDates()
    this.loadSchedule()
  },

  onShow() {
    // this.loadSchedule()
  },

  initDates() {
    const dates: string[] = []
    const today = new Date()
    for (let i = -3; i <= 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(formatDate(date.toISOString(), 'MM-DD'))
    }
    this.setData({
      dates,
      currentDate: formatDate(today.toISOString(), 'MM-DD')
    })
  },

  async loadSchedule() {
    this.setData({ loading: true })

    try {
      const phone = wx.getStorageSync('phone') || ''
      const userId = wx.getStorageSync('userId') || ''

      if (!phone && !userId) {
        this.setData({ loading: false, schedule: [], daySchedules: [] })
        return
      }

      // 同时查询 phone 和 userId，然后合并结果
      const promises = []
      if (phone) {
        promises.push(
          getMySchedules({ userId: phone, classId: this.data.classId || undefined })
            .then(r => r.data || [])
            .catch(() => [])
        )
      }
      if (userId) {
        promises.push(
          getMySchedules({ userId, classId: this.data.classId || undefined })
            .then(r => r.data || [])
            .catch(() => [])
        )
      }

      const results = await Promise.all(promises)
      const allSchedules = results.flat()
      
      // 去重
      const seen = new Set()
      const schedule = allSchedules.filter((s: any) => {
        if (seen.has(s._id)) return false
        seen.add(s._id)
        return true
      })
      
      this.setData({
        schedule,
        loading: false
      })
      
      this.calculateDaySchedules()
    } catch (err) {
      logger.error('日程', '加载日程失败', err)
      this.setData({ loading: false })
    }
  },

  // 选择日期
  selectDate(e: any) {
    const date = e.currentTarget.dataset.date
    this.setData({ currentDate: date })
    this.calculateDaySchedules()
  },

  // 计算当日日程
  calculateDaySchedules() {
    const { schedule, currentDate } = this.data
    
    const daySchedules = schedule
      .filter((item: any) => {
        const itemDate = formatDate(item.startTime, 'MM-DD')
        return itemDate === currentDate
      })
      .map((item: any) => {
        const startTimeStr = formatDate(item.startTime, 'HH:mm')
        const endTimeStr = formatDate(item.endTime, 'HH:mm')
        
        let statusText = '未知'
        if (item.status === 'not_started') statusText = '未开始'
        else if (item.status === 'ongoing') statusText = '进行中'
        else if (item.status === 'ended') statusText = '已结束'
        
        return {
          ...item,
          startTimeStr,
          endTimeStr,
          statusText
        }
      })
    
    this.setData({ daySchedules })
  },

  onPullDownRefresh() {
    this.loadSchedule().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onShareAppMessage() {
    return {
      title: '我的日程',
      path: '/pages/my-schedule/my-schedule'
    }
  }
})
