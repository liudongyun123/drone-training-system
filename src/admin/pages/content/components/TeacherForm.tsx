// ============================================================================
// TeacherForm - 教师档案表单
// ============================================================================
import { useState, useEffect } from 'react';
import {
  X, Check, User, Phone, Mail, Award
} from 'lucide-react';
import ImageUploader from '@/components/admin/ImageUploader';
import type { Teacher } from '@/types';

interface TeacherFormProps {
  teacher?: Teacher | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Teacher>) => void;
  saving?: boolean;
}

export function TeacherForm({ teacher, isOpen, onClose, onSave, saving = false }: TeacherFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    avatar: '',
    bio: '',
    specialties: [] as string[],
    certifications: [] as string[],
    status: 'active' as 'active' | 'inactive',
  });
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [certInput, setCertInput] = useState('');

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name || '',
        phone: (teacher as any).phone || '',
        email: (teacher as any).email || '',
        avatar: (teacher as any).avatar || '',
        bio: teacher.bio || '',
        specialties: teacher.specialties || [],
        certifications: teacher.certifications || [],
        status: teacher.status || 'active',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        avatar: '',
        bio: '',
        specialties: [],
        certifications: [],
        status: 'active',
      });
    }
  }, [teacher, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addSpecialty = () => {
    if (specialtyInput.trim() && !formData.specialties.includes(specialtyInput.trim())) {
      setFormData(prev => ({ ...prev, specialties: [...prev.specialties, specialtyInput.trim()] }));
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (item: string) => {
    setFormData(prev => ({ ...prev, specialties: prev.specialties.filter(s => s !== item) }));
  };

  const addCert = () => {
    if (certInput.trim() && !formData.certifications.includes(certInput.trim())) {
      setFormData(prev => ({ ...prev, certifications: [...prev.certifications, certInput.trim()] }));
      setCertInput('');
    }
  };

  const removeCert = (item: string) => {
    setFormData(prev => ({ ...prev, certifications: prev.certifications.filter(c => c !== item) }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold text-gray-800">
            {teacher ? '编辑教师档案' : '添加新教师'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 头像上传 */}
            <div className="flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-700 mb-3">教师头像</label>
              <div className="w-32">
                <ImageUploader
                  value={formData.avatar}
                  onChange={(url) => setFormData(prev => ({ ...prev, avatar: url }))}
                  maxSize={5}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  placeholder="上传头像"
                  previewHeight="h-32"
                  className="w-full"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG，最大 5MB</p>
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="请输入教师姓名"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="请输入联系电话"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">电子邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="请输入电子邮箱"
                  />
                </div>
              </div>
            </div>

            {/* 个人简介 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
              <textarea
                value={formData.bio}
                onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                placeholder="请输入教师个人简介、教学经历等"
              />
            </div>

            {/* 擅长领域 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">擅长领域</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={specialtyInput}
                  onChange={e => setSpecialtyInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="输入擅长领域，如：无人机航拍、农业植保等"
                />
                <button
                  type="button"
                  onClick={addSpecialty}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  添加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.specialties.map((specialty, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    {specialty}
                    <button type="button" onClick={() => removeSpecialty(specialty)} className="hover:text-blue-900">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 资质证书 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">资质证书</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={certInput}
                  onChange={e => setCertInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCert())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="输入证书名称，如：CAAC执照、AOPA认证等"
                />
                <button
                  type="button"
                  onClick={addCert}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  添加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.certifications.map((cert, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                    <Award size={14} />
                    {cert}
                    <button type="button" onClick={() => removeCert(cert)} className="hover:text-green-900">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">账号状态</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    在职
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    离职
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Check size={18} />
                  保存
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TeacherForm;
