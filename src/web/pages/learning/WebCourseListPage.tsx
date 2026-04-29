// ============================================================================
// Web 端课程列表页 - 使用共用层的 Hook
// 特点：表格布局 + 侧边筛选 + 分页导航
// ============================================================================

import { useCourseList } from '@/shared'
import { CourseCard, CourseFilterSidebar, Pagination } from '@/components'
import type { CourseFilters } from '@/shared'

export default function WebCourseListPage() {
  // ★ 使用共用 Hook：数据和逻辑跟移动端完全一样
  const {
    courses,
    loading,
    error,
    total,
    page,
    hasMore,
    filters,
    setFilters,
    refresh,
    resetFilters
  } = useCourseList({ initialFilters: { pageSize: 12 } })

  // ========== Web 端特有：侧边筛选 ==========
  const handleFilterChange = (newFilters: Partial<CourseFilters>) => {
    setFilters(newFilters)
  }

  // ========== Web 端特有：分页 ==========
  const handlePageChange = (newPage: number) => {
    setFilters({ page: newPage })
  }

  // ========== Web 端特有：3列网格布局 ==========
  return (
    <div className="flex gap-8 max-w-7xl mx-auto px-8 py-6">
      {/* 侧边筛选栏 - Web 端才有 */}
      <aside className="w-64 shrink-0">
        <CourseFilterSidebar
          filters={filters}
          onChange={handleFilterChange}
          onReset={resetFilters}
        />
      </aside>

      {/* 主内容区 */}
      <main className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">课程中心</h1>
          <span className="text-gray-500">共 {total} 门课程</span>
        </div>

        {/* 3列网格 - Web 端才有 */}
        {loading ? (
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-6">
              {courses.map(course => (
                <CourseCard key={course._id} course={course} layout="vertical" />
              ))}
            </div>

            {/* 分页导航 - Web 端才有 */}
            <div className="mt-8 flex justify-center">
              <Pagination
                current={page}
                total={total}
                pageSize={filters.pageSize || 12}
                onChange={handlePageChange}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

// Web 端骨架屏
function CourseCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 rounded-xl h-48" />
      <div className="mt-3 bg-gray-200 rounded h-5 w-3/4" />
      <div className="mt-2 bg-gray-200 rounded h-4 w-1/2" />
    </div>
  )
}

// 错误状态
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-20">
      <p className="text-red-500 mb-4">{message}</p>
      <button onClick={onRetry} className="btn btn-primary">重试</button>
    </div>
  )
}