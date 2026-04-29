const tcb = require('@cloudbase/node-sdk')
const crypto = require('crypto')

exports.main = async (event) => {
  const { app } = tcb.init({
    env: event.envId || process.env.TCB_ENV_ID
  })

  const { openid, items } = event

  try {
    const db = app.database()

    // 检查用户是否已购买过这些课程
    const existingOrders = await db
      .collection('orders')
      .where({
        openid
      })
      .get()

    const purchasedCourseIds = existingOrders.data
      .filter(order => order.status === 'paid')
      .flatMap(order => order.items.map(item => item.courseId))

    // 过滤掉已购买的课程
    const validItems = items.filter(item => !purchasedCourseIds.includes(item.courseId))

    if (validItems.length === 0) {
      return {
        code: -1,
        message: '所有课程已购买'
      }
    }

    // 计算订单金额
    const total = validItems.reduce((sum, item) => sum + item.price, 0)

    // 创建订单
    const orderData = {
      _id: 'order_' + Date.now(),
      openid,
      items: validItems,
      total,
      status: 'pending',
      payment_method: 'wechat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await db.collection('orders').add(orderData)

    // 生成微信支付参数（这里需要接入真实微信支付API）
    const paymentParams = generateWeChatPayParams(orderData)

    return {
      code: 0,
      message: '创建订单成功',
      data: {
        orderId: orderData._id,
        paymentParams,
        total
      }
    }
  } catch (error) {
    console.error('创建订单错误:', error)
    return {
      code: -1,
      message: '创建订单失败',
      error: error.message
    }
  }
}

function generateWeChatPayParams(order) {
  // 这里应该调用微信支付统一下单API
  // 返回支付参数供前端调用
  return {
    appId: process.env.WECHAT_APPID,
    timeStamp: Math.floor(Date.now() / 1000).toString(),
    nonceStr: crypto.randomBytes(16).toString('hex'),
    package: `prepay_id=${order._id}`,
    signType: 'RSA',
    // paySign: '需要使用微信API生成的签名'
  }
}
