// ============================================================================
// Navbar 导航栏组件
// ============================================================================
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="navbar bg-slate-900 shadow-md">
      <div className="container mx-auto">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost normal-case text-xl font-bold whitespace-nowrap text-white hover:bg-slate-800">
            <span className="whitespace-nowrap">无人机培训</span>
          </Link>
        </div>
        <div className="flex-none gap-2">
          <Link to="/courses" className="btn btn-ghost text-white hover:bg-slate-800">课程</Link>
          <Link to="/registration" className="btn btn-ghost text-white hover:bg-slate-800">开班信息</Link>
          <Link to="/teachers" className="btn btn-ghost text-white hover:bg-slate-800">教师团队</Link>
          <Link to="/exams" className="btn btn-ghost text-white hover:bg-slate-800">题库与考试</Link>
          <Link to="/admin" className="btn btn-primary ml-2">管理后台</Link>
        </div>
      </div>
    </header>
  );
}
