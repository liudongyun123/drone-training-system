/**
 * 报名管理云函数
 * 处理线下报名、权限开通、审核等核心业务
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// ==================== 主入口 ====================

exports.main = async (event, context) => {
  const { action, data } = event;
  
  try {
    switch (action) {
      // 学员端 API
      case 'createRegistration':
        return await createRegistration(data);
      case 'getMyRegistrations':
        return await getMyRegistrations(data);
      case 'getRegistrationDetail':
        return await getRegistrationDetail(data);
      
      // 管理端 API
      case 'listRegistrations':
        return await listRegistrations(data);
      case 'reviewRegistration':
        return await reviewRegistration(data);
      case 'assignClass':
        return await assignClass(data);
      case 'updateAccess':
        return await updateAccess(data);
      case 'updatePayment':
        return await updatePayment(data);
      
      // 权限校验
      case 'checkVideoAccess':
        return await checkVideoAccess(data);
      
      default:
        return { code: -1, message: '未知操作' };
    }
  } catch (error) {
    console.error('Registration function error:', error);
    return { code: -1, message: error.message };
  }
};

// ==================== 学员端 API ====================

/**
 * 创建报名申请
 */
async function createRegistration(data) {
  const { 
    studentId, 
    studentName, 
    phone, 
    idCard,
    courseId, 
    source = 'offline',
    remarks 
  } = data;
  
  // 获取课程信息
  const courseRes = await db.collection('courses').doc(courseId).get();
  if (!courseRes.data) {
    return { code: -1, message: '课程不存在' };
  }
  
  const course = courseRes.data;
  
  // 检查是否已报名
  const existRes = await db.collection('registrations')
    .where({
      studentId,
      courseId,
      status: _.nin(['dropped', 'refunded'])
    })
    .count();
  
  if (existRes.total > 0) {
    return { code: -1, message: '您已报名该课程' };
  }
  
  // 创建报名记录
  const registration = {
    studentId,
    studentName,
    phone,
    idCard: idCard || '',
    source,
    
    courseId,
    courseName: course.name,
    
    classId: null,
    className: null,
    
    // 默认不开通视频权限，需管理员审核后开通
    access: {
      videoEnabled: false,
      videoValidFrom: undefined,
      videoValidUntil: undefined,
      offlineMaterials: false,
    },
    
    payment: {
      amount: 0,
      originalAmount: source === 'offline' ? course.price.offline : course.price.online,
      discountAmount: 0,
      status: 'pending',
      method: null,
      paidAt: null,
      transactionId: null,
    },
    
    status: 'pending',
    remarks: remarks || '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const res = await db.collection('registrations').add({ data: registration });
  
  return {
    code: 0,
    message: '报名申请提交成功',
    data: { id: res._id }
  };
}

/**
 * 获取我的报名列表
 */
async function getMyRegistrations(data) {
  const { studentId, page = 1, pageSize = 10 } = data;
  
  const res = await db.collection('registrations')
    .where({ studentId })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
  
  const total = await db.collection('registrations')
    .where({ studentId })
    .count();
  
  return {
    code: 0,
    data: {
      list: res.data,
      total: total.total,
      page,
      pageSize,
    }
  };
}

/**
 * 获取报名详情
 */
async function getRegistrationDetail(data) {
  const { id, studentId } = data;
  
  const res = await db.collection('registrations').doc(id).get();
  
  if (!res.data) {
    return { code: -1, message: '报名记录不存在' };
  }
  
  // 权限检查：只能查看自己的报名
  if (res.data.studentId !== studentId) {
    return { code: -1, message: '无权查看' };
  }
  
  // 获取班级课表
  let classSchedule = null;
  if (res.data.classId) {
    const classRes = await db.collection('classes').doc(res.data.classId).get();
    classSchedule = classRes.data;
  }
  
  // 获取学习进度
  const progressRes = await db.collection('learning_progress')
    .where({ registrationId: id })
    .get();
  
  return {
    code: 0,
    data: {
      ...res.data,
      classSchedule,
      learningProgress: progressRes.data[0] || null,
    }
  };
}

// ==================== 管理端 API ====================

/**
 * 报名列表查询（管理后台）
 */
async function listRegistrations(data) {
  const { 
    status, 
    source, 
    courseId, 
    classId,
    keyword,
    page = 1, 
    pageSize = 20 
  } = data;
  
  let where = {};
  
  if (status) where.status = status;
  if (source) where.source = source;
  if (courseId) where.courseId = courseId;
  if (classId) where.classId = classId;
  
  if (keyword) {
    // 使用正则表达式进行模糊搜索
    const keywordRegex = new RegExp(keyword, 'i');
    where = _.or([
      { studentName: keywordRegex },
      { phone: keywordRegex },
    ]);
  }
  
  const res = await db.collection('registrations')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
  
  const total = await db.collection('registrations').where(where).count();
  
  return {
    code: 0,
    data: {
      list: res.data,
      total: total.total,
      page,
      pageSize,
    }
  };
}

/**
 * 审核报名
 */
async function reviewRegistration(data) {
  const { id, status, reviewerId, comment } = data;
  
  if (!['confirmed', 'dropped'].includes(status)) {
    return { code: -1, message: '无效的审核状态' };
  }
  
  const updateData = {
    status,
    'review.reviewerId': reviewerId,
    'review.reviewedAt': new Date(),
    'review.comment': comment || '',
    updatedAt: new Date(),
  };
  
  await db.collection('registrations').doc(id).update({ data: updateData });
  
  return { code: 0, message: '审核完成' };
}

/**
 * 分配班级
 */
async function assignClass(data) {
  const { id, classId } = data;
  
  // 获取班级信息
  const classRes = await db.collection('classes').doc(classId).get();
  if (!classRes.data) {
    return { code: -1, message: '班级不存在' };
  }
  
  const classData = classRes.data;
  
  // 检查容量
  if (classData.capacity.confirmed >= classData.capacity.max) {
    return { code: -1, message: '班级已满' };
  }
  
  // 更新报名记录
  await db.collection('registrations').doc(id).update({
    data: {
      classId,
      className: classData.name,
      updatedAt: new Date(),
    }
  });
  
  // 更新班级人数
  await db.collection('classes').doc(classId).update({
    data: {
      'capacity.confirmed': _.inc(1),
      updatedAt: new Date(),
    }
  });
  
  return { code: 0, message: '班级分配成功' };
}

/**
 * 更新视频权限
 */
async function updateAccess(data) {
  const { 
    id, 
    videoEnabled, 
    videoValidFrom, 
    videoValidUntil,
    offlineMaterials 
  } = data;
  
  const updateData = {
    'access.videoEnabled': videoEnabled,
    updatedAt: new Date(),
  };
  
  if (videoValidFrom !== undefined) {
    updateData['access.videoValidFrom'] = videoValidFrom ? new Date(videoValidFrom) : _.remove();
  }
  if (videoValidUntil !== undefined) {
    updateData['access.videoValidUntil'] = videoValidUntil ? new Date(videoValidUntil) : _.remove();
  }
  if (offlineMaterials !== undefined) {
    updateData['access.offlineMaterials'] = offlineMaterials;
  }
  
  await db.collection('registrations').doc(id).update({ data: updateData });
  
  return { code: 0, message: '权限更新成功' };
}

/**
 * 更新支付信息
 */
async function updatePayment(data) {
  const { id, amount, status, method, transactionId } = data;
  
  const updateData = {
    'payment.amount': amount,
    'payment.status': status,
    updatedAt: new Date(),
  };
  
  if (method) updateData['payment.method'] = method;
  if (transactionId) updateData['payment.transactionId'] = transactionId;
  if (status === 'paid') {
    updateData['payment.paidAt'] = new Date();
  }
  
  await db.collection('registrations').doc(id).update({ data: updateData });
  
  return { code: 0, message: '支付信息更新成功' };
}

// ==================== 权限校验 API ====================

/**
 * 检查视频观看权限
 */
async function checkVideoAccess(data) {
  const { registrationId, studentId } = data;
  
  const res = await db.collection('registrations').doc(registrationId).get();
  
  if (!res.data) {
    return { code: -1, message: '报名记录不存在' };
  }
  
  const reg = res.data;
  
  // 检查学员身份
  if (reg.studentId !== studentId) {
    return { code: -1, message: '无权访问' };
  }
  
  // 检查视频权限
  if (!reg.access.videoEnabled) {
    return { code: -1, message: '未开通视频观看权限' };
  }
  
  // 检查有效期
  const now = new Date();
  // videoValidFrom 为 null 表示立即生效
  if (reg.access.videoValidFrom) {
    const validFrom = new Date(reg.access.videoValidFrom);
    if (now < validFrom) {
      return { code: -1, message: '视频观看尚未开始' };
    }
  }
  // videoValidUntil 为 null 表示永久有效
  if (reg.access.videoValidUntil) {
    const validUntil = new Date(reg.access.videoValidUntil);
    if (now > validUntil) {
      return { code: -1, message: '视频观看已过期' };
    }
  }
  
  return {
    code: 0,
    message: '有权限',
    data: {
      validUntil: reg.access.videoValidUntil,
    }
  };
}
