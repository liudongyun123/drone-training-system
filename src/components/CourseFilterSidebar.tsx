import { useEffect, useState } from 'react'
import type { CourseFilters } from '@/shared/types/course'

const LEVELS = [
  { value: '', label: '全部等级' },
  { value: 'beginner', label: '入门' },
  { value: 'intermediate', label: '进阶' },
  { value: 'advanced', label: '高级' },
]
const STATUSES = [
  { value: '', label: '全部状态' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
  { value: 'archived', label: '归档' },
]
const SORTS = [
  { value: 'salesCount', label: '销量优先' },
  { value: 'rating', label: '评分优先' },
  { value: 'createdAt', label: '最新上架' },
  { value: 'price', label: '价格' },
]

export interface CourseFilterSidebarProps {
  filters: CourseFilters
  onChange: (patch: Partial<CourseFilters>) => void
  onReset: () => void
}

export default function CourseFilterSidebar({
  filters,
  onChange,
  onReset,
}: CourseFilterSidebarProps) {
  const [keyword, setKeyword] = useState(filters.keyword || '')
  const [category, setCategory] = useState(filters.category || '')

  useEffect(() => setKeyword(filters.keyword || ''), [filters.keyword])
  useEffect(() => setCategory(filters.category || ''), [filters.category])

  const applyText = () =>
    onChange({
      keyword: keyword.trim() || undefined,
      category: category.trim() || undefined,
    })

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">筛选</h2>
        <button onClick={onReset} className="text-xs text-blue-500 hover:underline">
          重置
        </button>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <label className="mb-1 block text-gray-500">关键词</label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onBlur={applyText}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            placeholder="课程名称..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-gray-500">分类</label>
          <input
            value={category}
            onChange={e => setCategory(e.target.value)}
            onBlur={applyText}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            placeholder="如：植保 / 航拍..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-gray-500">等级</label>
          <select
            value={filters.level || ''}
            onChange={e =>
              onChange({ level: (e.target.value || undefined) as CourseFilters['level'] })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-400"
          >
            {LEVELS.map(l => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-gray-500">状态</label>
          <select
            value={filters.status || ''}
            onChange={e =>
              onChange({ status: (e.target.value || undefined) as CourseFilters['status'] })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-400"
          >
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-gray-500">排序</label>
          <div className="flex gap-2">
            <select
              value={filters.sortBy || 'salesCount'}
              onChange={e => onChange({ sortBy: e.target.value as CourseFilters['sortBy'] })}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-400"
            >
              {SORTS.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                onChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })
              }
              title="切换升降序"
              className="rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50"
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-gray-500">价格区间</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={filters.minPrice ?? ''}
              onChange={e =>
                onChange({ minPrice: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="最低"
              className="w-full rounded-lg border border-gray-300 px-2 py-2 outline-none focus:border-blue-400"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              min={0}
              value={filters.maxPrice ?? ''}
              onChange={e =>
                onChange({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="最高"
              className="w-full rounded-lg border border-gray-300 px-2 py-2 outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
