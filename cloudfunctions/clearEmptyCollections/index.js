const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 要删除的空表列表
const EMPTY_COLLECTIONS = [
  'attendance',           // 出勤（已改用 attendance_records）
  'comments',             // 评论
  'coupon_users',         // 优惠券领取
  'course_categories',    // 课程分类（已有 categories）
  'course_progress',      // 课程进度
  'exam_results',         // 考试结果
  'faq',                  // 常见问题
  'favoriteQuestions',    // 收藏题目
  'favorites',            // 收藏
  'feedback',             // 反馈建议
  'groupBuys',           // 拼团
  'learning_progress',    // 学习进度
  'lesson_progress',      // 课时进度
  'liveStreams',         // 直播管理
  'notifications',       // 通知消息
  'promotions',          // 促销管理
  'reviews',             // 评价管理
  'search_history',       // 搜索历史
  'search_hot',          // 热门搜索
  'statistics_daily',    // 每日统计
  'statistics_teacher',  // 教师统计
  'studyProgress',       // 学习进度（旧）
]

// 云函数入口函数
exports.main = async (event, context) => {
  const results = []
  
  for (const collectionName of EMPTY_COLLECTIONS) {
    try {
      // 查询集合中的文档数量
      const countResult = await db.collection(collectionName).count()
      
      if (countResult.total > 0) {
        // 如果有数据，先删除
        const { data } = await db.collection(collectionName).limit(100).get()
        const deleteTasks = data.map(doc => {
          return db.collection(collectionName).doc(doc._id).remove()
        })
        await Promise.all(deleteTasks)
        results.push({ collection: collectionName, status: 'deleted_with_data', count: countResult.total })
      } else {
        // 空集合，标记为已清理
        results.push({ collection: collectionName, status: 'already_empty' })
      }
    } catch (error) {
      results.push({ collection: collectionName, status: 'error', error: error.message })
    }
  }
  
  return {
    success: true,
    message: '空表清理完成',
    results
  }
}
