// ============================================================================
// 拼团服务
// ★ Stage 3 迁移：数据库操作统一走 HTTP → adminService → db-init 云函数
// ============================================================================
import { adminService } from './adminService';

export interface GroupBuyActivity {
  _id: string;
  courseId: string;
  courseTitle: string;
  originalPrice: number;
  groupPrice: number;
  minPeople: number;
  maxPeople: number;
  maxGroups?: number;
  activeGroups: number;
  duration: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'paused' | 'ended';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupBuyTeam {
  _id: string;
  activityId: string;
  activity: GroupBuyActivity;
  leaderId: string;
  courseId: string;
  currentPeople: number;
  requiredPeople: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  expiresAt: string;
  members: GroupBuyMember[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupBuyMember {
  userId: string;
  userName?: string;
  orderId: string;
  joinedAt: string;
  isLeader: boolean;
  price: number;
}

const ACTIVITY_COLLECTION = 'groupBuyActivities';
const TEAM_COLLECTION = 'groupBuyTeams';

const extractList = <T>(result: any): T[] => result?.data?.list || result?.data || [];

export const groupBuyService = {
  /**
   * 获取所有拼团活动（管理员）
   */
  async getAllActivities(): Promise<GroupBuyActivity[]> {
    try {
      console.log('[GroupBuyDB] 开始查询集合:', ACTIVITY_COLLECTION);
      const result = await adminService.list(ACTIVITY_COLLECTION, {}, { limit: 200 });
      const data = extractList<GroupBuyActivity>(result);
      console.log('[GroupBuyDB] 处理后数据:', data.length);
      return data;
    } catch (error) {
      console.error('[GroupBuyDB] getAllActivities 失败:', error);
      return [];
    }
  },

  /**
   * 获取活跃拼团活动
   */
  async getActiveActivities(): Promise<GroupBuyActivity[]> {
    try {
      const now = new Date().toISOString();
      const result = await adminService.listWithOps(ACTIVITY_COLLECTION, {
        status: 'active',
        startDate: { '$lte': now },
        endDate: { '$gte': now },
      }, { limit: 100 });
      return extractList<GroupBuyActivity>(result);
    } catch (error) {
      console.error('[GroupBuyDB] getActiveActivities 失败:', error);
      return [];
    }
  },

  /**
   * 获取课程拼团活动
   */
  async getActivityByCourseId(courseId: string): Promise<GroupBuyActivity | null> {
    try {
      const now = new Date().toISOString();
      const result = await adminService.listWithOps(ACTIVITY_COLLECTION, {
        courseId,
        status: 'active',
        startDate: { '$lte': now },
        endDate: { '$gte': now },
      }, { limit: 1 });
      const list = extractList<GroupBuyActivity>(result);
      return list.length > 0 ? list[0] : null;
    } catch (error) {
      console.error('[GroupBuyDB] getActivityByCourseId 失败:', error);
      return null;
    }
  },

  /**
   * 创建拼团活动（管理员）
   */
  async createActivity(
    activity: Omit<GroupBuyActivity, '_id' | 'activeGroups' | 'createdAt' | 'updatedAt'>
  ): Promise<GroupBuyActivity> {
    try {
      const now = new Date().toISOString();
      const doc = { ...activity, activeGroups: 0, createdAt: now, updatedAt: now };
      const { data: result } = await adminService.add(ACTIVITY_COLLECTION, doc);
      return { _id: result.id, ...doc } as GroupBuyActivity;
    } catch (error) {
      console.error('[GroupBuyDB] createActivity 失败:', error);
      throw error;
    }
  },

  /**
   * 更新拼团活动（管理员）
   */
  async updateActivity(activityId: string, updates: Partial<GroupBuyActivity>): Promise<boolean> {
    try {
      await adminService.update(ACTIVITY_COLLECTION, activityId, { ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      console.error('[GroupBuyDB] updateActivity 失败:', error);
      return false;
    }
  },

  /**
   * 删除拼团活动（管理员）
   */
  async deleteActivity(activityId: string): Promise<boolean> {
    await adminService.delete(ACTIVITY_COLLECTION, activityId);
    return true;
  },

  /**
   * 创建拼团（发起拼团）
   */
  async createTeam(
    userId: string,
    orderId: string,
    activityId: string,
    userName?: string
  ): Promise<GroupBuyTeam> {
    const now = new Date().toISOString();
    
    // 获取活动信息
    const activity = await this.getActivityById(activityId);
    if (!activity) throw new Error('拼团活动不存在');
    if (activity.status !== 'active') throw new Error('拼团活动已结束或暂停');
    
    const current = new Date();
    const start = new Date(activity.startDate);
    const end = new Date(activity.endDate);
    if (current < start || current > end) throw new Error('拼团活动不在有效期内');
    if (activity.maxGroups && activity.activeGroups >= activity.maxGroups) throw new Error('该活动拼团数量已达上限');
    
    // 检查用户是否已有进行中的拼团
    const existingResult = await adminService.list(TEAM_COLLECTION, {
      activityId,
      'members.userId': userId,
      status: 'pending',
    }, { limit: 1 });
    const existingTeam = extractList(existingResult);
    if (existingTeam.length > 0) throw new Error('您已有进行中的拼团，请等待拼团完成');
    
    // 计算过期时间
    const expiresAt = new Date(current.getTime() + activity.duration * 60 * 60 * 1000).toISOString();
    
    // 创建拼团团队
    const team = {
      activityId,
      activity,
      leaderId: userId,
      courseId: activity.courseId,
      currentPeople: 1,
      requiredPeople: activity.minPeople,
      status: 'pending' as const,
      expiresAt,
      members: [{
        userId, userName, orderId, joinedAt: now, isLeader: true, price: activity.groupPrice,
      }],
      createdAt: now,
      updatedAt: now,
    };
    
    const { data: result } = await adminService.add(TEAM_COLLECTION, team);
    
    // 更新活动活跃拼团数
    await adminService.update(ACTIVITY_COLLECTION, activityId, {
      activeGroups: activity.activeGroups + 1,
      updatedAt: now,
    });
    
    return { _id: result.id, ...team } as GroupBuyTeam;
  },

  /**
   * 加入拼团
   */
  async joinTeam(
    userId: string,
    orderId: string,
    teamId: string,
    userName?: string
  ): Promise<GroupBuyTeam> {
    const now = new Date().toISOString();
    
    // 获取拼团团队
    const teamRes = await adminService.get(TEAM_COLLECTION, teamId);
    const team = teamRes?.data as GroupBuyTeam;
    if (!team) throw new Error('拼团不存在');
    if (team.status !== 'pending') throw new Error('拼团已结束，无法加入');
    if (team.expiresAt < now) throw new Error('拼团已过期');
    
    const activity = team.activity;
    if (team.currentPeople >= activity.maxPeople) throw new Error('拼团已满员');
    
    const existingMember = team.members.find(m => m.userId === userId);
    if (existingMember) throw new Error('您已在该拼团中');
    
    // 添加成员
    const newMember = {
      userId, userName, orderId, joinedAt: now, isLeader: false, price: activity.groupPrice,
    };
    
    const updatedMembers = [...team.members, newMember];
    const updatedTeam = {
      members: updatedMembers,
      currentPeople: team.currentPeople + 1,
      updatedAt: now,
    };
    
    await adminService.update(TEAM_COLLECTION, teamId, updatedTeam);
    
    // 检查是否拼团成功
    if (updatedTeam.currentPeople >= updatedTeam.currentPeople) {
      // 使用 requiredPeople 重新计算
      const newPeople = team.currentPeople + 1;
      if (newPeople >= team.requiredPeople) {
        await adminService.update(TEAM_COLLECTION, teamId, { status: 'success', updatedAt: now });
      }
    }
    
    return { ...team, _id: team._id, ...updatedTeam };
  },

  /**
   * 获取拼团团队信息
   */
  async getTeamById(teamId: string): Promise<GroupBuyTeam | null> {
    try {
      const res = await adminService.get(TEAM_COLLECTION, teamId);
      return res?.data as GroupBuyTeam || null;
    } catch (error) {
      console.error('[GroupBuyDB] getTeamById 失败:', error);
      return null;
    }
  },

  /**
   * 获取用户参与的拼团
   */
  async getUserTeams(userId: string): Promise<GroupBuyTeam[]> {
    try {
      const result = await adminService.list(TEAM_COLLECTION, {
        'members.userId': userId,
      }, { limit: 100 });
      return extractList<GroupBuyTeam>(result);
    } catch (error) {
      console.error('[GroupBuyDB] getUserTeams 失败:', error);
      return [];
    }
  },

  /**
   * 获取活动的所有拼团团队
   */
  async getActivityTeams(activityId: string): Promise<GroupBuyTeam[]> {
    try {
      const now = new Date().toISOString();
      const result = await adminService.listWithOps(TEAM_COLLECTION, {
        activityId,
        status: 'pending',
        expiresAt: { '$gte': now },
      }, { limit: 100 });
      return extractList<GroupBuyTeam>(result);
    } catch (error) {
      console.error('[GroupBuyDB] getActivityTeams 失败:', error);
      return [];
    }
  },

  /**
   * 获取可加入的拼团（未满员的进行中拼团）
   */
  async getAvailableTeams(activityId: string): Promise<GroupBuyTeam[]> {
    try {
      const now = new Date().toISOString();
      const result = await adminService.listWithOps(TEAM_COLLECTION, {
        activityId,
        status: 'pending',
        expiresAt: { '$gte': now },
      }, { limit: 100 });
      const teams = extractList<GroupBuyTeam>(result);
      const activity = await this.getActivityById(activityId);
      
      return teams.filter(team => team.currentPeople < (activity?.maxPeople || team.requiredPeople));
    } catch (error) {
      console.error('[GroupBuyDB] getAvailableTeams 失败:', error);
      return [];
    }
  },

  /**
   * 取消拼团（仅团长且未开始拼团时）
   */
  async cancelTeam(teamId: string, userId: string): Promise<boolean> {
    const now = new Date().toISOString();
    
    const team = await this.getTeamById(teamId);
    if (!team) throw new Error('拼团不存在');
    if (team.leaderId !== userId) throw new Error('只有团长可以取消拼团');
    if (team.status !== 'pending' || team.currentPeople > 1) throw new Error('拼团已开始，无法取消');
    
    await adminService.update(TEAM_COLLECTION, teamId, { status: 'cancelled', updatedAt: now });
    
    // 更新活动活跃拼团数
    if (team.activity) {
      await adminService.update(ACTIVITY_COLLECTION, team.activity._id, {
        activeGroups: Math.max(0, team.activity.activeGroups - 1),
        updatedAt: now,
      });
    }
    
    return true;
  },

  /**
   * 获取活动ID
   */
  async getActivityById(activityId: string): Promise<GroupBuyActivity | null> {
    try {
      const res = await adminService.get(ACTIVITY_COLLECTION, activityId);
      return res?.data as GroupBuyActivity || null;
    } catch (error) {
      console.error('[GroupBuyDB] getActivityById 失败:', error);
      return null;
    }
  },

  /**
   * 自动更新过期拼团状态（定时任务）
   */
  async updateExpiredTeams(): Promise<number> {
    try {
      const now = new Date().toISOString();
      
      const expiredResult = await adminService.listWithOps(TEAM_COLLECTION, {
        status: 'pending',
        expiresAt: { '$lt': now },
      }, { limit: 200 });
      const expiredTeams = extractList<GroupBuyTeam>(expiredResult);
      
      let updatedCount = 0;
      for (const team of expiredTeams) {
        await adminService.update(TEAM_COLLECTION, team._id, { status: 'failed', updatedAt: now });
        
        if (team.activity) {
          await adminService.update(ACTIVITY_COLLECTION, team.activity._id, {
            activeGroups: Math.max(0, team.activity.activeGroups - 1),
            updatedAt: now,
          });
        }
        updatedCount++;
      }
      
      return updatedCount;
    } catch (error) {
      console.error('[GroupBuyDB] updateExpiredTeams 失败:', error);
      return 0;
    }
  },

  /**
   * 自动更新过期活动状态（定时任务）
   */
  async updateExpiredActivities(): Promise<number> {
    try {
      const now = new Date().toISOString();
      
      const expiredResult = await adminService.listWithOps(ACTIVITY_COLLECTION, {
        status: 'active',
        endDate: { '$lt': now },
      }, { limit: 100 });
      const expiredActivities = extractList<GroupBuyActivity>(expiredResult);
      
      for (const activity of expiredActivities) {
        await adminService.update(ACTIVITY_COLLECTION, activity._id, { status: 'ended', updatedAt: now });
      }
      
      return expiredActivities.length;
    } catch (error) {
      console.error('[GroupBuyDB] updateExpiredActivities 失败:', error);
      return 0;
    }
  },

  /**
   * 获取拼团统计数据（管理员）
   */
  async getStatistics(activityId: string): Promise<{
    totalTeams: number; successTeams: number; failedTeams: number;
    pendingTeams: number; totalMembers: number; totalRevenue: number;
  }> {
    try {
      const result = await adminService.list(TEAM_COLLECTION, { activityId }, { limit: 500 });
      const teamsData = extractList<GroupBuyTeam>(result);
    
      const successTeams = teamsData.filter(t => t.status === 'success').length;
      const failedTeams = teamsData.filter(t => t.status === 'failed').length;
      const pendingTeams = teamsData.filter(t => t.status === 'pending').length;
      const totalMembers = teamsData.reduce((sum, t) => sum + t.currentPeople, 0);
      const totalRevenue = teamsData
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + t.currentPeople * t.activity.groupPrice, 0);
    
      return { totalTeams: teamsData.length, successTeams, failedTeams, pendingTeams, totalMembers, totalRevenue };
    } catch (error) {
      console.error('[GroupBuyDB] getStatistics 失败:', error);
      return { totalTeams: 0, successTeams: 0, failedTeams: 0, pendingTeams: 0, totalMembers: 0, totalRevenue: 0 };
    }
  },
};

export default groupBuyService;
