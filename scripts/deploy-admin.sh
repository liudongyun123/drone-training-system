#!/bin/bash
# 强制部署 admin 云函数

# 删除旧云函数
echo "删除旧云函数..."
tcb fn delete admin <<< "y" 2>/dev/null

# 等待一下
sleep 2

# 创建新云函数
echo "创建新云函数..."
tcb fn deploy admin --dir cloudfunctions --force 2>&1

# 检查状态
echo ""
echo "检查云函数状态..."
sleep 3
tcb fn list | grep admin
