#!/bin/bash
# 部署 migrate-source-data 云函数的脚本

echo "========================================="
echo "部署 migrate-source-data 云函数"
echo "========================================="

# 进入云函数目录
cd "$(dirname "$0")/cloudfunctions/migrate-source-data"

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
  echo "❌ 依赖安装失败"
  exit 1
fi

# 部署云函数
echo "📤 部署云函数..."
cloudbase functions:deploy migrate-source-data -e rcwljy-5ghmq2ex26764978

if [ $? -eq 0 ]; then
  echo "✅ 部署成功!"
  echo ""
  echo "========================================="
  echo "下一步操作："
  echo "========================================="
  echo ""
  echo "1. 登录腾讯云控制台："
  echo "   https://console.cloud.tencent.com/tcb/scf/index?envId=rcwljy-5ghmq2ex26764978"
  echo ""
  echo "2. 找到并点击 'migrate-source-data' 云函数"
  echo ""
  echo "3. 点击【测试】按钮，输入测试参数："
  echo ""
  echo "   // 先验证数据完整性"
  echo "   { \"action\": \"validate\" }"
  echo ""
  echo "   // 确认无误后执行完整迁移"
  echo "   { \"action\": \"migrate\" }"
  echo ""
  echo "========================================="
else
  echo "❌ 部署失败"
  exit 1
fi
