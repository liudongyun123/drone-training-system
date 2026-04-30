// ============================================================================
// CourseStats - 课程权限统计弹窗
// ============================================================================
import { X, Shield, BookOpen, UserCheck, User, XCircle, FileText } from 'lucide-react';
import type { PermissionStats } from '../hooks/useCourses';
import { toast } from '@/components/Toast';

interface CourseStatsProps {
  isOpen: boolean;
  course: { _id?: string; title: string } | null;
  stats: PermissionStats | null;
  loading: boolean;
  onClose: () => void;
}

export default function CourseStats({
  isOpen,
  course,
  stats,
  loading,
  onClose,
}: CourseStatsProps) {
  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">课程权限统计</h2>
              <p className="text-sm text-gray-500 mt-1">{course.title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              {/* 总计 */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={24} className="text-purple-600" />
                    <span className="font-semibold text-purple-800">总权限数</span>
                  </div>
                  <span className="text-3xl font-bold text-purple-700">
                    {stats.total}
                  </span>
                </div>
                {stats.total > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-purple-600 mb-1">
                      <span>有效权限占比</span>
                      <span>
                        {Math.round(
                          ((stats.total - stats.expired) / stats.total) * 100
                        )}
                        %
                      </span>
                    </div>
                    <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{
                          width: `${((stats.total - stats.expired) / stats.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 权限来源分布 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={16} className="text-blue-600" />
                    <span className="text-sm text-blue-700">购买获得</span>
                  </div>
                  <p className="text-xl font-bold text-blue-800">
                    {stats.purchase}
                  </p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck size={16} className="text-green-600" />
                    <span className="text-sm text-green-700">报名获得</span>
                  </div>
                  <p className="text-xl font-bold text-green-800">
                    {stats.registration}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={16} className="text-orange-600" />
                    <span className="text-sm text-orange-700">管理员授权</span>
                  </div>
                  <p className="text-xl font-bold text-orange-800">
                    {stats.admin}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle size={16} className="text-gray-600" />
                    <span className="text-sm text-gray-700">已失效</span>
                  </div>
                  <p className="text-xl font-bold text-gray-800">
                    {stats.expired}
                  </p>
                </div>
              </div>

              {/* 失效权限操作 */}
              {stats.expired > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 mb-2">
                    ⚠️ 有 {stats.expired} 个权限已失效
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toast.info('批量续期功能开发中...')}
                      className="flex-1 px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      批量续期
                    </button>
                    <button
                      onClick={() => toast.info('清理失效权限功能开发中...')}
                      className="flex-1 px-3 py-1.5 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      清理失效
                    </button>
                  </div>
                </div>
              )}

              {/* 提示信息 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">
                  <Shield size={12} className="inline mr-1" />
                  权限来源说明：
                </p>
                <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
                  <li>• 购买获得：通过线上购买课程获得的权限</li>
                  <li>• 报名获得：通过报名班级获得的视频学习权限</li>
                  <li>• 管理员授权：后台手动授权的权限</li>
                  <li>• 已失效：已过期或被撤销的权限</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-sm">暂无权限数据</p>
              <p className="text-xs mt-1">该课程暂无学员购买或报名</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={() => toast.info('查看详情功能开发中...')}
              className="flex-1 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              查看详情
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}