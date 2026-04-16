import { create } from 'zustand'
import { dbService } from '../services/cloudBaseService'
import { Course } from '../types/database'

interface CloudCourseState {
  courses: Course[]
  loading: boolean
  error: string | null
  fetchCourses: () => Promise<void>
  getCourseById: (id: string) => Course | undefined
  addCourse: (course: Course) => Promise<void>
  updateCourse: (id: string, course: Partial<Course>) => Promise<void>
  deleteCourse: (id: string) => Promise<void>
}

export const useCloudCourseStore = create<CloudCourseState>((set, get) => ({
  courses: [],
  loading: false,
  error: null,

  fetchCourses: async () => {
    set({ loading: true, error: null })
    try {
      const courses = await dbService.getAll('courses')
      set({ courses, loading: false })
    } catch (error) {
      console.error('获取课程列表失败:', error)
      set({ loading: false, error: '获取课程列表失败' })
    }
  },

  getCourseById: (id: string) => {
    return get().courses.find(c => c._id === id)
  },

  addCourse: async (course: Course) => {
    try {
      await dbService.add('courses', course)
      await get().fetchCourses()
    } catch (error) {
      console.error('添加课程失败:', error)
      throw error
    }
  },

  updateCourse: async (id: string, course: Partial<Course>) => {
    try {
      await dbService.update('courses', id, course)
      await get().fetchCourses()
    } catch (error) {
      console.error('更新课程失败:', error)
      throw error
    }
  },

  deleteCourse: async (id: string) => {
    try {
      await dbService.delete('courses', id)
      await get().fetchCourses()
    } catch (error) {
      console.error('删除课程失败:', error)
      throw error
    }
  }
}))
