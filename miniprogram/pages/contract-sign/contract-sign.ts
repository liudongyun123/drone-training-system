// pages/contract-sign/contract-sign.ts
// 培训合同签署页面

import { createContract, signContract, getContract, getContractList } from '../../utils/http'
import { getUserId, getPhone, showToast, requirePhoneBinding } from '../../utils/util'
import logger from '../../utils/logger'

// 状态映射
const STATUS_MAP: Record<string, { label: string; icon: string; color: string }> = {
  unsigned: { label: '待签署', icon: '📝', color: '#f59e0b' },
  signed: { label: '学员已签署', icon: '✅', color: '#3b82f6' },
  student_signed: { label: '学员已签署', icon: '✅', color: '#3b82f6' },
  completed: { label: '已生效', icon: '🔒', color: '#16a34a' }
}

function getStatusInfo(status: string) {
  return STATUS_MAP[status] || STATUS_MAP.unsigned
}

Page({
  data: {
    contractId: '',
    contract: null as any,
    loading: true,
    signing: false,
    signed: false,

    // 列表模式（从个人中心进入）
    showList: false,
    contractList: [] as any[],
    selectedContract: null as any,

    // 签名相关
    signatureReady: false,
    hasSignature: false,

    // 合同内容
    contractContent: '',

    // 来源参数
    orderId: '',
    courseId: '',
    courseName: '',
    source: '', // 来源：purchase / enrollment / profile

    // Canvas 尺寸
    canvasWidth: 0,
    canvasHeight: 0,

    // 同意复选框
    agreed: false,

    // 错误信息
    errorMsg: '',

    // 状态展示
    statusLabel: '',
    statusIcon: '',
    statusColor: '',

    // 签名/印章图片
    signatureUrl: '',
    companySealUrl: ''
  },

  onLoad(options: any) {
    this.setData({
      orderId: options.orderId || '',
      courseId: options.courseId || '',
      courseName: decodeURIComponent(options.courseName || ''),
      source: options.source || ''
    })
    this.initPage()
  },

  async initPage() {
    try {
      this.setData({ loading: true, errorMsg: '' })

      // 个人中心进入 → 显示合同列表
      if (this.data.source === 'profile' && !this.data.orderId) {
        return await this.loadContractList()
      }

      // 1. 尝试获取已有合同
      let contract = null

      // 如果有 orderId，精确查找
      if (this.data.orderId) {
        const res = await getContract({ orderId: this.data.orderId })
        if (res.code === 0 && res.data) {
          contract = res.data
        }
      }

      // 2. 如果没有合同，自动创建
      if (!contract) {
        const userId = getUserId()
        if (!userId) {
          this.setData({
            loading: false,
            errorMsg: '请先登录'
          })
          return
        }
        // ★ 统一手机号绑定检查
        if (!await requirePhoneBinding('签署合同')) {
          this.setData({ loading: false })
          return
        }
        const phone = getPhone()

        const createRes: any = await createContract({
          userId: userId || '',
          userName: wx.getStorageSync('userName') || '学员',
          phone: phone || '',
          idCard: wx.getStorageSync('idCard') || '',
          orderId: this.data.orderId,
          courseId: this.data.courseId,
          courseName: this.data.courseName
        })

        if (createRes.code !== 0) {
          this.setData({
            loading: false,
            errorMsg: createRes.error || '创建合同失败'
          })
          return
        }
        contract = createRes.data
      }

      // 3. 已签署的展示详情
      const isSigned = contract.status === 'signed' || contract.status === 'student_signed' || contract.status === 'completed'
      if (isSigned) {
        return this.showSignedContract(contract)
      }

      this.setData({
        contract,
        contractId: contract._id,
        contractContent: contract.contractContent,
        loading: false
      })

      // 4. 初始化签名画布
      this.initSignatureCanvas()

    } catch (err: any) {
      logger.error('合同签署', '初始化失败', err)
      this.setData({
        loading: false,
        errorMsg: err.message || '加载失败，请重试'
      })
    }
  },

  // 加载合同列表
  async loadContractList() {
    try {
      const phone = getPhone()
      if (!phone) {
        this.setData({ loading: false, errorMsg: '请先绑定手机号' })
        return
      }

      const listRes = await getContractList({ phone, pageSize: 50 })
      if (listRes.code === 0 && listRes.data?.list?.length > 0) {
        // 预处理状态展示信息
        const contractList = (listRes.data.list || []).map((item: any) => {
          const info = getStatusInfo(item.status)
          return {
            ...item,
            _statusLabel: info.label,
            _statusIcon: info.icon,
            _statusColor: info.color
          }
        })
        this.setData({
          contractList,
          showList: true,
          loading: false
        })
      } else {
        this.setData({
          loading: false,
          errorMsg: '暂无合同记录'
        })
      }
    } catch (err: any) {
      logger.error('合同签署', '加载列表失败', err)
      this.setData({ loading: false, errorMsg: '加载失败' })
    }
  },

  // 点击列表中某一份合同查看详情
  async onViewContract(e: any) {
    const contract = e.currentTarget?.dataset?.contract
    if (!contract) return

    try {
      this.setData({ loading: true })
      // 重新获取最新数据（含签名链接）
      const res = await getContract({ contractId: contract._id })
      if (res.code === 0 && res.data) {
        this.showSignedContract(res.data)
      } else {
        this.showSignedContract(contract)
      }
    } catch (err) {
      this.showSignedContract(contract)
    }
  },

  // 返回列表
  backToList() {
    this.setData({
      showList: true,
      selectedContract: null,
      signed: false
    })
  },

  // 展示已签署合同
  showSignedContract(contract: any) {
    const info = getStatusInfo(contract.status)
    this.setData({
      contract,
      selectedContract: contract,
      contractId: contract._id,
      contractContent: contract.contractContent,
      signatureUrl: contract.signatureUrl || contract.signatureImage || '',
      companySealUrl: contract.companySealUrl || '',
      signed: true,
      showList: false,
      statusLabel: info.label,
      statusIcon: info.icon,
      statusColor: info.color,
      loading: false
    })
  },

  // 初始化签名画布
  initSignatureCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#signatureCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          logger.error('合同签署', 'Canvas 节点未找到')
          return
        }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio

        const width = res[0].width
        const height = res[0].height

        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        // 白色背景
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)

        // 保存上下文
        ;(this as any)._canvasCtx = ctx
        ;(this as any)._canvas = canvas
        ;(this as any)._canvasWidth = width
        ;(this as any)._canvasHeight = height

        this.setData({
          canvasWidth: width,
          canvasHeight: height,
          signatureReady: true
        })
      })
  },

  // 触摸开始
  onTouchStart(e: any) {
    if (this.data.signed) return
    const touch = e.touches[0]
    const ctx = (this as any)._canvasCtx
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(touch.x, touch.y)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ;(this as any)._isDrawing = true
  },

  // 触摸移动
  onTouchMove(e: any) {
    if (this.data.signed) return
    const ctx = (this as any)._canvasCtx
    if (!ctx || !(this as any)._isDrawing) return

    const touch = e.touches[0]
    ctx.lineTo(touch.x, touch.y)
    ctx.stroke()

    this.setData({ hasSignature: true })
  },

  // 触摸结束
  onTouchEnd() {
    ;(this as any)._isDrawing = false
  },

  // 清除签名
  clearSignature() {
    const ctx = (this as any)._canvasCtx
    const width = (this as any)._canvasWidth
    const height = (this as any)._canvasHeight
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    this.setData({ hasSignature: false })
  },

  // 同意复选框
  onAgreeChange() {
    this.setData({ agreed: !this.data.agreed })
  },

  // 提交签署
  async submitSign() {
    if (this.data.signed) return
    if (!this.data.hasSignature) {
      showToast('请先手写签名')
      return
    }
    if (!this.data.agreed) {
      showToast('请先同意培训协议')
      return
    }

    this.setData({ signing: true })

    try {
      // 1. 导出签名图片
      const canvas = (this as any)._canvas
      if (!canvas) {
        throw new Error('签名画布未初始化')
      }

      const tempFilePath = await new Promise<string>((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas,
          fileType: 'png',
          quality: 0.8,
          destWidth: (this as any)._canvasWidth * 2,
          destHeight: (this as any)._canvasHeight * 2,
          success: (res: any) => resolve(res.tempFilePath),
          fail: (err: any) => reject(new Error('导出签名失败: ' + err.errMsg))
        })
      })

      // 2. 上传签名图片到云存储
      const uploadRes: any = await this.uploadSignature(tempFilePath)

      // 3. 调用后台签署
      const signRes: any = await signContract({
        contractId: this.data.contractId,
        signatureImage: uploadRes.fileID,
        verifyMethod: 'sms'
      })

      if (signRes.code !== 0) {
        throw new Error(signRes.error || '签署失败')
      }

      // 4. 签署成功
      const info = getStatusInfo('student_signed')
      this.setData({
        signed: true,
        signing: false,
        statusLabel: info.label,
        statusIcon: info.icon,
        statusColor: info.color
      })

      wx.showModal({
        title: '签署成功',
        content: '您的签名已提交成功，等待公司盖章后合同正式生效。',
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          wx.redirectTo({ url: '/pages/my-classes/my-classes' })
        }
      })

    } catch (err: any) {
      logger.error('合同签署', '提交签署失败', err)
      this.setData({ signing: false })
      wx.showModal({
        title: '签署失败',
        content: err.message || '请重试',
        showCancel: false
      })
    }
  },

  // 上传签名图片到云存储
  uploadSignature(filePath: string): Promise<{ fileID: string }> {
    return new Promise((resolve, reject) => {
      const cloudPath = `contracts/signatures/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.png`

      // 使用 callFunction 调用 api-upload 上传
      // 先读取文件为 base64
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: async (readRes) => {
          try {
            const { request } = require('../../utils/http')
            const result = await request('/api-upload', 'POST', {
              action: 'upload',
              fileName: cloudPath,
              fileContent: readRes.data,
              encoding: 'base64'
            })
            if (result.code === 0 && result.data) {
              resolve({ fileID: result.data.fileID || result.data.fileId })
            } else {
              // 降级：直接用 base64 嵌入
              resolve({ fileID: 'data:image/png;base64,' + readRes.data })
            }
          } catch (err) {
            // 降级处理
            resolve({ fileID: 'data:image/png;base64,' + readRes.data })
          }
        },
        fail: () => {
          reject(new Error('读取签名图片失败'))
        }
      })
    })
  },

  // 返回
  goBack() {
    if (this.data.signed && this.data.selectedContract && this.data.source === 'profile') {
      // 从个人中心进入 → 详情页 → 返回列表
      this.backToList()
      return
    }
    if (this.data.signed) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.showModal({
        title: '提示',
        content: '您还未签署培训协议，确定要离开吗？',
        confirmText: '离开',
        cancelText: '继续签署',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack({ delta: 1 })
          }
        }
      })
    }
  }
})
