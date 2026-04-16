#!/bin/bash

# 云函数部署脚本
# 使用前请确保已登录腾讯云 CloudBase CLI

echo "==================================="
echo "  云函数 admin 部署脚本"
echo "==================================="
echo ""

# 检查是否已登录
echo "步骤 1/5: 检查登录状态..."
if ! tcb config:info &>/dev/null; then
    echo "⚠️  未登录，正在打开授权页面..."
    tcb login
    echo ""
    echo "请完成授权后按回车继续..."
    read
fi

# 显示当前环境
echo ""
echo "步骤 2/5: 当前环境信息"
tcb env:list

echo ""
echo "步骤 3/5: 部署云函数 admin"
echo "这可能需要 2-5 分钟，请耐心等待..."
echo ""

# 部署云函数
tcb functions:deploy admin --force

# 检查部署结果
if [ $? -eq 0 ]; then
    echo ""
    echo "==================================="
    echo "✅ 部署成功！"
    echo "==================================="
    echo ""
    echo "步骤 4/5: 查看云函数列表"
    tcb functions:list
    echo ""
    echo "步骤 5/5: 测试云函数"
    echo "请访问以下链接测试云函数："
    echo "https://console.cloud.tencent.com/tcb"
    echo ""
    echo "测试数据："
    echo '{
  "action": "list",
  "collection": "users",
  "options": {
    "limit": 5
  }
}'
else
    echo ""
    echo "==================================="
    echo "❌ 部署失败"
    echo "==================================="
    echo ""
    echo "请检查错误信息，或使用控制台手动部署"
    echo "详见: QUICK_DEPLOY.md"
    exit 1
fi

echo ""
echo "完成！请刷新前端页面验证功能。"
