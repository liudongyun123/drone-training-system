import type { Certificate, ApiResponse } from '../types';
import { adminService } from './adminService';

// ============================================================================
// 证书服务 - 证书申请、查询、下载管理
// 使用 adminService 云函数操作数据库（后台统一规则）
// ============================================================================

const COLLECTION = 'certificates';

// 证书模板配置
const CERTIFICATE_TEMPLATES = [
  { id: 'template_001', name: 'CAAC无人机执照证书', type: 'official' },
  { id: 'template_002', name: '结业证书', type: 'completion' },
  { id: 'template_003', name: '培训合格证书', type: 'training' }
];

export const certificateService = {
  // 获取证书列表
  async getList(params?: { userId?: string; status?: string }): Promise<ApiResponse<Certificate[]>> {
    try {
      const query: any = {};
      if (params?.userId) query.userId = params.userId;
      if (params?.status) query.status = params.status;
      
      const result = await adminService.list(COLLECTION, query, { limit: 1000 });
      const data = result.data || [];
      
      return { 
        success: true, 
        data: (data as Certificate[]).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ) 
      };
    } catch (error) {
      console.error('获取证书列表失败:', error);
      return { success: false, message: '获取证书列表失败' };
    }
  },

  // 获取证书详情
  async getDetail(id: string): Promise<ApiResponse<Certificate>> {
    try {
      const result = await adminService.get(COLLECTION, id);
      if (!result.data) {
        return { success: false, message: '证书不存在' };
      }
      return { success: true, data: result.data as Certificate };
    } catch (error) {
      console.error('获取证书详情失败:', error);
      return { success: false, message: '获取证书详情失败' };
    }
  },

  // 申请证书
  async apply(data: { userId: string; userName: string; courseId: string; courseTitle: string; examId?: string }): Promise<ApiResponse<Certificate>> {
    try {
      const newCertificate = {
        ...data,
        certificateNo: '',
        issueDate: '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const result = await adminService.add(COLLECTION, newCertificate);
      return { success: true, data: { _id: result.data?.id || result.data?._id, ...newCertificate } as Certificate };
    } catch (error) {
      console.error('申请证书失败:', error);
      return { success: false, message: '申请证书失败' };
    }
  },

  // 发放证书
  async issue(id: string, data: { certificateNo: string; fileUrl?: string }): Promise<ApiResponse<Certificate>> {
    try {
      const updateData = {
        ...data,
        status: 'issued',
        issueDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await adminService.update(COLLECTION, id, updateData);
      const result = await adminService.get(COLLECTION, id);
      return { success: true, data: result.data as Certificate };
    } catch (error) {
      console.error('发放证书失败:', error);
      return { success: false, message: '发放证书失败' };
    }
  },

  // 撤销证书
  async revoke(id: string, reason?: string): Promise<ApiResponse<void>> {
    try {
      await adminService.update(COLLECTION, id, {
        status: 'revoked',
        revokeReason: reason,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('撤销证书失败:', error);
      return { success: false, message: '撤销证书失败' };
    }
  },

  // 删除证书
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await adminService.delete(COLLECTION, id);
      return { success: true };
    } catch (error) {
      console.error('删除证书失败:', error);
      return { success: false, message: '删除证书失败' };
    }
  },

  // 验证证书
  async verify(certificateNo: string): Promise<ApiResponse<Certificate>> {
    try {
      const result = await adminService.list(COLLECTION, { certificateNo }, { limit: 1 });
      const data = result.data || [];
      
      if (data.length === 0) {
        return { success: false, message: '证书不存在或无效' };
      }
      
      const certificate = data[0] as Certificate;
      
      if (certificate.status !== 'issued') {
        return { success: false, message: '证书未生效或已被撤销' };
      }
      
      return { success: true, data: certificate };
    } catch (error) {
      console.error('验证证书失败:', error);
      return { success: false, message: '验证证书失败' };
    }
  },

  // 获取证书统计
  async getStats(): Promise<ApiResponse<{
    total: number;
    issued: number;
    pending: number;
    revoked: number;
    thisMonth: number;
  }>> {
    try {
      const result = await adminService.list(COLLECTION, {}, { limit: 1000 });
      const certificates = (result.data || []) as Certificate[];
      
      const now = new Date();
      const thisMonth = now.toISOString().slice(0, 7);
      
      return {
        success: true,
        data: {
          total: certificates.length,
          issued: certificates.filter(c => c.status === 'issued').length,
          pending: certificates.filter(c => c.status === 'pending').length,
          revoked: certificates.filter(c => c.status === 'revoked').length,
          thisMonth: certificates.filter(c => c.createdAt?.startsWith(thisMonth)).length
        }
      };
    } catch (error) {
      console.error('获取证书统计失败:', error);
      return { success: false, message: '获取证书统计失败' };
    }
  },

  // 获取证书模板
  async getTemplates(): Promise<ApiResponse<typeof CERTIFICATE_TEMPLATES>> {
    console.log('获取证书模板');
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: true, data: CERTIFICATE_TEMPLATES };
  },

  // 下载证书
  async download(id: string): Promise<ApiResponse<{ url: string; filename: string }>> {
    try {
      const result = await adminService.get(COLLECTION, id);
      const certificate = result.data as Certificate;
      
      if (!certificate) {
        return { success: false, message: '证书不存在' };
      }
      
      if (certificate.status !== 'issued') {
        return { success: false, message: '证书未发放，无法下载' };
      }
      
      return {
        success: true,
        data: {
          url: certificate.fileUrl || '',
          filename: `${certificate.certificateNo}.pdf`
        }
      };
    } catch (error) {
      console.error('下载证书失败:', error);
      return { success: false, message: '下载证书失败' };
    }
  }
};

export default certificateService;
