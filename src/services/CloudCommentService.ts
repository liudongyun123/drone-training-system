/**
 * 前台评论服务
 * 为前台页面提供课程评论的读取和提交服务
 */
import { dbService } from './cloudBaseService'
import { authService } from './cloudBaseService'

// 评论接口
export interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  courseId?: string
  courseName?: string
  content: string
  rating: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reply?: string
  replyAt?: string
}

// 前台评论服务
export const CloudCommentService = {
  collection: 'comments',

  // 获取课程评论列表
  async getCourseComments(courseId: string, params?: { limit?: number; offset?: number }): Promise<{
    data: Comment[]
    total: number
  }> {
    try {
      const { limit = 20, offset = 0 } = params || {}

      const query = {
        courseId: courseId,
        status: 'approved'  // 只获取已审核通过的评论
      }

      const data = await dbService.getAll(this.collection, query, { limit, skip: offset })

      return {
        data: (data || []).map((item: any) => ({
          id: item._id,
          userId: item.userId,
          userName: item.userName || '匿名用户',
          userAvatar: item.userAvatar,
          courseId: item.courseId,
          courseName: item.courseName,
          content: item.content,
          rating: item.rating || 0,
          status: item.status,
          createdAt: item.createdAt,
          reply: item.reply,
          replyAt: item.replyAt,
        })),
        total: data?.length || 0
      }
    } catch (error) {
      console.error('获取课程评论失败:', error)
      return { data: [], total: 0 }
    }
  },

  // 获取评论统计
  async getCourseCommentStats(courseId: string): Promise<{
    total: number
    averageRating: number
    ratingDistribution: { [key: number]: number }
  }> {
    try {
      const result = await this.getCourseComments(courseId, { limit: 100 })
      const comments = result.data

      if (comments.length === 0) {
        return { total: 0, averageRating: 0, ratingDistribution: {} }
      }

      // 计算评分分布
      const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      let totalRating = 0

      comments.forEach(comment => {
        const rating = Math.round(comment.rating || 0)
        if (rating >= 1 && rating <= 5) {
          ratingDistribution[rating]++
          totalRating += rating
        }
      })

      return {
        total: comments.length,
        averageRating: Math.round((totalRating / comments.length) * 10) / 10,
        ratingDistribution
      }
    } catch (error) {
      console.error('获取评论统计失败:', error)
      return { total: 0, averageRating: 0, ratingDistribution: {} }
    }
  },

  // 提交评论
  async addComment(commentData: {
    courseId: string
    courseName: string
    content: string
    rating: number
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        return { success: false, error: '请先登录' }
      }

      const comment = {
        ...commentData,
        userId: user.uid,
        userName: user.name || user.nickName || '匿名用户',
        userAvatar: user.avatarUrl || user.avatar,
        status: 'pending',  // 默认待审核
        createdAt: new Date().toISOString(),
      }

      await dbService.add(this.collection, comment)
      return { success: true }
    } catch (error) {
      console.error('提交评论失败:', error)
      return { success: false, error: '提交评论失败' }
    }
  },

  // 获取用户的评论列表
  async getUserComments(userId?: string): Promise<Comment[]> {
    try {
      const user = await authService.getCurrentUser()
      if (!user && !userId) {
        return []
      }

      const targetUserId = userId || user?.uid
      const data = await dbService.getAll(this.collection, { userId: targetUserId }, { limit: 50 })

      return (data || []).map((item: any) => ({
        id: item._id,
        userId: item.userId,
        userName: item.userName || '匿名用户',
        userAvatar: item.userAvatar,
        courseId: item.courseId,
        courseName: item.courseName,
        content: item.content,
        rating: item.rating || 0,
        status: item.status,
        createdAt: item.createdAt,
        reply: item.reply,
        replyAt: item.replyAt,
      }))
    } catch (error) {
      console.error('获取用户评论失败:', error)
      return []
    }
  }
}
