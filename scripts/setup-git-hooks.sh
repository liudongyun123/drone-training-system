#!/bin/sh
# 安装 Git hooks

# 检查是否在 Git 仓库中
if [ ! -d ".git" ]; then
  echo "❌ 错误：未检测到 Git 仓库。"
  echo "请在项目根目录运行此脚本。"
  exit 1
fi

# 创建 hooks 目录
mkdir -p .git/hooks

# 复制 pre-commit hook
cp scripts/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks 安装成功！"
echo ""
echo "📋 已安装的 hooks："
echo "  - pre-commit: TypeScript 类型检查 + ESLint"
echo ""
echo "💡 要卸载 hooks，请运行：rm .git/hooks/pre-commit"
