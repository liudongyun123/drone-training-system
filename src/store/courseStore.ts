import { create } from 'zustand'
import { app } from '@/utils/cloudbase'

interface Course {
  _id: string
  title: string
  description: string
  thumbnail: string
  level: 'beginner' | 'intermediate' | 'advanced'
  duration: number
  lessons: number
  instructor: string
  rating: number
  students: number
  tags: string[]
  price: number
  originalPrice: number
}

interface CourseState {
  courses: Course[]
  loading: boolean
  fetchCourses: () => Promise<void>
  getCourseById: (id: string) => Course | undefined
}

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: [],
  loading: false,
  fetchCourses: async () => {
    set({ loading: true })
    try {
      // 调用 api-course 云函数
      const result = await app.callFunction({
        name: 'api-course',
        data: { action: 'list', page: 1, pageSize: 50 }
      })
      const response = result.result as any
      if (response.success && response.data) {
        set({ courses: response.data, loading: false })
      } else {
        console.error('获取课程列表失败:', response.error)
        set({ loading: false })
      }
    } catch (error) {
      console.error('获取课程列表失败:', error)
      set({ loading: false })
    }
  },
  getCourseById: (id: string) => {
    return get().courses.find(course => course._id === id)
  }
}))
