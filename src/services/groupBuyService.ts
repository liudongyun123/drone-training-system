// ============================================================================
// 拼团服务 - 适配器层（管理后台使用）
// 调用真实的 groupBuy.ts 数据库服务
// ============================================================================
import type { GroupBuy, GroupBuyParticipant, ApiResponse, PaginatedResponse } from '../types';
import { groupBuyService as dbService, type GroupBuyActivity, type GroupBuyTeam } from './groupBuy';

/**
 * 将 GroupBuyActivity（数据库格式）转换为 GroupBuy（管理后台格式）
 */
function toGroupBuy(a: GroupBuyActivity): GroupBuy {
  let status: GroupBuy['status'] = 'active';
  if (a.status === 'ended' || a.status === 'paused') status = 'expired';
  // completed 不在 activity 级别，由 team 拼团成功来驱动

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
// 拼团有效期默认值（小时）
const DEFAULT_GROUP_BUY_DURATION = 48;

function fromGroupBuyCreate(data: Omit<GroupBuy, '_id' | 'currentCount' | 'createdAt' | 'updatedAt'>): Omit<GroupBuyActivity, '_id' | 'activeGroups' | 'createdAt' | 'updatedAt'> {
  let status: GroupBuyActivity['status'] = 'active';
  if (data.status === 'expired') status = 'ended';
  // 'completed' 没有直接对应，映射为 active

  return {
    courseId: data.courseId,
    courseTitle: data.title,
    originalPrice: data.originalPrice,
    groupPrice: data.price,
    minPeople: data.requiredCount,
    maxPeople: data.requiredCount * 2, // 默认最大人数为所需人数的2倍
    duration: (data as any).duration || DEFAULT_GROUP_BUY_DURATION, // 拼团有效时长，默认48小时
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
      let activities = await dbService.getAllActivities() || [];
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
        page: params?.page || 1,
        limit: params?.limit || 10,
      };
    } catch (error) {
      console.error('获取拼团列表失败:', error);
      return {
        data: [],
        total: 0,
        page: params?.page || 1,
        limit: params?.limit || 10,
      };
    }
  },

  // 获取拼团详情
  getDetail: async (id: string): Promise<ApiResponse<GroupBuy>> => {
    const activity = await dbService.getActivityById(id);
    if (!activity) {
      throw new Error('拼团活动不存在');
    }
    return {
      data: toGroupBuy(activity),
      success: true,
    };
  },

  // 获取拼团参与者（通过查询该活动的所有团队获取成员）
  getParticipants: async (groupBuyId: string): Promise<ApiResponse<GroupBuyParticipant[]>> => {
    const db = (await import('@/utils/cloudbase')).app.database();
    const { data: teams } = await db
      .collection('groupBuyTeams')
      .where({ activityId: groupBuyId })
      .get();

    const participants: GroupBuyParticipant[] = [];
    for (const team of teams as GroupBuyTeam[]) {
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

    return {
      data: participants,
      success: true,
    };
  },

  // 发起拼团（前端用户操作）
  createGroupBuy: async (courseId: string): Promise<ApiResponse<GroupBuy>> => {
    // 先查找该课程是否有活跃拼团活动
    const activity = await dbService.getActivityByCourseId(courseId);
    if (!activity) {
      throw new Error('该课程暂无拼团活动');
    }

    // 通过 createTeam 发起拼团
    const team = await dbService.createTeam(
      'current_user',
      `order_${Date.now()}`,
      activity._id,
      '当前用户'
    );

    // 返回活动信息（作为 GroupBuy 格式）
    const updatedActivity = await dbService.getActivityById(activity._id);
    return {
      data: toGroupBuy(updatedActivity!),
      success: true,
    };
  },

  // 参与拼团（前端用户操作）
  joinGroupBuy: async (groupBuyId: string): Promise<ApiResponse<GroupBuyParticipant>> => {
    const db = (await import('@/utils/cloudbase')).app.database();
    const { data: availableTeams } = await db
      .collection('groupBuyTeams')
      .where({
        activityId: groupBuyId,
        status: 'pending',
      })
      .limit(1)
      .get();

    if (availableTeams.length === 0) {
      throw new Error('没有可加入的拼团');
    }

    const team = availableTeams[0] as GroupBuyTeam;
    const joinedTeam = await dbService.joinTeam(
      'current_user',
      `order_${Date.now()}`,
      team._id,
      '当前用户'
    );

    const participant: GroupBuyParticipant = {
      _id: `part_${Date.now()}`,
      groupBuyId,
      userId: 'current_user',
      orderId: `order_${Date.now()}`,
      joinedAt: new Date().toISOString(),
    };

    return {
      data: participant,
      success: true,
    };
  },

  // 创建拼团活动（管理员）
  create: async (data: Omit<GroupBuy, '_id' | 'currentCount' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<GroupBuy>> => {
    const activityData = fromGroupBuyCreate(data);
    const created = await dbService.createActivity(activityData);
    return {
      data: toGroupBuy(created),
      success: true,
    };
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
    if (!updated) {
      throw new Error('拼团活动不存在');
    }

    return {
      data: toGroupBuy(updated),
      success: true,
    };
  },

  // 删除拼团活动（管理员）
  delete: async (id: string): Promise<ApiResponse<void>> => {
    await dbService.deleteActivity(id);
    return {
      success: true,
    };
  },

  // 结束拼团（管理员）
  endGroupBuy: async (id: string): Promise<ApiResponse<GroupBuy>> => {
    await dbService.updateActivity(id, { status: 'ended' });
    const updated = await dbService.getActivityById(id);
    return {
      data: toGroupBuy(updated!),
      success: true,
    };
  },

  // 获取统计
  getStats: async (): Promise<ApiResponse<{
    total: number;
    active: number;
    completed: number;
    expired: number;
    totalParticipants: number;
    totalSavings: number;
  }>> => {
    try {
      const activities = await dbService.getAllActivities() || [];
      const activityList = Array.isArray(activities) ? activities : [];
      const db = (await import('@/utils/cloudbase')).app.database();

      // 获取所有团队统计总参与人数
      const teamsResult = await db.collection('groupBuyTeams').get();
      const allTeams = (teamsResult as any)?.data || teamsResult || [];
      const teamsData = Array.isArray(allTeams) ? allTeams as GroupBuyTeam[] : [];
      const totalParticipants = teamsData.reduce((sum, t) => sum + (t?.currentPeople || 0), 0);

      // 计算总节省金额
      const totalSavings = teamsData.reduce((sum, t) => {
        return sum + ((t?.activity?.originalPrice || 0) - (t?.activity?.groupPrice || 0)) * (t?.currentPeople || 0);
      }, 0);

      const active = activityList.filter(a => a?.status === 'active').length;
      const ended = activityList.filter(a => a?.status === 'ended' || a?.status === 'paused').length;
      const successTeams = teamsData.filter(t => t?.status === 'success').length;

      return {
        data: {
          total: activityList.length,
          active,
          completed: successTeams,
          expired: ended,
          totalParticipants,
          totalSavings,
        },
        success: true,
      };
    } catch (error) {
      console.error('获取拼团统计失败:', error);
      return {
        data: {
          total: 0,
          active: 0,
          completed: 0,
          expired: 0,
          totalParticipants: 0,
          totalSavings: 0,
        },
        success: true,
      };
    }
  },
};
