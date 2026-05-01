const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { collection } = event
  
  try {
    // 查询所有文档
    const { data } = await db.collection(collection).limit(100).get()
    
    if (data.length === 0) {
      return { success: true, message: '集合已为空', deleted: 0 }
    }
    
    // 删除所有文档
    const tasks = data.map(doc => {
      return db.collection(collection).doc(doc._id).remove()
    })
    
    await Promise.all(tasks)
    
    return { 
      success: true, 
      message: `已删除 ${data.length} 条数据`,
      deleted: data.length 
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}
