// pages/question-banks/question-banks.ts
// 题库列表页 - 展示所有题库

import { getQuestionBanks } from '../../utils/http'
import logger from '../../utils/logger'
import { getCategoryIcon } from '../../utils/constants'

interface QuestionBank {
  _id: string
  title: string
  description: string
  questionCount: number
  icon: string
  category: string
  level: string
}

Page({
  data: {
    allBanks: [] as QuestionBank[],
    displayBanks: [] as QuestionBank[],
    categories: [] as string[],
    activeCategory: '全部',
    loading: true,
    refreshing: false,
    searchValue: ''
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '全部题库' })
    this.loadBanks()
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadBanks().then(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    })
  },

  async loadBanks() {
    this.setData({ loading: true })
    try {
      const result = await getQuestionBanks()

      const allBanks = (result.data || []).map((bank: any) => ({
        _id: bank._id,
        title: bank.name || bank.title || '未命名题库',
        description: bank.description || '',
        questionCount: bank.questionCount || 0,
        icon: this.getCategoryIcon(bank.category),
        category: bank.category || '综合',
        level: bank.level || '初级'
      }))

      // 提取所有分类
      const categorySet = new Set<string>()
      categorySet.add('全部')
      allBanks.forEach(b => {
        if (b.category) categorySet.add(b.category)
      })

      this.setData({
        allBanks,
        displayBanks: allBanks,
        categories: Array.from(categorySet),
        loading: false
      })
    } catch (err) {
      logger.error('题库列表', '加载失败', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 根据分类获取图标（使用共享常量）
  getCategoryIcon(category: string): string {
    return getCategoryIcon(category)
  },

  // 分类筛选
  filterByCategory(e: any) {
    const category = e.currentTarget.dataset.category
    this.setData({ activeCategory: category })
    this.applyFilters()
  },

  // 搜索输入
  onSearchInput(e: any) {
    this.setData({ searchValue: e.detail.value })
    this.applyFilters()
  },

  // 应用筛选和搜索
  applyFilters() {
    const { allBanks, activeCategory, searchValue } = this.data
    let filtered = allBanks

    // 分类筛选
    if (activeCategory !== '全部') {
      filtered = filtered.filter(b => b.category === activeCategory)
    }

    // 搜索
    if (searchValue.trim()) {
      const keyword = searchValue.trim().toLowerCase()
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(keyword) ||
        b.description.toLowerCase().includes(keyword)
      )
    }

    this.setData({ displayBanks: filtered })
  },

  // 开始练习
  startPractice(e: any) {
    const { id, title, count } = e.currentTarget.dataset

    if (count === 0) {
      wx.showToast({ title: '该题库暂无题目', icon: 'none' })
      return
    }

    wx.navigateTo({
      url: `/pages/exam/exam?type=practice&bankId=${id}&bankTitle=${encodeURIComponent(title)}`
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
