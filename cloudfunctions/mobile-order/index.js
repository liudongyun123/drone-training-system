/**
 * 移动端订单服务
 * 支持：创建订单、支付、取消、查询等
 */

const cloud = require('tcb-admin-node');

// 初始化云开发
cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

/**
 * 生成订单号
 */
function generateOrderNo() {
  const now = new Date();
  const date = now.toISOString().replace(/[-T:\.]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD${date}${random}`;
}

/**
 * 创建订单
 */
async function createOrder(userId, courseId, couponId = null) {
  // 检查课程是否存在
  const courses = await db.collection('courses')
    .doc(courseId)
    .get();
  
  if (courses.data.length === 0) {
    return { success: false, error: '课程不存在' };
  }
  
  const course = courses.data;
  
  // 检查课程是否免费
  if (course.isFree || course.price === 0) {
    return { success: false, error: '免费课程无需购买' };
  }
  
  // 检查是否已购买
  const existOrders = await db.collection('orders')
    .where({
      userId,
      courseId,
      status: 'paid',
    })
    .limit(1)
    .get();
  
  if (existOrders.data.length > 0) {
    return { success: false, error: '您已购买过该课程' };
  }
  
  // 检查是否有未支付订单
  const unpaidOrders = await db.collection('orders')
    .where({
      userId,
      courseId,
      status: 'pending',
    })
    .limit(1)
    .get();
  
  if (unpaidOrders.data.length > 0) {
    return {
      success: true,
      data: {
        orderId: unpaidOrders.data[0]._id,
        orderNo: unpaidOrders.data[0].orderNo,
        amount: unpaidOrders.data[0].amount,
        expiredAt: unpaidOrders.data[0].expiredAt,
      },
    };
  }
  
  // 计算价格
  let amount = course.price;
  let discountAmount = 0;
  let couponIdUsed = null;
  
  // 检查优惠券
  if (couponId) {
    const coupons = await db.collection('coupons')
      .doc(couponId)
      .get();
    
    if (coupons.data.length > 0) {
      const coupon = coupons.data;
      
      // 检查优惠券是否可用
      if (coupon.userId !== userId) {
        return { success: false, error: '优惠券不可用' };
      }
      
      if (coupon.status !== 'unused') {
        return { success: false, error: '优惠券已使用' };
      }
      
      if (new Date(coupon.expiredAt) < new Date()) {
        return { success: false, error: '优惠券已过期' };
      }
      
      // 计算优惠
      if (coupon.type === 'fixed') {
        discountAmount = coupon.value;
      } else if (coupon.type === 'percent') {
        discountAmount = Math.floor(amount * coupon.value / 100);
      }
      
      amount = Math.max(0, amount - discountAmount);
      couponIdUsed = couponId;
    }
  }
  
  // 创建订单
  const now = new Date();
  const orderNo = generateOrderNo();
  const expiredAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30分钟过期
  
  const order = {
    orderNo,
    userId,
    courseId,
    courseTitle: course.title,
    courseCover: course.cover,
    amount,
    originalAmount: course.price,
    discountAmount,
    couponId: couponIdUsed,
    status: 'pending',
    paymentMethod: null,
    paidAt: null,
    expiredAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  
  const result = await db.collection('orders').add({
    data: order,
  });
  
  return {
    success: true,
    data: {
      orderId: result.id,
      orderNo,
      amount,
      originalAmount: course.price,
      discountAmount,
      expiredAt,
    },
  };
}

/**
 * 获取订单列表
 */
async function getOrderList(userId, params = {}) {
  const {
    page = 1,
    pageSize = 10,
    status = '',
  } = params;
  
  let where = { userId };
  
  if (status) {
    where.status = status;
  }
  
  // 获取总数
  const countResult = await db.collection('orders')
    .where(where)
    .count();
  
  // 获取列表
  const orders = await db.collection('orders')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
  
  return {
    success: true,
    data: {
      list: orders.data.map(order => ({
        _id: order._id,
        orderNo: order.orderNo,
        courseId: order.courseId,
        courseTitle: order.courseTitle,
        courseCover: order.courseCover,
        amount: order.amount,
        originalAmount: order.originalAmount,
        discountAmount: order.discountAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        expiredAt: order.expiredAt,
      })),
      total: countResult.total,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.total / pageSize),
    },
  };
}

/**
 * 获取订单详情
 */
async function getOrderDetail(userId, orderId) {
  const orders = await db.collection('orders')
    .doc(orderId)
    .get();
  
  if (orders.data.length === 0) {
    return { success: false, error: '订单不存在' };
  }
  
  const order = orders.data;
  
  // 检查订单归属
  if (order.userId !== userId) {
    return { success: false, error: '无权查看此订单' };
  }
  
  return {
    success: true,
    data: {
      _id: order._id,
      orderNo: order.orderNo,
      courseId: order.courseId,
      courseTitle: order.courseTitle,
      courseCover: order.courseCover,
      amount: order.amount,
      originalAmount: order.originalAmount,
      discountAmount: order.discountAmount,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      expiredAt: order.expiredAt,
    },
  };
}

/**
 * 模拟支付（演示环境）
 */
async function payOrder(userId, orderId, paymentMethod = 'wechat') {
  // 获取订单
  const orders = await db.collection('orders')
    .doc(orderId)
    .get();
  
  if (orders.data.length === 0) {
    return { success: false, error: '订单不存在' };
  }
  
  const order = orders.data;
  
  // 检查订单归属
  if (order.userId !== userId) {
    return { success: false, error: '无权操作此订单' };
  }
  
  // 检查订单状态
  if (order.status !== 'pending') {
    return { success: false, error: '订单状态不允许支付' };
  }
  
  // 检查是否过期
  if (new Date(order.expiredAt) < new Date()) {
    // 更新订单状态为已取消
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      },
    });
    return { success: false, error: '订单已过期' };
  }
  
  // 模拟支付成功
  const now = new Date().toISOString();
  
  await db.collection('orders').doc(orderId).update({
    data: {
      status: 'paid',
      paymentMethod,
      paidAt: now,
      updatedAt: now,
    },
  });
  
  // 使用优惠券
  if (order.couponId) {
    await db.collection('coupons').doc(order.couponId).update({
      data: {
        status: 'used',
        usedAt: now,
      },
    });
  }
  
  // 增加课程购买人数
  await db.collection('courses').doc(order.courseId).update({
    data: {
      studentCount: _.inc(1),
    },
  });
  
  return {
    success: true,
    data: {
      orderId,
      orderNo: order.orderNo,
      paidAt: now,
    },
  };
}

/**
 * 取消订单
 */
async function cancelOrder(userId, orderId) {
  // 获取订单
  const orders = await db.collection('orders')
    .doc(orderId)
    .get();
  
  if (orders.data.length === 0) {
    return { success: false, error: '订单不存在' };
  }
  
  const order = orders.data;
  
  // 检查订单归属
  if (order.userId !== userId) {
    return { success: false, error: '无权操作此订单' };
  }
  
  // 检查订单状态
  if (order.status !== 'pending') {
    return { success: false, error: '订单状态不允许取消' };
  }
  
  // 取消订单
  await db.collection('orders').doc(orderId).update({
    data: {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    },
  });
  
  // 释放优惠券
  if (order.couponId) {
    await db.collection('coupons').doc(order.couponId).update({
      data: {
        status: 'unused',
      },
    });
  }
  
  return { success: true };
}

/**
 * 获取用户已购课程
 */
async function getMyCourses(userId) {
  const orders = await db.collection('orders')
    .where({
      userId,
      status: 'paid',
    })
    .orderBy('paidAt', 'desc')
    .get();
  
  // 获取课程信息
  const courseIds = orders.data.map(o => o.courseId);
  let coursesMap = {};
  
  if (courseIds.length > 0) {
    const courses = await db.collection('courses')
      .where({
        _id: _.in(courseIds),
      })
      .get();
    
    coursesMap = courses.data.reduce((acc, c) => {
      acc[c._id] = c;
      return acc;
    }, {});
  }
  
  return {
    success: true,
    data: orders.data.map(order => ({
      _id: order._id,
      courseId: order.courseId,
      courseTitle: order.courseTitle,
      courseCover: order.courseCover,
      paidAt: order.paidAt,
      course: coursesMap[order.courseId] ? {
        _id: coursesMap[order.courseId]._id,
        title: coursesMap[order.courseId].title,
        cover: coursesMap[order.courseId].cover,
        category: coursesMap[order.courseId].category,
        level: coursesMap[order.courseId].level,
      } : null,
    })),
  };
}

/**
 * 获取优惠券列表
 */
async function getCoupons(userId) {
  const coupons = await db.collection('coupons')
    .where({
      userId,
      status: 'unused',
      expiredAt: _.gt(new Date().toISOString()),
    })
    .orderBy('createdAt', 'desc')
    .get();
  
  return {
    success: true,
    data: coupons.data.map(coupon => ({
      _id: coupon._id,
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      minAmount: coupon.minAmount,
      expiredAt: coupon.expiredAt,
    })),
  };
}

/**
 * 主入口
 */
exports.main = async (event, context) => {
  const { action, data = {} } = event;
  
  // 从请求头获取用户ID（实际生产应从Token验证获取）
  const userId = data.userId || event.userId;
  
  try {
    let result;
    
    switch (action) {
      case 'createOrder':
        result = await createOrder(userId, data.courseId, data.couponId);
        break;
        
      case 'getOrderList':
        result = await getOrderList(userId, data);
        break;
        
      case 'getOrderDetail':
        result = await getOrderDetail(userId, data.orderId);
        break;
        
      case 'payOrder':
        result = await payOrder(userId, data.orderId, data.paymentMethod);
        break;
        
      case 'cancelOrder':
        result = await cancelOrder(userId, data.orderId);
        break;
        
      case 'getMyCourses':
        result = await getMyCourses(userId);
        break;
        
      case 'getCoupons':
        result = await getCoupons(userId);
        break;
        
      default:
        result = { success: false, error: '未知的操作' };
    }
    
    return result;
  } catch (error) {
    console.error('Mobile Order Error:', error);
    return { success: false, error: error.message };
  }
};
