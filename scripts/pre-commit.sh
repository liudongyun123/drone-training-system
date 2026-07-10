#!/bin/sh
# Git pre-commit hook - 代码质量检查（生产级）
# 安装：cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
#
# 设计：项目存在大量历史类型债（tsc 错误），无法短期清零。
#       因此类型检查采用【回归门禁】：把当前所有错误固化为基线
#       （scripts/tsc-baseline.txt），只拦截【新增】错误，
#       不卡遗留债，但 100% 防止引入新的类型错误（防回归）。
#       重建基线：node scripts/type-check-gate.mjs --init
#
# 注意：之前版本用 `npm run type-check | head -20; if [ $? -ne 0 ]`，
#       $? 取到的是 head 的退出码（恒为 0），门禁实际从未生效。已修复。

echo "🔍 运行预提交检查..."

# ---------------------------------------------------------------
# 1) TypeScript 类型回归门禁（硬拦截新增错误）
# ---------------------------------------------------------------
echo "📦 检查 TypeScript 类型（回归门禁）..."
node scripts/type-check-gate.mjs
TYPE_CHECK_EXIT=$?
if [ $TYPE_CHECK_EXIT -ne 0 ]; then
  echo "❌ 发现新增 TypeScript 类型错误，请修复后再提交。"
  echo "💡 运行 'npm run type-check' 查看详情；若是预期内的基线变更，用 'node scripts/type-check-gate.mjs --init' 重建基线。"
  exit 1
fi

# ---------------------------------------------------------------
# 2) ESLint（当前仅提示、不拦截：存在大量历史 lint 问题）
#    如需启用硬拦截，去掉行尾的 `|| true` 即可。
# ---------------------------------------------------------------
echo "🔍 检查 ESLint（仅提示）..."
npm run lint --silent 2>&1 | head -20 || true

echo "✅ 预提交检查通过！"
exit 0
