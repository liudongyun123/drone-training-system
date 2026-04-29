// pages/profile/profile.ts
// 个人资料页

import { userApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'

Page({
  data: {
    userInfo: null as any,
    loading: true,
    editing: false,
    tempNickname: '',
    tempPhone: ''
  },

  onLoad() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.loadUserInfo()
  },

  async loadUserInfo() {
    this.setData({ loading: true })

    try {
      const userId = getUserId()!
      const userInfo = await userApi.getUser(userId)
      this.setData({
        userInfo,
        tempNickname: userInfo?.nickname || '',
        tempPhone: userInfo?.phone || '',
        loading: false
      })
    } catch (err) {
      console.error('加载用户信息失败:', err)
      this.setData({ loading: false })
    }
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        // TODO: 上传头像到云存储
        wx.showLoading({ title: '上传中...' })
        
        // 模拟上传
        setTimeout(() => {
          wx.hideLoading()
          const userInfo = { ...this.data.userInfo, avatar: tempFilePath }
          this.setData({ userInfo })
          showToast('头像已更新')
        }, 1000)
      }
    })
  },

  // 开始编辑
  startEdit() {
    this.setData({ editing: true })
  },

  // 取消编辑
  cancelEdit() {
    this.setData({
      editing: false,
      tempNickname: this.data.userInfo?.nickname || '',
      tempPhone: this.data.userInfo?.phone || ''
    })
  },

  // 输入昵称
  onNicknameInput(e: any) {
    this.setData({ tempNickname: e.detail.value })
  },

  // 输入手机号
  onPhoneInput(e: any) {
    this.setData({ tempPhone: e.detail.value })
  },

  // 保存修改
  async saveEdit() {
    const { tempNickname, tempPhone, userInfo } = this.data

    if (!tempNickname.trim()) {
      showToast('请输入昵称')
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      const userId = getUserId()!
      await userApi.updateUser(userId, {
        nickname: tempNickname,
        phone: tempPhone
      })

      this.setData({
        editing: false,
        userInfo: { ...userInfo, nickname: tempNickname, phone: tempPhone }
      })

      wx.hideLoading()
      showToast('保存成功')
    } catch (err) {
      wx.hideLoading()
      showToast('保存失败')
    }
  },

  // 绑定手机号
  bindPhone() {
    wx.showToast({ title: '手机号绑定功能开发中', icon: 'none' })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})