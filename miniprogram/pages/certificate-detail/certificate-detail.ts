// pages/certificate-detail/certificate-detail.ts
// 证书详情页 - 仿真证书展示 + 保存到相册

import { getExternalCertificates, getTrainingCertificates, dbGetList, resolveCoverUrls } from '../../utils/http'
import { formatDate } from '../../utils/util'
import logger from '../../utils/logger'

const ORG_NAME = '无人机培训中心'

// 主题色配置（与后台一致）
const THEME_MAP: Record<string, { border: string; accent: string }> = {
  gold: { border: '#c9a227', accent: '#1e3a5f' },
  red: { border: '#c0392b', accent: '#8e1b1b' },
  blue: { border: '#2563eb', accent: '#1e3a5f' }
}

// 从后台 certificate_config 集合读取证书样式配置（机构名 / 副标题 / 印章 / 主题色 / 底纹 / 二维码）
async function getCertConfig(): Promise<{ orgName: string; subtitle: string; sealImage: string; themeColor: string; bgPattern: boolean; qrVerify: boolean }> {
  const fallback = { orgName: ORG_NAME, subtitle: '', sealImage: '', themeColor: 'gold', bgPattern: true, qrVerify: false }
  try {
    const res = await dbGetList('certificate_config', { limit: 1 })
    const list: any[] = (res && res.data) || []
    const cfg = list.find((c: any) => c._id === 'cert_style_default') || list[0]
    if (!cfg) return fallback
    return {
      orgName: cfg.orgName || ORG_NAME,
      subtitle: cfg.subtitle || '',
      sealImage: cfg.sealImage || '',
      themeColor: cfg.themeColor || 'gold',
      bgPattern: cfg.bgPattern !== false,
      qrVerify: !!cfg.qrVerify
    }
  } catch (err) {
    logger.error('证书', '读取证书样式配置失败', err)
    return fallback
  }
}

function pickDate(cert: any): string {
  const raw = cert.issuedAt || cert.issueDate || cert.createdAt || ''
  if (!raw) return '-'
  try {
    return formatDate(raw, 'YYYY-MM-DD')
  } catch {
    return String(raw).slice(0, 10)
  }
}

const STATUS_MAP: Record<string, string> = {
  verified: '已认证',
  pending: '待审核',
  expired: '已过期',
  active: '有效'
}

Page({
  data: {
    isExternal: false,
    orgName: ORG_NAME,
    subtitle: '',
    issuer: ORG_NAME,
    issuerShort: '培训中心',
    sealImage: '',      // 已解析为 https 的印章图（用于 WXML 展示）
    themeColor: 'gold',
    themeBorder: '#c9a227',
    themeAccent: '#1e3a5f',
    bgPattern: true,
    qrVerify: false,
    qrUrl: '',
    certId: '',
    userName: '学员',
    courseTitle: '',
    certNo: '-',
    issueDate: '-',
    score: '',
    statusText: '',
    raw: null as any
  },

  async onLoad(query: any) {
    const type = query.type || 'training'
    const id = query.id || ''

    // 异步读取后台证书样式配置（机构名 / 副标题 / 印章 / 主题色 / 底纹 / 二维码）
    getCertConfig().then(async (cfg) => {
      const theme = THEME_MAP[cfg.themeColor] || THEME_MAP.gold
      // 印章若是 cloud:// 则解析为 https 临时链接
      let sealHttps = cfg.sealImage || ''
      if (sealHttps.startsWith('cloud://')) {
        try {
          const resolved = await resolveCoverUrls([{ seal: sealHttps }], ['seal'])
          sealHttps = resolved[0].seal || ''
        } catch { /* ignore */ }
      }
      this.setData({
        orgName: cfg.orgName,
        subtitle: cfg.subtitle,
        themeColor: cfg.themeColor,
        themeBorder: theme.border,
        themeAccent: theme.accent,
        bgPattern: cfg.bgPattern,
        qrVerify: cfg.qrVerify,
        sealImage: sealHttps
      })
      if (!this.data.isExternal) {
        this.applyIssuer(cfg.orgName)
      }
    }).catch((err: any) => {
      logger.error('证书', '读取样式配置失败', err)
      wx.showToast({ title: '配置加载失败：' + (err?.message || err), icon: 'none' })
    })

    // 优先从上一页事件通道拿完整数据（无需再查库）
    const channel = this.getOpenerEventChannel && this.getOpenerEventChannel()
    if (channel && (channel as any).on) {
      let received = false
      channel.on('cert', (payload: any) => {
        received = true
        try {
          this.applyCert(payload.cert, payload.type || type)
        } catch (err) {
          logger.error('证书', 'applyCert 失败', err)
          wx.showToast({ title: '证书渲染失败：' + (err?.message || err), icon: 'none' })
        }
      })
      // 若事件未及时到达，回退按 id 查询
      setTimeout(() => {
        if (!received && id) this.loadById(id, type)
      }, 300)
    } else if (id) {
      this.loadById(id, type)
    }
  },

  applyIssuer(name: string) {
    this.setData({
      issuer: name,
      issuerShort: name.length > 4 ? name.slice(0, 4) : name
    })
  },

  // 回退：按手机号拉列表再按 _id 匹配
  async loadById(id: string, type: string) {
    try {
      const phone = wx.getStorageSync('phone') || ''
      if (!phone) return
      const res = type === 'external'
        ? await getExternalCertificates(phone)
        : await getTrainingCertificates(phone)
      const list = (res && res.data) || []
      const cert = list.find((c: any) => c._id === id)
      if (cert) this.applyCert(cert, type)
    } catch (err) {
      logger.error('证书', '加载证书详情失败', err)
    }
  },

  applyCert(cert: any, type: string) {
    if (!cert) return
    const isExternal = type === 'external'
    const userName = cert.userName || cert.name || wx.getStorageSync('nickName') || '学员'
    const courseTitle = isExternal
      ? (cert.name || cert.courseName || '')
      : (cert.courseName || cert.courseTitle || cert.className || cert.name || '培训课程')
    // 结业证书用后台机构名；外部证书用其自带 issuer
    const issuer = isExternal ? (cert.issuer || this.data.orgName || ORG_NAME) : (this.data.orgName || ORG_NAME)
    const score = (cert.score !== undefined && cert.score !== null && String(cert.score).trim() !== '')
      ? String(cert.score)
      : ''

    const certId = cert._id || ''
    // 二维码验真：扫码跳小程序验证页（携带证书 id）
    const qrUrl = (this.data.qrVerify && certId)
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com/cert-verify?id=' + certId)}`
      : ''

    this.setData({
      isExternal,
      issuer,
      issuerShort: issuer.length > 4 ? issuer.slice(0, 4) : issuer,
      userName,
      courseTitle,
      certNo: cert.certificateNo || cert.certificateCode || cert.certNo || '-',
      issueDate: pickDate(cert),
      score,
      statusText: STATUS_MAP[cert.status] || '',
      certId,
      qrUrl,
      raw: cert
    })
    // 若配置晚于证书数据到达，补一次机构名应用
    if (!isExternal && this.data.orgName && this.data.orgName !== issuer) {
      this.applyIssuer(this.data.orgName)
    }
    wx.setNavigationBarTitle({ title: isExternal ? '资质证书' : '结业证书' })
  },

  // 保存到相册
  async saveToAlbum() {
    wx.showLoading({ title: '生成中...' })
    try {
      const tempPath = await this.renderToImage()
      await this.doSave(tempPath)
      wx.hideLoading()
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (err: any) {
      wx.hideLoading()
      if (err && err.errMsg && err.errMsg.indexOf('auth deny') > -1) {
        wx.showModal({
          title: '需要相册权限',
          content: '请在设置中开启相册权限后重试',
          confirmText: '去设置',
          success: (r) => { if (r.confirm) wx.openSetting() }
        })
      } else {
        logger.error('证书', '保存证书失败', err)
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  },

  doSave(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: () => resolve(),
        fail: reject
      })
    })
  },

  // 用 canvas 2d 绘制证书并导出临时图片
  renderToImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this)
      query.select('#certCanvas')
        .fields({ node: true, size: true } as any)
        .exec(async (res) => {
          try {
            const canvasNode = res[0].node
            const dpr = 2
            const W = 750
            const H = 1060
            canvasNode.width = W * dpr
            canvasNode.height = H * dpr
            const ctx = canvasNode.getContext('2d')
            ctx.scale(dpr, dpr)
            await this.drawCert(ctx, W, H)
            setTimeout(() => {
              wx.canvasToTempFilePath({
                canvas: canvasNode,
                success: (r: any) => resolve(r.tempFilePath),
                fail: reject
              }, this)
            }, 50)
          } catch (e) {
            reject(e)
          }
        })
    })
  },

  async drawCert(ctx: any, W: number, H: number) {
    const d = this.data
    const border = d.themeBorder || '#c9a227'
    const accent = d.themeAccent || '#1e3a5f'
    const sealRed = 'rgba(196,30,58,0.7)'

    // 外框（主题色渐变）
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#f5d98b')
    grad.addColorStop(0.5, border)
    grad.addColorStop(1, '#f5d98b')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // 内底
    ctx.fillStyle = '#fdfbf5'
    ctx.fillRect(12, 12, W - 24, H - 24)

    // 底纹（按后台开关）
    if (d.bgPattern) {
      ctx.save()
      ctx.fillStyle = 'rgba(201,162,39,0.05)'
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(150 + i * 90, 160, 120, 0, Math.PI * 2); ctx.fill() }
      ctx.fillStyle = 'rgba(30,58,95,0.04)'
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(150 + i * 90, H - 160, 120, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
    }

    // 装饰边角
    ctx.strokeStyle = border
    ctx.lineWidth = 4
    const c = 40, off = 40
    ctx.beginPath(); ctx.moveTo(off, off + c); ctx.lineTo(off, off); ctx.lineTo(off + c, off); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W - off - c, off); ctx.lineTo(W - off, off); ctx.lineTo(W - off, off + c); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(off, H - off - c); ctx.lineTo(off, H - off); ctx.lineTo(off + c, H - off); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W - off - c, H - off); ctx.lineTo(W - off, H - off); ctx.lineTo(W - off, H - off - c); ctx.stroke()

    ctx.textAlign = 'center'

    // 抬头 emoji + 机构
    ctx.font = '54px sans-serif'
    ctx.fillText('🛸', W / 2, 130)
    ctx.fillStyle = accent
    ctx.font = 'bold 30px sans-serif'
    ctx.fillText(d.issuer, W / 2, 185)
    ctx.strokeStyle = border; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(W / 2 - 60, 210); ctx.lineTo(W / 2 + 60, 210); ctx.stroke()

    // 标题
    ctx.fillStyle = accent
    ctx.font = 'bold 64px sans-serif'
    ctx.fillText(d.isExternal ? '资 质 证 书' : '结 业 证 书', W / 2, 320)
    ctx.fillStyle = border
    ctx.font = '22px sans-serif'
    ctx.fillText('CERTIFICATE', W / 2, 355)

    // 正文
    ctx.fillStyle = '#444'
    ctx.font = '28px sans-serif'
    let y = 460
    if (!d.isExternal) {
      ctx.fillText('兹证明', W / 2, y); y += 70
      ctx.fillStyle = accent; ctx.font = 'bold 48px sans-serif'
      ctx.fillText(d.userName, W / 2, y); y += 60
      ctx.fillStyle = '#444'; ctx.font = '28px sans-serif'
      ctx.fillText('学员已完成', W / 2, y); y += 55
      ctx.fillStyle = border; ctx.font = 'bold 34px sans-serif'
      this.wrapText(ctx, '《' + d.courseTitle + '》', W / 2, y, W - 160, 46); y += 60
      ctx.fillStyle = '#444'; ctx.font = '26px sans-serif'
      this.wrapText(ctx, '培训课程全部内容，考核合格，特发此证，以资鼓励。', W / 2, y, W - 160, 44)
    } else {
      ctx.fillText('持证人', W / 2, y); y += 70
      ctx.fillStyle = accent; ctx.font = 'bold 48px sans-serif'
      ctx.fillText(d.userName, W / 2, y); y += 70
      ctx.fillStyle = border; ctx.font = 'bold 34px sans-serif'
      this.wrapText(ctx, d.courseTitle, W / 2, y, W - 160, 46)
    }

    // 成绩圆
    if (d.score) {
      const cx = W / 2, cy = 760
      ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2)
      ctx.strokeStyle = border; ctx.lineWidth = 4; ctx.stroke()
      ctx.fillStyle = accent; ctx.font = 'bold 52px sans-serif'
      ctx.fillText(d.score, cx, cy + 10)
      ctx.fillStyle = '#8a7333'; ctx.font = '20px sans-serif'
      ctx.fillText('考核成绩', cx, cy + 42)
    }

    // 底部信息
    const footY = H - 110
    ctx.textAlign = 'left'
    ctx.fillStyle = '#999'; ctx.font = '20px sans-serif'
    ctx.fillText('证书编号', 70, footY)
    ctx.fillStyle = '#333'; ctx.font = '24px sans-serif'
    ctx.fillText(d.certNo, 70, footY + 34)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#999'; ctx.font = '20px sans-serif'
    ctx.fillText('颁发日期', W - 70, footY)
    ctx.fillStyle = '#333'; ctx.font = '24px sans-serif'
    ctx.fillText(d.issueDate, W - 70, footY + 34)

    // 印章（有上传图则用图，否则文字印章）
    const sx = W / 2, sy = footY + 10
    if (d.sealImage && (d.sealImage.startsWith('http://') || d.sealImage.startsWith('https://') || d.sealImage.startsWith('wxfile'))) {
      try {
        const img = await this.loadSealImage(d.sealImage)
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(-12 * Math.PI / 180)
        ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2); ctx.clip()
        ctx.drawImage(img, -55, -55, 110, 110)
        ctx.restore()
      } catch {
        this.drawTextSeal(ctx, d.issuerShort, sx, sy, sealRed)
      }
    } else {
      this.drawTextSeal(ctx, d.issuerShort, sx, sy, sealRed)
    }

    // 二维码验真（按后台开关）
    if (d.qrVerify && d.qrUrl) {
      try {
        const qr = await this.loadSealImage(d.qrUrl)
        const qw = 120
        const qx = W / 2 - qw / 2
        const qy = H - 250
        ctx.fillStyle = '#fff'
        ctx.fillRect(qx - 6, qy - 6, qw + 12, qw + 12)
        ctx.drawImage(qr, qx, qy, qw, qw)
        ctx.fillStyle = '#999'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText('扫码验证证书真伪', W / 2, qy + qw + 28)
      } catch { /* 二维码加载失败不影响主图 */ }
    }
  },

  // 文字印章（无图片时）
  drawTextSeal(ctx: any, text: string, sx: number, sy: number, color: string) {
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(-12 * Math.PI / 180)
    ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2)
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.stroke()
    ctx.fillStyle = color
    ctx.textAlign = 'center'; ctx.font = 'bold 20px sans-serif'
    ctx.fillText(text, 0, 0)
    ctx.font = '22px sans-serif'
    ctx.fillText('★', 0, 28)
    ctx.restore()
  },

  // 加载网络/本地图片为 canvas 可绘制对象
  loadSealImage(src: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const img = (wx as any).createImage()
      img.src = src
      img.onload = () => resolve(img)
      img.onerror = (e: any) => reject(e)
    })
  },

  // canvas 简易自动换行
  wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const chars = text.split('')
    let line = ''
    let curY = y
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i]
      if (ctx.measureText(test).width > maxWidth && line !== '') {
        ctx.fillText(line, x, curY)
        line = chars[i]
        curY += lineHeight
      } else {
        line = test
      }
    }
    ctx.fillText(line, x, curY)
  }
})
