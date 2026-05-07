#!/bin/sh
# Git pre-commit hook - 代码质量检查
# 安装：cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

echo "🔍 运行预提交检查..."

# 检查 TypeScript 编译错误
echo "📦 检查 TypeScript 类型..."
npm run type-check --silent 2>&1 | head -20

if [ $? -ne 0 ]; then
  echo "❌ TypeScript 类型检查失败！请修复错误后重试。"
  echo "💡 运行 'npm run type-check' 查看详细错误信息。"
  exit 1
fi

# 检查 ESLint
echo "🔍 检查 ESLint..."
npm run lint --silent 2>&1 | head -20

if [ $? -ne 0 ]; then
  echo "❌ ESLint 检查失败！请修复错误后重试。"
  echo "💡 运行 'npm run lint' 查看详细错误信息。"
  exit 1
fi

echo "✅ 预提交检查通过！"
exit 0
