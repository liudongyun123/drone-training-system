#!/bin/sh
# Git pre-commit hook - 代码质量检查（生产级）
# 安装：由 scripts/setup-git-hooks.sh 自动复制为 .git/hooks/pre-commit（npm prepare 时触发）。
#       手动安装：cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
#
# 关卡：
#   1) TypeScript 类型回归门禁（硬拦截新增错误）
#   2) ESLint（提示，不拦截）
#   3) 云函数契约自检 check-contract（硬拦截契约缺口 = B1/B3/B4 类 bug）
#   4) 状态枚举一致性 check-status-enum（提示，候选可能误报需人工复核）
# 手动一键体检：npm run health
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

# ---------------------------------------------------------------
# 3) 云函数契约自检（硬拦截：前端调用的 (函数,action) 云函数未实现 = B1/B3/B4 类 bug）
# ---------------------------------------------------------------
echo "🔗 检查云函数契约（前端调用 vs 云函数实现）..."
node scripts/check-contract.mjs
CONTRACT_EXIT=$?
if [ $CONTRACT_EXIT -ne 0 ]; then
  echo "❌ 发现云函数契约缺口（前端调用了云函数未实现的 action），请修复后再提交。"
  echo "💡 运行 'npm run check:contract' 查看详情；若确属新增云函数尚未部署，先部署对应 api-* 后再提交。"
  exit 1
fi

# ---------------------------------------------------------------
# 4) 状态枚举一致性（仅提示、不拦截：候选可能误报，需人工复核）
#    与 check-status-enum.mjs 的 WARN 级语义一致。如需纳入小程序，加 --mp。
# ---------------------------------------------------------------
echo "🔎 检查状态枚举一致性（写端/读端分裂，仅供参考）..."
node scripts/check-status-enum.mjs || true

echo "✅ 预提交检查通过！"
exit 0
