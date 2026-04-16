#!/bin/bash

echo "开始构建..."
npm run build

echo "上传到 CloudBase..."
npx cloudbase hosting:deploy dist -e rcwljy-5ghmq2ex26764978

echo "完成!"
