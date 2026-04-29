// ============================================================================
// 报名页面
// 独立报名入口，支持选择课程和班级进行报名
// 支持路由：
// - /registration - 所有招生班级列表
// - /registration/course/:courseId - 指定课程报名
// - /registration/class/:classId - 班级专属报名页面
// ============================================================================
import { useParams } from 'react-router-dom';
import RegistrationWindow from '@/components/RegistrationWindow';

export default function RegistrationPage() {
  const params = useParams<{ courseId?: string; classId?: string }>();
  
  return (
    <RegistrationWindow 
      courseId={params.courseId} 
      classId={params.classId}
    />
  );
}
