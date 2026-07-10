// @ts-nocheck
// ============================================================================
// 课程权限服务 - 统一处理课程访问权限
// 业务逻辑：用户注册 -> 购买课程 -> 订单支付 -> 获得课程权限
// ★ phone 为主键（最稳定），userId/openid 为补充
// ★ 统一通过 adminService HTTP 访问
// ============================================================================
import { adminService } from './adminService';
import { useAuthStore } from '@/store/authStore';

export interface CoursePermission {
  courseId: string;
  hasPermission: boolean;
  orderId?: string;
  orderStatus?: string;
  purchaseTime?: string;
}

const extractList = <T>(result: any): T[] => result?.data?.list || result?.data || [];

/**
 * 获取当前用户的认证信息（从 authStore 获取，不再依赖 SDK）
 */
async function getAuthInfo() {
  // 优先从 authStore 获取用户信息
  const authStoreUser = useAuthStore.getState()?.user;
  if (!authStoreUser) return null;

  const phone = authStoreUser.phone || localStorage.getItem('user_phone') || '';
  const userId = authStoreUser.id || authStoreUser.uid || '';
  const openid = authStoreUser._openid || authStoreUser.wxOpenId || authStoreUser.id || '';

  return { phone, userId, openid, user: authStoreUser };
}

// ============================================================================
// 核心权限检查
// ============================================================================

/**
 * 检查用户是否有权访问指定课程
 */
export async function checkCoursePermission(courseId: string): Promise<CoursePermission> {
  try {
    const auth = await getAuthInfo();
    if (!auth) {
      return { courseId, hasPermission: false };
    }

    const { phone, userId, openid } = auth;
    console.log('[CoursePermission] 检查课程权限, courseId:', courseId, 'phone:', phone, 'userId:', userId);

    // ★ 三路查询：phone → userId → openid
    // 1. 先查 course_permissions（新数据用 phone）
    if (phone) {
      const result = await adminService.listWithOps('course_permissions', {
        phone,
        courseId,
        status: { '$in': ['active'] }
      }, { limit: 1 });
      const perms = extractList(result);
      if (perms.length > 0) {
        const perm = perms[0];
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
    const userIds = [userId, openid, useAuthStore.getState()?.user?.id].filter(Boolean);
    for (const uid of userIds) {
      const result = await adminService.listWithOps('course_permissions', {
        userId: uid,
        courseId,
        status: { '$in': ['active'] }
      }, { limit: 1 });
      const perms = extractList(result);
      if (perms.length > 0) {
        const perm = perms[0];
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

    const paidOrdersResult = await adminService.listWithOps('orders', {
      '$and': [
        { '$or': orderConditions },
        { status: { '$in': ['paid', 'completed', 'paid_offline'] } }
      ]
    }, { limit: 50 });
    const paidOrders = extractList(paidOrdersResult);

    const matchedOrder = paidOrders.find((order: any) => {
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
 */
export async function getPurchasedCourseIds(): Promise<string[]> {
  try {
    const auth = await getAuthInfo();
    if (!auth) return [];

    const { phone, userId, openid } = auth;
    const courseIds: string[] = [];

    // 1. 从 course_permissions 查询
    const permConditions: any[] = [];
    if (phone) permConditions.push({ phone });
    if (userId) permConditions.push({ userId });
    if (openid) permConditions.push({ _openid: openid });

    if (permConditions.length > 0) {
      const result = await adminService.listWithOps('course_permissions', {
        '$and': [
          { '$or': permConditions },
          { status: { '$in': ['active'] } }
        ]
      }, { limit: 200 });
      const perms = extractList(result);

      perms.forEach((perm: any) => {
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
        const result = await adminService.listWithOps('orders', {
          '$and': [
            { '$or': orderConditions },
            { status: { '$in': ['paid', 'completed', 'paid_offline'] } }
          ]
        }, { limit: 200 });
        const orders = extractList(result);

        orders.forEach((order: any) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              if (item.courseId && !courseIds.includes(item.courseId)) {
                courseIds.push(item.courseId);
              }
            });
          }
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
 */
export async function getPurchasedCourses(): Promise<Array<{
  course: any;
  order: any;
  permission: CoursePermission;
}>> {
  try {
    const auth = await getAuthInfo();
    if (!auth) return [];

    const { phone, userId, openid } = auth;
    console.log('[CoursePermission] 查询已购课程, userId:', userId, ', openid:', openid, ', phone:', phone);

    // 获取所有已支付订单
    let orders: any[] = [];

    const orderConditions: any[] = [];
    if (phone) orderConditions.push({ phone }, { buyerPhone: phone });
    if (userId) orderConditions.push({ userId }, { userId: openid }, { _openid: userId }, { _openid: openid });

    if (orderConditions.length > 0) {
      try {
        const ordersResult = await adminService.listWithOps('orders', {
          '$and': [
            { '$or': orderConditions },
            { status: { '$in': ['paid', 'completed', 'paid_offline'] } }
          ]
        }, { limit: 200 });
        orders = extractList(ordersResult);
        console.log('[CoursePermission] OR查询找到订单:', orders.length);
      } catch (e) {
        console.log('[CoursePermission] OR查询失败:', e);
      }
    }

    // 如果OR查询没找到，尝试分别查询
    if (orders.length === 0) {
      // 按 phone 查询
      if (phone) {
        try {
          const result = await adminService.listWithOps('orders', {
            phone,
            status: { '$in': ['paid', 'completed', 'paid_offline'] }
          }, { limit: 200 });
          orders = extractList(result);
          if (orders.length > 0) console.log('[CoursePermission] phone查询找到订单:', orders.length);
        } catch (e) {
          console.log('[CoursePermission] phone查询失败');
        }
      }

      // 按 userId 查询
      if (orders.length === 0 && userId) {
        try {
          const result = await adminService.listWithOps('orders', {
            userId,
            status: { '$in': ['paid', 'completed', 'paid_offline'] }
          }, { limit: 200 });
          orders = extractList(result);
          if (orders.length > 0) console.log('[CoursePermission] userId查询找到订单:', orders.length);
        } catch (e) {
          console.log('[CoursePermission] userId查询失败');
        }
      }

      // 按 _openid 查询
      if (orders.length === 0 && openid) {
        try {
          const result = await adminService.listWithOps('orders', {
            _openid: openid,
            status: { '$in': ['paid', 'completed', 'paid_offline'] }
          }, { limit: 200 });
          orders = extractList(result);
          if (orders.length > 0) console.log('[CoursePermission] openid查询找到订单:', orders.length);
        } catch (e) {
          console.log('[CoursePermission] openid查询也失败');
        }
      }
    }

    if (orders.length === 0) {
      console.log('[CoursePermission] 无已支付订单');
      return [];
    }

    // 收集所有课程ID和名称
    const courseIds: string[] = [];
    const courseNames: string[] = [];
    const orderMap = new Map<string, any>();
    const nameOrderMap = new Map<string, any>();

    orders.forEach((order: any) => {
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
      if (order.courseId && !courseIds.includes(order.courseId)) {
        courseIds.push(order.courseId);
        orderMap.set(order.courseId, order);
      }
      if (order.courseName && !courseNames.includes(order.courseName)) {
        courseNames.push(order.courseName);
        nameOrderMap.set(order.courseName, order);
      }
    });

    if (courseIds.length === 0 && courseNames.length === 0) return [];

    // 获取所有课程
    const coursesResult = await adminService.list('courses', {}, { limit: 500 });
    const allCourses = extractList(coursesResult);

    const normalizeName = (name: string) => name.replace(/[\s\-_]/g, '').toLowerCase();

    // 匹配课程
    const matchedCourses = allCourses.filter((course: any) => {
      if (courseIds.includes(course._id)) return true;
      for (const orderCourseId of courseIds) {
        if (course._id.includes(orderCourseId) || orderCourseId.includes(course._id)) return true;
      }
      if (courseNames.length > 0) {
        const courseTitleNorm = normalizeName(course.title || '');
        for (const name of courseNames) {
          const nameNorm = normalizeName(name);
          if (courseTitleNorm.includes(nameNorm) || nameNorm.includes(courseTitleNorm)) return true;
        }
      }
      return false;
    });

    // 合并结果
    const result = matchedCourses.map((course: any) => {
      let matchedOrder: any = null;

      for (const [orderCourseId, order] of orderMap.entries()) {
        if (course._id.includes(orderCourseId) || orderCourseId.includes(course._id)) {
          matchedOrder = order;
          break;
        }
      }

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
      return { allowed: false, reason: '您尚未购买此课程，请先购买后再学习' };
    }

    // 检查课程是否上架
    const res = await adminService.get('courses', courseId);
    const course = res?.data;

    if (!course) return { allowed: false, reason: '课程不存在' };
    if (course.status === 'draft' || course.status === 'offline') {
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
