/**
 * 班级管理云函数
 * 处理班级CRUD、排课、调课等业务
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'createClass':
        return await createClass(data);
      case 'updateClass':
        return await updateClass(data);
      case 'deleteClass':
        return await deleteClass(data);
      case 'getClassDetail':
        return await getClassDetail(data);
      case 'listClasses':
        return await listClasses(data);
      
      case 'addSchedule':
        return await addSchedule(data);
      case 'updateSchedule':
        return await updateSchedule(data);
      case 'adjustSchedule':
        return await adjustSchedule(data);
      case 'cancelSchedule':
        return await cancelSchedule(data);
      
      case 'getClassStudents':
        return await getClassStudents(data);
      case 'getTeacherSchedule':
        return await getTeacherSchedule(data);
      
      default:
        return { code: -1, message: '未知操作' };
    }
  } catch (error) {
    console.error('Class function error:', error);
    return { code: -1, message: error.message };
  }
};

/**
 * 创建班级
 */
async function createClass(data) {
  const {
    courseId,
    name,
    capacity,
    startDate,
    endDate,
    enrollmentDeadline,
    schedule = [],
  } = data;
  
  // 获取课程信息
  const courseRes = await db.collection('courses').doc(courseId).get();
  if (!courseRes.data) {
    return { code: -1, message: '课程不存在' };
  }
  
  const classData = {
    courseId,
    name,
    schedule: schedule.map(s => ({
      ...s,
      date: new Date(s.date),
      status: 'scheduled',
    })),
    capacity: {
      max: capacity,
      enrolled: 0,
      confirmed: 0,
    },
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    enrollmentDeadline: new Date(enrollmentDeadline),
    status: 'enrolling',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const res = await db.collection('classes').add({ data: classData });
  
  return {
    code: 0,
    message: '班级创建成功',
    data: { id: res._id }
  };
}

/**
 * 更新班级
 */
async function updateClass(data) {
  const { id, ...updateFields } = data;
  
  const updateData = {
    ...updateFields,
    updatedAt: new Date(),
  };
  
  // 转换日期字段
  if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
  if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
  if (updateData.enrollmentDeadline) {
    updateData.enrollmentDeadline = new Date(updateData.enrollmentDeadline);
  }
  
  await db.collection('classes').doc(id).update({ data: updateData });
  
  return { code: 0, message: '班级更新成功' };
}

/**
 * 删除班级
 */
async function deleteClass(data) {
  const { id } = data;
  
  // 检查是否有关联的报名
  const regCount = await db.collection('registrations')
    .where({ classId: id })
    .count();
  
  if (regCount.total > 0) {
    return { code: -1, message: '该班级已有学员报名，无法删除' };
  }
  
  await db.collection('classes').doc(id).remove();
  
  return { code: 0, message: '班级删除成功' };
}

/**
 * 获取班级详情
 */
async function getClassDetail(data) {
  const { id } = data;
  
  const classRes = await db.collection('classes').doc(id).get();
  if (!classRes.data) {
    return { code: -1, message: '班级不存在' };
  }
  
  // 获取课程信息
  const courseRes = await db.collection('courses')
    .doc(classRes.data.courseId)
    .get();
  
  // 获取学员列表
  const studentsRes = await db.collection('registrations')
    .where({ classId: id })
    .field({ studentId: true, studentName: true, phone: true, status: true })
    .get();
  
  return {
    code: 0,
    data: {
      ...classRes.data,
      course: courseRes.data,
      students: studentsRes.data,
    }
  };
}

/**
 * 班级列表查询
 */
async function listClasses(data) {
  const { 
    courseId, 
    status, 
    teacherId,
    startDateFrom,
    startDateTo,
    page = 1, 
    pageSize = 20 
  } = data;
  
  let where = {};
  
  if (courseId) where.courseId = courseId;
  if (status) where.status = status;
  if (startDateFrom || startDateTo) {
    where.startDate = {};
    if (startDateFrom) where.startDate.$gte = new Date(startDateFrom);
    if (startDateTo) where.startDate.$lte = new Date(startDateTo);
  }
  
  // 教师筛选：查询包含该教师的班级
  // 注意：由于 schedule 是数组，无法在 where 中直接筛选数组内对象字段
  // 这里使用先查询再在内存中过滤的方式，适合中小数据量场景
  let query = db.collection('classes').where(where);
  
  const res = await query
    .orderBy('startDate', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize * (teacherId ? 2 : 1)) // 如果有过滤，多取一些数据
    .get();
  
  // 如果指定了教师，过滤结果
  let list = res.data;
  if (teacherId) {
    list = list.filter(cls => 
      cls.schedule && cls.schedule.some(s => s.teacherId === teacherId)
    );
    // 分页处理
    list = list.slice(0, pageSize);
  }
  
  const total = await db.collection('classes').where(where).count();
  
  return {
    code: 0,
    data: {
      list,
      total: total.total,
      page,
      pageSize,
    }
  };
}

/**
 * 添加课表
 */
async function addSchedule(data) {
  const { classId, scheduleItem } = data;
  
  const newSchedule = {
    ...scheduleItem,
    date: new Date(scheduleItem.date),
    status: 'scheduled',
  };
  
  await db.collection('classes').doc(classId).update({
    data: {
      schedule: _.push(newSchedule),
      updatedAt: new Date(),
    }
  });
  
  return { code: 0, message: '课表添加成功' };
}

/**
 * 更新课表
 */
async function updateSchedule(data) {
  const { classId, scheduleIndex, scheduleItem } = data;
  
  const classRes = await db.collection('classes').doc(classId).get();
  if (!classRes.data) {
    return { code: -1, message: '班级不存在' };
  }
  
  const schedule = classRes.data.schedule;
  if (scheduleIndex < 0 || scheduleIndex >= schedule.length) {
    return { code: -1, message: '课表项不存在' };
  }
  
  schedule[scheduleIndex] = {
    ...schedule[scheduleIndex],
    ...scheduleItem,
    date: new Date(scheduleItem.date || schedule[scheduleIndex].date),
  };
  
  await db.collection('classes').doc(classId).update({
    data: {
      schedule,
      updatedAt: new Date(),
    }
  });
  
  return { code: 0, message: '课表更新成功' };
}

/**
 * 调课
 */
async function adjustSchedule(data) {
  const { classId, scheduleIndex, newDate, newLocation, reason } = data;
  
  const classRes = await db.collection('classes').doc(classId).get();
  if (!classRes.data) {
    return { code: -1, message: '班级不存在' };
  }
  
  const schedule = classRes.data.schedule;
  if (scheduleIndex < 0 || scheduleIndex >= schedule.length) {
    return { code: -1, message: '课表项不存在' };
  }
  
  const originalDate = schedule[scheduleIndex].date;
  
  schedule[scheduleIndex] = {
    ...schedule[scheduleIndex],
    date: new Date(newDate),
    location: newLocation || schedule[scheduleIndex].location,
    status: 'adjusted',
    originalDate,
    adjustReason: reason,
  };
  
  await db.collection('classes').doc(classId).update({
    data: {
      schedule,
      updatedAt: new Date(),
    }
  });
  
  // TODO: 发送调课通知给学员
  
  return { code: 0, message: '调课成功' };
}

/**
 * 取消课表
 */
async function cancelSchedule(data) {
  const { classId, scheduleIndex, reason } = data;
  
  const classRes = await db.collection('classes').doc(classId).get();
  if (!classRes.data) {
    return { code: -1, message: '班级不存在' };
  }
  
  const schedule = classRes.data.schedule;
  if (scheduleIndex < 0 || scheduleIndex >= schedule.length) {
    return { code: -1, message: '课表项不存在' };
  }
  
  schedule[scheduleIndex].status = 'cancelled';
  schedule[scheduleIndex].adjustReason = reason;
  
  await db.collection('classes').doc(classId).update({
    data: {
      schedule,
      updatedAt: new Date(),
    }
  });
  
  return { code: 0, message: '课程取消成功' };
}

/**
 * 获取班级学员列表
 */
async function getClassStudents(data) {
  const { classId, status, page = 1, pageSize = 50 } = data;
  
  let where = { classId };
  if (status) where.status = status;
  
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
 * 获取教师课表
 */
async function getTeacherSchedule(data) {
  const { teacherId, dateFrom, dateTo } = data;
  
  // 查询所有包含该教师的班级
  const classesRes = await db.collection('classes').get();
  
  const teacherSchedule = [];
  
  classesRes.data.forEach(cls => {
    if (!cls.schedule || !Array.isArray(cls.schedule)) return;
    cls.schedule.forEach((item, index) => {
      if (item.teacherId === teacherId) {
        const itemDate = new Date(item.date);
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        
        if ((!from || itemDate >= from) && (!to || itemDate <= to)) {
          teacherSchedule.push({
            classId: cls._id,
            className: cls.name,
            courseId: cls.courseId,
            scheduleIndex: index,
            ...item,
          });
        }
      }
    });
  });
  
  // 按日期排序
  teacherSchedule.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return {
    code: 0,
    data: teacherSchedule,
  };
}
