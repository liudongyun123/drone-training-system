#!/bin/bash
# 脚本用于生成生产环境配置文件
# 使用方法: ./scripts/update-env.sh

set -e

echo "🚀 生产环境配置生成器"
echo "========================"

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
  echo "❌ 错误：未找到 package.json，请确保在项目根目录运行此脚本。"
  exit 1
fi

# 生成 .env.production 文件
echo "📄 生成 .env.production..."

cat > .env.production << 'EOF'
# ==================== 生产环境配置 ====================
# 重要：请勿将此文件提交到版本控制系统！

# ==================== CloudBase 配置 ====================
VITE_ENV_ID=rcwljy-5ghmq2ex26764978
VITE_PUBLISHABLE_KEY=your_publishable_key_here

# ==================== Sentry 监控 ====================
# 如果启用 Sentry 错误监控，请填写真实的 DSN
# VITE_SENTRY_DSN=https://example@sentry.io/1234567

# ==================== API 配置 ====================
VITE_API_TIMEOUT=30000

# ==================== 功能开关 ====================
VITE_DEBUG_MODE=false
VITE_ENABLE_ANALYTICS=true

# ==================== 构建配置 ====================
VITE_BUILD_VERSION=v$(date +%Y%m%d-%H%M%S)-production
EOF

echo "✅ .env.production 文件已生成！"
echo ""
echo "⚠️  请编辑 .env.production 文件，填写真实的配置信息："
echo "   - VITE_PUBLISHABLE_KEY: CloudBase 公钥"
echo "   - VITE_SENTRY_DSN: Sentry DSN (可选)"
echo ""
echo "💡 要查看当前配置，请运行：cat .env.production"
