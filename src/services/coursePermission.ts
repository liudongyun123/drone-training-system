// ============================================================================
// 课程权限服务 - 统一处理课程访问权限
// 业务逻辑：用户注册 -> 购买课程 -> 订单支付 -> 获得课程权限
// ★ phone 为主键（最稳定），userId/openid 为补充
// ============================================================================
import { app } from '@/utils/cloudbase';
import { authService } from './cloudBaseService';
import { useAuthStore } from '@/store/authStore';

export interface CoursePermission {
  courseId: string;
  hasPermission: boolean;
  orderId?: string;
  orderStatus?: string;
  purchaseTime?: string;
}

// 获取数据库实例
const getAuthDb = () => {
  const db = app.database();
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db;
};

// ============================================================================
// 核心权限检查
// ============================================================================

/**
 * 检查用户是否有权访问指定课程
 * @param courseId 课程ID
 * @returns 权限信息
 */
export async function checkCoursePermission(courseId: string): Promise<CoursePermission> {
  try {
    const user = await authService.getCurrentUser();
    if (!user) {
      return { courseId, hasPermission: false };
    }

    // ★ phone 优先（从 authStore 或 localStorage 获取）
    const authStoreUser = useAuthStore.getState()?.user;
    const phone = authStoreUser?.phone || localStorage.getItem('user_phone') || user?.phone;
    const userId = user.uid;
    const openid = (user as any)._openid || user.uid;

    console.log('[CoursePermission] 检查课程权限, courseId:', courseId, 'phone:', phone, 'userId:', userId);

    const db = getAuthDb();
    const _ = db.command;

    // ★ 三路查询：phone → userId → openid
    // 1. 先查 course_permissions（新数据用 phone）
    if (phone) {
      const permByPhone = await db.collection('course_permissions').where({
        phone: phone,
        courseId: courseId,
        status: _.in(['active'])
      }).get();
      if (permByPhone.data && permByPhone.data.length > 0) {
        const perm = permByPhone.data[0];
        console.log('[CoursePermission] 通过 phone 找到权限记录:', perm._id);
        return {
          courseId,
          hasPermission: true,
          orderId: perm.orderId,
          orderStatus: 'paid',
          purchaseTime: perm.grantedAt || perm.createdAt
        };
      }
    }

    // 2. 查 userId（旧数据）
    const userIds = [userId, openid, authStoreUser?.id];
    for (const uid of userIds) {
      if (!uid) continue;
      const permByUid = await db.collection('course_permissions').where({
        userId: uid,
        courseId: courseId,
        status: _.in(['active'])
      }).get();
      if (permByUid.data && permByUid.data.length > 0) {
        const perm = permByUid.data[0];
        console.log('[CoursePermission] 通过 userId 找到权限记录:', perm._id);
        return {
          courseId,
          hasPermission: true,
          orderId: perm.orderId,
          orderStatus: 'paid',
          purchaseTime: perm.grantedAt || perm.createdAt
        };
      }
    }

    // 3. 兜底：直接查已支付订单
    const orderConditions: any[] = [];
    if (phone) orderConditions.push({ phone });
    if (userId) orderConditions.push({ userId });
    if (openid) orderConditions.push({ _openid: openid });

    if (orderConditions.length === 0) {
      console.log('[CoursePermission] 无查询条件，返回无权限');
      return { courseId, hasPermission: false };
    }

    const paidOrders = await db.collection('orders').where(
      _.or(orderConditions)
    ).and({
      status: _.in(['paid', 'completed', 'paid_offline'])
    }).get();

    const matchedOrder = paidOrders.data?.find((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        return order.items.some((item: any) => item.courseId === courseId);
      }
      return order.courseId === courseId;
    });

    if (matchedOrder) {
      console.log('[CoursePermission] 通过订单兜底找到:', matchedOrder._id);
      return {
        courseId,
        hasPermission: true,
        orderId: matchedOrder._id,
        orderStatus: matchedOrder.status,
        purchaseTime: matchedOrder.paidAt || matchedOrder.createdAt
      };
    }

    console.log('[CoursePermission] 未找到权限，无权限');
    return { courseId, hasPermission: false };
  } catch (error) {
    console.error('[CoursePermission] 检查权限失败:', error);
    return { courseId, hasPermission: false };
  }
}

/**
 * 获取用户的所有已购课程ID列表
 * @returns 课程ID数组
 */
export async function getPurchasedCourseIds(): Promise<string[]> {
  try {
    const user = await authService.getCurrentUser();
    if (!user) {
      return [];
    }

    // ★ phone 优先
    const authStoreUser = useAuthStore.getState()?.user;
    const phone = authStoreUser?.phone || localStorage.getItem('user_phone') || user?.phone;
    const userId = user.uid;
    const openid = (user as any)._openid || user.uid;

    const db = getAuthDb();
    const _ = db.command;

    const courseIds: string[] = [];

    // 1. 从 course_permissions 查询
    const permConditions: any[] = [];
    if (phone) permConditions.push({ phone });
    if (userId) permConditions.push({ userId });
    if (openid) permConditions.push({ _openid: openid });

    if (permConditions.length > 0) {
      const perms = await db.collection('course_permissions').where(
        _.or(permConditions)
      ).and({
        status: _.in(['active'])
      }).get();

      perms.data?.forEach((perm: any) => {
        const cid = perm.courseId || perm.targetId;
        if (cid && !courseIds.includes(cid)) {
          courseIds.push(cid);
        }
      });
    }

    // 2. 兜底：从已支付订单查询
    if (courseIds.length === 0) {
      const orderConditions: any[] = [];
      if (phone) orderConditions.push({ phone });
      if (userId) orderConditions.push({ userId });
      if (openid) orderConditions.push({ _openid: openid });

      if (orderConditions.length > 0) {
        const orders = await db.collection('orders').where(
          _.or(orderConditions)
        ).and({
          status: _.in(['paid', 'completed', 'paid_offline'])
        }).get();

        orders.data?.forEach((order: any) => {
          // 新格式
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              if (item.courseId && !courseIds.includes(item.courseId)) {
                courseIds.push(item.courseId);
              }
            });
          }
          // 旧格式
          if (order.courseId && !courseIds.includes(order.courseId)) {
            courseIds.push(order.courseId);
          }
        });
      }
    }

    console.log('[CoursePermission] 用户已购课程IDs:', courseIds);
    return courseIds;
  } catch (error) {
    console.error('[CoursePermission] 获取已购课程失败:', error);
    return [];
  }
}

/**
 * 获取用户的已购课程详情（包含课程信息和订单信息）
 * 支持根据 courseId 或课程名称进行匹配
 * @returns 包含课程和订单信息的列表
 */
export async function getPurchasedCourses(): Promise<Array<{
  course: any;
  order: any;
  permission: CoursePermission;
}>> {
  try {
    const user = await authService.getCurrentUser();
    if (!user) {
      return [];
    }

    // ★ phone 优先
    const authStoreUser = useAuthStore.getState()?.user;
    const phone = authStoreUser?.phone || localStorage.getItem('user_phone') || user?.phone;
    const userId = user.uid;
    const openid = (user as any)._openid || user.uid;

    const db = getAuthDb();

    console.log('[CoursePermission] 查询已购课程, userId:', userId, ', openid:', openid, ', phone:', phone);

    // 获取所有已支付订单（尝试多种查询方式）
    let orders: any = { data: [] };

    const orderConditions: any[] = [];
    if (phone) orderConditions.push({ phone }, { buyerPhone: phone });
    if (userId) orderConditions.push({ userId }, { userId: openid }, { _openid: userId }, { _openid: openid });

    if (orderConditions.length > 0) {
      try {
        orders = await db.collection('orders').where(
          db.command.or(orderConditions)
        ).and({
          status: db.command.in(['paid', 'completed', 'paid_offline'])
        }).get();

        console.log('[CoursePermission] OR查询找到订单:', orders.data?.length || 0);
      } catch (e) {
        console.log('[CoursePermission] OR查询失败:', e);
      }
    }

    // 如果OR查询没找到，尝试分别查询
    if (!orders.data || orders.data.length === 0) {
      // 方式2: 仅按 phone 查询
      if (phone) {
        try {
          const ordersByPhone = await db.collection('orders').where({
            phone: phone,
            status: db.command.in(['paid', 'completed', 'paid_offline'])
          }).get();

          if (ordersByPhone.data && ordersByPhone.data.length > 0) {
            orders.data = ordersByPhone.data;
            console.log('[CoursePermission] phone查询找到订单:', orders.data.length);
          }
        } catch (e) {
          console.log('[CoursePermission] phone查询失败');
        }
      }

      // 方式3: 仅按 userId 查询
      if (!orders.data || orders.data.length === 0) {
        if (userId) {
          try {
            const ordersByUserId = await db.collection('orders').where({
              userId: userId,
              status: db.command.in(['paid', 'completed', 'paid_offline'])
            }).get();

            if (ordersByUserId.data && ordersByUserId.data.length > 0) {
              orders.data = ordersByUserId.data;
              console.log('[CoursePermission] userId查询找到订单:', orders.data.length);
            }
          } catch (e) {
            console.log('[CoursePermission] userId查询失败');
          }
        }
      }

      // 方式4: 仅按 _openid 查询
      if (!orders.data || orders.data.length === 0) {
        if (openid) {
          try {
            const ordersByOpenid = await db.collection('orders').where({
              _openid: openid,
              status: db.command.in(['paid', 'completed', 'paid_offline'])
            }).get();

            if (ordersByOpenid.data && ordersByOpenid.data.length > 0) {
              orders.data = ordersByOpenid.data;
              console.log('[CoursePermission] openid查询找到订单:', orders.data.length);
            }
          } catch (e) {
            console.log('[CoursePermission] openid查询也失败');
          }
        }
      }
    }

    if (!orders.data || orders.data.length === 0) {
      console.log('[CoursePermission] 无已支付订单');
      return [];
    }

    // 收集所有课程ID和名称
    const courseIds: string[] = [];
    const courseNames: string[] = [];
    const orderMap = new Map<string, any>(); // courseId -> order
    const nameOrderMap = new Map<string, any>(); // courseName -> order

    orders.data.forEach((order: any) => {
      // 新格式：items 数组
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.courseId && !courseIds.includes(item.courseId)) {
            courseIds.push(item.courseId);
            orderMap.set(item.courseId, order);
          }
          if (item.title && !courseNames.includes(item.title)) {
            courseNames.push(item.title);
            nameOrderMap.set(item.title, order);
          }
        });
      }
      // 旧格式：直接 courseId/courseName 字段
      if (order.courseId && !courseIds.includes(order.courseId)) {
        courseIds.push(order.courseId);
        orderMap.set(order.courseId, order);
      }
      if (order.courseName && !courseNames.includes(order.courseName)) {
        courseNames.push(order.courseName);
        nameOrderMap.set(order.courseName, order);
      }
    });

    if (courseIds.length === 0 && courseNames.length === 0) {
      return [];
    }

    // 获取所有课程
    const { data: allCourses } = await db.collection('courses').get();

    // 工具函数：标准化名称用于比较
    const normalizeName = (name: string) => name.replace(/[\s\-_]/g, '').toLowerCase();

    // 匹配课程
    const matchedCourses = allCourses.filter((course: any) => {
      // 方式1: ID 精确匹配
      if (courseIds.includes(course._id)) {
        return true;
      }
      // 方式2: ID 部分匹配 (course_1 -> course_001)
      for (const orderCourseId of courseIds) {
        if (course._id.includes(orderCourseId) || orderCourseId.includes(course._id)) {
          return true;
        }
      }
      // 方式3: 名称模糊匹配
      if (courseNames.length > 0) {
        const courseTitleNorm = normalizeName(course.title || '');
        for (const name of courseNames) {
          const nameNorm = normalizeName(name);
          if (courseTitleNorm.includes(nameNorm) || nameNorm.includes(courseTitleNorm)) {
            return true;
          }
        }
      }
      return false;
    });

    // 合并结果
    const result = matchedCourses.map((course: any) => {
      // 找到对应的订单
      let matchedOrder: any = null;

      // 先按ID找
      for (const [orderCourseId, order] of orderMap.entries()) {
        if (course._id.includes(orderCourseId) || orderCourseId.includes(course._id)) {
          matchedOrder = order;
          break;
        }
      }

      // 如果没找到，按名称找
      if (!matchedOrder && courseNames.length > 0) {
        const courseTitleNorm = normalizeName(course.title || '');
        for (const [name, order] of nameOrderMap.entries()) {
          const nameNorm = normalizeName(name);
          if (courseTitleNorm.includes(nameNorm) || nameNorm.includes(courseTitleNorm)) {
            matchedOrder = order;
            break;
          }
        }
      }

      return {
        course,
        order: matchedOrder,
        permission: {
          courseId: course._id,
          hasPermission: true,
          orderId: matchedOrder?._id,
          orderStatus: matchedOrder?.status,
          purchaseTime: matchedOrder?.paidAt || matchedOrder?.createdAt
        }
      };
    });

    console.log('[CoursePermission] 获取到已购课程:', result.length, '门');
    return result;
  } catch (error) {
    console.error('[CoursePermission] 获取已购课程失败:', error);
    return [];
  }
}

/**
 * 检查用户是否可以学习指定课程（权限 + 课程状态）
 */
export async function canLearnCourse(courseId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  try {
    const permission = await checkCoursePermission(courseId);

    if (!permission.hasPermission) {
      return {
        allowed: false,
        reason: '您尚未购买此课程，请先购买后再学习'
      };
    }

    // 检查课程是否上架
    const db = getAuthDb();
    const course = await db.collection('courses').doc(courseId).get();

    if (!course.data) {
      return { allowed: false, reason: '课程不存在' };
    }

    if (course.data.status === 'draft' || course.data.status === 'offline') {
      return { allowed: false, reason: '课程已下架' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[CoursePermission] 检查学习权限失败:', error);
    return { allowed: false, reason: '检查权限失败，请重试' };
  }
}

export default {
  checkCoursePermission,
  getPurchasedCourseIds,
  getPurchasedCourses,
  canLearnCourse
};