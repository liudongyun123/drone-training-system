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
  { value: 'salesCount', label: '销量' },
  { value: 'rating', label: '评分' },
  { value: 'createdAt', label: '最新' },
  { value: 'price', label: '价格' },
]

export interface MobileFilterDropdownProps {
  filters: CourseFilters
  onChange: (patch: Partial<CourseFilters>) => void
  onReset: () => void
}

export default function MobileFilterDropdown({
  filters,
  onChange,
  onReset,
}: MobileFilterDropdownProps) {
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
    <div className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold">筛选</span>
        <button onClick={onReset} className="text-xs text-blue-500 hover:underline">
          重置
        </button>
      </div>

      <input
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        onBlur={applyText}
        placeholder="关键词"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-400"
      />
      <input
        value={category}
        onChange={e => setCategory(e.target.value)}
        onBlur={applyText}
        placeholder="分类"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-400"
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={filters.level || ''}
          onChange={e =>
            onChange({ level: (e.target.value || undefined) as CourseFilters['level'] })
          }
          className="rounded-lg border border-gray-300 px-2 py-2 outline-none focus:border-blue-400"
        >
          {LEVELS.map(l => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <select
          value={filters.status || ''}
          onChange={e =>
            onChange({ status: (e.target.value || undefined) as CourseFilters['status'] })
          }
          className="rounded-lg border border-gray-300 px-2 py-2 outline-none focus:border-blue-400"
        >
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={filters.sortBy || 'salesCount'}
          onChange={e => onChange({ sortBy: e.target.value as CourseFilters['sortBy'] })}
          className="flex-1 rounded-lg border border-gray-300 px-2 py-2 outline-none focus:border-blue-400"
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
          className="rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50"
        >
          {filters.sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  )
}
