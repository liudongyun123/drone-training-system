#!/bin/bash
# GitHub 仓库初始化脚本
# 使用方法: bash setup-git.sh

REPO_NAME="drone-training-system"
GITHUB_USER="liudongyun123"

echo "🛠️  初始化 Git 仓库..."

# 初始化 git（如果在 Claw 目录下运行）
if [ ! -d ".git" ]; then
  git init
  echo "✅ Git 初始化完成"
else
  echo "⚠️  已经是 Git 仓库"
fi

# 添加远程仓库
echo "🔗 添加远程仓库..."
git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git

# 添加所有文件（排除 .gitignore 中的文件）
echo "📦 添加文件..."
git add .

# 提交
echo "💾 提交代码..."
git commit -m "Initial commit: 无人机培训系统 v1.0"

echo ""
echo "========================================"
echo "✅ 初始化完成！"
echo "========================================"
echo ""
echo "📋 下一步操作："
echo ""
echo "1️⃣  在 GitHub 上创建仓库："
echo "   https://github.com/new"
echo ""
echo "   - Repository name: $REPO_NAME"
echo "   - 不要勾选 'Add a README file'"
echo "   - 不要选择 .gitignore（已在本地配置）"
echo ""
echo "2️⃣  推送代码到 GitHub："
echo ""
echo "   git push -u origin main"
echo ""
echo "3️⃣  如果提示输入用户名/密码："
echo "   - 用户名: $GITHUB_USER"
echo "   - 密码: 使用 Personal Access Token"
echo "     (在 GitHub → Settings → Developer settings → Personal access tokens)"
echo ""
echo "========================================"
