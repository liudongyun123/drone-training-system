// pages/my-schedule/my-schedule.ts
// 我的日程页

import { getDatabase } from '../../utils/cloudbase'
import { formatDate } from '../../utils/util'
import { checkLogin } from '../../utils/util'

const db = getDatabase()

Page({
  data: {
    schedule: [] as any[],
    dates: [] as string[],
    currentDate: '',
    loading: true,
    classId: ''
  },

  onLoad(options: any) {
    this.data.classId = options.classId || ''
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.initDates()
    this.loadSchedule()
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
      const userId = wx.getStorageSync('userId')
      const where: any = { userId }
      if (this.data.classId) {
        where.classId = this.data.classId
      }

      const result = await db.collection('schedules')
        .where(where)
        .orderBy('startTime', 'asc')
        .get()

      this.setData({
        schedule: result.data,
        loading: false
      })
    } catch (err) {
      console.error('加载日程失败:', err)
      this.setData({ loading: false })
    }
  },

  // 选择日期
  selectDate(e: any) {
    const date = e.currentTarget.dataset.date
    this.setData({ currentDate: date })
  },

  // 获取今日日程
  getTodaySchedule(): any[] {
    const { schedule, currentDate } = this.data
    return schedule.filter((item: any) => {
      const itemDate = formatDate(item.startTime, 'MM-DD')
      return itemDate === currentDate
    })
  },

  // 格式化时间
  formatTime(dateStr: string): string {
    return formatDate(dateStr, 'HH:mm')
  }
})