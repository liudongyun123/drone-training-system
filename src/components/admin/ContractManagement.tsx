/**
 * 培训合同管理组件
 * 查看学员签署的培训协议，支持查看合同内容和签名、公司盖章
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
  Divider,
  Tabs,
  Tab,
} from '@mui/material'
import {
  Visibility as ViewIcon,
  Search as SearchIcon,
  Description as ContractIcon,
  CheckCircle as SignedIcon,
  PendingActions as UnsignedIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Preview as PreviewIcon,
  Approval as StampIcon,
  CloudUpload as UploadIcon,
  VerifiedUser as CompletedIcon,
} from '@mui/icons-material'
import { Contract, ContractStatus, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS, normalizeStatus } from '../../types/contract'
import AdminTablePagination from './AdminTablePagination'
import { formatDateStr } from '@/utils/dateUtils'

interface ContractListParams {
  page: number
  pageSize: number
  keyword?: string
  status?: string
}

// 默认合同模板（新安装时使用）
const DEFAULT_TEMPLATE = `<h2>无人机驾驶培训协议</h2>
<p><strong>甲方（培训机构）：</strong>_______________</p>
<p><strong>乙方（学员）：</strong>{userName}</p>
<p><strong>身份证号：</strong>{idCard}</p>
<p><strong>联系电话：</strong>{phone}</p>
<br/>
<p>甲乙双方本着平等自愿、诚实信用的原则，就无人机驾驶培训事宜达成如下协议：</p>
<br/>
<p><strong>一、培训内容</strong></p>
<p>1. 培训课程：{courseName}</p>
<p>2. 培训方式：理论教学 + 实操训练</p>
<p>3. 培训目标：使学员掌握无人机飞行操作技能，具备参加相关考试的能力</p>
<br/>
<p><strong>二、培训费用</strong></p>
<p>培训费用以订单实际支付金额为准，乙方已通过平台完成支付。</p>
<br/>
<p><strong>三、双方权利与义务</strong></p>
<p>1. 甲方应按教学计划提供培训服务，保证教学质量。</p>
<p>2. 乙方应按时参加培训，遵守培训纪律，服从教学安排。</p>
<p>3. 乙方应确保所提供个人信息真实有效。</p>
<br/>
<p><strong>四、安全责任</strong></p>
<p>1. 实操训练期间，乙方应严格遵守安全操作规程。</p>
<p>2. 因乙方违反操作规程造成的人身或财产损失，由乙方自行承担。</p>
<br/>
<p><strong>五、其他约定</strong></p>
<p>1. 本协议自双方签署之日起生效。</p>
<p>2. 本协议一式两份，甲乙双方各执一份，具有同等法律效力。</p>
<p>3. 未尽事宜，双方协商解决。</p>
<br/>
<p style="margin-top: 40px;"><strong>乙方（学员）签名：</strong></p>`

export default function ContractManagement() {
  // Tab 状态
  const [activeTab, setActiveTab] = useState(0)

  // 签署记录相关
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [params, setParams] = useState<ContractListParams>({ page: 1, pageSize: 20 })
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [signatureUrl, setSignatureUrl] = useState('')

  // 模板编辑
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateContent, setTemplateContent] = useState('')
  const [templateSaved, setTemplateSaved] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [templateVariables] = useState([
    { key: '{userName}', label: '学员姓名' },
    { key: '{idCard}', label: '身份证号' },
    { key: '{phone}', label: '联系电话' },
    { key: '{courseName}', label: '课程名称' },
  ])

  // 公司印章
  const [companySealUrl, setCompanySealUrl] = useState('')
  const [sealUploading, setSealUploading] = useState(false)
  const sealFileRef = useRef<HTMLInputElement>(null)

  // 盖章中
  const [stamping, setStamping] = useState<string>('')

  // 提示
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  // 加载合同列表
  const loadContracts = useCallback(async () => {
    setLoading(true)
    try {
      const { adminService } = await import('../../services/adminService')
      const query: any = { page: params.page, pageSize: params.pageSize }
      if (statusFilter) query.status = statusFilter
      if (keyword) query.keyword = keyword

      const res = await adminService.callFunction('api-order', {
        action: 'getContractList',
        data: query
      })

      if (res && res.code === 0 && res.data) {
        setContracts(res.data.list || [])
        setTotal(res.data.total || 0)
      } else {
        console.error('加载合同列表返回异常:', res)
      }
    } catch (err: any) {
      console.error('加载合同列表失败:', err)
      setSnack({ open: true, message: '加载失败: ' + err.message, severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [params, statusFilter, keyword])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  // 加载合同模板
  const loadTemplate = async () => {
    setTemplateLoading(true)
    try {
      const { adminService } = await import('../../services/adminService')
      const res = await adminService.list('system_config', { key: 'contract_template' }, { limit: 1, orderBy: 'updatedAt', order: 'desc' })
      if (res.code === 0 && res.data?.list?.length > 0) {
        setTemplateContent(res.data.list[0].value || res.data.list[0].content || '')
      } else {
        setTemplateContent(DEFAULT_TEMPLATE)
      }
    } catch {
      setTemplateContent(DEFAULT_TEMPLATE)
    } finally {
      setTemplateLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 1) {
      loadTemplate()
    }
  }, [activeTab])

  // 保存合同模板
  const saveTemplate = async () => {
    setTemplateLoading(true)
    try {
      const { adminService } = await import('../../services/adminService')
      // 先查是否存在
      const existing = await adminService.list('system_config', { key: 'contract_template' }, { limit: 1 })

      if (existing.code === 0 && existing.data?.list?.length > 0) {
        // 更新
        await adminService.update('system_config', existing.data.list[0]._id, {
          value: templateContent,
          updatedAt: new Date().toISOString()
        })
      } else {
        // 新增
        await adminService.add('system_config', {
          key: 'contract_template',
          value: templateContent,
          type: 'contract',
          label: '培训合同模板',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      setTemplateSaved(true)
      setEditingTemplate(false)
      setSnack({ open: true, message: '合同模板保存成功', severity: 'success' })
    } catch (err: any) {
      setSnack({ open: true, message: '保存失败: ' + err.message, severity: 'error' })
    } finally {
      setTemplateLoading(false)
    }
  }

  // 加载公司印章
  const loadCompanySeal = async () => {
    try {
      const { adminService } = await import('../../services/adminService')
      const res = await adminService.list('system_config', { key: 'company_seal' }, { limit: 1 })
      if (res.code === 0 && res.data?.list?.length > 0) {
        const sealValue = res.data.list[0].value || ''
        if (!sealValue) return
        
        // 如果是 cloud:// 格式，通过 getTempFileURL 获取临时链接
        if (sealValue.startsWith('cloud://')) {
          const tempRes = await adminService.callFunction('db-init', {
            action: 'getTempFileURL',
            fileList: [sealValue]
          })
          if (tempRes && tempRes.fileList && tempRes.fileList[0]?.tempFileURL) {
            setCompanySealUrl(tempRes.fileList[0].tempFileURL)
          } else {
            setCompanySealUrl(sealValue)
          }
        } else {
          setCompanySealUrl(sealValue)
        }
      }
    } catch (e) {
      // 印章加载失败不阻塞，静默处理
    }
  }

  // 上传公司印章
  const handleSealUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setSnack({ open: true, message: '请上传图片文件', severity: 'error' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSnack({ open: true, message: '图片大小不能超过 5MB', severity: 'error' })
      return
    }

    setSealUploading(true)
    try {
      // 读取为 base64
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })

      // 上传到云存储并保存配置
      const { adminService } = await import('../../services/adminService')
      const uploadRes = await adminService.callFunction('api-upload', {
        action: 'uploadFile',
        fileName: `contracts/seals/${Date.now()}_${file.name}`,
        fileContent: base64.split(',')[1],
        encoding: 'base64'
      })

      let sealFileID = ''
      if (uploadRes.code === 0 && uploadRes.data) {
        sealFileID = uploadRes.data.fileID || uploadRes.data.fileId || ''
      }
      
      // 降级使用 base64
      if (!sealFileID) {
        sealFileID = base64
      }

      // 保存到 system_config
      const existing = await adminService.list('system_config', { key: 'company_seal' }, { limit: 1 })
      
      if (existing.code === 0 && existing.data?.list?.length > 0) {
        await adminService.update('system_config', existing.data.list[0]._id, {
          value: sealFileID,
          updatedAt: new Date().toISOString()
        })
      } else {
        await adminService.add('system_config', {
          key: 'company_seal',
          value: sealFileID,
          type: 'contract',
          label: '公司印章',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      setCompanySealUrl(base64)
      setSnack({ open: true, message: '公司印章上传成功', severity: 'success' })
    } catch (err: any) {
      setSnack({ open: true, message: '印章上传失败: ' + err.message, severity: 'error' })
    } finally {
      setSealUploading(false)
      if (sealFileRef.current) sealFileRef.current.value = ''
    }
  }

  // 公司盖章
  const handleCompanyStamp = async (contractId: string) => {
    setStamping(contractId)
    try {
      const { adminService } = await import('../../services/adminService')
      const res = await adminService.callFunction('api-order', {
        action: 'companyStamp',
        data: { contractId }
      })

      if (res && res.code === 0) {
        setSnack({ open: true, message: '盖章成功，合同已生效', severity: 'success' })
        loadContracts()
      } else {
        setSnack({ open: true, message: '盖章失败: ' + (res?.error || '未知错误'), severity: 'error' })
      }
    } catch (err: any) {
      setSnack({ open: true, message: '盖章失败: ' + err.message, severity: 'error' })
    } finally {
      setStamping('')
    }
  }

  useEffect(() => {
    if (activeTab === 1) {
      loadTemplate()
      loadCompanySeal()
    }
  }, [activeTab])

  // 查看合同详情
  const handleViewDetail = async (contract: Contract) => {
    setSelectedContract(contract)
    setSignatureUrl('')
    setDetailOpen(true)

    const isSigned = normalizeStatus(contract.status) !== 'unsigned'
    // 如果有签名图片，获取临时链接
    if (contract.signatureImage && isSigned) {
      try {
        const { adminService } = await import('../../services/adminService')
        const res = await adminService.callFunction('api-order', {
          action: 'getContract',
          data: { contractId: contract._id }
        })
        if (res && res.code === 0 && res.data) {
          // 更新签名和印章 URL
          setSignatureUrl(res.data.signatureUrl || '')
          // 如果后端返回了印章链接，更新 contract 对象
          if (res.data.companySealUrl) {
            setSelectedContract(prev => prev ? { ...prev, companySealUrl: res.data.companySealUrl } : prev)
          }
        } else if (contract.signatureImage.startsWith('data:image')) {
          setSignatureUrl(contract.signatureImage)
        }
      } catch {
        // 降级：如果是 base64 直接用
        if (contract.signatureImage.startsWith('data:image')) {
          setSignatureUrl(contract.signatureImage)
        }
      }
    }
  }

  // 分页
  const handlePageChange = (page: number, pageSize: number) => {
    setParams(prev => ({ ...prev, page, pageSize }))
  }

  return (
    <Box>
      {/* 头部 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          <ContractIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          培训合同管理
        </Typography>
      </Box>

      {/* Tab 切换 */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="签署记录" />
        <Tab label="合同模板" />
      </Tabs>

      {/* ===== Tab 0: 签署记录 ===== */}
      {activeTab === 0 && (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setParams(prev => ({ ...prev, page: 1 }))
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="">全部状态</option>
            <option value="unsigned">未签署</option>
            <option value="student_signed">待公司盖章</option>
            <option value="completed">已生效</option>
          </select>

          <TextField
            size="small"
            placeholder="搜索学员姓名/手机号..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setParams(prev => ({ ...prev, page: 1 }))
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 280 }}
          />
        </Box>

      {/* 表格 */}
      <TableContainer component={Paper} sx={{ borderRadius: '12px' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell>学员姓名</TableCell>
              <TableCell>手机号</TableCell>
              <TableCell>课程名称</TableCell>
              <TableCell>合同类型</TableCell>
              <TableCell>签署状态</TableCell>
              <TableCell>签署时间</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#999' }}>
                  暂无合同记录
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => {
                const nStatus = normalizeStatus(contract.status)
                const statusIcon = nStatus === 'unsigned' ? <UnsignedIcon /> 
                  : nStatus === 'completed' ? <CompletedIcon /> 
                  : <SignedIcon />
                return (
                  <TableRow key={contract._id} hover>
                    <TableCell>{contract.userName}</TableCell>
                    <TableCell>{contract.phone}</TableCell>
                    <TableCell>{contract.courseName || '-'}</TableCell>
                    <TableCell>
                      <Chip label="培训协议" size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={statusIcon}
                        label={CONTRACT_STATUS_LABELS[contract.status]}
                        size="small"
                        color={CONTRACT_STATUS_COLORS[contract.status]}
                      />
                    </TableCell>
                    <TableCell>
                      {contract.signedAt ? formatDateStr(contract.signedAt) : '-'}
                    </TableCell>
                    <TableCell>
                      {formatDateStr(contract.createdAt)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {(nStatus === 'student_signed' || contract.status === 'signed') && (
                          <IconButton
                            size="small"
                            color="success"
                            title="公司盖章"
                            disabled={stamping === contract._id}
                            onClick={() => handleCompanyStamp(contract._id)}
                          >
                            {stamping === contract._id ? <CircularProgress size={18} /> : <StampIcon fontSize="small" />}
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewDetail(contract)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              }))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      <AdminTablePagination
        total={total}
        page={params.page}
        pageSize={params.pageSize}
        onPageChange={handlePageChange}
      />

      {/* 合同详情弹窗 */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ borderBottom: '1px solid #f0f0f0' }}>
          合同详情
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {selectedContract && (
            <Grid container spacing={3}>
              {/* 基本信息 */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  基本信息
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">学员姓名</Typography>
                    <Typography>{selectedContract.userName}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">手机号</Typography>
                    <Typography>{selectedContract.phone}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">身份证</Typography>
                    <Typography>{selectedContract.idCard || '-'}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">课程</Typography>
                    <Typography>{selectedContract.courseName || '-'}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">签署状态</Typography>
                    <Chip
                      size="small"
                      label={CONTRACT_STATUS_LABELS[selectedContract.status]}
                      color={CONTRACT_STATUS_COLORS[selectedContract.status]}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">签署时间</Typography>
                    <Typography>
                      {selectedContract.signedAt ? formatDateStr(selectedContract.signedAt) : '未签署'}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* 合同内容 */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  合同内容
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    maxHeight: 300,
                    overflow: 'auto',
                    bgcolor: '#fafafa',
                    fontSize: '14px',
                    lineHeight: 1.8,
                    '& h2': { fontSize: '18px', textAlign: 'center', mb: 2 },
                    '& p': { mb: 1 }
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: selectedContract.contractContent }} />
                </Paper>
              </Grid>

              {/* 学员签名 */}
              {normalizeStatus(selectedContract.status) !== 'unsigned' && signatureUrl && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    学员签名
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      display: 'flex',
                      justifyContent: 'center',
                      bgcolor: '#fafafa'
                    }}
                  >
                    <img
                      src={signatureUrl}
                      alt="学员签名"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 150,
                        border: '1px solid #e0e0e0',
                        borderRadius: 4
                      }}
                    />
                  </Paper>
                </Grid>
              )}

              {/* 公司印章 */}
              {selectedContract.status === 'completed' && selectedContract.companySealUrl && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    公司印章
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      display: 'flex',
                      justifyContent: 'center',
                      bgcolor: '#fafafa'
                    }}
                  >
                    <img
                      src={selectedContract.companySealUrl}
                      alt="公司印章"
                      style={{
                        maxWidth: 150,
                        maxHeight: 150,
                        border: '1px solid #e0e0e0',
                        borderRadius: 4
                      }}
                    />
                  </Paper>
                </Grid>
              )}

              {/* 签署信息 */}
              {normalizeStatus(selectedContract.status) !== 'unsigned' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    签署信息
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">验证方式</Typography>
                      <Typography>{selectedContract.verifyMethod === 'sms' ? '短信验证' : '无'}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">签署设备</Typography>
                      <Typography>{selectedContract.signDevice || '-'}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary">公司盖章时间</Typography>
                      <Typography>
                        {selectedContract.companySignedAt ? formatDateStr(selectedContract.companySignedAt) : '待盖章'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #f0f0f0', px: 3, py: 2 }}>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 签署记录-分页 */}
      <AdminTablePagination
        total={total}
        page={params.page}
        pageSize={params.pageSize}
        onPageChange={handlePageChange}
      />
      </Box>
      )}

      {/* ===== Tab 1: 合同模板 ===== */}
      {activeTab === 1 && (
      <Box>
        {templateLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* 变量说明 */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#f0f7ff', border: '1px solid #b3d8ff', borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="#1a56db">
                  可用变量（签约时会自动替换为学员信息）
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {templateVariables.map(v => (
                    <Box key={v.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={v.key} size="small" color="primary" variant="outlined" />
                      <Typography variant="caption" color="textSecondary">{v.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>

            {/* 公司印章上传 */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="#92400e">
                      <StampIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
                      公司印章管理
                    </Typography>
                    <Typography variant="caption" color="#a16207">
                      上传公司公章，盖章时自动应用到合同上。支持 PNG/JPG，建议透明背景
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {companySealUrl && (
                      <img
                        src={companySealUrl}
                        alt="公司印章"
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: 'contain',
                          border: '1px solid #e0e0e0',
                          borderRadius: 8,
                          background: 'white'
                        }}
                      />
                    )}
                    <input
                      ref={sealFileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleSealUpload}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={sealUploading ? <CircularProgress size={14} /> : <UploadIcon />}
                      disabled={sealUploading}
                      onClick={() => sealFileRef.current?.click()}
                      sx={{ borderColor: '#d97706', color: '#92400e' }}
                    >
                      {companySealUrl ? '更换印章' : '上传印章'}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* 编辑器 */}
            <Grid item xs={12} md={editingTemplate || !templateContent ? 12 : 8}>
              <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    合同模板内容（支持 HTML）
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!editingTemplate && templateContent && (
                      <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingTemplate(true)}>
                        编辑
                      </Button>
                    )}
                    {editingTemplate && (
                      <>
                        <Button size="small" onClick={() => { setEditingTemplate(false); loadTemplate() }}>
                          取消
                        </Button>
                        <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={saveTemplate}>
                          保存
                        </Button>
                      </>
                    )}
                    <Button size="small" startIcon={<PreviewIcon />} onClick={() => setPreviewOpen(true)}>
                      预览
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ p: 2 }}>
                  {editingTemplate || !templateContent ? (
                    <TextField
                      multiline
                      fullWidth
                      minRows={20}
                      maxRows={30}
                      value={templateContent}
                      onChange={(e) => { setTemplateContent(e.target.value); setTemplateSaved(false) }}
                      placeholder="请输入合同模板 HTML 内容..."
                      sx={{
                        '& textarea': { fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6 }
                      }}
                    />
                  ) : (
                    <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                      <div
                        dangerouslySetInnerHTML={{ __html: templateContent }}
                        style={{ fontSize: '14px', lineHeight: 2 }}
                      />
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* 预览预览（编辑时显示侧边预览） */}
            {(editingTemplate || !templateContent) && (
              <Grid item xs={12} md={4}>
                <Paper sx={{ borderRadius: 2, overflow: 'hidden', position: 'sticky', top: 20 }}>
                  <Box sx={{ p: 2, bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
                    <Typography variant="subtitle2" fontWeight="bold">实时预览</Typography>
                  </Box>
                  <Box sx={{ p: 2, maxHeight: 600, overflow: 'auto', fontSize: '12px', lineHeight: 1.8 }}>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: templateContent
                          .replace(/{userName}/g, '<span style="color:#2563eb;font-weight:bold">张三</span>')
                          .replace(/{idCard}/g, '<span style="color:#2563eb">310xxx19900101xxxx</span>')
                          .replace(/{phone}/g, '<span style="color:#2563eb">13800138000</span>')
                          .replace(/{courseName}/g, '<span style="color:#2563eb;font-weight:bold">多旋翼无人机驾驶第5期</span>')
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
      )}

      {/* 合同详情弹窗 */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ borderBottom: '1px solid #f0f0f0' }}>
          合同详情
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {selectedContract && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  基本信息
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">学员姓名</Typography>
                    <Typography>{selectedContract.userName}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">手机号</Typography>
                    <Typography>{selectedContract.phone}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">身份证</Typography>
                    <Typography>{selectedContract.idCard || '-'}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">课程</Typography>
                    <Typography>{selectedContract.courseName || '-'}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">签署状态</Typography>
                    <Chip
                      size="small"
                      label={CONTRACT_STATUS_LABELS[selectedContract.status]}
                      color={CONTRACT_STATUS_COLORS[selectedContract.status]}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">签署时间</Typography>
                    <Typography>
                      {selectedContract.signedAt ? formatDateStr(selectedContract.signedAt) : '未签署'}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  合同内容
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto', bgcolor: '#fafafa', fontSize: '14px', lineHeight: 1.8 }}>
                  <div dangerouslySetInnerHTML={{ __html: selectedContract.contractContent }} />
                </Paper>
              </Grid>
              {selectedContract.status === 'signed' && signatureUrl && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>学员签名</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'center', bgcolor: '#fafafa' }}>
                    <img src={signatureUrl} alt="学员签名" style={{ maxWidth: '100%', maxHeight: 150, border: '1px solid #e0e0e0', borderRadius: 4 }} />
                  </Paper>
                </Grid>
              )}
              {selectedContract.status === 'signed' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>签署信息</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">验证方式</Typography>
                      <Typography>{selectedContract.verifyMethod === 'sms' ? '短信验证' : '无'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">签署设备</Typography>
                      <Typography>{selectedContract.signDevice || '-'}</Typography>
                    </Grid>
                  </Grid>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #f0f0f0', px: 3, py: 2 }}>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 模板预览弹窗 */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #f0f0f0' }}>合同模板预览（学员视角）</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Paper variant="outlined" sx={{ p: 3, bgcolor: '#fafafa', fontSize: '14px', lineHeight: 2, maxHeight: '70vh', overflow: 'auto' }}>
            <div
              dangerouslySetInnerHTML={{
                __html: templateContent
                  .replace(/{userName}/g, '张三')
                  .replace(/{idCard}/g, '310xxx19900101xxxx')
                  .replace(/{phone}/g, '13800138000')
                  .replace(/{courseName}/g, '多旋翼无人机驾驶第5期')
              }}
            />
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  )
}
