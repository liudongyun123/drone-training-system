import { useState } from 'react'
import { getCoursePrice, getLevelText, type Course } from '@/shared/types/course'

const FALLBACK_IMG =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">暂无封面</text></svg>'
  )

export interface MobileCourseCardProps {
  course: Course
}

export default function MobileCourseCard({ course }: MobileCourseCardProps) {
  const [imgError, setImgError] = useState(false)
  const { current, hasDiscount, discount } = getCoursePrice(course)
  const cover = !imgError && course.coverImage ? course.coverImage : FALLBACK_IMG

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="relative aspect-[4/3]">
        <img
          src={cover}
          alt={course.title}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
        {hasDiscount && (
          <span className="absolute right-1 top-1 rounded bg-red-500 px-1 text-[10px] text-white">
            -{discount}%
          </span>
        )}
      </div>
      <div className="p-2">
        <h3 className="truncate text-sm font-medium text-gray-800">{course.title}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-bold text-red-500">¥{current}</span>
          <span className="text-[10px] text-gray-400">{getLevelText(course.level)}</span>
        </div>
      </div>
    </div>
  )
}
