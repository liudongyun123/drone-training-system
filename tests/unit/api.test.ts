import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock API response types
interface ApiResponse<T = any> {
  code: number
  data?: T
  message?: string
  success?: boolean
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page?: number
  pageSize?: number
}

// Mock data
const mockCourse = {
  _id: 'course-1',
  title: '无人机基础课程',
  price: 299,
  status: 'published',
}

const mockApiSuccess: ApiResponse = {
  code: 0,
  data: mockCourse,
  message: 'success',
  success: true,
}

const mockApiError: ApiResponse = {
  code: -1,
  message: '请求失败',
  success: false,
}

describe('API 响应格式测试', () => {
  it('成功响应应包含正确结构', () => {
    expect(mockApiSuccess.code).toBe(0)
    expect(mockApiSuccess.success).toBe(true)
    expect(mockApiSuccess.data).toBeDefined()
  })

  it('错误响应应包含错误信息', () => {
    expect(mockApiError.code).not.toBe(0)
    expect(mockApiError.success).toBe(false)
    expect(mockApiError.message).toBeDefined()
  })

  it('分页响应应包含分页信息', () => {
    const paginatedResponse: PaginatedResponse<typeof mockCourse> = {
      data: [mockCourse],
      total: 1,
      page: 1,
      pageSize: 10,
    }
    expect(paginatedResponse.total).toBeGreaterThan(0)
    expect(paginatedResponse.page).toBeDefined()
    expect(paginatedResponse.pageSize).toBeDefined()
  })
})

describe('错误处理测试', () => {
  it('应正确识别网络错误', () => {
    const handleError = (error: any) => {
      if (!error.response) {
        return '网络错误'
      }
      return error.response.data?.message || '未知错误'
    }
    expect(handleError(new Error('Network Error'))).toBe('网络错误')
  })

  it('应正确识别 401 错误', () => {
    const handleError = (error: any) => {
      if (error.response?.status === 401) {
        return '未授权'
      }
      return error.message
    }
    expect(handleError({ response: { status: 401 } })).toBe('未授权')
  })
})
