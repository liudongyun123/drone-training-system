#!/bin/bash

echo "🔨 开始构建..."
npm run build

echo ""
echo "🔍 检查环境变量是否嵌入..."
if grep -q "rcwljy-5ghmq2ex26764978" dist/assets/*.js; then
    echo "✅ 环境ID已正确嵌入"
else
    echo "❌ 环境ID未找到"
fi

if grep -q "eyJhbGciOiJSUzI1Ni" dist/assets/*.js; then
    echo "✅ Publishable Key已正确嵌入"
else
    echo "❌ Publishable Key未找到"
fi

echo ""
echo "📤 开始上传到 CloudBase..."
npx @cloudbase/cloudbase-cli hosting:deploy dist -e rcwljy-5ghmq2ex26764978

echo ""
echo "✅ 部署完成!"
echo "🌐 访问地址: https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com/#/admin/dashboard"
