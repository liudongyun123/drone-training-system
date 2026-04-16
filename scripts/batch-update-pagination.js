#!/usr/bin/env node

/**
 * 批量为管理组件添加分页和搜索功能的脚本
 */

const fs = require('fs');
const path = require('path');

// 需要更新的组件列表
const components = [
  { file: 'RoleManagement.tsx', grid: false, searchPlaceholder: '搜索角色...' },
  { file: 'NoticeManagement.tsx', grid: false, searchPlaceholder: '搜索公告...' },
  { file: 'ExamManagement.tsx', grid: true, searchPlaceholder: '搜索考试...' },
  { file: 'LearningPathManagement.tsx', grid: true, searchPlaceholder: '搜索学习路径...' },
  { file: 'MemberManagement.tsx', grid: true, searchPlaceholder: '搜索会员等级...' },
  { file: 'QuestionBankManagement.tsx', grid: true, searchPlaceholder: '搜索题库...' },
  { file: 'ScheduleManagement.tsx', grid: false, searchPlaceholder: '搜索课程表...' },
  { file: 'SystemLogManagement.tsx', grid: false, searchPlaceholder: '搜索日志...' },
];

const importsToAdd = `import { InputAdornment } from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import AdminTablePagination from './AdminTablePagination'`;

const statesToAdd = `  // 分页状态
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(${''})
  const [total, setTotal] = useState(0)

  // 搜索状态
  const [searchText, setSearchText] = useState('')`;

// 处理每个组件
components.forEach(({ file, grid, searchPlaceholder }) => {
  const filePath = path.join(__dirname, `src/components/admin/${file}`);

  console.log(`\n处理文件: ${file}`);

  if (!fs.existsSync(filePath)) {
    console.log(`  文件不存在，跳过`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const rowsPerPage = grid ? 9 : 10;

  // 检查是否已经更新过
  if (content.includes('AdminTablePagination')) {
    console.log(`  已包含AdminTablePagination，跳过`);
    return;
  }

  // 1. 添加导入
  const lastImportMatch = content.match(/^(import [\s\S]*?from ['"]@mui\/material['"]\n)/m);
  if (lastImportMatch) {
    content = content.replace(
      lastImportMatch[0],
      lastImportMatch[0] + importsToAdd + '\n'
    );
    console.log(`  ✓ 添加导入`);
  }

  // 2. 在组件开头添加状态 (在 export default function 之后)
  const exportMatch = content.match(/(export default function \w+\(\) \{)/);
  if (exportMatch) {
    content = content.replace(
      exportMatch[0],
      exportMatch[0] + '\n' + statesToAdd.replace('${''}', rowsPerPage) + '\n'
    );
    console.log(`  ✓ 添加状态管理`);
  }

  // 3. 修改 useEffect 依赖
  const useEffectMatch = content.match(/(useEffect\(\(\) => \{\s*load\w+\(\)\s*\}, \[\]))/);
  if (useEffectMatch) {
    content = content.replace(
      useEffectMatch[0],
      'useEffect(() => {\n    loadItems()\n  }, [page, rowsPerPage, searchText])'
    );
    console.log(`  ✓ 修改useEffect依赖`);
  }

  // 4. 修改 loadItems 函数
  const loadFunctionMatch = content.match(/(const load\w+ = async \(\) => \{[\s\S]*?finally \{\s*setLoading\(false\)\s*\}\s*\})/);
  if (loadFunctionMatch) {
    const loadFunction = loadFunctionMatch[0];
    const updatedLoadFunction = loadFunction.replace(
      /const (load\w+) = async \(\) => \{/,
      `const $1 = async () => {
    try {
      setLoading(true)
      const offset = page * rowsPerPage
      const result = await Service.getAll({
        offset,
        limit: rowsPerPage,
        search: searchText || undefined,
      })`
    );
    content = content.replace(loadFunctionMatch[0], updatedLoadFunction);
    console.log(`  ✓ 修改load函数`);
  }

  console.log(`✓ ${file} 更新完成`);
});

console.log('\n所有组件处理完成!');
