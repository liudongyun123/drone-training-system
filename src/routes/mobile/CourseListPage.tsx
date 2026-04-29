// ============================================================================
// 移动端课程列表页 - 使用同一个 Hook
// 特点：卡片布局 + 下拉筛选 + 无限滚动
// ============================================================================

import { useCallback, useRef } from 'react'
import { useCourseList } from '@/shared'
import { MobileCourseCard, MobileFilterDropdown } from '@/components/mobile'

export default function MobileCourseListPage() {
  // ★ 使用同一个 Hook：数据来源完全一样！
  const {
    courses,
    loading,
    error,
    total,
    hasMore,
    filters,
    setFilters,
    refresh,
    loadMore,   // ← 移动端用无限滚动，不用分页
    resetFilters
  } = useCourseList({ initialFilters: { pageSize: 6 } })

  // ========== 移动端特有：下拉筛选 ==========
  const [showFilter, setShowFilter] = useState(false)

  // ========== 移动端特有：无限滚动 ==========
  const observer = useRef<IntersectionObserver>()
  const lastCourseRef = useCallback((node: HTMLDivElement) => {
    if (loading) return
    if (observer.current) observer.current.disconnect()
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore()  // ← 滚到底部自动加载更多
      }
    })
    
    if (node) observer.current.observe(node)
  }, [loading, hasMore, loadMore])

  // ========== 移动端特有：2列瀑布流 ==========
  return (
    <div className="px-4 py-4">
      {/* 顶部搜索 + 筛选 - 移动端才有 */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="搜索课程..."
          className="flex-1 input input-bordered input-sm"
          value={filters.keyword || ''}
          onChange={e => setFilters({ keyword: e.target.value })}
        />
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setShowFilter(!showFilter)}
        >
          筛选
        </button>
      </div>

      {/* 下拉筛选面板 - 移动端才有 */}
      {showFilter && (
        <MobileFilterDropdown
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
        />
      )}

      {/* 课程数量 */}
      <p className="text-sm text-gray-500 mb-3">共 {total} 门课程</p>

      {/* 2列瀑布流 - 移动端才有 */}
      <div className="grid grid-cols-2 gap-3">
        {courses.map((course, index) => {
          // 最后一个元素绑定无限滚动
          if (index === courses.length - 1) {
            return (
              <div ref={lastCourseRef} key={course._id}>
                <MobileCourseCard course={course} />
              </div>
            )
          }
          return <MobileCourseCard key={course._id} course={course} />
        })}
      </div>

      {/* 加载更多状态 */}
      {loading && (
        <div className="text-center py-4">
          <span className="loading loading-spinner loading-sm" /> 加载中...
        </div>
      )}

      {!hasMore && courses.length > 0 && (
        <p className="text-center text-gray-400 text-sm py-4">没有更多课程了</p>
      )}

      {/* 空状态 */}
      {!loading && courses.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400">暂无课程</p>
        </div>
      )}
    </div>
  )
}