// ============================================================================
// useSourceConfig Hook - 体系配置统一管理
// 管理体系、分类、等级的动态加载和关联关系
// ============================================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminService } from '@/services/adminService';
import { cloudbaseApp } from '@/utils/cloudbase';

// 类型定义
export interface Source {
  _id: string;
  code: string;
  name: string;
  icon?: string;
  description?: string;
  status: 'active' | 'disabled';
  sortOrder: number;
}

export interface Category {
  _id: string;
  code: string;
  name: string;
  sourceId: string;      // 关联体系ID
  sourceCode?: string;   // 关联体系代码（冗余存储，便于查询）
  icon?: string;
  description?: string;
  status: 'active' | 'disabled';
  sort: number;
}

export interface Level {
  _id: string;
  code: string;
  name: string;
  sourceId: string;      // 关联体系ID
  sourceCode: string;    // 关联体系代码
  description?: string;
  status: 'active' | 'disabled';
  sortOrder: number;
}

// 体系ID到代码的映射缓存
let sourceIdToCodeMap: Record<string, string> = {};
let sourceCodeToIdMap: Record<string, string> = {};

export function useSourceConfig() {
  // 状态
  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [levelsLoading, setLevelsLoading] = useState(true);

  // 加载体系列表
  const loadSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const db = cloudbaseApp.database();
      const result = await db.collection('sources')
        .where({ status: 'active' })
        .orderBy('sortOrder', 'asc')
        .get();
      
      if (result.data && result.data.length > 0) {
        setSources(result.data);
        // 构建映射
        sourceIdToCodeMap = {};
        sourceCodeToIdMap = {};
        result.data.forEach((s: Source) => {
          sourceIdToCodeMap[s._id] = s.code;
          sourceCodeToIdMap[s.code] = s._id;
        });
      }
    } catch (error) {
      console.error('加载体系列表失败:', error);
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const result = await adminService.list('categories', { status: 'active' });
      if (result.code === 0 && Array.isArray(result.data)) {
        // 构建 sourceCode 映射
        const categoriesWithSourceCode: Category[] = result.data.map((c: Category) => ({
          ...c,
          sourceCode: sourceIdToCodeMap[c.sourceId] || c.sourceId
        }));
        setCategories(categoriesWithSourceCode);
      }
    } catch (error) {
      console.error('加载分类列表失败:', error);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // 加载等级列表
  const loadLevels = useCallback(async () => {
    setLevelsLoading(true);
    try {
      const db = cloudbaseApp.database();
      const result = await db.collection('levels')
        .where({ status: 'active' })
        .orderBy('sortOrder', 'asc')
        .get();
      
      if (result.data && result.data.length > 0) {
        setLevels(result.data);
      }
    } catch (error) {
      console.error('加载等级列表失败:', error);
    } finally {
      setLevelsLoading(false);
    }
  }, []);

  // 初始化加载
  const loadAll = useCallback(async () => {
    setLoading(true);
    await loadSources();
    await Promise.all([loadCategories(), loadLevels()]);
    setLoading(false);
  }, [loadSources, loadCategories, loadLevels]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // 重新加载分类（体系变化后需要刷新）
  const reloadCategories = useCallback(async () => {
    await loadCategories();
  }, [loadCategories]);

  // 根据体系ID获取体系代码
  const getSourceCode = useCallback((sourceId: string): string => {
    return sourceIdToCodeMap[sourceId] || '';
  }, []);

  // 根据体系ID筛选分类
  const getCategoriesBySource = useCallback((sourceId: string): Category[] => {
    if (!sourceId) return categories;
    return categories.filter(c => c.sourceId === sourceId);
  }, [categories]);

  // 根据体系代码筛选分类
  const getCategoriesBySourceCode = useCallback((sourceCode: string): Category[] => {
    if (!sourceCode) return categories;
    return categories.filter(c => c.sourceCode === sourceCode);
  }, [categories]);

  // 根据体系ID筛选等级
  const getLevelsBySource = useCallback((sourceId: string): Level[] => {
    const sourceCode = sourceIdToCodeMap[sourceId];
    if (!sourceCode) return levels;
    return levels.filter(l => l.sourceCode === sourceCode);
  }, [levels]);

  // 根据体系代码筛选等级
  const getLevelsBySourceCode = useCallback((sourceCode: string): Level[] => {
    if (!sourceCode) return levels;
    return levels.filter(l => l.sourceCode === sourceCode);
  }, [levels]);

  // 体系选项（用于下拉框）
  const sourceOptions = useMemo(() => {
    return sources.map(s => ({
      value: s._id,
      label: s.name,
      code: s.code,
      icon: s.icon
    }));
  }, [sources]);

  // 分类选项（按体系分组）
  const categoryOptions = useMemo(() => {
    return categories.map(c => ({
      value: c._id,
      label: c.name,
      code: c.code,
      sourceId: c.sourceId,
      sourceCode: c.sourceCode
    }));
  }, [categories]);

  // 等级选项（按体系分组）
  const levelOptions = useMemo(() => {
    return levels.map(l => ({
      value: l.code,
      label: l.name,
      code: l.code,
      sourceId: l.sourceId,
      source: l.sourceCode  // 兼容字典格式
    }));
  }, [levels]);

  return {
    // 数据
    sources,
    categories,
    levels,
    // 加载状态
    loading,
    sourcesLoading,
    categoriesLoading,
    levelsLoading,
    // 选项数据（用于下拉框）
    sourceOptions,
    categoryOptions,
    levelOptions,
    // 筛选方法
    getSourceCode,
    getCategoriesBySource,
    getCategoriesBySourceCode,
    getLevelsBySource,
    getLevelsBySourceCode,
    // 重新加载
    loadAll,
    loadSources,
    loadCategories,
    loadLevels,
    reloadCategories,
    // 映射工具
    sourceIdToCodeMap,
    sourceCodeToIdMap
  };
}

// 导出映射获取函数（用于非hook场景）
export function getSourceMapping() {
  return { sourceIdToCodeMap, sourceCodeToIdMap };
}
