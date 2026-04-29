#!/bin/bash
# 代码质量检查脚本
set -e

echo "================================"
echo "  代码质量检查"
echo "================================"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "\n[1/4] TypeScript 检查..."
npx tsc --noEmit 2>&1 | tail -5 || true

echo -e "\n[2/4] ESLint 检查..."
npx eslint src --ext .ts,.tsx --max-warnings=200 2>&1 | tail -5 || true

echo -e "\n[3/4] 单元测试..."
npx vitest run --passWithNoTests 2>&1 | tail -10 || true

echo -e "\n[4/4] 代码统计..."
TOTAL_FILES=$(find src -name "*.ts" -o -name "*.tsx" | wc -l)
TOTAL_LINES=$(find src -name "*.ts" -o -name "*.tsx" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
ANY_COUNT=$(grep -rn ": any" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | wc -l || echo 0)
echo "  文件: $TOTAL_FILES | 行数: $TOTAL_LINES | any类型: $ANY_COUNT"

echo -e "\n大组件 (>500行):"
find src -name "*.tsx" | while read f; do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 500 ]; then echo "  $(echo $f | sed 's|^src/||'): $lines 行"; fi
done

echo -e "\n================================"
echo "  检查完成"
echo "================================"
