#!/bin/bash
# 部署 api-upload 云函数

echo "========================================="
echo "部署 api-upload 云函数"
echo "========================================="

# 进入云函数目录
cd "$(dirname "$0")/cloudfunctions/api-upload"

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
  echo "❌ 依赖安装失败"
  exit 1
fi

# 部署云函数
echo "📤 部署云函数..."
cloudbase functions:deploy api-upload -e rcwljy-5ghmq2ex26764978

if [ $? -eq 0 ]; then
  echo "✅ 部署成功!"
else
  echo "❌ 部署失败"
  exit 1
fi
