import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// 图标库 - 按分类组织
const ICON_CATEGORIES: { name: string; icons: string[] }[] = [
  {
    name: '无人机',
    icons: [
      // 通用飞行器 & 操控
      '🚁', '🛸', '🎮', '🕹️', '🖲️', '📡', '🛰️', '📶', '🎯', '🔋', '⚡', '🔌',
      // 多旋翼无人机（无专用emoji，用近义图标替代）
      '⭕', '❎', '💨', '🌪️', '🔄', '4️⃣', '🔘', '⬛',
      // 植保无人机
      '🌾', '🌱', '🌽', '🌿', '🍃', '🚜', '🌻', '🌷',
      // 航拍无人机
      '📷', '📸', '🎥', '🎬', '🎞️', '🌄', '🏞️', '🌅',
      // 物流无人机
      '📦', '🚚', '🚛', '📮', '📨', '🛻', '🚲',
      // 安防无人机
      '🛡️', '👮', '🔒', '🔐', '🚨', '🔔', '👁️',
      // 测绘无人机
      '🗺️', '🧭', '🌐', '📐', '📏', '🌏', '🌍',
      // 巡检无人机
      '🔍', '🦺', '🔦', '🧰', '🛠️', '🌉', '🏗️',
      // 维修/装调
      '🔧', '🪛', '🔩', '⚙️', '🔨', '⚠️',
    ],
  },
  {
    name: '航空',
    icons: ['✈️', '🛩️', '🚀', '🛫', '🛬', '🪂', '🌤️', '🌍', '🛰️', '📡'],
  },
  {
    name: '教育',
    icons: ['📚', '🎓', '🏫', '✏️', '📝', '📖', '🎒', '📐', '🖊️', '📋', '🎯', '💡'],
  },
  {
    name: '科技',
    icons: ['💻', '🖥️', '🔧', '🛠️', '⚙️', '🔬', '📱', '🔌', '🤖', '🧰'],
  },
  {
    name: '机构',
    icons: ['🏛️', '🏢', '🏗️', '🏭', '🏪', '🏥', '🏦', '🏫', '🏰', '🏆'],
  },
  {
    name: '自然',
    icons: ['🌤️', '🌍', '🏔️', '🗺️', '🌲', '🏞️', '🌅', '🌈', '🌊', '⛰️'],
  },
  {
    name: '荣誉',
    icons: ['⭐', '🏆', '🎖️', '🥇', '🥈', '🥉', '🏅', '💎', '🔥', '👑'],
  },
  {
    name: '符号',
    icons: ['📌', '🔖', '📊', '📈', '🔍', '💡', '🎵', '🗂️', '✅', '📋'],
  },
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, size = 'md' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 计算下拉面板位置（fixed 定位，避免被表格等父容器裁剪）
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const panelWidth = 340;
      // 默认右对齐到按钮右边缘；若超出视口右侧则左对齐到按钮左边缘
      let left = rect.right - panelWidth;
      if (left < 8) left = rect.left;
      if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8;

      setDropdownPos({
        top: rect.bottom + 8,
        left,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, updatePosition]);

  // 点击外部关闭：同时判断触发按钮和下拉面板的范围
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const insideTrigger = triggerRef.current?.contains(target) ?? false;
      const insidePanel = panelRef.current?.contains(target) ?? false;
      if (!insideTrigger && !insidePanel) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const sizeClass = size === 'sm' ? 'w-10 h-10 text-lg' : size === 'lg' ? 'w-14 h-14 text-2xl' : 'w-12 h-12 text-xl';

  // 搜索过滤（当前分类内）
  const filteredIcons = search
    ? ICON_CATEGORIES[activeCategory]?.icons.filter(i => i.includes(search))
    : ICON_CATEGORIES[activeCategory]?.icons || [];

  // 展开面板时记忆选中值所在分类
  useEffect(() => {
    if (isOpen && value) {
      const idx = ICON_CATEGORIES.findIndex(cat => cat.icons.includes(value));
      if (idx >= 0) setActiveCategory(idx);
    }
  }, [isOpen, value]);

  const dropdownPanel = (
    <div
      ref={panelRef}
      className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      style={{ width: '340px', top: dropdownPos.top, left: dropdownPos.left }}
    >
      {/* 搜索框 */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索图标..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 分类标签 */}
      <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
        {ICON_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.name}
            type="button"
            onClick={() => { setActiveCategory(idx); setSearch(''); }}
            className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors ${
              activeCategory === idx
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 图标网格 */}
      <div className="p-3 max-h-72 overflow-y-auto">
        {filteredIcons.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-4">未找到匹配的图标</div>
        ) : (
          <div className="grid grid-cols-8 gap-1.5">
            {filteredIcons.map((icon, i) => (
              <button
                key={`${icon}-${i}`}
                type="button"
                onClick={() => {
                  onChange(icon);
                  setIsOpen(false);
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all duration-150 hover:scale-110 hover:bg-blue-50 ${
                  value === icon ? 'bg-blue-100 ring-2 ring-blue-400 scale-105' : 'hover:shadow-sm'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        )
        }
      </div>

      {/* 底部：清空 */}
      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
        <button
          type="button"
          onClick={() => { onChange(''); setIsOpen(false); }}
          className="text-xs text-gray-500 hover:text-red-500 transition-colors"
        >
          清除图标
        </button>
        <span className="text-xs text-gray-400 ml-2">共 {ICON_CATEGORIES.reduce((sum, c) => sum + c.icons.length, 0)} 个图标</span>
      </div>
    </div>
  );

  return (
    <>
      {/* 当前选中图标 - 点击打开面板 */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updatePosition();
          setIsOpen(!isOpen);
        }}
        className={`${sizeClass} flex items-center justify-center border-2 rounded-lg transition-all duration-200 hover:border-blue-400 hover:shadow-md ${
          isOpen ? 'border-blue-500 shadow-md scale-105' : 'border-gray-200'
        } bg-white`}
        title="选择图标"
      >
        {value || '🚁'}
      </button>

      {/* 通过 Portal 渲染到 body，避免被表格、overflow:hidden 等父容器裁剪 */}
      {isOpen && createPortal(dropdownPanel, document.body)}
    </>
  );
};

export default IconPicker;
