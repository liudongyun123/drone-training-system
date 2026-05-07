/**
 * 教师团队页面
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Users, Star, Mail, Phone } from 'lucide-react';
import { teacherService } from '@/services/database';
import { Loading, EmptyState } from '@/components';

interface Teacher {
  _id: string;
  name: string;
  avatar?: string;
  title: string;
  bio: string;
  specialties: string[];
  experience: number;
  coursesCount: number;
  studentsCount: number;
  rating: number;
  certifications: string[];
  email?: string;
  phone?: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  const specialties = ['全部', 'CAAC培训', 'AOPA认证', '航拍技术', '行业应用', '飞行技能'];

  useEffect(() => {
    loadTeachers();
  }, [selectedSpecialty]);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const result = await teacherService.getList({ page: 1, pageSize: 50 });
      setTeachers(result.list);
    } catch (error) {
      console.error('加载教师列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = selectedSpecialty && selectedSpecialty !== '全部'
    ? teachers.filter(t => t.specialties?.includes(selectedSpecialty))
    : teachers;

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面标题 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">专业教师团队</h1>
          <p className="text-xl opacity-90">资深无人机培训师，助您快速掌握飞行技能</p>
        </div>
      </div>

      {/* 专业筛选 */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {specialties.map((specialty) => (
            <button
              key={specialty}
              onClick={() => setSelectedSpecialty(specialty === '全部' ? '' : specialty)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                (specialty === '全部' && !selectedSpecialty) || selectedSpecialty === specialty
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {specialty}
            </button>
          ))}
        </div>

        {/* 教师列表 */}
        {filteredTeachers.length === 0 ? (
          // @ts-ignore
          <EmptyState message="暂无教师信息" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeachers.map((teacher) => (
              <div key={teacher._id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow p-6">
                {/* 教师头像和基本信息 */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
                    {typeof teacher.name === 'string' ? teacher.name[0] : 'T'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{teacher.name}</h3>
                    <p className="text-blue-600 font-medium">{teacher.title}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{teacher.rating || 5.0}</span>
                    </div>
                  </div>
                </div>

                {/* 简介 */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{teacher.bio}</p>

                {/* 专业领域 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {teacher.specialties?.map((specialty, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                      {specialty}
                    </span>
                  ))}
                </div>

                {/* 统计数据 */}
                <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{teacher.coursesCount || 0}</p>
                    <p className="text-xs text-gray-500">课程</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Users className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{teacher.studentsCount || 0}</p>
                    <p className="text-xs text-gray-500">学员</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Award className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{teacher.experience || 0}年</p>
                    <p className="text-xs text-gray-500">经验</p>
                  </div>
                </div>

                {/* 认证资质 */}
                {teacher.certifications && teacher.certifications.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-500 mb-2">认证资质</p>
                    <div className="flex flex-wrap gap-2">
                      {teacher.certifications.map((cert, idx) => (
                        <span key={idx} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 联系方式 */}
                <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                  {teacher.email && (
                    <a href={`mailto:${teacher.email}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
                      <Mail className="w-4 h-4" />
                      邮箱
                    </a>
                  )}
                  {teacher.phone && (
                    <a href={`tel:${teacher.phone}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
                      <Phone className="w-4 h-4" />
                      电话
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
