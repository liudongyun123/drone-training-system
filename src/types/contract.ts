/**
 * 培训合同类型定义
 */

export type ContractType = 'training_agreement'  // 培训协议

export type ContractStatus = 'unsigned' | 'signed' | 'student_signed' | 'completed'

// backward compat: 'signed' = 学员已签署（旧数据）等同 'student_signed'
export type NormalizedStatus = 'unsigned' | 'student_signed' | 'completed'

export function normalizeStatus(s: ContractStatus): NormalizedStatus {
  if (s === 'signed') return 'student_signed'
  return s as NormalizedStatus
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  training_agreement: '培训协议'
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  unsigned: '未签署',
  signed: '学员已签署',
  student_signed: '学员已签署',
  completed: '已生效'
}

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, 'warning' | 'success' | 'info' | 'default'> = {
  unsigned: 'warning',
  signed: 'info',
  student_signed: 'info',
  completed: 'success'
}

/**
 * 合同记录
 */
export interface Contract {
  _id: string
  userId: string
  userName: string
  phone: string
  idCard?: string
  orderId?: string           // 关联订单
  registrationId?: string    // 关联报名
  courseId?: string
  courseName?: string
  contractType: ContractType
  title: string               // 合同标题，如"无人机驾驶培训协议"
  
  // 合同模板内容（从数据库 system_config 获取或内置）
  contractContent: string     // HTML 格式的合同正文
  
  // 签署信息
  signatureImage: string      // 手写签名图片（云存储 fileID）
  signatureUrl?: string       // 签名图片临时链接（查询时生成）
  status: ContractStatus
  
  // 验证方式
  verifyMethod: 'sms' | 'none'
  verifyCode?: string          // 仅记录验证方式，不存验证码
  
  // 签署设备信息
  signDevice?: string
  signIP?: string
  
  signedAt?: string            // 学员签署时间
  
  // 公司盖章
  companySeal?: string         // 公司印章图片（云存储 fileID）
  companySealUrl?: string      // 印章临时链接
  companySignedAt?: string     // 公司盖章时间
  createdAt: string
  updatedAt: string
}

/**
 * 创建合同请求
 */
export interface CreateContractRequest {
  userId: string
  userName: string
  phone: string
  idCard?: string
  orderId?: string
  registrationId?: string
  courseId?: string
  courseName?: string
  contractType: ContractType
  title: string
  contractContent: string
}

/**
 * 签署合同请求
 */
export interface SignContractRequest {
  contractId: string
  signatureImage: string      // 签名图片 base64 或 fileID
  verifyMethod: 'sms' | 'none'
  signDevice?: string
  signIP?: string
}
