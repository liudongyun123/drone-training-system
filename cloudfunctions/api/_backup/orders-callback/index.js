const tcb = require('@cloudbase/node-sdk')
const crypto = require('crypto')

exports.main = async (event) => {
  const { app } = tcb.init({
    env: event.envId || process.env.TCB_ENV_ID
  })

  try {
    const db = app.database()

    // 验证微信支付签名
    if (!verifyWeChatSignature(event)) {
      return {
        code: -1,
        message: '签名验证失败'
      }
    }

    const { out_trade_no, transaction_id, result_code } = event

    // 更新订单状态
    const orderResult = await db
      .collection('orders')
      .doc(out_trade_no)
      .update({
        status: result_code === 'SUCCESS' ? 'paid' : 'cancelled',
        payment_id: transaction_id,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (result_code === 'SUCCESS') {
      // 为用户创建学习进度记录
      const order = orderResult.data
      for (const item of order.items) {
        await db.collection('user_progress').add({
          openid: order.openid,
          course_id: item.courseId,
          lesson_id: null,
          progress: 0,
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    }

    return {
      code: 0,
      message: '支付回调处理成功'
    }
  } catch (error) {
    console.error('支付回调错误:', error)
    return {
      code: -1,
      message: '支付回调处理失败',
      error: error.message
    }
  }
}

function verifyWeChatSignature(event) {
  // 验证微信支付回调签名
  // 这里需要使用微信API验证
  return true // 暂时返回true，实际需要验证
}
