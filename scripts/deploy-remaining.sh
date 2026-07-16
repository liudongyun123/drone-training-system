#!/usr/bin/env bash
#
# 班级移出/调班/重新加入 修复 — 剩余部署与回填一键脚本
# ----------------------------------------------------------------------------
# 覆盖：
#   1) Web 静态托管部署（B2/B3 前端生效）
#   2) B4 历史数据回填（默认 --dry-run，--apply 才真正写生产库）
# 不覆盖（需微信工具/私钥，无法脚本化）：
#   3) 小程序重新发布（B1 端上同步）——见 docs/DEPLOY_REMAINING.md「第 2 项」
#
# 用法：
#   bash scripts/deploy-remaining.sh            # 部署 Web + 回填(dry-run)
#   bash scripts/deploy-remaining.sh --apply    # 部署 Web + 回填(正式写库)
# ----------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_ID="rcwljy-5ghmq2ex26764978"
APPLY=0
for arg in "$@"; do
  [[ "$arg" == "--apply" ]] && APPLY=1
done

echo "=================================================="
echo " 班级移出/调班/重新加入 修复 — 部署与回填"
echo " 环境: $ENV_ID"
echo " 回填: $([ "$APPLY" -eq 1 ] && echo '正式写库' || echo 'DRY-RUN(仅统计)')"
echo "=================================================="

# ---------- 1) Web 静态托管部署 ----------
echo ""
echo "[1/2] 部署 Web 静态托管（dist/）..."
if [ ! -d dist ]; then
  echo "  ! dist/ 不存在，先构建..."
  npm run build
fi
npx cloudbase hosting:deploy dist -e "$ENV_ID" \
  && echo "  ✅ Web 静态托管部署完成" \
  || { echo "  ✖ Web 部署失败（可能本环境网络无法访问 COS，请换可访问环境重试）"; exit 1; }

# ---------- 2) B4 历史数据回填 ----------
echo ""
echo "[2/2] B4 历史数据回填（enrollmentCancelled + 视频权限）..."
BACKFILL="node scripts/db-migration/backfill-enrollment-cancelled.js"
if [ "$APPLY" -eq 1 ]; then
  $BACKFILL
else
  $BACKFILL --dry-run
  echo ""
  echo "  ↑ 以上为 DRY-RUN 统计。确认无误后加 --apply 正式执行："
  echo "    bash scripts/deploy-remaining.sh --apply"
fi

echo ""
echo "=================================================="
echo " 完成。"
echo " 小程序端上同步(B1)需另行用微信开发者工具 / miniprogram-ci 上传，"
echo " 详见 docs/DEPLOY_REMAINING.md「第 2 项」。"
echo "=================================================="
