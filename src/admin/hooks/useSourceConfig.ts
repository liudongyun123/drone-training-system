// ============================================================================
// useSourceConfig Hook - 体系配置统一管理
// 管理体系、分类、等级的动态加载和关联关系
// ============================================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminService } from '@/services/adminService';

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
      // 使用 adminService（CloudBase SDK）查询
      const result = await adminService.listSources({}, { limit: 100 }) as any;
      console.log('[useSourceConfig] listSources result:', result);
      
      // 兼容多种返回格式
      let sourcesData: any[] = [];
      if (result.data?.list && Array.isArray(result.data.list)) {
        sourcesData = result.data.list;
      } else if (Array.isArray(result.data)) {
        sourcesData = result.data;
      }
      
      if (sourcesData.length > 0) {
        setSources(sourcesData as Source[]);
        // 构建映射
        sourceIdToCodeMap = {};
        sourceCodeToIdMap = {};
        sourcesData.forEach((s: any) => {
          sourceIdToCodeMap[s._id] = s.code;
          sourceCodeToIdMap[s.code] = s._id;
        });
        console.log('[useSourceConfig] sources loaded:', sourcesData.length, '构建映射:', sourceIdToCodeMap);
      } else {
        setSources([]);
      }
    } catch (error) {
      console.error('加载体系列表失败:', error);
      setSources([]);
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      // 使用 adminService（CloudBase SDK）查询
      const result = await adminService.listCategories({}, { limit: 100 }) as any;
      console.log('[useSourceConfig] listCategories result:', result);
      
      // 兼容多种返回格式
      let categoriesData: any[] = [];
      if (result.data?.list && Array.isArray(result.data.list)) {
        categoriesData = result.data.list;
      } else if (Array.isArray(result.data)) {
        categoriesData = result.data;
      }
      
      if (categoriesData.length > 0) {
        // 构建 sourceCode 映射
        const categoriesWithSourceCode: Category[] = categoriesData.map((c: any) => ({
          ...c,
          sourceCode: sourceIdToCodeMap[c.sourceId] || c.sourceId
        }));
        setCategories(categoriesWithSourceCode);
        console.log('[useSourceConfig] categories loaded:', categoriesData.length);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('加载分类列表失败:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // 加载等级列表
  const loadLevels = useCallback(async () => {
    setLevelsLoading(true);
    try {
      // 使用 adminService（CloudBase SDK）查询
      const result = await adminService.listLevels({}, { limit: 100 }) as any;
      console.log('[useSourceConfig] listLevels result:', result);
      
      // 兼容多种返回格式
      let levelsData: any[] = [];
      if (result.data?.list && Array.isArray(result.data.list)) {
        levelsData = result.data.list;
      } else if (Array.isArray(result.data)) {
        levelsData = result.data;
      }
      
      console.log('[useSourceConfig] levelsData:', levelsData);
      console.log('[useSourceConfig] levelsData.length:', levelsData.length);
      
      if (levelsData.length > 0) {
        console.log('[useSourceConfig] 加载到等级数据:', levelsData.length, '条');
        setLevels(levelsData as Level[]);
      } else {
        console.warn('[useSourceConfig] 等级数据为空');
        setLevels([]);
      }
    } catch (error) {
      console.error('加载等级列表失败:', error);
      setLevels([]);
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
    console.log('[useSourceConfig] getLevelsBySource called with sourceId:', sourceId);
    console.log('[useSourceConfig] current levels:', levels);
    console.log('[useSourceConfig] sourceIdToCodeMap:', sourceIdToCodeMap);
    
    if (!sourceId) return levels;
    
    // 获取对应的 sourceCode（如果映射存在）
    const sourceCode = sourceIdToCodeMap[sourceId];
    console.log('[useSourceConfig] sourceCode for', sourceId, ':', sourceCode);
    
    const filtered = levels.filter(l => {
      // 直接匹配 sourceId（最可靠的方式）
      if (l.sourceId === sourceId) {
        console.log('[useSourceConfig] matched by sourceId:', l);
        return true;
      }
      // 匹配 sourceCode（如果两者都存在）
      if (l.sourceCode && sourceCode && l.sourceCode === sourceCode) {
        console.log('[useSourceConfig] matched by sourceCode:', l);
        return true;
      }
      return false;
    });
    
    console.log('[useSourceConfig] filtered levels:', filtered);
    return filtered;
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
