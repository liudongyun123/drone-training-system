// pages/my-schedule/my-schedule.ts
// 我的日程页

import { getMySchedules } from '../../utils/http'
import { formatDate, checkLogin, getPhone } from '../../utils/util'
import logger from '../../utils/logger'

// 星期映射
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 日期对象类型
interface DateItem {
  date: string      // MM-DD
  day: number        // 1-31
  isToday: boolean  // 是否今天
}

Page({
  data: {
    isLoggedIn: false,
    schedule: [] as any[],
    daySchedules: [] as any[],
    dates: [] as DateItem[],
    currentDate: '',
    currentDateStr: '',
    weekdayStr: '',
    loading: true,
    refreshing: false,
    classId: ''
  },

  onLoad(options: any) {
    wx.setNavigationBarTitle({ title: '我的日程' })
    this.data.classId = options.classId || ''
    if (!checkLogin()) {
      this.setData({ isLoggedIn: false })
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ isLoggedIn: true })
    this.initDates()
    this.loadSchedule()
  },

  onShow() {
    // this.loadSchedule()
  },

  initDates() {
    const today = new Date()
    const dates: DateItem[] = []
    const currentDate = formatDate(today.toISOString(), 'MM-DD')
    
    for (let i = -3; i <= 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push({
        date: formatDate(date.toISOString(), 'MM-DD'),
        day: date.getDate(),
        isToday: i === 0
      })
    }

    // 生成完整日期字符串
    const currentDateStr = formatDate(today.toISOString(), 'YYYY年MM月DD日')
    const weekdayStr = WEEKDAYS[today.getDay()]

    this.setData({
      dates,
      currentDate,
      currentDateStr,
      weekdayStr
    })
  },

  async loadSchedule() {
    this.setData({ loading: true })

    try {
      const phone = getPhone() || ''

      if (!phone) {
        this.setData({ loading: false, schedule: [], daySchedules: [] })
        return
      }

      const result = await getMySchedules({ userId: phone, classId: this.data.classId || undefined })
      const scheduleData = result.data || []
      
      // 去重
      const seen = new Set()
      const schedule = scheduleData.filter((s: any) => {
        if (seen.has(s._id)) return false
        seen.add(s._id)
        return true
      })
      
      this.setData({
        schedule,
        loading: false,
        refreshing: false
      })
      
      this.calculateDaySchedules()
    } catch (err) {
      logger.error('日程', '加载日程失败', err)
      this.setData({ loading: false, refreshing: false })
    }
  },

  // 选择日期
  selectDate(e: any) {
    const date = e.currentTarget.dataset.date
    const selectedItem = this.data.dates.find((d: DateItem) => d.date === date)
    
    if (selectedItem) {
      // 生成选中日期的完整字符串
      const today = new Date()
      const currentDay = today.getDate()
      const diff = selectedItem.day - currentDay - (this.data.dates.findIndex((d: DateItem) => d.isToday))
      const selectedDate = new Date(today)
      selectedDate.setDate(today.getDate() + (selectedItem.day - today.getDate()))
      
      const currentDateStr = formatDate(selectedDate.toISOString(), 'YYYY年MM月DD日')
      const weekdayStr = WEEKDAYS[selectedDate.getDay()]

      this.setData({ 
        currentDate: date,
        currentDateStr,
        weekdayStr
      })
      this.calculateDaySchedules()
    }
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
        let statusType = 'default'
        if (item.status === 'not_started') {
          statusText = '未开始'
          statusType = 'pending'
        } else if (item.status === 'ongoing') {
          statusText = '进行中'
          statusType = 'active'
        } else if (item.status === 'ended') {
          statusText = '已结束'
          statusType = 'ended'
        }
        
        return {
          ...item,
          startTimeStr,
          endTimeStr,
          statusText,
          statusType
        }
      })
    
    this.setData({ daySchedules })
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadSchedule().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onShareAppMessage() {
    return {
      title: '我的日程',
      path: '/pages/my-schedule/my-schedule'
    }
  },

  // 跳转到登录页
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  // 跳转到日程详情
  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/schedule-detail/schedule-detail?id=${id}` })
  },

  // 设置提醒
  setRemind(e: any) {
    const id = e.currentTarget.dataset.id
    const schedule = this.data.daySchedules.find((s: any) => s._id === id)
    
    if (!schedule) return
    
    wx.showModal({
      title: '设置提醒',
      content: `确定在日程开始前提醒您？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '提醒已设置', icon: 'success' })
        }
      }
    })
  },

  // 跳转到学习页面
  goToLearning() {
    wx.switchTab({ url: '/pages/my-learning/my-learning' })
  }
})
