// ============================================================================
// useCourses Hook - 课程管理业务逻辑
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { CloudAdminService } from '@/services/CloudAdminService';
import { adminApi } from '@/services/adminApiService';
import { courseService } from '@/services/database';
import { useDictionary } from '@/admin/hooks/useDictionary';
import { useConfirm } from '@/admin/hooks/useConfirm';
import { toast } from '@/components/Toast';
import { uploadFile, deleteFile } from '@/services/storageService';
import type { Course, Lesson } from '@/types';

// ============================================================================
// 类型定义
// ============================================================================

export interface CourseFormData {
  title: string;
  description: string;
  category: string;
  categoryId: string;  // 新增：分类ID
  sourceId: string;     // 新增：体系ID
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

export interface LessonFormData {
  title: string;
  description: string;
  videoUrl: string;
  videoDuration: number;
  isFree: boolean;
  order: number;
  pdfFile?: { fileID: string; name: string; size: number } | null;
}

export interface PermissionStats {
  total: number;
  purchase: number;
  registration: number;
  admin: number;
  expired: number;
}

export const initialCourseFormData: CourseFormData = {
  title: '',
  description: '',
  category: '基础入门',
  categoryId: '',
  sourceId: '',
  level: '初级工',
  price: 0,
  originalPrice: 0,
  duration: 0,
  coverImage: '',
  status: 'draft',
  instructor: '',
  teacherId: '',
  maxStudents: 50,
};

export const initialLessonFormData: LessonFormData = {
  title: '',
  description: '',
  videoUrl: '',
  videoDuration: 0,
  isFree: false,
  order: 0,
};

// ============================================================================
// Hook 定义
// ============================================================================

export function useCourses() {
  // 课程列表状态
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // 教师列表
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);

  // 分类列表
  const [categories, setCategories] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // 体系列表（新增）
  const [sources, setSources] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  // 筛选状态
  const [selectedSource, setSelectedSource] = useState<string>('');  // 体系的 _id（用于查询）
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');  // 体系的 _id（别名，统一使用 _id）

  // 字典数据
  const { options: levelOptions, loading: levelsLoading } = useDictionary({ groupKey: 'courseLevels' });
  const { options: categoryOptions } = useDictionary({ groupKey: 'courseCategories' });

  // 弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseFormData>(initialCourseFormData);
  const [submitting, setSubmitting] = useState(false);

  // 确认弹窗
  const { confirm, ConfirmDialog } = useConfirm();

  // 章节管理状态
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [managingCourse, setManagingCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonFormData, setLessonFormData] = useState<LessonFormData>(initialLessonFormData);
  const [lessonSubmitting, setLessonSubmitting] = useState(false);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // 上传状态
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDragActive, setVideoDragActive] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfDragActive] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [coverDragActive, setCoverDragActive] = useState(false);

  // 权限统计
  const [isPermissionStatsModalOpen, setIsPermissionStatsModalOpen] = useState(false);
  const [selectedCourseForStats, setSelectedCourseForStats] = useState<Course | null>(null);
  const [permissionStats, setPermissionStats] = useState<PermissionStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // 加载课程列表
  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      // 构建查询条件
      const query: Record<string, any> = {};
      // 使用 selectedSourceId（体系 _id）
      if (selectedSourceId) {
        query.sourceId = selectedSourceId;
      }
      
      // 使用 adminApi（HTTP 方式）查询
      const result = await adminApi.list<Course>('courses', query, {
        page,
        pageSize: 10,
        orderBy: 'createdAt',
        order: 'desc',
      });
      setCourses(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('加载课程失败:', error);
      setCourses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, selectedSourceId]);

  // 加载体系列表（新增）
  const loadSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const result = await adminApi.listSources<{ _id: string; name: string; code: string }>({ limit: 100 });
      setSources(result.data);
      // 如果没有选择体系，自动选择第一个
      if (!selectedSourceId && result.data.length > 0) {
        const firstSource = result.data[0];
        setSelectedSource(firstSource._id);
        setSelectedSourceId(firstSource._id);
      }
    } catch (error) {
      console.error('加载体系列表失败:', error);
    } finally {
      setSourcesLoading(false);
    }
  }, [selectedSourceId]);

  // 加载教师列表
  const loadTeachers = useCallback(async () => {
    setTeachersLoading(true);
    try {
      const result = await adminApi.listTeachers({ status: 'active' }, { limit: 100 });
      setTeachers(result.data);
    } catch (error) {
      console.error('加载教师列表失败:', error);
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const result = await adminApi.listCategories<{ _id: string; name: string; code: string }>({ status: 'active' }, { limit: 100 });
      setCategories(result.data);
    } catch (error) {
      console.error('加载分类列表异常:', error);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadSources();
    loadTeachers();
    loadCategories();
  }, []);

  // 当体系加载完成后，加载课程
  useEffect(() => {
    if (selectedSourceId) {
      loadCourses();
    }
  }, [selectedSourceId, page]);

  // 当教师列表加载完成后，如果正在编辑课程且 teacherId 为空，自动匹配
  useEffect(() => {
    if (isModalOpen && editingCourse && teachers.length > 0 && !formData.teacherId && formData.instructor) {
      const matchedTeacher = teachers.find(
        (t) => t.name === formData.instructor || t.realName === formData.instructor
      );
      if (matchedTeacher) {
        setFormData((prev) => ({
          ...prev,
          teacherId: matchedTeacher._id || '',
        }));
      }
    }
  }, [teachers, isModalOpen, editingCourse, formData.teacherId, formData.instructor]);

  // 新增课程
  const handleAdd = useCallback(() => {
    setEditingCourse(null);
    setFormData({
      ...initialCourseFormData,
      sourceId: selectedSourceId || '',  // 自动使用当前筛选的体系
    });
    setIsModalOpen(true);
  }, [selectedSourceId]);

  // 编辑课程
  const handleEdit = useCallback(
    (record: Course) => {
      let teacherId = (record as any).teacherId || '';
      if (!teacherId && record.instructor && teachers.length > 0) {
        const matchedTeacher = teachers.find(
          (t) => t.name === record.instructor || t.realName === record.instructor
        );
        if (matchedTeacher) {
          teacherId = matchedTeacher._id || '';
        }
      }

      let categoryValue = record.category || '';
      if (!categoryValue && (record as any).categoryId && categories.length > 0) {
        const matchedCategory = categories.find((c) => c._id === (record as any).categoryId);
        if (matchedCategory) {
          categoryValue = matchedCategory.name;
        }
      }

      setEditingCourse(record);
      setFormData({
        title: record.title || '',
        description: record.description || '',
        category: categoryValue || '基础入门',
        categoryId: (record as any).categoryId || '',
        sourceId: (record as any).sourceId || selectedSourceId || '',  // 保持原有的 sourceId
        level: record.level || '初级工',
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
    },
    [teachers, categories, selectedSourceId]
  );

  // 删除课程
  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: '删除确认',
        message: '确定要删除这门课程吗？此操作不可恢复。',
        variant: 'danger',
      });
      if (!ok) return;

      try {
        await courseService.delete(id);
        await loadCourses();
        toast.success('删除成功');
      } catch (error) {
        console.error('删除课程失败:', error);
        toast.error('删除失败');
      }
    },
    [confirm, loadCourses]
  );

  // 处理教师选择变化
  const handleTeacherChange = useCallback(
    (teacherId: string) => {
      const selectedTeacher = teachers.find((t) => t._id === teacherId);
      setFormData({
        ...formData,
        teacherId,
        instructor: selectedTeacher?.name || selectedTeacher?.realName || '',
      });
    },
    [teachers, formData]
  );

  // 提交课程表单
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);

      try {
        const selectedCategory = categories.find((c) => c.name === formData.category);
        const categoryId = selectedCategory?._id || '';

        const saveData: any = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          categoryId: categoryId,
          sourceId: formData.sourceId || selectedSourceId,  // 新增：体系ID
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
          teacherId: formData.teacherId || '',
        };

        if (editingCourse && editingCourse._id) {
          const updateData = {
            ...saveData,
            teacherId: formData.teacherId || '',
            instructor: formData.instructor || '',
          };
          const result = await CloudAdminService.update('courses', editingCourse._id, updateData);
          if (result && result.success) {
            toast.success('课程更新成功');
          } else {
            throw new Error((result as any)?.message || (result as any)?.error || '更新失败');
          }
        } else {
          const result = await CloudAdminService.add('courses', saveData);
          if (!result) {
            throw new Error('创建课程失败');
          }
          toast.success('课程创建成功');
        }
        setIsModalOpen(false);
        await loadCourses();
      } catch (error: any) {
        console.error('保存课程失败:', error);
        toast.error('保存失败: ' + (error.message || '未知错误'));
      } finally {
        setSubmitting(false);
      }
    },
    [formData, categories, editingCourse, loadCourses]
  );

  // ========== 章节管理 ==========

  const handleManageLessons = useCallback(async (course: Course) => {
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
  }, []);

  const handleAddLesson = useCallback(() => {
    setEditingLesson(null);
    setLessonFormData({
      ...initialLessonFormData,
      order: lessons.length + 1,
    });
  }, [lessons.length]);

  const handleEditLesson = useCallback((lesson: Lesson) => {
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
  }, []);

  const handleDeleteLesson = useCallback(
    async (lessonId: string) => {
      const ok = await confirm({
        title: '删除确认',
        message: '确定要删除这个章节吗？',
        variant: 'danger',
      });
      if (!ok) return;

      try {
        await courseService.deleteLesson(lessonId);
        if (managingCourse) {
          const data = await courseService.getLessons(managingCourse._id!);
          setLessons(data);
        }
        toast.success('删除成功');
      } catch (error) {
        console.error('删除章节失败:', error);
        toast.error('删除失败');
      }
    },
    [confirm, managingCourse]
  );

  const handleLessonSubmit = useCallback(
    async (e: React.FormEvent) => {
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
        toast.success(editingLesson ? '章节更新成功' : '章节创建成功');
      } catch (error) {
        console.error('保存章节失败:', error);
        toast.error('保存失败');
      } finally {
        setLessonSubmitting(false);
      }
    },
    [managingCourse, editingLesson, lessonFormData]
  );

  const handleMoveLesson = useCallback(
    async (index: number, direction: 'up' | 'down') => {
      if (!managingCourse) return;

      const newLessons = [...lessons];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= newLessons.length) return;

      [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];

      const lessonIds = newLessons.map((l) => l._id!);
      try {
        await courseService.reorderLessons(managingCourse._id!, lessonIds);
        setLessons(newLessons);
      } catch (error) {
        console.error('排序失败:', error);
      }
    },
    [managingCourse, lessons]
  );

  // ========== 视频上传 ==========

  const handleVideoUpload = useCallback(
    async (file: File) => {
      const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/mov'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('请上传 MP4、WebM、MOV 格式的视频文件');
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        toast.error('视频文件大小不能超过 500MB');
        return;
      }

      setUploadingVideo(true);
      setVideoProgress(0);

      try {
        if (lessonFormData.videoUrl?.startsWith('cloud://')) {
          await deleteFile(lessonFormData.videoUrl);
        }

        const result = await uploadFile(file, 'lessons/video', (progress) => {
          setVideoProgress(Math.round(progress * 100));
        });

        if (result.success && result.fileID) {
          setLessonFormData({ ...lessonFormData, videoUrl: result.fileID });
          toast.success('视频上传成功');
        } else {
          toast.error(result.message || '上传失败');
        }
      } catch (error) {
        console.error('视频上传失败:', error);
        toast.error('视频上传失败');
      } finally {
        setUploadingVideo(false);
      }
    },
    [lessonFormData]
  );

  const handleVideoInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleVideoUpload(file);
      }
    },
    [handleVideoUpload]
  );

  const handleVideoDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(true);
  }, []);

  const handleVideoDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(false);
  }, []);

  const handleVideoDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleVideoDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setVideoDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleVideoUpload(file);
      }
    },
    [handleVideoUpload]
  );

  const handleDeleteVideo = useCallback(async () => {
    if (!lessonFormData.videoUrl?.startsWith('cloud://')) {
      setLessonFormData({ ...lessonFormData, videoUrl: '' });
      return;
    }
    const ok = await confirm({
      title: '删除确认',
      message: '确定要删除该视频文件吗？',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteFile(lessonFormData.videoUrl);
      setLessonFormData({ ...lessonFormData, videoUrl: '' });
      toast.success('视频已删除');
    } catch (error) {
      console.error('删除视频失败:', error);
      toast.error('删除视频失败');
    }
  }, [lessonFormData, confirm]);

  // ========== PDF 上传 ==========

  const handlePdfUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        toast.error('请上传 PDF 格式的文件');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error('PDF文件大小不能超过 50MB');
        return;
      }

      setUploadingPdf(true);
      setPdfProgress(0);

      try {
        if (lessonFormData.pdfFile?.fileID) {
          await deleteFile(lessonFormData.pdfFile.fileID);
        }

        const result = await uploadFile(file, 'lessons/pdf', (progress) => {
          setPdfProgress(Math.round(progress * 100));
        });

        if (result.success && result.fileID) {
          setLessonFormData({
            ...lessonFormData,
            pdfFile: { fileID: result.fileID, name: file.name, size: file.size },
          });
          toast.success('PDF上传成功');
        } else {
          toast.error(result.message || '上传失败');
        }
      } catch (error) {
        console.error('PDF上传失败:', error);
        toast.error('PDF上传失败');
      } finally {
        setUploadingPdf(false);
      }
    },
    [lessonFormData]
  );

  const handleDeletePdf = useCallback(async () => {
    if (!lessonFormData.pdfFile?.fileID) return;
    const ok = await confirm({
      title: '删除确认',
      message: '确定要删除该PDF文件吗？',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteFile(lessonFormData.pdfFile.fileID);
      setLessonFormData({ ...lessonFormData, pdfFile: null });
      toast.success('PDF已删除');
    } catch (error) {
      console.error('删除PDF失败:', error);
      toast.error('删除PDF失败');
    }
  }, [lessonFormData, confirm]);

  // ========== 封面图片上传 ==========

  const handleCoverUpload = useCallback(
    async (file: File) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('请上传 JPG、PNG、GIF、WebP 格式的图片文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('图片文件大小不能超过 10MB');
        return;
      }

      setUploadingCover(true);
      setCoverProgress(0);

      try {
        if (formData.coverImage?.startsWith('cloud://')) {
          await deleteFile(formData.coverImage);
        }

        const result = await uploadFile(file, 'courses/covers', (progress) => {
          setCoverProgress(Math.round(progress * 100));
        });

        if (result.success && result.fileID) {
          setFormData({ ...formData, coverImage: result.fileID });
          toast.success('封面图片上传成功');
        } else {
          toast.error(result.message || '上传失败');
        }
      } catch (error) {
        console.error('封面图片上传失败:', error);
        toast.error('封面图片上传失败');
      } finally {
        setUploadingCover(false);
      }
    },
    [formData]
  );

  const handleCoverInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleCoverUpload(file);
      }
    },
    [handleCoverUpload]
  );

  const handleCoverDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoverDragActive(true);
  }, []);

  const handleCoverDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoverDragActive(false);
  }, []);

  const handleCoverDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleCoverDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCoverDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleCoverUpload(file);
      }
    },
    [handleCoverUpload]
  );

  const handleDeleteCover = useCallback(async () => {
    if (!formData.coverImage?.startsWith('cloud://')) {
      setFormData({ ...formData, coverImage: '' });
      return;
    }
    const ok = await confirm({
      title: '删除确认',
      message: '确定要删除该封面图片吗？',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteFile(formData.coverImage);
      setFormData({ ...formData, coverImage: '' });
      toast.success('封面图片已删除');
    } catch (error) {
      console.error('删除封面图片失败:', error);
      toast.error('删除封面图片失败');
    }
  }, [formData, confirm]);

  // ========== 权限统计 ==========

  const handleViewPermissionStats = useCallback(async (course: Course) => {
    setSelectedCourseForStats(course);
    setIsPermissionStatsModalOpen(true);
    setLoadingStats(true);
    setPermissionStats(null);

    try {
      const { app, ensureInit } = await import('@/utils/cloudbase');
      // ★ 关键修复：必须先确保 SDK 初始化完成
      await ensureInit();
      await app.auth().getLoginState();
      const db = app.database();

      const permResult = await db
        .collection('course_permissions')
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
      setPermissionStats({ total: 0, purchase: 0, registration: 0, admin: 0, expired: 0 });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // 关闭课程弹窗
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingCourse(null);
    setFormData(initialCourseFormData);
  }, []);

  // 关闭章节弹窗
  const closeLessonModal = useCallback(() => {
    setIsLessonModalOpen(false);
    setManagingCourse(null);
    setLessons([]);
    setEditingLesson(null);
    setLessonFormData(initialLessonFormData);
  }, []);

  // 关闭权限统计弹窗
  const closePermissionStatsModal = useCallback(() => {
    setIsPermissionStatsModalOpen(false);
    setSelectedCourseForStats(null);
    setPermissionStats(null);
  }, []);

  return {
    // 课程列表
    courses,
    loading,
    total,
    page,
    setPage,
    loadCourses,
    // 筛选
    selectedSource,
    setSelectedSource,
    selectedSourceId,
    setSelectedSourceId,
    // 教师
    teachers,
    teachersLoading,
    // 分类
    categories,
    categoriesLoading,
    // 体系
    sources,
    sourcesLoading,
    // 字典
    levelOptions,
    levelsLoading,
    categoryOptions,
    // 课程弹窗
    isModalOpen,
    editingCourse,
    formData,
    setFormData,
    submitting,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSubmit,
    closeModal,
    handleTeacherChange,
    // 确认弹窗
    ConfirmDialog,
    // 章节管理
    isLessonModalOpen,
    managingCourse,
    lessons,
    editingLesson,
    lessonFormData,
    setLessonFormData,
    lessonSubmitting,
    lessonsLoading,
    handleManageLessons,
    handleAddLesson,
    handleEditLesson,
    handleDeleteLesson,
    handleLessonSubmit,
    handleMoveLesson,
    closeLessonModal,
    // 视频上传
    uploadingVideo,
    videoProgress,
    videoDragActive,
    handleVideoUpload,
    handleVideoInputChange,
    handleVideoDragEnter,
    handleVideoDragLeave,
    handleVideoDragOver,
    handleVideoDrop,
    handleDeleteVideo,
    // PDF 上传
    uploadingPdf,
    pdfProgress,
    pdfDragActive,
    handlePdfUpload,
    handleDeletePdf,
    // 封面上传
    uploadingCover,
    coverProgress,
    coverDragActive,
    handleCoverUpload,
    handleCoverInputChange,
    handleCoverDragEnter,
    handleCoverDragLeave,
    handleCoverDragOver,
    handleCoverDrop,
    handleDeleteCover,
    // 权限统计
    isPermissionStatsModalOpen,
    selectedCourseForStats,
    permissionStats,
    loadingStats,
    handleViewPermissionStats,
    closePermissionStatsModal,
  };
}

export default useCourses;