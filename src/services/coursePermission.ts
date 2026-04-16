// ============================================================================
// 课程权限服务 - 统一处理课程访问权限
// 业务逻辑：用户注册 -> 购买课程 -> 订单支付 -> 获得课程权限
// ============================================================================
import { app } from '@/utils/cloudbase';
import { authService } from './cloudBaseService';

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

    const userId = user.uid;
    const openid = (user as any)._openid || user.uid;

    console.log('[CoursePermission] 检查课程权限, courseId:', courseId, 'userId:', userId);

    // 查询用户在该课程上的已支付订单
    const db = getAuthDb();
    
    // 方式1: 新格式 - items 数组
    const ordersWithItems = await db.collection('orders').where({
      userId: userId,
      status: db.command.in(['paid', 'completed'])
    }).get();

    // 筛选包含该课程的订单
    const paidOrder = ordersWithItems.data?.find((order: any) => {
      // 新格式：items 数组
      if (order.items && Array.isArray(order.items)) {
        return order.items.some((item: any) => item.courseId === courseId);
      }
      // 旧格式：courseId 字段
      if (order.courseId === courseId) {
        return true;
      }
      return false;
    });

    if (paidOrder) {
      console.log('[CoursePermission] 找到已支付订单:', paidOrder._id);
      return {
        courseId,
        hasPermission: true,
        orderId: paidOrder._id,
        orderStatus: paidOrder.status,
        purchaseTime: paidOrder.paidAt || paidOrder.createdAt
      };
    }

    // 方式2: 旧格式 - 直接 courseId 字段
    const oldFormatOrders = await db.collection('orders').where({
      userId: userId,
      courseId: courseId,
      status: db.command.in(['paid', 'completed', 'paid_offline'])
    }).get();

    if (oldFormatOrders.data && oldFormatOrders.data.length > 0) {
      const order = oldFormatOrders.data[0];
      console.log('[CoursePermission] 旧格式订单匹配:', order._id);
      return {
        courseId,
        hasPermission: true,
        orderId: order._id,
        orderStatus: order.status,
        purchaseTime: order.paidAt || order.createdAt
      };
    }

    console.log('[CoursePermission] 未找到已支付订单，无权限');
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

    const userId = user.uid;
    const db = getAuthDb();

    // 查询用户的已支付订单
    const orders = await db.collection('orders').where({
      userId: userId,
      status: db.command.in(['paid', 'completed', 'paid_offline'])
    }).get();

    const courseIds: string[] = [];

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

    const userId = user.uid;
    const openid = (user as any)._openid || user.uid;
    const db = getAuthDb();

    console.log('[CoursePermission] 查询已购课程, userId:', userId, ', openid:', openid);

    // 获取用户手机号
    const phone = user?.phone;
    
    // 获取所有已支付订单（尝试多种查询方式）
    let orders: any = { data: [] };
    
    // 方式1: 使用 OR 查询同时匹配 userId、_openid 和 phone
    try {
      orders = await db.collection('orders').where(
        db.command.or(
          { userId: userId },
          { userId: openid },
          { _openid: userId },
          { _openid: openid },
          { phone: phone },
          { buyerPhone: phone }
        )
      ).and({
        status: db.command.in(['paid', 'completed', 'paid_offline'])
      }).get();
      
      console.log('[CoursePermission] OR查询找到订单:', orders.data?.length || 0);
    } catch (e) {
      console.log('[CoursePermission] OR查询失败:', e);
    }
    
    // 如果OR查询没找到，尝试分别查询
    if (!orders.data || orders.data.length === 0) {
      try {
        // 方式2: 仅按 userId 查询
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
      
      // 方式3: 仅按 _openid 查询
      if (!orders.data || orders.data.length === 0) {
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
