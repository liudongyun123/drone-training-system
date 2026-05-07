// ============================================================================
// 公告列表页 - 前台
// ============================================================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bell, 
  ChevronRight, 
  Clock, 
  Eye, 
  Calendar,
  ArrowLeft,
  Pin,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button, Loading } from '@/components';
import { CloudNoticeService } from '@/services/CloudNoticeService';
import { formatDateStr } from '@/utils/dateUtils';

// 兼容性格式化函数
const formatDate = (dateStr: string | undefined | null) => formatDateStr(dateStr, { year: 'numeric', month: '2-digit', day: '2-digit' });

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'activity' | 'announcement';
  priority: 'high' | 'medium' | 'low';
  status: string;
  target: string;
  views: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const navigate = useNavigate();

  // 加载公告
  const loadNotices = async () => {
    try {
      setLoading(true);
      const result = await CloudNoticeService.getPublishedNotices({ limit: 50 });
      // @ts-ignore
      if (result.success && result.data) {
        // @ts-ignore
        setNotices(result.data);
      }
    } catch (error) {
      console.error('加载公告失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  // 查看公告详情
  const viewNotice = async (notice: Notice) => {
    setSelectedNotice(notice);
    // 增加浏览数
    // @ts-ignore
    await CloudNoticeService.incrementViews(notice.id).catch(console.error);
  };

  // 关闭详情
  const closeDetail = () => {
    setSelectedNotice(null);
  };

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      system: '系统通知',
      activity: '活动公告',
      announcement: '重要公告'
    };
    return labels[type] || '通知';
  };

  // 获取优先级样式
  const getPriorityStyle = (priority: string) => {
    const styles: Record<string, string> = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      low: 'bg-slate-100 text-slate-600 border-slate-200'
    };
    return styles[priority] || styles.low;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">通知公告</h1>
                <p className="text-sm text-slate-500">{notices.length} 条公告</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loading text="加载公告中..." />
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-600 mb-2">暂无公告</h3>
            <p className="text-slate-500">稍后再来看看吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <div
                key={notice.id}
                onClick={() => viewNotice(notice)}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  {/* 左侧图标 */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    notice.priority === 'high' 
                      ? 'bg-red-100 text-red-600' 
                      : notice.priority === 'medium'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {notice.priority === 'high' ? (
                      <AlertCircle className="w-6 h-6" />
                    ) : notice.priority === 'medium' ? (
                      <Pin className="w-6 h-6" />
                    ) : (
                      <Bell className="w-6 h-6" />
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityStyle(notice.priority)}`}>
                        {getTypeLabel(notice.type)}
                      </span>
                      {notice.priority === 'high' && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600 border border-red-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          紧急
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                      {notice.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(notice.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {notice.views || 0}
                      </span>
                    </div>
                  </div>

                  {/* 箭头 */}
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 公告详情弹窗 */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeDetail}
          />
          <div className="relative bg-white rounded-3xl max-w-xl w-full max-h-[80vh] overflow-hidden shadow-2xl animate-scaleIn">
            {/* 头部 */}
            <div className={`p-6 border-b ${
              selectedNotice.priority === 'high' 
                ? 'bg-red-50 border-red-100' 
                : selectedNotice.priority === 'medium'
                ? 'bg-amber-50 border-amber-100'
                : 'bg-blue-50 border-blue-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 text-sm rounded-full ${getPriorityStyle(selectedNotice.priority)}`}>
                  {getTypeLabel(selectedNotice.type)}
                </span>
                <button 
                  onClick={closeDetail}
                  className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-4">
                {selectedNotice.title}
              </h2>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(selectedNotice.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {selectedNotice.views || 0} 次浏览
                </span>
              </div>
            </div>

            {/* 内容 */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div 
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedNotice.content.replace(/\n/g, '<br>') }}
              />
            </div>

            {/* 底部 */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <Button 
                onClick={closeDetail}
                className="w-full"
                variant="outline"
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
