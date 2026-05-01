/**
 * 旧数据迁移脚本：已支付订单 → course_permissions
 * 
 * 用途：将之前已支付但未写入 course_permissions 的订单补上
 * 执行方式：通过 CloudBase 控制台调用云函数
 * 
 * 云函数名：migrate-permissions
 */

const tcb = require('tcb-admin-node')
const app = tcb.init()
const db = app.database()
const _ = db.command

/**
 * 主函数
 */
exports.main = async (event, context) => {
  console.log('[Migrate] 开始迁移 course_permissions...')
  
  const { dryRun = true, limit = 100 } = event
  
  try {
    // 1. 查询所有已支付订单
    const ordersRes = await db.collection('orders')
      .where({
        status: _.in(['paid', 'completed', 'paid_offline'])
      })
      .limit(limit)
      .get()
    
    const orders = ordersRes.data || []
    console.log('[Migrate] 找到已支付订单:', orders.length, '条')
    
    if (orders.length === 0) {
      return {
        code: 0,
        message: '没有需要迁移的订单',
        data: { processed: 0, created: 0, skipped: 0 }
      }
    }
    
    // 2. 遍历订单，提取课程ID和手机号
    const migrationTasks = []
    
    for (const order of orders) {
      const phone = order.phone || order.buyerPhone
      const orderId = order._id
      const paidAt = order.paidAt || order.createdAt
      
      // 提取课程ID（支持新旧两种格式）
      const courseIds = []
      
      // 新格式：items 数组
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          if (item.courseId) courseIds.push(item.courseId)
        }
      }
      
      // 旧格式：直接 courseId
      if (order.courseId && !courseIds.includes(order.courseId)) {
        courseIds.push(order.courseId)
      }
      
      if (!phone || courseIds.length === 0) {
        console.log('[Migrate] 跳过订单:', orderId, '原因: 缺少手机号或课程ID')
        continue
      }
      
      // 为每个课程ID创建迁移任务
      for (const courseId of courseIds) {
        migrationTasks.push({
          phone,
          courseId,
          orderId,
          paidAt,
          source: order.paymentMethod === 'paid_offline' ? 'offline' : 'purchase'
        })
      }
    }
    
    console.log('[Migrate] 待迁移任务:', migrationTasks.length, '条')
    
    // 3. 检查 course_permissions 是否已存在
    let created = 0
    let skipped = 0
    
    for (const task of migrationTasks) {
      // 查询是否已存在
      const existingRes = await db.collection('course_permissions')
        .where({
          phone: task.phone,
          courseId: task.courseId
        })
        .limit(1)
        .get()
      
      if (existingRes.data && existingRes.data.length > 0) {
        console.log('[Migrate] 已存在，跳过:', task.phone, task.courseId)
        skipped++
        continue
      }
      
      // 干跑模式：只统计，不写入
      if (dryRun) {
        console.log('[Migrate] [DRY-RUN] 将创建:', task.phone, task.courseId)
        created++
        continue
      }
      
      // 实际写入
      try {
        await db.collection('course_permissions').add({
          phone: task.phone,
          courseId: task.courseId,
          orderId: task.orderId,
          source: task.source,
          status: 'active',
          grantedAt: task.paidAt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        console.log('[Migrate] 创建成功:', task.phone, task.courseId)
        created++
      } catch (err) {
        console.error('[Migrate] 创建失败:', task.phone, task.courseId, err.message)
      }
    }
    
    return {
      code: 0,
      message: dryRun ? '干跑完成，未实际写入' : '迁移完成',
      data: {
        ordersFound: orders.length,
        tasksGenerated: migrationTasks.length,
        processed: migrationTasks.length,
        created,
        skipped,
        dryRun
      }
    }
    
  } catch (error) {
    console.error('[Migrate] 迁移失败:', error)
    return {
      code: 500,
      message: '迁移失败: ' + error.message,
      error: error.message
    }
  }
}

// ========== 使用说明 ==========

/**
 * 调用方式：
 * 
 * 1. 干跑（只统计，不写入）：
 *    在 CloudBase 控制台 → 云函数 → migrate-permissions → 测试调用
 *    参数: { "dryRun": true, "limit": 100 }
 * 
 * 2. 实际迁移：
 *    参数: { "dryRun": false, "limit": 500 }
 * 
 * 3. 前端调用：
 *    app.callFunction({
 *      name: 'migrate-permissions',
 *      data: { dryRun: false, limit: 500 }
 *    })
 * 
 * 建议步骤：
 * 1. 先 dryRun=true 看统计结果
 * 2. 确认无误后 dryRun=false 执行迁移
 * 3. 分批执行（每次 limit=100），避免超时
 */