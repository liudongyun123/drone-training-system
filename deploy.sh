#!/bin/bash

echo "🔨 开始构建..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ 构建成功"
  echo "📤 开始上传到 CloudBase..."
  cloudbase hosting:deploy dist / -e rcwljy-5ghmq2ex26764978
  echo "✅ 部署完成!"
  echo ""
  echo "🌐 访问地址: https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com/"
else
  echo "❌ 构建失败"
  exit 1
fi
