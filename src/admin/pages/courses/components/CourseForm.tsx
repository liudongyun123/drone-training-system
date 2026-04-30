// ============================================================================
// CourseForm - 课程表单弹窗
// ============================================================================
import { X, Save, ImageIcon, XCircle } from 'lucide-react';
import type { CourseFormData } from '../hooks/useCourses';
import type { Teacher } from '@/types';
import type { OptionItem } from '@/services/dictionaryService';

interface CourseFormProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: CourseFormData;
  setFormData: React.Dispatch<React.SetStateAction<CourseFormData>>;
  submitting: boolean;
  teachers: Teacher[];
  teachersLoading: boolean;
  categories: Array<{ _id: string; name: string; code: string }>;
  categoriesLoading: boolean;
  levelOptions: OptionItem[];
  levelsLoading: boolean;
  // 封面上传
  uploadingCover: boolean;
  coverProgress: number;
  coverDragActive: boolean;
  onCoverInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCoverDragEnter: (e: React.DragEvent) => void;
  onCoverDragLeave: (e: React.DragEvent) => void;
  onCoverDragOver: (e: React.DragEvent) => void;
  onCoverDrop: (e: React.DragEvent) => void;
  onDeleteCover: () => void;
  // 回调
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onTeacherChange: (teacherId: string) => void;
}

export default function CourseForm({
  isOpen,
  isEditing,
  formData,
  setFormData,
  submitting,
  teachers,
  teachersLoading,
  categories,
  categoriesLoading,
  levelOptions,
  levelsLoading,
  uploadingCover,
  coverProgress,
  coverDragActive,
  onCoverInputChange,
  onCoverDragEnter,
  onCoverDragLeave,
  onCoverDragOver,
  onCoverDrop,
  onDeleteCover,
  onSubmit,
  onClose,
  onTeacherChange,
}: CourseFormProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-base-100 border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? '编辑课程' : '添加课程'}
          </h2>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 课程标题 */}
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">课程标题 *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="请输入课程标题"
              />
            </div>

            {/* 课程描述 */}
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">课程描述</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="请输入课程描述"
              />
            </div>

            {/* 分类 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">分类 *</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                required
                disabled={categoriesLoading}
              >
                {categoriesLoading ? (
                  <option value="">加载中...</option>
                ) : categories.length > 0 ? (
                  categories.map((cat) => (
                    <option key={cat._id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="基础入门">基础入门</option>
                    <option value="进阶提升">进阶提升</option>
                    <option value="专业认证">专业认证</option>
                    <option value="行业应用">行业应用</option>
                  </>
                )}
              </select>
            </div>

            {/* 难度等级 - 使用字典 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">难度等级</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.level}
                onChange={(e) =>
                  setFormData({ ...formData, level: e.target.value })
                }
                disabled={levelsLoading}
              >
                <option value="">不选</option>
                {levelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 价格 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">现价 (¥) *</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: Number(e.target.value) })
                }
                required
                min={0}
              />
            </div>

            {/* 原价 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">原价 (¥)</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={formData.originalPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    originalPrice: Number(e.target.value),
                  })
                }
                min={0}
              />
            </div>

            {/* 时长 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">课程时长 (分钟)</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: Number(e.target.value) })
                }
                min={0}
              />
            </div>

            {/* 最大学员数 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">最大学员数</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={formData.maxStudents}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxStudents: Number(e.target.value),
                  })
                }
                min={1}
              />
            </div>

            {/* 封面图片上传 */}
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">封面图片</span>
              </label>
              {formData.coverImage ? (
                <div className="p-3 bg-base-200 rounded-lg flex items-center gap-3">
                  <div className="w-20 h-14 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={
                        formData.coverImage.startsWith('cloud://')
                          ? formData.coverImage.replace('cloud://', 'https://')
                          : formData.coverImage
                      }
                      alt="封面预览"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {formData.coverImage.startsWith('cloud://')
                        ? '已上传封面'
                        : '外部图片链接'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {formData.coverImage}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost text-error"
                    onClick={onDeleteCover}
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              ) : (
                <div
                  onDragEnter={onCoverDragEnter}
                  onDragLeave={onCoverDragLeave}
                  onDragOver={onCoverDragOver}
                  onDrop={onCoverDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    coverDragActive
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-300 hover:border-primary hover:bg-base-200'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
                    hidden
                    id="course-cover-upload"
                    onChange={onCoverInputChange}
                  />
                  <label
                    htmlFor="course-cover-upload"
                    className="cursor-pointer block"
                  >
                    {uploadingCover ? (
                      <div>
                        <p className="text-sm mb-2">
                          上传中 {coverProgress}%
                        </p>
                        <progress
                          className="progress progress-primary w-full"
                          value={coverProgress}
                          max="100"
                        />
                      </div>
                    ) : (
                      <>
                        <ImageIcon
                          className={`mx-auto mb-2 ${
                            coverDragActive ? 'text-primary' : 'text-gray-400'
                          }`}
                          size={40}
                        />
                        <p
                          className={`text-sm ${
                            coverDragActive ? 'text-primary' : 'text-gray-500'
                          }`}
                        >
                          {coverDragActive
                            ? '松开以上传封面'
                            : '拖拽图片到此处，或点击上传'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          支持 JPG、PNG、GIF、WebP 格式，最大 10MB
                        </p>
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>

            {/* 授课教师 */}
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">授课教师 *</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={formData.teacherId}
                onChange={(e) => onTeacherChange(e.target.value)}
                required
                disabled={teachersLoading}
              >
                <option value="">
                  {teachersLoading ? '加载中...' : '请选择授课教师'}
                </option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name || teacher.realName}{' '}
                    {teacher.specialty
                      ? `(${teacher.specialty.join(', ')})`
                      : ''}
                  </option>
                ))}
              </select>
              {teachers.length === 0 && !teachersLoading && (
                <span className="text-xs text-warning mt-1">
                  暂无教师数据，请先添加教师
                </span>
              )}
            </div>

            {/* 状态 */}
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">状态</span>
              </label>
              <div className="flex gap-4">
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    className="radio radio-primary"
                    value="draft"
                    checked={formData.status === 'draft'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                  />
                  <span className="label-text">草稿</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    className="radio radio-success"
                    value="published"
                    checked={formData.status === 'published'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                  />
                  <span className="label-text">已发布</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    className="radio radio-neutral"
                    value="archived"
                    checked={formData.status === 'archived'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                  />
                  <span className="label-text">已归档</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              className="btn flex-1"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={submitting}
            >
              {submitting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  {isEditing ? '保存修改' : '创建课程'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}