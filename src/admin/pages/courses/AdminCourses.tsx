// ============================================================================
// 管理后台 - 课程管理
// ============================================================================
import { useState, useEffect } from 'react';
import AdminPageTemplate from '@/admin/pages/system/_AdminPageTemplate';
import { courseService, teacherService } from '@/services/database';
import { CloudAdminService } from '@/services/CloudAdminService';
import { adminService } from '@/services/adminService';
import { safeGetList, safeGetTotal } from '@/utils/safeData';

import { uploadFile, deleteFile } from '@/services/storageService';
import { app } from '@/utils/cloudbase';
import type { Course, Lesson, Teacher } from '@/types';

import { X, Save, Trash2, List, Play, GripVertical, Plus, ArrowUp, ArrowDown, User, Upload, FileText, Video, XCircle, Image as ImageIcon, TrendingUp, BookOpen, UserCheck, Shield } from 'lucide-react';

const LEVELS = ['', '初级工', '中级工', '高级工', '技师', '高级技师'];

interface CourseFormData {
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  originalPrice: number;
  duration: number;
  coverImage: string;
  status: 'draft' | 'published' | 'archived';
  instructor: string;
  teacherId: string;
  maxStudents: number;
}

interface LessonFormData {
  title: string;
  description: string;
  videoUrl: string;
  videoDuration: number;
  isFree: boolean;
  order: number;
  pdfFile?: { fileID: string; name: string; size: number } | null;
}

const initialFormData: CourseFormData = {
  title: '',
  description: '',
  category: '基础入门',
  level: '初级',
  price: 0,
  originalPrice: 0,
  duration: 0,
  coverImage: '',
  status: 'draft',
  instructor: '',
  teacherId: '',
  maxStudents: 50,
};

const initialLessonFormData: LessonFormData = {
  title: '',
  description: '',
  videoUrl: '',
  videoDuration: 0,
  isFree: false,
  order: 0,
};

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // 教师列表
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);

  // 分类列表（从数据库读取）
  const [categories, setCategories] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // 章节管理状态
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [managingCourse, setManagingCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonFormData, setLessonFormData] = useState<LessonFormData>(initialLessonFormData);
  const [lessonSubmitting, setLessonSubmitting] = useState(false);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // 视频上传状态
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDragActive, setVideoDragActive] = useState(false);

  // PDF上传状态
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfDragActive, setPdfDragActive] = useState(false);

  // 封面图片上传状态
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [coverDragActive, setCoverDragActive] = useState(false);

  // ★ 权限统计模态框状态
  const [isPermissionStatsModalOpen, setIsPermissionStatsModalOpen] = useState(false);
  const [selectedCourseForStats, setSelectedCourseForStats] = useState<Course | null>(null);
  const [permissionStats, setPermissionStats] = useState<{
    total: number;
    purchase: number;
    registration: number;
    admin: number;
    expired: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // 加载教师列表
  const loadTeachers = async () => {
    setTeachersLoading(true);
    try {
      const result = await teacherService.getList({ page: 1, pageSize: 100 });
      setTeachers(safeGetList<Teacher>(result));
    } catch (error) {
      console.error('加载教师列表失败:', error);
    } finally {
      setTeachersLoading(false);
    }
  };

  // 加载分类列表
  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      // 使用云函数获取分类列表（避免数据库安全规则限制）
      const result = await adminService.list('categories', { status: 'active' });
      
      if (result.code === 0 && Array.isArray(result.data)) {
        setCategories(result.data);
      } else {
        console.warn('获取分类失败或数据格式错误:', result.message);
      }
    } catch (error) {
      console.error('加载分类列表异常:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const result = await courseService.getList({ page, pageSize: 10 });
      setCourses(safeGetList<Course>(result));
      setTotal(safeGetTotal(result));
    } catch (error) {
      console.error('加载课程失败:', error);
      setCourses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    loadTeachers();
    loadCategories();
  }, [page]);

  // 当教师列表加载完成后，如果正在编辑课程且 teacherId 为空，自动匹配
  useEffect(() => {
    if (isModalOpen && editingCourse && teachers.length > 0 && !formData.teacherId && formData.instructor) {
      console.log('教师列表已加载，尝试匹配 teacherId...');
      console.log('当前教师列表:', teachers.map(t => ({ id: t._id, name: t.name, realName: t.realName })));
      console.log('要匹配的教师名称:', formData.instructor);
      
      const matchedTeacher = teachers.find(t =>
        t.name === formData.instructor ||
        t.realName === formData.instructor
      );
      if (matchedTeacher) {
        console.log('自动匹配到教师:', matchedTeacher.name || matchedTeacher.realName, 'ID:', matchedTeacher._id);
        setFormData(prev => ({
          ...prev,
          teacherId: matchedTeacher._id || ''
        }));
      } else {
        console.log('未找到匹配的教师');
      }
    }
  }, [teachers, isModalOpen, editingCourse, formData.teacherId, formData.instructor]);

  const handleAdd = () => {
    setEditingCourse(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleEdit = (record: Course) => {
    console.log('编辑课程原始数据:', JSON.stringify(record, null, 2));
    
    // 尝试从 record 获取 teacherId，如果没有则尝试根据 instructor 名称匹配
    let teacherId = (record as any).teacherId || '';
    
    // 如果没有 teacherId 但有 instructor，尝试从教师列表匹配
    if (!teacherId && record.instructor && teachers.length > 0) {
      const matchedTeacher = teachers.find(t => 
        t.name === record.instructor || 
        t.realName === record.instructor
      );
      if (matchedTeacher) {
        teacherId = matchedTeacher._id || '';
        console.log('根据教师名称匹配到 teacherId:', teacherId, '教师:', matchedTeacher.name || matchedTeacher.realName);
      }
    }
    
    console.log('编辑课程设置 teacherId:', teacherId, 'instructor:', record.instructor);
    
    // 处理分类：可能是 category 或 categoryId
    let categoryValue = record.category || '';
    if (!categoryValue && (record as any).categoryId && categories.length > 0) {
      // 如果只有 categoryId，查找对应的分类名称
      const matchedCategory = categories.find(c => c._id === (record as any).categoryId);
      if (matchedCategory) {
        categoryValue = matchedCategory.name;
        console.log('根据 categoryId 匹配到分类:', matchedCategory.name);
      }
    }
    
    setEditingCourse(record);
    setFormData({
      title: record.title || '',
      description: record.description || '',
      category: categoryValue || '基础入门',
      level: record.level || '初级',
      price: record.price || 0,
      originalPrice: record.originalPrice || 0,
      duration: record.duration || 0,
      coverImage: record.coverImage || '',
      status: record.status || 'draft',
      instructor: record.instructor || '',
      teacherId: teacherId,
      maxStudents: record.maxStudents || 50,
    });
    setIsModalOpen(true);
  };

  // 处理教师选择变化
  const handleTeacherChange = (teacherId: string) => {
    const selectedTeacher = teachers.find(t => t._id === teacherId);
    setFormData({
      ...formData,
      teacherId,
      instructor: selectedTeacher?.name || selectedTeacher?.realName || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这门课程吗？此操作不可恢复。')) return;
    
    try {
      await courseService.delete(id);
      await loadCourses();
      alert('删除成功');
    } catch (error) {
      console.error('删除课程失败:', error);
      alert('删除失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 根据分类名称查找对应的 categoryId
      const selectedCategory = categories.find(c => c.name === formData.category);
      const categoryId = selectedCategory?._id || '';
      
      // 构建保存数据，确保字段与数据库匹配
      const saveData: any = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        categoryId: categoryId,
        level: formData.level,
        price: Number(formData.price) || 0,
        originalPrice: Number(formData.originalPrice) || 0,
        duration: Number(formData.duration) || 0,
        coverImage: formData.coverImage,
        status: formData.status,
        instructor: formData.instructor || '',
        maxStudents: Number(formData.maxStudents) || 50,
        lessons: editingCourse?.lessons || 0,
        salesCount: editingCourse?.salesCount || 0,
        rating: editingCourse?.rating || 5,
        reviewCount: editingCourse?.reviewCount || 0,
        tags: editingCourse?.tags || [],
        // 强制包含 teacherId，即使没有也要保存为空字符串以覆盖旧值
        teacherId: formData.teacherId || '',
      };

      console.log('保存课程数据:', JSON.stringify(saveData, null, 2));
      console.log('编辑的课程ID:', editingCourse?._id);
      console.log('FormData teacherId:', formData.teacherId);
      console.log('FormData instructor:', formData.instructor);
      console.log('saveData 中 teacherId:', saveData.teacherId);

      if (editingCourse && editingCourse._id) {
        console.log('调用 CloudAdminService.update，ID:', editingCourse._id);
        console.log('保存数据:', JSON.stringify(saveData, null, 2));
        
        // 通过云函数更新课程（生产环境正确做法）
        const updateData = {
          ...saveData,
          teacherId: formData.teacherId || '',
          instructor: formData.instructor || '',
        };
        console.log('更新数据:', JSON.stringify(updateData, null, 2));
        
        const result = await CloudAdminService.update('courses', editingCourse._id, updateData);
        console.log('CloudAdminService.update 返回:', result);
        
        if (result && result.success) {
          alert('课程更新成功');
        } else {
          throw new Error(result?.message || result?.error || '更新失败');
        }
      } else {
        console.log('调用 CloudAdminService.add 创建新课程');
        const result = await CloudAdminService.add('courses', saveData);
        console.log('CloudAdminService.add 返回:', result);
        if (!result) {
          throw new Error('创建课程失败');
        }
        alert('课程创建成功');
      }
      setIsModalOpen(false);
      await loadCourses();
    } catch (error: any) {
      console.error('保存课程失败，完整错误:', error);
      console.error('错误堆栈:', error.stack);
      alert('保存失败: ' + (error.message || '未知错误'));
    } finally {
      setSubmitting(false);
    }
  };

  // 章节管理方法
  const handleManageLessons = async (course: Course) => {
    setManagingCourse(course);
    setIsLessonModalOpen(true);
    setLessonsLoading(true);
    try {
      const data = await courseService.getLessons(course._id!);
      setLessons(data);
    } catch (error) {
      console.error('加载章节失败:', error);
    } finally {
      setLessonsLoading(false);
    }
  };

  const handleAddLesson = () => {
    setEditingLesson(null);
    setLessonFormData({
      ...initialLessonFormData,
      order: lessons.length + 1,
    });
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonFormData({
      title: lesson.title || '',
      description: lesson.description || '',
      videoUrl: lesson.videoUrl || '',
      videoDuration: lesson.videoDuration || 0,
      isFree: lesson.isFree || false,
      order: lesson.order || 0,
      pdfFile: (lesson as any).pdfFile || null,
    });
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('确定要删除这个章节吗？')) return;
    
    try {
      await courseService.deleteLesson(lessonId);
      if (managingCourse) {
        const data = await courseService.getLessons(managingCourse._id!);
        setLessons(data);
      }
      alert('删除成功');
    } catch (error) {
      console.error('删除章节失败:', error);
      alert('删除失败');
    }
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingCourse) return;

    setLessonSubmitting(true);
    try {
      if (editingLesson) {
        await courseService.updateLesson(editingLesson._id!, lessonFormData);
      } else {
        await courseService.createLesson({
          ...lessonFormData,
          courseId: managingCourse._id!,
        });
      }
      const data = await courseService.getLessons(managingCourse._id!);
      setLessons(data);
      setEditingLesson(null);
      setLessonFormData(initialLessonFormData);
      alert(editingLesson ? '章节更新成功' : '章节创建成功');
    } catch (error) {
      console.error('保存章节失败:', error);
      alert('保存失败');
    } finally {
      setLessonSubmitting(false);
    }
  };

  const handleMoveLesson = async (index: number, direction: 'up' | 'down') => {
    if (!managingCourse) return;

    const newLessons = [...lessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newLessons.length) return;

    // 交换位置
    [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];

    // 更新排序
    const lessonIds = newLessons.map(l => l._id!);
    try {
      await courseService.reorderLessons(managingCourse._id!, lessonIds);
      setLessons(newLessons);
    } catch (error) {
      console.error('排序失败:', error);
    }
  };

  // 视频上传处理
  const handleVideoUpload = async (file: File) => {
    // 验证文件类型
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/mov'];
    if (!allowedTypes.includes(file.type)) {
      alert('请上传 MP4、WebM、MOV 格式的视频文件');
      return;
    }
    // 验证文件大小（最大500MB）
    if (file.size > 500 * 1024 * 1024) {
      alert('视频文件大小不能超过 500MB');
      return;
    }

    setUploadingVideo(true);
    setVideoProgress(0);

    try {
      // 如果已有视频，先删除旧文件
      if (lessonFormData.videoUrl?.startsWith('cloud://')) {
        await deleteFile(lessonFormData.videoUrl);
      }

      // 上传新文件
      const result = await uploadFile(file, 'lessons/video', (progress) => {
        setVideoProgress(Math.round(progress * 100));
      });

      if (result.success && result.fileID) {
        setLessonFormData({ ...lessonFormData, videoUrl: result.fileID });
        alert('视频上传成功');
      } else {
        alert(result.message || '上传失败');
      }
    } catch (error) {
      console.error('视频上传失败:', error);
      alert('视频上传失败');
    } finally {
      setUploadingVideo(false);
    }
  };

  // 点击上传视频
  const handleVideoInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleVideoUpload(file);
    }
  };

  // 视频拖拽处理
  const handleVideoDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(true);
  };

  const handleVideoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(false);
  };

  const handleVideoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleVideoUpload(file);
    }
  };

  // 删除视频
  const handleDeleteVideo = async () => {
    if (!lessonFormData.videoUrl?.startsWith('cloud://')) {
      setLessonFormData({ ...lessonFormData, videoUrl: '' });
      return;
    }
    if (!window.confirm('确定要删除该视频文件吗？')) return;
    try {
      await deleteFile(lessonFormData.videoUrl);
      setLessonFormData({ ...lessonFormData, videoUrl: '' });
      alert('视频已删除');
    } catch (error) {
      console.error('删除视频失败:', error);
      alert('删除视频失败');
    }
  };

  // PDF上传处理
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (file.type !== 'application/pdf') {
      alert('请上传 PDF 格式的文件');
      return;
    }
    // 验证文件大小（最大50MB）
    if (file.size > 50 * 1024 * 1024) {
      alert('PDF文件大小不能超过 50MB');
      return;
    }

    setUploadingPdf(true);
    setPdfProgress(0);

    try {
      // 如果已有PDF，先删除旧文件
      if (lessonFormData.pdfFile?.fileID) {
        await deleteFile(lessonFormData.pdfFile.fileID);
      }

      // 上传新文件
      const result = await uploadFile(file, 'lessons/pdf', (progress) => {
        setPdfProgress(Math.round(progress * 100));
      });

      if (result.success && result.fileID) {
        setLessonFormData({
          ...lessonFormData,
          pdfFile: { fileID: result.fileID, name: file.name, size: file.size },
        });
        alert('PDF上传成功');
      } else {
        alert(result.message || '上传失败');
      }
    } catch (error) {
      console.error('PDF上传失败:', error);
      alert('PDF上传失败');
    } finally {
      setUploadingPdf(false);
    }
  };

  // 删除PDF
  const handleDeletePdf = async () => {
    if (!lessonFormData.pdfFile?.fileID) return;
    if (!window.confirm('确定要删除该PDF文件吗？')) return;
    try {
      await deleteFile(lessonFormData.pdfFile.fileID);
      setLessonFormData({ ...lessonFormData, pdfFile: null });
      alert('PDF已删除');
    } catch (error) {
      console.error('删除PDF失败:', error);
      alert('删除PDF失败');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 封面图片上传处理
  const handleCoverUpload = async (file: File) => {
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('请上传 JPG、PNG、GIF、WebP 格式的图片文件');
      return;
    }
    // 验证文件大小（最大10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('图片文件大小不能超过 10MB');
      return;
    }

    setUploadingCover(true);
    setCoverProgress(0);

    try {
      // 如果已有封面图片，先删除旧文件
      if (formData.coverImage?.startsWith('cloud://')) {
        await deleteFile(formData.coverImage);
      }

      // 上传新文件
      const result = await uploadFile(file, 'courses/covers', (progress) => {
        setCoverProgress(Math.round(progress * 100));
      });

      if (result.success && result.fileID) {
        setFormData({ ...formData, coverImage: result.fileID });
        alert('封面图片上传成功');
      } else {
        alert(result.message || '上传失败');
      }
    } catch (error) {
      console.error('封面图片上传失败:', error);
      alert('封面图片上传失败');
    } finally {
      setUploadingCover(false);
    }
  };

  // 点击上传封面图片
  const handleCoverInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleCoverUpload(file);
    }
  };

  // 封面图片拖拽处理
  const handleCoverDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoverDragActive(true);
  };

  const handleCoverDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoverDragActive(false);
  };

  const handleCoverDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoverDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleCoverUpload(file);
    }
  };

  // 删除封面图片
  const handleDeleteCover = async () => {
    if (!formData.coverImage?.startsWith('cloud://')) {
      setFormData({ ...formData, coverImage: '' });
      return;
    }
    if (!window.confirm('确定要删除该封面图片吗？')) return;
    try {
      await deleteFile(formData.coverImage);
      setFormData({ ...formData, coverImage: '' });
      alert('封面图片已删除');
    } catch (error) {
      console.error('删除封面图片失败:', error);
      alert('删除封面图片失败');
    }
  };

  // ★ 加载权限统计
  const handleViewPermissionStats = async (course: Course) => {
    setSelectedCourseForStats(course);
    setIsPermissionStatsModalOpen(true);
    setLoadingStats(true);
    setPermissionStats(null);

    try {
      // 确保用户已登录
      await cloudbaseApp.auth().getLoginState();
      
      const db = cloudbaseApp.database();
      
      // 从 course_permissions 集合获取统计数据
      const permResult = await db.collection('course_permissions')
        .where({ courseId: course._id })
        .limit(1000)
        .get();

      const permissions = permResult.data || [];
      
      const stats = {
        total: permissions.length,
        purchase: permissions.filter((p: any) => p.source === 'purchase').length,
        registration: permissions.filter((p: any) => p.source === 'registration').length,
        admin: permissions.filter((p: any) => p.source === 'admin_grant').length,
        expired: permissions.filter((p: any) => p.status === 'expired' || p.status === 'revoked').length,
      };

      setPermissionStats(stats);
    } catch (error: any) {
      console.error('加载权限统计失败:', error);
      // 显示友好的错误提示
      const errorMsg = error?.message || '加载权限统计失败';
      setPermissionStats({ total: 0, purchase: 0, registration: 0, admin: 0, expired: 0 });
      console.log('权限统计加载失败，可能是权限集合为空或无数据');
    } finally {
      setLoadingStats(false);
    }
  };

  const columns = [
    {
      key: 'coverImage',
      title: '封面',
      render: (url: string) => (
        <div className="w-16 h-9 rounded overflow-hidden">
          <img src={url || 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=64'} alt="" className="w-full h-full object-cover" />
        </div>
      ),
    },
    { key: 'title', title: '课程名称' },
    { key: 'category', title: '分类', render: (category: string, record: any) => {
      // 如果 category 为空但有 categoryId，尝试查找分类名称
      if (!category && record.categoryId && categories.length > 0) {
        const cat = categories.find(c => c._id === record.categoryId);
        return cat?.name || record.categoryId;
      }
      return category || '-';
    }},
    { key: 'instructor', title: '授课教师', render: (instructor: string, record: any) => (
      <div className="flex items-center gap-1">
        <User size={14} className="text-gray-400" />
        <span>{instructor || '-'}</span>
      </div>
    )},
    { key: 'price', title: '价格', render: (price: number) => `¥${price ?? 0}` },
    { key: 'status', title: '状态', render: (status: string) => {
      const statusMap: any = {
        draft: { text: '草稿', class: 'badge badge-ghost' },
        published: { text: '已发布', class: 'badge badge-success' },
        archived: { text: '已归档', class: 'badge badge-neutral' },
      };
      const s = statusMap[status] || { text: status, class: 'badge' };
      return <span className={s.class}>{s.text}</span>;
    }},
    { key: 'salesCount', title: '销量' },
    { key: 'createdAt', title: '创建时间', render: (date: string) => {
      if (!date || date === 'Invalid Date') return '-';
      try {
        return new Date(date).toLocaleDateString();
      } catch {
        return '-';
      }
    }},
  ];

  return (
    <>
      <AdminPageTemplate
        title="课程管理"
        columns={columns}
        dataSource={courses}
        loading={loading}
        total={total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        onSearch={loadCourses}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderActions={(record: Course) => (
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-square btn-ghost text-purple-500"
              onClick={() => handleViewPermissionStats(record)}
              title="权限统计"
            >
              <TrendingUp size={16} />
            </button>
            <button
              className="btn btn-sm btn-square btn-ghost text-blue-500"
              onClick={() => handleManageLessons(record)}
              title="管理章节"
            >
              <List size={16} />
            </button>
            <button
              className="btn btn-sm btn-square btn-ghost"
              onClick={() => handleEdit(record)}
            >
              <Save size={16} />
            </button>
            <button
              className="btn btn-sm btn-square btn-ghost text-red-500"
              onClick={() => handleDelete(record._id!)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      />

      {/* 添加/编辑课程弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-base-100 border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingCourse ? '编辑课程' : '添加课程'}
              </h2>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">课程标题 *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="请输入课程标题"
                  />
                </div>

                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">课程描述</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-24"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="请输入课程描述"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">分类 *</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    disabled={categoriesLoading}
                  >
                    {categoriesLoading ? (
                      <option value="">加载中...</option>
                    ) : categories.length > 0 ? (
                      categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
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

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">难度等级</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  >
                    {LEVELS.map((level) => (
                      <option key={level} value={level}>{level || '不选'}</option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">现价 (¥) *</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                    min={0}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">原价 (¥)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                    min={0}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">课程时长 (分钟)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    min={0}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">最大学员数</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={formData.maxStudents}
                    onChange={(e) => setFormData({ ...formData, maxStudents: Number(e.target.value) })}
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
                          src={formData.coverImage.startsWith('cloud://') ? formData.coverImage.replace('cloud://', 'https://') : formData.coverImage}
                          alt="封面预览"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {formData.coverImage.startsWith('cloud://') ? '已上传封面' : '外部图片链接'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{formData.coverImage}</p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost text-error"
                        onClick={handleDeleteCover}
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleCoverDragEnter}
                      onDragLeave={handleCoverDragLeave}
                      onDragOver={handleCoverDragOver}
                      onDrop={handleCoverDrop}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        coverDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary hover:bg-base-200'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
                        hidden
                        id="course-cover-upload"
                        onChange={handleCoverInputChange}
                      />
                      <label htmlFor="course-cover-upload" className="cursor-pointer block">
                        {uploadingCover ? (
                          <div>
                            <p className="text-sm mb-2">上传中 {coverProgress}%</p>
                            <progress className="progress progress-primary w-full" value={coverProgress} max="100" />
                          </div>
                        ) : (
                          <>
                            <ImageIcon className={`mx-auto mb-2 ${coverDragActive ? 'text-primary' : 'text-gray-400'}`} size={40} />
                            <p className={`text-sm ${coverDragActive ? 'text-primary' : 'text-gray-500'}`}>
                              {coverDragActive ? '松开以上传封面' : '拖拽图片到此处，或点击上传'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG、GIF、WebP 格式，最大 10MB</p>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">授课教师 *</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.teacherId}
                    onChange={(e) => handleTeacherChange(e.target.value)}
                    required
                    disabled={teachersLoading}
                  >
                    <option value="">{teachersLoading ? '加载中...' : '请选择授课教师'}</option>
                    {teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.name || teacher.realName} {teacher.specialty ? `(${teacher.specialty.join(', ')})` : ''}
                      </option>
                    ))}
                  </select>
                  {teachers.length === 0 && !teachersLoading && (
                    <span className="text-xs text-warning mt-1">暂无教师数据，请先添加教师</span>
                  )}
                </div>

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
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      />
                      <span className="label-text">草稿</span>
                    </label>
                    <label className="label cursor-pointer gap-2">
                      <input
                        type="radio"
                        className="radio radio-success"
                        value="published"
                        checked={formData.status === 'published'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      />
                      <span className="label-text">已发布</span>
                    </label>
                    <label className="label cursor-pointer gap-2">
                      <input
                        type="radio"
                        className="radio radio-neutral"
                        value="archived"
                        checked={formData.status === 'archived'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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
                  onClick={() => setIsModalOpen(false)}
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
                      {editingCourse ? '保存修改' : '创建课程'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 章节管理弹窗 */}
      {isLessonModalOpen && managingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-base-100 border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">章节管理</h2>
                <p className="text-sm text-gray-500">{managingCourse.title}</p>
              </div>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => {
                  setIsLessonModalOpen(false);
                  setManagingCourse(null);
                  setLessons([]);
                  setEditingLesson(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* 章节列表 */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">章节列表 ({lessons.length})</h3>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleAddLesson}
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
                        <div className="text-gray-400 text-sm w-8">{index + 1}</div>
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
                                {Math.floor(lesson.videoDuration / 60)}:{(lesson.videoDuration % 60).toString().padStart(2, '0')}
                              </span>
                            )}
                            {(lesson as any).pdfFile?.fileID && (
                              <span className="flex items-center gap-1 text-error">
                                <FileText size={12} />
                                PDF
                              </span>
                            )}
                            {lesson.isFree && <span className="badge badge-sm badge-success">试看</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-xs btn-square btn-ghost"
                            onClick={() => handleMoveLesson(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            className="btn btn-xs btn-square btn-ghost"
                            onClick={() => handleMoveLesson(index, 'down')}
                            disabled={index === lessons.length - 1}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            className="btn btn-xs btn-square btn-ghost"
                            onClick={() => handleEditLesson(lesson)}
                          >
                            <Save size={14} />
                          </button>
                          <button
                            className="btn btn-xs btn-square btn-ghost text-red-500"
                            onClick={() => handleDeleteLesson(lesson._id!)}
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
                <form onSubmit={handleLessonSubmit} className="border-t pt-6">
                  <h3 className="font-semibold mb-4">
                    {editingLesson ? '编辑章节' : '添加章节'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control md:col-span-2">
                      <label className="label">
                        <span className="label-text">章节标题 *</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered"
                        value={lessonFormData.title}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                        required
                        placeholder="请输入章节标题"
                      />
                    </div>

                    <div className="form-control md:col-span-2">
                      <label className="label">
                        <span className="label-text">章节描述</span>
                      </label>
                      <textarea
                        className="textarea textarea-bordered"
                        value={lessonFormData.description}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
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
                              {lessonFormData.videoUrl.startsWith('cloud://') ? '已上传视频' : '外部视频链接'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{lessonFormData.videoUrl}</p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost text-error"
                            onClick={handleDeleteVideo}
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragEnter={handleVideoDragEnter}
                          onDragLeave={handleVideoDragLeave}
                          onDragOver={handleVideoDragOver}
                          onDrop={handleVideoDrop}
                          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                            videoDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary hover:bg-base-200'
                          }`}
                        >
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/ogg,video/mov,video/quicktime"
                            hidden
                            id="lesson-video-upload"
                            onChange={handleVideoInputChange}
                          />
                          <label htmlFor="lesson-video-upload" className="cursor-pointer block">
                            {uploadingVideo ? (
                              <div>
                                <p className="text-sm mb-2">上传中 {videoProgress}%</p>
                                <progress className="progress progress-primary w-full" value={videoProgress} max="100" />
                              </div>
                            ) : (
                              <>
                                <Video className={`mx-auto mb-2 ${videoDragActive ? 'text-primary' : 'text-gray-400'}`} size={40} />
                                <p className={`text-sm ${videoDragActive ? 'text-primary' : 'text-gray-500'}`}>
                                  {videoDragActive ? '松开以上传视频' : '拖拽视频到此处，或点击上传'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">支持 MP4、WebM、MOV 格式，最大 500MB</p>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">视频时长 (秒)</span>
                      </label>
                      <input
                        type="number"
                        className="input input-bordered"
                        value={lessonFormData.videoDuration}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, videoDuration: Number(e.target.value) })}
                        min={0}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">排序</span>
                      </label>
                      <input
                        type="number"
                        className="input input-bordered"
                        value={lessonFormData.order}
                        onChange={(e) => setLessonFormData({ ...lessonFormData, order: Number(e.target.value) })}
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
                            <p className="font-medium text-sm truncate">{lessonFormData.pdfFile.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(lessonFormData.pdfFile.size)}</p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost text-error"
                            onClick={handleDeletePdf}
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
                            onChange={handlePdfUpload}
                          />
                          <label htmlFor="lesson-pdf-upload" className="cursor-pointer block">
                            {uploadingPdf ? (
                              <div>
                                <p className="text-sm mb-2">上传中 {pdfProgress}%</p>
                                <progress className="progress progress-error w-full" value={pdfProgress} max="100" />
                              </div>
                            ) : (
                              <>
                                <Upload className="mx-auto mb-2 text-gray-400" size={28} />
                                <p className="text-sm text-gray-500">点击上传PDF课件</p>
                                <p className="text-xs text-gray-400 mt-1">支持 PDF 格式，最大 50MB</p>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="form-control md:col-span-2">
                      <label className="label cursor-pointer justify-start gap-3">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={lessonFormData.isFree}
                          onChange={(e) => setLessonFormData({ ...lessonFormData, isFree: e.target.checked })}
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
                        setEditingLesson(null);
                        setLessonFormData(initialLessonFormData);
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
      )}

      {/* ★ 权限统计模态框 - 增强版 */}
      {isPermissionStatsModalOpen && selectedCourseForStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">课程权限统计</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedCourseForStats.title}</p>
                </div>
                <button
                  onClick={() => {
                    setIsPermissionStatsModalOpen(false);
                    setSelectedCourseForStats(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {loadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : permissionStats ? (
                <div className="space-y-4">
                  {/* 总计 - 增强版 */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield size={24} className="text-purple-600" />
                        <span className="font-semibold text-purple-800">总权限数</span>
                      </div>
                      <span className="text-3xl font-bold text-purple-700">{permissionStats.total}</span>
                    </div>
                    {/* 有效率显示 */}
                    {permissionStats.total > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-purple-600 mb-1">
                          <span>有效权限占比</span>
                          <span>{Math.round((permissionStats.total - permissionStats.expired) / permissionStats.total * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${(permissionStats.total - permissionStats.expired) / permissionStats.total * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 权限来源分布 - 增强版 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen size={16} className="text-blue-600" />
                        <span className="text-sm text-blue-700">购买获得</span>
                      </div>
                      <p className="text-xl font-bold text-blue-800">{permissionStats.purchase}</p>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <UserCheck size={16} className="text-green-600" />
                        <span className="text-sm text-green-700">报名获得</span>
                      </div>
                      <p className="text-xl font-bold text-green-800">{permissionStats.registration}</p>
                    </div>
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <User size={16} className="text-orange-600" />
                        <span className="text-sm text-orange-700">管理员授权</span>
                      </div>
                      <p className="text-xl font-bold text-orange-800">{permissionStats.admin}</p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle size={16} className="text-gray-600" />
                        <span className="text-sm text-gray-700">已失效</span>
                      </div>
                      <p className="text-xl font-bold text-gray-800">{permissionStats.expired}</p>
                    </div>
                  </div>

                  {/* ★ 快捷操作按钮 */}
                  {permissionStats.expired > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700 mb-2">
                        <AlertTriangle size={12} className="inline mr-1" />
                        有 {permissionStats.expired} 个权限已失效
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            alert('批量续期功能开发中...');
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                        >
                          <RefreshCw size={12} className="inline mr-1" />
                          批量续期
                        </button>
                        <button
                          onClick={() => {
                            alert('清理失效权限功能开发中...');
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          <Trash2 size={12} className="inline mr-1" />
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
                  onClick={() => {
                    alert('查看详情功能开发中...');
                  }}
                  className="flex-1 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  查看详情
                </button>
                <button
                  onClick={() => {
                    setIsPermissionStatsModalOpen(false);
                    setSelectedCourseForStats(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
