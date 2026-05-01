/**
 * 数据迁移脚本: 统一 orders 订单格式
 * 
 * - 为现有订单添加 type 字段
 * - 统一字段命名
 * - 确保 items 数组格式一致
 */

const cloud = require('tcb-admin-node')

cloud.init({
  env: 'rcwljy-5ghmq2ex26764978'
})

const db = cloud.database()
const _ = db.command

async function migrateOrders() {
  console.log('开始迁移订单数据...\n')

  // 1. 获取所有订单
  console.log('读取 orders...')
  const orders = await getAllRecords('orders')
  console.log(`  找到 ${orders.length} 条订单`)

  let successCount = 0
  let errorCount = 0

  for (const order of orders) {
    try {
      const updateData = {}

      // 1.1 推断订单类型
      if (!order.type) {
        if (order.classId || order.registrationId) {
          updateData.type = 'class'
        } else if (order.productId || order.items?.some(i => i.productId)) {
          updateData.type = 'product'
        } else {
          updateData.type = 'course'
        }
      }

      // 1.2 统一 items 格式
      if (!order.items && order.courseId) {
        updateData.items = [{
          id: order.courseId,
          title: order.courseName || order.title || '',
          cover: order.courseCover || order.cover || '',
          price: order.amount || order.totalAmount || 0,
          quantity: 1
        }]
      }

      // 1.3 统一金额字段
      if (!order.finalAmount && order.amount) {
        updateData.finalAmount = order.amount
      }
      if (order.totalAmount && !order.amount) {
        updateData.amount = order.totalAmount
      }

      // 1.4 统一 userId 字段
      if (!order.userId && order._openid) {
        updateData.userId = order._openid
      }

      // 1.5 添加 orderNo（如果没有）
      if (!order.orderNo) {
        const date = new Date(order.createdAt || Date.now())
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
        const rand = Math.random().toString(36).substr(2, 6).toUpperCase()
        updateData.orderNo = `ORD${dateStr}${rand}`
      }

      // 执行更新
      if (Object.keys(updateData).length > 0) {
        await db.collection('orders').doc(order._id).update(updateData)
        successCount++
      } else {
        successCount++ // 不需要更新
      }
    } catch (e) {
      console.error(`  订单 ${order._id} 更新失败: ${e.message}`)
      errorCount++
    }
  }

  console.log(`\n迁移完成！`)
  console.log(`  成功: ${successCount}`)
  console.log(`  失败: ${errorCount}`)

  // 索引提示
  console.log('\n请在 CloudBase 控制台创建索引:')
  console.log('  orders.userId + createdAt')
  console.log('  orders.status')
  console.log('  orders.type')

  return { total: orders.length, success: successCount, failed: errorCount }
}

async function getAllRecords(collection) {
  const MAX_LIMIT = 1000
  const result = []
  let skip = 0

  while (true) {
    const res = await db.collection(collection)
      .skip(skip)
      .limit(MAX_LIMIT)
      .get()
    
    result.push(...res.data)
    if (res.data.length < MAX_LIMIT) break
    skip += MAX_LIMIT
  }

  return result
}

if (require.main === module) {
  migrateOrders()
    .then(res => console.log('结果:', res))
    .catch(err => console.error('错误:', err))
}

module.exports = { migrateOrders }
