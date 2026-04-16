// ============================================================================
// 拼团服务
// ============================================================================
import { app } from '@/utils/cloudbase';

export interface GroupBuyActivity {
  _id: string;
  courseId: string; // 关联课程ID
  courseTitle: string; // 课程标题
  originalPrice: number; // 原价
  groupPrice: number; // 拼团价
  minPeople: number; // 最少拼团人数
  maxPeople: number; // 最多拼团人数
  maxGroups?: number; // 最大拼团数量（可选）
  activeGroups: number; // 当前活跃拼团数
  duration: number; // 拼团时长（小时）
  startDate: string; // 开始时间
  endDate: string; // 结束时间
  status: 'active' | 'paused' | 'ended'; // 活动状态
  description?: string; // 活动描述
  createdAt: string;
  updatedAt: string;
}

export interface GroupBuyTeam {
  _id: string;
  activityId: string; // 活动ID
  activity: GroupBuyActivity; // 活动详情
  leaderId: string; // 团长用户ID
  courseId: string; // 课程ID
  currentPeople: number; // 当前人数
  requiredPeople: number; // 需要人数
  status: 'pending' | 'success' | 'failed' | 'cancelled'; // 拼团状态
  expiresAt: string; // 过期时间
  members: GroupBuyMember[]; // 成员列表
  createdAt: string;
  updatedAt: string;
}

export interface GroupBuyMember {
  userId: string;
  userName?: string;
  orderId: string; // 订单ID
  joinedAt: string;
  isLeader: boolean; // 是否是团长
  price: number; // 支付价格
}

const GROUP_BUY_ACTIVITY_COLLECTION = 'groupBuyActivities';
const GROUP_BUY_TEAM_COLLECTION = 'groupBuyTeams';

export const groupBuyService = {
  /**
   * 获取所有拼团活动（管理员）
   */
  async getAllActivities(): Promise<GroupBuyActivity[]> {
    try {
      console.log('[GroupBuyDB] 开始查询集合:', GROUP_BUY_ACTIVITY_COLLECTION);
      const db = app.database();
      const result = await db.collection(GROUP_BUY_ACTIVITY_COLLECTION).get();
      console.log('[GroupBuyDB] 查询原始结果:', result);
      
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result || [];
      console.log('[GroupBuyDB] 处理后数据:', data);
      
      return Array.isArray(data) ? data as GroupBuyActivity[] : [];
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
      const db = app.database();
      const now = new Date().toISOString();
      const result = await db
        .collection(GROUP_BUY_ACTIVITY_COLLECTION)
        .where({
          status: 'active',
          startDate: db.command.lte(now),
          endDate: db.command.gte(now),
        })
        .get();
      
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result || [];
      return Array.isArray(data) ? data as GroupBuyActivity[] : [];
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
      const db = app.database();
      const now = new Date().toISOString();
      const result = await db
        .collection(GROUP_BUY_ACTIVITY_COLLECTION)
        .where({
          courseId,
          status: 'active',
          startDate: db.command.lte(now),
          endDate: db.command.gte(now),
        })
        .get();
      
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result || [];
      return data?.length > 0 ? (data[0] as GroupBuyActivity) : null;
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
      const db = app.database();
      const now = new Date().toISOString();
      
      const doc = {
        ...activity,
        activeGroups: 0,
        createdAt: now,
        updatedAt: now,
      };
      
      const result = await db.collection(GROUP_BUY_ACTIVITY_COLLECTION).add(doc);
      // 兼容处理不同的返回格式
      const resultData = (result as any)?.data || result || {};
      return { _id: resultData.id || resultData._id, ...doc } as GroupBuyActivity;
    } catch (error) {
      console.error('[GroupBuyDB] createActivity 失败:', error);
      throw error;
    }
  },

  /**
   * 更新拼团活动（管理员）
   */
  async updateActivity(
    activityId: string,
    updates: Partial<GroupBuyActivity>
  ): Promise<boolean> {
    try {
      const db = app.database();
      const now = new Date().toISOString();
      
      await db
        .collection(GROUP_BUY_ACTIVITY_COLLECTION)
        .doc(activityId)
        .update({
          ...updates,
          updatedAt: now,
        });
      
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
    const db = app.database();
    await db.collection(GROUP_BUY_ACTIVITY_COLLECTION).doc(activityId).remove();
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
    const db = app.database();
    const now = new Date().toISOString();
    
    // 获取活动信息
    const activity = await this.getActivityById(activityId);
    if (!activity) {
      throw new Error('拼团活动不存在');
    }
    
    // 检查活动状态
    if (activity.status !== 'active') {
      throw new Error('拼团活动已结束或暂停');
    }
    
    // 检查活动有效期
    const current = new Date();
    const start = new Date(activity.startDate);
    const end = new Date(activity.endDate);
    if (current < start || current > end) {
      throw new Error('拼团活动不在有效期内');
    }
    
    // 检查是否已达最大拼团数量
    if (activity.maxGroups && activity.activeGroups >= activity.maxGroups) {
      throw new Error('该活动拼团数量已达上限');
    }
    
    // 检查用户是否已有进行中的拼团
    const { data: existingTeam } = await db
      .collection(GROUP_BUY_TEAM_COLLECTION)
      .where({
        activityId,
        'members.userId': userId,
        status: 'pending',
      })
      .get();
    
    if (existingTeam.length > 0) {
      throw new Error('您已有进行中的拼团，请等待拼团完成');
    }
    
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
      members: [
        {
          userId,
          userName,
          orderId,
          joinedAt: now,
          isLeader: true,
          price: activity.groupPrice,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    
    const { data: result } = await db.collection(GROUP_BUY_TEAM_COLLECTION).add(team);
    
    // 更新活动活跃拼团数
    await db.collection(GROUP_BUY_ACTIVITY_COLLECTION).doc(activityId).update({
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
    const db = app.database();
    const now = new Date().toISOString();
    
    // 获取拼团团队
    const { data: teamData } = await db
      .collection(GROUP_BUY_TEAM_COLLECTION)
      .doc(teamId)
      .get();
    
    if (!teamData) {
      throw new Error('拼团不存在');
    }
    
    const team = teamData as GroupBuyTeam;
    
    // 检查拼团状态
    if (team.status !== 'pending') {
      throw new Error('拼团已结束，无法加入');
    }
    
    // 检查是否已过期
    if (team.expiresAt < now) {
      throw new Error('拼团已过期');
    }
    
    // 检查是否已满员
    const activity = team.activity;
    if (team.currentPeople >= activity.maxPeople) {
      throw new Error('拼团已满员');
    }
    
    // 检查用户是否已在团中
    const existingMember = team.members.find(m => m.userId === userId);
    if (existingMember) {
      throw new Error('您已在该拼团中');
    }
    
    // 添加成员
    const newMember = {
      userId,
      userName,
      orderId,
      joinedAt: now,
      isLeader: false,
      price: activity.groupPrice,
    };
    
    const updatedMembers = [...team.members, newMember];
    const updatedTeam = {
      ...team,
      currentPeople: team.currentPeople + 1,
      members: updatedMembers,
      updatedAt: now,
    };
    
    await db.collection(GROUP_BUY_TEAM_COLLECTION).doc(teamId).update(updatedTeam);
    
    // 检查是否拼团成功
    if (updatedTeam.currentPeople >= updatedTeam.requiredPeople) {
      await db.collection(GROUP_BUY_TEAM_COLLECTION).doc(teamId).update({
        status: 'success',
        updatedAt: now,
      });
    }
    
    return { ...updatedTeam, _id: team._id };
  },

  /**
   * 获取拼团团队信息
   */
  async getTeamById(teamId: string): Promise<GroupBuyTeam | null> {
    try {
      const db = app.database();
      const result = await db.collection(GROUP_BUY_TEAM_COLLECTION).doc(teamId).get();
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result;
      return data ? (data as GroupBuyTeam) : null;
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
      const db = app.database();
      const result = await db
        .collection(GROUP_BUY_TEAM_COLLECTION)
        .where({
          'members.userId': userId,
        })
        .get();
      
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result || [];
      return Array.isArray(data) ? data as GroupBuyTeam[] : [];
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
      const db = app.database();
      const now = new Date().toISOString();
      const result = await db
        .collection(GROUP_BUY_TEAM_COLLECTION)
        .where({
          activityId,
          status: 'pending',
          expiresAt: db.command.gte(now),
        })
        .get();
      
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result || [];
      return Array.isArray(data) ? data as GroupBuyTeam[] : [];
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
      const db = app.database();
      const now = new Date().toISOString();
      const result = await db
        .collection(GROUP_BUY_TEAM_COLLECTION)
        .where({
          activityId,
          status: 'pending',
          expiresAt: db.command.gte(now),
        })
        .get();
      
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result || [];
      const teams = Array.isArray(data) ? data as GroupBuyTeam[] : [];
      const activity = await this.getActivityById(activityId);
      
      // 过滤出未满员的团队
      return teams.filter(
        team => team.currentPeople < (activity?.maxPeople || team.requiredPeople)
      );
    } catch (error) {
      console.error('[GroupBuyDB] getAvailableTeams 失败:', error);
      return [];
    }
  },

  /**
   * 取消拼团（仅团长且未开始拼团时）
   */
  async cancelTeam(teamId: string, userId: string): Promise<boolean> {
    const db = app.database();
    const now = new Date().toISOString();
    
    const team = await this.getTeamById(teamId);
    if (!team) {
      throw new Error('拼团不存在');
    }
    
    // 只有团长可以取消
    if (team.leaderId !== userId) {
      throw new Error('只有团长可以取消拼团');
    }
    
    // 只有待处理状态且只有团长一人时可以取消
    if (team.status !== 'pending' || team.currentPeople > 1) {
      throw new Error('拼团已开始，无法取消');
    }
    
    await db.collection(GROUP_BUY_TEAM_COLLECTION).doc(teamId).update({
      status: 'cancelled',
      updatedAt: now,
    });
    
    // 更新活动活跃拼团数
    if (team.activity) {
      await db.collection(GROUP_BUY_ACTIVITY_COLLECTION).doc(team.activity._id).update({
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
      const db = app.database();
      const result = await db.collection(GROUP_BUY_ACTIVITY_COLLECTION).doc(activityId).get();
      // 兼容处理不同的返回格式
      const data = (result as any)?.data || result;
      return data ? (data as GroupBuyActivity) : null;
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
      const db = app.database();
      const now = new Date().toISOString();
      
      // 获取所有过期的待处理拼团
      const expiredResult = await db
        .collection(GROUP_BUY_TEAM_COLLECTION)
        .where({
          status: 'pending',
          expiresAt: db.command.lt(now),
        })
        .get();
      
      // 兼容处理不同的返回格式
      const expiredTeams = (expiredResult as any)?.data || expiredResult || [];
      
      let updatedCount = 0;
      
      for (const team of expiredTeams) {
        const teamData = team as GroupBuyTeam;
        
        // 标记为失败
        await db.collection(GROUP_BUY_TEAM_COLLECTION).doc(teamData._id).update({
          status: 'failed',
          updatedAt: now,
        });
        
        // 更新活动活跃拼团数
        if (teamData.activity) {
          await db.collection(GROUP_BUY_ACTIVITY_COLLECTION).doc(teamData.activity._id).update({
            activeGroups: Math.max(0, teamData.activity.activeGroups - 1),
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
      const db = app.database();
      const now = new Date().toISOString();
      
      // 更新已结束的活动
      const expiredResult = await db
        .collection(GROUP_BUY_ACTIVITY_COLLECTION)
        .where({
          status: 'active',
          endDate: db.command.lt(now),
        })
        .get();
      
      // 兼容处理不同的返回格式
      const expiredActivities = (expiredResult as any)?.data || expiredResult || [];
      
      for (const activity of expiredActivities) {
        await db
          .collection(GROUP_BUY_ACTIVITY_COLLECTION)
          .doc(activity._id)
          .update({
            status: 'ended',
            updatedAt: now,
          });
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
    totalTeams: number;
    successTeams: number;
    failedTeams: number;
    pendingTeams: number;
    totalMembers: number;
    totalRevenue: number;
  }> {
    try {
      const db = app.database();
      const result = await db
        .collection(GROUP_BUY_TEAM_COLLECTION)
        .where({ activityId })
        .get();
      
      // 兼容处理不同的返回格式
      const teams = (result as any)?.data || result || [];
      const teamsData = Array.isArray(teams) ? teams as GroupBuyTeam[] : [];
    
    const successTeams = teamsData.filter(t => t.status === 'success').length;
    const failedTeams = teamsData.filter(t => t.status === 'failed').length;
    const pendingTeams = teamsData.filter(t => t.status === 'pending').length;
    const totalMembers = teamsData.reduce((sum, t) => sum + t.currentPeople, 0);
    const totalRevenue = teamsData
      .filter(t => t.status === 'success')
      .reduce((sum, t) => sum + t.currentPeople * t.activity.groupPrice, 0);
    
    return {
      totalTeams: teamsData.length,
      successTeams,
      failedTeams,
      pendingTeams,
      totalMembers,
      totalRevenue,
    };
    } catch (error) {
      console.error('[GroupBuyDB] getStatistics 失败:', error);
      return {
        totalTeams: 0,
        successTeams: 0,
        failedTeams: 0,
        pendingTeams: 0,
        totalMembers: 0,
        totalRevenue: 0,
      };
    }
  },
};

export default groupBuyService;
