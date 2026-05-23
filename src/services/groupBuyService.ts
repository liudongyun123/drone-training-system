// ============================================================================
// 拼团服务 - 适配器层（管理后台使用）
// ★ Stage 3 迁移：数据库操作统一走 HTTP → adminService → db-init 云函数
// ============================================================================
import type { GroupBuy, GroupBuyParticipant, ApiResponse, PaginatedResponse } from '../types';
import { groupBuyService as dbService, type GroupBuyActivity, type GroupBuyTeam } from './groupBuy';
import { adminService } from './adminService';

const extractList = <T>(result: any): T[] => result?.data?.list || result?.data || [];

/**
 * 将 GroupBuyActivity（数据库格式）转换为 GroupBuy（管理后台格式）
 */
function toGroupBuy(a: GroupBuyActivity): GroupBuy {
  let status: GroupBuy['status'] = 'active';
  if (a.status === 'ended' || a.status === 'paused') status = 'expired';

  return {
    _id: a._id,
    courseId: a.courseId,
    title: a.courseTitle || `课程拼团活动`,
    requiredCount: a.minPeople,
    currentCount: a.activeGroups,
    price: a.groupPrice,
    originalPrice: a.originalPrice,
    validFrom: a.startDate,
    validTo: a.endDate,
    status,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/**
 * 将管理后台的创建数据转为数据库 Activity 格式
 */
function fromGroupBuyCreate(data: Omit<GroupBuy, '_id' | 'currentCount' | 'createdAt' | 'updatedAt'>): Omit<GroupBuyActivity, '_id' | 'activeGroups' | 'createdAt' | 'updatedAt'> {
  let status: GroupBuyActivity['status'] = 'active';
  if (data.status === 'expired') status = 'ended';

  const duration = (data as any).duration;
  const multiplier = (data as any).multiplier || 2;

  return {
    courseId: data.courseId,
    courseTitle: data.title,
    originalPrice: data.originalPrice,
    groupPrice: data.price,
    minPeople: data.requiredCount,
    maxPeople: data.requiredCount * multiplier,
    duration: duration,
    startDate: data.validFrom,
    endDate: data.validTo,
    status,
    description: '',
  };
}

export const groupBuyService = {
  // 获取拼团列表
  getList: async (params?: { status?: string; courseId?: string; page?: number; limit?: number }): Promise<PaginatedResponse<GroupBuy>> => {
    try {
      const activities = await dbService.getAllActivities() || [];
      const activityList = Array.isArray(activities) ? activities : [];
      let mapped = activityList.map(toGroupBuy);

      if (params?.status && params.status !== 'all') {
        mapped = mapped.filter(g => g.status === params.status);
      }
      if (params?.courseId) {
        mapped = mapped.filter(g => g.courseId === params.courseId);
      }

      return {
        data: mapped,
        total: mapped.length,
        page: 1,
        limit: 10,
      } as any;
    } catch (error) {
      console.error('获取拼团列表失败:', error);
      return {
        data: [], total: 0, page: params?.page || 1, limit: params?.limit || 10,
      } as any;
    }
  },

  // 获取拼团详情
  getDetail: async (id: string): Promise<ApiResponse<GroupBuy>> => {
    const activity = await dbService.getActivityById(id);
    if (!activity) throw new Error('拼团活动不存在');
    return { data: toGroupBuy(activity), success: true };
  },

  // 获取拼团参与者
  getParticipants: async (groupBuyId: string): Promise<ApiResponse<GroupBuyParticipant[]>> => {
    const result = await adminService.list('groupBuyTeams', { activityId: groupBuyId }, { limit: 200 });
    const teams = extractList(result) as GroupBuyTeam[];

    const participants: GroupBuyParticipant[] = [];
    for (const team of teams) {
      for (const member of team.members) {
        participants.push({
          _id: `${team._id}_${member.userId}`,
          groupBuyId: team.activityId,
          userId: member.userId,
          orderId: member.orderId,
          joinedAt: member.joinedAt,
        });
      }
    }

    return { data: participants, success: true };
  },

  // 发起拼团（前端用户操作）
  createGroupBuy: async (courseId: string): Promise<ApiResponse<GroupBuy>> => {
    const activity = await dbService.getActivityByCourseId(courseId);
    if (!activity) throw new Error('该课程暂无拼团活动');

    const team = await dbService.createTeam('current_user', `order_${Date.now()}`, activity._id, '当前用户');
    const updatedActivity = await dbService.getActivityById(activity._id);
    return { data: toGroupBuy(updatedActivity!), success: true };
  },

  // 参与拼团（前端用户操作）
  joinGroupBuy: async (groupBuyId: string): Promise<ApiResponse<GroupBuyParticipant>> => {
    const result = await adminService.list('groupBuyTeams', {
      activityId: groupBuyId,
      status: 'pending',
    }, { limit: 1 });
    const availableTeams = extractList(result) as GroupBuyTeam[];

    if (availableTeams.length === 0) throw new Error('没有可加入的拼团');

    const team = availableTeams[0];
    const joinedTeam = await dbService.joinTeam('current_user', `order_${Date.now()}`, team._id, '当前用户');

    const participant: GroupBuyParticipant = {
      _id: `part_${Date.now()}`,
      groupBuyId,
      userId: 'current_user',
      orderId: `order_${Date.now()}`,
      joinedAt: new Date().toISOString(),
    };

    return { data: participant, success: true };
  },

  // 创建拼团活动（管理员）
  create: async (data: Omit<GroupBuy, '_id' | 'currentCount' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<GroupBuy>> => {
    const activityData = fromGroupBuyCreate(data);
    const created = await dbService.createActivity(activityData);
    return { data: toGroupBuy(created), success: true };
  },

  // 更新拼团活动（管理员）
  update: async (id: string, data: Partial<GroupBuy>): Promise<ApiResponse<GroupBuy>> => {
    const updates: Partial<GroupBuyActivity> = {};
    if (data.title !== undefined) updates.courseTitle = data.title;
    if (data.requiredCount !== undefined) updates.minPeople = data.requiredCount;
    if (data.price !== undefined) updates.groupPrice = data.price;
    if (data.originalPrice !== undefined) updates.originalPrice = data.originalPrice;
    if (data.validFrom !== undefined) updates.startDate = data.validFrom;
    if (data.validTo !== undefined) updates.endDate = data.validTo;
    if (data.status !== undefined) {
      updates.status = data.status === 'expired' || data.status === 'completed' ? 'ended' : data.status;
    }

    await dbService.updateActivity(id, updates);
    const updated = await dbService.getActivityById(id);
    if (!updated) throw new Error('拼团活动不存在');
    return { data: toGroupBuy(updated), success: true };
  },

  // 删除拼团活动（管理员）
  delete: async (id: string): Promise<ApiResponse<void>> => {
    await dbService.deleteActivity(id);
    return { success: true };
  },

  // 结束拼团（管理员）
  endGroupBuy: async (id: string): Promise<ApiResponse<GroupBuy>> => {
    await dbService.updateActivity(id, { status: 'ended' });
    const updated = await dbService.getActivityById(id);
    return { data: toGroupBuy(updated!), success: true };
  },

  // 获取统计
  getStats: async (): Promise<ApiResponse<{
    total: number; active: number; completed: number; expired: number;
    totalParticipants: number; totalSavings: number;
  }>> => {
    try {
      const activities = await dbService.getAllActivities() || [];
      const activityList = Array.isArray(activities) ? activities : [];

      const teamsResult = await adminService.list('groupBuyTeams', {}, { limit: 500 });
      const allTeams = extractList(teamsResult) as GroupBuyTeam[];
      const totalParticipants = allTeams.reduce((sum, t) => sum + (t?.currentPeople || 0), 0);

      const totalSavings = allTeams.reduce((sum, t) => {
        return sum + ((t?.activity?.originalPrice || 0) - (t?.activity?.groupPrice || 0)) * (t?.currentPeople || 0);
      }, 0);

      const active = activityList.filter(a => a?.status === 'active').length;
      const ended = activityList.filter(a => a?.status === 'ended' || a?.status === 'paused').length;
      const successTeams = allTeams.filter(t => t?.status === 'success').length;

      return {
        data: { total: activityList.length, active, completed: successTeams, expired: ended, totalParticipants, totalSavings },
        success: true,
      };
    } catch (error) {
      console.error('获取拼团统计失败:', error);
      return {
        data: { total: 0, active: 0, completed: 0, expired: 0, totalParticipants: 0, totalSavings: 0 },
        success: true,
      };
    }
  },
};
