import { useState } from 'react'
import { getCoursePrice, getLevelText, type Course } from '@/shared/types/course'

const FALLBACK_IMG =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">暂无封面</text></svg>'
  )

export interface CourseCardProps {
  course: Course
  layout?: 'vertical' | 'horizontal'
}

export default function CourseCard({ course, layout = 'vertical' }: CourseCardProps) {
  const [imgError, setImgError] = useState(false)
  const { current, original, hasDiscount, discount } = getCoursePrice(course)
  const levelText = getLevelText(course.level)
  const cover = !imgError && course.coverImage ? course.coverImage : FALLBACK_IMG

  if (layout === 'horizontal') {
    return (
      <div className="flex gap-4 rounded-xl border border-gray-200 p-3 transition hover:shadow-md">
        <img
          src={cover}
          alt={course.title}
          onError={() => setImgError(true)}
          className="h-24 w-32 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-800">{course.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{course.description}</p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="font-bold text-red-500">¥{current}</span>
            {hasDiscount && <span className="text-gray-400 line-through">¥{original}</span>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={cover}
          alt={course.title}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          {levelText}
        </span>
        {hasDiscount && (
          <span className="absolute right-2 top-2 rounded bg-red-500 px-2 py-0.5 text-xs text-white">
            -{discount}%
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate font-semibold text-gray-800">{course.title}</h3>
        <p className="mt-1 line-clamp-2 h-10 text-sm text-gray-500">{course.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-red-500">¥{current}</span>
            {hasDiscount && <span className="text-xs text-gray-400 line-through">¥{original}</span>}
          </div>
          <span className="text-xs text-gray-400">
            {course.teacherName || course.instructor || '未知讲师'}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          <span>⭐ {course.rating || 0}</span>
          <span>已售 {course.salesCount || 0}</span>
          {course.tags?.slice(0, 2).map(t => (
            <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
