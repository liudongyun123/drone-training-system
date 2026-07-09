// 小程序全局常量配置

// 默认封面图片（统一管理，避免多处硬编码）
export const DEFAULT_COVER = '/assets/default-cover.png'

// 客服电话（统一管理）
export const SERVICE_PHONE = '17628157097'

// 默认库存
export const DEFAULT_STOCK = 0

// 应用版本号
export const APP_VERSION = 'V1.0.0'

// 分类图标映射（统一管理，避免重复定义）
export const CATEGORY_ICON_MAP: Record<string, string> = {
  '法规政策': '📜',
  '飞行理论': '✈️',
  '专业技能': '🎯',
  '综合练习': '📚',
  '综合': '📚',
  'default': '📝'
}

// 获取分类图标
export function getCategoryIcon(category: string): string {
  return CATEGORY_ICON_MAP[category] || CATEGORY_ICON_MAP['default']
}

// 关于我们内容（可从 system_config 覆盖）
export const ABOUT_CONTENT = '无人机培训中心\n\n中国航空运输协会认证培训机构\n专业无人机驾驶员培训机构'

// 帮助中心内容（可从 system_config 覆盖）
export const HELP_CONTENT = '常见问题：\n\n1. 如何报名培训？\n进入课程详情页，点击立即报名即可。\n\n2. 证书如何获取？\n完成培训课程并通过考试后自动生成。\n\n3. 如何联系客服？\n点击联系客服查看电话。'

// 用户协议（法律文本，集中管理）
export const USER_AGREEMENT = '欢迎使用无人机培训系统！\n\n1. 本小程序为用户提供无人机培训课程报名、在线学习、模拟考试等服务。\n2. 用户在使用本服务时需遵守相关法律法规，不得利用本服务从事违法活动。\n3. 用户提供的个人信息（手机号、收货地址等）仅用于课程服务、订单处理及证书申请。\n4. 课程内容版权归本平台所有，未经授权不得转载或商用。\n5. 如因不可抗力导致服务中断，本平台不承担责任。\n\n如有疑问请联系客服。'

// 隐私政策（法律文本，集中管理）
export const PRIVACY_POLICY = '我们重视您的隐私保护。\n\n1. 信息收集：我们仅收集为您提供服务所必需的信息，包括手机号（用于登录和课程报名）、收货地址（用于商品配送）、微信头像昵称（用于展示用户资料）。\n2. 信息使用：您的信息仅用于课程服务、订单处理、证书申请及客服沟通。\n3. 信息保护：我们采取合理措施保护您的信息安全，不会向第三方出售或非法共享您的个人信息。\n4. 信息存储：您的信息存储于腾讯云服务器，我们会按照法律规定保存必要时间。\n5. 您的权利：您有权访问、更正或删除您的个人信息。\n\n如有疑问请联系客服。'

// 隐私弹窗内容（首次启动）
export const PRIVACY_POPUP_CONTENT = '欢迎使用无人机培训系统！\n\n我们重视您的隐私保护。在使用本小程序时，我们可能需要获取以下信息：\n\n• 微信昵称和头像：用于个人中心展示\n• 手机号：用于身份验证和课程服务\n• 照片/相册：用于上传个人头像\n\n我们承诺不会将您的个人信息泄露给第三方。\n\n点击"同意"即表示您同意上述隐私政策。'
