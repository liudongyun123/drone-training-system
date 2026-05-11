// ============================================================================
// 管理后台 - 课程管理（重构版）
// ============================================================================
import { useCourses } from './hooks/useCourses';
import CourseList from './components/CourseList';
import CourseForm from './components/CourseForm';
import LessonManager from './components/LessonManager';
import CourseStats from './components/CourseStats';

export default function AdminCourses() {
  const hook = useCourses();

  return (
    <>
      {/* 课程列表 */}
      <CourseList
        courses={hook.courses}
        loading={hook.loading}
        total={hook.total}
        page={hook.page}
        categories={hook.categories}
        sources={hook.sources}
        selectedSource={hook.selectedSourceId}
        onSourceChange={(sourceId) => {
          hook.setSelectedSource(sourceId);
          hook.setSelectedSourceId(sourceId);
        }}
        onSearch={hook.loadCourses}
        onPageChange={hook.setPage}
        onAdd={hook.handleAdd}
        onEdit={hook.handleEdit}
        onDelete={hook.handleDelete}
        onViewStats={hook.handleViewPermissionStats}
        onManageLessons={hook.handleManageLessons}
      />

      {/* 添加/编辑课程弹窗 */}
      <CourseForm
        isOpen={hook.isModalOpen}
        isEditing={!!hook.editingCourse}
        formData={hook.formData}
        setFormData={hook.setFormData}
        submitting={hook.submitting}
        teachers={hook.teachers}
        teachersLoading={hook.teachersLoading}
        categories={hook.categories}
        categoriesLoading={hook.categoriesLoading}
        uploadingCover={hook.uploadingCover}
        coverProgress={hook.coverProgress}
        coverDragActive={hook.coverDragActive}
        onCoverInputChange={hook.handleCoverInputChange}
        onCoverDragEnter={hook.handleCoverDragEnter}
        onCoverDragLeave={hook.handleCoverDragLeave}
        onCoverDragOver={hook.handleCoverDragOver}
        onCoverDrop={hook.handleCoverDrop}
        onDeleteCover={hook.handleDeleteCover}
        onSubmit={hook.handleSubmit}
        onClose={hook.closeModal}
        onTeacherChange={hook.handleTeacherChange}
      />

      {/* 章节管理弹窗 */}
      <LessonManager
        isOpen={hook.isLessonModalOpen}
        managingCourse={hook.managingCourse}
        lessons={hook.lessons}
        editingLesson={hook.editingLesson}
        lessonFormData={hook.lessonFormData}
        setLessonFormData={hook.setLessonFormData}
        lessonSubmitting={hook.lessonSubmitting}
        lessonsLoading={hook.lessonsLoading}
        uploadingVideo={hook.uploadingVideo}
        videoProgress={hook.videoProgress}
        videoDragActive={hook.videoDragActive}
        onVideoInputChange={hook.handleVideoInputChange}
        onVideoDragEnter={hook.handleVideoDragEnter}
        onVideoDragLeave={hook.handleVideoDragLeave}
        onVideoDragOver={hook.handleVideoDragOver}
        onVideoDrop={hook.handleVideoDrop}
        onDeleteVideo={hook.handleDeleteVideo}
        uploadingPdf={hook.uploadingPdf}
        pdfProgress={hook.pdfProgress}
        onPdfUpload={hook.handlePdfUpload}
        onDeletePdf={hook.handleDeletePdf}
        onAddLesson={hook.handleAddLesson}
        onEditLesson={hook.handleEditLesson}
        onDeleteLesson={hook.handleDeleteLesson}
        onLessonSubmit={hook.handleLessonSubmit}
        onMoveLesson={hook.handleMoveLesson}
        onClose={hook.closeLessonModal}
      />

      {/* 权限统计弹窗 */}
      <CourseStats
        isOpen={hook.isPermissionStatsModalOpen}
        course={hook.selectedCourseForStats}
        stats={hook.permissionStats}
        loading={hook.loadingStats}
        onClose={hook.closePermissionStatsModal}
      />

      {/* 确认弹窗（全局） */}
      <hook.ConfirmDialog />
    </>
  );
}