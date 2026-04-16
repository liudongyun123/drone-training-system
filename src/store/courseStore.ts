import { create } from 'zustand'
import { callCloudFunction } from '../config/tcb'

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
      const result = await callCloudFunction('api/courses-list')
      if (result.code === 0) {
        set({ courses: result.data, loading: false })
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
