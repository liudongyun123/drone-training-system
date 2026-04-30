// ============================================================================
// LessonManager - 章节管理弹窗
// ============================================================================
import {
  X,
  Save,
  Trash2,
  List,
  Play,
  Plus,
  ArrowUp,
  ArrowDown,
  Upload,
  FileText,
  Video,
  XCircle,
} from 'lucide-react';
import type { LessonFormData } from '../hooks/useCourses';
import type { Lesson } from '@/types';

interface LessonManagerProps {
  isOpen: boolean;
  managingCourse: { _id?: string; title: string } | null;
  lessons: Lesson[];
  editingLesson: Lesson | null;
  lessonFormData: LessonFormData;
  setLessonFormData: React.Dispatch<React.SetStateAction<LessonFormData>>;
  lessonSubmitting: boolean;
  lessonsLoading: boolean;
  // 视频上传
  uploadingVideo: boolean;
  videoProgress: number;
  videoDragActive: boolean;
  onVideoInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoDragEnter: (e: React.DragEvent) => void;
  onVideoDragLeave: (e: React.DragEvent) => void;
  onVideoDragOver: (e: React.DragEvent) => void;
  onVideoDrop: (e: React.DragEvent) => void;
  onDeleteVideo: () => void;
  // PDF 上传
  uploadingPdf: boolean;
  pdfProgress: number;
  onPdfUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDeletePdf: () => void;
  // 回调
  onAddLesson: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string) => void;
  onLessonSubmit: (e: React.FormEvent) => void;
  onMoveLesson: (index: number, direction: 'up' | 'down') => void;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function LessonManager({
  isOpen,
  managingCourse,
  lessons,
  editingLesson,
  lessonFormData,
  setLessonFormData,
  lessonSubmitting,
  lessonsLoading,
  uploadingVideo,
  videoProgress,
  videoDragActive,
  onVideoInputChange,
  onVideoDragEnter,
  onVideoDragLeave,
  onVideoDragOver,
  onVideoDrop,
  onDeleteVideo,
  uploadingPdf,
  pdfProgress,
  onPdfUpload,
  onDeletePdf,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onLessonSubmit,
  onMoveLesson,
  onClose,
}: LessonManagerProps) {
  if (!isOpen || !managingCourse) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-base-100 border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">章节管理</h2>
            <p className="text-sm text-gray-500">{managingCourse.title}</p>
          </div>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* 章节列表 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">
                章节列表 ({lessons.length})
              </h3>
              <button
                className="btn btn-sm btn-primary"
                onClick={onAddLesson}
                disabled={!!editingLesson}
              >
                <Plus size={16} className="mr-1" />
                添加章节
              </button>
            </div>

            {lessonsLoading ? (
              <div className="text-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-base-200 rounded-lg">
                暂无章节，点击"添加章节"创建
              </div>
            ) : (
              <div className="space-y-2">
                {lessons.map((lesson, index) => (
                  <div
                    key={lesson._id}
                    className="flex items-center gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="text-gray-400 text-sm w-8">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{lesson.title}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        {lesson.videoUrl && (
                          <span className="flex items-center gap-1 text-success">
                            <Video size={12} />
                            视频
                          </span>
                        )}
                        {lesson.videoDuration && (
                          <span className="flex items-center gap-1">
                            <Play size={12} />
                            {Math.floor(lesson.videoDuration / 60)}:
                            {(lesson.videoDuration % 60)
                              .toString()
                              .padStart(2, '0')}
                          </span>
                        )}
                        {(lesson as any).pdfFile?.fileID && (
                          <span className="flex items-center gap-1 text-error">
                            <FileText size={12} />
                            PDF
                          </span>
                        )}
                        {lesson.isFree && (
                          <span className="badge badge-sm badge-success">
                            试看
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-xs btn-square btn-ghost"
                        onClick={() => onMoveLesson(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        className="btn btn-xs btn-square btn-ghost"
                        onClick={() => onMoveLesson(index, 'down')}
                        disabled={index === lessons.length - 1}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        className="btn btn-xs btn-square btn-ghost"
                        onClick={() => onEditLesson(lesson)}
                      >
                        <Save size={14} />
                      </button>
                      <button
                        className="btn btn-xs btn-square btn-ghost text-red-500"
                        onClick={() => onDeleteLesson(lesson._id!)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 章节表单 */}
          {editingLesson !== undefined && (
            <form onSubmit={onLessonSubmit} className="border-t pt-6">
              <h3 className="font-semibold mb-4">
                {editingLesson ? '编辑章节' : '添加章节'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 标题 */}
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">章节标题 *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={lessonFormData.title}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        title: e.target.value,
                      })
                    }
                    required
                    placeholder="请输入章节标题"
                  />
                </div>

                {/* 描述 */}
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">章节描述</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered"
                    value={lessonFormData.description}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        description: e.target.value,
                      })
                    }
                    placeholder="请输入章节描述"
                    rows={2}
                  />
                </div>

                {/* 视频上传 */}
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">视频文件</span>
                  </label>
                  {lessonFormData.videoUrl ? (
                    <div className="p-3 bg-base-200 rounded-lg flex items-center gap-3">
                      <Video className="text-success" size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {lessonFormData.videoUrl.startsWith('cloud://')
                            ? '已上传视频'
                            : '外部视频链接'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {lessonFormData.videoUrl}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost text-error"
                        onClick={onDeleteVideo}
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragEnter={onVideoDragEnter}
                      onDragLeave={onVideoDragLeave}
                      onDragOver={onVideoDragOver}
                      onDrop={onVideoDrop}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        videoDragActive
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-300 hover:border-primary hover:bg-base-200'
                      }`}
                    >
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/mov,video/quicktime"
                        hidden
                        id="lesson-video-upload"
                        onChange={onVideoInputChange}
                      />
                      <label
                        htmlFor="lesson-video-upload"
                        className="cursor-pointer block"
                      >
                        {uploadingVideo ? (
                          <div>
                            <p className="text-sm mb-2">
                              上传中 {videoProgress}%
                            </p>
                            <progress
                              className="progress progress-primary w-full"
                              value={videoProgress}
                              max="100"
                            />
                          </div>
                        ) : (
                          <>
                            <Video
                              className={`mx-auto mb-2 ${
                                videoDragActive
                                  ? 'text-primary'
                                  : 'text-gray-400'
                              }`}
                              size={40}
                            />
                            <p
                              className={`text-sm ${
                                videoDragActive
                                  ? 'text-primary'
                                  : 'text-gray-500'
                              }`}
                            >
                              {videoDragActive
                                ? '松开以上传视频'
                                : '拖拽视频到此处，或点击上传'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              支持 MP4、WebM、MOV 格式，最大 500MB
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {/* 视频时长 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">视频时长 (秒)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={lessonFormData.videoDuration}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        videoDuration: Number(e.target.value),
                      })
                    }
                    min={0}
                  />
                </div>

                {/* 排序 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">排序</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={lessonFormData.order}
                    onChange={(e) =>
                      setLessonFormData({
                        ...lessonFormData,
                        order: Number(e.target.value),
                      })
                    }
                    min={1}
                  />
                </div>

                {/* PDF上传 */}
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">PDF课件</span>
                  </label>
                  {lessonFormData.pdfFile?.fileID ? (
                    <div className="p-3 bg-base-200 rounded-lg flex items-center gap-3">
                      <FileText className="text-error" size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {lessonFormData.pdfFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(lessonFormData.pdfFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost text-error"
                        onClick={onDeletePdf}
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary hover:bg-base-200 transition-colors">
                      <input
                        type="file"
                        accept=".pdf"
                        hidden
                        id="lesson-pdf-upload"
                        onChange={onPdfUpload}
                      />
                      <label
                        htmlFor="lesson-pdf-upload"
                        className="cursor-pointer block"
                      >
                        {uploadingPdf ? (
                          <div>
                            <p className="text-sm mb-2">
                              上传中 {pdfProgress}%
                            </p>
                            <progress
                              className="progress progress-error w-full"
                              value={pdfProgress}
                              max="100"
                            />
                          </div>
                        ) : (
                          <>
                            <Upload
                              className="mx-auto mb-2 text-gray-400"
                              size={28}
                            />
                            <p className="text-sm text-gray-500">
                              点击上传PDF课件
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              支持 PDF 格式，最大 50MB
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {/* 允许试看 */}
                <div className="form-control md:col-span-2">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={lessonFormData.isFree}
                      onChange={(e) =>
                        setLessonFormData({
                          ...lessonFormData,
                          isFree: e.target.checked,
                        })
                      }
                    />
                    <span className="label-text">允许试看（免费预览）</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="btn flex-1"
                  onClick={() => {
                    setLessonFormData({
                      title: '',
                      description: '',
                      videoUrl: '',
                      videoDuration: 0,
                      isFree: false,
                      order: 0,
                    });
                    // Reset editingLesson through parent
                    onClose;
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={lessonSubmitting}
                >
                  {lessonSubmitting ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      {editingLesson ? '保存修改' : '创建章节'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}